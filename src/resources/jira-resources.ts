import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraClient } from "../clients/jira-client.js";
import type { JiraAgileClient } from "../clients/jira-agile-client.js";
import { formatIssueDetail } from "../tools/jira/get-issue.js";
import { formatEpicDetail } from "../tools/jira/get-epic.js";

export function registerJiraResources(
  server: McpServer,
  jira: JiraClient,
  agile: JiraAgileClient,
): void {
  // jira://issue/{issueKey}
  server.resource(
    "jira-issue",
    new ResourceTemplate("jira://issue/{issueKey}", { list: undefined }),
    {
      description: "Browse a specific JIRA issue by key",
      mimeType: "text/markdown",
    },
    async (uri, { issueKey }) => {
      const issue = await jira.getIssue(issueKey as string);
      const markdown = formatIssueDetail(issue);
      return { contents: [{ uri: uri.href, text: markdown, mimeType: "text/markdown" }] };
    },
  );

  // jira://epic/{issueKey}
  server.resource(
    "jira-epic",
    new ResourceTemplate("jira://epic/{issueKey}", { list: undefined }),
    {
      description: "Browse a JIRA epic with all child stories/tasks",
      mimeType: "text/markdown",
    },
    async (uri, { issueKey }) => {
      const { epic, children } = await jira.getEpicWithChildren(issueKey as string);
      const markdown = formatEpicDetail(epic, children);
      return { contents: [{ uri: uri.href, text: markdown, mimeType: "text/markdown" }] };
    },
  );
}
