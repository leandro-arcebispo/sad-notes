import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { getMonster, updateMonster, deleteMonster } from "@/lib/monsters";
import { parseMonsterInput } from "@/lib/validation";
import type { MonsterInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function validateSpriteRef(value: MonsterInput): Promise<string | null> {
  if (value.card_sprite_id === null) return null;
  const sprite = await get<{ id: number }>("SELECT id FROM sprites WHERE id = ?", [
    value.card_sprite_id,
  ]);
  return sprite ? null : `sprite ${value.card_sprite_id} não encontrado`;
}

export async function GET(_req: Request, { params }: Ctx) {
  const monster = await getMonster(Number((await params).id));
  if (!monster) {
    return NextResponse.json({ error: "monstro não encontrado" }, { status: 404 });
  }
  return NextResponse.json(monster);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  const parsed = parseMonsterInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const refError = await validateSpriteRef(parsed.value);
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  try {
    const updated = await updateMonster(id, parsed.value);
    if (!updated) {
      return NextResponse.json({ error: "monstro não encontrado" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "falha ao salvar";
    const isDup = /UNIQUE/i.test(msg);
    return NextResponse.json(
      { error: isDup ? "já existe um monstro com esse nome" : msg },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = await deleteMonster(Number((await params).id));
  if (!ok) {
    return NextResponse.json({ error: "monstro não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
