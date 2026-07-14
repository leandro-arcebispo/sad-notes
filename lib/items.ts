import type { Transaction } from "@libsql/client";
import { all, nowIso } from "./db";

export async function listItems(): Promise<{ id: number; name: string }[]> {
  return all<{ id: number; name: string }>(
    "SELECT id, name FROM items ORDER BY name COLLATE NOCASE"
  );
}

/** Resolve um item por nome (case-insensitive), criando-o se não existir.
 * Roda dentro da transação de criação de partida (recebe o `Transaction`). */
export async function resolveItemId(tx: Transaction, name: string): Promise<number> {
  const trimmed = name.trim();
  const existing = await tx.execute({
    sql: "SELECT id FROM items WHERE name = ?",
    args: [trimmed],
  });
  if (existing.rows.length) return Number(existing.rows[0][0]);
  const res = await tx.execute({
    sql: "INSERT INTO items (name, first_seen_at) VALUES (?, ?)",
    args: [trimmed, nowIso()],
  });
  return Number(res.lastInsertRowid);
}
