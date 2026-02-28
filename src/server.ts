import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AtlassianConfig } from "./config.js";
import { AtlassianHttpClient } from "./clients/http-client.js";
import { JiraClient } from "./clients/jira-client.js";
import { JiraAgileClient } from "./clients/jira-agile-client.js";
import { ConfluenceClient } from "./clients/confluence-client.js";
import { registerJiraTools } from "./tools/jira/index.js";
import { registerConfluenceTools } from "./tools/confluence/index.js";
import { registerResources } from "./resources/index.js";

export function createServer(config: AtlassianConfig): McpServer {
  const server = new McpServer({
    name: "atlassian-mcp-server",
    version: "1.0.0",
  });

  const httpClient = new AtlassianHttpClient(config);
  const jiraClient = new JiraClient(httpClient);
  const agileClient = new JiraAgileClient(httpClient);
  const confluenceClient = new ConfluenceClient(httpClient);

  registerJiraTools(server, jiraClient, agileClient);
  registerConfluenceTools(server, confluenceClient);
  registerResources(server, jiraClient, agileClient, confluenceClient);

  return server;
}
