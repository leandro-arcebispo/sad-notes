import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { listCurses, createCurse } from "@/lib/curses";
import { parseCurseInput } from "@/lib/validation";
import type { CurseInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function validateSpriteRef(value: CurseInput): Promise<string | null> {
  if (value.card_sprite_id === null) return null;
  const sprite = await get<{ id: number }>("SELECT id FROM sprites WHERE id = ?", [
    value.card_sprite_id,
  ]);
  return sprite ? null : `sprite ${value.card_sprite_id} não encontrado`;
}

export async function GET() {
  return NextResponse.json(await listCurses());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = parseCurseInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const refError = await validateSpriteRef(parsed.value);
  if (refError) return NextResponse.json({ error: refError }, { status: 400 });

  try {
    const curse = await createCurse(parsed.value);
    return NextResponse.json(curse, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "falha ao salvar";
    const isDup = /UNIQUE/i.test(msg);
    return NextResponse.json(
      { error: isDup ? "já existe uma maldição com esse nome" : msg },
      { status: 400 }
    );
  }
}
