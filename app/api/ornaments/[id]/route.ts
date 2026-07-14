import { NextResponse } from "next/server";
import { deleteOrnament } from "@/lib/ornaments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = await deleteOrnament(Number((await params).id));
  if (!ok) {
    return NextResponse.json({ error: "ornamento não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
