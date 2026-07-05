"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useStudioStore } from "@/lib/store";

type DocSummary = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  meta: { trend?: { niche?: string } };
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "text-fog border-ink-line",
  IN_REVIEW: "text-mark border-mark/40",
  READY: "text-sage border-sage/40",
  PUBLISHED: "text-proof border-proof/40",
};

export default function DeskPage() {
  const router = useRouter();
  const { activeWorkspaceId, activeBrainId } = useStudioStore();
  const [documents, setDocuments] = useState<DocSummary[] | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    if (!activeWorkspaceId) return;
    fetch(`/api/documents?workspaceId=${activeWorkspaceId}`)
      .then((r) => r.json())
      .then((data) => setDocuments(data.documents ?? []))
      .catch((err) => console.error("Failed to load documents:", err));
  }, [activeWorkspaceId]);

  useEffect(load, [load]);

  async function createDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !activeWorkspaceId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspaceId, brandBrainId: activeBrainId, title: newTitle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");
      router.push(`/write/${data.document.id}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  }

  async function deleteDoc(id: string) {
    if (!confirm("Delete this draft? This can't be undone.")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-10">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="eyebrow text-proof mb-1.5">The desk</p>
          <h1 className="font-[family-name:var(--font-prose)] text-3xl font-semibold tracking-tight">
            Drafts in progress
          </h1>
        </div>
        <form onSubmit={createDoc} className="flex items-center gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="New draft title…"
            className="w-64 rounded border border-ink-line bg-ink-2 px-3 py-2 text-sm outline-none placeholder:text-fog/60 focus:border-proof"
          />
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="flex items-center gap-1.5 rounded bg-proof px-3.5 py-2 text-sm font-medium text-paper transition-opacity disabled:opacity-40"
          >
            <Plus size={15} /> {creating ? "Creating…" : "New draft"}
          </button>
        </form>
      </div>

      {documents === null ? (
        <p className="text-fog text-sm">Loading drafts…</p>
      ) : documents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-line px-8 py-16 text-center">
          <FileText className="mx-auto mb-3 text-fog" size={28} />
          <p className="text-chalk">Nothing on the desk yet.</p>
          <p className="mt-1 text-sm text-fog">
            Start a draft above, or mine a topic from Discovery &amp; Trends.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-ink-line rounded-lg border border-ink-line bg-ink-2">
          {documents.map((doc) => (
            <li key={doc.id} className="group flex items-center gap-4 px-5 py-4">
              <button
                onClick={() => router.push(`/write/${doc.id}`)}
                className="flex-1 text-left"
              >
                <span className="font-[family-name:var(--font-prose)] text-lg text-chalk group-hover:text-paper">
                  {doc.title}
                </span>
                <span className="ml-3 font-[family-name:var(--font-data)] text-xs text-fog">
                  {new Date(doc.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                {doc.meta?.trend?.niche && (
                  <span className="ml-3 text-xs text-fog">from {doc.meta.trend.niche} trends</span>
                )}
              </button>
              <span className={`eyebrow rounded border px-2 py-1 ${STATUS_STYLES[doc.status] ?? STATUS_STYLES.DRAFT}`}>
                {doc.status.replace("_", " ")}
              </span>
              <button
                onClick={() => deleteDoc(doc.id)}
                aria-label={`Delete ${doc.title}`}
                className="text-fog/50 opacity-0 transition-opacity hover:text-proof group-hover:opacity-100"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
