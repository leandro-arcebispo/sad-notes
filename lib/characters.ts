import { all, get, run } from "./db";
import type { Character, CharacterFull, CharacterInput } from "./types";

const SELECT_FULL = `
  SELECT c.*,
         sc.path AS card_sprite_path,
         si.path AS starter_item_sprite_path,
         scb.path AS card_back_sprite_path,
         sib.path AS starter_item_back_sprite_path
    FROM characters c
    LEFT JOIN sprites sc ON sc.id = c.card_sprite_id
    LEFT JOIN sprites si ON si.id = c.starter_item_sprite_id
    LEFT JOIN sprites scb ON scb.id = c.card_back_sprite_id
    LEFT JOIN sprites sib ON sib.id = c.starter_item_back_sprite_id
`;

export async function listCharacters(includeInactive = false): Promise<CharacterFull[]> {
  const where = includeInactive ? "" : "WHERE c.active = 1";
  return all<CharacterFull>(
    `${SELECT_FULL} ${where}
     ORDER BY c.tainted, c.expansion, c.name COLLATE NOCASE`
  );
}

export async function getCharacter(id: number): Promise<CharacterFull | undefined> {
  return get<CharacterFull>(`${SELECT_FULL} WHERE c.id = ?`, [id]);
}

export async function createCharacter(input: CharacterInput): Promise<CharacterFull> {
  const { lastId } = await run(
    `INSERT INTO characters
       (name, expansion, tainted, active, card_sprite_id, starter_item_sprite_id,
        starter_item_name, card_back_sprite_id, starter_item_back_sprite_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.expansion,
      input.tainted ? 1 : 0,
      input.active ? 1 : 0,
      input.card_sprite_id,
      input.starter_item_sprite_id,
      input.starter_item_name,
      input.card_back_sprite_id,
      input.starter_item_back_sprite_id,
    ]
  );
  return (await getCharacter(lastId))!;
}

export async function updateCharacter(
  id: number,
  input: CharacterInput
): Promise<CharacterFull | undefined> {
  const existing = await get<Character>("SELECT * FROM characters WHERE id = ?", [id]);
  if (!existing) return undefined;
  await run(
    `UPDATE characters
        SET name = ?, expansion = ?, tainted = ?, active = ?,
            card_sprite_id = ?, starter_item_sprite_id = ?, starter_item_name = ?,
            card_back_sprite_id = ?, starter_item_back_sprite_id = ?
      WHERE id = ?`,
    [
      input.name,
      input.expansion,
      input.tainted ? 1 : 0,
      input.active ? 1 : 0,
      input.card_sprite_id,
      input.starter_item_sprite_id,
      input.starter_item_name,
      input.card_back_sprite_id,
      input.starter_item_back_sprite_id,
      id,
    ]
  );
  return getCharacter(id);
}
