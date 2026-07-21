import { all, get, run, nowIso } from "./db";
import type { Monster, MonsterFull, MonsterInput } from "./types";

const SELECT_FULL = `
  SELECT m.*,
         sc.path AS card_sprite_path,
         sc.name AS card_sprite_name
    FROM monsters m
    LEFT JOIN sprites sc ON sc.id = m.card_sprite_id
`;

export async function listMonsters(): Promise<MonsterFull[]> {
  return all<MonsterFull>(`${SELECT_FULL} ORDER BY m.name COLLATE NOCASE`);
}

export async function getMonster(id: number): Promise<MonsterFull | undefined> {
  return get<MonsterFull>(`${SELECT_FULL} WHERE m.id = ?`, [id]);
}

export async function createMonster(input: MonsterInput): Promise<MonsterFull> {
  const { lastId } = await run(
    "INSERT INTO monsters (name, card_sprite_id, created_at) VALUES (?, ?, ?)",
    [input.name, input.card_sprite_id, nowIso()]
  );
  return (await getMonster(lastId))!;
}

export async function updateMonster(
  id: number,
  input: MonsterInput
): Promise<MonsterFull | undefined> {
  const existing = await get<Monster>("SELECT * FROM monsters WHERE id = ?", [id]);
  if (!existing) return undefined;
  await run("UPDATE monsters SET name = ?, card_sprite_id = ? WHERE id = ?", [
    input.name,
    input.card_sprite_id,
    id,
  ]);
  return getMonster(id);
}

export async function deleteMonster(id: number): Promise<boolean> {
  const { changes } = await run("DELETE FROM monsters WHERE id = ?", [id]);
  return changes > 0;
}
