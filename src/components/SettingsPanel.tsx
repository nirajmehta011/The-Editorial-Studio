"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Search,
  Bot,
  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Zap,
  Globe,
} from "lucide-react";
import { useStudioStore, type SearchProvider, type LlmProvider } from "@/lib/store";

type VerifyState = "idle" | "loading" | "ok" | "error";

const SEARCH_PROVIDERS: { id: SearchProvider; label: string; freeTier: string; docsUrl: string }[] = [
  { id: "tavily", label: "Tavily", freeTier: "1,000 searches/mo free", docsUrl: "https://tavily.com" },
  { id: "serper", label: "Serper.dev", freeTier: "2,500 searches/mo free", docsUrl: "https://serper.dev" },
  { id: "brave", label: "Brave Search", freeTier: "2,000 searches/mo free", docsUrl: "https://brave.com/search/api" },
];

const LLM_PROVIDERS: { id: LlmProvider; label: string; badge?: string; color: string }[] = [
  { id: "anthropic", label: "Anthropic", badge: "Claude", color: "#d97757" },
  { id: "openai", label: "OpenAI", badge: "GPT-4o", color: "#10a37f" },
  { id: "google", label: "Google AI", badge: "Gemini", color: "#4285f4" },
  { id: "groq", label: "Groq", badge: "Free tier", color: "#f55036" },
  { id: "openrouter", label: "OpenRouter", badge: "300+ models", color: "#7c3aed" },
];

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    searchProvider,
    searchApiKey,
    setSearchProvider,
    setSearchApiKey,
    llmProvider,
    llmApiKey,
    llmModel,
    availableModels,
    setLlmProvider,
    setLlmApiKey,
    setLlmModel,
    setAvailableModels,
  } = useStudioStore();

  const [tab, setTab] = useState<"search" | "llm">("search");
  const [searchKeyDraft, setSearchKeyDraft] = useState(searchApiKey);
  const [llmKeyDraft, setLlmKeyDraft] = useState(llmApiKey);
  const [searchVerify, setSearchVerify] = useState<VerifyState>("idle");
  const [llmVerify, setLlmVerify] = useState<VerifyState>("idle");
  const [modelsLoading, setModelsLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Sync drafts when store changes
  useEffect(() => { setSearchKeyDraft(searchApiKey); }, [searchApiKey]);
  useEffect(() => { setLlmKeyDraft(llmApiKey); }, [llmApiKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function loadModels(provider: LlmProvider, key: string) {
    if (!provider || !key) return;
    setModelsLoading(true);
    try {
      const res = await fetch(`/api/models?provider=${provider}&key=${encodeURIComponent(key)}`);
      const data = await res.json();
      if (res.ok && data.models?.length) {
        setAvailableModels(data.models);
        setLlmModel(data.models[0].id);
      }
    } catch {
      // silent
    } finally {
      setModelsLoading(false);
    }
  }

  async function saveSearchKey() {
    setSearchApiKey(searchKeyDraft);
    if (!searchKeyDraft || !searchProvider) return;
    setSearchVerify("loading");
    // Simple verify: run a quick test search
    try {
      const res = await fetch("/api/research/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-search-provider": searchProvider,
          "x-search-key": searchKeyDraft,
        },
        body: JSON.stringify({ query: "test" }),
      });
      setSearchVerify(res.ok ? "ok" : "error");
    } catch {
      setSearchVerify("error");
    }
  }

  async function saveLlmKey() {
    if (!llmProvider) return;
    setLlmApiKey(llmKeyDraft);
    setLlmVerify("loading");
    try {
      await loadModels(llmProvider, llmKeyDraft);
      setLlmVerify("ok");
    } catch {
      setLlmVerify("error");
    }
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col border-l border-ink-line bg-ink-2 shadow-2xl"
        role="dialog"
        aria-label="Settings"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-chalk">API Configuration</h2>
            <p className="mt-0.5 text-xs text-fog">Your keys are stored locally and never sent to our servers.</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="rounded p-1.5 text-fog transition-colors hover:bg-ink-3 hover:text-chalk"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-ink-line">
          {(["search", "llm"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-proof text-chalk"
                  : "text-fog hover:text-chalk"
              }`}
            >
              {t === "search" ? <Globe size={14} /> : <Bot size={14} />}
              {t === "search" ? "Search Provider" : "AI / LLM Provider"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* ── SEARCH TAB ── */}
          {tab === "search" && (
            <>
              <div>
                <p className="eyebrow mb-3 text-fog">Choose provider</p>
                <div className="space-y-2">
                  {SEARCH_PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSearchProvider(p.id); setSearchVerify("idle"); }}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                        searchProvider === p.id
                          ? "border-proof bg-proof/10"
                          : "border-ink-line bg-ink hover:border-ink-3"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-2.5 w-2.5 rounded-full transition-colors ${
                              searchProvider === p.id ? "bg-proof" : "bg-ink-line"
                            }`}
                          />
                          <span className="text-sm font-medium text-chalk">{p.label}</span>
                        </div>
                        <span className="rounded-full bg-sage/15 px-2 py-0.5 text-[11px] font-medium text-sage">
                          {p.freeTier}
                        </span>
                      </div>
                      <a
                        href={p.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1.5 ml-6 text-[11px] text-fog underline hover:text-chalk"
                      >
                        Get API key →
                      </a>
                    </button>
                  ))}
                </div>
              </div>

              {searchProvider && (
                <div>
                  <p className="eyebrow mb-2 text-fog">API Key</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog" />
                      <input
                        type="password"
                        value={searchKeyDraft}
                        onChange={(e) => { setSearchKeyDraft(e.target.value); setSearchVerify("idle"); }}
                        placeholder={`Paste your ${SEARCH_PROVIDERS.find((p) => p.id === searchProvider)?.label} key`}
                        className="w-full rounded-lg border border-ink-line bg-ink py-2.5 pl-9 pr-3 text-sm text-chalk outline-none placeholder:text-fog/50 focus:border-proof"
                      />
                    </div>
                    <button
                      onClick={() => void saveSearchKey()}
                      disabled={!searchKeyDraft || searchVerify === "loading"}
                      className="flex items-center gap-1.5 rounded-lg bg-proof px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
                    >
                      {searchVerify === "loading" ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : searchVerify === "ok" ? (
                        <CheckCircle2 size={13} />
                      ) : searchVerify === "error" ? (
                        <AlertCircle size={13} />
                      ) : (
                        <Zap size={13} />
                      )}
                      {searchVerify === "loading" ? "Testing…" : searchVerify === "ok" ? "Saved!" : searchVerify === "error" ? "Failed" : "Save & Test"}
                    </button>
                  </div>
                  {searchVerify === "ok" && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-sage">
                      <CheckCircle2 size={12} /> Live search is active
                    </p>
                  )}
                  {searchVerify === "error" && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-proof">
                      <AlertCircle size={12} /> Key invalid or quota exceeded
                    </p>
                  )}
                </div>
              )}

              {!searchProvider && (
                <div className="rounded-lg border border-ink-line bg-ink p-4 text-center">
                  <Search size={20} className="mx-auto mb-2 text-fog" />
                  <p className="text-sm text-fog">Select a search provider above to enable live web research.</p>
                  <p className="mt-1 text-xs text-fog/60">Without a key, the app uses realistic mock data.</p>
                </div>
              )}
            </>
          )}

          {/* ── LLM TAB ── */}
          {tab === "llm" && (
            <>
              <div>
                <p className="eyebrow mb-3 text-fog">Choose AI provider</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {LLM_PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setLlmProvider(p.id);
                        setLlmVerify("idle");
                        if (llmApiKey) void loadModels(p.id, llmApiKey);
                      }}
                      className={`relative rounded-lg border px-3 py-3 text-left transition-all ${
                        llmProvider === p.id
                          ? "border-proof bg-proof/10"
                          : "border-ink-line bg-ink hover:border-ink-3"
                      }`}
                    >
                      <div
                        className="mb-1.5 h-1.5 w-8 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <p className="text-xs font-semibold text-chalk">{p.label}</p>
                      {p.badge && (
                        <p className="mt-0.5 text-[10px] text-fog">{p.badge}</p>
                      )}
                      {llmProvider === p.id && (
                        <div
                          className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {llmProvider && (
                <>
                  <div>
                    <p className="eyebrow mb-2 text-fog">API Key</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-fog" />
                        <input
                          type="password"
                          value={llmKeyDraft}
                          onChange={(e) => { setLlmKeyDraft(e.target.value); setLlmVerify("idle"); }}
                          placeholder={`${LLM_PROVIDERS.find((p) => p.id === llmProvider)?.label} API key`}
                          className="w-full rounded-lg border border-ink-line bg-ink py-2.5 pl-9 pr-3 text-sm text-chalk outline-none placeholder:text-fog/50 focus:border-proof"
                        />
                      </div>
                      <button
                        onClick={() => void saveLlmKey()}
                        disabled={!llmKeyDraft || llmVerify === "loading" || modelsLoading}
                        className="flex items-center gap-1.5 rounded-lg bg-proof px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
                      >
                        {llmVerify === "loading" || modelsLoading ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : llmVerify === "ok" ? (
                          <CheckCircle2 size={13} />
                        ) : llmVerify === "error" ? (
                          <AlertCircle size={13} />
                        ) : (
                          <Zap size={13} />
                        )}
                        {modelsLoading ? "Loading…" : llmVerify === "ok" ? "Saved!" : llmVerify === "error" ? "Failed" : "Save & Load"}
                      </button>
                    </div>
                    {llmVerify === "error" && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-proof">
                        <AlertCircle size={12} /> Could not verify key or load models
                      </p>
                    )}
                  </div>

                  {availableModels.length > 0 && (
                    <div>
                      <p className="eyebrow mb-2 text-fog">Model</p>
                      <div className="relative">
                        <select
                          value={llmModel}
                          onChange={(e) => setLlmModel(e.target.value)}
                          className="w-full appearance-none rounded-lg border border-ink-line bg-ink px-3 py-2.5 pr-8 text-sm text-chalk outline-none focus:border-proof"
                        >
                          {availableModels.map((m) => (
                            <option key={m.id} value={m.id} className="bg-ink-2">
                              {m.name}
                              {m.contextWindow ? ` (${(m.contextWindow / 1000).toFixed(0)}K ctx)` : ""}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={14}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fog"
                        />
                      </div>
                      {availableModels.find((m) => m.id === llmModel)?.contextWindow && (
                        <p className="mt-1.5 text-[11px] text-fog">
                          Context window:{" "}
                          <span className="text-chalk">
                            {((availableModels.find((m) => m.id === llmModel)?.contextWindow ?? 0) / 1000).toFixed(0)}K tokens
                          </span>
                        </p>
                      )}
                    </div>
                  )}

                  {modelsLoading && (
                    <div className="flex items-center gap-2 text-xs text-fog">
                      <Loader2 size={12} className="animate-spin" />
                      Loading models from {LLM_PROVIDERS.find((p) => p.id === llmProvider)?.label}…
                    </div>
                  )}

                  {llmVerify === "ok" && availableModels.length === 0 && !modelsLoading && (
                    <p className="text-xs text-proof">No models found. Check your key permissions.</p>
                  )}
                </>
              )}

              {!llmProvider && (
                <div className="rounded-lg border border-ink-line bg-ink p-4 text-center">
                  <Bot size={20} className="mx-auto mb-2 text-fog" />
                  <p className="text-sm text-fog">Select an AI provider above to enable live generation.</p>
                  <p className="mt-1 text-xs text-fog/60">Without a key, the app uses deterministic offline mocks.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer status */}
        <div className="border-t border-ink-line px-5 py-3">
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-fog">
              <span className={`h-2 w-2 rounded-full ${searchApiKey && searchProvider ? "bg-sage" : "bg-ink-line"}`} />
              Search: {searchApiKey && searchProvider
                ? `${SEARCH_PROVIDERS.find((p) => p.id === searchProvider)?.label} (live)`
                : "Mock data"}
            </span>
            <span className="flex items-center gap-1.5 text-fog">
              <span className={`h-2 w-2 rounded-full ${llmApiKey && llmProvider ? "bg-proof" : "bg-ink-line"}`} />
              AI: {llmApiKey && llmProvider && llmModel
                ? `${LLM_PROVIDERS.find((p) => p.id === llmProvider)?.label}`
                : "Offline mock"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
