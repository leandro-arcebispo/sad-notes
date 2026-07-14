import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { setAvatarCache } from "@/lib/player-avatar";
import { putImage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Recebe o PNG do avatar composto no cliente (Canvas), grava na storage
 * (Blob em prod / disco em dev) e atualiza players.avatar_cache. */
export async function PUT(req: Request, { params }: Ctx) {
  const playerId = Number((await params).id);
  const b = await req.json().catch(() => null);
  const dataUrl = typeof b?.dataUrl === "string" ? b.dataUrl : "";
  const m = /^data:image\/png;base64,(.+)$/s.exec(dataUrl.trim());
  if (!m) {
    return NextResponse.json({ error: "imagem inválida" }, { status: 400 });
  }
  const buffer = Buffer.from(m[1], "base64");
  const suffix = crypto.randomBytes(3).toString("hex");
  const ref = await putImage(`avatars/player-${playerId}-${suffix}.png`, buffer, "image/png");
  await setAvatarCache(playerId, ref);
  return NextResponse.json({ avatar_cache: ref });
}

/** Limpa o cache (avatar volta a ser só o rosto base). */
export async function DELETE(_req: Request, { params }: Ctx) {
  const playerId = Number((await params).id);
  await setAvatarCache(playerId, null);
  return NextResponse.json({ avatar_cache: null });
}
