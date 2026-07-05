"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useEditor, EditorContent, BubbleMenu, ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link_ from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import {
  ArrowLeft,
  GitBranch,
  Search,
  Gauge,
  Send,
  Wand2,
  Clock,
  FileText,
  AlignJustify,
} from "lucide-react";

import { IssueHighlighter, setIssueMeta, issueId, issueRange, blockRange } from "./IssueHighlighter";
import { ResearchPanel } from "./ResearchPanel";
import { GeoPanel } from "./GeoPanel";
import { DistributeDrawer } from "./DistributeDrawer";
import { BranchBar, BranchRecordApi } from "./BranchBar";
import { FormatToolbar } from "./FormatToolbar";
import { FindReplace } from "./FindReplace";

import { TiptapDoc, docBlocks, nodeText } from "@/lib/tiptap-text";
import { scoreGeo } from "@/lib/geo";
import { scanBlocks, ReadabilityIssue } from "@/lib/readability";
import { scanCadence } from "@/lib/cadence";
import { useStudioStore } from "@/lib/store";

function ResizableImageNodeView(props: any) {
  const { node, updateAttributes, selected } = props;
  const { src, alt, width, alignment } = node.attrs;
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [resizing, setResizing] = useState(false);

  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setResizing(true);

    const startX = e.clientX;
    const startWidth = imageRef.current ? imageRef.current.offsetWidth : 300;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const currentX = moveEvent.clientX;
      const diffX = currentX - startX;
      // Calculate new width relative to start width
      const newWidth = Math.max(100, startWidth + diffX);
      updateAttributes({ width: `${newWidth}px` });
    };

    const onPointerUp = () => {
      setResizing(false);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  }, [updateAttributes]);

  return (
    <NodeViewWrapper
      style={{
        display: "flex",
        justifyContent: alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center",
        margin: "1.5em 0",
        width: "100%",
      }}
    >
      <div
        ref={containerRef}
        className={`relative inline-block group ${selected ? "ring-2 ring-proof ring-offset-2 rounded-lg" : ""}`}
        style={{ width: width || "100%", maxWidth: "100%", position: "relative" }}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className="w-full h-auto rounded-lg select-none pointer-events-none"
          style={{ display: "block", width: "100%" }}
        />
        
        {/* Resize handle in bottom-right corner */}
        <div
          onPointerDown={startResize}
          className={`absolute bottom-2 right-2 w-4 h-4 rounded-full bg-proof hover:scale-125 hover:bg-proof-light cursor-se-resize flex items-center justify-center shadow-lg transition-all z-10 border border-white ${
            selected || resizing ? "opacity-100" : "opacity-0 group-hover:opacity-75"
          }`}
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            backgroundColor: "var(--color-proof)",
            cursor: "se-resize",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            zIndex: 10,
            border: "1px solid white",
            transition: "opacity 0.2s, transform 0.2s",
          }}
        >
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 0L0 6M6 3L3 6" stroke="white" strokeWidth="1" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

const CustomImage = Image.extend({
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: "100%",
        parseHTML: (element) => element.style.width || "100%",
        renderHTML: (attributes) => {
          return {
            style: `width: ${attributes.width}; max-width: 100%; height: auto; display: block;`,
          };
        },
      },
      alignment: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || "center",
        renderHTML: (attributes) => {
          return {
            "data-align": attributes.alignment,
            class: `image-align-${attributes.alignment}`,
          };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },
});

type DocumentApi = {
  id: string;
  title: string;
  status: string;
  content: TiptapDoc;
  brandBrainId: string | null;
  meta: {
    angles?: { name: string; headline: string; outline: string[] }[];
    anglesLive?: boolean;
    trend?: { niche: string; growthPct: number; competition: string };
  };
  branches: BranchRecordApi[];
};

const STATUSES = ["DRAFT", "IN_REVIEW", "READY", "PUBLISHED"] as const;

function readingTime(wordCount: number): string {
  const mins = Math.max(1, Math.round(wordCount / 200));
  return `${mins} min read`;
}

export function WriteWorkspace({ documentId }: { documentId: string }) {
  const { llmProvider, llmApiKey, llmModel, activeBrainId } = useStudioStore();

  const [doc, setDoc] = useState<DocumentApi | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string>("DRAFT");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [docVersion, setDocVersion] = useState(0);
  const [rightTab, setRightTab] = useState<"research" | "optimize">("optimize");
  const [panelOpen, setPanelOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [branches, setBranches] = useState<BranchRecordApi[]>([]);
  const [activeIssue, setActiveIssue] = useState<{ issue: ReadabilityIssue; x: number; y: number } | null>(null);
  const [rephrasing, setRephrasing] = useState(false);
  const [showAngles, setShowAngles] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [generatingAngles, setGeneratingAngles] = useState(false);
  const [customFocus, setCustomFocus] = useState("");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Build LLM headers for requests
  const llmHeaders = useMemo((): Record<string, string> => {
    if (!llmProvider || !llmApiKey) return {};
    return {
      "x-llm-provider": llmProvider,
      "x-llm-key": llmApiKey,
      ...(llmModel ? { "x-llm-model": llmModel } : {}),
    };
  }, [llmProvider, llmApiKey, llmModel]);

  const handleGenerateAngles = useCallback(async (focusText?: string) => {
    if (!doc) return;
    setGeneratingAngles(true);
    try {
      const res = await fetch("/api/ai/angles", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...llmHeaders },
        body: JSON.stringify({
          documentId: doc.id,
          topic: doc.title,
          brandBrainId: activeBrainId,
          customFocus: focusText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate angles");
      
      setDoc((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          meta: {
            ...prev.meta,
            angles: data.angles,
            anglesLive: data.live,
            anglesStatus: "ready",
          },
        };
      });
      setShowAngles(true);
      setCustomFocus("");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to generate angles");
    } finally {
      setGeneratingAngles(false);
    }
  }, [doc, activeBrainId, llmHeaders]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link_.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Start writing, or clip research from the panel →" }),
      IssueHighlighter,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      CharacterCount,
      Typography,
      Color,
      TextStyle,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CustomImage.configure({ inline: false, allowBase64: true }),
    ],
    editorProps: {
      attributes: { class: "tiptap" },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result;
              if (typeof src === "string") {
                const node = view.state.schema.nodes.image.create({ src, width: "100%" });
                const transaction = view.state.tr.replaceSelectionWith(node);
                view.dispatch(transaction);
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const src = e.target?.result;
                  if (typeof src === "string") {
                    const node = view.state.schema.nodes.image.create({ src, width: "100%" });
                    const transaction = view.state.tr.replaceSelectionWith(node);
                    view.dispatch(transaction);
                  }
                };
                reader.readAsDataURL(file);
                return true;
              }
            }
          }
        }
        return false;
      },
    },
    onUpdate: () => {
      setDocVersion((v) => v + 1);
      setSaveState("dirty");
      setActiveIssue(null);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void save(), 1400);
    },
  });

  // ------------------------------------------------------------------ load
  useEffect(() => {
    fetch(`/api/documents/${documentId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to load");
        return r.json();
      })
      .then((data) => {
        const d = data.document as DocumentApi;
        setDoc(d);
        setTitle(d.title);
        setStatus(d.status);
        setBranches(d.branches ?? []);
      })
      .catch((err) => setLoadError(err.message));
  }, [documentId]);

  useEffect(() => {
    if (editor && doc && editor.isEmpty && doc.content?.content?.length) {
      editor.commands.setContent(doc.content);
      setDocVersion((v) => v + 1);
    }
  }, [editor, doc]);

  // ------------------------------------------------------------------ save
  const save = useCallback(async () => {
    if (!editor) return;
    setSaveState("saving");
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editor.getJSON(), title, status }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaveState("saved");
    } catch (err) {
      console.error("Autosave failed:", err);
      setSaveState("dirty");
    }
  }, [editor, documentId, title, status]);

  useEffect(() => {
    if (!doc) return;
    setSaveState("dirty");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, status]);

  // ------------------------------------------------------------- analysis
  const analysis = useMemo(() => {
    if (!editor) return null;
    const json = editor.getJSON() as TiptapDoc;
    const blocks = docBlocks(json);
    return {
      geo: scoreGeo(json),
      issues: scanBlocks(blocks),
      cadence: scanCadence(blocks),
      blocks,
    };
    // docVersion is the invalidation signal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, docVersion]);

  // ------------------------------------------------------------- word count stats
  const stats = useMemo(() => {
    if (!editor) return null;
    const storage = (editor as any).storage?.characterCount;
    if (!storage) return null;
    const words = storage.words?.() ?? 0;
    const chars = storage.characters?.() ?? 0;
    return { words, chars, readTime: readingTime(words) };
  }, [editor, docVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const branchedAnchors = useMemo(
    () => branches.filter((b) => b.parentId === null).map((b) => b.anchorIndex),
    [branches]
  );

  useEffect(() => {
    if (!editor || !analysis) return;
    setIssueMeta(editor, { issues: analysis.issues, branchedAnchors });
  }, [editor, analysis, branchedAnchors]);

  // Click on a highlighted issue → inline popover
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest?.(".issue-mark") as HTMLElement | null;
      if (!target || !analysis) return;
      const id = target.getAttribute("data-issue-id");
      const issue = analysis.issues.find((i) => issueId(i) === id);
      if (!issue || !canvasRef.current) return;
      const rect = target.getBoundingClientRect();
      const canvasRect = canvasRef.current.getBoundingClientRect();
      setActiveIssue({
        issue,
        x: rect.left - canvasRect.left,
        y: rect.bottom - canvasRect.top + 6,
      });
    };
    dom.addEventListener("click", onClick);
    return () => dom.removeEventListener("click", onClick);
  }, [editor, analysis]);

  // Keyboard shortcut: Ctrl+H → Find & Replace
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        setFindReplaceOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ------------------------------------------------------------- fixes
  const applyFix = useCallback(
    (issue: ReadabilityIssue) => {
      if (!editor || issue.replacement === null) return;
      const { from, to } = issueRange(editor, issue);
      editor
        .chain()
        .focus()
        .command(({ tr }) => {
          if (issue.replacement) tr.replaceWith(from, to, editor.schema.text(issue.replacement));
          else tr.delete(from, to);
          return true;
        })
        .run();
      setActiveIssue(null);
    },
    [editor]
  );

  const rephraseBlockAt = useCallback(
    async (blockIndex: number) => {
      if (!editor || !doc) return;
      const node = editor.state.doc.child(blockIndex);
      const text = node.textContent;
      if (!text.trim()) return;
      setRephrasing(true);
      try {
        const res = await fetch("/api/ai/rephrase", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...llmHeaders },
          body: JSON.stringify({ text, brandBrainId: doc.brandBrainId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const { from, to } = blockRange(editor, blockIndex);
        editor
          .chain()
          .focus()
          .insertContentAt({ from, to }, { type: node.type.name, attrs: node.attrs, content: [{ type: "text", text: data.text }] })
          .run();
      } catch (err) {
        console.error("Rephrase failed:", err);
      } finally {
        setRephrasing(false);
        setActiveIssue(null);
      }
    },
    [editor, doc, llmHeaders]
  );

  const jumpToIssue = useCallback(
    (issue: ReadabilityIssue) => {
      if (!editor) return;
      const { from, to } = issueRange(editor, issue);
      editor.chain().focus().setTextSelection({ from, to }).scrollIntoView().run();
    },
    [editor]
  );

  // ------------------------------------------------------------- branching
  const refreshBranches = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/branches`);
    const data = await res.json();
    setBranches(data.branches ?? []);
  }, [documentId]);

  const createBranch = useCallback(async () => {
    if (!editor) return;
    const anchorIndex = editor.state.selection.$from.index(0);
    const content = editor.state.doc.child(anchorIndex).toJSON();
    const res = await fetch(`/api/documents/${documentId}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anchorIndex, content }),
    });
    if (res.status === 409) {
      const root = branches.find((b) => b.parentId === null && b.anchorIndex === anchorIndex);
      if (root) await addVariant(root.id);
      return;
    }
    await refreshBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, documentId, branches, refreshBranches]);

  const addVariant = useCallback(
    async (rootId: string) => {
      if (!editor) return;
      const root = branches.find((b) => b.id === rootId);
      if (!root) return;
      const content = editor.state.doc.child(root.anchorIndex).toJSON();
      await fetch(`/api/documents/${documentId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: rootId, content }),
      });
      await refreshBranches();
    },
    [editor, branches, documentId, refreshBranches]
  );

  const switchVariant = useCallback(
    async (target: BranchRecordApi) => {
      if (!editor) return;
      const rootId = target.parentId ?? target.id;
      const group = branches.filter((b) => b.id === rootId || b.parentId === rootId);
      const current = group.find((b) => b.isActive);
      const anchorIndex = target.anchorIndex;

      if (anchorIndex >= editor.state.doc.childCount) return;

      if (current && current.id !== target.id) {
        const liveContent = editor.state.doc.child(anchorIndex).toJSON();
        await fetch(`/api/branches/${current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: liveContent }),
        });
      }

      await fetch(`/api/branches/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });

      const { from, to } = blockRange(editor, anchorIndex);
      editor.chain().focus().insertContentAt({ from, to }, target.content).run();
      await refreshBranches();
      void save();
    },
    [editor, branches, refreshBranches, save]
  );

  const deleteGroup = useCallback(
    async (rootId: string) => {
      await fetch(`/api/branches/${rootId}`, { method: "DELETE" });
      await refreshBranches();
    },
    [refreshBranches]
  );

  // ------------------------------------------------------------- render
  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <p className="text-proof">{loadError}</p>
        <Link href="/desk" className="mt-3 inline-block text-sm text-fog underline">Back to the desk</Link>
      </div>
    );
  }

  const angles = doc?.meta?.angles;

  return (
    <div
      className={`mx-auto flex max-w-[1600px] flex-col px-5 ${focusMode ? "focus-mode" : ""}`}
      style={{ height: "calc(100vh - 3.5rem)" }}
    >
      {/* Toolbar */}
      <div className="flex items-center gap-4 border-b border-ink-line py-3">
        <Link href="/desk" aria-label="Back to desk" className="text-fog hover:text-chalk">
          <ArrowLeft size={17} />
        </Link>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Document title"
          className="min-w-0 flex-1 bg-transparent font-[family-name:var(--font-prose)] text-lg font-semibold text-chalk outline-none"
        />
        <span className="eyebrow text-fog" aria-live="polite">
          {saveState === "saved" ? "Saved" : saveState === "saving" ? "Saving…" : "Unsaved"}
        </span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Status"
          className="rounded border border-ink-line bg-ink-2 px-2 py-1.5 text-xs text-chalk outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        {analysis && (
          <span className="eyebrow rounded border border-ink-line px-2 py-1.5 font-[family-name:var(--font-data)] text-fog">
            GEO <span className={analysis.geo.total >= 70 ? "text-sage" : analysis.geo.total >= 40 ? "text-mark" : "text-proof"}>{analysis.geo.total}</span>
          </span>
        )}
        <button
          onClick={() => {
            if (!angles) {
              void handleGenerateAngles();
            } else {
              setShowAngles((s) => !s);
            }
          }}
          disabled={generatingAngles}
          className={`flex items-center gap-1.5 rounded border border-ink-line bg-ink-2 px-3 py-1.5 text-xs text-chalk hover:bg-ink-3 transition-colors disabled:opacity-50 ${
            showAngles && angles ? "border-proof text-proof bg-proof/5" : ""
          }`}
        >
          <Wand2 size={12} className={generatingAngles ? "animate-spin" : ""} />
          {generatingAngles ? "Generating…" : angles ? (showAngles ? "Hide Angles" : "Show Angles") : "Generate Angles"}
        </button>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 rounded bg-proof px-3 py-1.5 text-sm font-medium text-paper"
        >
          <Send size={13} /> Distribute asset
        </button>
      </div>

      {/* Format Toolbar */}
      {editor && (
        <FormatToolbar
          editor={editor}
          focusMode={focusMode}
          onToggleFocus={() => setFocusMode((v) => !v)}
          onOpenFindReplace={() => setFindReplaceOpen((v) => !v)}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {/* Canvas */}
        <div className="relative min-w-0 flex-1 overflow-y-auto" ref={canvasRef}>
          {((angles && showAngles) || generatingAngles) && (
            <div className="mx-auto mt-5 max-w-[720px] rounded-lg border border-ink-line bg-ink-2 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="eyebrow text-proof">
                  Suggested angles {doc?.meta?.anglesLive === false && <span className="text-fog">(offline mock)</span>}
                </p>
                <button onClick={() => setShowAngles(false)} className="text-xs text-fog hover:text-chalk">
                  Dismiss
                </button>
              </div>

              {generatingAngles ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Wand2 size={20} className="animate-spin text-proof mb-2" />
                  <p className="text-xs text-fog">Generating tailored structured angles with AI...</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-2 md:grid-cols-3">
                    {angles && angles.map((a) => (
                      <button
                        key={a.name}
                        className="rounded border border-ink-line p-2.5 text-left transition-colors hover:border-proof"
                        onClick={() => {
                          if (!editor) return;
                          editor
                            .chain()
                            .focus("end")
                            .insertContent([
                              { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: a.headline }] },
                              ...a.outline.map((o) => ({
                                type: "heading",
                                attrs: { level: 3 },
                                content: [{ type: "text", text: o }],
                              })),
                            ])
                            .run();
                        }}
                      >
                        <p className="text-xs font-medium text-mark">{a.name}</p>
                        <p className="mt-1 text-xs leading-snug text-chalk">{a.headline}</p>
                      </button>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleGenerateAngles(customFocus);
                    }}
                    className="mt-4 flex items-center gap-2 border-t border-ink-line pt-3"
                  >
                    <input
                      type="text"
                      value={customFocus}
                      onChange={(e) => setCustomFocus(e.target.value)}
                      placeholder="Type custom focus (e.g. 'focus on pricing', 'mobile first')..."
                      className="flex-1 rounded border border-ink-line bg-ink px-2.5 py-1.5 text-xs text-chalk outline-none placeholder:text-fog/40 focus:border-proof"
                    />
                    <button
                      type="submit"
                      disabled={generatingAngles}
                      className="rounded bg-proof px-3 py-1.5 text-xs font-semibold text-paper hover:bg-proof/90 disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Wand2 size={11} /> Generate
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* Find & Replace */}
          {editor && (
            <FindReplace
              editor={editor}
              open={findReplaceOpen}
              onClose={() => setFindReplaceOpen(false)}
            />
          )}

          <div className="editor-canvas mx-auto my-5 max-w-[720px] rounded-sm bg-paper shadow-[0_2px_24px_rgba(0,0,0,0.45)]">
            {editor && (
              <BubbleMenu
                editor={editor}
                tippyOptions={{ duration: 120 }}
                shouldShow={({ state }) => !state.selection.empty && !editor.isActive("image")}
              >
                <div className="flex overflow-hidden rounded-md border border-ink-line bg-ink-2 shadow-xl">
                  <button
                    onClick={() => void createBranch()}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs text-chalk hover:bg-ink-3"
                  >
                    <GitBranch size={12} className="text-proof" /> Branch block
                  </button>
                  <button
                    onClick={() => editor && void rephraseBlockAt(editor.state.selection.$from.index(0))}
                    disabled={rephrasing}
                    className="flex items-center gap-1.5 border-l border-ink-line px-3 py-2 text-xs text-chalk hover:bg-ink-3 disabled:opacity-50"
                  >
                    <Wand2 size={12} className="text-mark" /> {rephrasing ? "Rewriting…" : "Humanize"}
                  </button>
                </div>
              </BubbleMenu>
            )}

            {editor && (
              <BubbleMenu
                editor={editor}
                tippyOptions={{ duration: 120 }}
                shouldShow={({ editor }) => editor.isActive("image")}
              >
                <div className="flex overflow-hidden rounded-md border border-ink-line bg-ink-2 shadow-xl items-center divide-x divide-ink-line">
                  <div className="flex items-center p-1 gap-1">
                    <button
                      onClick={() => editor.chain().focus().updateAttributes("image", { width: "25%" }).run()}
                      className="px-2 py-1 text-[10px] font-semibold text-chalk hover:bg-ink-3 rounded"
                    >
                      25%
                    </button>
                    <button
                      onClick={() => editor.chain().focus().updateAttributes("image", { width: "50%" }).run()}
                      className="px-2 py-1 text-[10px] font-semibold text-chalk hover:bg-ink-3 rounded"
                    >
                      50%
                    </button>
                    <button
                      onClick={() => editor.chain().focus().updateAttributes("image", { width: "75%" }).run()}
                      className="px-2 py-1 text-[10px] font-semibold text-chalk hover:bg-ink-3 rounded"
                    >
                      75%
                    </button>
                    <button
                      onClick={() => editor.chain().focus().updateAttributes("image", { width: "100%" }).run()}
                      className="px-2 py-1 text-[10px] font-semibold text-chalk hover:bg-ink-3 rounded"
                    >
                      100%
                    </button>
                  </div>
                  <div className="flex items-center p-1 gap-1">
                    <button
                      onClick={() => editor.chain().focus().updateAttributes("image", { alignment: "left" }).run()}
                      className="px-2 py-1 text-[10px] text-chalk hover:bg-ink-3 rounded"
                    >
                      Left
                    </button>
                    <button
                      onClick={() => editor.chain().focus().updateAttributes("image", { alignment: "center" }).run()}
                      className="px-2 py-1 text-[10px] text-chalk hover:bg-ink-3 rounded"
                    >
                      Center
                    </button>
                    <button
                      onClick={() => editor.chain().focus().updateAttributes("image", { alignment: "right" }).run()}
                      className="px-2 py-1 text-[10px] text-chalk hover:bg-ink-3 rounded"
                    >
                      Right
                    </button>
                  </div>
                </div>
              </BubbleMenu>
            )}
            <EditorContent editor={editor} />
          </div>

          {/* Word count bar */}
          {stats && (
            <div className="mx-auto mb-2 max-w-[720px] flex items-center gap-4 px-1 text-[11px] text-fog/70">
              <span className="flex items-center gap-1"><FileText size={11} /> {stats.words.toLocaleString()} words</span>
              <span className="flex items-center gap-1"><AlignJustify size={11} /> {stats.chars.toLocaleString()} chars</span>
              <span className="flex items-center gap-1"><Clock size={11} /> {stats.readTime}</span>
            </div>
          )}

          {branches.length > 0 && editor && (
            <div className="mx-auto mb-8 max-w-[720px]">
              <BranchBar
                branches={branches}
                blocks={analysis?.blocks ?? []}
                onSwitch={switchVariant}
                onAddVariant={addVariant}
                onDeleteGroup={deleteGroup}
              />
            </div>
          )}

          {/* Inline readability popover */}
          {activeIssue && (
            <div
              className="absolute z-30 w-72 rounded-md border border-ink-line bg-ink-2 p-3 shadow-2xl"
              style={{ left: Math.min(activeIssue.x, (canvasRef.current?.clientWidth ?? 400) - 300), top: activeIssue.y }}
            >
              <p className="eyebrow mb-1 text-mark">{activeIssue.issue.kind.replace("-", " ")}</p>
              <p className="text-xs leading-relaxed text-chalk">{activeIssue.issue.message}</p>
              <div className="mt-2.5 flex gap-2">
                {activeIssue.issue.replacement !== null && (
                  <button
                    onClick={() => applyFix(activeIssue.issue)}
                    className="rounded bg-proof px-2.5 py-1.5 text-xs font-medium text-paper"
                  >
                    {activeIssue.issue.replacement ? `Replace with "${activeIssue.issue.replacement.trim() || "—"}"` : "Delete phrase"}
                  </button>
                )}
                <button
                  onClick={() => void rephraseBlockAt(activeIssue.issue.blockIndex)}
                  disabled={rephrasing}
                  className="rounded border border-ink-line px-2.5 py-1.5 text-xs text-chalk disabled:opacity-50"
                >
                  {rephrasing ? "Rewriting…" : "Rewrite block"}
                </button>
                <button onClick={() => setActiveIssue(null)} className="ml-auto text-xs text-fog">
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right rail — hidden in focus mode */}
        {!focusMode && (
          <div className={`flex shrink-0 border-l border-ink-line ${panelOpen ? "w-[380px]" : "w-11"}`}>
            <div className="flex w-11 shrink-0 flex-col items-center gap-1 border-r border-ink-line py-3">
              <button
                aria-label="Research panel"
                onClick={() => { setRightTab("research"); setPanelOpen(rightTab === "research" ? !panelOpen : true); }}
                className={`rounded p-2 ${rightTab === "research" && panelOpen ? "bg-ink-3 text-proof" : "text-fog hover:text-chalk"}`}
              >
                <Search size={16} />
              </button>
              <button
                aria-label="Optimization panel"
                onClick={() => { setRightTab("optimize"); setPanelOpen(rightTab === "optimize" ? !panelOpen : true); }}
                className={`rounded p-2 ${rightTab === "optimize" && panelOpen ? "bg-ink-3 text-proof" : "text-fog hover:text-chalk"}`}
              >
                <Gauge size={16} />
              </button>
            </div>
            {panelOpen && (
              <div className="min-w-0 flex-1 overflow-y-auto">
                {rightTab === "research" ? (
                  <ResearchPanel editor={editor} brandBrainId={doc?.brandBrainId ?? null} llmHeaders={llmHeaders} />
                ) : (
                  analysis && (
                    <GeoPanel
                      geo={analysis.geo}
                      issues={analysis.issues}
                      cadence={analysis.cadence}
                      blocks={analysis.blocks}
                      onJump={jumpToIssue}
                      onFix={applyFix}
                      onRephrase={rephraseBlockAt}
                      rephrasing={rephrasing}
                    />
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <DistributeDrawer documentId={documentId} open={drawerOpen} onClose={() => setDrawerOpen(false)} llmHeaders={llmHeaders} />
    </div>
  );
}

// re-export for BranchBar typing convenience
export type { DocumentApi };
export { nodeText };
