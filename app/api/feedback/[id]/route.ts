import { NextResponse } from "next/server";
import { updateFeedbackStatus, deleteFeedback } from "@/lib/feedback";
import { FEEDBACK_STATUSES, type FeedbackStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const b = await req.json().catch(() => null);
  const status = (b as { status?: string } | null)?.status;
  if (!FEEDBACK_STATUSES.includes(status as FeedbackStatus)) {
    return NextResponse.json({ error: "status inválido" }, { status: 400 });
  }
  const ok = updateFeedbackStatus(id, status as FeedbackStatus);
  if (!ok) {
    return NextResponse.json({ error: "item não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const ok = deleteFeedback(Number((await params).id));
  if (!ok) {
    return NextResponse.json({ error: "item não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
