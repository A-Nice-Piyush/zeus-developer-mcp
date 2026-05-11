import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AikidoClient } from "../../clients/aikido-client.js";

export function registerAikidoListRepos(server: McpServer, client: AikidoClient): void {
  server.tool(
    "aikido_list_repos",
    [
      "List code repositories connected to Aikido Security.",
      "Use when the user asks 'which repos are in Aikido', 'what repos do I have connected',",
      "or as a lookup step before calling aikido_get_issues when you don't know the exact repo name.",
      "Returns repo name, numeric ID, provider, and default branch.",
    ].join(" "),
    {
      filterName: z
        .string()
        .optional()
        .describe("Optional substring to filter repository names server-side."),
    },
    async ({ filterName }) => {
      const repos = await client.listCodeRepos(filterName);

      if (repos.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: filterName
                ? `No Aikido code repositories match "${filterName}".`
                : "No Aikido code repositories found. Verify your API credentials have access.",
            },
          ],
        };
      }

      const maxNameLen = Math.max(8, ...repos.map((r) => r.name.length));
      const header = `${"Repo Name".padEnd(maxNameLen)}  ID       Provider  Branch`;
      const separator = "-".repeat(maxNameLen) + "  " + "-".repeat(7) + "  " + "-".repeat(8) + "  " + "-".repeat(10);
      const rows = repos.map(
        (r) =>
          `${r.name.padEnd(maxNameLen)}  ${String(r.id).padEnd(7)}  ${(r.provider ?? "").padEnd(8)}  ${r.defaultBranch ?? ""}`,
      );

      return {
        content: [
          { type: "text", text: [header, separator, ...rows].join("\n") },
        ],
      };
    },
  );
}
