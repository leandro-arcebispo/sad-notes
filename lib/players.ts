import { getDb, nowIso } from "./db";
import type { Player, PlayerInput } from "./types";

export function listPlayers(includeInactive = true): Player[] {
  const where = includeInactive ? "" : "WHERE active = 1";
  return getDb()
    .prepare(`SELECT * FROM players ${where} ORDER BY active DESC, name COLLATE NOCASE`)
    .all() as Player[];
}

export function getPlayer(id: number): Player | undefined {
  return getDb().prepare("SELECT * FROM players WHERE id = ?").get(id) as
    | Player
    | undefined;
}

export function createPlayer(input: PlayerInput): Player {
  const res = getDb()
    .prepare(
      `INSERT INTO players (name, nickname, color, base_face, hair_color, created_at)
       VALUES (@name, @nickname, @color, @base_face, @hair_color, @created_at)`
    )
    .run({ ...input, created_at: nowIso() });
  return getPlayer(Number(res.lastInsertRowid))!;
}

/** Atualização parcial: aceita qualquer subconjunto dos campos editáveis + `active`. */
export function updatePlayer(
  id: number,
  patch: Partial<PlayerInput & { active: number }>
): Player | undefined {
  const fields = ["name", "nickname", "color", "base_face", "hair_color", "active"] as const;
  const set: string[] = [];
  const values: Record<string, unknown> = { id };
  for (const f of fields) {
    if (patch[f] !== undefined) {
      set.push(`${f} = @${f}`);
      values[f] = patch[f];
    }
  }
  if (set.length === 0) return getPlayer(id);
  getDb()
    .prepare(`UPDATE players SET ${set.join(", ")} WHERE id = @id`)
    .run(values);
  return getPlayer(id);
}

export function setPlayerActive(id: number, active: boolean): Player | undefined {
  return updatePlayer(id, { active: active ? 1 : 0 });
}
