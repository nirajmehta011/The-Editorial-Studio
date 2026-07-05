import { TiptapDoc, TiptapNode } from "./tiptap-text";

/**
 * Pure document-branching operations. The DB stores a branch tree
 * (root = original block, children = variants); these helpers apply a chosen
 * variant back onto the document node tree.
 */

export type BranchRecord = {
  id: string;
  parentId: string | null;
  label: string;
  anchorIndex: number;
  content: TiptapNode;
  isActive: boolean;
};

export type BranchGroup = {
  root: BranchRecord;
  variants: BranchRecord[];
};

/** Group a flat branch list into { root, variants } trees. */
export function groupBranches(branches: BranchRecord[]): BranchGroup[] {
  const roots = branches.filter((b) => b.parentId === null);
  return roots.map((root) => ({
    root,
    variants: branches
      .filter((b) => b.parentId === root.id)
      .sort((a, b) => a.label.localeCompare(b.label)),
  }));
}

/** Replace the block at anchorIndex with the given variant content. */
export function applyVariant(doc: TiptapDoc, anchorIndex: number, variant: TiptapNode): TiptapDoc {
  const content = [...(doc.content ?? [])];
  if (anchorIndex < 0 || anchorIndex >= content.length) {
    throw new RangeError(`anchorIndex ${anchorIndex} out of bounds (doc has ${content.length} blocks)`);
  }
  content[anchorIndex] = variant;
  return { ...doc, content };
}

/** Next variant label for a group: Version A, Version B, ... */
export function nextVariantLabel(group: { variants: { label: string }[] }): string {
  const letter = String.fromCharCode(65 + group.variants.length); // A, B, C...
  return `Version ${letter}`;
}
