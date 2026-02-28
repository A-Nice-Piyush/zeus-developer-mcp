import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraClient } from "../../clients/jira-client.js";
import { JiraAgileClient } from "../../clients/jira-agile-client.js";
import { AtlassianApiError } from "../../clients/http-client.js";
import { truncateList } from "../../converters/truncation.js";
import type { JiraIssue } from "../../types/jira.js";

export function registerGetSprint(server: McpServer, jira: JiraClient, agile: JiraAgileClient): void {
  server.tool(
    "jira_get_sprint",
    "Get the current/active sprint issues for a board. Provide either boardId or projectKey.",
    {
      boardId: z.number().optional().describe("Board ID (if known)"),
      projectKey: z.string().optional().describe("Project key to find the board (e.g. 'PROJ')"),
    },
    async ({ boardId, projectKey }) => {
      try {
        if (!boardId && !projectKey) {
          return { content: [{ type: "text", text: "Please provide either boardId or projectKey." }], isError: true };
        }

        let resolvedBoardId = boardId;
        if (!resolvedBoardId && projectKey) {
          const board = await agile.getBoardByProject(projectKey);
          if (!board) {
            return { content: [{ type: "text", text: `No board found for project "${projectKey}".` }], isError: true };
          }
          resolvedBoardId = board.id;
        }

        const sprint = await agile.getActiveSprint(resolvedBoardId!);
        if (!sprint) {
          return { content: [{ type: "text", text: `No active sprint found for board ${resolvedBoardId}.` }] };
        }

        const issues = await agile.getSprintIssues(sprint.id);
        const lines: string[] = [];

        lines.push(`# Sprint: ${sprint.name}`);
        if (sprint.goal) lines.push(`**Goal:** ${sprint.goal}`);
        lines.push(`**State:** ${sprint.state}`);
        lines.push(`**Start:** ${sprint.startDate}`);
        lines.push(`**End:** ${sprint.endDate}`);

        // Group by status category
        const groups: Record<string, JiraIssue[]> = { "To Do": [], "In Progress": [], Done: [] };
        for (const issue of issues) {
          const cat = issue.fields.status.statusCategory.name;
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(issue);
        }

        const done = groups["Done"]?.length || 0;
        const total = issues.length;
        lines.push(`**Progress:** ${done} of ${total} complete (${total > 0 ? Math.round((done / total) * 100) : 0}%)`);

        for (const [category, catIssues] of Object.entries(groups)) {
          if (catIssues.length === 0) continue;
          const { items, truncated } = truncateList(catIssues);
          lines.push("");
          lines.push(`## ${category} (${catIssues.length})`);
          for (const issue of items) {
            const assignee = issue.fields.assignee?.displayName || "Unassigned";
            lines.push(`- ${issue.key} | ${issue.fields.issuetype.name} | ${issue.fields.summary} | ${assignee}`);
          }
          if (truncated) lines.push(`- ... and ${catIssues.length - items.length} more`);
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        if (error instanceof AtlassianApiError) {
          return { content: [{ type: "text", text: `Error fetching sprint: ${error.message}` }], isError: true };
        }
        return { content: [{ type: "text", text: `Unexpected error: ${String(error)}` }], isError: true };
      }
    },
  );
}
