import { NextRequest, NextResponse } from "next/server";
import { summarizeResearch } from "@/lib/generate";
import { getBrandVoice } from "@/lib/brand";
import { extractLlmContext } from "@/lib/llm-context";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, text, brandBrainId } = body ?? {};
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  const brand = await getBrandVoice(brandBrainId);
  const llmCtx = extractLlmContext(req);
  const { bullets, live } = await summarizeResearch(title ?? "", text, brand, llmCtx);
  return NextResponse.json({ bullets, live });
}
