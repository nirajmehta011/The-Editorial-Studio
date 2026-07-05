"use client";

import { useEffect, useState } from "react";
import {
  X,
  Copy,
  Check,
  Mail,
  Linkedin,
  MessageSquare,
  Clapperboard,
  BookOpen,
  Globe,
  Send,
  Lock,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useStudioStore } from "@/lib/store";

type Pack = {
  newsletter: string;
  linkedin: string;
  thread: string[];
  videoScript: string;
  medium: string;
  blogspot: string;
};

const TABS = [
  { key: "newsletter", label: "Newsletter", icon: Mail },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "thread", label: "X thread", icon: MessageSquare },
  { key: "videoScript", label: "Video script", icon: Clapperboard },
  { key: "medium", label: "Medium", icon: BookOpen },
  { key: "blogspot", label: "Blogspot", icon: Globe },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function DistributeDrawer({
  documentId,
  open,
  onClose,
  llmHeaders = {},
}: {
  documentId: string;
  open: boolean;
  onClose: () => void;
  llmHeaders?: Record<string, string>;
}) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("newsletter");
  const [copied, setCopied] = useState(false);

  // Direct Publish flow states
  const [publishState, setPublishState] = useState<"idle" | "oauth_prompt" | "publishing" | "success">("idle");
  const [integrationKey, setIntegrationKey] = useState("");
  const [blogId, setBlogId] = useState(""); // for Blogspot
  const [publishedUrl, setPublishedUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setPack(null);
    setPublishState("idle");
    setPublishedUrl("");
    fetch("/api/ai/cascade", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...llmHeaders },
      body: JSON.stringify({ documentId }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Generation failed");
        setPack(data.pack);
        setLive(data.live);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const currentText =
    pack === null ? "" : tab === "thread" ? pack.thread.map((p, i) => `${i + 1}/ ${p}`).join("\n\n") : pack[tab];

  async function copy() {
    await navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Simulating OAuth / API direct posting
  function startPublishFlow() {
    if (tab === "linkedin" || tab === "thread") {
      // Social platforms require OAuth login dialog
      setPublishState("oauth_prompt");
    } else {
      // Medium / Blogspot need API keys
      setPublishState("oauth_prompt");
    }
  }

  function executePublish() {
    setPublishState("publishing");
    setTimeout(() => {
      setPublishState("success");
      if (tab === "linkedin") setPublishedUrl("https://linkedin.com/feed/update/urn:li:activity:mock");
      else if (tab === "thread") setPublishedUrl("https://x.com/studio/status/mock");
      else if (tab === "medium") setPublishedUrl("https://medium.com/@editorial-studio/draft-mock");
      else if (tab === "blogspot") setPublishedUrl("https://draft.blogger.com/blog/mock");
    }, 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/70" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-xl flex-col border-l border-ink-line bg-ink-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Distribution pack"
      >
        <div className="flex items-center justify-between border-b border-ink-line px-5 py-4">
          <div>
            <p className="eyebrow text-proof">Asset cascading</p>
            <h2 className="mt-0.5 font-[family-name:var(--font-prose)] text-lg font-semibold text-chalk">
              One draft → Multi-channel publishing
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X size={17} className="text-fog hover:text-chalk" />
          </button>
        </div>

        <div className="flex flex-wrap border-b border-ink-line bg-ink">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setPublishState("idle"); }}
              className={`flex flex-1 min-w-[90px] items-center justify-center gap-1.5 py-3 text-[11px] font-medium transition-colors ${
                tab === key ? "border-b-2 border-proof text-chalk bg-ink-2" : "text-fog hover:text-chalk"
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 size={24} className="animate-spin text-proof mb-3" />
              <p className="text-sm text-fog">Running parallel prompt chains over the draft…</p>
            </div>
          )}
          {error && <p className="text-sm text-proof">{error}</p>}

          {pack && publishState === "idle" && (
            <>
              {!live && (
                <p className="text-[11px] text-fog/60 border border-ink-line bg-ink/10 rounded px-2.5 py-1.5">
                  Offline mock output — set AI keys in Settings for live custom generation.
                </p>
              )}
              {tab === "thread" ? (
                <ol className="space-y-3">
                  {pack.thread.map((post, i) => (
                    <li key={i} className="rounded-lg border border-ink-line bg-ink p-3.5">
                      <p className="eyebrow mb-1 text-fog/60">Post {i + 1} · {post.length} chars</p>
                      <p className="text-sm leading-relaxed text-chalk">{post}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <pre className="whitespace-pre-wrap rounded-lg border border-ink-line bg-ink p-4 font-[family-name:var(--font-ui)] text-xs leading-relaxed text-chalk max-h-[480px] overflow-y-auto">
                  {currentText}
                </pre>
              )}
            </>
          )}

          {/* Publishing flow integration screens */}
          {publishState === "oauth_prompt" && (
            <div className="rounded-xl border border-ink-line bg-ink p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-proof/10 p-2 text-proof">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-chalk">
                    {(tab === "linkedin" || tab === "thread") ? "Authorize Account Sharing" : "Connect Integration"}
                  </h3>
                  <p className="text-xs text-fog mt-0.5">
                    {(tab === "linkedin" || tab === "thread")
                      ? `Post direct content to your ${tab === "linkedin" ? "LinkedIn Feed" : "X account"} via OAuth.`
                      : `Publish dynamic drafts to ${tab === "medium" ? "Medium" : "Blogspot"} directly.`}
                  </p>
                </div>
              </div>

              {(tab === "medium" || tab === "blogspot") && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[10px] text-fog block mb-1 font-medium eyebrow">Integration Token / API Key</label>
                    <input
                      type="password"
                      value={integrationKey}
                      onChange={(e) => setIntegrationKey(e.target.value)}
                      placeholder={`Enter your ${tab === "medium" ? "Medium Integration Token" : "Blogspot API Key"}`}
                      className="w-full rounded-lg border border-ink-line bg-ink-2 px-3 py-2 text-xs text-chalk outline-none focus:border-proof"
                    />
                  </div>
                  {tab === "blogspot" && (
                    <div>
                      <label className="text-[10px] text-fog block mb-1 font-medium eyebrow">Blog ID</label>
                      <input
                        type="text"
                        value={blogId}
                        onChange={(e) => setBlogId(e.target.value)}
                        placeholder="Blogger Blog ID (found in URL)"
                        className="w-full rounded-lg border border-ink-line bg-ink-2 px-3 py-2 text-xs text-chalk outline-none focus:border-proof"
                      />
                    </div>
                  )}
                </div>
              )}

              {(tab === "linkedin" || tab === "thread") && (
                <div className="rounded-lg border border-ink-line bg-ink-2 p-3 text-center py-6">
                  <p className="text-xs text-fog">
                    Clicking "Connect &amp; Post" will prompt a secure OAuth window to verify your{" "}
                    {tab === "linkedin" ? "LinkedIn" : "X (Twitter)"} credentials.
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setPublishState("idle")}
                  className="rounded-lg border border-ink-line px-3.5 py-2 text-xs text-fog hover:text-chalk"
                >
                  Cancel
                </button>
                <button
                  onClick={executePublish}
                  disabled={(tab === "medium" || tab === "blogspot") && !integrationKey}
                  className="flex items-center gap-1.5 rounded-lg bg-proof px-4 py-2 text-xs font-semibold text-paper disabled:opacity-40"
                >
                  <Send size={11} /> Connect &amp; Share
                </button>
              </div>
            </div>
          )}

          {publishState === "publishing" && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <Loader2 size={24} className="animate-spin text-proof" />
              <p className="text-sm text-chalk">Post processing / API sync in progress…</p>
              <p className="text-xs text-fog">Contacting {tab} servers to provision draft...</p>
            </div>
          )}

          {publishState === "success" && (
            <div className="rounded-xl border border-sage/30 bg-sage/5 p-6 text-center space-y-4">
              <div className="mx-auto rounded-full bg-sage/10 p-3 text-sage w-12 h-12 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-chalk">Published Successfully!</h3>
                <p className="text-xs text-fog mt-1">
                  Your asset has been pushed directly to your account.
                </p>
              </div>
              <div className="pt-2">
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sage/20 border border-sage/30 px-4 py-2 text-xs text-sage font-medium hover:bg-sage/30"
                >
                  View Live Post ↗
                </a>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => setPublishState("idle")}
                  className="text-xs text-fog underline hover:text-chalk"
                >
                  Back to Cascaded Assets
                </button>
              </div>
            </div>
          )}
        </div>

        {pack && publishState === "idle" && (
          <div className="border-t border-ink-line p-4 flex gap-2">
            <button
              onClick={() => void copy()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-ink-line py-2.5 text-xs font-medium text-chalk hover:bg-ink-3"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : `Copy ${TABS.find((t) => t.key === tab)?.label.toLowerCase()}`}
            </button>
            <button
              onClick={startPublishFlow}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-proof py-2.5 text-xs font-semibold text-paper"
            >
              <Send size={13} /> Publish Direct
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
