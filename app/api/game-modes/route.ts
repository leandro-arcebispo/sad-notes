import { NextResponse } from "next/server";
import { createGameMode, listGameModes } from "@/lib/game-modes";
import { parseGameModeInput } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listGameModes());
}

/** Modo novo sempre nasce como "sandbox" do usuário (`is_preset = 0`) — os
 * presets semeados só saem de `lib/seed-game-modes.ts`. */
export async function POST(req: Request) {
  const parsed = parseGameModeInput(await req.json().catch(() => null));
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    return NextResponse.json(await createGameMode(parsed.value), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "já existe um modo com esse nome" }, { status: 409 });
    }
    throw e;
  }
}
