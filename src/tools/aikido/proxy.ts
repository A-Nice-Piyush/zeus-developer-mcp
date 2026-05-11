import { createRequire } from "module";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const require = createRequire(import.meta.url);

/**
 * Converts a JSON Schema property definition to a Zod schema.
 * Handles the subset of JSON Schema types used by the Aikido MCP server.
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
    zodType = z.unknown();
  }

  if (description) {
    zodType = zodType.describe(description);
  }

  return zodType;
}

/**
 * Builds a Zod object schema from a JSON Schema "object" properties map.
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

/**
 * Spawns the official Aikido MCP server (@aikidosec/mcp, installed as a
 * dependency and baked into the Docker image), discovers all tools it
 * exposes, and re-registers each one in our McpServer.
 *
 * We resolve the package's entrypoint at runtime and invoke it with `node`
 * directly — this avoids npx's on-demand download, which is slow, needs
 * network access from inside the container, and can fail silently.
 *
 * Required env vars:
 *   AIKIDO_API_KEY  — Aikido Personal Access Token
 *                     (generate at https://app.aikido.dev/settings/integrations/ide/mcp)
 */
export async function registerAikidoMcpProxy(server: McpServer): Promise<void> {
  const apiKey = process.env.AIKIDO_API_KEY;
  if (!apiKey) {
    console.error("Aikido tools disabled: AIKIDO_API_KEY is not set");
    return;
  }

  // Resolution order:
  //   1. AIKIDO_MCP_PATH env override (for testing / custom installs)
  //   2. /opt/aikido-mcp/dist/index.js (baked into our Docker image)
  //   3. require.resolve("@aikidosec/mcp") (local dev when installed via npm)
  let aikidoEntrypoint: string | undefined = process.env.AIKIDO_MCP_PATH;
  if (!aikidoEntrypoint) {
    const bakedPath = "/opt/aikido-mcp/dist/index.js";
    try {
      // Lazy check — avoid importing fs at module top just for this
      const { existsSync } = await import("fs");
      if (existsSync(bakedPath)) {
        aikidoEntrypoint = bakedPath;
      }
    } catch {
      // ignore
    }
  }
  if (!aikidoEntrypoint) {
    try {
      aikidoEntrypoint = require.resolve("@aikidosec/mcp");
    } catch (err) {
      console.error(
        "Aikido tools disabled: @aikidosec/mcp entrypoint not found (looked in /opt/aikido-mcp and node_modules):",
        err,
      );
      return;
    }
  }

  const transport = new StdioClientTransport({
    command: process.execPath, // use the same node binary we're already running under
    args: [aikidoEntrypoint],
    env: { ...process.env } as Record<string, string>,
  });

  const client = new Client(
    { name: "zeus-aikido-proxy", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
  } catch (err) {
    console.error("Aikido MCP proxy: failed to start @aikidosec/mcp process:", err);
    return;
  }

  let toolList: Awaited<ReturnType<typeof client.listTools>>["tools"];
  try {
    const response = await client.listTools();
    toolList = response.tools;
  } catch (err) {
    console.error("Aikido MCP proxy: failed to list tools from upstream server:", err);
    await client.close();
    return;
  }

  console.error(`Aikido MCP proxy: registering ${toolList.length} tools from official server`);

  for (const tool of toolList) {
    const zodSchema = buildZodSchema(
      tool.inputSchema as Record<string, unknown> | undefined,
    );

    server.tool(
      tool.name,
      tool.description ?? "",
      zodSchema,
      async (params: Record<string, unknown>) => {
        try {
          const result = await client.callTool({
            name: tool.name,
            arguments: params,
          });
          return result as unknown as { content: [{ type: "text"; text: string }] };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: "text" as const, text: `Aikido tool error: ${message}` }],
          };
        }
      },
    );
  }
}
