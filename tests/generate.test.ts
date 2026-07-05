import { describe, it, expect } from "vitest";
import { mockAngles, mockSummary, mockCascade, mockRephrase, generateCascade } from "@/lib/generate";
import { scanCadence } from "@/lib/cadence";

describe("offline generators", () => {
  it("produces exactly three named angles", () => {
    const angles = mockAngles("Sleep debt tracking");
    expect(angles).toHaveLength(3);
    expect(angles.map((a) => a.name)).toEqual([
      "The Beginner's Guide",
      "The Contrarian Take",
      "The Deep Analytical Breakdown",
    ]);
    for (const a of angles) {
      expect(a.headline).toContain("Sleep debt tracking");
      expect(a.outline.length).toBe(4);
    }
  });

  it("summary prefers sentences with numbers and caps at 5 bullets", () => {
    const body =
      "Intro sentence without data. Teams saw a 45% lift in output. Another plain sentence. Budgets fell 12% year over year. Retention hit 89% among adopters. Sixth sentence. Seventh sentence with 3 numbers 4 and 5.";
    const bullets = mockSummary(body);
    expect(bullets.length).toBeLessThanOrEqual(5);
    expect(bullets[0]).toMatch(/\d/);
  });

  it("cascade pack contains all four channel assets", () => {
    const pack = mockCascade("Test Title", "First claim here. The metric moved 40% in one quarter. Deeper context follows.");
    expect(pack.newsletter).toContain("Subject:");
    expect(pack.linkedin.length).toBeGreaterThan(50);
    expect(pack.thread).toHaveLength(5);
    expect(pack.videoScript).toContain("HOOK");
    expect(pack.thread.join(" ")).toMatch(/40%/);
  });

  it("generateCascade falls back to mock without an API key", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const { pack, live } = await generateCascade("T", "One sentence. Another with 10% data.", null);
      expect(live).toBe(false);
      expect(pack.thread.length).toBeGreaterThan(0);
    } finally {
      if (prev) process.env.ANTHROPIC_API_KEY = prev;
    }
  });

  it("rephrase increases burstiness of uniform text", () => {
    const uniform =
      "The system processes data very quickly today. The system handles errors very gracefully today. The system scales workloads very smoothly today. The system reduces costs very effectively today.";
    const rewritten = mockRephrase(uniform);
    const before = scanCadence([{ index: 0, text: uniform }]).burstiness;
    const after = scanCadence([{ index: 0, text: rewritten }]).burstiness;
    expect(after).toBeGreaterThan(before);
  });
});
