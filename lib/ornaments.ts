import { getDb, nowIso } from "./db";
import type { OrnamentFull, OrnamentInput } from "./types";

export function listOrnaments(): OrnamentFull[] {
  return getDb()
    .prepare(
      `SELECT o.*, s.path AS sprite_path, s.name AS sprite_name,
              s.width AS sprite_width, s.height AS sprite_height
         FROM ornaments o
         JOIN sprites s ON s.id = o.sprite_id
        ORDER BY o.category, o.name COLLATE NOCASE`
    )
    .all() as OrnamentFull[];
}

export function createOrnament(input: OrnamentInput): OrnamentFull {
  const db = getDb();
  const res = db
    .prepare(
      `INSERT INTO ornaments (sprite_id, name, category, offset_x, offset_y, scale, created_at)
       VALUES (@sprite_id, @name, @category, @offset_x, @offset_y, @scale, @created_at)`
    )
    .run({ ...input, created_at: nowIso() });
  return db
    .prepare(
      `SELECT o.*, s.path AS sprite_path, s.name AS sprite_name,
              s.width AS sprite_width, s.height AS sprite_height
         FROM ornaments o JOIN sprites s ON s.id = o.sprite_id
        WHERE o.id = ?`
    )
    .get(Number(res.lastInsertRowid)) as OrnamentFull;
}

export function deleteOrnament(id: number): boolean {
  const res = getDb().prepare("DELETE FROM ornaments WHERE id = ?").run(id);
  return res.changes > 0;
}
