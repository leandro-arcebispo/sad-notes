import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { getCurse, updateCurse, deleteCurse } from "@/lib/curses";
import { parseCurseInput } from "@/lib/validation";
import type { CurseInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function validateSpriteRef(value: CurseInput): Promise<string | null> {
  if (value.card_sprite_id === null) return null;
  const sprite = await get<{ id: number }>("SELECT id FROM sprites WHERE id = ?", [
    value.card_sprite_id,
  ]);
  return sprite ? null : `sprite ${value.card_sprite_id} não encontrado`;
}

export async function GET(_req: Request, { params }: Ctx) {
  const curse = await getCurse(Number((await params).id));
  if (!curse) {
    return NextResponse.json({ error: "maldição não encontrada" }, { status: 404 });
  }
  return NextResponse.json(curse);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  const parsed = parseCurseInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const refError = await validateSpriteRef(parsed.value);
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  try {
    const updated = await updateCurse(id, parsed.value);
    if (!updated) {
      return NextResponse.json({ error: "maldição não encontrada" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "falha ao salvar";
    const isDup = /UNIQUE/i.test(msg);
    return NextResponse.json(
      { error: isDup ? "já existe uma maldição com esse nome" : msg },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = await deleteCurse(Number((await params).id));
  if (!ok) {
    return NextResponse.json({ error: "maldição não encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
