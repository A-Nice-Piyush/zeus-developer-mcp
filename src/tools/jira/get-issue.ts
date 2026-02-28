import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraClient } from "../../clients/jira-client.js";
import { AtlassianApiError } from "../../clients/http-client.js";
import { adfToMarkdown } from "../../converters/adf-to-markdown.js";
import { truncateText, truncateComments } from "../../converters/truncation.js";
import type { JiraIssue } from "../../types/jira.js";

export function registerGetIssue(server: McpServer, jira: JiraClient): void {
  server.tool(
    "jira_get_issue",
    "Get detailed information about a specific JIRA issue including description, status, assignee, and recent comments.",
    {
      issueKey: z.string().describe("JIRA issue key, e.g. 'PROJ-123'"),
    },
    async ({ issueKey }) => {
      try {
        const issue = await jira.getIssue(issueKey);
        const markdown = formatIssueDetail(issue);

        const contentBlocks: Array<
          { type: "text"; text: string } | { type: "image"; data: string; mimeType: string }
        > = [{ type: "text", text: markdown }];

        const imageAttachments = (issue.fields.attachment ?? [])
          .filter((a) => a.mimeType.startsWith("image/"))
          .slice(0, 5);

        for (const att of imageAttachments) {
          const image = await jira.getAttachmentImage(att);
          if (image) contentBlocks.push({ type: "image", data: image.data, mimeType: image.mimeType });
        }

        return { content: contentBlocks };
      } catch (error) {
        if (error instanceof AtlassianApiError) {
          if (error.status === 404) {
            return { content: [{ type: "text", text: `Issue not found: ${issueKey}. Verify the issue key is correct.` }], isError: true };
          }
          return { content: [{ type: "text", text: `Error fetching issue: ${error.message}` }], isError: true };
        }
        return { content: [{ type: "text", text: `Unexpected error: ${String(error)}` }], isError: true };
      }
    },
  );
}

export function formatIssueDetail(issue: JiraIssue): string {
  const f = issue.fields;
  const lines: string[] = [];

  lines.push(`# ${issue.key}: ${f.summary}`);
  lines.push("");
  lines.push(`**Type:** ${f.issuetype.name}`);
  lines.push(`**Status:** ${f.status.name} (${f.status.statusCategory.name})`);
  if (f.priority) lines.push(`**Priority:** ${f.priority.name}`);
  lines.push(`**Assignee:** ${f.assignee?.displayName || "Unassigned"}`);
  if (f.reporter) lines.push(`**Reporter:** ${f.reporter.displayName}`);
  if (f.labels.length > 0) lines.push(`**Labels:** ${f.labels.join(", ")}`);
  if (f.components.length > 0) lines.push(`**Components:** ${f.components.map((c) => c.name).join(", ")}`);
  if (f.parent) lines.push(`**Parent:** ${f.parent.key} - ${f.parent.fields.summary}`);
  lines.push(`**Created:** ${f.created}`);
  lines.push(`**Updated:** ${f.updated}`);

  if (f.description) {
    const descMd = adfToMarkdown(f.description);
    if (descMd) {
      lines.push("");
      lines.push("## Description");
      lines.push(truncateText(descMd));
    }
  }

  if (f.attachment && f.attachment.length > 0) {
    lines.push("");
    lines.push(`## Attachments (${f.attachment.length})`);
    for (const att of f.attachment) {
      const sizeKb = (att.size / 1024).toFixed(0);
      lines.push(`- ${att.filename} (${att.mimeType}, ${sizeKb} KB)`);
    }
  }

  if (f.comment && f.comment.comments.length > 0) {
    const { comments, truncated, total } = truncateComments(f.comment.comments);
    lines.push("");
    lines.push(`## Comments${truncated ? ` (showing last ${comments.length} of ${total})` : ""}`);
    for (const c of comments) {
      lines.push("");
      lines.push(`### ${c.author.displayName} — ${c.created}`);
      lines.push(truncateText(adfToMarkdown(c.body), 3000));
    }
  }

  return lines.join("\n");
}
