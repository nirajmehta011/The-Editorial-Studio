import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH — { action: "activate" } switches the active variant in the group;
 *          { content } / { label } update the branch record.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const branch = await prisma.textBranch.findUnique({ where: { id } });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  if (body.action === "activate") {
    const rootId = branch.parentId ?? branch.id;
    const [, updated] = await prisma.$transaction([
      prisma.textBranch.updateMany({
        where: { OR: [{ id: rootId }, { parentId: rootId }] },
        data: { isActive: false },
      }),
      prisma.textBranch.update({ where: { id }, data: { isActive: true } }),
    ]);
    return NextResponse.json({ branch: updated });
  }

  const data: Record<string, unknown> = {};
  if (body.content !== undefined) data.content = body.content;
  if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim();
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }
  const updated = await prisma.textBranch.update({ where: { id }, data });
  return NextResponse.json({ branch: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const branch = await prisma.textBranch.findUnique({ where: { id } });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  // Deleting a root cascades to its variants (schema onDelete: Cascade).
  await prisma.textBranch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
