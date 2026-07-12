import { NextResponse } from "next/server";
import { addPlayerDiverso } from "@/lib/player-avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const playerId = Number((await params).id);
  const b = await req.json().catch(() => null);
  const ornament_id = Math.trunc(Number(b?.ornament_id));
  if (!ornament_id) {
    return NextResponse.json({ error: "ornament_id é obrigatório" }, { status: 400 });
  }
  try {
    const recipe = await addPlayerDiverso(playerId, ornament_id);
    return NextResponse.json(recipe, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "falha ao adicionar" },
      { status: 400 }
    );
  }
}
