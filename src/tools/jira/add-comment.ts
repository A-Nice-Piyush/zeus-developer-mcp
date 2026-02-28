import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraClient } from "../../clients/jira-client.js";
import { AtlassianApiError } from "../../clients/http-client.js";

export function registerAddComment(server: McpServer, jira: JiraClient): void {
  server.tool(
    "jira_add_comment",
    "Add a comment to a JIRA issue.",
    {
      issueKey: z.string().describe("JIRA issue key, e.g. 'PROJ-123'"),
      comment: z.string().describe("Comment text to add to the issue"),
    },
    async ({ issueKey, comment }) => {
      try {
        await jira.addComment(issueKey, comment);
        return { content: [{ type: "text", text: `Comment added to ${issueKey}.` }] };
      } catch (error) {
        if (error instanceof AtlassianApiError) {
          return { content: [{ type: "text", text: `Error adding comment: ${error.message}` }], isError: true };
        }
        return { content: [{ type: "text", text: `Unexpected error: ${String(error)}` }], isError: true };
      }
    },
  );
}
