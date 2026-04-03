import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SonarQubeClient } from "../../clients/sonarqube-client.js";
import type { SonarQubeConfig } from "../../config.js";
import { registerListProjects } from "./list-projects.js";
import { registerGetReport } from "./get-report.js";
import { registerGetIssues } from "./get-issues.js";

export function registerSonarQubeTools(
  server: McpServer,
  client: SonarQubeClient,
  config: SonarQubeConfig,
): void {
  registerListProjects(server, client);
  registerGetReport(server, client, config);
  registerGetIssues(server, client, config);
}
