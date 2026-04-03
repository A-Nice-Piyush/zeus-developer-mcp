import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { VeracodeClient } from "../../clients/veracode-client.js";
import type { VeracodeConfig } from "../../config.js";
import { registerListApps } from "./list-apps.js";
import { registerListBuilds } from "./list-builds.js";
import { registerUploadAndScan } from "./upload-scan.js";
import { registerGetScanStatus } from "./get-scan-status.js";
import { registerGetFindings } from "./get-findings.js";
import { registerFindScanForPR } from "./find-scan-for-pr.js";

export function registerVeracodeTools(
  server: McpServer,
  client: VeracodeClient,
  config: VeracodeConfig,
): void {
  registerListApps(server, client);
  registerListBuilds(server, client, config);
  registerUploadAndScan(server, client, config);
  registerGetScanStatus(server, client, config);
  registerGetFindings(server, client, config);
  registerFindScanForPR(server, client, config);
}
