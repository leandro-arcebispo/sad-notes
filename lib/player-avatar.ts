import { all, getClient, run, nowIso } from "./db";
import { getPlayer } from "./players";
import { deleteImage } from "./storage";
import type { AppliedOrnament, AvatarRecipe, OrnamentFull } from "./types";

type OrnRow = OrnamentFull & { row_id: number; sort_order: number };

async function rowsForPlayer(playerId: number): Promise<OrnRow[]> {
  return all<OrnRow>(
    `SELECT po.id AS row_id, po.sort_order, o.*, s.path AS sprite_path, s.name AS sprite_name,
            s.width AS sprite_width, s.height AS sprite_height
       FROM player_ornaments po
       JOIN ornaments o ON o.id = po.ornament_id
       JOIN sprites s ON s.id = o.sprite_id
      WHERE po.player_id = ?
      ORDER BY po.sort_order`,
    [playerId]
  );
}

export async function getAvatarRecipe(playerId: number): Promise<AvatarRecipe> {
  const player = await getPlayer(playerId);
  if (!player) throw new Error("jogador não encontrado");
  const rows = await rowsForPlayer(playerId);
  const hair = (rows.find((r) => r.category === "cabelo") as AppliedOrnament) ?? null;
  const diversos = rows.filter((r) => r.category === "diverso") as AppliedOrnament[];
  return { base_face: player.base_face, hair_color: player.hair_color, hair, diversos };
}

/**
 * Grava a referência do avatar composto (PNG gerado no cliente e enviado pra
 * storage), apagando a imagem anterior. `ref` é a URL do Blob (prod) ou o
 * caminho local (dev); `null` limpa o cache (volta pro rosto base).
 */
export async function setAvatarCache(
  playerId: number,
  ref: string | null
): Promise<void> {
  const player = await getPlayer(playerId);
  if (!player) return;
  if (player.avatar_cache && player.avatar_cache !== ref) {
    await deleteImage(player.avatar_cache);
  }
  await run("UPDATE players SET avatar_cache = ? WHERE id = ?", [ref, playerId]);
}

/** Define (ou remove, se `ornamentId` for null) o cabelo do jogador — substitui o anterior. */
export async function setPlayerHair(
  playerId: number,
  ornamentId: number | null
): Promise<AvatarRecipe> {
  const db = await getClient();
  const stmts = [
    {
      sql: `DELETE FROM player_ornaments
              WHERE player_id = ? AND ornament_id IN (SELECT id FROM ornaments WHERE category = 'cabelo')`,
      args: [playerId] as (number | string)[],
    },
  ];
  if (ornamentId) {
    stmts.push({
      sql: "INSERT INTO player_ornaments (player_id, ornament_id, sort_order, created_at) VALUES (?, ?, 0, ?)",
      args: [playerId, ornamentId, nowIso()],
    });
  }
  await db.batch(stmts, "write");
  return getAvatarRecipe(playerId);
}

/** Adiciona um item "diverso" no topo da pilha (aparece por cima dos demais). */
export async function addPlayerDiverso(
  playerId: number,
  ornamentId: number
): Promise<AvatarRecipe> {
  const rows = await all<{ max: number }>(
    `SELECT COALESCE(MAX(po.sort_order), 0) AS max
       FROM player_ornaments po JOIN ornaments o ON o.id = po.ornament_id
      WHERE po.player_id = ? AND o.category = 'diverso'`,
    [playerId]
  );
  const max = rows[0]?.max ?? 0;
  await run(
    "INSERT INTO player_ornaments (player_id, ornament_id, sort_order, created_at) VALUES (?, ?, ?, ?)",
    [playerId, ornamentId, max + 1, nowIso()]
  );
  return getAvatarRecipe(playerId);
}

export async function removePlayerOrnament(
  playerId: number,
  rowId: number
): Promise<AvatarRecipe> {
  await run("DELETE FROM player_ornaments WHERE id = ? AND player_id = ?", [rowId, playerId]);
  return getAvatarRecipe(playerId);
}

/** Move um "diverso" uma posição na pilha (troca sort_order com o vizinho). */
export async function moveDiverso(
  playerId: number,
  rowId: number,
  direction: "up" | "down"
): Promise<AvatarRecipe> {
  const rows = await all<{ id: number; sort_order: number }>(
    `SELECT po.id, po.sort_order
       FROM player_ornaments po JOIN ornaments o ON o.id = po.ornament_id
      WHERE po.player_id = ? AND o.category = 'diverso'
      ORDER BY po.sort_order`,
    [playerId]
  );

  const idx = rows.findIndex((r) => r.id === rowId);
  const swapIdx = direction === "up" ? idx + 1 : idx - 1; // "up" na pilha = sort_order maior
  if (idx === -1 || swapIdx < 0 || swapIdx >= rows.length) return getAvatarRecipe(playerId);

  const a = rows[idx];
  const b = rows[swapIdx];
  const db = await getClient();
  await db.batch(
    [
      { sql: "UPDATE player_ornaments SET sort_order = ? WHERE id = ?", args: [b.sort_order, a.id] },
      { sql: "UPDATE player_ornaments SET sort_order = ? WHERE id = ?", args: [a.sort_order, b.id] },
    ],
    "write"
  );
  return getAvatarRecipe(playerId);
}
