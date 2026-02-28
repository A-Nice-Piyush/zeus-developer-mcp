/**
 * Converts Confluence XHTML storage format to readable Markdown.
 * Uses the turndown library with custom rules for Confluence-specific elements.
 */
import TurndownService from "turndown";
import { drawioToText } from "./drawio-to-text.js";

let turndownInstance: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (turndownInstance) return turndownInstance;

  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });

  // Confluence structured macros: code blocks
  td.addRule("confluenceCodeBlock", {
    filter: (node) =>
      node.nodeName === "AC:STRUCTURED-MACRO" &&
      (node.getAttribute("ac:name") === "code" || node.getAttribute("ac:name") === "noformat"),
    replacement: (_content, node) => {
      const plainTextBody = node.querySelector("ac\\:plain-text-body");
      const code = plainTextBody?.textContent || _content;
      const lang =
        Array.from(node.querySelectorAll("ac\\:parameter"))
          .find((p) => p.getAttribute("ac:name") === "language")
          ?.textContent || "";
      return `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
    },
  });

  // Confluence panels
  td.addRule("confluencePanel", {
    filter: (node) =>
      node.nodeName === "AC:STRUCTURED-MACRO" &&
      (node.getAttribute("ac:name") === "panel" ||
        node.getAttribute("ac:name") === "info" ||
        node.getAttribute("ac:name") === "note" ||
        node.getAttribute("ac:name") === "warning" ||
        node.getAttribute("ac:name") === "tip"),
    replacement: (_content, node) => {
      const macroName = node.getAttribute("ac:name") || "info";
      const body = node.querySelector("ac\\:rich-text-body");
      const text = body?.textContent || _content;
      return `\n> **[${macroName.toUpperCase()}]** ${text.trim()}\n`;
    },
  });

  // Confluence expand macro
  td.addRule("confluenceExpand", {
    filter: (node) =>
      node.nodeName === "AC:STRUCTURED-MACRO" && node.getAttribute("ac:name") === "expand",
    replacement: (_content, node) => {
      const titleParam = Array.from(node.querySelectorAll("ac\\:parameter")).find(
        (p) => p.getAttribute("ac:name") === "title",
      );
      const title = titleParam?.textContent || "Details";
      const body = node.querySelector("ac\\:rich-text-body");
      const text = body?.textContent || _content;
      return `\n**${title}:**\n${text.trim()}\n`;
    },
  });

  // Confluence emoticons
  td.addRule("confluenceEmoticon", {
    filter: (node) => node.nodeName === "AC:EMOTICON",
    replacement: (_content, node) => {
      const name = node.getAttribute("ac:name") || "";
      return `:${name}:`;
    },
  });

  // Draw.io diagrams — extract node labels and connections from mxGraphModel XML
  td.addRule("confluenceDrawio", {
    filter: (node) =>
      node.nodeName === "AC:STRUCTURED-MACRO" &&
      node.getAttribute("ac:name") === "drawio",
    replacement: (_content, node) => {
      const titleParam = Array.from(node.querySelectorAll("ac\\:parameter")).find(
        (p) => p.getAttribute("ac:name") === "diagramDisplayName",
      );
      const title = titleParam?.textContent || "Diagram";
      const plainTextBody = node.querySelector("ac\\:plain-text-body");
      const xml = plainTextBody?.textContent || "";
      if (!xml.trim()) return `\n[${title}: no diagram data available]\n`;
      return "\n" + drawioToText(xml, title) + "\n";
    },
  });

  // Confluence images — emit a filename placeholder in text; actual image
  // data is returned as MCP ImageContent blocks by the get-page tool handler.
  td.addRule("confluenceImage", {
    filter: (node) => node.nodeName === "AC:IMAGE",
    replacement: (_content, node) => {
      const attachment = node.querySelector("ri\\:attachment");
      const filename = attachment?.getAttribute("ri:filename");
      if (filename) return ` [Image: ${filename}] `;
      const urlEl = node.querySelector("ri\\:url");
      const href = urlEl?.getAttribute("ri:value");
      if (href) return ` [External Image: ${href}] `;
      return " [Image] ";
    },
  });

  // Remove other structured macros gracefully
  td.addRule("confluenceOtherMacros", {
    filter: (node) => node.nodeName === "AC:STRUCTURED-MACRO",
    replacement: (_content, node) => {
      const body = node.querySelector("ac\\:rich-text-body");
      return body?.textContent || _content || "";
    },
  });

  // Confluence task lists
  td.addRule("confluenceTask", {
    filter: (node) => node.nodeName === "AC:TASK",
    replacement: (_content, node) => {
      const status = node.querySelector("ac\\:task-status");
      const body = node.querySelector("ac\\:task-body");
      const checked = status?.textContent === "complete" ? "x" : " ";
      return `- [${checked}] ${body?.textContent || _content}\n`;
    },
  });

  turndownInstance = td;
  return td;
}

export function storageToMarkdown(storageXhtml: string): string {
  if (!storageXhtml || !storageXhtml.trim()) return "";
  const td = getTurndown();
  try {
    return td.turndown(storageXhtml).trim();
  } catch {
    // If turndown fails, strip HTML tags as a rough fallback
    return storageXhtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
}
