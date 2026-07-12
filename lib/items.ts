import type BetterSqlite3 from "better-sqlite3";
import { getDb, nowIso } from "./db";

export function listItems(): { id: number; name: string }[] {
  return getDb()
    .prepare("SELECT id, name FROM items ORDER BY name COLLATE NOCASE")
    .all() as { id: number; name: string }[];
}

/** Resolve um item por nome (case-insensitive), criando-o se não existir. */
export function resolveItemId(db: BetterSqlite3.Database, name: string): number {
  const trimmed = name.trim();
  const existing = db
    .prepare("SELECT id FROM items WHERE name = ?")
    .get(trimmed) as { id: number } | undefined;
  if (existing) return existing.id;
  const res = db
    .prepare("INSERT INTO items (name, first_seen_at) VALUES (?, ?)")
    .run(trimmed, nowIso());
  return Number(res.lastInsertRowid);
}
