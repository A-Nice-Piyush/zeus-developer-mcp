import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SonarQubeClient } from "../../clients/sonarqube-client.js";
import type { SonarQubeConfig } from "../../config.js";
import { getCurrentBranch } from "../../utils/git.js";

const SEVERITY_ORDER = ["BLOCKER", "CRITICAL", "MAJOR", "MINOR", "INFO"];

export function registerGetReport(
  server: McpServer,
  client: SonarQubeClient,
  config: SonarQubeConfig,
): void {
  server.tool(
    "sonarqube_get_report",
    [
      "Gets a high-level SonarQube report for a project showing quality gate status,",
      "issue counts by type (Vulnerability, Bug, Code Smell, Security Hotspot),",
      "and counts by severity (BLOCKER, CRITICAL, MAJOR, MINOR, INFO).",
      "If no branch is specified, auto-detects the current Git branch from GIT_REPO_PATH.",
      "Use this first to get an overview, then ask the user which categories to drill into",
      "with sonarqube_get_issues.",
    ].join(" "),
    {
      projectKey: z
        .string()
        .optional()
        .describe("SonarQube project key. Defaults to SONARQUBE_PROJECT_KEY env var."),
      branch: z
        .string()
        .optional()
        .describe("Branch name to analyze. Defaults to the project's main branch."),
    },
    async ({ projectKey, branch }) => {
      // Auto-detect branch if not provided
      const resolvedBranch = branch ?? getCurrentBranch() ?? undefined;

      const resolvedProjectKey = projectKey ?? config.defaultProjectKey;
      if (!resolvedProjectKey) {
        return {
          content: [
            {
              type: "text",
              text: "Error: projectKey is required. Either pass it explicitly or set SONARQUBE_PROJECT_KEY in your .env file. Use sonarqube_list_projects to find available project keys.",
            },
          ],
        };
      }

      const lines: string[] = [];
      lines.push(`=== SonarQube Report: ${resolvedProjectKey} ===`);
      if (resolvedBranch) lines.push(`Branch: ${resolvedBranch}`);
      lines.push("");

      // 1. Quality Gate Status
      try {
        const gateResponse = await client.getQualityGateStatus(resolvedProjectKey, resolvedBranch);
        const gate = gateResponse.projectStatus;
        const gateLabel = gate.status === "OK" ? "PASSED" : "FAILED";
        lines.push(`Quality Gate: ${gateLabel}`);
        if (gate.conditions && gate.conditions.length > 0) {
          for (const cond of gate.conditions) {
            const condLabel = cond.status === "OK" ? "OK" : "FAIL";
            lines.push(
              `  [${condLabel}] ${cond.metricKey}: ${cond.actualValue} (threshold: ${cond.comparator} ${cond.errorThreshold})`,
            );
          }
        }
        lines.push("");
      } catch {
        lines.push("Quality Gate: Unable to retrieve");
        lines.push("");
      }

      // 2. Metrics
      try {
        const metricsResponse = await client.getMeasures(
          resolvedProjectKey,
          ["bugs", "vulnerabilities", "code_smells", "security_hotspots", "coverage", "duplicated_lines_density"],
          resolvedBranch,
        );
        const measures = metricsResponse.component.measures;
        const m = new Map(measures.map((v) => [v.metric, v.value]));

        lines.push("=== METRICS ===");
        lines.push(`  Bugs:                ${m.get("bugs") ?? "N/A"}`);
        lines.push(`  Vulnerabilities:     ${m.get("vulnerabilities") ?? "N/A"}`);
        lines.push(`  Code Smells:         ${m.get("code_smells") ?? "N/A"}`);
        lines.push(`  Security Hotspots:   ${m.get("security_hotspots") ?? "N/A"}`);
        lines.push(`  Coverage:            ${m.get("coverage") ?? "N/A"}%`);
        lines.push(`  Duplicated Lines:    ${m.get("duplicated_lines_density") ?? "N/A"}%`);
        lines.push("");
      } catch {
        lines.push("Metrics: Unable to retrieve");
        lines.push("");
      }

      // 3. Issue counts by type and severity (using facets)
      try {
        const issuesResponse = await client.searchIssues({
          projectKey: resolvedProjectKey,
          branch: resolvedBranch,
          resolved: false,
          facets: "types,severities",
          pageSize: 1,
          page: 1,
        });

        const typeFacet = issuesResponse.facets.find((f) => f.property === "types");
        const severityFacet = issuesResponse.facets.find((f) => f.property === "severities");

        if (typeFacet) {
          lines.push("=== OPEN ISSUES BY TYPE ===");
          for (const tv of typeFacet.values) {
            lines.push(`  ${tv.val}: ${tv.count}`);
          }
          lines.push(`  Total: ${issuesResponse.total}`);
          lines.push("");
        }

        if (severityFacet) {
          lines.push("=== OPEN ISSUES BY SEVERITY ===");
          const sorted = [...severityFacet.values].sort(
            (a, b) => SEVERITY_ORDER.indexOf(a.val) - SEVERITY_ORDER.indexOf(b.val),
          );
          for (const sv of sorted) {
            lines.push(`  ${sv.val}: ${sv.count}`);
          }
          lines.push("");
        }
      } catch {
        lines.push("Issue Counts: Unable to retrieve");
        lines.push("");
      }

      // 4. Security Hotspots to review
      try {
        const hotspotsResponse = await client.searchHotspots({
          projectKey: resolvedProjectKey,
          branch: resolvedBranch,
          status: "TO_REVIEW",
          pageSize: 1,
        });
        lines.push(`Security Hotspots to Review: ${hotspotsResponse.paging.total}`);
        lines.push("");
      } catch {
        // Hotspots endpoint may not be available on all versions
      }

      // 5. Guidance
      lines.push("---");
      lines.push("To drill into specific issues, use sonarqube_get_issues with:");
      lines.push('  types: ["VULNERABILITY"] and/or ["BUG", "CODE_SMELL"]');
      lines.push('  severities: ["BLOCKER", "CRITICAL"] for highest priority');
      lines.push("Ask the user which categories they want to focus on.");

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    },
  );
}
