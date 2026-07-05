import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nextVariantLabel } from "@/lib/branching";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const branches = await prisma.textBranch.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ branches });
}

/**
 * POST — two modes:
 *  { anchorIndex, content }            → start a branch group (root "Original", active)
 *  { parentId, content? }              → add a variant to an existing group
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  if (body.parentId) {
    const parent = await prisma.textBranch.findUnique({
      where: { id: body.parentId },
      include: { children: true },
    });
    if (!parent || parent.documentId !== id) {
      return NextResponse.json({ error: "Parent branch not found" }, { status: 404 });
    }
    const label = nextVariantLabel({ variants: parent.children });
    const [, variant] = await prisma.$transaction([
      // New variant becomes the active one in its group.
      prisma.textBranch.updateMany({
        where: { OR: [{ id: parent.id }, { parentId: parent.id }] },
        data: { isActive: false },
      }),
      prisma.textBranch.create({
        data: {
          documentId: id,
          parentId: parent.id,
          label,
          anchorIndex: parent.anchorIndex,
          content: body.content ?? parent.content ?? {},
          isActive: true,
        },
      }),
    ]);
    return NextResponse.json({ branch: variant }, { status: 201 });
  }

  if (typeof body.anchorIndex !== "number" || !body.content) {
    return NextResponse.json(
      { error: "Provide { anchorIndex, content } to start a group or { parentId } to add a variant" },
      { status: 400 }
    );
  }

  const existing = await prisma.textBranch.findFirst({
    where: { documentId: id, anchorIndex: body.anchorIndex, parentId: null },
  });
  if (existing) {
    return NextResponse.json({ error: "A branch group already exists for this block" }, { status: 409 });
  }

  const root = await prisma.textBranch.create({
    data: {
      documentId: id,
      label: "Original",
      anchorIndex: body.anchorIndex,
      content: body.content,
      isActive: true,
    },
  });
  return NextResponse.json({ branch: root }, { status: 201 });
}
