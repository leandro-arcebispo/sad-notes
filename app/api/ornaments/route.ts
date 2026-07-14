import { NextResponse } from "next/server";
import { get } from "@/lib/db";
import { listOrnaments, createOrnament } from "@/lib/ornaments";
import type { OrnamentCategory } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES: OrnamentCategory[] = ["cabelo", "diverso"];

export async function GET() {
  return NextResponse.json(await listOrnaments());
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }

  const sprite_id = Math.trunc(Number(b.sprite_id));
  if (!sprite_id) {
    return NextResponse.json({ error: "sprite_id é obrigatório" }, { status: 400 });
  }
  const sprite = await get<{ id: number }>("SELECT id FROM sprites WHERE id = ?", [sprite_id]);
  if (!sprite) {
    return NextResponse.json({ error: "sprite não encontrado" }, { status: 400 });
  }

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });

  const category: OrnamentCategory = CATEGORIES.includes(b.category)
    ? b.category
    : "diverso";

  const clamp = (v: unknown, lo: number, hi: number, fallback: number) => {
    const n = Math.trunc(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
  };

  const ornament = await createOrnament({
    sprite_id,
    name,
    category,
    offset_x: clamp(b.offset_x, -128, 128, 0),
    offset_y: clamp(b.offset_y, -128, 128, 0),
    scale: clamp(b.scale, 20, 300, 100),
  });
  return NextResponse.json(ornament, { status: 201 });
}
