import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ConfluenceClient } from "../../clients/confluence-client.js";
import { AtlassianApiError } from "../../clients/http-client.js";

export function registerGetPageChildren(server: McpServer, confluence: ConfluenceClient): void {
  server.tool(
    "confluence_get_page_children",
    "Get child pages of a Confluence page. Use confluence_get_page to read a specific child.",
    {
      pageId: z.string().describe("Parent page ID"),
      limit: z.number().min(1).max(50).optional().default(25).describe("Maximum results (1-50)"),
    },
    async ({ pageId, limit }) => {
      try {
        const children = await confluence.getChildPages(pageId, limit);

        if (children.length === 0) {
          return { content: [{ type: "text", text: `No child pages found for page ${pageId}.` }] };
        }

        const lines = [
          `Found ${children.length} child pages:`,
          "",
          "ID | Title | Status",
          "-- | ----- | ------",
          ...children.map((p) => `${p.id} | ${p.title} | ${p.status}`),
        ];

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        if (error instanceof AtlassianApiError) {
          return { content: [{ type: "text", text: `Error fetching child pages: ${error.message}` }], isError: true };
        }
        return { content: [{ type: "text", text: `Unexpected error: ${String(error)}` }], isError: true };
      }
    },
  );
}
