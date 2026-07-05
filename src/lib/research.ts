/**
 * Multi-provider research/search layer.
 *
 * Providers: tavily | serper | brave  (client-supplied key)
 * Falls back to deterministic mock corpus if no key is provided.
 */

import type { LlmContext } from "./llm";

export type SearchProvider = "tavily" | "serper" | "brave";

export type SearchContext = {
  provider?: SearchProvider;
  apiKey?: string;
};

export type ResearchResult = {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  body: string;
  wordCount: number;
  headers: string[];
  peopleAlsoAsk: string[];
};

export type SerpAnalysis = {
  query: string;
  avgWordCount: number;
  headerOutline: { header: string; frequency: number }[];
  peopleAlsoAsk: string[];
};

const DOMAINS = [
  "industryreport.io",
  "thesignalbrief.com",
  "datapointdaily.com",
  "fieldnotes.dev",
  "marketpulse.co",
  "benchmarklab.org",
];

/** Deterministic PRNG so mock results are stable per query (testable, cacheable). */
function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += h << 13; h ^= h >>> 7;
    h += h << 3; h ^= h >>> 17;
    h += h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function mockSearch(query: string): ResearchResult[] {
  const rand = seededRandom(query.toLowerCase().trim());
  const topic = titleCase(query.trim() || "the topic");
  const year = 2026;

  const templates = [
    { title: `${topic}: ${year} Benchmark Report`, angle: "benchmark data" },
    { title: `What ${topic} Actually Costs Teams in ${year}`, angle: "cost analysis" },
    { title: `${topic} — A Practitioner's Field Guide`, angle: "how-to guidance" },
    { title: `The Case Against ${topic} Hype`, angle: "contrarian critique" },
    { title: `${topic} Adoption Survey: ${Math.round(rand() * 4000 + 800)} Respondents`, angle: "survey findings" },
    { title: `How Six Teams Rebuilt Their Workflow Around ${topic}`, angle: "case studies" },
  ];

  return templates.map((t, i) => {
    const domain = DOMAINS[i % DOMAINS.length];
    const pct1 = Math.round(rand() * 60 + 15);
    const pct2 = Math.round(rand() * 40 + 5);
    const n = Math.round(rand() * 900 + 100);
    const wordCount = Math.round(rand() * 1600 + 900);
    const slug = query.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "topic";
    const body = [
      `${t.title}. Our ${t.angle} draws on ${n} data points collected between January and May ${year}.`,
      `The headline finding: ${pct1}% of teams working with ${query} report measurable gains within one quarter, while ${pct2}% see no change at all. The gap tracks almost perfectly with whether a team assigned a dedicated owner.`,
      `Budget matters less than expected. Teams spending under $2,000 per month performed within 4 points of teams spending five times as much, according to our regression across ${n} responses.`,
      `Three practices separated the top quartile: weekly measurement rituals, a single source of truth for metrics, and killing initiatives after two flat cycles instead of four.`,
      `The most common failure mode is tool sprawl. Respondents using more than five tools for ${query} reported ${pct2}% lower satisfaction than those who consolidated to two.`,
    ].join("\n\n");

    return {
      id: `${slug}-${i}`,
      title: t.title,
      url: `https://${domain}/${year}/${slug}`,
      domain,
      snippet: body.split("\n\n")[1].slice(0, 180) + "…",
      body,
      wordCount,
      headers: [
        `What the ${year} data says about ${query}`,
        "Methodology and sample",
        `Where teams win with ${query}`,
        "Common failure modes",
        "What to do next quarter",
      ].slice(0, 3 + Math.floor(rand() * 3)),
      peopleAlsoAsk: [
        `Is ${query} worth it in ${year}?`,
        `How much does ${query} cost?`,
        `What are the best tools for ${query}?`,
        `How do I measure ${query} ROI?`,
        `${titleCase(query)} vs traditional approaches — which wins?`,
      ].slice(0, 3 + Math.floor(rand() * 3)),
    };
  });
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 8000): Promise<Response> {
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

// ─── Provider adapters ───────────────────────────────────────────────────────

async function searchTavily(query: string, apiKey: string): Promise<ResearchResult[]> {
  const res = await fetchWithTimeout("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, include_raw_content: true, max_results: 6 }),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}`);
  const data = (await res.json()) as {
    results: { title: string; url: string; content: string; raw_content?: string }[];
  };
  return data.results.map((r, i) => {
    const body = r.raw_content || r.content || "";
    return {
      id: `live-${i}`,
      title: r.title,
      url: r.url,
      domain: new URL(r.url).hostname,
      snippet: (r.content || body).slice(0, 180) + "…",
      body,
      wordCount: body.split(/\s+/).filter(Boolean).length,
      headers: [],
      peopleAlsoAsk: [],
    };
  });
}

async function searchSerper(query: string, apiKey: string): Promise<ResearchResult[]> {
  const res = await fetchWithTimeout("https://google.serper.dev/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: JSON.stringify({ q: query, num: 6 }),
  });
  if (!res.ok) throw new Error(`Serper ${res.status}`);
  const data = (await res.json()) as {
    organic?: { title: string; link: string; snippet: string }[];
    peopleAlsoAsk?: { question: string }[];
  };
  const paa = (data.peopleAlsoAsk ?? []).map((q) => q.question);
  return (data.organic ?? []).map((r, i) => ({
    id: `serper-${i}`,
    title: r.title,
    url: r.link,
    domain: new URL(r.link).hostname,
    snippet: r.snippet,
    body: r.snippet,
    wordCount: r.snippet.split(/\s+/).filter(Boolean).length,
    headers: [],
    peopleAlsoAsk: paa,
  }));
}

async function searchBrave(query: string, apiKey: string): Promise<ResearchResult[]> {
  const params = new URLSearchParams({ q: query, count: "6" });
  const res = await fetchWithTimeout(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: { Accept: "application/json", "Accept-Encoding": "gzip", "X-Subscription-Token": apiKey },
  });
  if (!res.ok) throw new Error(`Brave ${res.status}`);
  const data = (await res.json()) as {
    web?: { results: { title: string; url: string; description: string }[] };
  };
  return (data.web?.results ?? []).map((r, i) => ({
    id: `brave-${i}`,
    title: r.title,
    url: r.url,
    domain: new URL(r.url).hostname,
    snippet: r.description,
    body: r.description,
    wordCount: r.description.split(/\s+/).filter(Boolean).length,
    headers: [],
    peopleAlsoAsk: [],
  }));
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export async function search(
  query: string,
  ctx?: SearchContext
): Promise<{ results: ResearchResult[]; live: boolean }> {
  const provider = ctx?.provider;
  const apiKey = ctx?.apiKey || process.env.TAVILY_API_KEY || "";

  // Use client-supplied context if available
  if (provider && apiKey) {
    try {
      let results: ResearchResult[];
      if (provider === "serper") results = await searchSerper(query, apiKey);
      else if (provider === "brave") results = await searchBrave(query, apiKey);
      else results = await searchTavily(query, apiKey);
      return { results, live: true };
    } catch (err) {
      console.error(`Live search (${provider}) failed; falling back to mock:`, err);
      return { results: mockSearch(query), live: false };
    }
  }

  // Legacy env-var path (Tavily only)
  if (process.env.TAVILY_API_KEY) {
    try {
      const results = await searchTavily(query, process.env.TAVILY_API_KEY);
      return { results, live: true };
    } catch (err) {
      console.error("Tavily search failed; falling back to mock:", err);
      return { results: mockSearch(query), live: false };
    }
  }

  return { results: mockSearch(query), live: false };
}

export function analyzeSerp(query: string, results: ResearchResult[]): SerpAnalysis {
  const avgWordCount = results.length
    ? Math.round(results.reduce((a, r) => a + r.wordCount, 0) / results.length)
    : 0;

  const headerCounts = new Map<string, number>();
  for (const r of results) {
    for (const h of r.headers) {
      headerCounts.set(h, (headerCounts.get(h) ?? 0) + 1);
    }
  }
  const headerOutline = [...headerCounts.entries()]
    .map(([header, frequency]) => ({ header, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 8);

  const paa = [...new Set(results.flatMap((r) => r.peopleAlsoAsk))].slice(0, 6);

  return { query, avgWordCount, headerOutline, peopleAlsoAsk: paa };
}
