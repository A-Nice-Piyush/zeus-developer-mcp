/**
 * Converts draw.io mxGraphModel XML to a readable text description
 * suitable for AI context. Extracts node labels and edge connections.
 */

interface MxCell {
  id: string;
  value: string;
  isVertex: boolean;
  isEdge: boolean;
  source?: string;
  target?: string;
}

export function drawioToText(xml: string, title: string = "Diagram"): string {
  const cells = parseMxCells(xml);

  if (cells.length === 0) {
    return `[Diagram: ${title}]\n(No diagram elements found)`;
  }

  // Build id → label map for resolving edge endpoints
  const labelMap = new Map<string, string>();
  for (const cell of cells) {
    if (cell.value) {
      labelMap.set(cell.id, cell.value);
    }
  }

  const vertices = cells.filter((c) => c.isVertex && c.value.trim());
  const edges = cells.filter((c) => c.isEdge);

  const lines: string[] = [];
  lines.push(`[Diagram: ${title}]`);

  if (vertices.length > 0) {
    lines.push(`Nodes: ${vertices.map((v) => v.value).join(", ")}`);
  }

  if (edges.length > 0) {
    lines.push("Connections:");
    for (const edge of edges) {
      const from = edge.source ? (labelMap.get(edge.source) || edge.source) : "?";
      const to = edge.target ? (labelMap.get(edge.target) || edge.target) : "?";
      const label = edge.value.trim();
      if (label) {
        lines.push(`- ${from} --${label}--> ${to}`);
      } else {
        lines.push(`- ${from} --> ${to}`);
      }
    }
  }

  return lines.join("\n");
}

function parseMxCells(xml: string): MxCell[] {
  const cells: MxCell[] = [];

  // Handle both self-closing <mxCell .../> and open+close <mxCell ...></mxCell>
  const cellPattern = /<mxCell([^>]*?)(?:\/>|>)/gi;
  let match: RegExpExecArray | null;

  while ((match = cellPattern.exec(xml)) !== null) {
    const attrString = match[1];
    const attrs = parseAttributes(attrString);

    const id = attrs.id || "";
    // Skip the two root system cells
    if (id === "0" || id === "1") continue;

    // Decode HTML entities in value (draw.io often encodes labels)
    const value = decodeHtmlEntities(attrs.value || "");
    const isVertex = attrs.vertex === "1";
    const isEdge = attrs.edge === "1";

    cells.push({
      id,
      value,
      isVertex,
      isEdge,
      source: attrs.source,
      target: attrs.target,
    });
  }

  return cells;
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /\b(\w+)="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ") // Strip any inline HTML tags in labels
    .replace(/\s+/g, " ")
    .trim();
}
