import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { clearCurrentPlayer, getCurrentPlayer, setCurrentPlayer } from "@/lib/identity";
import type { Player } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ player: await getCurrentPlayer() });
}

/**
 * Troca o perfil do dispositivo. **Sem senha, de propósito** — qualquer um
 * pode entrar em qualquer perfil, no modelo "Netflix compartilhado" decidido
 * pelo usuário (docs/PLANO-PARTIDAS.md §6).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { player_id?: unknown } | null;
  const playerId = Math.trunc(Number(body?.player_id));
  if (!Number.isFinite(playerId) || playerId <= 0) {
    return NextResponse.json({ error: "player_id inválido" }, { status: 400 });
  }

  const player = await get<Player>(
    "SELECT * FROM players WHERE id = ? AND active = 1",
    [playerId]
  );
  if (!player) {
    return NextResponse.json({ error: "jogador não encontrado" }, { status: 404 });
  }

  await setCurrentPlayer(playerId);
  return NextResponse.json({ player });
}

/** Sair do perfil (volta pro seletor). */
export async function DELETE() {
  await clearCurrentPlayer();
  return NextResponse.json({ ok: true });
}
