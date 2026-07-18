import { NextResponse } from "next/server";
import { all } from "@/lib/db";
import { createGame, listGames } from "@/lib/games";
import { parseGamePayload } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listGames());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = parseGamePayload(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const treasureIds = Array.from(
    new Set(parsed.value.players.flatMap((p) => p.treasure_ids))
  );
  if (treasureIds.length > 0) {
    const placeholders = treasureIds.map(() => "?").join(",");
    const found = await all<{ id: number }>(
      `SELECT id FROM treasures WHERE id IN (${placeholders})`,
      treasureIds
    );
    if (found.length !== treasureIds.length) {
      return NextResponse.json({ error: "algum tesouro selecionado não existe mais" }, { status: 400 });
    }
  }

  return NextResponse.json(await createGame(parsed.value), { status: 201 });
}
