import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { getTreasure, updateTreasure, deleteTreasure } from "@/lib/treasures";
import { parseTreasureInput } from "@/lib/validation";
import type { TreasureInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function validateSpriteRefs(value: TreasureInput): Promise<string | null> {
  for (const spriteId of [value.icon_sprite_id, value.transform_sprite_id, value.card_sprite_id]) {
    if (spriteId === null) continue;
    const sprite = await get<{ id: number }>("SELECT id FROM sprites WHERE id = ?", [spriteId]);
    if (!sprite) return `sprite ${spriteId} não encontrado`;
  }
  return null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const treasure = await getTreasure(Number((await params).id));
  if (!treasure) {
    return NextResponse.json({ error: "tesouro não encontrado" }, { status: 404 });
  }
  return NextResponse.json(treasure);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  const parsed = parseTreasureInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const refError = await validateSpriteRefs(parsed.value);
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  try {
    const updated = await updateTreasure(id, parsed.value);
    if (!updated) {
      return NextResponse.json({ error: "tesouro não encontrado" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "falha ao salvar";
    const isDup = /UNIQUE/i.test(msg);
    return NextResponse.json(
      { error: isDup ? "já existe um tesouro com esse nome" : msg },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = await deleteTreasure(Number((await params).id));
  if (!ok) {
    return NextResponse.json({ error: "tesouro não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
