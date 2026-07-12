import { NextResponse } from "next/server";
import { getPlayer, updatePlayer, setPlayerActive } from "@/lib/players";
import { parsePlayerInput } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  if (!getPlayer(id)) {
    return NextResponse.json({ error: "jogador não encontrado" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);

  // Toggle de ativo/arquivado (não exige os campos do formulário).
  if (body && typeof body === "object" && "active" in body && Object.keys(body).length === 1) {
    const updated = setPlayerActive(id, Boolean((body as { active: unknown }).active));
    return NextResponse.json(updated);
  }

  const parsed = parsePlayerInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  return NextResponse.json(updatePlayer(id, parsed.value));
}
