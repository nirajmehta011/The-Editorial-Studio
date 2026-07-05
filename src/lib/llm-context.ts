/**
 * Extracts client-supplied LLM context (provider, key, model) from
 * request headers so API routes can forward user-configured keys to the
 * LLM layer without touching server environment variables.
 */
import type { NextRequest } from "next/server";
import type { LlmContext, LlmProvider } from "@/lib/llm";

export function extractLlmContext(req: NextRequest): LlmContext | undefined {
  const provider = req.headers.get("x-llm-provider") as LlmProvider | null;
  const apiKey = req.headers.get("x-llm-key") || "";
  const model = req.headers.get("x-llm-model") || "";
  if (provider && apiKey) return { provider, apiKey, model: model || undefined };
  return undefined;
}
