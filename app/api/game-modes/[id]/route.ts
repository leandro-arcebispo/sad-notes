import { NextResponse } from "next/server";
import { archiveGameMode, getGameMode, updateGameMode } from "@/lib/game-modes";
import { parseGameModeInput } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const mode = await getGameMode(Number((await params).id));
  if (!mode) return NextResponse.json({ error: "modo não encontrado" }, { status: 404 });
  return NextResponse.json(mode);
}

/**
 * ⚠️ Editar um modo **não altera partida nenhuma** já registrada: no Setup os
 * parâmetros são copiados pra `games.params_json`. É a regra do §5 do plano —
 * preset é template, não histórico.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const parsed = parseGameModeInput(await req.json().catch(() => null));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const updated = await updateGameMode(Number((await params).id), parsed.value);
  if (!updated) {
    return NextResponse.json({ error: "modo não encontrado" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

/** Arquiva (soft-delete). Preset semeado não é apagável — o usuário copia e
 * edita a cópia. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const res = await archiveGameMode(Number((await params).id));
  if (res === "notfound") {
    return NextResponse.json({ error: "modo não encontrado" }, { status: 404 });
  }
  if (res === "preset") {
    return NextResponse.json(
      { error: "preset do app não pode ser removido — duplique e edite a cópia" },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}
