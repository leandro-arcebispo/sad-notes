import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { listTreasures, createTreasure } from "@/lib/treasures";
import { parseTreasureInput } from "@/lib/validation";
import type { TreasureInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Confere que os sprites referenciados (ícone/transformação/carta) existem
 * antes de gravar — mesma checagem feita em /api/ornaments. */
async function validateSpriteRefs(
  value: TreasureInput
): Promise<string | null> {
  for (const spriteId of [value.icon_sprite_id, value.transform_sprite_id, value.card_sprite_id]) {
    if (spriteId === null) continue;
    const sprite = await get<{ id: number }>("SELECT id FROM sprites WHERE id = ?", [spriteId]);
    if (!sprite) return `sprite ${spriteId} não encontrado`;
  }
  return null;
}

export async function GET() {
  return NextResponse.json(await listTreasures());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = parseTreasureInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const refError = await validateSpriteRefs(parsed.value);
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  try {
    const treasure = await createTreasure(parsed.value);
    return NextResponse.json(treasure, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "falha ao salvar";
    const isDup = /UNIQUE/i.test(msg);
    return NextResponse.json(
      { error: isDup ? "já existe um tesouro com esse nome" : msg },
      { status: 400 }
    );
  }
}
