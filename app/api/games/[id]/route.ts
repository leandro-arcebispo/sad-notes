import { NextResponse } from "next/server";
import { deleteGame, getGame, getRunState, setGameStatus, setRounds } from "@/lib/games";
import { getCurrentPlayerId } from "@/lib/identity";
import { GAME_STATUSES, type GameStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** `?state=run` devolve o estado completo da Run (partida + diário + derivados)
 * — é o que a tela ao vivo e a de finalização consomem. O cálculo é do
 * servidor pra que dois dispositivos nunca mostrem números diferentes. */
export async function GET(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const wantsRun = new URL(req.url).searchParams.get("state") === "run";

  const data = wantsRun ? await getRunState(id) : await getGame(id);
  if (!data) {
    return NextResponse.json({ error: "partida não encontrada" }, { status: 404 });
  }
  return NextResponse.json(data);
}

/** Transições de ciclo de vida (pausar/retomar/abandonar) e o contador livre
 * de rodada. Transição inválida devolve 409 — o que protege de "finalizar duas
 * vezes" vindo de dois celulares. */
export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "corpo inválido" }, { status: 400 });

  if (body.rounds !== undefined) {
    const rounds = body.rounds === null ? null : Math.trunc(Number(body.rounds));
    if (rounds !== null && !Number.isFinite(rounds)) {
      return NextResponse.json({ error: "rodadas inválidas" }, { status: 400 });
    }
    const ok = await setRounds(id, rounds);
    if (!ok) {
      return NextResponse.json({ error: "partida não encontrada" }, { status: 404 });
    }
  }

  if (body.status !== undefined) {
    if (!GAME_STATUSES.includes(body.status as GameStatus)) {
      return NextResponse.json({ error: "status inválido" }, { status: 400 });
    }
    const res = await setGameStatus(
      id,
      body.status as GameStatus,
      await getCurrentPlayerId()
    );
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: res.status });
    }
    return NextResponse.json(res.game);
  }

  const game = await getGame(id);
  if (!game) {
    return NextResponse.json({ error: "partida não encontrada" }, { status: 404 });
  }
  return NextResponse.json(game);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = await deleteGame(Number((await params).id));
  if (!ok) {
    return NextResponse.json({ error: "partida não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
