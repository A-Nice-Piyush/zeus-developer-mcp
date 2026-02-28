import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraClient } from "../clients/jira-client.js";
import type { JiraAgileClient } from "../clients/jira-agile-client.js";
import type { ConfluenceClient } from "../clients/confluence-client.js";
import { registerJiraResources } from "./jira-resources.js";
import { registerConfluenceResources } from "./confluence-resources.js";

export function registerResources(
  server: McpServer,
  jira: JiraClient,
  agile: JiraAgileClient,
  confluence: ConfluenceClient,
): void {
  registerJiraResources(server, jira, agile);
  registerConfluenceResources(server, confluence);
}
