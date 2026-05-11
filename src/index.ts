#!/usr/bin/env node

import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const server = await createServer(config);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Log to stderr — stdout is reserved for MCP JSON-RPC protocol
  console.error("Atlassian MCP server started on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});
