import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AtlassianConfig } from "./config.js";
import { loadVeracodeConfig, loadAikidoConfig } from "./config.js";
import { AtlassianHttpClient } from "./clients/http-client.js";
import { JiraClient } from "./clients/jira-client.js";
import { JiraAgileClient } from "./clients/jira-agile-client.js";
import { ConfluenceClient } from "./clients/confluence-client.js";
import { VeracodeClient } from "./clients/veracode-client.js";
import { AikidoClient } from "./clients/aikido-client.js";
import { registerJiraTools } from "./tools/jira/index.js";
import { registerConfluenceTools } from "./tools/confluence/index.js";
import { registerVeracodeTools } from "./tools/veracode/index.js";
import { registerSonarQubeMcpProxy } from "./tools/sonarqube/index.js";
import { registerAikidoMcpProxy, registerAikidoTools } from "./tools/aikido/index.js";
import { registerResources } from "./resources/index.js";

export async function createServer(config: AtlassianConfig): Promise<McpServer> {
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

  const veracodeConfig = loadVeracodeConfig();
  if (veracodeConfig) {
    const veracodeClient = new VeracodeClient(veracodeConfig);
    registerVeracodeTools(server, veracodeClient, veracodeConfig);
  } else {
    console.error("Veracode tools disabled: VERACODE_API_ID and VERACODE_API_KEY not set");
  }

  // Proxy all tools from the official SonarQube MCP server (Docker image mcp/sonarqube).
  // Requires SONARQUBE_TOKEN; optionally SONARQUBE_URL, SONARQUBE_ORG, SONARQUBE_PROJECT_KEY.
  await registerSonarQubeMcpProxy(server);

  // Proxy all tools from the official Aikido MCP server (npx @aikidosec/mcp).
  // Requires AIKIDO_API_KEY.
  await registerAikidoMcpProxy(server);

  // Custom Aikido REST tools (Public API, OAuth client credentials).
  // Requires AIKIDO_CLIENT_ID and AIKIDO_CLIENT_SECRET.
  const aikidoConfig = loadAikidoConfig();
  if (aikidoConfig) {
    const aikidoClient = new AikidoClient(aikidoConfig);
    registerAikidoTools(server, aikidoClient, aikidoConfig);
  } else {
    console.error("Aikido custom tools disabled: AIKIDO_CLIENT_ID and AIKIDO_CLIENT_SECRET not set");
  }

  return server;
}
