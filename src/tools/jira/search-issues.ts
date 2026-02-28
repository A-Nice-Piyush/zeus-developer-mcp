import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraClient } from "../../clients/jira-client.js";
import { AtlassianApiError } from "../../clients/http-client.js";
import { truncateList } from "../../converters/truncation.js";
import type { JiraIssue } from "../../types/jira.js";

export function registerSearchIssues(server: McpServer, jira: JiraClient): void {
  server.tool(
    "jira_search_issues",
    "Search JIRA issues using JQL (JIRA Query Language). Returns a list of matching issues with key details.",
    {
      jql: z.string().describe("JQL query string, e.g. 'project = PROJ AND status = \"In Progress\"'"),
      maxResults: z.number().min(1).max(50).optional().default(20).describe("Maximum number of results to return (1-50)"),
    },
    async ({ jql, maxResults }) => {
      try {
        const result = await jira.searchIssues(jql, maxResults);
        const { items, truncated, total } = truncateList(result.issues);

        const lines = [
          `Found ${result.total} total results for: ${jql}`,
          truncated ? `(showing first ${items.length} of ${total})` : "",
          "",
          ...items.map((issue) => formatIssueLine(issue)),
        ].filter(Boolean);

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        return handleError(error, "searching JIRA issues");
      }
    },
  );
}

function formatIssueLine(issue: JiraIssue): string {
  const assignee = issue.fields.assignee?.displayName || "Unassigned";
  return `${issue.key} | ${issue.fields.issuetype.name} | ${issue.fields.summary} | ${issue.fields.status.name} | ${assignee}`;
}

function handleError(error: unknown, context: string) {
  if (error instanceof AtlassianApiError) {
    return {
      content: [{ type: "text" as const, text: `Error ${context}: ${error.message}` }],
      isError: true,
    };
  }
  return {
    content: [{ type: "text" as const, text: `Unexpected error ${context}: ${String(error)}` }],
    isError: true,
  };
}
