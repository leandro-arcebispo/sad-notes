import { NextResponse } from "next/server";
import { listSheets, createSheet } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listSheets());
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") {
    return NextResponse.json({ error: "corpo inválido" }, { status: 400 });
  }
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });

  if (typeof b.dataUrl !== "string" || !b.dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "imagem inválida" }, { status: 400 });
  }
  const width = Math.trunc(Number(b.width));
  const height = Math.trunc(Number(b.height));
  if (!(width > 0) || !(height > 0)) {
    return NextResponse.json({ error: "dimensões inválidas" }, { status: 400 });
  }

  try {
    const sheet = await createSheet({ name, dataUrl: b.dataUrl, width, height });
    return NextResponse.json(sheet, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "falha ao salvar" },
      { status: 400 }
    );
  }
}
