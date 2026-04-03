import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { VeracodeClient } from "../../clients/veracode-client.js";
import type { VeracodeConfig } from "../../config.js";

export function registerUploadAndScan(
  server: McpServer,
  client: VeracodeClient,
  config: VeracodeConfig,
): void {
  server.tool(
    "veracode_upload_and_scan",
    "Uploads a local ZIP build artifact to Veracode and starts a new SAST scan. The scan takes 10–25 minutes. Use veracode_get_scan_status to poll for completion.",
    {
      filePath: z
        .string()
        .describe("Absolute local path to the ZIP file produced by dotnet publish (e.g. C:\\builds\\pocredirector-build-artifact.zip)"),
      appName: z
        .string()
        .optional()
        .describe("Veracode application profile name. Defaults to VERACODE_APP_NAME env var."),
    },
    async ({ filePath, appName }) => {
      const resolvedAppName = appName ?? config.defaultAppName;
      if (!resolvedAppName) {
        return {
          content: [
            {
              type: "text",
              text: "Error: appName is required. Either pass it explicitly or set VERACODE_APP_NAME in your .env file.",
            },
          ],
        };
      }

      const lines: string[] = [];

      lines.push(`App:      ${resolvedAppName}`);
      lines.push(`File:     ${filePath}`);
      lines.push("");

      // Step 1: resolve app ID
      lines.push("Step 1/4: Resolving app ID...");
      const appId = await client.findAppId(resolvedAppName);
      lines.push(`          App ID: ${appId}`);

      // Step 2: create build
      lines.push("Step 2/4: Creating new build/scan...");
      const buildId = await client.createBuild(appId);
      lines.push(`          Build ID: ${buildId}`);

      // Step 3: upload file
      lines.push("Step 3/4: Uploading artifact (this may take a moment)...");
      await client.uploadFile(appId, filePath);
      lines.push("          Upload complete.");

      // Step 4: begin pre-scan (triggers full scan automatically with auto_scan=true)
      lines.push("Step 4/4: Starting pre-scan (auto_scan=true)...");
      await client.beginPrescan(appId);
      lines.push("          Pre-scan started. Full scan will begin automatically.");

      lines.push("");
      lines.push("Scan submitted successfully.");
      lines.push(`Build ID: ${buildId}`);
      lines.push("");
      lines.push("Scans typically take 10–25 minutes. Use veracode_get_scan_status to check progress.");

      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    },
  );
}
