import { NextResponse } from "next/server";
import { appendEvent } from "@/lib/game-events";
import { getRunDelta } from "@/lib/games";
import { get } from "@/lib/db";
import { getCurrentPlayerId } from "@/lib/identity";
import { parseGameEventInput } from "@/lib/validation";
import type { Game } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Polling incremental da Run (§6.7 do plano): devolve só os eventos com
 * `seq > since`, mais o estado derivado fresco e o ciclo de vida.
 *
 * É deliberadamente uma ida só ao servidor por tick — no Turso cada query
 * remota custa 700ms–2.4s (medido; ver HANDOFF), então o cliente chama isto a
 * cada ~4s e só enquanto a aba está visível. Nada de WebSocket: conexão longa
 * em serverless seria briga sem retorno aqui.
 */
export async function GET(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const since = Math.max(0, Math.trunc(Number(new URL(req.url).searchParams.get("since"))) || 0);

  const delta = await getRunDelta(id, since);
  if (!delta) {
    return NextResponse.json({ error: "partida não encontrada" }, { status: 404 });
  }
  return NextResponse.json(delta);
}

/**
 * Registra um evento. **Idempotente por `client_event_id`**: celular com rede
 * ruim reenvia, e sem isso nasceriam mortes fantasmas — o reenvio devolve o
 * evento já gravado (ver `appendEvent`).
 *
 * Qualquer um pode registrar qualquer evento, com carimbo de autoria — decisão
 * do usuário (§2.11): o grupo é pequeno e o Diário fica visível pra todos.
 */
export async function POST(req: Request, { params }: Ctx) {
  const id = Number((await params).id);

  const game = await get<Game>("SELECT id, status FROM games WHERE id = ?", [id]);
  if (!game) {
    return NextResponse.json({ error: "partida não encontrada" }, { status: 404 });
  }
  if (game.status === "finalizada" || game.status === "abortada") {
    return NextResponse.json(
      { error: "esta partida já foi encerrada" },
      { status: 409 }
    );
  }

  const parsed = parseGameEventInput(await req.json().catch(() => null));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const event = await appendEvent(id, parsed.value, await getCurrentPlayerId());
  return NextResponse.json(event, { status: 201 });
}
