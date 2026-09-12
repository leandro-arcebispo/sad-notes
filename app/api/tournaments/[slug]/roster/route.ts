import { NextResponse } from "next/server";
import { findTournament } from "@/lib/tournament-defs";
import { getRosterIds, saveRosterIds } from "@/lib/tournaments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const def = findTournament((await params).slug);
  if (!def) {
    return NextResponse.json({ error: "torneio não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ roster: await getRosterIds(def) });
}

/**
 * Define quem ocupa cada vaga ("Jogador 1".."Jogador 6").
 *
 * É a única parte do torneio que NÃO é estática: o chaveamento continua no
 * código, mas os participantes precisavam ser escolhidos em produção, entre os
 * jogadores já cadastrados, sem depender de deploy.
 */
export async function PUT(req: Request, { params }: Ctx) {
  const def = findTournament((await params).slug);
  if (!def) {
    return NextResponse.json({ error: "torneio não encontrado" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as { roster?: unknown } | null;
  if (!body || !Array.isArray(body.roster)) {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }

  const res = await saveRosterIds(def, body.roster as (number | null)[]);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json({ roster: await getRosterIds(def) });
}
