"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Flame, PenLine, TrendingUp, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { useStudioStore } from "@/lib/store";
import { NICHES } from "@/lib/trends";

type TrendCard = {
  id: string;
  topic: string;
  niche: string;
  interestVolume: number;
  growthPct: number;
  competition: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  isGap: boolean;
};

const COMPETITION_STYLES: Record<string, string> = {
  LOW: "text-sage",
  MEDIUM: "text-mark",
  HIGH: "text-proof",
};

function formatVolume(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : String(n);
}

export default function DiscoveryPage() {
  const router = useRouter();
  const { activeWorkspaceId, activeBrainId, llmProvider, llmApiKey, llmModel } = useStudioStore();
  const [niche, setNiche] = useState<string>("All");
  const [trends, setTrends] = useState<TrendCard[] | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [writingId, setWritingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build LLM headers for dynamic generation
  const llmHeaders = useMemo((): Record<string, string> => {
    if (!llmProvider || !llmApiKey) return {};
    return {
      "x-llm-provider": llmProvider,
      "x-llm-key": llmApiKey,
      ...(llmModel ? { "x-llm-model": llmModel } : {}),
    };
  }, [llmProvider, llmApiKey, llmModel]);

  const loadTrends = async (forceLive = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/trends?niche=${encodeURIComponent(niche)}${forceLive ? "&live=true" : ""}`;
      const res = await fetch(url, {
        headers: forceLive ? llmHeaders : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch trends");
      setTrends(data.trends ?? []);
      setIsLive(data.live ?? false);
    } catch (err) {
      setError("Couldn't load trends. Refresh to retry.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTrends(false);
  }, [niche]); // eslint-disable-line react-hooks/exhaustive-deps

  async function writeAboutThis(trend: TrendCard) {
    if (!activeWorkspaceId) {
      setError("Pick a workspace in the top bar first.");
      return;
    }
    setWritingId(trend.id);
    setError(null);
    try {
      const res = await fetch("/api/trends/write", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...llmHeaders },
        body: JSON.stringify({
          trendId: trend.id,
          workspaceId: activeWorkspaceId,
          brandBrainId: activeBrainId,
          // Pass the trend itself if it's dynamic/live
          customTrend: isLive ? trend : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to provision document");
      router.push(`/write/${data.document.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to provision document");
      setWritingId(null);
    }
  }

  const gaps = trends?.filter((t) => t.isGap) ?? [];
  const hasLlmKey = Boolean(llmProvider && llmApiKey);

  return (
    <div className="mx-auto max-w-[1300px] px-5 py-10">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-proof" />
          <p className="eyebrow text-proof">Demand-driven ideation</p>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 rounded bg-sage/10 px-2 py-0.5 text-xs text-sage border border-sage/20">
              <Sparkles size={11} /> Live trends active
            </span>
          )}
          <button
            onClick={() => void loadTrends(true)}
            disabled={loading || !hasLlmKey}
            title={hasLlmKey ? "Generate live trends using AI key" : "Please add an AI key in settings to fetch live trends"}
            className="flex items-center gap-1.5 rounded-lg border border-ink-line bg-ink-2 px-3 py-1.5 text-xs font-medium text-chalk hover:border-proof hover:text-proof disabled:opacity-40 disabled:hover:border-ink-line disabled:hover:text-chalk"
          >
            <RefreshCw size={12} className={loading ? "animate-spin text-proof" : ""} />
            Refresh Live Trends
          </button>
        </div>
      </div>
      <h1 className="font-[family-name:var(--font-prose)] text-3xl font-semibold tracking-tight">
        Discovery &amp; Trends
      </h1>
      <p className="mt-1.5 max-w-xl text-sm text-fog">
        High-velocity search trends by vertical. Gap alerts flag explosive demand with thin competitor coverage —
        the fastest wins on the board.
      </p>

      {gaps.length > 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-mark/30 bg-mark/5 px-4 py-3">
          <Flame size={16} className="shrink-0 text-mark" />
          <p className="text-sm">
            <span className="font-medium text-mark">{gaps.length} content gap{gaps.length > 1 ? "s" : ""} open:</span>{" "}
            <span className="text-chalk">{gaps.map((g) => g.topic).join(" · ")}</span>
          </p>
        </div>
      )}

      {!hasLlmKey && (
        <div className="mt-4 flex items-center gap-2 rounded border border-ink-line bg-ink-2/30 px-3 py-2 text-xs text-fog">
          <AlertCircle size={14} className="text-proof" />
          <span>To fetch live trends using AI, click the Settings gear in the navbar and configure an AI provider.</span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {NICHES.map((n) => (
          <button
            key={n}
            onClick={() => { setNiche(n); setIsLive(false); }}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              niche === n
                ? "border-proof bg-proof text-paper"
                : "border-ink-line text-fog hover:border-fog hover:text-chalk"
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-proof">{error}</p>}

      {trends === null || loading ? (
        <p className="mt-8 text-sm text-fog">Reading the tape…</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trends.map((t) => (
            <article
              key={t.id}
              className={`flex flex-col rounded-lg border bg-ink-2 p-5 ${
                t.isGap ? "border-mark/50" : "border-ink-line"
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow mb-1 text-fog">{t.niche}</p>
                  <h2 className="font-[family-name:var(--font-prose)] text-xl font-semibold leading-snug">
                    {t.topic}
                  </h2>
                </div>
                {t.isGap && (
                  <span className="eyebrow flex shrink-0 items-center gap-1 rounded bg-mark/15 px-2 py-1 text-mark">
                    <Flame size={11} /> Gap
                  </span>
                )}
              </div>

              <p className="mb-4 text-sm leading-relaxed text-fog">{t.summary}</p>

              <dl className="mb-5 mt-auto grid grid-cols-3 gap-2 font-[family-name:var(--font-data)]">
                <div>
                  <dt className="eyebrow text-fog/70">Interest</dt>
                  <dd className="mt-0.5 text-lg text-chalk">{formatVolume(t.interestVolume)}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-fog/70">Growth</dt>
                  <dd className={`mt-0.5 text-lg ${t.growthPct >= 200 ? "text-sage" : "text-chalk"}`}>
                    +{t.growthPct}%
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-fog/70">Density</dt>
                  <dd className={`mt-0.5 text-lg ${COMPETITION_STYLES[t.competition]}`}>{t.competition}</dd>
                </div>
              </dl>

              <button
                onClick={() => void writeAboutThis(t)}
                disabled={writingId !== null}
                className="flex items-center justify-center gap-2 rounded border border-proof/60 px-3 py-2 text-sm font-medium text-proof transition-colors hover:bg-proof hover:text-paper disabled:opacity-40"
              >
                <PenLine size={14} />
                {writingId === t.id ? "Provisioning draft…" : "Write about this"}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
