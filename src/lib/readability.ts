import { splitSentences, countWords } from "./tiptap-text";

/**
 * Style & readability trimmer. Finds spans that fail readability constraints
 * and offers single-click structural corrections. Offsets are relative to the
 * block's plain text so the editor can map them onto ProseMirror positions.
 */

export type IssueKind = "passive" | "complex-conjunction" | "redundant-adverb" | "long-sentence";

export type ReadabilityIssue = {
  kind: IssueKind;
  blockIndex: number;
  /** character offsets within the block's plain text */
  from: number;
  to: number;
  found: string;
  message: string;
  /** null when there is no mechanical one-click fix (e.g. long sentence) */
  replacement: string | null;
};

const IRREGULAR_PARTICIPLES =
  "made|done|seen|taken|given|known|shown|found|held|kept|left|lost|meant|paid|put|read|said|sent|set|told|thought|built|bought|brought|caught|chosen|drawn|driven|eaten|fallen|felt|fought|forgotten|frozen|gotten|grown|heard|hidden|hit|hurt|laid|led|lent|let|lit|sold|spent|spoken|spread|stood|stolen|struck|sung|sunk|sworn|swept|swum|torn|thrown|understood|woken|worn|won|written";

const PASSIVE_RE = new RegExp(
  `\\b(?:is|are|was|were|be|been|being)\\s+(?:\\w+ly\\s+)?(?:\\w+ed|${IRREGULAR_PARTICIPLES})\\b(?:\\s+by\\b)?`,
  "gi"
);

// phrase -> simpler replacement
const COMPLEX_CONJUNCTIONS: [RegExp, string][] = [
  [/\bin order to\b/gi, "to"],
  [/\bdue to the fact that\b/gi, "because"],
  [/\bwith regard to\b/gi, "about"],
  [/\bin the event that\b/gi, "if"],
  [/\bnotwithstanding\b/gi, "despite"],
  [/\bin spite of the fact that\b/gi, "although"],
  [/\bfor the purpose of\b/gi, "to"],
  [/\bit is important to note that\b/gi, ""],
  [/\bit is very important to understand that\b/gi, ""],
  [/\bat this point in time\b/gi, "now"],
  [/\bin the near future\b/gi, "soon"],
];

const REDUNDANT_ADVERBS: [RegExp, string][] = [
  [/\bvery\s+unique\b/gi, "unique"],
  [/\bcompletely\s+eliminate(d?)\b/gi, "eliminate$1"],
  [/\babsolutely\s+essential\b/gi, "essential"],
  [/\bbasically\s+/gi, ""],
  [/\bactually\s+/gi, ""],
  [/\bliterally\s+/gi, ""],
  [/\bquite\s+/gi, ""],
  [/\breally\s+/gi, ""],
];

const LONG_SENTENCE_WORDS = 28;

export function scanBlock(blockIndex: number, text: string): ReadabilityIssue[] {
  const issues: ReadabilityIssue[] = [];

  for (const match of text.matchAll(PASSIVE_RE)) {
    issues.push({
      kind: "passive",
      blockIndex,
      from: match.index!,
      to: match.index! + match[0].length,
      found: match[0],
      message: "Passive voice — name the actor and use an active verb.",
      replacement: null,
    });
  }

  for (const [re, replacement] of COMPLEX_CONJUNCTIONS) {
    for (const match of text.matchAll(re)) {
      issues.push({
        kind: "complex-conjunction",
        blockIndex,
        from: match.index!,
        to: match.index! + match[0].length,
        found: match[0],
        message: replacement
          ? `Wordy connector — replace with “${replacement}”.`
          : "Filler phrase — safe to delete.",
        replacement,
      });
    }
  }

  for (const [re, replacement] of REDUNDANT_ADVERBS) {
    for (const match of text.matchAll(re)) {
      issues.push({
        kind: "redundant-adverb",
        blockIndex,
        from: match.index!,
        to: match.index! + match[0].length,
        found: match[0],
        message: "Redundant intensifier — the sentence is stronger without it.",
        replacement: match[0].replace(re, replacement),
      });
    }
  }

  let cursor = 0;
  for (const sentence of splitSentences(text)) {
    const start = text.indexOf(sentence, cursor);
    if (start === -1) continue;
    cursor = start + sentence.length;
    if (countWords(sentence) > LONG_SENTENCE_WORDS) {
      issues.push({
        kind: "long-sentence",
        blockIndex,
        from: start,
        to: start + sentence.length,
        found: sentence,
        message: `Sentence runs ${countWords(sentence)} words — split it around the main clause.`,
        replacement: null,
      });
    }
  }

  return issues.sort((a, b) => a.from - b.from);
}

export function scanBlocks(blocks: { index: number; text: string }[]): ReadabilityIssue[] {
  return blocks.flatMap((b) => scanBlock(b.index, b.text));
}
