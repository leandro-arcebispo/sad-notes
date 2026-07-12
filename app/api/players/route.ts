import { NextResponse } from "next/server";
import { listPlayers, createPlayer } from "@/lib/players";
import { BASE_FACES, type BaseFace, type PlayerInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listPlayers());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = parsePlayerInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  return NextResponse.json(createPlayer(parsed.value), { status: 201 });
}

/** Valida/normaliza o corpo do formulário de jogador. Exportado p/ reuso no PATCH. */
export function parsePlayerInput(
  body: unknown
): { value: PlayerInput } | { error: string } {
  if (!body || typeof body !== "object") return { error: "corpo inválido" };
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { error: "nome é obrigatório" };

  const nickname =
    typeof b.nickname === "string" && b.nickname.trim()
      ? b.nickname.trim()
      : null;

  const color =
    typeof b.color === "string" && /^#[0-9a-fA-F]{6}$/.test(b.color)
      ? b.color
      : "#e8b978";

  const base_face: BaseFace = BASE_FACES.includes(b.base_face as BaseFace)
    ? (b.base_face as BaseFace)
    : "white";

  return { value: { name, nickname, color, base_face } };
}
