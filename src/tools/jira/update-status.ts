import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraClient } from "../../clients/jira-client.js";
import { AtlassianApiError } from "../../clients/http-client.js";

export function registerUpdateStatus(server: McpServer, jira: JiraClient): void {
  server.tool(
    "jira_update_status",
    "Transition a JIRA issue to a new status. Fetches available transitions and matches by name.",
    {
      issueKey: z.string().describe("JIRA issue key, e.g. 'PROJ-123'"),
      statusName: z.string().describe("Target status name, e.g. 'In Progress', 'Done'"),
    },
    async ({ issueKey, statusName }) => {
      try {
        const transitions = await jira.getTransitions(issueKey);

        // Find matching transition (case-insensitive)
        const match = transitions.find(
          (t) =>
            t.name.toLowerCase() === statusName.toLowerCase() ||
            t.to.name.toLowerCase() === statusName.toLowerCase(),
        );

        if (!match) {
          const available = transitions.map((t) => `"${t.name}" → ${t.to.name}`).join(", ");
          return {
            content: [{ type: "text", text: `No transition matching "${statusName}" found for ${issueKey}. Available transitions: ${available}` }],
            isError: true,
          };
        }

        await jira.transitionIssue(issueKey, match.id);
        return { content: [{ type: "text", text: `${issueKey} transitioned to "${match.to.name}".` }] };
      } catch (error) {
        if (error instanceof AtlassianApiError) {
          return { content: [{ type: "text", text: `Error updating status: ${error.message}` }], isError: true };
        }
        return { content: [{ type: "text", text: `Unexpected error: ${String(error)}` }], isError: true };
      }
    },
  );
}
