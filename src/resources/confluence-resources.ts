import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ConfluenceClient } from "../clients/confluence-client.js";
import { formatPageContent } from "../tools/confluence/get-page.js";

export function registerConfluenceResources(
  server: McpServer,
  confluence: ConfluenceClient,
): void {
  // confluence://page/{pageId}
  server.resource(
    "confluence-page",
    new ResourceTemplate("confluence://page/{pageId}", { list: undefined }),
    {
      description: "Browse a Confluence page by ID",
      mimeType: "text/markdown",
    },
    async (uri, { pageId }) => {
      const page = await confluence.getPage(pageId as string);
      const markdown = formatPageContent(page);
      return { contents: [{ uri: uri.href, text: markdown, mimeType: "text/markdown" }] };
    },
  );

  // confluence://space/{spaceKey}
  server.resource(
    "confluence-space",
    new ResourceTemplate("confluence://space/{spaceKey}", { list: undefined }),
    {
      description: "Browse a Confluence space overview with top-level pages",
      mimeType: "text/markdown",
    },
    async (uri, { spaceKey }) => {
      const key = spaceKey as string;
      const [space, rootPages] = await Promise.all([
        confluence.getSpaceByKey(key),
        confluence.getRootPages(key),
      ]);

      const lines: string[] = [];
      if (space) {
        lines.push(`# Space: ${space.name} (${space.key})`);
        lines.push("");
        lines.push(`**Type:** ${space.type}`);
        lines.push(`**Status:** ${space.status}`);
        if (space.description?.plain?.value) {
          lines.push("");
          lines.push(space.description.plain.value);
        }
      } else {
        lines.push(`# Space: ${key}`);
      }

      if (rootPages.length > 0) {
        lines.push("");
        lines.push("## Top-Level Pages");
        lines.push("");
        for (const page of rootPages) {
          lines.push(`- **${page.title}** (ID: ${page.id})`);
        }
      }

      return { contents: [{ uri: uri.href, text: lines.join("\n"), mimeType: "text/markdown" }] };
    },
  );
}
