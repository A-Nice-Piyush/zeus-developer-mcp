import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { VeracodeClient } from "../../clients/veracode-client.js";
import type { VeracodeConfig } from "../../config.js";
import type { VeracodeFlaw } from "../../types/veracode.js";
import { getCurrentBranch } from "../../utils/git.js";

const GITHUB_API = "https://api.github.com";

interface GitHubPR {
  number: number;
  title: string;
  state: string;
  head: { sha: string; ref: string };
}

interface GitHubWorkflowRun {
  id: number;
  run_number: number;
  run_attempt: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  pull_requests: Array<{ number: number }>;
  head_branch: string;
  head_sha: string;
}

interface GitHubRunsResponse {
  total_count: number;
  workflow_runs: GitHubWorkflowRun[];
}

const SEVERITY_LABEL: Record<number, string> = {
  0: "Informational",
  1: "Very Low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Very High",
};

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/**
 * Find PR(s) for a branch using the GitHub API.
 * Returns the most recent open PR, or the most recent closed one if no open PR exists.
 */
async function findPRForBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
): Promise<GitHubPR | null> {
  // Try open PRs first
  const openResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls?head=${encodeURIComponent(owner)}:${encodeURIComponent(branchName)}&state=open&per_page=5`,
    { headers: githubHeaders(token) },
  );

  if (openResponse.ok) {
    const openPRs = (await openResponse.json()) as GitHubPR[];
    if (openPRs.length > 0) {
      return openPRs[0]; // most recent open PR for this branch
    }
  }

  // Fall back to closed/merged PRs
  const closedResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls?head=${encodeURIComponent(owner)}:${encodeURIComponent(branchName)}&state=closed&per_page=5`,
    { headers: githubHeaders(token) },
  );

  if (closedResponse.ok) {
    const closedPRs = (await closedResponse.json()) as GitHubPR[];
    if (closedPRs.length > 0) {
      return closedPRs[0]; // most recent closed PR for this branch
    }
  }

  return null;
}

/**
 * Fetch a specific PR by number.
 */
async function getPR(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<GitHubPR> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`,
    { headers: githubHeaders(token) },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API error ${response.status} fetching PR #${prNumber}: ${body.slice(0, 200)}`);
  }

  return (await response.json()) as GitHubPR;
}

async function getWorkflowRunsForPR(
  token: string,
  owner: string,
  repo: string,
  pr: GitHubPR,
): Promise<GitHubWorkflowRun[]> {
  const headSha = pr.head.sha;
  const headRef = pr.head.ref;
  const prNumber = pr.number;

  // Get runs by head SHA
  const runsResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/runs?head_sha=${headSha}&per_page=50`,
    { headers: githubHeaders(token) },
  );

  if (!runsResponse.ok) {
    const body = await runsResponse.text();
    throw new Error(`GitHub API error ${runsResponse.status} fetching runs: ${body.slice(0, 200)}`);
  }

  const data = (await runsResponse.json()) as GitHubRunsResponse;
  const allRuns = [...data.workflow_runs];

  // Also get runs by branch name
  const branchRunsResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/runs?branch=${encodeURIComponent(headRef)}&event=pull_request&per_page=50`,
    { headers: githubHeaders(token) },
  );

  if (branchRunsResponse.ok) {
    const branchData = (await branchRunsResponse.json()) as GitHubRunsResponse;
    const existingIds = new Set(allRuns.map((r) => r.id));
    for (const run of branchData.workflow_runs) {
      if (!existingIds.has(run.id)) {
        allRuns.push(run);
      }
    }
  }

  return allRuns.filter(
    (run) =>
      run.head_sha === headSha ||
      run.pull_requests.some((p) => p.number === prNumber),
  );
}

/**
 * Build search tokens from a GitHub workflow run.
 * The veracode-uploadandscan-action names scans like:
 *   "Scan from Github job: {run_id}-{run_number}-{run_attempt}"
 * We search for builds whose version CONTAINS these tokens.
 */
function buildSearchTokens(run: GitHubWorkflowRun): string[] {
  return [
    `${run.id}-${run.run_number}-${run.run_attempt}`,   // e.g. "22214671698-2574-1"
    `${run.id}-${run.run_number}`,                       // e.g. "22214671698-2574"
    `${run.id}`,                                          // e.g. "22214671698"
  ];
}

function formatFindingsBySeverity(flaws: VeracodeFlaw[], minSeverity: number): string {
  const filtered = flaws
    .filter((f) => f.severity >= minSeverity)
    .sort((a, b) => b.severity - a.severity);

  if (filtered.length === 0) {
    return `No findings at severity ${SEVERITY_LABEL[minSeverity] ?? minSeverity}+.`;
  }

  // Group by severity
  const groups = new Map<number, VeracodeFlaw[]>();
  for (const flaw of filtered) {
    const existing = groups.get(flaw.severity) ?? [];
    existing.push(flaw);
    groups.set(flaw.severity, existing);
  }

  const lines: string[] = [];

  // Summary counts
  lines.push("=== SEVERITY SUMMARY ===");
  const sevKeys = [...groups.keys()].sort((a, b) => b - a);
  for (const sev of sevKeys) {
    const count = groups.get(sev)!.length;
    lines.push(`  ${SEVERITY_LABEL[sev] ?? sev}: ${count} finding${count !== 1 ? "s" : ""}`);
  }
  lines.push(`  Total: ${filtered.length} finding${filtered.length !== 1 ? "s" : ""}`);
  lines.push("");

  // Detailed findings grouped by severity
  for (const sev of sevKeys) {
    const group = groups.get(sev)!;
    lines.push(`=== ${(SEVERITY_LABEL[sev] ?? String(sev)).toUpperCase()} (${group.length}) ===`);
    lines.push("");
    for (const flaw of group) {
      lines.push(`[FLAW-${flaw.flawId}] ${flaw.cweName || flaw.categoryName} (CWE-${flaw.cweId})`);
      if (flaw.filePath || flaw.lineNumber) {
        lines.push(`  File: ${flaw.filePath}${flaw.lineNumber ? `, Line: ${flaw.lineNumber}` : ""}`);
      }
      if (flaw.description) lines.push(`  Description: ${flaw.description}`);
      if (flaw.remediation) lines.push(`  Remediation: ${flaw.remediation}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function registerFindScanForPR(
  server: McpServer,
  client: VeracodeClient,
  config: VeracodeConfig,
): void {
  server.tool(
    "veracode_find_scan_for_pr",
    [
      "Finds the Veracode SAST scan triggered by GitHub Actions CI for a pull request.",
      "If no parameters are provided, auto-detects the current Git branch from GIT_REPO_PATH.",
      "Accepts an optional PR number OR branch name — if branch is given, the PR is looked up via GitHub API.",
      "Looks up the GitHub workflow run, extracts the run ID (e.g. 22214671698-2574-1),",
      "searches the Veracode build list for a scan name containing that ID,",
      "and returns findings grouped by severity.",
      "Requires GITHUB_TOKEN and GITHUB_REPO in .env.",
    ].join(" "),
    {
      prNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("The GitHub pull request number (e.g. 42). If not provided, branchName is required."),
      branchName: z
        .string()
        .optional()
        .describe("The Git branch name (e.g. 'feature/my-branch'). Used to auto-find the PR via GitHub API. If prNumber is provided, this is ignored."),
      appName: z
        .string()
        .optional()
        .describe("Veracode application profile name. Defaults to VERACODE_APP_NAME env var."),
      repo: z
        .string()
        .optional()
        .describe('GitHub repo in "owner/repo" format. Defaults to GITHUB_REPO env var.'),
      minSeverity: z
        .number()
        .int()
        .min(0)
        .max(5)
        .optional()
        .default(3)
        .describe("Minimum severity to include (0-5). Default: 3 (Medium+)."),
    },
    async ({ prNumber, branchName, appName, repo, minSeverity }) => {
      const resolvedAppName = appName ?? config.defaultAppName;
      if (!resolvedAppName) {
        return {
          content: [{ type: "text", text: "Error: appName is required. Pass it explicitly or set VERACODE_APP_NAME in .env." }],
        };
      }

      if (!config.github) {
        return {
          content: [
            {
              type: "text",
              text: "Error: GitHub integration not configured. Set GITHUB_TOKEN and GITHUB_REPO (owner/repo) in .env.",
            },
          ],
        };
      }

      // Auto-detect branch from GIT_REPO_PATH if neither prNumber nor branchName provided
      let resolvedBranch = branchName;
      if (!prNumber && !resolvedBranch) {
        const detectedBranch = getCurrentBranch();
        if (detectedBranch) {
          resolvedBranch = detectedBranch;
        } else {
          return {
            content: [
              {
                type: "text",
                text: "Error: could not auto-detect the current branch. Either provide prNumber or branchName, or set GIT_REPO_PATH in your env to the local repo path.",
              },
            ],
          };
        }
      }

      const resolvedRepo = repo ?? config.github.repo;
      const [owner, repoName] = resolvedRepo.split("/");
      if (!owner || !repoName) {
        return {
          content: [{ type: "text", text: `Error: GITHUB_REPO must be "owner/repo", got: "${resolvedRepo}"` }],
        };
      }

      const lines: string[] = [];

      // Step 1: Resolve PR — either directly by number or by finding it from branch name
      let pr: GitHubPR;

      if (prNumber) {
        pr = await getPR(config.github.token, owner, repoName, prNumber);
        lines.push(`PR: #${prNumber} — ${pr.title}`);
      } else {
        const foundPR = await findPRForBranch(config.github.token, owner, repoName, resolvedBranch!);
        if (!foundPR) {
          lines.push(`No pull request found for branch "${resolvedBranch}" in ${owner}/${repoName}.`);
          lines.push("");
          lines.push("Make sure the branch has an open (or recently closed) PR.");
          return { content: [{ type: "text", text: lines.join("\n") }] };
        }
        pr = foundPR;
        lines.push(`Branch: ${resolvedBranch} → PR #${pr.number} — ${pr.title} (${pr.state})`);
      }

      lines.push(`Repo: ${owner}/${repoName}  |  App: ${resolvedAppName}`);
      lines.push("");

      // Step 2: Get GitHub workflow runs for this PR
      const runs = await getWorkflowRunsForPR(config.github.token, owner, repoName, pr);

      if (runs.length === 0) {
        lines.push(`No GitHub Actions runs found for PR #${pr.number}.`);
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      runs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      lines.push(`Found ${runs.length} GitHub Actions run(s).`);

      // Step 3: Get Veracode build list
      const appId = await client.findAppId(resolvedAppName);
      const buildList = await client.getBuildList(appId);

      if (buildList.length === 0) {
        lines.push(`No Veracode builds found for app "${resolvedAppName}".`);
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      // Step 4: Match — search for builds whose version CONTAINS the run ID tokens
      let matchedBuild: { buildId: string; version: string } | undefined;
      let matchedRun: GitHubWorkflowRun | undefined;
      let matchedToken: string | undefined;

      for (const run of runs) {
        const tokens = buildSearchTokens(run);
        for (const token of tokens) {
          const found = buildList.find((b) => b.version.includes(token));
          if (found) {
            matchedBuild = found;
            matchedRun = run;
            matchedToken = token;
            break;
          }
        }
        if (matchedBuild) break;
      }

      if (!matchedBuild || !matchedRun) {
        lines.push("");
        lines.push("Could not match any GitHub run to a Veracode scan.");
        lines.push("");
        lines.push("Search tokens tried:");
        for (const run of runs.slice(0, 3)) {
          const tokens = buildSearchTokens(run);
          lines.push(`  Run ${run.id}: ${tokens.join(" / ")}`);
        }
        lines.push("");
        lines.push("Recent Veracode builds:");
        for (const b of buildList.slice(0, 5)) {
          lines.push(`  ${b.buildId}: "${b.version}"`);
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      }

      lines.push(`Matched token "${matchedToken}" → Build ${matchedBuild.buildId}`);
      lines.push(`Scan: ${matchedBuild.version}`);
      lines.push(`GitHub: ${matchedRun.html_url}`);
      lines.push("");

      // Step 5: Fetch the detailed report directly (skip unreliable status check)
      try {
        const flaws = await client.getDetailedReport(matchedBuild.buildId);
        lines.push(formatFindingsBySeverity(flaws, minSeverity ?? 3));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        lines.push("Could not fetch findings for this scan.");
        lines.push(`Error: ${msg}`);
        lines.push("");
        lines.push("This usually means the scan is still in progress or has not published results yet.");
        lines.push("Check the Veracode dashboard for the current status of this scan.");
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    },
  );
}
