import { NextResponse } from "next/server";
import { all } from "@/lib/db";
import { createGame, createGameSetup, listGames } from "@/lib/games";
import { getCurrentPlayerId } from "@/lib/identity";
import { parseGamePayload, parseGameSetupPayload } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listGames());
}

/** Confere que todo Tesouro selecionado ainda existe (alguém pode ter apagado
 * o cadastro entre a abertura da tela e o envio). */
async function missingTreasure(ids: number[]): Promise<boolean> {
  const unique = Array.from(new Set(ids));
  if (unique.length === 0) return false;
  const placeholders = unique.map(() => "?").join(",");
  const found = await all<{ id: number }>(
    `SELECT id FROM treasures WHERE id IN (${placeholders})`,
    unique
  );
  return found.length !== unique.length;
}

/**
 * Dois caminhos de criação, escolhidos pelo campo `mode`:
 *
 * - `"setup"` (padrão novo) — cria a partida ANTES de jogar, em `andamento`.
 *   É o que destrava a Run, o pause e o registro ao vivo.
 * - `"retroativo"` — a partida já aconteceu sem o app na mesa: grava tudo de
 *   uma vez, direto como `finalizada` (docs/PLANO-PARTIDAS.md §7.4).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const kind = (body as { mode?: string } | null)?.mode ?? "setup";

  if (kind === "retroativo") {
    const parsed = parseGamePayload(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    if (await missingTreasure(parsed.value.players.flatMap((p) => p.treasure_ids))) {
      return NextResponse.json(
        { error: "algum tesouro selecionado não existe mais" },
        { status: 400 }
      );
    }
    return NextResponse.json(await createGame(parsed.value), { status: 201 });
  }

  const parsed = parseGameSetupPayload(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const createdBy = await getCurrentPlayerId();
  return NextResponse.json(await createGameSetup(parsed.value, createdBy), {
    status: 201,
  });
}
