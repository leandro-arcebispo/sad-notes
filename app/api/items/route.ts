import { NextResponse } from "next/server";
import { listItems } from "@/lib/items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listItems());
}
