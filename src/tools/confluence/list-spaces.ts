import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ConfluenceClient } from "../../clients/confluence-client.js";
import { AtlassianApiError } from "../../clients/http-client.js";

export function registerListSpaces(server: McpServer, confluence: ConfluenceClient): void {
  server.tool(
    "confluence_list_spaces",
    "List available Confluence spaces.",
    {
      limit: z.number().min(1).max(100).optional().default(50).describe("Maximum results (1-100)"),
    },
    async ({ limit }) => {
      try {
        const spaces = await confluence.listSpaces(limit);

        if (spaces.length === 0) {
          return { content: [{ type: "text", text: "No accessible spaces found." }] };
        }

        const lines = [
          `Found ${spaces.length} spaces:`,
          "",
          "Key | Name | Type",
          "--- | ---- | ----",
          ...spaces.map((s) => `${s.key} | ${s.name} | ${s.type}`),
        ];

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        if (error instanceof AtlassianApiError) {
          return { content: [{ type: "text", text: `Error listing spaces: ${error.message}` }], isError: true };
        }
        return { content: [{ type: "text", text: `Unexpected error: ${String(error)}` }], isError: true };
      }
    },
  );
}
