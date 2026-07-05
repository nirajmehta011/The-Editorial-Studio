import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      brandBrain: { select: { id: true, name: true } },
      branches: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });
  return NextResponse.json({ document });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (body.content !== undefined) data.content = body.content;
  if (body.status !== undefined) data.status = body.status;
  if (body.brandBrainId !== undefined) data.brandBrainId = body.brandBrainId;
  if (body.meta !== undefined) data.meta = body.meta;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  try {
    const document = await prisma.document.update({ where: { id }, data });
    return NextResponse.json({ document });
  } catch {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
}
