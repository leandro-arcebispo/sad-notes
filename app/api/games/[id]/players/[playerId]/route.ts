import { NextResponse } from "next/server";
import { getGame, rollCharacter, setCharacter } from "@/lib/games";
import { getCurrentPlayerId } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; playerId: string }> };

/**
 * Personagem de UM participante — por participante de propósito, não em lote:
 * na sessão multi-celular cada um vai sortear o seu no próprio aparelho, e
 * essa é a mesma rota que os dois fluxos usam (docs/PLANO-PARTIDAS.md §6.5).
 *
 * - `{ "action": "roll" }` → sorteio **no servidor** (anti re-roll infinito,
 *   sem colisão entre dispositivos, com rastro no diário).
 * - `{ "character_id": N | null }` → escolha manual (modo de seleção livre).
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id: rawId, playerId: rawPlayerId } = await params;
  const gameId = Number(rawId);
  const playerId = Number(rawPlayerId);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "corpo inválido" }, { status: 400 });

  if (body.action === "roll") {
    const res = await rollCharacter(gameId, playerId, await getCurrentPlayerId());
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }
    return NextResponse.json({
      character: res.character,
      reroll_count: res.reroll_count,
    });
  }

  if (body.character_id !== undefined) {
    const characterId =
      body.character_id === null ? null : Math.trunc(Number(body.character_id));
    if (characterId !== null && !Number.isFinite(characterId)) {
      return NextResponse.json({ error: "character_id inválido" }, { status: 400 });
    }
    const ok = await setCharacter(gameId, playerId, characterId);
    if (!ok) {
      return NextResponse.json(
        { error: "jogador não está nesta partida" },
        { status: 404 }
      );
    }
    const game = await getGame(gameId);
    return NextResponse.json(
      game?.players.find((p) => p.player_id === playerId) ?? {}
    );
  }

  return NextResponse.json({ error: "nada para atualizar" }, { status: 400 });
}
