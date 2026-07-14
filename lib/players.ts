import { all, get, run, nowIso } from "./db";
import type { Player, PlayerInput } from "./types";

export async function listPlayers(includeInactive = true): Promise<Player[]> {
  const where = includeInactive ? "" : "WHERE active = 1";
  return all<Player>(
    `SELECT * FROM players ${where} ORDER BY active DESC, name COLLATE NOCASE`
  );
}

export async function getPlayer(id: number): Promise<Player | undefined> {
  return get<Player>("SELECT * FROM players WHERE id = ?", [id]);
}

export async function createPlayer(input: PlayerInput): Promise<Player> {
  const { lastId } = await run(
    `INSERT INTO players (name, nickname, color, base_face, hair_color, created_at)
     VALUES (@name, @nickname, @color, @base_face, @hair_color, @created_at)`,
    { ...input, created_at: nowIso() }
  );
  return (await getPlayer(lastId))!;
}

/** Atualização parcial: aceita qualquer subconjunto dos campos editáveis + `active`. */
export async function updatePlayer(
  id: number,
  patch: Partial<PlayerInput & { active: number }>
): Promise<Player | undefined> {
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
  await run(`UPDATE players SET ${set.join(", ")} WHERE id = @id`, values as never);
  return getPlayer(id);
}

export async function setPlayerActive(
  id: number,
  active: boolean
): Promise<Player | undefined> {
  return updatePlayer(id, { active: active ? 1 : 0 });
}
