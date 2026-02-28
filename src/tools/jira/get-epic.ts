import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraClient } from "../../clients/jira-client.js";
import { AtlassianApiError } from "../../clients/http-client.js";
import { adfToMarkdown } from "../../converters/adf-to-markdown.js";
import { truncateText, truncateList } from "../../converters/truncation.js";
import type { JiraIssue } from "../../types/jira.js";

export function registerGetEpic(server: McpServer, jira: JiraClient): void {
  server.tool(
    "jira_get_epic",
    "Get a JIRA epic with all its child stories/tasks, grouped by status. Shows progress overview.",
    {
      epicKey: z.string().describe("Epic issue key, e.g. 'PROJ-50'"),
    },
    async ({ epicKey }) => {
      try {
        const { epic, children } = await jira.getEpicWithChildren(epicKey);
        const markdown = formatEpicDetail(epic, children);
        return { content: [{ type: "text", text: markdown }] };
      } catch (error) {
        if (error instanceof AtlassianApiError) {
          return { content: [{ type: "text", text: `Error fetching epic: ${error.message}` }], isError: true };
        }
        return { content: [{ type: "text", text: `Unexpected error: ${String(error)}` }], isError: true };
      }
    },
  );
}

export function formatEpicDetail(epic: JiraIssue, children: JiraIssue[]): string {
  const f = epic.fields;
  const lines: string[] = [];

  lines.push(`# Epic: ${epic.key} — ${f.summary}`);
  lines.push("");
  lines.push(`**Status:** ${f.status.name}`);
  if (f.assignee) lines.push(`**Assignee:** ${f.assignee.displayName}`);
  if (f.priority) lines.push(`**Priority:** ${f.priority.name}`);

  if (f.description) {
    const descMd = adfToMarkdown(f.description);
    if (descMd) {
      lines.push("");
      lines.push("## Description");
      lines.push(truncateText(descMd, 5000));
    }
  }

  // Progress
  const done = children.filter((c) => c.fields.status.statusCategory.name === "Done").length;
  const total = children.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  lines.push("");
  lines.push(`## Progress: ${done} of ${total} complete (${pct}%)`);

  // Group children by status category
  const groups: Record<string, JiraIssue[]> = {
    "To Do": [],
    "In Progress": [],
    Done: [],
  };

  for (const child of children) {
    const cat = child.fields.status.statusCategory.name;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(child);
  }

  for (const [category, issues] of Object.entries(groups)) {
    if (issues.length === 0) continue;
    const { items, truncated } = truncateList(issues);
    lines.push("");
    lines.push(`### ${category} (${issues.length})`);
    for (const issue of items) {
      const assignee = issue.fields.assignee?.displayName || "Unassigned";
      lines.push(`- ${issue.key} | ${issue.fields.issuetype.name} | ${issue.fields.summary} | ${issue.fields.status.name} | ${assignee}`);
    }
    if (truncated) {
      lines.push(`- ... and ${issues.length - items.length} more`);
    }
  }

  return lines.join("\n");
}
