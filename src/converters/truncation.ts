const DEFAULT_MAX_CONTENT_CHARS = 15_000;
const DEFAULT_MAX_LIST_ITEMS = 30;
const DEFAULT_MAX_COMMENTS = 10;

export function truncateText(text: string, maxChars: number = DEFAULT_MAX_CONTENT_CHARS): string {
  if (text.length <= maxChars) return text;
  const truncated = text.slice(0, maxChars);
  // Try to truncate at a paragraph or sentence boundary
  const lastParagraph = truncated.lastIndexOf("\n\n");
  const lastSentence = truncated.lastIndexOf(". ");
  const cutPoint = lastParagraph > maxChars * 0.7 ? lastParagraph : lastSentence > maxChars * 0.7 ? lastSentence + 1 : maxChars;
  return truncated.slice(0, cutPoint) + "\n\n[... content truncated ...]";
}

export function truncateList<T>(items: T[], maxItems: number = DEFAULT_MAX_LIST_ITEMS): { items: T[]; truncated: boolean; total: number } {
  if (items.length <= maxItems) {
    return { items, truncated: false, total: items.length };
  }
  return {
    items: items.slice(0, maxItems),
    truncated: true,
    total: items.length,
  };
}

export function truncateComments<T>(comments: T[], maxComments: number = DEFAULT_MAX_COMMENTS): { comments: T[]; truncated: boolean; total: number } {
  if (comments.length <= maxComments) {
    return { comments, truncated: false, total: comments.length };
  }
  // Show the most recent comments
  return {
    comments: comments.slice(-maxComments),
    truncated: true,
    total: comments.length,
  };
}
