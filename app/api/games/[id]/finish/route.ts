import { NextResponse } from "next/server";
import { all } from "@/lib/db";
import { finishGame } from "@/lib/games";
import { parseGameFinishPayload } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Finaliza a partida: grava o snapshot final por jogador e move o status pra
 * `finalizada` — que é o único status que entra em ranking e desbloqueio.
 */
export async function POST(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const parsed = parseGameFinishPayload(await req.json().catch(() => null));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const treasureIds = Array.from(
    new Set(parsed.value.players.flatMap((p) => p.treasure_ids))
  );
  if (treasureIds.length > 0) {
    const placeholders = treasureIds.map(() => "?").join(",");
    const found = await all<{ id: number }>(
      `SELECT id FROM treasures WHERE id IN (${placeholders})`,
      treasureIds
    );
    if (found.length !== treasureIds.length) {
      return NextResponse.json(
        { error: "algum tesouro selecionado não existe mais" },
        { status: 400 }
      );
    }
  }

  const res = await finishGame(id, parsed.value);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json(res.game);
}
