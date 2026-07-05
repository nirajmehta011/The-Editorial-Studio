import { describe, it, expect } from "vitest";
import { scoreGeo } from "@/lib/geo";
import { TiptapDoc } from "@/lib/tiptap-text";

const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const h2 = (text: string) => ({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] });

describe("scoreGeo", () => {
  it("rewards a direct-answer opening with a number", () => {
    const good: TiptapDoc = {
      type: "doc",
      content: [
        p("AI answer engines resolve 31% of informational queries with zero clicks, and 78% of cited passages sit under a heading. Here is exactly what that means for content teams."),
        h2("The data"),
        p("According to a 2026 study by Benchmark Lab, passages with statistics are cited 3x more often."),
      ],
    };
    const report = scoreGeo(good);
    const direct = report.subscores.find((s) => s.key === "directAnswer")!;
    expect(direct.score).toBeGreaterThanOrEqual(80);
    expect(report.total).toBeGreaterThan(40);
  });

  it("penalizes filler openers and missing structure", () => {
    const bad: TiptapDoc = {
      type: "doc",
      content: [p("In this article we will explore many interesting things about content marketing and why it matters to you and your business in general terms.")],
    };
    const report = scoreGeo(bad);
    const direct = report.subscores.find((s) => s.key === "directAnswer")!;
    expect(direct.score).toBeLessThan(60);
    expect(report.tips.length).toBeGreaterThan(0);
    expect(report.tips.join(" ")).toMatch(/opener|number|heading/i);
  });

  it("scores between 0 and 100 and weights sum to 1", () => {
    const report = scoreGeo({ type: "doc", content: [p("Short.")] });
    expect(report.total).toBeGreaterThanOrEqual(0);
    expect(report.total).toBeLessThanOrEqual(100);
    const weightSum = report.subscores.reduce((a, s) => a + s.weight, 0);
    expect(weightSum).toBeCloseTo(1);
  });

  it("counts links toward the citations subscore", () => {
    const linked: TiptapDoc = {
      type: "doc",
      content: [
        p("Opening claim with 42% of the market covered in under sixty words for the direct answer test."),
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Benchmark study",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
          ],
        },
      ],
    };
    const withLink = scoreGeo(linked).subscores.find((s) => s.key === "citations")!;
    expect(withLink.score).toBeGreaterThanOrEqual(25);
  });
});
