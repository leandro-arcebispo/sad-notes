import { NextResponse } from "next/server";
import { getGame, deleteGame } from "@/lib/games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const game = getGame(Number((await params).id));
  if (!game) {
    return NextResponse.json({ error: "partida não encontrada" }, { status: 404 });
  }
  return NextResponse.json(game);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = deleteGame(Number((await params).id));
  if (!ok) {
    return NextResponse.json({ error: "partida não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
