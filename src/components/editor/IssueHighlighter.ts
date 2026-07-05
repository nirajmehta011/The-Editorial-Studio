import { Extension, Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { ReadabilityIssue } from "@/lib/readability";

/**
 * Renders readability issues as inline highlight decorations and marks
 * branched blocks with a gutter indicator. Data flows in via transaction
 * metadata (setIssueMeta) so React state stays the single source of truth.
 */

export const issueKey = new PluginKey<IssueMeta>("issueHighlighter");

export type IssueMeta = {
  issues: ReadabilityIssue[];
  branchedAnchors: number[];
};

export function issueId(issue: ReadabilityIssue): string {
  return `${issue.blockIndex}:${issue.from}:${issue.kind}`;
}

export const IssueHighlighter = Extension.create({
  name: "issueHighlighter",

  addProseMirrorPlugins() {
    return [
      new Plugin<IssueMeta>({
        key: issueKey,
        state: {
          init: (): IssueMeta => ({ issues: [], branchedAnchors: [] }),
          apply(tr, value) {
            const meta = tr.getMeta(issueKey) as IssueMeta | undefined;
            return meta ?? value;
          },
        },
        props: {
          decorations(state) {
            const meta = issueKey.getState(state);
            if (!meta) return DecorationSet.empty;
            const decorations: Decoration[] = [];

            state.doc.forEach((node, offset, index) => {
              for (const issue of meta.issues) {
                if (issue.blockIndex !== index) continue;
                const from = offset + 1 + issue.from;
                const to = Math.min(offset + 1 + issue.to, offset + node.nodeSize - 1);
                if (from >= to) continue;
                decorations.push(
                  Decoration.inline(from, to, {
                    class:
                      issue.kind === "passive"
                        ? "issue-mark issue-mark--passive"
                        : "issue-mark",
                    "data-issue-id": issueId(issue),
                  })
                );
              }
              if (meta.branchedAnchors.includes(index)) {
                decorations.push(
                  Decoration.node(offset, offset + node.nodeSize, { class: "branched-block" })
                );
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export function setIssueMeta(editor: Editor, meta: IssueMeta) {
  const tr = editor.state.tr.setMeta(issueKey, meta);
  editor.view.dispatch(tr);
}

/** Absolute position range of the top-level block at `index`. */
export function blockRange(editor: Editor, index: number): { from: number; to: number } {
  const doc = editor.state.doc;
  let from = 0;
  for (let i = 0; i < index; i++) from += doc.child(i).nodeSize;
  return { from, to: from + doc.child(index).nodeSize };
}

/** Map a block-relative character span to absolute doc positions. */
export function issueRange(editor: Editor, issue: ReadabilityIssue): { from: number; to: number } {
  const { from: blockFrom, to: blockTo } = blockRange(editor, issue.blockIndex);
  return {
    from: blockFrom + 1 + issue.from,
    to: Math.min(blockFrom + 1 + issue.to, blockTo - 1),
  };
}
