import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { getDb, getSetting, nowIso } from "./db";
import type { Sprite } from "./types";

const PUBLIC_DIR = path.join(process.cwd(), "public");

function spritesDir(): string {
  return getSetting("sprites_dir") || "sprites";
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

export function listSprites(): Sprite[] {
  return getDb()
    .prepare("SELECT * FROM sprites ORDER BY category COLLATE NOCASE, name COLLATE NOCASE")
    .all() as Sprite[];
}

export function listSpriteCategories(): string[] {
  const rows = getDb()
    .prepare("SELECT DISTINCT category FROM sprites ORDER BY category COLLATE NOCASE")
    .all() as { category: string }[];
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

export function createSprite(input: CreateSpriteInput): Sprite {
  const m = /^data:image\/png;base64,(.+)$/s.exec(input.dataUrl.trim());
  if (!m) throw new Error("dataUrl inválido (esperado PNG base64)");
  const buffer = Buffer.from(m[1], "base64");

  const base = spritesDir();
  const catSlug = slugify(input.category || "outro");
  const dir = path.join(PUBLIC_DIR, base, catSlug);
  fs.mkdirSync(dir, { recursive: true });

  const suffix = crypto.randomBytes(3).toString("hex");
  const filename = `${slugify(input.name)}-${suffix}.png`;
  fs.writeFileSync(path.join(dir, filename), buffer);

  const relPath = `${base}/${catSlug}/${filename}`; // servido em /<relPath>
  const res = getDb()
    .prepare(
      `INSERT INTO sprites
         (name, category, path, width, height, source_sheet, sx, sy, sw, sh, created_at)
       VALUES (@name, @category, @path, @width, @height, @source_sheet, @sx, @sy, @sw, @sh, @created_at)`
    )
    .run({
      name: input.name.trim(),
      category: (input.category || "outro").trim(),
      path: relPath,
      width: input.width,
      height: input.height,
      source_sheet: input.source_sheet,
      sx: input.sx,
      sy: input.sy,
      sw: input.sw,
      sh: input.sh,
      created_at: nowIso(),
    });

  return getDb()
    .prepare("SELECT * FROM sprites WHERE id = ?")
    .get(Number(res.lastInsertRowid)) as Sprite;
}

export function deleteSprite(id: number): boolean {
  const row = getDb().prepare("SELECT path FROM sprites WHERE id = ?").get(id) as
    | { path: string }
    | undefined;
  if (!row) return false;

  // Remove o arquivo, garantindo que fica dentro de /public (defesa básica).
  const abs = path.join(PUBLIC_DIR, row.path);
  if (abs.startsWith(PUBLIC_DIR) && fs.existsSync(abs)) {
    try {
      fs.unlinkSync(abs);
    } catch {
      /* arquivo já ausente — segue e remove a linha */
    }
  }
  getDb().prepare("DELETE FROM sprites WHERE id = ?").run(id);
  return true;
}
