import { NextRequest, NextResponse } from "next/server";
import { search, analyzeSerp } from "@/lib/research";
import type { SearchProvider } from "@/lib/research";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });

  // Forward client-supplied search provider and key from headers
  const provider = req.headers.get("x-search-provider") as SearchProvider | null;
  const apiKey = req.headers.get("x-search-key") || "";

  const { results, live } = await search(query, provider && apiKey ? { provider, apiKey } : undefined);
  const serp = analyzeSerp(query, results);
  return NextResponse.json({ results, serp, live });
}
