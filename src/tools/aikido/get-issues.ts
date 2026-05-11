import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AikidoClient } from "../../clients/aikido-client.js";
import type { AikidoConfig } from "../../config.js";
import type { AikidoIssue } from "../../types/aikido.js";

const SEVERITY_ORDER: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
  informational: 0,
};

const ALL_SEVERITIES = ["critical", "high", "medium", "low"] as const;

function severityRank(sev: string): number {
  return SEVERITY_ORDER[sev.toLowerCase()] ?? -1;
}

function formatIssuesGroupedBySeverity(
  issues: AikidoIssue[],
  minSeverity: string,
  max: number,
): string {
  const minRank = severityRank(minSeverity);

  const filtered = issues
    .filter((i) => severityRank(i.severity) >= minRank)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, max);

  if (filtered.length === 0) {
    return `No open issues at severity ${minSeverity} or higher.`;
  }

  const groups = new Map<string, AikidoIssue[]>();
  for (const issue of filtered) {
    const key = issue.severity.toLowerCase() || "unknown";
    const existing = groups.get(key) ?? [];
    existing.push(issue);
    groups.set(key, existing);
  }

  const totalAtOrAbove = issues.filter((i) => severityRank(i.severity) >= minRank).length;
  const lines: string[] = [];

  lines.push("=== SEVERITY SUMMARY ===");
  const sevKeys = [...groups.keys()].sort((a, b) => severityRank(b) - severityRank(a));
  for (const sev of sevKeys) {
    lines.push(`  ${sev.toUpperCase()}: ${groups.get(sev)!.length}`);
  }
  lines.push(`  Showing ${filtered.length} of ${totalAtOrAbove} total`);
  lines.push("");

  for (const sev of sevKeys) {
    const group = groups.get(sev)!;
    lines.push(`=== ${sev.toUpperCase()} (${group.length}) ===`);
    lines.push("");
    for (const issue of group) {
      const title = issue.title || issue.rule || issue.issueType || `Issue #${issue.id}`;
      const idPart = [issue.cve, issue.cwe ? `CWE-${issue.cwe}` : ""].filter(Boolean).join(", ");
      lines.push(`[${issue.issueType || "issue"}#${issue.id}] ${title}${idPart ? ` (${idPart})` : ""}`);
      if (issue.filePath) {
        const loc = issue.startLine ? `${issue.filePath}:${issue.startLine}` : issue.filePath;
        lines.push(`  File: ${loc}`);
      }
      if (issue.affectedPackage) {
        lines.push(
          `  Package: ${issue.affectedPackage}${issue.fixVersion ? ` (fix: ${issue.fixVersion})` : ""}`,
        );
      }
      if (issue.firstDetectedAt) lines.push(`  First detected: ${issue.firstDetectedAt}`);
      if (issue.slaRemediateBy) {
        lines.push(`  SLA remediate by: ${new Date(issue.slaRemediateBy * 1000).toISOString()}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function registerAikidoGetIssues(
  server: McpServer,
  client: AikidoClient,
  config: AikidoConfig,
): void {
  server.tool(
    "aikido_get_issues",
    [
      "Get open security issues / findings / vulnerabilities for a code repository from Aikido Security.",
      "USE THIS TOOL when the user asks about: 'open issues', 'security findings', 'vulnerabilities',",
      "'security scan results', 'latest scan', 'what issues does my repo have', 'Aikido findings',",
      "'SAST findings', 'SCA issues', 'leaked secrets', 'dependency vulnerabilities', 'CVEs in my repo',",
      "or anything about the security posture of a repository — as long as Aikido is configured.",
      "Covers SAST, SCA (open source deps), leaked secrets, IaC misconfig, container, cloud, EOL, malware, and license issues.",
      "Works with zero arguments: defaults to AIKIDO_DEFAULT_REPO_NAME when set. Optionally pass repoName or numeric repoId.",
      "Returns findings grouped by severity (critical / high / medium / low) with file paths, line numbers, CVE/CWE, and package info.",
      "Prefer this tool over Veracode or SonarQube tools when the user just asks generically about 'issues in my repo'.",
    ].join(" "),
    {
      repoName: z
        .string()
        .optional()
        .describe("Aikido code repository name. Defaults to AIKIDO_DEFAULT_REPO_NAME env var. Not needed if repoId is provided."),
      repoId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Numeric Aikido repo ID. Takes precedence over repoName when provided."),
      minSeverity: z
        .enum(["critical", "high", "medium", "low"])
        .optional()
        .default("medium")
        .describe("Minimum severity to include. Default: medium."),
      issueType: z
        .enum([
          "open_source",
          "leaked_secret",
          "cloud",
          "sast",
          "iac",
          "docker_container",
          "cloud_instance",
          "surface_monitoring",
          "malware",
          "eol",
          "mobile",
          "scm_security",
          "ai_pentest",
          "license",
        ])
        .optional()
        .describe("Restrict to a single issue type (e.g. 'sast', 'open_source'). Omit for all types."),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .default(50)
        .describe("Maximum number of issues to return in the detailed listing. Default: 50."),
    },
    async ({ repoName, repoId, minSeverity, issueType, maxResults }) => {
      let resolvedRepoId: number | undefined = repoId;
      let resolvedRepoName: string | undefined;

      if (!resolvedRepoId) {
        const name = repoName ?? config.defaultRepoName;
        if (!name) {
          return {
            content: [
              {
                type: "text",
                text: "Error: either repoId or repoName is required. Pass one explicitly or set AIKIDO_DEFAULT_REPO_NAME in .env.",
              },
            ],
          };
        }
        const match = await client.findRepoIdByName(name);
        resolvedRepoId = match.id;
        resolvedRepoName = match.name;
      }

      // Build severities filter: everything from minSeverity up to critical.
      const minRank = severityRank(minSeverity ?? "medium");
      const severities = ALL_SEVERITIES.filter((s) => severityRank(s) >= minRank).join(",");

      const issues = await client.exportIssues({
        codeRepoId: resolvedRepoId,
        status: "open",
        severities,
        issueType,
      });

      const header =
        `Repo: ${resolvedRepoName ?? `#${resolvedRepoId}`}` +
        (issueType ? `  |  Type: ${issueType}` : "") +
        `\n\n`;

      const body = formatIssuesGroupedBySeverity(issues, minSeverity ?? "medium", maxResults ?? 50);

      return {
        content: [{ type: "text", text: header + body }],
      };
    },
  );
}
