import { all } from "./db";
import type { Character } from "./types";

export async function listCharacters(includeInactive = false): Promise<Character[]> {
  const where = includeInactive ? "" : "WHERE active = 1";
  return all<Character>(
    `SELECT * FROM characters ${where}
     ORDER BY tainted, expansion, name COLLATE NOCASE`
  );
}
