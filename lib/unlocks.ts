import { all, get } from "./db";
import type { UnlockMode } from "./types";

/**
 * Sistema de desbloqueio de cosméticos — escalável por design: cada modo é
 * uma entrada neste registro. Adicionar um modo novo no futuro (ex.: vitórias
 * acumuladas, concessão manual) é só somar uma entrada aqui; nada mais no
 * sistema precisa mudar.
 */

interface PlayerUnlockContext {
  /** Tesouros que o jogador já possuiu ao terminar alguma partida (registro novo). */
  treasureIdsFromGames: Set<number>;
  /** Nomes (lowercase) de itens de texto livre legados que o jogador já possuiu —
   * casamento por nome permite que "promover" um item antigo a Tesouro
   * desbloqueie retroativamente. */
  legacyItemNames: Set<string>;
}

interface TreasureUnlockInfo {
  id: number;
  name: string;
  unlock_mode: UnlockMode;
}

interface UnlockModeDef {
  label: string;
  isUnlocked(treasure: TreasureUnlockInfo, ctx: PlayerUnlockContext): boolean;
}

const UNLOCK_MODE_DEFS: Record<UnlockMode, UnlockModeDef> = {
  treasure_item: {
    label: "Terminar partida com o item",
    isUnlocked: (treasure, ctx) =>
      ctx.treasureIdsFromGames.has(treasure.id) ||
      ctx.legacyItemNames.has(treasure.name.toLowerCase()),
  },
  always: {
    label: "Sempre disponível",
    isUnlocked: () => true,
  },
};

async function loadPlayerContext(playerId: number): Promise<PlayerUnlockContext> {
  const [treasureRows, itemRows] = await Promise.all([
    all<{ treasure_id: number }>(
      `SELECT DISTINCT gpt.treasure_id
         FROM game_player_treasures gpt
         JOIN game_players gp ON gp.id = gpt.game_player_id
        WHERE gp.player_id = ?`,
      [playerId]
    ),
    all<{ name: string }>(
      `SELECT DISTINCT i.name
         FROM game_player_items gpi
         JOIN game_players gp ON gp.id = gpi.game_player_id
         JOIN items i ON i.id = gpi.item_id
        WHERE gp.player_id = ?`,
      [playerId]
    ),
  ]);
  return {
    treasureIdsFromGames: new Set(treasureRows.map((r) => r.treasure_id)),
    legacyItemNames: new Set(itemRows.map((r) => r.name.toLowerCase())),
  };
}

/** Ids dos Tesouros desbloqueados para um jogador — uma consulta ao contexto
 * do jogador, avaliada contra o `unlock_mode` de cada Tesouro. */
export async function getUnlockedTreasureIds(playerId: number): Promise<Set<number>> {
  const [treasures, ctx] = await Promise.all([
    all<TreasureUnlockInfo>("SELECT id, name, unlock_mode FROM treasures"),
    loadPlayerContext(playerId),
  ]);
  const unlocked = new Set<number>();
  for (const t of treasures) {
    if (UNLOCK_MODE_DEFS[t.unlock_mode]?.isUnlocked(t, ctx)) unlocked.add(t.id);
  }
  return unlocked;
}

/** Confere o desbloqueio de UM Tesouro específico — usado como trava no
 * servidor antes de aplicar um cosmético (a UI só oferecer os desbloqueados é
 * conveniência; isto aqui é a validação real). */
export async function isTreasureUnlockedForPlayer(
  playerId: number,
  treasureId: number
): Promise<boolean> {
  const treasure = await get<TreasureUnlockInfo>(
    "SELECT id, name, unlock_mode FROM treasures WHERE id = ?",
    [treasureId]
  );
  if (!treasure) return false;
  const def = UNLOCK_MODE_DEFS[treasure.unlock_mode];
  if (!def) return false;
  const ctx = await loadPlayerContext(playerId);
  return def.isUnlocked(treasure, ctx);
}
