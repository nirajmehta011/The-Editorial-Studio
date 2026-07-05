import { describe, it, expect } from "vitest";
import { mockSearch, analyzeSerp } from "@/lib/research";
import { getTrends, getTrend, isGap } from "@/lib/trends";

describe("mock research corpus", () => {
  it("is deterministic per query", () => {
    const a = mockSearch("content marketing");
    const b = mockSearch("content marketing");
    expect(a).toEqual(b);
  });

  it("varies across queries", () => {
    const a = mockSearch("content marketing");
    const b = mockSearch("quantum computing");
    expect(a[0].title).not.toEqual(b[0].title);
  });

  it("returns complete result objects", () => {
    for (const r of mockSearch("test topic")) {
      expect(r.url).toMatch(/^https:\/\//);
      expect(r.body.length).toBeGreaterThan(100);
      expect(r.wordCount).toBeGreaterThan(0);
      expect(r.headers.length).toBeGreaterThanOrEqual(3);
      expect(r.peopleAlsoAsk.length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("SERP analysis", () => {
  it("computes average word count and aggregates PAA", () => {
    const results = mockSearch("seo tools");
    const serp = analyzeSerp("seo tools", results);
    const expectedAvg = Math.round(results.reduce((a, r) => a + r.wordCount, 0) / results.length);
    expect(serp.avgWordCount).toBe(expectedAvg);
    expect(serp.peopleAlsoAsk.length).toBeGreaterThan(0);
    expect(serp.peopleAlsoAsk.length).toBeLessThanOrEqual(6);
    expect(serp.headerOutline[0].frequency).toBeGreaterThanOrEqual(serp.headerOutline.at(-1)!.frequency);
  });

  it("handles an empty result set", () => {
    const serp = analyzeSerp("x", []);
    expect(serp.avgWordCount).toBe(0);
    expect(serp.headerOutline).toEqual([]);
  });
});

describe("trends", () => {
  it("filters by niche and sorts by growth", () => {
    const tech = getTrends("Tech");
    expect(tech.every((t) => t.niche === "Tech")).toBe(true);
    for (let i = 1; i < tech.length; i++) {
      expect(tech[i - 1].growthPct).toBeGreaterThanOrEqual(tech[i].growthPct);
    }
  });

  it("gap finder requires explosive growth AND low competition", () => {
    const all = getTrends();
    const gaps = all.filter(isGap);
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.every((g) => g.growthPct >= 200 && g.competition === "LOW")).toBe(true);
    const highCompetition = all.find((t) => t.competition === "HIGH");
    expect(highCompetition && isGap(highCompetition)).toBe(false);
  });

  it("resolves a trend by id", () => {
    expect(getTrend("geo-optimization")?.topic).toMatch(/generative engine/i);
    expect(getTrend("nope")).toBeUndefined();
  });
});
