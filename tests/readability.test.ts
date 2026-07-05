import { describe, it, expect } from "vitest";
import { scanBlock, scanBlocks } from "@/lib/readability";

describe("readability scanner", () => {
  it("detects passive voice including irregular participles", () => {
    const issues = scanBlock(0, "Mistakes were made by the committee. The report was written overnight.");
    const passive = issues.filter((i) => i.kind === "passive");
    expect(passive.length).toBe(2);
    expect(passive[0].found.toLowerCase()).toContain("were made");
  });

  it("offers one-click replacements for complex conjunctions", () => {
    const issues = scanBlock(0, "In order to win, we planned. Due to the fact that budgets fell, we stopped.");
    const conj = issues.filter((i) => i.kind === "complex-conjunction");
    expect(conj.length).toBe(2);
    expect(conj[0].replacement).toBe("to");
    expect(conj[1].replacement).toBe("because");
  });

  it("flags redundant adverbs with a corrected phrase", () => {
    const issues = scanBlock(0, "This is a very unique approach that basically works.");
    const adverbs = issues.filter((i) => i.kind === "redundant-adverb");
    expect(adverbs.length).toBe(2);
    expect(adverbs.find((a) => a.found.match(/very unique/i))?.replacement).toBe("unique");
  });

  it("flags sentences over 28 words with no auto-fix", () => {
    const long =
      "This sentence keeps going and going with clause after clause piled onto clause because the writer never met a period they liked and simply refused to stop adding more words to it.";
    const issues = scanBlock(0, long);
    const runOn = issues.find((i) => i.kind === "long-sentence");
    expect(runOn).toBeDefined();
    expect(runOn!.replacement).toBeNull();
  });

  it("reports offsets that index the found span exactly", () => {
    const text = "We tried hard. In order to succeed, we practiced.";
    const issue = scanBlock(0, text).find((i) => i.kind === "complex-conjunction")!;
    expect(text.slice(issue.from, issue.to)).toBe(issue.found);
  });

  it("scans multiple blocks preserving block indexes", () => {
    const issues = scanBlocks([
      { index: 0, text: "Clean sentence here." },
      { index: 3, text: "The cake was eaten quickly." },
    ]);
    expect(issues.every((i) => i.blockIndex === 3)).toBe(true);
  });
});
