import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ConfluenceClient } from "../../clients/confluence-client.js";
import { AtlassianApiError } from "../../clients/http-client.js";
import { adfToMarkdown } from "../../converters/adf-to-markdown.js";
import { storageToMarkdown } from "../../converters/storage-to-markdown.js";
import { drawioToText } from "../../converters/drawio-to-text.js";
import { truncateText } from "../../converters/truncation.js";
import type { ConfluencePage } from "../../types/confluence.js";

export function registerGetPage(server: McpServer, confluence: ConfluenceClient): void {
  server.tool(
    "confluence_get_page",
    "Get a Confluence page content converted to readable markdown. Use confluence_search to find page IDs.",
    {
      pageId: z.string().describe("Confluence page ID (numeric string)"),
    },
    async ({ pageId }) => {
      try {
        const page = await confluence.getPage(pageId);
        let markdown = formatPageContent(page);

        // Detect and resolve draw.io diagrams stored as attachments
        const storageXml =
          page.body?.storage?.value ?? (await confluence.getPageStorageXml(pageId));
        if (storageXml) {
          const diagrams = await extractDrawioAttachments(pageId, storageXml, confluence);
          if (diagrams.length > 0) {
            markdown += "\n\n---\n\n## Embedded Diagrams\n\n" + diagrams.join("\n\n");
          }
        }

        // Extract embedded images and return as MCP image content blocks
        const contentBlocks: Array<
          { type: "text"; text: string } | { type: "image"; data: string; mimeType: string }
        > = [{ type: "text", text: markdown }];

        if (storageXml) {
          const images = await extractImages(pageId, storageXml, confluence);
          contentBlocks.push(...images);
        }

        return { content: contentBlocks };
      } catch (error) {
        if (error instanceof AtlassianApiError) {
          if (error.status === 404) {
            return { content: [{ type: "text", text: `Page not found: ${pageId}. Verify the page ID is correct.` }], isError: true };
          }
          return { content: [{ type: "text", text: `Error fetching page: ${error.message}` }], isError: true };
        }
        return { content: [{ type: "text", text: `Unexpected error: ${String(error)}` }], isError: true };
      }
    },
  );
}

/**
 * Scans storage XML for draw.io macros that reference attachment files
 * (i.e. no inline ac:plain-text-body), fetches each .drawio attachment,
 * and returns an array of text diagram descriptions.
 */
async function extractDrawioAttachments(
  pageId: string,
  storageXml: string,
  confluenceClient: ConfluenceClient,
): Promise<string[]> {
  const results: string[] = [];
  const macroPattern =
    /<ac:structured-macro[^>]*\bac:name="drawio"[^>]*>([\s\S]*?)<\/ac:structured-macro>/gi;

  let m: RegExpExecArray | null;
  while ((m = macroPattern.exec(storageXml)) !== null) {
    const body = m[1];
    // Skip macros that already have embedded XML — handled by the Turndown rule
    if (body.includes("ac:plain-text-body")) continue;

    const diagramNameMatch = body.match(
      /<ac:parameter\s+ac:name="diagramName"[^>]*>([\s\S]*?)<\/ac:parameter>/i,
    );
    if (!diagramNameMatch) continue;
    const diagramName = diagramNameMatch[1].trim();
    if (!diagramName) continue;

    const displayNameMatch = body.match(
      /<ac:parameter\s+ac:name="diagramDisplayName"[^>]*>([\s\S]*?)<\/ac:parameter>/i,
    );
    const displayName =
      displayNameMatch?.[1].trim() || diagramName.replace(/\.drawio$/i, "");

    const xml = await confluenceClient.getAttachmentContent(pageId, diagramName);
    if (xml) {
      results.push(drawioToText(xml, displayName));
    }
  }

  return results;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
const MAX_IMAGES_PER_PAGE = 5;

/**
 * Finds <ac:image> elements referencing page attachments, fetches each one
 * as base64, and returns MCP ImageContent blocks for the AI model to see.
 */
async function extractImages(
  pageId: string,
  storageXml: string,
  confluenceClient: ConfluenceClient,
): Promise<Array<{ type: "image"; data: string; mimeType: string }>> {
  const results: Array<{ type: "image"; data: string; mimeType: string }> = [];
  const imagePattern = /<ac:image[^>]*>([\s\S]*?)<\/ac:image>/gi;
  let m: RegExpExecArray | null;

  while ((m = imagePattern.exec(storageXml)) !== null && results.length < MAX_IMAGES_PER_PAGE) {
    const body = m[1];
    // Only handle attachments on the current page; skip <ri:url> external images
    const attachMatch = body.match(/ri:filename="([^"]+)"/i);
    if (!attachMatch) continue;

    const filename = attachMatch[1];
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;

    const image = await confluenceClient.getAttachmentImage(pageId, filename);
    if (image) {
      results.push({ type: "image", data: image.data, mimeType: image.mimeType });
    }
  }

  return results;
}

export function formatPageContent(page: ConfluencePage): string {
  const lines: string[] = [];

  lines.push(`# ${page.title}`);
  lines.push("");
  lines.push(`**Page ID:** ${page.id}`);
  if (page.version) {
    lines.push(`**Version:** ${page.version.number}`);
    lines.push(`**Last Updated:** ${page.version.createdAt}`);
  }
  lines.push(`**Status:** ${page.status}`);

  // Convert body content
  let bodyMd = "";
  if (page.body?.atlas_doc_format?.value) {
    try {
      const adf = JSON.parse(page.body.atlas_doc_format.value);
      bodyMd = adfToMarkdown(adf);
    } catch {
      // ADF parse failed, try storage format
    }
  }
  if (!bodyMd && page.body?.storage?.value) {
    bodyMd = storageToMarkdown(page.body.storage.value);
  }

  if (bodyMd) {
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(truncateText(bodyMd));
  } else {
    lines.push("");
    lines.push("*No content available for this page.*");
  }

  return lines.join("\n");
}
