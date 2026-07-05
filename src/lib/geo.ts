import { TiptapDoc, docBlocks, countWords } from "./tiptap-text";

/**
 * Generative Engine Optimization scoring.
 *
 * Scores structural traits that conversational engines (Perplexity, Gemini,
 * ChatGPT Search) preferentially cite: direct-answer openings, heading
 * hierarchy, tables, statistical bullets, and numeric/source citations.
 */

export type GeoSubscore = {
  key: "directAnswer" | "structure" | "statistics" | "citations";
  label: string;
  score: number; // 0-100
  weight: number;
  detail: string;
};

export type GeoReport = {
  total: number; // 0-100
  subscores: GeoSubscore[];
  tips: string[];
};

const NUMERIC_RE = /\b\d+(?:[.,]\d+)?\s*(?:%|percent|x|ms|s|hours?|days?|weeks?|years?|k|m|bn|million|billion|users?|queries|points?)\b/gi;
const BARE_NUMBER_RE = /\b\d+(?:[.,]\d+)?\b/g;
const FILLER_OPENERS = /^(in this (article|post|guide)|welcome to|today we|have you ever|in today's)/i;

export function scoreGeo(doc: TiptapDoc): GeoReport {
  const blocks = docBlocks(doc);
  const textBlocks = blocks.filter((b) => b.text.trim().length > 0);
  const fullText = textBlocks.map((b) => b.text).join("\n");
  const totalWords = Math.max(countWords(fullText), 1);
  const tips: string[] = [];

  // --- Direct answer block -------------------------------------------------
  const firstPara = textBlocks.find((b) => b.type === "paragraph");
  let directAnswer = 0;
  if (!firstPara) {
    tips.push("Open with a paragraph that answers the query directly — engines quote openings.");
  } else {
    const words = countWords(firstPara.text);
    const hasNumber = BARE_NUMBER_RE.test(firstPara.text);
    const isFiller = FILLER_OPENERS.test(firstPara.text.trim());
    directAnswer =
      (words >= 20 && words <= 80 ? 50 : words > 0 ? 25 : 0) +
      (hasNumber ? 30 : 0) +
      (isFiller ? 0 : 20);
    if (isFiller) tips.push("Cut the throat-clearing opener; state the answer in sentence one.");
    if (!hasNumber) tips.push("Put a concrete number in the opening paragraph.");
    if (words > 80) tips.push("Tighten the opening paragraph to under 80 words for quotability.");
  }

  // --- Structure -----------------------------------------------------------
  const headings = blocks.filter((b) => b.type === "heading" && (b.level ?? 1) >= 2);
  const lists = blocks.filter((b) => b.type === "bulletList" || b.type === "orderedList");
  const tables = blocks.filter((b) => b.type === "table");
  const wordsPerHeading = headings.length > 0 ? totalWords / headings.length : Infinity;
  let structure = 0;
  structure += headings.length > 0 ? (wordsPerHeading <= 250 ? 45 : 30) : 0;
  structure += lists.length > 0 ? 25 : 0;
  structure += tables.length > 0 ? 30 : 15; // tables are gold, but not mandatory for short pieces
  structure = Math.min(structure, 100);
  if (headings.length === 0) tips.push("Add H2/H3 headings — answer engines map questions to sections.");
  if (lists.length === 0) tips.push("Convert dense claims into a bulleted list with one stat per bullet.");
  if (tables.length === 0 && totalWords > 600) tips.push("A comparison table markedly raises citation odds on long pieces.");

  // --- Statistical density ---------------------------------------------------
  const statMatches = fullText.match(NUMERIC_RE) ?? [];
  const statsPer100 = (statMatches.length / totalWords) * 100;
  const statistics = Math.min(Math.round(statsPer100 * 40), 100);
  if (statistics < 40) tips.push("Raise statistical density: aim for at least one unit-bearing figure per 100 words.");

  // --- Citations -------------------------------------------------------------
  const linkCount = countLinks(doc);
  const attributionCount = (fullText.match(/\b(according to|reported by|per |source:|study by)\b/gi) ?? []).length;
  const citations = Math.min(linkCount * 25 + attributionCount * 15, 100);
  if (citations < 50) tips.push("Add linked sources — passages with attribution get cited over unsourced ones.");

  const subscores: GeoSubscore[] = [
    { key: "directAnswer", label: "Direct answer", score: clamp(directAnswer), weight: 0.3, detail: "Quotable opening that resolves the query" },
    { key: "structure", label: "Structure", score: clamp(structure), weight: 0.25, detail: "Headings, lists and table schemas" },
    { key: "statistics", label: "Stat density", score: clamp(statistics), weight: 0.25, detail: "Unit-bearing figures per 100 words" },
    { key: "citations", label: "Citations", score: clamp(citations), weight: 0.2, detail: "Linked and attributed sources" },
  ];

  const total = Math.round(subscores.reduce((sum, s) => sum + s.score * s.weight, 0));
  return { total, subscores, tips: tips.slice(0, 4) };
}

function countLinks(doc: TiptapDoc): number {
  let count = 0;
  const walk = (node: { marks?: { type: string }[]; content?: unknown[] }) => {
    if (node.marks?.some((m) => m.type === "link")) count++;
    (node.content as { marks?: { type: string }[]; content?: unknown[] }[] | undefined)?.forEach(walk);
  };
  (doc.content ?? []).forEach(walk);
  return count;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
