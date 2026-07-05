import { NextRequest, NextResponse } from "next/server";
import { scoreGeo } from "@/lib/geo";
import { scanBlocks } from "@/lib/readability";
import { scanCadence } from "@/lib/cadence";
import { TiptapDoc, docBlocks } from "@/lib/tiptap-text";

/** Full analysis over a TipTap doc — same engines the live panel runs client-side. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const doc = body?.doc as TiptapDoc | undefined;
  if (!doc || doc.type !== "doc") {
    return NextResponse.json({ error: "Provide { doc } as TipTap JSON" }, { status: 400 });
  }
  const blocks = docBlocks(doc);
  return NextResponse.json({
    geo: scoreGeo(doc),
    readability: scanBlocks(blocks),
    cadence: scanCadence(blocks),
  });
}
