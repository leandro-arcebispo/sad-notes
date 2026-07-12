import { NextResponse } from "next/server";
import { setPlayerHair } from "@/lib/player-avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const playerId = Number((await params).id);
  const b = await req.json().catch(() => null);
  const ornament_id =
    b && b.ornament_id !== null && b.ornament_id !== undefined
      ? Math.trunc(Number(b.ornament_id))
      : null;
  try {
    const recipe = await setPlayerHair(playerId, ornament_id);
    return NextResponse.json(recipe);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "falha ao atualizar cabelo" },
      { status: 400 }
    );
  }
}
