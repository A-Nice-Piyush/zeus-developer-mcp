import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SonarQubeClient } from "../../clients/sonarqube-client.js";

export function registerListProjects(server: McpServer, client: SonarQubeClient): void {
  server.tool(
    "sonarqube_list_projects",
    "Lists SonarQube projects you have access to. Use this to find the correct project key before running reports or issue searches.",
    {
      query: z
        .string()
        .optional()
        .describe("Optional search query to filter projects by name or key."),
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe("Maximum number of projects to return. Default: 25."),
    },
    async ({ query, maxResults }) => {
      const response = await client.searchProjects(query, maxResults ?? 25);
      const projects = response.components;

      if (projects.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: query
                ? `No SonarQube projects found matching "${query}".`
                : "No SonarQube projects found. Verify your token has correct permissions.",
            },
          ],
        };
      }

      const maxKeyLen = Math.max(11, ...projects.map((p) => p.key.length));
      const maxNameLen = Math.max(12, ...projects.map((p) => p.name.length));
      const header = `${"Project Key".padEnd(maxKeyLen)}  ${"Project Name".padEnd(maxNameLen)}  Last Analysis`;
      const separator = "-".repeat(maxKeyLen) + "  " + "-".repeat(maxNameLen) + "  " + "-".repeat(19);
      const rows = projects.map(
        (p) =>
          `${p.key.padEnd(maxKeyLen)}  ${p.name.padEnd(maxNameLen)}  ${p.lastAnalysisDate ?? "Never"}`,
      );

      const footer =
        response.paging.total > projects.length
          ? `\n(showing ${projects.length} of ${response.paging.total} total projects)`
          : `\n(${projects.length} project${projects.length !== 1 ? "s" : ""} total)`;

      return {
        content: [
          {
            type: "text",
            text: [header, separator, ...rows].join("\n") + footer,
          },
        ],
      };
    },
  );
}
