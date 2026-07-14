import { NextResponse } from "next/server";
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
  return NextResponse.json(await createGame(parsed.value), { status: 201 });
}
