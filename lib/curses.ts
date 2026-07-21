import { all, get, run, nowIso } from "./db";
import type { Curse, CurseFull, CurseInput } from "./types";

const SELECT_FULL = `
  SELECT c.*,
         sc.path AS card_sprite_path,
         sc.name AS card_sprite_name
    FROM curses c
    LEFT JOIN sprites sc ON sc.id = c.card_sprite_id
`;

export async function listCurses(): Promise<CurseFull[]> {
  return all<CurseFull>(`${SELECT_FULL} ORDER BY c.locked ASC, c.name COLLATE NOCASE`);
}

export async function getCurse(id: number): Promise<CurseFull | undefined> {
  return get<CurseFull>(`${SELECT_FULL} WHERE c.id = ?`, [id]);
}

export async function createCurse(input: CurseInput): Promise<CurseFull> {
  const { lastId } = await run(
    "INSERT INTO curses (name, card_sprite_id, locked, created_at) VALUES (?, ?, ?, ?)",
    [input.name, input.card_sprite_id, input.locked ? 1 : 0, nowIso()]
  );
  return (await getCurse(lastId))!;
}

export async function updateCurse(
  id: number,
  input: CurseInput
): Promise<CurseFull | undefined> {
  const existing = await get<Curse>("SELECT * FROM curses WHERE id = ?", [id]);
  if (!existing) return undefined;
  await run("UPDATE curses SET name = ?, card_sprite_id = ?, locked = ? WHERE id = ?", [
    input.name,
    input.card_sprite_id,
    input.locked ? 1 : 0,
    id,
  ]);
  return getCurse(id);
}

export async function deleteCurse(id: number): Promise<boolean> {
  const { changes } = await run("DELETE FROM curses WHERE id = ?", [id]);
  return changes > 0;
}
