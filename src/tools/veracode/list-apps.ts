import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { VeracodeClient } from "../../clients/veracode-client.js";

export function registerListApps(server: McpServer, client: VeracodeClient): void {
  server.tool(
    "veracode_list_apps",
    "Lists all Veracode application profiles you have access to. Use this first to confirm the correct app name before uploading or scanning.",
    {},
    async () => {
      const apps = await client.getAppList();

      if (apps.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No Veracode applications found. Verify your API credentials have the correct permissions.",
            },
          ],
        };
      }

      const maxNameLen = Math.max(8, ...apps.map((a) => a.appName.length));
      const header = `${"App Name".padEnd(maxNameLen)}  App ID`;
      const separator = "-".repeat(maxNameLen) + "  " + "-".repeat(10);
      const rows = apps.map((a) => `${a.appName.padEnd(maxNameLen)}  ${a.appId}`);

      return {
        content: [
          {
            type: "text",
            text: [header, separator, ...rows].join("\n"),
          },
        ],
      };
    },
  );
}
