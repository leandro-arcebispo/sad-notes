import { NextResponse } from "next/server";
import { removePlayerOrnament, moveDiverso } from "@/lib/player-avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; rowId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id, rowId } = await params;
  const recipe = await removePlayerOrnament(Number(id), Number(rowId));
  return NextResponse.json(recipe);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id, rowId } = await params;
  const b = await req.json().catch(() => null);
  const direction = b?.direction === "down" ? "down" : "up";
  const recipe = await moveDiverso(Number(id), Number(rowId), direction);
  return NextResponse.json(recipe);
}
