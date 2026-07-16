import crypto from "node:crypto";
import { all, get, run, nowIso } from "./db";
import { putImage, deleteImage } from "./storage";
import type { SpriteSheet } from "./types";

function slug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "") // tira extensão do nome do arquivo
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sheet"
  );
}

export async function listSheets(): Promise<SpriteSheet[]> {
  return all<SpriteSheet>("SELECT * FROM sheets ORDER BY created_at DESC, id DESC");
}

export interface CreateSheetInput {
  name: string;
  dataUrl: string; // data:image/(png|jpeg|webp|gif);base64,...
  width: number;
  height: number;
}

export async function createSheet(input: CreateSheetInput): Promise<SpriteSheet> {
  const m = /^data:image\/(png|jpeg|webp|gif);base64,(.+)$/s.exec(input.dataUrl.trim());
  if (!m) throw new Error("imagem inválida (esperado PNG/JPEG/WEBP/GIF base64)");
  const type = m[1];
  const ext = type === "jpeg" ? "jpg" : type;
  const buffer = Buffer.from(m[2], "base64");

  const suffix = crypto.randomBytes(3).toString("hex");
  const key = `sheets/${slug(input.name)}-${suffix}.${ext}`;
  const ref = await putImage(key, buffer, `image/${type}`);

  const { lastId } = await run(
    `INSERT INTO sheets (name, path, width, height, created_at)
     VALUES (@name, @path, @width, @height, @created_at)`,
    {
      name: input.name.trim(),
      path: ref,
      width: input.width,
      height: input.height,
      created_at: nowIso(),
    }
  );
  return (await get<SpriteSheet>("SELECT * FROM sheets WHERE id = ?", [lastId]))!;
}

export async function deleteSheet(id: number): Promise<boolean> {
  const row = await get<{ path: string }>("SELECT path FROM sheets WHERE id = ?", [id]);
  if (!row) return false;
  await deleteImage(row.path);
  await run("DELETE FROM sheets WHERE id = ?", [id]);
  return true;
}
