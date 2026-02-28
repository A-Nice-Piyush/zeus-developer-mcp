/**
 * Converts Atlassian Document Format (ADF) JSON to readable Markdown.
 * ADF is the document format used by JIRA v3 and Confluence v2 APIs.
 */

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
}

interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export function adfToMarkdown(adf: unknown): string {
  if (!adf || typeof adf !== "object") return "";
  const node = adf as AdfNode;
  if (node.type !== "doc" || !Array.isArray(node.content)) return "";
  return convertNodes(node.content).trim();
}

function convertNodes(nodes: AdfNode[]): string {
  return nodes.map((node) => convertNode(node)).join("");
}

function convertNode(node: AdfNode): string {
  switch (node.type) {
    case "paragraph":
      return convertInlineContent(node.content) + "\n\n";

    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      const prefix = "#".repeat(Math.min(level, 6));
      return `${prefix} ${convertInlineContent(node.content)}\n\n`;
    }

    case "bulletList":
      return convertListItems(node.content, "- ") + "\n";

    case "orderedList":
      return convertOrderedListItems(node.content) + "\n";

    case "listItem":
      return convertNodes(node.content || []);

    case "codeBlock": {
      const lang = (node.attrs?.language as string) || "";
      const code = convertInlineContent(node.content);
      return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    }

    case "blockquote":
      return (
        convertNodes(node.content || [])
          .trim()
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n") + "\n\n"
      );

    case "rule":
      return "---\n\n";

    case "table":
      return convertTable(node) + "\n\n";

    case "panel": {
      const panelType = (node.attrs?.panelType as string) || "info";
      const content = convertNodes(node.content || []).trim();
      return `> **[${panelType.toUpperCase()}]**\n> ${content.split("\n").join("\n> ")}\n\n`;
    }

    case "expand": {
      const title = (node.attrs?.title as string) || "Details";
      const content = convertNodes(node.content || []).trim();
      return `**${title}:**\n${content}\n\n`;
    }

    case "mediaSingle":
    case "mediaGroup":
      return convertNodes(node.content || []);

    case "media": {
      const alt = (node.attrs?.alt as string) || "attachment";
      return `[${alt}]\n\n`;
    }

    case "text":
      return applyMarks(node.text || "", node.marks);

    case "hardBreak":
      return "\n";

    case "mention": {
      const name = (node.attrs?.text as string) || (node.attrs?.id as string) || "unknown";
      return `@${name}`;
    }

    case "emoji": {
      const shortName = (node.attrs?.shortName as string) || "";
      return shortName;
    }

    case "date": {
      const timestamp = node.attrs?.timestamp as string;
      if (timestamp) {
        try {
          return new Date(parseInt(timestamp, 10)).toISOString().split("T")[0];
        } catch {
          return timestamp;
        }
      }
      return "";
    }

    case "status": {
      const text = (node.attrs?.text as string) || "";
      return `[${text}]`;
    }

    case "inlineCard": {
      const url = node.attrs?.url as string;
      return url ? `[${url}](${url})` : "";
    }

    default:
      if (node.content) {
        return convertNodes(node.content);
      }
      return "";
  }
}

function convertInlineContent(content?: AdfNode[]): string {
  if (!content) return "";
  return content.map((node) => convertNode(node)).join("");
}

function convertListItems(items: AdfNode[] | undefined, prefix: string): string {
  if (!items) return "";
  return items
    .map((item) => {
      const content = convertNodes(item.content || []).trim();
      const lines = content.split("\n");
      return `${prefix}${lines[0]}${lines.slice(1).map((l) => `  ${l}`).join("\n")}`;
    })
    .join("\n");
}

function convertOrderedListItems(items: AdfNode[] | undefined): string {
  if (!items) return "";
  return items
    .map((item, i) => {
      const content = convertNodes(item.content || []).trim();
      const lines = content.split("\n");
      return `${i + 1}. ${lines[0]}${lines.slice(1).map((l) => `   ${l}`).join("\n")}`;
    })
    .join("\n");
}

function convertTable(node: AdfNode): string {
  const rows = node.content || [];
  if (rows.length === 0) return "";

  const tableData: string[][] = rows.map((row) =>
    (row.content || []).map((cell) => convertNodes(cell.content || []).trim().replace(/\n/g, " ")),
  );

  if (tableData.length === 0) return "";

  const colCount = Math.max(...tableData.map((r) => r.length));
  const normalized = tableData.map((row) => {
    while (row.length < colCount) row.push("");
    return row;
  });

  const header = `| ${normalized[0].join(" | ")} |`;
  const separator = `| ${normalized[0].map(() => "---").join(" | ")} |`;
  const body = normalized
    .slice(1)
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");

  return `${header}\n${separator}\n${body}`;
}

function applyMarks(text: string, marks?: AdfMark[]): string {
  if (!marks || marks.length === 0) return text;

  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case "strong":
        result = `**${result}**`;
        break;
      case "em":
        result = `*${result}*`;
        break;
      case "code":
        result = `\`${result}\``;
        break;
      case "strike":
        result = `~~${result}~~`;
        break;
      case "link": {
        const href = mark.attrs?.href as string;
        if (href) result = `[${result}](${href})`;
        break;
      }
      case "underline":
        result = `<u>${result}</u>`;
        break;
      case "subsup": {
        const type = mark.attrs?.type as string;
        if (type === "sub") result = `<sub>${result}</sub>`;
        else if (type === "sup") result = `<sup>${result}</sup>`;
        break;
      }
    }
  }
  return result;
}
