/**
 * Helpers for working with TipTap/ProseMirror JSON outside the editor
 * (server routes, scoring utilities, tests).
 */

export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export type TiptapDoc = { type: "doc"; content?: TiptapNode[] };

export function nodeText(node: TiptapNode): string {
  if (node.text) return node.text;
  if (!node.content) return "";
  return node.content.map(nodeText).join("");
}

/** Flatten a doc into plain text, one line per block. */
export function docToText(doc: TiptapDoc): string {
  return (doc.content ?? []).map(nodeText).join("\n");
}

/** Top-level blocks with their text and type — the unit the analyzers work on. */
export function docBlocks(doc: TiptapDoc): { index: number; type: string; level?: number; text: string }[] {
  return (doc.content ?? []).map((node, index) => ({
    index,
    type: node.type,
    level: node.attrs?.level as number | undefined,
    text: nodeText(node),
  }));
}

/** Build a minimal TipTap doc from markdown-ish plain text (used by mock generators). */
export function paragraphsToDoc(paragraphs: string[]): TiptapDoc {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  };
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
