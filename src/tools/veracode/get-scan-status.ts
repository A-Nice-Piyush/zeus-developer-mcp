import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { VeracodeClient } from "../../clients/veracode-client.js";
import type { VeracodeConfig } from "../../config.js";

export function registerGetScanStatus(
  server: McpServer,
  client: VeracodeClient,
  config: VeracodeConfig,
): void {
  server.tool(
    "veracode_get_scan_status",
    [
      "Checks the status of a Veracode scan. Can query by app name (returns the latest scan) or by a specific build ID",
      "(obtained from veracode_find_scan_for_pr or veracode_list_builds).",
      "Status progresses: Pre-Scan Submitted → Scan In Process → Results Ready → Published.",
    ].join(" "),
    {
      appName: z
        .string()
        .optional()
        .describe("Veracode application profile name. Defaults to VERACODE_APP_NAME env var. Not needed if buildId is provided."),
      buildId: z
        .string()
        .optional()
        .describe("Specific Veracode build ID to check (e.g. from veracode_find_scan_for_pr). When provided, appName is ignored."),
    },
    async ({ appName, buildId }) => {
      let info;

      if (buildId) {
        // Query a specific build directly
        info = await client.getBuildInfoById(buildId);
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
        info = await client.getBuildInfo(appId);
      }

      const lines: string[] = [];
      if (!buildId) lines.push(`App:        ${appName ?? config.defaultAppName}`);
      lines.push(`Build ID:   ${info.buildId || "(unknown)"}`);
      lines.push(`Scan Name:  ${info.scanName || "(unknown)"}`);
      lines.push(`Status:     ${info.status}`);
      if (info.submittedDate) lines.push(`Submitted:  ${info.submittedDate}`);
      if (info.publishedDate) lines.push(`Published:  ${info.publishedDate}`);
      lines.push("");

      const status = info.status.toLowerCase();
      if (status.includes("results ready") || status.includes("published")) {
        lines.push(
          `Scan is complete. Use veracode_get_findings with buildId="${info.buildId}" to retrieve vulnerabilities.`,
        );
      } else if (status.includes("incomplete") || status.includes("not submitted")) {
        lines.push("No scan is currently running. Use veracode_upload_and_scan to submit a new scan.");
      } else {
        lines.push("Scan is in progress. Check again in a few minutes.");
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    },
  );
}
