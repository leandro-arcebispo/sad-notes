import { NextResponse } from "next/server";
import { listItems } from "@/lib/items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listItems());
}
