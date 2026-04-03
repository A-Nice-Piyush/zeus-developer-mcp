import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SonarQubeClient } from "../../clients/sonarqube-client.js";
import type { SonarQubeConfig } from "../../config.js";
import type { SonarQubeIssue, SonarQubeComponent } from "../../types/sonarqube.js";
import { getCurrentBranch } from "../../utils/git.js";

const SEVERITY_ORDER = ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO"];

function resolveFilePath(issue: SonarQubeIssue, components: SonarQubeComponent[]): string {
  const comp = components.find((c) => c.key === issue.component);
  if (comp?.path) return comp.path;
  const colonIndex = issue.component.indexOf(":");
  return colonIndex >= 0 ? issue.component.slice(colonIndex + 1) : issue.component;
}

function formatIssuesGroupedBySeverity(
  issues: SonarQubeIssue[],
  components: SonarQubeComponent[],
  maxResults: number,
  totalAvailable: number,
): string {
  const truncated = issues.slice(0, maxResults);

  if (truncated.length === 0) {
    return "No issues found matching the specified filters.";
  }

  const groups = new Map<string, SonarQubeIssue[]>();
  for (const issue of truncated) {
    const existing = groups.get(issue.severity) ?? [];
    existing.push(issue);
    groups.set(issue.severity, existing);
  }

  const lines: string[] = [];

  // Summary
  lines.push("=== SEVERITY SUMMARY ===");
  const sevKeys = [...groups.keys()].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a) - SEVERITY_ORDER.indexOf(b),
  );
  for (const sev of sevKeys) {
    const count = groups.get(sev)!.length;
    lines.push(`  ${sev}: ${count}`);
  }
  lines.push(`  Showing ${truncated.length} of ${totalAvailable} total`);
  lines.push("");

  // Detail
  for (const sev of sevKeys) {
    const group = groups.get(sev)!;
    lines.push(`=== ${sev} (${group.length}) ===`);
    lines.push("");
    for (const issue of group) {
      const filePath = resolveFilePath(issue, components);
      lines.push(`[${issue.type}] ${issue.message}`);
      lines.push(`  Rule: ${issue.rule}`);
      lines.push(`  File: ${filePath}${issue.line ? `, Line: ${issue.line}` : ""}`);
      if (issue.effort) lines.push(`  Effort: ${issue.effort}`);
      if (issue.tags && issue.tags.length > 0) lines.push(`  Tags: ${issue.tags.join(", ")}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function registerGetIssues(
  server: McpServer,
  client: SonarQubeClient,
  config: SonarQubeConfig,
): void {
  server.tool(
    "sonarqube_get_issues",
    [
      "Fetches detailed SonarQube issues for a project, filtered by type and/or severity.",
      "If no branch is specified, auto-detects the current Git branch from GIT_REPO_PATH.",
      "Returns findings with file path, line number, message, rule, severity, and effort estimate.",
      "Use sonarqube_get_report first to see counts, then use this tool to drill into specific categories.",
    ].join(" "),
    {
      projectKey: z
        .string()
        .optional()
        .describe("SonarQube project key. Defaults to SONARQUBE_PROJECT_KEY env var."),
      branch: z
        .string()
        .optional()
        .describe("Branch name. Defaults to the project's main branch."),
      types: z
        .array(z.enum(["VULNERABILITY", "BUG", "CODE_SMELL"]))
        .optional()
        .describe('Issue types to include. E.g. ["VULNERABILITY"] or ["BUG", "CODE_SMELL"]. Omit for all types.'),
      severities: z
        .array(z.enum(["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO"]))
        .optional()
        .describe('Severities to include. E.g. ["BLOCKER", "CRITICAL"]. Omit for all severities.'),
      statuses: z
        .array(z.enum(["OPEN", "CONFIRMED", "REOPENED", "RESOLVED", "CLOSED"]))
        .optional()
        .describe("Issue statuses to include. Defaults to open issues only (OPEN, CONFIRMED, REOPENED)."),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .default(50)
        .describe("Maximum number of issues to return. Default: 50. Max: 500."),
    },
    async ({ projectKey, branch, types, severities, statuses, maxResults }) => {
      // Auto-detect branch if not provided
      const resolvedBranch = branch ?? getCurrentBranch() ?? undefined;

      const resolvedProjectKey = projectKey ?? config.defaultProjectKey;
      if (!resolvedProjectKey) {
        return {
          content: [
            {
              type: "text",
              text: "Error: projectKey is required. Either pass it explicitly or set SONARQUBE_PROJECT_KEY in your .env file.",
            },
          ],
        };
      }

      const max = maxResults ?? 50;

      const response = await client.searchIssues({
        projectKey: resolvedProjectKey,
        branch: resolvedBranch,
        types: types?.join(","),
        severities: severities?.join(","),
        statuses: statuses?.join(",") ?? "OPEN,CONFIRMED,REOPENED",
        resolved: false,
        pageSize: Math.min(max, 500),
        page: 1,
      });

      const header = [
        `Project: ${resolvedProjectKey}`,
        resolvedBranch ? `Branch: ${resolvedBranch}` : null,
        types ? `Types: ${types.join(", ")}` : null,
        severities ? `Severities: ${severities.join(", ")}` : null,
        "",
      ]
        .filter((l) => l !== null)
        .join("\n");

      const body = formatIssuesGroupedBySeverity(
        response.issues,
        response.components,
        max,
        response.total,
      );

      return {
        content: [{ type: "text", text: header + body }],
      };
    },
  );
}
