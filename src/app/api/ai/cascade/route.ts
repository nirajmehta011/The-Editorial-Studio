import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCascade } from "@/lib/generate";
import { getBrandVoice } from "@/lib/brand";
import { TiptapDoc, docToText } from "@/lib/tiptap-text";
import { extractLlmContext } from "@/lib/llm-context";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { documentId } = body ?? {};
  if (!documentId) return NextResponse.json({ error: "documentId is required" }, { status: 400 });

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  const text = docToText(document.content as TiptapDoc);
  const brand = await getBrandVoice(document.brandBrainId);
  const llmCtx = extractLlmContext(req);
  const { pack, live } = await generateCascade(document.title, text, brand, llmCtx);
  return NextResponse.json({ pack, live });
}
