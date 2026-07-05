"use client";

import { useState } from "react";
import { GitBranch, Plus, Trash2, Columns2, X } from "lucide-react";
import { groupBranches } from "@/lib/branching";
import { nodeText, TiptapNode } from "@/lib/tiptap-text";

export type BranchRecordApi = {
  id: string;
  parentId: string | null;
  label: string;
  anchorIndex: number;
  content: TiptapNode;
  isActive: boolean;
};

type Block = { index: number; type: string; text: string };

export function BranchBar({
  branches,
  blocks,
  onSwitch,
  onAddVariant,
  onDeleteGroup,
}: {
  branches: BranchRecordApi[];
  blocks: Block[];
  onSwitch: (b: BranchRecordApi) => void;
  onAddVariant: (rootId: string) => void;
  onDeleteGroup: (rootId: string) => void;
}) {
  const [compareRootId, setCompareRootId] = useState<string | null>(null);
  const groups = groupBranches(branches);
  const compareGroup = groups.find((g) => g.root.id === compareRootId);

  return (
    <div className="rounded-lg border border-ink-line bg-ink-2 p-4">
      <p className="eyebrow mb-3 flex items-center gap-1.5 text-proof">
        <GitBranch size={12} /> Text branches
      </p>

      <div className="space-y-3">
        {groups.map((group) => {
          const blockPreview = blocks.find((b) => b.index === group.root.anchorIndex)?.text ?? "";
          const members = [group.root, ...group.variants] as BranchRecordApi[];
          return (
            <div key={group.root.id} className="rounded border border-ink-line p-3">
              <p className="mb-2 truncate text-xs text-fog">
                Block {group.root.anchorIndex + 1}: “{blockPreview.slice(0, 70)}{blockPreview.length > 70 ? "…" : ""}”
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {members.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => !b.isActive && onSwitch(b)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                      b.isActive
                        ? "border-proof bg-proof text-paper"
                        : "border-ink-line text-fog hover:border-fog hover:text-chalk"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
                <button
                  onClick={() => onAddVariant(group.root.id)}
                  className="flex items-center gap-1 rounded-full border border-dashed border-ink-line px-2.5 py-1 text-xs text-fog hover:border-mark hover:text-mark"
                >
                  <Plus size={10} /> Variant
                </button>
                <span className="mx-1 h-4 w-px bg-ink-line" />
                <button
                  onClick={() => setCompareRootId(group.root.id)}
                  className="flex items-center gap-1 text-xs text-fog hover:text-chalk"
                >
                  <Columns2 size={11} /> Compare
                </button>
                <button
                  onClick={() => onDeleteGroup(group.root.id)}
                  aria-label="Delete branch group"
                  className="text-fog/50 hover:text-proof"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Side-by-side compare */}
      {compareGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-6" role="dialog" aria-modal>
          <div className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-ink-line bg-ink-2 p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="eyebrow text-proof">Compare branches — block {compareGroup.root.anchorIndex + 1}</p>
              <button onClick={() => setCompareRootId(null)} aria-label="Close compare">
                <X size={16} className="text-fog hover:text-chalk" />
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {([compareGroup.root, ...compareGroup.variants] as BranchRecordApi[]).map((b) => (
                <div
                  key={b.id}
                  className={`rounded border p-4 ${b.isActive ? "border-proof" : "border-ink-line"}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className={`eyebrow ${b.isActive ? "text-proof" : "text-fog"}`}>
                      {b.label} {b.isActive && "· in draft"}
                    </span>
                    {!b.isActive && (
                      <button
                        onClick={() => {
                          onSwitch(b);
                          setCompareRootId(null);
                        }}
                        className="rounded bg-proof px-2 py-1 text-[11px] font-medium text-paper"
                      >
                        Use this version
                      </button>
                    )}
                  </div>
                  <p className="font-[family-name:var(--font-prose)] text-sm leading-relaxed text-chalk">
                    {nodeText(b.content) || <em className="text-fog">Empty block</em>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
