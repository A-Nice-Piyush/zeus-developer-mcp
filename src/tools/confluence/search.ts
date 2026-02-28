import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ConfluenceClient } from "../../clients/confluence-client.js";
import { AtlassianApiError } from "../../clients/http-client.js";

export function registerConfluenceSearch(server: McpServer, confluence: ConfluenceClient): void {
  server.tool(
    "confluence_search",
    "Search Confluence content using CQL (Confluence Query Language). Returns matching pages with excerpts.",
    {
      cql: z.string().describe("CQL query, e.g. 'type=page AND space=DEV AND text~\"deployment\"'"),
      limit: z.number().min(1).max(25).optional().default(10).describe("Maximum results (1-25)"),
    },
    async ({ cql, limit }) => {
      try {
        const result = await confluence.search(cql, limit);

        if (result.results.length === 0) {
          return { content: [{ type: "text", text: `No results found for: ${cql}` }] };
        }

        const lines = [
          `Found ${result.totalSize} total results for: ${cql}`,
          result.results.length < result.totalSize ? `(showing first ${result.results.length})` : "",
          "",
          ...result.results.map((item) => {
            return [
              `**${item.title}** (ID: ${item.id})`,
              `  Space: ${item.space?.key ?? "?"} | Type: ${item.type}`,
              item.excerpt ? `  ${item.excerpt.replace(/<[^>]+>/g, "").trim()}` : "",
            ]
              .filter(Boolean)
              .join("\n");
          }),
        ].filter(Boolean);

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        if (error instanceof AtlassianApiError) {
          return { content: [{ type: "text", text: `Error searching Confluence: ${error.message}` }], isError: true };
        }
        return { content: [{ type: "text", text: `Unexpected error: ${String(error)}` }], isError: true };
      }
    },
  );
}
