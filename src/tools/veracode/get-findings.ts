import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { VeracodeClient } from "../../clients/veracode-client.js";
import type { VeracodeConfig } from "../../config.js";
import type { VeracodeFlaw } from "../../types/veracode.js";

const SEVERITY_LABEL: Record<number, string> = {
  0: "Informational",
  1: "Very Low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Very High",
};

function formatFlawsGroupedBySeverity(flaws: VeracodeFlaw[], minSev: number, max: number): string {
  const filtered = flaws
    .filter((f) => f.severity >= minSev)
    .sort((a, b) => b.severity - a.severity)
    .slice(0, max);

  if (filtered.length === 0) {
    return `No findings at severity ${SEVERITY_LABEL[minSev] ?? minSev}+.`;
  }

  const groups = new Map<number, VeracodeFlaw[]>();
  for (const flaw of filtered) {
    const existing = groups.get(flaw.severity) ?? [];
    existing.push(flaw);
    groups.set(flaw.severity, existing);
  }

  const totalFiltered = flaws.filter((f) => f.severity >= minSev).length;
  const lines: string[] = [];

  // Summary
  lines.push("=== SEVERITY SUMMARY ===");
  const sevKeys = [...groups.keys()].sort((a, b) => b - a);
  for (const sev of sevKeys) {
    const count = groups.get(sev)!.length;
    lines.push(`  ${SEVERITY_LABEL[sev] ?? sev}: ${count}`);
  }
  lines.push(`  Showing ${filtered.length} of ${totalFiltered} total`);
  lines.push("");

  // Detail
  for (const sev of sevKeys) {
    const group = groups.get(sev)!;
    lines.push(`=== ${(SEVERITY_LABEL[sev] ?? String(sev)).toUpperCase()} (${group.length}) ===`);
    lines.push("");
    for (const flaw of group) {
      lines.push(`[FLAW-${flaw.flawId}] ${flaw.cweName || flaw.categoryName} (CWE-${flaw.cweId})`);
      if (flaw.filePath || flaw.lineNumber) {
        const loc = [flaw.filePath, flaw.lineNumber ? `Line: ${flaw.lineNumber}` : ""].filter(Boolean).join(", ");
        lines.push(`  File: ${loc}`);
      }
      if (flaw.description) lines.push(`  Description: ${flaw.description}`);
      if (flaw.remediation) lines.push(`  Remediation: ${flaw.remediation}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function registerGetFindings(
  server: McpServer,
  client: VeracodeClient,
  config: VeracodeConfig,
): void {
  server.tool(
    "veracode_get_findings",
    [
      "Fetches vulnerability findings from a Veracode scan. Can query the latest scan for an app (by appName) or a specific",
      "scan (by buildId, e.g. from veracode_find_scan_for_pr). Returns findings with file path, line number, CWE,",
      "and remediation guidance to guide code fixes.",
    ].join(" "),
    {
      appName: z
        .string()
        .optional()
        .describe("Veracode application profile name. Defaults to VERACODE_APP_NAME env var. Not needed if buildId is provided."),
      buildId: z
        .string()
        .optional()
        .describe("Specific Veracode build ID to fetch findings from (e.g. from veracode_find_scan_for_pr or veracode_list_builds). When provided, appName is ignored."),
      minSeverity: z
        .number()
        .int()
        .min(0)
        .max(5)
        .optional()
        .default(3)
        .describe("Minimum severity level to include (0=Informational, 1=Very Low, 2=Low, 3=Medium, 4=High, 5=Very High). Default: 3 (Medium and above)."),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .default(30)
        .describe("Maximum number of findings to return. Default: 30."),
    },
    async ({ appName, buildId, minSeverity, maxResults }) => {
      let resolvedBuildId: string;
      let scanLabel: string;

      if (buildId) {
        // Use the specific build ID directly — verify it's accessible and get its name
        const buildInfo = await client.getBuildInfoById(buildId);
        const statusLower = buildInfo.status.toLowerCase();
        if (!statusLower.includes("results ready") && !statusLower.includes("published")) {
          return {
            content: [
              {
                type: "text",
                text: `Scan status is "${buildInfo.status}" — results are not yet available for build ${buildId}. Check again after the scan completes.`,
              },
            ],
          };
        }
        resolvedBuildId = buildId;
        scanLabel = `${buildInfo.scanName} (Build ID: ${buildId})`;
      } else {
        const resolvedAppName = appName ?? config.defaultAppName;
        if (!resolvedAppName) {
          return {
            content: [
              {
                type: "text",
                text: "Error: either buildId or appName is required. Pass buildId for a specific scan, or set VERACODE_APP_NAME in .env.",
              },
            ],
          };
        }

        const appId = await client.findAppId(resolvedAppName);
        const buildInfo = await client.getBuildInfo(appId);

        if (!buildInfo.buildId) {
          return {
            content: [
              {
                type: "text",
                text: `No scan found for app "${resolvedAppName}". Run veracode_upload_and_scan first.`,
              },
            ],
          };
        }

        const statusLower = buildInfo.status.toLowerCase();
        if (!statusLower.includes("results ready") && !statusLower.includes("published")) {
          return {
            content: [
              {
                type: "text",
                text: `Scan status is "${buildInfo.status}" — results are not yet available. Check again after the scan completes.`,
              },
            ],
          };
        }

        resolvedBuildId = buildInfo.buildId;
        scanLabel = `${buildInfo.scanName} (Build ID: ${buildInfo.buildId})`;
      }

      const allFlaws = await client.getDetailedReport(resolvedBuildId);
      const minSev = minSeverity ?? 3;
      const max = maxResults ?? 30;

      const header = `Scan: ${scanLabel}\n\n`;
      const body = formatFlawsGroupedBySeverity(allFlaws, minSev, max);

      return {
        content: [{ type: "text", text: header + body }],
      };
    },
  );
}
