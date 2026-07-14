import { NextResponse } from "next/server";
import { listSprites, createSprite } from "@/lib/sprites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listSprites());
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });

  if (typeof b.dataUrl !== "string" || !b.dataUrl.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "imagem inválida" }, { status: 400 });
  }
  const width = Math.trunc(Number(b.width));
  const height = Math.trunc(Number(b.height));
  if (!(width > 0) || !(height > 0)) {
    return NextResponse.json({ error: "dimensões inválidas" }, { status: 400 });
  }

  const num = (v: unknown) =>
    v === null || v === undefined ? null : Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : null;

  try {
    const sprite = await createSprite({
      name,
      category: typeof b.category === "string" && b.category.trim() ? b.category.trim() : "outro",
      dataUrl: b.dataUrl,
      width,
      height,
      source_sheet:
        typeof b.source_sheet === "string" && b.source_sheet.trim() ? b.source_sheet.trim() : null,
      sx: num(b.sx),
      sy: num(b.sy),
      sw: num(b.sw),
      sh: num(b.sh),
    });
    return NextResponse.json(sprite, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "falha ao salvar" },
      { status: 400 }
    );
  }
}
