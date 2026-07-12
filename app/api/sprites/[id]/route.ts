import { NextResponse } from "next/server";
import { deleteSprite } from "@/lib/sprites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = deleteSprite(Number((await params).id));
  if (!ok) {
    return NextResponse.json({ error: "sprite não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
