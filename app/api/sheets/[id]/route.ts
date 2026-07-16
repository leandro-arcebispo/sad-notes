import { NextResponse } from "next/server";
import { deleteSheet } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = await deleteSheet(Number((await params).id));
  if (!ok) {
    return NextResponse.json({ error: "spritesheet não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
