import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ConfluenceClient } from "../../clients/confluence-client.js";
import { registerConfluenceSearch } from "./search.js";
import { registerGetPage } from "./get-page.js";
import { registerGetPageChildren } from "./get-page-children.js";
import { registerListSpaces } from "./list-spaces.js";
import { registerConfluenceAddComment } from "./add-comment.js";

export function registerConfluenceTools(
  server: McpServer,
  confluence: ConfluenceClient,
): void {
  registerConfluenceSearch(server, confluence);
  registerGetPage(server, confluence);
  registerGetPageChildren(server, confluence);
  registerListSpaces(server, confluence);
  registerConfluenceAddComment(server, confluence);
}
