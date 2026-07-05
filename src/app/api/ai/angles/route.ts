import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAngles } from "@/lib/generate";
import { getBrandVoice } from "@/lib/brand";
import { extractLlmContext } from "@/lib/llm-context";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { documentId, topic, brandBrainId, customFocus } = body ?? {};
    
    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const currentTitle = topic || doc.title || "Untitled Document";
    const brand = await getBrandVoice(brandBrainId || doc.brandBrainId);
    const llmCtx = extractLlmContext(req);

    const { angles, live, error } = await generateAngles(currentTitle, brand, llmCtx, customFocus);

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        meta: {
          ...(doc.meta as Record<string, unknown>),
          angles,
          anglesLive: live,
          anglesStatus: "ready",
          anglesError: error || null,
        },
      },
    });

    return NextResponse.json({ document: updated, angles, live, error }, { status: 200 });
  } catch (err) {
    console.error("AI Angles endpoint error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal Server Error" }, { status: 500 });
  }
}
