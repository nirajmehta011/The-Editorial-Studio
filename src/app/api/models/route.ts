import { NextRequest, NextResponse } from "next/server";
import { fetchModels } from "@/lib/llm";
import type { LlmProvider } from "@/lib/llm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider") as LlmProvider | null;
  const key = searchParams.get("key") ?? "";

  if (!provider || !key) {
    return NextResponse.json({ error: "provider and key are required" }, { status: 400 });
  }

  const models = await fetchModels(provider, key);
  return NextResponse.json({ models });
}
