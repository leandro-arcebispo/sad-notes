import { NextResponse } from "next/server";
import { listPlayers, createPlayer } from "@/lib/players";
import { parsePlayerInput } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listPlayers());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = parsePlayerInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  return NextResponse.json(await createPlayer(parsed.value), { status: 201 });
}
