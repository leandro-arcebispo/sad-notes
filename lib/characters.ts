import { getDb } from "./db";
import type { Character } from "./types";

export function listCharacters(includeInactive = false): Character[] {
  const where = includeInactive ? "" : "WHERE active = 1";
  return getDb()
    .prepare(
      `SELECT * FROM characters ${where}
       ORDER BY tainted, expansion, name COLLATE NOCASE`
    )
    .all() as Character[];
}
