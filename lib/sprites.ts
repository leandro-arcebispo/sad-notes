import crypto from "node:crypto";
import { all, get, getClient, getSetting, run, nowIso } from "./db";
import { putImage, deleteImage } from "./storage";
import type { Sprite } from "./types";

async function spritesDir(): Promise<string> {
  return (await getSetting("sprites_dir")) || "sprites";
}

function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // remove acentos/diacríticos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sprite"
  );
}

export async function listSprites(): Promise<Sprite[]> {
  return all<Sprite>(
    "SELECT * FROM sprites ORDER BY category COLLATE NOCASE, name COLLATE NOCASE"
  );
}

export async function listSpriteCategories(): Promise<string[]> {
  const rows = await all<{ category: string }>(
    "SELECT DISTINCT category FROM sprites ORDER BY category COLLATE NOCASE"
  );
  return rows.map((r) => r.category);
}

export interface CreateSpriteInput {
  name: string;
  category: string;
  dataUrl: string; // data:image/png;base64,....
  width: number;
  height: number;
  source_sheet: string | null;
  sx: number | null;
  sy: number | null;
  sw: number | null;
  sh: number | null;
}

export async function createSprite(input: CreateSpriteInput): Promise<Sprite> {
  const m = /^data:image\/png;base64,(.+)$/s.exec(input.dataUrl.trim());
  if (!m) throw new Error("dataUrl inválido (esperado PNG base64)");
  const buffer = Buffer.from(m[1], "base64");

  const base = await spritesDir();
  const catSlug = slugify(input.category || "outro");
  const suffix = crypto.randomBytes(3).toString("hex");
  const filename = `${slugify(input.name)}-${suffix}.png`;
  const key = `${base}/${catSlug}/${filename}`;
  const ref = await putImage(key, buffer, "image/png"); // URL do Blob (prod) ou /path (dev)

  const { lastId } = await run(
    `INSERT INTO sprites
       (name, category, path, width, height, source_sheet, sx, sy, sw, sh, created_at)
     VALUES (@name, @category, @path, @width, @height, @source_sheet, @sx, @sy, @sw, @sh, @created_at)`,
    {
      name: input.name.trim(),
      category: (input.category || "outro").trim(),
      path: ref,
      width: input.width,
      height: input.height,
      source_sheet: input.source_sheet,
      sx: input.sx,
      sy: input.sy,
      sw: input.sw,
      sh: input.sh,
      created_at: nowIso(),
    }
  );

  return (await get<Sprite>("SELECT * FROM sprites WHERE id = ?", [lastId]))!;
}

export async function deleteSprite(id: number): Promise<boolean> {
  const row = await get<{ path: string }>("SELECT path FROM sprites WHERE id = ?", [id]);
  if (!row) return false;

  await deleteImage(row.path);
  // Cascata manual: player_ornaments → ornaments (deste sprite) → sprite.
  const db = await getClient();
  await db.batch(
    [
      {
        sql: "DELETE FROM player_ornaments WHERE ornament_id IN (SELECT id FROM ornaments WHERE sprite_id = ?)",
        args: [id],
      },
      { sql: "DELETE FROM ornaments WHERE sprite_id = ?", args: [id] },
      { sql: "DELETE FROM sprites WHERE id = ?", args: [id] },
    ],
    "write"
  );
  return true;
}
