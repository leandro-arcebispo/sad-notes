import { NextResponse } from "next/server";
import { getAvatarRecipe } from "@/lib/player-avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  try {
    return NextResponse.json(getAvatarRecipe(id));
  } catch {
    return NextResponse.json({ error: "jogador não encontrado" }, { status: 404 });
  }
}
