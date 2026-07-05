import { describe, it, expect } from "vitest";
import { scanCadence } from "@/lib/cadence";

describe("scanCadence", () => {
  it("flags uniform sentence rhythm as robotic", () => {
    const robotic =
      "The system processes data very quickly. The system handles errors very gracefully. The system scales workloads very smoothly. The system reduces costs very effectively.";
    const report = scanCadence([{ index: 0, text: robotic }]);
    expect(report.flaggedBlocks.length).toBe(1);
    expect(report.burstiness).toBeLessThan(0.2);
  });

  it("scores varied human writing higher than uniform copy", () => {
    const human =
      "It failed. Nobody expected that, least of all the team who had spent eleven months tuning the pipeline for exactly this scenario. We shipped anyway. What happened next surprised everyone, because the fallback path quietly outperformed the primary model by a wide margin.";
    const uniform =
      "The tool improves output quality every day. The tool reduces total costs every month. The tool increases team velocity every quarter. The tool delivers business value every year.";
    const humanReport = scanCadence([{ index: 0, text: human }]);
    const uniformReport = scanCadence([{ index: 0, text: uniform }]);
    expect(humanReport.humanScore).toBeGreaterThan(uniformReport.humanScore);
  });

  it("detects stock AI phrases", () => {
    const text =
      "In today's fast-paced world, teams must delve into automation. It's a game-changer for everyone involved in the process.";
    const report = scanCadence([{ index: 0, text }]);
    expect(report.stockPhrases).toContain("in today's fast-paced world");
    expect(report.stockPhrases).toContain("delve into");
    expect(report.stockPhrases).toContain("game-changer");
  });

  it("handles empty input without crashing", () => {
    const report = scanCadence([]);
    expect(report.humanScore).toBeGreaterThanOrEqual(0);
    expect(report.flaggedBlocks).toEqual([]);
  });
});
