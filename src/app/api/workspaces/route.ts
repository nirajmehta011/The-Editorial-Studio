import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const workspaces = await prisma.workspace.findMany({
    include: {
      brandBrains: { select: { id: true, name: true, description: true, toneKeywords: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ workspaces });
}
