import { NextResponse } from "next/server";
import { listFeedback, createFeedback } from "@/lib/feedback";
import { parseFeedbackInput } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listFeedback());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = parseFeedbackInput(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  return NextResponse.json(createFeedback(parsed.value), { status: 201 });
}
