import { getDb } from "./db";
import type { BaseFace } from "./types";

export interface RankingRow {
  rank: number;
  player_id: number;
  name: string;
  color: string;
  base_face: BaseFace;
  avatar_cache: string | null;
  games: number;
  wins: number;
  win_pct: number; // 0..1
  souls: number;
  coins: number;
  deaths: number;
  treasures: number;
  streak: number; // sequência de vitórias mais recente
}

/**
 * Ranking derivado das partidas (Global Board). Só entram jogadores que já
 * jogaram ao menos uma partida. Ordenação: vitórias ↓, depois win% ↓, depois
 * almas ↓. O ranking nunca é digitado — é sempre calculado daqui.
 */
export function getRanking(): RankingRow[] {
  const db = getDb();

  const agg = db
    .prepare(
      `SELECT p.id AS player_id, p.name, p.color, p.base_face, p.avatar_cache,
              COUNT(gp.id)              AS games,
              COALESCE(SUM(gp.is_winner), 0) AS wins,
              COALESCE(SUM(gp.souls), 0)     AS souls,
              COALESCE(SUM(gp.coins), 0)     AS coins,
              COALESCE(SUM(gp.deaths), 0)    AS deaths,
              COALESCE(SUM(gp.treasures), 0) AS treasures
         FROM players p
         JOIN game_players gp ON gp.player_id = p.id
        GROUP BY p.id`
    )
    .all() as Omit<RankingRow, "rank" | "win_pct" | "streak">[];

  const streaks = computeStreaks(db);

  const rows: RankingRow[] = agg.map((r) => ({
    ...r,
    win_pct: r.games > 0 ? r.wins / r.games : 0,
    streak: streaks.get(r.player_id) ?? 0,
    rank: 0,
  }));

  rows.sort(
    (a, b) =>
      b.wins - a.wins || b.win_pct - a.win_pct || b.souls - a.souls ||
      a.name.localeCompare(b.name)
  );
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

/** Sequência de vitórias mais recente de cada jogador (partidas mais novas primeiro). */
function computeStreaks(db: ReturnType<typeof getDb>): Map<number, number> {
  const seq = db
    .prepare(
      `SELECT gp.player_id, gp.is_winner
         FROM game_players gp
         JOIN games g ON g.id = gp.game_id
        ORDER BY gp.player_id, g.played_at DESC, g.id DESC`
    )
    .all() as { player_id: number; is_winner: number }[];

  const out = new Map<number, number>();
  const stopped = new Set<number>();
  for (const { player_id, is_winner } of seq) {
    if (stopped.has(player_id)) continue;
    if (is_winner === 1) {
      out.set(player_id, (out.get(player_id) ?? 0) + 1);
    } else {
      stopped.add(player_id);
      if (!out.has(player_id)) out.set(player_id, 0);
    }
  }
  return out;
}
