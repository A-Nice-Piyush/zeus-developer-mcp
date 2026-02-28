import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ConfluenceClient } from "../../clients/confluence-client.js";
import { AtlassianApiError } from "../../clients/http-client.js";

export function registerConfluenceAddComment(server: McpServer, confluence: ConfluenceClient): void {
  server.tool(
    "confluence_add_comment",
    "Add a footer comment to a Confluence page.",
    {
      pageId: z.string().describe("Confluence page ID"),
      comment: z.string().describe("Comment text to add"),
    },
    async ({ pageId, comment }) => {
      try {
        await confluence.addComment(pageId, comment);
        return { content: [{ type: "text", text: `Comment added to page ${pageId}.` }] };
      } catch (error) {
        if (error instanceof AtlassianApiError) {
          return { content: [{ type: "text", text: `Error adding comment: ${error.message}` }], isError: true };
        }
        return { content: [{ type: "text", text: `Unexpected error: ${String(error)}` }], isError: true };
      }
    },
  );
}
