import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get("workspaceId") ?? undefined;
  const documents = await prisma.document.findMany({
    where: workspaceId ? { workspaceId } : undefined,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      workspaceId: true,
      brandBrainId: true,
      meta: true,
    },
  });
  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { workspaceId, title, brandBrainId } = body ?? {};
  if (!workspaceId || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "workspaceId and a non-empty title are required" }, { status: 400 });
  }
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const document = await prisma.document.create({
    data: {
      workspaceId,
      brandBrainId: brandBrainId ?? null,
      title: title.trim(),
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: title.trim() }] },
          { type: "paragraph" },
        ],
      },
    },
  });
  return NextResponse.json({ document }, { status: 201 });
}
