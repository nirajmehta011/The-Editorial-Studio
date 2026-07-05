"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Quote, Search, Sparkles, ExternalLink } from "lucide-react";
import { useStudioStore } from "@/lib/store";

type Result = {
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

type Serp = {
  avgWordCount: number;
  headerOutline: { header: string; frequency: number }[];
  peopleAlsoAsk: string[];
};

export function ResearchPanel({
  editor,
  brandBrainId,
  llmHeaders = {},
}: {
  editor: Editor | null;
  brandBrainId: string | null;
  llmHeaders?: Record<string, string>;
}) {
  const { searchProvider, searchApiKey } = useStudioStore();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [serp, setSerp] = useState<Serp | null>(null);
  const [live, setLive] = useState(false);
  const [tab, setTab] = useState<"results" | "serp">("results");
  const [error, setError] = useState<string | null>(null);
  const [clip, setClip] = useState<{ resultId: string; text: string } | null>(null);
  const [summaries, setSummaries] = useState<Record<string, { bullets: string[]; live: boolean } | "loading">>({});
  const footnoteCounter = useRef(0);

  // Build search headers from store
  const searchHeaders: Record<string, string> = {};
  if (searchProvider && searchApiKey) {
    searchHeaders["x-search-provider"] = searchProvider;
    searchHeaders["x-search-key"] = searchApiKey;
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/research/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...searchHeaders },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.results);
      setSerp(data.serp);
      setLive(data.live);
      setSummaries({});
      setClip(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function captureSelection(resultId: string) {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    if (text.length > 10) setClip({ resultId, text });
  }

  function clipAndQuote(result: Result) {
    if (!editor || !clip || clip.resultId !== result.id) return;
    footnoteCounter.current += 1;
    const n = footnoteCounter.current;
    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: "blockquote",
          content: [{ type: "paragraph", content: [{ type: "text", text: `“${clip.text}”` }] }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: `[${n}] ` },
            {
              type: "text",
              text: `${result.title} — ${result.domain}`,
              marks: [{ type: "link", attrs: { href: result.url, target: "_blank" } }],
            },
          ],
        },
      ])
      .run();
    setClip(null);
    window.getSelection()?.removeAllRanges();
  }

  async function summarize(result: Result) {
    setSummaries((s) => ({ ...s, [result.id]: "loading" }));
    try {
      const res = await fetch("/api/research/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...llmHeaders },
        body: JSON.stringify({ title: result.title, text: result.body, brandBrainId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummaries((s) => ({ ...s, [result.id]: { bullets: data.bullets, live: data.live } }));
    } catch (err) {
      console.error("Summarize failed:", err);
      setSummaries((s) => {
        const next = { ...s };
        delete next[result.id];
        return next;
      });
    }
  }

  return (
    <div className="p-4">
      <p className="eyebrow mb-2 text-proof">Research</p>
      <form onSubmit={runSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the live web…"
          className="min-w-0 flex-1 rounded border border-ink-line bg-ink px-2.5 py-2 text-sm outline-none placeholder:text-fog/60 focus:border-proof"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          aria-label="Search"
          className="rounded bg-ink-3 px-3 text-chalk disabled:opacity-40"
        >
          <Search size={15} />
        </button>
      </form>
      {results && !live && (
        <p className="mt-2 text-[11px] text-fog">Mock corpus — add a search API key in Settings for live results</p>
      )}
      {error && <p className="mt-2 text-xs text-proof">{error}</p>}

      {results && (
        <div className="mt-3 flex gap-1 border-b border-ink-line">
          {(["results", "serp"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs ${tab === t ? "border-b-2 border-proof text-chalk" : "text-fog"}`}
            >
              {t === "results" ? `Results (${results.length})` : "Competitor SERP"}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="mt-4 text-xs text-fog">Searching…</p>}

      {tab === "results" &&
        results?.map((r) => {
          const summary = summaries[r.id];
          return (
            <article key={r.id} className="mt-3 rounded border border-ink-line bg-ink-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sm font-medium text-chalk hover:text-proof"
                  >
                    <span className="truncate">{r.title}</span>
                    <ExternalLink size={11} className="shrink-0 text-fog" />
                  </a>
                  <p className="eyebrow mt-0.5 text-fog/70">
                    {r.domain} · {r.wordCount.toLocaleString()} words
                  </p>
                </div>
              </div>

              <div
                onMouseUp={() => captureSelection(r.id)}
                className="mt-2 max-h-40 overflow-y-auto whitespace-pre-line rounded bg-ink p-2.5 text-xs leading-relaxed text-fog"
              >
                {r.body}
              </div>
              <p className="mt-1.5 text-[11px] text-fog/60">Highlight a passage above, then clip it into the draft.</p>

              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => clipAndQuote(r)}
                  disabled={!clip || clip.resultId !== r.id || !editor}
                  className="flex items-center gap-1.5 rounded bg-proof px-2.5 py-1.5 text-xs font-medium text-paper disabled:opacity-35"
                >
                  <Quote size={11} /> Clip &amp; quote
                </button>
                <button
                  onClick={() => void summarize(r)}
                  disabled={summary === "loading"}
                  className="flex items-center gap-1.5 rounded border border-ink-line px-2.5 py-1.5 text-xs text-chalk disabled:opacity-50"
                >
                  <Sparkles size={11} className="text-mark" />
                  {summary === "loading" ? "Summarizing…" : "AI summary"}
                </button>
              </div>

              {summary && summary !== "loading" && (
                <ul className="mt-2.5 space-y-1.5 rounded border border-mark/25 bg-mark/5 p-2.5">
                  {summary.bullets.map((b, i) => (
                    <li key={i} className="flex gap-1.5 text-xs leading-snug text-chalk">
                      <span className="text-mark">▪</span> {b}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}

      {tab === "serp" && serp && (
        <div className="mt-3 space-y-4">
          <div className="rounded border border-ink-line bg-ink-2 p-3">
            <p className="eyebrow text-fog">Average word count (top results)</p>
            <p className="mt-1 font-[family-name:var(--font-data)] text-2xl text-chalk">
              {serp.avgWordCount.toLocaleString()}
            </p>
          </div>
          <div className="rounded border border-ink-line bg-ink-2 p-3">
            <p className="eyebrow mb-2 text-fog">Common H2/H3 outline</p>
            <ul className="space-y-1.5">
              {serp.headerOutline.map((h) => (
                <li key={h.header} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-chalk">{h.header}</span>
                  <span className="shrink-0 font-[family-name:var(--font-data)] text-fog">×{h.frequency}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded border border-ink-line bg-ink-2 p-3">
            <p className="eyebrow mb-2 text-fog">People also ask</p>
            <ul className="space-y-1.5">
              {serp.peopleAlsoAsk.map((q) => (
                <li key={q} className="text-xs leading-snug text-chalk">? {q}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
