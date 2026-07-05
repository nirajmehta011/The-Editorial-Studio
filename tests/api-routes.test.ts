import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST as searchRoute } from "@/app/api/research/search/route";
import { POST as scoreRoute } from "@/app/api/geo/score/route";
import { GET as trendsRoute } from "@/app/api/trends/route";

function jsonRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API: /api/research/search", () => {
  it("returns results + SERP analysis for a query", async () => {
    const res = await searchRoute(jsonRequest("http://test/api/research/search", { query: "geo optimization" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.serp.avgWordCount).toBeGreaterThan(0);
    expect(typeof data.live).toBe("boolean");
  });

  it("rejects an empty query with 400", async () => {
    const res = await searchRoute(jsonRequest("http://test/api/research/search", { query: "  " }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});

describe("API: /api/geo/score", () => {
  it("scores a TipTap doc and returns all three analyses", async () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Engines cite 31% of passages that open with a direct claim. Mistakes were made in order to test this." }],
        },
      ],
    };
    const res = await scoreRoute(jsonRequest("http://test/api/geo/score", { doc }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.geo.total).toBeGreaterThanOrEqual(0);
    expect(data.readability.some((i: { kind: string }) => i.kind === "passive")).toBe(true);
    expect(data.readability.some((i: { kind: string }) => i.kind === "complex-conjunction")).toBe(true);
    expect(data.cadence.humanScore).toBeGreaterThanOrEqual(0);
  });

  it("rejects a non-doc payload with 400", async () => {
    const res = await scoreRoute(jsonRequest("http://test/api/geo/score", { doc: { type: "nope" } }));
    expect(res.status).toBe(400);
  });
});

describe("API: /api/trends", () => {
  it("filters by niche and flags gaps", async () => {
    const res = await trendsRoute(new NextRequest("http://test/api/trends?niche=Finance"));
    const data = await res.json();
    expect(data.trends.every((t: { niche: string }) => t.niche === "Finance")).toBe(true);
    expect(data.trends.some((t: { isGap: boolean }) => t.isGap)).toBe(true);
  });
});
