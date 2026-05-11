import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AikidoClient } from "../../clients/aikido-client.js";
import type { AikidoConfig } from "../../config.js";
import { registerAikidoListRepos } from "./list-repos.js";
import { registerAikidoGetIssues } from "./get-issues.js";

export { registerAikidoMcpProxy } from "./proxy.js";

export function registerAikidoTools(
  server: McpServer,
  client: AikidoClient,
  config: AikidoConfig,
): void {
  registerAikidoListRepos(server, client);
  registerAikidoGetIssues(server, client, config);
}
