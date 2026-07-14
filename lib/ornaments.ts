import { all, get, getClient, run, nowIso } from "./db";
import type { OrnamentFull, OrnamentInput } from "./types";

const SELECT_FULL = `SELECT o.*, s.path AS sprite_path, s.name AS sprite_name,
              s.width AS sprite_width, s.height AS sprite_height
         FROM ornaments o JOIN sprites s ON s.id = o.sprite_id`;

export async function listOrnaments(): Promise<OrnamentFull[]> {
  return all<OrnamentFull>(
    `${SELECT_FULL} ORDER BY o.category, o.name COLLATE NOCASE`
  );
}

export async function createOrnament(input: OrnamentInput): Promise<OrnamentFull> {
  const { lastId } = await run(
    `INSERT INTO ornaments (sprite_id, name, category, offset_x, offset_y, scale, created_at)
     VALUES (@sprite_id, @name, @category, @offset_x, @offset_y, @scale, @created_at)`,
    { ...input, created_at: nowIso() }
  );
  return (await get<OrnamentFull>(`${SELECT_FULL} WHERE o.id = ?`, [lastId]))!;
}

export async function deleteOrnament(id: number): Promise<boolean> {
  // Cascata manual (as FKs não são forçadas via conexões HTTP do libSQL):
  // remove primeiro os player_ornaments que referenciam este ornamento.
  const db = await getClient();
  const res = await db.batch(
    [
      { sql: "DELETE FROM player_ornaments WHERE ornament_id = ?", args: [id] },
      { sql: "DELETE FROM ornaments WHERE id = ?", args: [id] },
    ],
    "write"
  );
  return res[1].rowsAffected > 0;
}
