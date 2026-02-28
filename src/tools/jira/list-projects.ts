import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JiraClient } from "../../clients/jira-client.js";
import { AtlassianApiError } from "../../clients/http-client.js";

export function registerListProjects(server: McpServer, jira: JiraClient): void {
  server.tool(
    "jira_list_projects",
    "List all accessible JIRA projects.",
    {
      maxResults: z.number().min(1).max(100).optional().default(50).describe("Maximum results (1-100)"),
    },
    async ({ maxResults }) => {
      try {
        const projects = await jira.listProjects(maxResults);

        if (projects.length === 0) {
          return { content: [{ type: "text", text: "No accessible projects found." }] };
        }

        const lines = [
          `Found ${projects.length} projects:`,
          "",
          "Key | Name | Type",
          "--- | ---- | ----",
          ...projects.map((p) => `${p.key} | ${p.name} | ${p.projectTypeKey}`),
        ];

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (error) {
        if (error instanceof AtlassianApiError) {
          return { content: [{ type: "text", text: `Error listing projects: ${error.message}` }], isError: true };
        }
        return { content: [{ type: "text", text: `Unexpected error: ${String(error)}` }], isError: true };
      }
    },
  );
}
