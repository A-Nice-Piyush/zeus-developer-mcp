import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraClient } from "../../clients/jira-client.js";
import type { JiraAgileClient } from "../../clients/jira-agile-client.js";
import { registerSearchIssues } from "./search-issues.js";
import { registerGetIssue } from "./get-issue.js";
import { registerGetEpic } from "./get-epic.js";
import { registerGetSprint } from "./get-sprint.js";
import { registerListProjects } from "./list-projects.js";
import { registerAddComment } from "./add-comment.js";
import { registerUpdateStatus } from "./update-status.js";

export function registerJiraTools(
  server: McpServer,
  jira: JiraClient,
  agile: JiraAgileClient,
): void {
  registerSearchIssues(server, jira);
  registerGetIssue(server, jira);
  registerGetEpic(server, jira);
  registerGetSprint(server, jira, agile);
  registerListProjects(server, jira);
  registerAddComment(server, jira);
  registerUpdateStatus(server, jira);
}
