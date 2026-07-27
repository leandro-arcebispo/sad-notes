import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { getCharacter, updateCharacter } from "@/lib/characters";
import { parseCharacterInput } from "@/lib/validation";
import type { CharacterInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function validateSpriteRefs(value: CharacterInput): Promise<string | null> {
  for (const id of [
    value.card_sprite_id,
    value.starter_item_sprite_id,
    value.card_back_sprite_id,
    value.starter_item_back_sprite_id,
  ]) {
    if (id === null) continue;
    const sprite = await get<{ id: number }>("SELECT id FROM sprites WHERE id = ?", [id]);
    if (!sprite) return `sprite ${id} não encontrado`;
  }
  return null;
}

export async function GET(_req: Request, { params }: Ctx) {
  const character = await getCharacter(Number((await params).id));
  if (!character) {
    return NextResponse.json({ error: "personagem não encontrado" }, { status: 404 });
  }
  return NextResponse.json(character);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  const parsed = parseCharacterInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const refError = await validateSpriteRefs(parsed.value);
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  const updated = await updateCharacter(id, parsed.value);
  if (!updated) {
    return NextResponse.json({ error: "personagem não encontrado" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
