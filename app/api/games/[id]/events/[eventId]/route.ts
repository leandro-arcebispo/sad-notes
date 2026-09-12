import { NextResponse } from "next/server";
import { deleteEvent } from "@/lib/game-events";
import { getCurrentPlayerId } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; eventId: string }> };

/**
 * Apaga um evento registrado por engano. É **soft-delete**: a linha fica, com
 * `deleted_at`/`deleted_by_player_id` — o `seq` nunca é reciclado, então o
 * polling incremental de outro aparelho não fica com buraco na numeração.
 *
 * Qualquer um pode apagar qualquer evento (§2.11) — a autoria de quem apagou
 * fica gravada, que é o que importa num grupo de amigos.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { eventId } = await params;
  const ok = await deleteEvent(Number(eventId), await getCurrentPlayerId());
  if (!ok) {
    return NextResponse.json(
      { error: "evento não encontrado ou já apagado" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
