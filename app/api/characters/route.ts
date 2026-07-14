import { NextResponse } from "next/server";
import { listCharacters } from "@/lib/characters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listCharacters());
}
