import { getDb, nowIso } from "./db";
import { getPlayer } from "./players";
import { writeAvatarCache } from "./avatar-compose";
import type { AppliedOrnament, AvatarRecipe, OrnamentFull } from "./types";

function rowsForPlayer(playerId: number): (OrnamentFull & { row_id: number; sort_order: number })[] {
  return getDb()
    .prepare(
      `SELECT po.id AS row_id, po.sort_order, o.*, s.path AS sprite_path, s.name AS sprite_name,
              s.width AS sprite_width, s.height AS sprite_height
         FROM player_ornaments po
         JOIN ornaments o ON o.id = po.ornament_id
         JOIN sprites s ON s.id = o.sprite_id
        WHERE po.player_id = ?
        ORDER BY po.sort_order`
    )
    .all(playerId) as (OrnamentFull & { row_id: number; sort_order: number })[];
}

export function getAvatarRecipe(playerId: number): AvatarRecipe {
  const player = getPlayer(playerId);
  if (!player) throw new Error("jogador não encontrado");
  const rows = rowsForPlayer(playerId);
  const hair = (rows.find((r) => r.category === "cabelo") as AppliedOrnament) ?? null;
  const diversos = rows.filter((r) => r.category === "diverso") as AppliedOrnament[];
  return { base_face: player.base_face, hair, diversos };
}

async function regenerateCache(playerId: number): Promise<void> {
  const player = getPlayer(playerId);
  if (!player) return;
  const recipe = getAvatarRecipe(playerId);
  const newPath = await writeAvatarCache(playerId, recipe, player.avatar_cache);
  // avatar_cache não é um campo do formulário de jogador (PlayerInput) — atualiza direto.
  getDb().prepare("UPDATE players SET avatar_cache = ? WHERE id = ?").run(newPath, playerId);
}

/** Define (ou remove, se `ornamentId` for null) o cabelo do jogador — substitui o anterior. */
export async function setPlayerHair(playerId: number, ornamentId: number | null): Promise<AvatarRecipe> {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `DELETE FROM player_ornaments
        WHERE player_id = ? AND ornament_id IN (SELECT id FROM ornaments WHERE category = 'cabelo')`
    ).run(playerId);
    if (ornamentId) {
      db.prepare(
        "INSERT INTO player_ornaments (player_id, ornament_id, sort_order, created_at) VALUES (?, ?, 0, ?)"
      ).run(playerId, ornamentId, nowIso());
    }
  });
  tx();
  await regenerateCache(playerId);
  return getAvatarRecipe(playerId);
}

/** Adiciona um item "diverso" no topo da pilha (aparece por cima dos demais). */
export async function addPlayerDiverso(playerId: number, ornamentId: number): Promise<AvatarRecipe> {
  const db = getDb();
  const { max } = db
    .prepare(
      `SELECT COALESCE(MAX(po.sort_order), 0) AS max
         FROM player_ornaments po JOIN ornaments o ON o.id = po.ornament_id
        WHERE po.player_id = ? AND o.category = 'diverso'`
    )
    .get(playerId) as { max: number };
  db.prepare(
    "INSERT INTO player_ornaments (player_id, ornament_id, sort_order, created_at) VALUES (?, ?, ?, ?)"
  ).run(playerId, ornamentId, max + 1, nowIso());
  await regenerateCache(playerId);
  return getAvatarRecipe(playerId);
}

export async function removePlayerOrnament(playerId: number, rowId: number): Promise<AvatarRecipe> {
  getDb().prepare("DELETE FROM player_ornaments WHERE id = ? AND player_id = ?").run(rowId, playerId);
  await regenerateCache(playerId);
  return getAvatarRecipe(playerId);
}

/** Move um "diverso" uma posição na pilha (troca sort_order com o vizinho). */
export async function moveDiverso(
  playerId: number,
  rowId: number,
  direction: "up" | "down"
): Promise<AvatarRecipe> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT po.id, po.sort_order
         FROM player_ornaments po JOIN ornaments o ON o.id = po.ornament_id
        WHERE po.player_id = ? AND o.category = 'diverso'
        ORDER BY po.sort_order`
    )
    .all(playerId) as { id: number; sort_order: number }[];

  const idx = rows.findIndex((r) => r.id === rowId);
  const swapIdx = direction === "up" ? idx + 1 : idx - 1; // "up" na pilha = mais por cima = sort_order maior
  if (idx === -1 || swapIdx < 0 || swapIdx >= rows.length) return getAvatarRecipe(playerId);

  const a = rows[idx];
  const b = rows[swapIdx];
  const tx = db.transaction(() => {
    db.prepare("UPDATE player_ornaments SET sort_order = ? WHERE id = ?").run(b.sort_order, a.id);
    db.prepare("UPDATE player_ornaments SET sort_order = ? WHERE id = ?").run(a.sort_order, b.id);
  });
  tx();
  await regenerateCache(playerId);
  return getAvatarRecipe(playerId);
}
