import { all, get, getClient, nowIso } from "./db";
import type {
  GameFull,
  GameListItem,
  GamePayload,
  GamePlayerRow,
  GameTreasureRef,
} from "./types";

export async function createGame(payload: GamePayload): Promise<GameFull> {
  const db = await getClient();
  const tx = await db.transaction("write");
  try {
    const gi = await tx.execute({
      sql: `INSERT INTO games
             (played_at, edition, souls_to_win, character_selection, format,
              tournament_id, duration_min, rounds, notes, created_at)
           VALUES
             (@played_at, @edition, @souls_to_win, @character_selection, @format,
              @tournament_id, @duration_min, @rounds, @notes, @created_at)`,
      args: {
        played_at: payload.played_at,
        edition: payload.edition,
        souls_to_win: payload.souls_to_win,
        character_selection: payload.character_selection,
        format: payload.format,
        tournament_id: payload.tournament_id,
        duration_min: payload.duration_min,
        rounds: payload.rounds,
        notes: payload.notes,
        created_at: nowIso(),
      },
    });
    const gameId = Number(gi.lastInsertRowid);

    for (let idx = 0; idx < payload.players.length; idx++) {
      const pl = payload.players[idx];
      const r = await tx.execute({
        sql: `INSERT INTO game_players
                (game_id, player_id, character_id, had_reroll, loot_in_hand, coins,
                 deaths, treasures, souls, is_winner, team, seat_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          gameId,
          pl.player_id,
          pl.character_id,
          pl.had_reroll ? 1 : 0,
          pl.loot_in_hand,
          pl.coins,
          pl.deaths,
          pl.treasures,
          pl.souls,
          pl.is_winner ? 1 : 0,
          pl.team,
          idx,
        ],
      });
      const gpId = Number(r.lastInsertRowid);
      for (const treasureId of pl.treasure_ids) {
        await tx.execute({
          sql: "INSERT OR IGNORE INTO game_player_treasures (game_player_id, treasure_id) VALUES (?, ?)",
          args: [gpId, treasureId],
        });
      }
    }

    await tx.commit();
    return (await getGame(gameId))!;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

export async function listGames(): Promise<GameListItem[]> {
  const rows = await all<GameListItem & { winners_csv: string | null }>(
    `SELECT g.*,
       (SELECT COUNT(*) FROM game_players gp WHERE gp.game_id = g.id) AS num_players,
       (SELECT GROUP_CONCAT(p.name, ' • ')
          FROM game_players gp JOIN players p ON p.id = gp.player_id
         WHERE gp.game_id = g.id AND gp.is_winner = 1) AS winners_csv
     FROM games g
     ORDER BY g.played_at DESC, g.id DESC`
  );

  return rows.map(({ winners_csv, ...g }) => ({
    ...g,
    winners: winners_csv ? winners_csv.split(" • ") : [],
  }));
}

export async function getGame(id: number): Promise<GameFull | undefined> {
  const game = await get<GameFull>("SELECT * FROM games WHERE id = ?", [id]);
  if (!game) return undefined;

  const players = (await all<GameFull["players"][number]>(
    `SELECT gp.*,
            p.name AS player_name, p.color AS player_color,
            p.base_face AS player_base_face, p.avatar_cache AS player_avatar_cache,
            p.nickname AS nickname, c.name AS character_name
       FROM game_players gp
       JOIN players p ON p.id = gp.player_id
  LEFT JOIN characters c ON c.id = gp.character_id
      WHERE gp.game_id = ?
      ORDER BY gp.seat_order`,
    [id]
  )) as GameFull["players"];

  for (const p of players) {
    // Itens de texto livre legados (partidas anteriores à Fase 4) — histórico read-only.
    p.items = await all<{ id: number; name: string }>(
      `SELECT i.id, i.name FROM game_player_items gpi
         JOIN items i ON i.id = gpi.item_id
        WHERE gpi.game_player_id = ?
        ORDER BY i.name COLLATE NOCASE`,
      [p.id]
    );
    p.owned_treasures = await all<GameTreasureRef>(
      `SELECT t.id, t.name, si.path AS icon_sprite_path
         FROM game_player_treasures gpt
         JOIN treasures t ON t.id = gpt.treasure_id
    LEFT JOIN ornaments oi ON oi.id = t.icon_ornament_id
    LEFT JOIN sprites si ON si.id = oi.sprite_id
        WHERE gpt.game_player_id = ?
        ORDER BY t.name COLLATE NOCASE`,
      [p.id]
    );
  }

  game.players = players;
  return game;
}

export async function deleteGame(id: number): Promise<boolean> {
  // Cascata manual (FKs não forçadas via HTTP libSQL em produção/Turso — o
  // ON DELETE CASCADE do schema só é aplicado de fato em dev local):
  // itens/tesouros possuídos → jogadores → jogo.
  const db = await getClient();
  const res = await db.batch(
    [
      {
        sql: "DELETE FROM game_player_items WHERE game_player_id IN (SELECT id FROM game_players WHERE game_id = ?)",
        args: [id],
      },
      {
        sql: "DELETE FROM game_player_treasures WHERE game_player_id IN (SELECT id FROM game_players WHERE game_id = ?)",
        args: [id],
      },
      { sql: "DELETE FROM game_players WHERE game_id = ?", args: [id] },
      { sql: "DELETE FROM games WHERE id = ?", args: [id] },
    ],
    "write"
  );
  return res[3].rowsAffected > 0;
}

export type { GamePlayerRow };
