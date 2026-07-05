import { NextRequest, NextResponse } from "next/server";
import { getTrends, isGap } from "@/lib/trends";
import { completeStructured } from "@/lib/llm";
import { extractLlmContext } from "@/lib/llm-context";

type GeneratedTrend = {
  id: string;
  topic: string;
  niche: string;
  interestVolume: number;
  growthPct: number;
  competition: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
};

export async function GET(req: NextRequest) {
  const niche = req.nextUrl.searchParams.get("niche") ?? "All";
  const forceLive = req.nextUrl.searchParams.get("live") === "true";
  const llmCtx = extractLlmContext(req);

  // If live refresh is requested and we have LLM context, generate live trends!
  if (forceLive && llmCtx) {
    try {
      const prompt = `Generate exactly 6 highly relevant, hot, and explosive search trends in the "${niche}" niche (if niche is "All", mix Tech, Finance, Health, Marketing, and Lifestyle). Provide realistic data for interest volume (monthly searches), 90-day growth %, competition level, and a one-sentence summary explaining why it is trending. Make sure the ids are unique slug strings.`;

      const data = await completeStructured<{ trends: GeneratedTrend[] }>({
        system: "You are an expert market research analyst. Generate real, high-value search trends based on current industry developments.",
        prompt,
        schema: {
          type: "object",
          properties: {
            trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  topic: { type: "string" },
                  niche: { type: "string" },
                  interestVolume: { type: "integer" },
                  growthPct: { type: "integer" },
                  competition: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
                  summary: { type: "string" },
                },
                required: ["id", "topic", "niche", "interestVolume", "growthPct", "competition", "summary"],
                additionalProperties: false,
              },
            },
          },
          required: ["trends"],
          additionalProperties: false,
        },
        llmCtx,
      });

      const trends = data.trends.map((t) => ({
        ...t,
        isGap: t.growthPct >= 200 && t.competition === "LOW",
      }));
      return NextResponse.json({ trends, live: true });
    } catch (err) {
      console.error("Live trends generation failed, falling back to static:", err);
    }
  }

  // Fallback to static trends
  const staticNiche = niche === "All" ? undefined : niche;
  const trends = getTrends(staticNiche).map((t) => ({ ...t, isGap: isGap(t) }));
  return NextResponse.json({ trends, live: false });
}
