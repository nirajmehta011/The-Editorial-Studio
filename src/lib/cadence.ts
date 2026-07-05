import { splitSentences, countWords } from "./tiptap-text";

/**
 * Simulated plagiarism / AI-cadence scan. Flags low burstiness (uniform
 * sentence lengths), low lexical diversity, and stock AI phrasing — the
 * signals that read as "robotic pacing" to human editors and detectors alike.
 */

export type CadenceReport = {
  /** 0-100: higher = reads more human */
  humanScore: number;
  burstiness: number; // stddev/mean of sentence lengths
  lexicalDiversity: number; // unique words / total words
  stockPhrases: string[];
  flaggedBlocks: { blockIndex: number; reason: string }[];
};

const STOCK_PHRASES = [
  "in today's fast-paced world",
  "it's important to note",
  "delve into",
  "in the ever-evolving landscape",
  "unlock the power",
  "game-changer",
  "at the end of the day",
  "seamlessly integrate",
  "harness the potential",
  "navigate the complexities",
  "in conclusion",
  "furthermore, it is",
];

export function scanCadence(blocks: { index: number; text: string }[]): CadenceReport {
  const fullText = blocks.map((b) => b.text).join(" ");
  const sentences = blocks.flatMap((b) => splitSentences(b.text));
  const lengths = sentences.map(countWords).filter((n) => n > 0);

  const mean = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const variance = lengths.length
    ? lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length
    : 0;
  const burstiness = mean > 0 ? Math.sqrt(variance) / mean : 0;

  const words = fullText.toLowerCase().match(/[a-z']+/g) ?? [];
  const lexicalDiversity = words.length ? new Set(words).size / words.length : 0;

  const lower = fullText.toLowerCase();
  const stockPhrases = STOCK_PHRASES.filter((p) => lower.includes(p));

  const flaggedBlocks: CadenceReport["flaggedBlocks"] = [];
  for (const block of blocks) {
    const blockSentences = splitSentences(block.text).map(countWords).filter(Boolean);
    if (blockSentences.length < 3) continue;
    const bMean = blockSentences.reduce((a, b) => a + b, 0) / blockSentences.length;
    const bVar = blockSentences.reduce((a, b) => a + (b - bMean) ** 2, 0) / blockSentences.length;
    const bBurst = bMean > 0 ? Math.sqrt(bVar) / bMean : 0;
    if (bBurst < 0.2) {
      flaggedBlocks.push({
        blockIndex: block.index,
        reason: "Uniform sentence rhythm — vary lengths to break the metronome.",
      });
    }
  }

  // Weighted human-ness score. Burstiness ~0.5+ and diversity ~0.55+ read as human.
  const burstScore = Math.min(burstiness / 0.55, 1) * 45;
  const diversityScore = Math.min(lexicalDiversity / 0.55, 1) * 35;
  const stockPenalty = Math.min(stockPhrases.length * 8, 20);
  const humanScore = Math.max(0, Math.min(100, Math.round(burstScore + diversityScore + 20 - stockPenalty)));

  return {
    humanScore,
    burstiness: Number(burstiness.toFixed(3)),
    lexicalDiversity: Number(lexicalDiversity.toFixed(3)),
    stockPhrases,
    flaggedBlocks,
  };
}
