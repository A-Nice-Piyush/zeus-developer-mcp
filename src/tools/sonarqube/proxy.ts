import { spawn } from "child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Converts a JSON Schema property definition to a Zod schema.
 * Handles the subset of JSON Schema types used by the SonarQube MCP server.
 */
function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodTypeAny {
  const type = schema.type as string | undefined;
  const description = schema.description as string | undefined;

  let zodType: z.ZodTypeAny;

  if (schema.enum) {
    const values = schema.enum as [string, ...string[]];
    zodType = z.enum(values);
  } else if (type === "string") {
    zodType = z.string();
  } else if (type === "number" || type === "integer") {
    zodType = z.number();
  } else if (type === "boolean") {
    zodType = z.boolean();
  } else if (type === "array") {
    const items = (schema.items as Record<string, unknown>) ?? {};
    zodType = z.array(jsonSchemaToZod(items));
  } else if (type === "object") {
    zodType = z.record(z.unknown());
  } else {
    // Fallback: accept any value
    zodType = z.unknown();
  }

  if (description) {
    zodType = zodType.describe(description);
  }

  return zodType;
}

/**
 * Builds a Zod object schema from a JSON Schema "object" properties map.
 * Returns an empty object schema if the tool has no input parameters.
 */
function buildZodSchema(
  inputSchema: Record<string, unknown> | undefined,
): Record<string, z.ZodTypeAny> {
  if (!inputSchema) return {};

  const properties = inputSchema.properties as Record<string, Record<string, unknown>> | undefined;
  if (!properties) return {};

  const required = (inputSchema.required as string[]) ?? [];
  const result: Record<string, z.ZodTypeAny> = {};

  for (const [key, propSchema] of Object.entries(properties)) {
    let zodType = jsonSchemaToZod(propSchema);
    if (!required.includes(key)) {
      zodType = zodType.optional();
    }
    result[key] = zodType;
  }

  return result;
}

// Parameter names the SonarQube MCP server uses for a project identifier.
// When one of these is optional in a tool's schema and the caller omits it,
// we fall back to SONARQUBE_PROJECT_KEY so the LLM doesn't have to repeat it.
const PROJECT_KEY_PARAMS = ["projectKey", "component", "project", "componentKey"];

/**
 * Spawns the official SonarQube MCP server Docker image, discovers all tools
 * it exposes, and re-registers each one in our McpServer so they appear
 * transparently to the LLM.
 *
 * Required env vars (passed straight through to the container):
 *   SONARQUBE_TOKEN   — SonarQube user token
 *   SONARQUBE_URL     — SonarQube server URL (defaults to https://sonarcloud.io if omitted)
 *   SONARQUBE_ORG     — Organisation key (SonarQube Cloud only)
 *
 * Optional:
 *   SONARQUBE_PROJECT_KEY  — default project key injected when tools omit it
 *   SONARQUBE_READ_ONLY    — set to "true" to disable write operations in the upstream server
 *   TELEMETRY_DISABLED     — set to "true" to opt out of upstream telemetry
 */
export async function registerSonarQubeMcpProxy(server: McpServer): Promise<void> {
  const token = process.env.SONARQUBE_TOKEN;
  if (!token) {
    console.error("SonarQube tools disabled: SONARQUBE_TOKEN is not set");
    return;
  }

  const defaultProjectKey = process.env.SONARQUBE_PROJECT_KEY;

  // Build the docker run command, forwarding all relevant env vars.
  const dockerArgs = [
    "run",
    "--init",
    "--rm",
    "-i", // keep stdin open for stdio transport
    "-e", "SONARQUBE_TOKEN",
    "-e", "SONARQUBE_URL",
    "-e", "SONARQUBE_ORG",
    "-e", "SONARQUBE_PROJECT_KEY",
    "-e", "SONARQUBE_READ_ONLY",
    "-e", "TELEMETRY_DISABLED",
    "mcp/sonarqube",
  ];

  // Prepare the child environment — only pass vars that are actually set so
  // Docker doesn't receive empty strings (which could override defaults).
  const childEnv: Record<string, string> = { ...process.env } as Record<string, string>;

  const transport = new StdioClientTransport({
    command: "docker",
    args: dockerArgs,
    env: childEnv,
  });

  const client = new Client(
    { name: "zeus-sonarqube-proxy", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
  } catch (err) {
    console.error("SonarQube MCP proxy: failed to start Docker container:", err);
    return;
  }

  let toolList: Awaited<ReturnType<typeof client.listTools>>["tools"];
  try {
    const response = await client.listTools();
    toolList = response.tools;
  } catch (err) {
    console.error("SonarQube MCP proxy: failed to list tools from upstream server:", err);
    await client.close();
    return;
  }

  console.error(`SonarQube MCP proxy: registering ${toolList.length} tools from official server`);

  for (const tool of toolList) {
    const inputSchema = tool.inputSchema as Record<string, unknown> | undefined;
    const zodSchema = buildZodSchema(inputSchema);

    // Determine which project-key param names this tool accepts (if any).
    const properties = (inputSchema?.properties ?? {}) as Record<string, unknown>;
    const required = (inputSchema?.required as string[] | undefined) ?? [];
    const projectKeyParams = PROJECT_KEY_PARAMS.filter(
      (p) => p in properties && !required.includes(p),
    );

    // Append a note to the description so the LLM knows the default is pre-configured.
    let description = tool.description ?? "";
    if (defaultProjectKey && projectKeyParams.length > 0) {
      description += ` (default project: ${defaultProjectKey})`;
    }

    server.tool(
      tool.name,
      description,
      zodSchema,
      async (params: Record<string, unknown>) => {
        // Inject default project key for any project-identifier param the caller left empty.
        const finalParams = { ...params };
        if (defaultProjectKey) {
          for (const p of projectKeyParams) {
            if (finalParams[p] === undefined || finalParams[p] === null || finalParams[p] === "") {
              finalParams[p] = defaultProjectKey;
            }
          }
        }

        try {
          const result = await client.callTool({
            name: tool.name,
            arguments: finalParams,
          });
          // The upstream result content is already in the correct MCP format;
          // cast through unknown to satisfy the strict literal-type check.
          return result as unknown as { content: [{ type: "text"; text: string }] };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: "text" as const, text: `SonarQube tool error: ${message}` }],
          };
        }
      },
    );
  }
}
