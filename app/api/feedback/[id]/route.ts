import { NextResponse } from "next/server";
import { updateFeedback, deleteFeedback } from "@/lib/feedback";
import { parseFeedbackPatch } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const body = await req.json().catch(() => null);
  const parsed = parseFeedbackPatch(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const result = await updateFeedback(id, parsed.value);
  if (result === undefined) {
    return NextResponse.json({ error: "item não encontrado" }, { status: 404 });
  }
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = await deleteFeedback(Number((await params).id));
  if (!ok) {
    return NextResponse.json({ error: "item não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
