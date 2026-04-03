import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { VeracodeClient } from "../../clients/veracode-client.js";
import type { VeracodeConfig } from "../../config.js";

export function registerListBuilds(
  server: McpServer,
  client: VeracodeClient,
  config: VeracodeConfig,
): void {
  server.tool(
    "veracode_list_builds",
    "Lists recent scans/builds for a Veracode application. Shows the scan name (which contains the GitHub Actions run ID for CI-triggered scans) and the build ID needed for status/findings lookups.",
    {
      appName: z
        .string()
        .optional()
        .describe("Veracode application profile name. Defaults to VERACODE_APP_NAME env var."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe("Number of recent builds to show. Default: 10."),
    },
    async ({ appName, limit }) => {
      const resolvedAppName = appName ?? config.defaultAppName;
      if (!resolvedAppName) {
        return {
          content: [
            {
              type: "text",
              text: "Error: appName is required. Either pass it explicitly or set VERACODE_APP_NAME in your .env file.",
            },
          ],
        };
      }

      const appId = await client.findAppId(resolvedAppName);
      const builds = await client.getBuildList(appId);

      if (builds.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No builds found for app "${resolvedAppName}".`,
            },
          ],
        };
      }

      const shown = builds.slice(0, limit ?? 10);
      const maxVersionLen = Math.max(10, ...shown.map((b) => b.version.length));
      const header = `${"Build ID".padEnd(12)}  ${"Scan Name / Version".padEnd(maxVersionLen)}`;
      const separator = "-".repeat(12) + "  " + "-".repeat(maxVersionLen);
      const rows = shown.map(
        (b) => `${b.buildId.padEnd(12)}  ${b.version}`,
      );

      const note =
        builds.length > (limit ?? 10)
          ? `\n(showing ${shown.length} of ${builds.length} total builds, newest first)`
          : `\n(${shown.length} build${shown.length !== 1 ? "s" : ""} total, newest first)`;

      return {
        content: [
          {
            type: "text",
            text:
              `App: ${resolvedAppName}\n\n` +
              [header, separator, ...rows].join("\n") +
              note,
          },
        ],
      };
    },
  );
}
