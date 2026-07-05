"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { X, ChevronUp, ChevronDown, Replace, ToggleLeft, ToggleRight } from "lucide-react";

export function FindReplace({ editor, open, onClose }: { editor: Editor; open: boolean; onClose: () => void }) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const findRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => findRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === "h") { e.preventDefault(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const countMatches = useCallback(() => {
    if (!find.trim() || !editor) { setMatchCount(0); setCurrentMatch(0); return; }
    const { doc } = editor.state;
    let count = 0;
    const searchStr = caseSensitive ? find : find.toLowerCase();
    doc.descendants((node) => {
      if (node.isText && node.text) {
        const text = caseSensitive ? node.text : node.text.toLowerCase();
        let idx = 0;
        while ((idx = text.indexOf(searchStr, idx)) !== -1) {
          count++;
          idx += searchStr.length;
        }
      }
    });
    setMatchCount(count);
    setCurrentMatch(count > 0 ? 1 : 0);
  }, [find, editor, caseSensitive]);

  useEffect(() => { countMatches(); }, [countMatches]);

  const highlightFind = useCallback((direction: "next" | "prev" = "next") => {
    if (!find.trim() || !editor) return;
    const { doc } = editor.state;
    const matches: { from: number; to: number }[] = [];
    const searchStr = caseSensitive ? find : find.toLowerCase();
    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const text = caseSensitive ? node.text : node.text.toLowerCase();
        let idx = 0;
        while ((idx = text.indexOf(searchStr, idx)) !== -1) {
          matches.push({ from: pos + idx, to: pos + idx + find.length });
          idx += find.length;
        }
      }
    });
    if (matches.length === 0) return;

    let nextIndex = currentMatch - 1;
    if (direction === "next") nextIndex = (nextIndex + 1) % matches.length;
    else nextIndex = (nextIndex - 1 + matches.length) % matches.length;

    setCurrentMatch(nextIndex + 1);
    const match = matches[nextIndex];
    editor.chain().focus().setTextSelection({ from: match.from, to: match.to }).scrollIntoView().run();
  }, [editor, find, currentMatch, caseSensitive]);

  const replaceOne = useCallback(() => {
    if (!find.trim() || !editor) return;
    const { from, to, empty } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    const matches = caseSensitive ? selectedText === find : selectedText.toLowerCase() === find.toLowerCase();
    if (!empty && matches) {
      editor.chain().focus().insertContent(replace).run();
      countMatches();
      highlightFind("next");
    } else {
      highlightFind("next");
    }
  }, [editor, find, replace, caseSensitive, countMatches, highlightFind]);

  const replaceAll = useCallback(() => {
    if (!find.trim() || !editor) return;
    let count = 0;
    const { doc } = editor.state;
    const toReplace: { from: number; to: number }[] = [];
    const searchStr = caseSensitive ? find : find.toLowerCase();
    doc.descendants((node, pos) => {
      if (node.isText && node.text) {
        const text = caseSensitive ? node.text : node.text.toLowerCase();
        let idx = 0;
        while ((idx = text.indexOf(searchStr, idx)) !== -1) {
          toReplace.push({ from: pos + idx, to: pos + idx + find.length });
          idx += find.length;
          count++;
        }
      }
    });
    // Replace from end to start to preserve positions
    const chain = editor.chain().focus();
    for (let i = toReplace.length - 1; i >= 0; i--) {
      const { from, to } = toReplace[i];
      chain.insertContentAt({ from, to }, replace);
    }
    chain.run();
    setMatchCount(0);
    setCurrentMatch(0);
  }, [editor, find, replace, caseSensitive]);

  if (!open) return null;

  return (
    <div
      className="absolute right-4 top-2 z-40 w-80 rounded-xl border border-ink-line bg-ink-2 shadow-2xl"
      role="search"
      aria-label="Find and replace"
    >
      <div className="flex items-center justify-between border-b border-ink-line px-3 py-2">
        <span className="text-xs font-medium text-chalk">Find &amp; Replace</span>
        <button onClick={onClose} aria-label="Close find & replace" className="text-fog hover:text-chalk">
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2 p-3">
        {/* Find */}
        <div className="flex gap-1">
          <div className="relative flex-1">
            <input
              ref={findRef}
              value={find}
              onChange={(e) => setFind(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.shiftKey ? highlightFind("prev") : highlightFind("next"); }
              }}
              placeholder="Find…"
              aria-label="Find text"
              className="w-full rounded-lg border border-ink-line bg-ink px-3 py-2 pr-16 text-xs text-chalk outline-none placeholder:text-fog/50 focus:border-proof"
            />
            {find && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-fog">
                {currentMatch}/{matchCount}
              </span>
            )}
          </div>
          <button
            onClick={() => highlightFind("prev")}
            disabled={matchCount === 0}
            aria-label="Previous match"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-line bg-ink text-fog hover:text-chalk disabled:opacity-30"
          >
            <ChevronUp size={13} />
          </button>
          <button
            onClick={() => highlightFind("next")}
            disabled={matchCount === 0}
            aria-label="Next match"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-line bg-ink text-fog hover:text-chalk disabled:opacity-30"
          >
            <ChevronDown size={13} />
          </button>
        </div>

        {/* Replace */}
        <div className="flex gap-1">
          <input
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
            placeholder="Replace with…"
            aria-label="Replace text"
            className="min-w-0 flex-1 rounded-lg border border-ink-line bg-ink px-3 py-2 text-xs text-chalk outline-none placeholder:text-fog/50 focus:border-proof"
          />
          <button
            onClick={replaceOne}
            disabled={matchCount === 0}
            aria-label="Replace"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-line bg-ink text-fog hover:text-chalk disabled:opacity-30"
          >
            <Replace size={13} />
          </button>
        </div>

        {/* Actions & options */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCaseSensitive((v) => !v)}
              title="Case sensitive"
              className={`text-[11px] transition-colors ${caseSensitive ? "text-proof" : "text-fog hover:text-chalk"}`}
            >
              Aa
            </button>
          </div>
          <button
            onClick={replaceAll}
            disabled={matchCount === 0}
            className="rounded-lg bg-proof/90 px-3 py-1.5 text-[11px] font-medium text-paper disabled:opacity-40 hover:bg-proof"
          >
            Replace all ({matchCount})
          </button>
        </div>
      </div>
    </div>
  );
}
