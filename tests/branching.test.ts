import { describe, it, expect } from "vitest";
import { groupBranches, applyVariant, nextVariantLabel, BranchRecord } from "@/lib/branching";
import { TiptapDoc } from "@/lib/tiptap-text";

const doc: TiptapDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
    { type: "paragraph", content: [{ type: "text", text: "Original intro." }] },
    { type: "paragraph", content: [{ type: "text", text: "Body." }] },
  ],
};

const branch = (over: Partial<BranchRecord>): BranchRecord => ({
  id: "x",
  parentId: null,
  label: "Original",
  anchorIndex: 1,
  content: { type: "paragraph", content: [{ type: "text", text: "Original intro." }] },
  isActive: false,
  ...over,
});

describe("branching", () => {
  it("groups roots with their variants", () => {
    const groups = groupBranches([
      branch({ id: "root1" }),
      branch({ id: "a", parentId: "root1", label: "Version A" }),
      branch({ id: "b", parentId: "root1", label: "Version B" }),
      branch({ id: "root2", anchorIndex: 2 }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].variants.map((v) => v.label)).toEqual(["Version A", "Version B"]);
    expect(groups[1].variants).toHaveLength(0);
  });

  it("applies a variant onto the anchored block without touching others", () => {
    const variant = { type: "paragraph", content: [{ type: "text", text: "Punchier intro." }] };
    const next = applyVariant(doc, 1, variant);
    expect(next.content![1]).toEqual(variant);
    expect(next.content![0]).toEqual(doc.content![0]);
    expect(next.content![2]).toEqual(doc.content![2]);
    // original doc untouched (immutability)
    expect(doc.content![1].content![0].text).toBe("Original intro.");
  });

  it("throws on an out-of-range anchor", () => {
    expect(() => applyVariant(doc, 9, { type: "paragraph" })).toThrow(RangeError);
  });

  it("labels variants alphabetically", () => {
    expect(nextVariantLabel({ variants: [] })).toBe("Version A");
    expect(nextVariantLabel({ variants: [{ label: "Version A" }] })).toBe("Version B");
    expect(nextVariantLabel({ variants: [{ label: "Version A" }, { label: "Version B" }] })).toBe("Version C");
  });
});
