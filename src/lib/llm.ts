import Anthropic from "@anthropic-ai/sdk";

/**
 * Multi-provider LLM orchestration layer.
 *
 * Priority: client-supplied key/provider (forwarded from request headers)
 *           → server env var (ANTHROPIC_API_KEY, existing behaviour)
 *           → throws LlmUnavailableError (callers fall back to deterministic mocks)
 *
 * Supported providers: anthropic | openai | google | groq | openrouter
 */

export class LlmUnavailableError extends Error {
  constructor() {
    super("No LLM API key configured");
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(id);
  }
}

export type LlmProvider = "anthropic" | "openai" | "google" | "groq" | "openrouter";

export type LlmContext = {
  provider?: LlmProvider;
  apiKey?: string;
  model?: string;
};

export type BrandVoice = {
  name: string;
  guidelines: string;
  toneKeywords: string[];
} | null;

export function brandSystemPrompt(brand: BrandVoice): string {
  const base =
    "You are the in-house editor for a professional content studio. Produce publication-ready copy with concrete claims and no filler.";
  if (!brand) return base;
  return [
    base,
    `Active brand profile: ${brand.name}.`,
    brand.toneKeywords.length ? `Tone keywords: ${brand.toneKeywords.join(", ")}.` : "",
    "Follow these brand guidelines exactly:",
    brand.guidelines,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function llmAvailable(ctx?: LlmContext): boolean {
  if (ctx?.apiKey) return true;
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// ─── Provider helpers ────────────────────────────────────────────────────────

async function callAnthropic(opts: {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens: number;
}): Promise<string> {
  const client = new Anthropic({ apiKey: opts.apiKey });
  const response = await client.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
    output_config: {
      format: { type: "json_schema", schema: opts.schema },
    },
  });
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error(`No text block (stop_reason: ${response.stop_reason})`);
  return text.text;
}

async function callOpenAICompat(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens: number;
  extraHeaders?: Record<string, string>;
}): Promise<string> {
  const res = await fetchWithTimeout(`${opts.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
      ...opts.extraHeaders,
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "response", schema: opts.schema, strict: true },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${opts.baseUrl} ${res.status}: ${err}`);
  }
  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "{}";
}

function stripAdditionalProperties(schema: any): any {
  if (schema === null || typeof schema !== "object") {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map(stripAdditionalProperties);
  }
  const copy = { ...schema };
  delete copy.additionalProperties;
  for (const key in copy) {
    copy[key] = stripAdditionalProperties(copy[key]);
  }
  return copy;
}

async function callGoogle(opts: {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens: number;
}): Promise<string> {
  const modelId = opts.model || "gemini-1.5-flash";
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${opts.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
        generationConfig: {
          maxOutputTokens: opts.maxTokens,
          responseMimeType: "application/json",
          responseSchema: stripAdditionalProperties(opts.schema),
        },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google AI ${res.status}: ${err}`);
  }
  const data = await res.json() as { candidates: { content: { parts: { text: string }[] } }[] };
  return data.candidates[0]?.content?.parts?.[0]?.text ?? "{}";
}

// ─── Main entry ──────────────────────────────────────────────────────────────

const DEFAULT_MODELS: Record<string, string> = {
  anthropic: "claude-opus-4-8",
  openai: "gpt-4o",
  google: "gemini-1.5-flash",
  groq: "llama-3.3-70b-versatile",
  openrouter: "anthropic/claude-3.5-sonnet",
};

export async function completeStructured<T>(opts: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
  llmCtx?: LlmContext;
}): Promise<T> {
  const ctx = opts.llmCtx ?? {};
  const maxTokens = opts.maxTokens ?? 8192;

  // Resolve provider + key
  const provider: LlmProvider = ctx.provider ?? "anthropic";
  const apiKey =
    ctx.apiKey ||
    process.env[
      provider === "anthropic"
        ? "ANTHROPIC_API_KEY"
        : provider === "openai"
        ? "OPENAI_API_KEY"
        : provider === "google"
        ? "GOOGLE_AI_API_KEY"
        : provider === "groq"
        ? "GROQ_API_KEY"
        : "OPENROUTER_API_KEY"
    ] ||
    "";

  if (!apiKey) throw new LlmUnavailableError();

  const model = ctx.model || DEFAULT_MODELS[provider] || DEFAULT_MODELS.anthropic;

  let rawText: string;

  if (provider === "anthropic") {
    rawText = await callAnthropic({ apiKey, model, system: opts.system, prompt: opts.prompt, schema: opts.schema, maxTokens });
  } else if (provider === "google") {
    rawText = await callGoogle({ apiKey, model, system: opts.system, prompt: opts.prompt, schema: opts.schema, maxTokens });
  } else if (provider === "groq") {
    rawText = await callOpenAICompat({
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey, model, system: opts.system, prompt: opts.prompt, schema: opts.schema, maxTokens,
    });
  } else if (provider === "openrouter") {
    rawText = await callOpenAICompat({
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey, model, system: opts.system, prompt: opts.prompt, schema: opts.schema, maxTokens,
      extraHeaders: {
        "HTTP-Referer": "https://editorial-studio.app",
        "X-Title": "Editorial Studio",
      },
    });
  } else {
    // openai
    rawText = await callOpenAICompat({
      baseUrl: "https://api.openai.com/v1",
      apiKey, model, system: opts.system, prompt: opts.prompt, schema: opts.schema, maxTokens,
    });
  }

  return JSON.parse(rawText) as T;
}

// ─── Model catalog ───────────────────────────────────────────────────────────

export type ModelInfo = { id: string; name: string; contextWindow?: number };

export async function fetchModels(provider: LlmProvider, apiKey: string): Promise<ModelInfo[]> {
  try {
    if (provider === "anthropic") {
      return [
        { id: "claude-opus-4-8", name: "Claude Opus 4 (latest)", contextWindow: 200000 },
        { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", contextWindow: 200000 },
        { id: "claude-haiku-3-5", name: "Claude Haiku 3.5", contextWindow: 200000 },
        { id: "claude-3-opus-20240229", name: "Claude 3 Opus", contextWindow: 200000 },
        { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", contextWindow: 200000 },
      ];
    }
    if (provider === "openai") {
      return [
        { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000 },
        { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000 },
        { id: "gpt-4-turbo", name: "GPT-4 Turbo", contextWindow: 128000 },
        { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", contextWindow: 16385 },
        { id: "o1-preview", name: "o1 Preview", contextWindow: 128000 },
        { id: "o1-mini", name: "o1 Mini", contextWindow: 128000 },
      ];
    }
    if (provider === "google") {
      try {
        const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (res.ok) {
          const data = await res.json() as { models: { name: string; displayName: string; inputTokenLimit?: number }[] };
          const geminiModels = (data.models ?? [])
            .filter((m) => m.name.includes("gemini"))
            .map((m) => ({
              id: m.name.replace(/^models\//, ""),
              name: m.displayName || m.name,
              contextWindow: m.inputTokenLimit,
            }));
          if (geminiModels.length > 0) return geminiModels;
        }
      } catch (err) {
        console.error("Google dynamic models fetch failed:", err);
      }
      return [
        { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1000000 },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", contextWindow: 2000000 },
        { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", contextWindow: 1000000 },
        { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B", contextWindow: 1000000 },
      ];
    }
    if (provider === "groq") {
      return [
        { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile", contextWindow: 128000 },
        { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", contextWindow: 128000 },
        { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", contextWindow: 32768 },
        { id: "gemma2-9b-it", name: "Gemma 2 9B", contextWindow: 8192 },
        { id: "llama3-70b-8192", name: "Llama 3 70B", contextWindow: 8192 },
        { id: "llama3-8b-8192", name: "Llama 3 8B", contextWindow: 8192 },
      ];
    }
    if (provider === "openrouter") {
      const res = await fetchWithTimeout("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error("OpenRouter models fetch failed");
      const data = await res.json() as { data: { id: string; name: string; context_length?: number }[] };
      // Return top models sorted by popularity (they come pre-sorted from API)
      return data.data
        .filter((m) => !m.id.includes(":free") || true) // include free tier
        .slice(0, 30)
        .map((m) => ({ id: m.id, name: m.name, contextWindow: m.context_length }));
    }
    return [];
  } catch {
    return [];
  }
}
