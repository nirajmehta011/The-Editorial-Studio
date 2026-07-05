"use client";

import type { GeoReport } from "@/lib/geo";
import type { ReadabilityIssue } from "@/lib/readability";
import type { CadenceReport } from "@/lib/cadence";
import { Wand2 } from "lucide-react";

type Block = { index: number; type: string; text: string };

export function GeoPanel({
  geo,
  issues,
  cadence,
  blocks,
  onJump,
  onFix,
  onRephrase,
  rephrasing,
}: {
  geo: GeoReport;
  issues: ReadabilityIssue[];
  cadence: CadenceReport;
  blocks: Block[];
  onJump: (issue: ReadabilityIssue) => void;
  onFix: (issue: ReadabilityIssue) => void;
  onRephrase: (blockIndex: number) => void;
  rephrasing: boolean;
}) {
  const stampColor = geo.total >= 70 ? "text-sage" : geo.total >= 40 ? "text-mark" : "text-proof";
  const cadenceColor = cadence.humanScore >= 70 ? "text-sage" : cadence.humanScore >= 40 ? "text-mark" : "text-proof";

  return (
    <div className="space-y-6 p-4">
      {/* GEO score */}
      <section>
        <p className="eyebrow mb-3 text-proof">GEO citability</p>
        <div className="flex items-center gap-4">
          <div className={`score-stamp px-3.5 py-2 ${stampColor}`}>
            <span className="text-3xl font-medium">{geo.total}</span>
            <span className="text-xs">/100</span>
          </div>
          <p className="text-xs leading-relaxed text-fog">
            How quotable this draft is to answer engines like Perplexity &amp; ChatGPT Search.
          </p>
        </div>
        <div className="mt-4 space-y-2.5">
          {geo.subscores.map((s) => (
            <div key={s.key}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-chalk">{s.label}</span>
                <span className="font-[family-name:var(--font-data)] text-fog">{s.score}</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-3">
                <div
                  className={`h-1.5 rounded-full ${s.score >= 70 ? "bg-sage" : s.score >= 40 ? "bg-mark" : "bg-proof"}`}
                  style={{ width: `${s.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {geo.tips.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {geo.tips.map((t) => (
              <li key={t} className="flex gap-1.5 text-xs leading-snug text-fog">
                <span className="text-proof">→</span> {t}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Style trimmer */}
      <section className="border-t border-ink-line pt-5">
        <p className="eyebrow mb-2 text-mark">Style trimmer</p>
        {issues.length === 0 ? (
          <p className="text-xs text-fog">Clean copy — no passive strings, filler, or run-ons detected.</p>
        ) : (
          <ul className="space-y-2">
            {issues.slice(0, 12).map((issue, i) => (
              <li key={i} className="rounded border border-ink-line bg-ink-2 p-2.5">
                <button onClick={() => onJump(issue)} className="w-full text-left">
                  <p className="eyebrow text-fog/70">{issue.kind.replace("-", " ")}</p>
                  <p className="mt-1 truncate font-[family-name:var(--font-prose)] text-xs italic text-chalk">
                    “{issue.found.length > 60 ? issue.found.slice(0, 57) + "…" : issue.found}”
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-fog">{issue.message}</p>
                </button>
                {issue.replacement !== null && (
                  <button
                    onClick={() => onFix(issue)}
                    className="mt-1.5 rounded bg-ink-3 px-2 py-1 text-[11px] text-mark hover:bg-ink-line"
                  >
                    Fix → “{issue.replacement.trim() || "delete"}”
                  </button>
                )}
              </li>
            ))}
            {issues.length > 12 && (
              <li className="text-[11px] text-fog">+{issues.length - 12} more further down the draft</li>
            )}
          </ul>
        )}
      </section>

      {/* Cadence scan */}
      <section className="border-t border-ink-line pt-5">
        <p className="eyebrow mb-2 text-sage">AI cadence scan</p>
        <div className="flex items-baseline gap-3 font-[family-name:var(--font-data)]">
          <span className={`text-3xl ${cadenceColor}`}>{cadence.humanScore}</span>
          <span className="text-xs text-fog">human pacing score</span>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-ink-2 p-2">
            <dt className="text-fog">Burstiness</dt>
            <dd className="font-[family-name:var(--font-data)] text-chalk">{cadence.burstiness}</dd>
          </div>
          <div className="rounded bg-ink-2 p-2">
            <dt className="text-fog">Lexical diversity</dt>
            <dd className="font-[family-name:var(--font-data)] text-chalk">{cadence.lexicalDiversity}</dd>
          </div>
        </dl>
        {cadence.stockPhrases.length > 0 && (
          <p className="mt-2 text-[11px] leading-snug text-fog">
            Stock phrasing detected: <span className="text-proof">{cadence.stockPhrases.join(", ")}</span>
          </p>
        )}
        {cadence.flaggedBlocks.length > 0 && (
          <ul className="mt-2 space-y-2">
            {cadence.flaggedBlocks.map((f) => {
              const block = blocks.find((b) => b.index === f.blockIndex);
              return (
                <li key={f.blockIndex} className="rounded border border-ink-line bg-ink-2 p-2.5">
                  <p className="truncate font-[family-name:var(--font-prose)] text-xs italic text-chalk">
                    “{(block?.text ?? "").slice(0, 70)}…”
                  </p>
                  <p className="mt-1 text-[11px] text-fog">{f.reason}</p>
                  <button
                    onClick={() => onRephrase(f.blockIndex)}
                    disabled={rephrasing}
                    className="mt-1.5 flex items-center gap-1 rounded bg-ink-3 px-2 py-1 text-[11px] text-sage disabled:opacity-50"
                  >
                    <Wand2 size={10} /> {rephrasing ? "Rewriting…" : "Re-phrase for rhythm"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
