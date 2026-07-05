"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Minus,
  Table as TableIcon,
  Image as ImageIcon,
  Highlighter,
  Type,
  Undo2,
  Redo2,
  Scissors,
  Focus,
  Search,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

type ToolbarProps = {
  editor: Editor;
  focusMode: boolean;
  onToggleFocus: () => void;
  onOpenFindReplace: () => void;
};

const HIGHLIGHT_COLORS = [
  { color: "#fde047", label: "Yellow" },
  { color: "#86efac", label: "Green" },
  { color: "#93c5fd", label: "Blue" },
  { color: "#f9a8d4", label: "Pink" },
  { color: "#fdba74", label: "Orange" },
];

const TEXT_COLORS = [
  { color: "#e2492f", label: "Red" },
  { color: "#10b981", label: "Green" },
  { color: "#3b82f6", label: "Blue" },
  { color: "#8b5cf6", label: "Purple" },
  { color: "#f59e0b", label: "Amber" },
  { color: "#e8e6e1", label: "Default" },
];

function ToolBtn({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        active
          ? "bg-proof/20 text-proof"
          : "text-fog hover:bg-ink-3 hover:text-chalk"
      } disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="mx-0.5 h-5 w-px bg-ink-line" />;
}

function ColorPicker({
  label,
  icon,
  colors,
  onSelect,
  current,
}: {
  label: string;
  icon: React.ReactNode;
  colors: { color: string; label: string }[];
  onSelect: (color: string) => void;
  current?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-8 flex-col items-center justify-center gap-0.5 rounded text-fog hover:bg-ink-3 hover:text-chalk"
      >
        {icon}
        <div
          className="h-1 w-4 rounded-sm transition-colors"
          style={{ backgroundColor: current ?? "currentColor" }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 flex gap-1 rounded-lg border border-ink-line bg-ink-2 p-1.5 shadow-xl">
            {colors.map((c) => (
              <button
                key={c.color}
                title={c.label}
                aria-label={c.label}
                onClick={() => { onSelect(c.color); setOpen(false); }}
                className="h-5 w-5 rounded-full border-2 border-transparent transition-transform hover:scale-110 hover:border-chalk"
                style={{ backgroundColor: c.color }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ImageSelector({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  const handleSubmitUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
      setUrl("");
      setOpen(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result;
        if (typeof src === "string") {
          editor.chain().focus().setImage({ src }).run();
          setOpen(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title="Insert Image"
        aria-label="Insert Image"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
          open ? "bg-proof/20 text-proof" : "text-fog hover:bg-ink-3 hover:text-chalk"
        }`}
      >
        <ImageIcon size={13} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-1.5 w-64 rounded-lg border border-ink-line bg-ink-2 p-3 shadow-2xl">
            <p className="eyebrow mb-2 text-fog text-[10px]">Insert Image</p>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded bg-ink px-3 py-2 text-xs text-chalk hover:bg-ink-3 border border-ink-line text-center mb-3 font-medium transition-colors cursor-pointer"
            >
              Upload from computer
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <form onSubmit={handleSubmitUrl} className="space-y-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Or paste image URL…"
                className="w-full rounded border border-ink-line bg-ink px-2.5 py-1.5 text-xs text-chalk outline-none placeholder:text-fog/40 focus:border-proof"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded px-2.5 py-1 text-[10px] text-fog hover:text-chalk"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!url.trim()}
                  className="rounded bg-proof px-2.5 py-1 text-[10px] font-medium text-paper disabled:opacity-40"
                >
                  Insert
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export function FormatToolbar({ editor, focusMode, onToggleFocus, onOpenFindReplace }: ToolbarProps) {
  const insertTable = useCallback(() => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);



  const insertPageBreak = useCallback(() => {
    editor
      .chain()
      .focus()
      .insertContent({ type: "horizontalRule" })
      .run();
  }, [editor]);

  const currentHighlight = editor.getAttributes("highlight").color as string | undefined;
  const currentTextColor = editor.getAttributes("textStyle").color as string | undefined;

  return (
    <div
      className="format-toolbar sticky top-[3.5rem] z-20 flex flex-wrap items-center gap-0.5 border-b border-ink-line bg-ink-2/95 px-3 py-1.5 backdrop-blur-sm"
      role="toolbar"
      aria-label="Formatting toolbar"
    >
      {/* History */}
      <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo (Ctrl+Z)">
        <Undo2 size={14} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo (Ctrl+Shift+Z)">
        <Redo2 size={14} />
      </ToolBtn>

      <Separator />

      {/* Block type */}
      <ToolBtn
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={editor.isActive("paragraph")}
        label="Paragraph"
      >
        <Pilcrow size={13} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        label="Heading 1"
      >
        <Heading1 size={14} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        label="Heading 2"
      >
        <Heading2 size={14} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        label="Heading 3"
      >
        <Heading3 size={14} />
      </ToolBtn>

      <Separator />

      {/* Inline marks */}
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        label="Bold (Ctrl+B)"
      >
        <Bold size={13} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        label="Italic (Ctrl+I)"
      >
        <Italic size={13} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        label="Underline (Ctrl+U)"
      >
        <UnderlineIcon size={13} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        label="Strikethrough"
      >
        <Strikethrough size={13} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        label="Inline code"
      >
        <Code size={13} />
      </ToolBtn>

      {/* Color pickers */}
      <ColorPicker
        label="Highlight color"
        icon={<Highlighter size={13} />}
        colors={HIGHLIGHT_COLORS}
        current={currentHighlight}
        onSelect={(color) =>
          editor.chain().focus().toggleHighlight({ color }).run()
        }
      />
      <ColorPicker
        label="Text color"
        icon={<Type size={13} />}
        colors={TEXT_COLORS}
        current={currentTextColor}
        onSelect={(color) =>
          editor.chain().focus().setColor(color).run()
        }
      />

      <Separator />

      {/* Alignment */}
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        label="Align left"
      >
        <AlignLeft size={13} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        label="Align center"
      >
        <AlignCenter size={13} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        label="Align right"
      >
        <AlignRight size={13} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        active={editor.isActive({ textAlign: "justify" })}
        label="Justify"
      >
        <AlignJustify size={13} />
      </ToolBtn>

      <Separator />

      {/* Lists */}
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        label="Bullet list"
      >
        <List size={13} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        label="Numbered list"
      >
        <ListOrdered size={13} />
      </ToolBtn>
      <ToolBtn
        onClick={() => (editor.chain().focus() as any).toggleTaskList().run()}
        active={editor.isActive("taskList")}
        label="Task list"
      >
        <CheckSquare size={13} />
      </ToolBtn>
      <ToolBtn
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        label="Blockquote"
      >
        <Quote size={13} />
      </ToolBtn>

      <Separator />

      {/* Inserts */}
      <ToolBtn onClick={insertTable} label="Insert table">
        <TableIcon size={13} />
      </ToolBtn>
      <ImageSelector editor={editor} />
      <ToolBtn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        label="Divider"
      >
        <Minus size={13} />
      </ToolBtn>

      <Separator />

      {/* View */}
      <ToolBtn onClick={onOpenFindReplace} label="Find & Replace (Ctrl+H)">
        <Search size={13} />
      </ToolBtn>
      <ToolBtn
        onClick={onToggleFocus}
        active={focusMode}
        label={focusMode ? "Exit focus mode" : "Focus mode"}
      >
        <Focus size={13} />
      </ToolBtn>
    </div>
  );
}
