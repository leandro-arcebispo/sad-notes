import { getDb, nowIso } from "./db";
import { resolveItemId } from "./items";
import type {
  GameFull,
  GameListItem,
  GamePayload,
  GamePlayerRow,
} from "./types";

export function createGame(payload: GamePayload): GameFull {
  const db = getDb();
  const tx = db.transaction((): number => {
    const gi = db
      .prepare(
        `INSERT INTO games
           (played_at, edition, souls_to_win, character_selection, format,
            tournament_id, duration_min, rounds, notes, created_at)
         VALUES
           (@played_at, @edition, @souls_to_win, @character_selection, @format,
            @tournament_id, @duration_min, @rounds, @notes, @created_at)`
      )
      .run({
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
      });
    const gameId = Number(gi.lastInsertRowid);

    const insGP = db.prepare(
      `INSERT INTO game_players
         (game_id, player_id, character_id, had_reroll, loot_in_hand, coins,
          deaths, souls, is_winner, team, seat_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insItem = db.prepare(
      "INSERT OR IGNORE INTO game_player_items (game_player_id, item_id) VALUES (?, ?)"
    );

    payload.players.forEach((pl, idx) => {
      const r = insGP.run(
        gameId,
        pl.player_id,
        pl.character_id,
        pl.had_reroll ? 1 : 0,
        pl.loot_in_hand,
        pl.coins,
        pl.deaths,
        pl.souls,
        pl.is_winner ? 1 : 0,
        pl.team,
        idx
      );
      const gpId = Number(r.lastInsertRowid);
      for (const name of pl.items) {
        if (!name.trim()) continue;
        insItem.run(gpId, resolveItemId(db, name));
      }
    });

    return gameId;
  });

  return getGame(tx())!;
}

export function listGames(): GameListItem[] {
  const rows = getDb()
    .prepare(
      `SELECT g.*,
         (SELECT COUNT(*) FROM game_players gp WHERE gp.game_id = g.id) AS num_players,
         (SELECT GROUP_CONCAT(p.name, ' • ')
            FROM game_players gp JOIN players p ON p.id = gp.player_id
           WHERE gp.game_id = g.id AND gp.is_winner = 1) AS winners_csv
       FROM games g
       ORDER BY g.played_at DESC, g.id DESC`
    )
    .all() as (GameListItem & { winners_csv: string | null })[];

  return rows.map(({ winners_csv, ...g }) => ({
    ...g,
    winners: winners_csv ? winners_csv.split(" • ") : [],
  }));
}

export function getGame(id: number): GameFull | undefined {
  const db = getDb();
  const game = db.prepare("SELECT * FROM games WHERE id = ?").get(id) as
    | GameFull
    | undefined;
  if (!game) return undefined;

  const players = db
    .prepare(
      `SELECT gp.*,
              p.name AS player_name, p.color AS player_color,
              p.base_face AS player_base_face, p.avatar_cache AS player_avatar_cache,
              p.nickname AS nickname, c.name AS character_name
         FROM game_players gp
         JOIN players p ON p.id = gp.player_id
    LEFT JOIN characters c ON c.id = gp.character_id
        WHERE gp.game_id = ?
        ORDER BY gp.seat_order`
    )
    .all(id) as GameFull["players"];

  const itemStmt = db.prepare(
    `SELECT i.id, i.name FROM game_player_items gpi
       JOIN items i ON i.id = gpi.item_id
      WHERE gpi.game_player_id = ?
      ORDER BY i.name COLLATE NOCASE`
  );
  for (const p of players) {
    p.items = itemStmt.all(p.id) as { id: number; name: string }[];
  }

  game.players = players;
  return game;
}

export function deleteGame(id: number): boolean {
  const res = getDb().prepare("DELETE FROM games WHERE id = ?").run(id);
  return res.changes > 0;
}

export type { GamePlayerRow };
