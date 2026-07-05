import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTrend } from "@/lib/trends";
import { generateAngles } from "@/lib/generate";
import { getBrandVoice } from "@/lib/brand";
import { extractLlmContext } from "@/lib/llm-context";

/**
 * "Write About This": provisions a document from a trend, then runs the
 * angle-generation worker and stores the three structural angles in doc meta.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { trendId, workspaceId, brandBrainId, customTrend } = body ?? {};
  
  let trend = getTrend(trendId);
  if (!trend && customTrend) {
    trend = customTrend;
  }
  
  if (!trend) return NextResponse.json({ error: "Trend not found" }, { status: 404 });
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

  const document = await prisma.document.create({
    data: {
      workspaceId,
      brandBrainId: brandBrainId ?? null,
      title: trend.topic,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: trend.topic }] },
          { type: "paragraph", content: [{ type: "text", text: trend.summary }] },
          { type: "paragraph" },
        ],
      },
      meta: {
        trend: {
          id: trend.id,
          niche: trend.niche,
          interestVolume: trend.interestVolume,
          growthPct: trend.growthPct,
          competition: trend.competition,
        },
        anglesStatus: "generating",
      },
    },
  });

  // Angle worker. Mock resolves instantly; live LLM takes a few seconds — we
  // await so the editor opens with angles ready, still well within timeout.
  const brand = await getBrandVoice(brandBrainId);
  const llmCtx = extractLlmContext(req);
  const { angles, live } = await generateAngles(trend.topic, brand, llmCtx);
  const updated = await prisma.document.update({
    where: { id: document.id },
    data: {
      meta: {
        ...(document.meta as Record<string, unknown>),
        angles,
        anglesStatus: "ready",
        anglesLive: live,
      },
    },
  });

  return NextResponse.json({ document: updated }, { status: 201 });
}
