import { all, get, getClient, nowIso, run } from "./db";
import { appendEvent, deriveActiveMinutes, deriveStats, listEvents } from "./game-events";
import { normalizeParams, parseParams } from "./game-modes";
import { resolveTreasureId } from "./treasures";
import type {
  Character,
  DerivedPlayerStats,
  Game,
  GameEventFull,
  GameFinishPayload,
  GameFull,
  GameListItem,
  GamePayload,
  GamePlayerRow,
  GameSetupPayload,
  GameStatus,
  GameTreasureRef,
} from "./types";

/**
 * Camada de dados de partidas. Desde a reformulação (docs/PLANO-PARTIDAS.md) a
 * partida é uma **entidade com ciclo de vida**: nasce no Setup
 * (`status='andamento'`) e é mutada até a finalização — não é mais uma linha
 * criada só no fim.
 *
 * Continua existindo o caminho **retroativo** (`createGame`), pra registrar de
 * uma vez uma partida que já aconteceu sem o app na mesa (§7.4 do plano).
 */

/* ============================ Setup (partida nova) ========================= */

/**
 * Cria a partida no fim do Setup, ANTES de jogar. É esse commit que destrava
 * pause, registro ao vivo e sessão multi-celular — sem ele nada tem onde
 * gravar.
 *
 * Os parâmetros do modo são **copiados** pra `params_json` (snapshot): editar o
 * modo depois não pode reescrever esta partida (§5 do plano).
 */
export async function createGameSetup(
  payload: GameSetupPayload,
  createdByPlayerId: number | null
): Promise<GameFull> {
  const params = normalizeParams(payload.params);
  const now = nowIso();
  const db = await getClient();
  const tx = await db.transaction("write");
  try {
    const gi = await tx.execute({
      sql: `INSERT INTO games
              (played_at, edition, souls_to_win, character_selection, format,
               tournament_id, duration_min, rounds, notes, created_at,
               status, mode_id, params_json, bonus_souls, rerolls_allowed, started_at)
            VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, 'andamento', ?, ?, ?, ?, ?)`,
      args: [
        payload.played_at,
        params.edition,
        params.souls_to_win,
        params.character_selection,
        params.format,
        payload.tournament_id,
        payload.notes,
        now,
        payload.mode_id,
        JSON.stringify(params),
        params.bonus_souls ? 1 : 0,
        params.rerolls_allowed,
        // Registro retroativo não tem cronômetro: sem `started_at` a duração
        // derivada é null e a finalização pede o número em vez de chutar 0.
        payload.retro ? null : now,
      ],
    });
    const gameId = Number(gi.lastInsertRowid);

    for (let idx = 0; idx < payload.players.length; idx++) {
      const pl = payload.players[idx];
      await tx.execute({
        sql: `INSERT INTO game_players
                (game_id, player_id, character_id, team, seat_order, ready, joined_at)
              VALUES (?, ?, ?, ?, ?, 1, ?)`,
        args: [gameId, pl.player_id, pl.character_id, pl.team, idx, now],
      });
    }

    await tx.commit();
    return (await getGame(gameId))!;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

/* ====================== Registro retroativo (uma tacada) =================== */

/**
 * Registra de uma vez uma partida que já aconteceu — o fluxo original, mantido
 * de propósito como atalho (§7.4): nem toda partida vai ser acompanhada pelo
 * app na mesa. Nasce direto como `finalizada`, sem nenhum evento.
 */
export async function createGame(payload: GamePayload): Promise<GameFull> {
  const params = normalizeParams({
    edition: payload.edition,
    souls_to_win: payload.souls_to_win,
    format: payload.format,
    character_selection: payload.character_selection,
  });
  const now = nowIso();
  const db = await getClient();
  const tx = await db.transaction("write");
  try {
    const gi = await tx.execute({
      sql: `INSERT INTO games
             (played_at, edition, souls_to_win, character_selection, format,
              tournament_id, duration_min, rounds, notes, created_at,
              status, params_json, bonus_souls, rerolls_allowed, ended_at)
           VALUES
             (@played_at, @edition, @souls_to_win, @character_selection, @format,
              @tournament_id, @duration_min, @rounds, @notes, @created_at,
              'finalizada', @params_json, @bonus_souls, @rerolls_allowed, @created_at)`,
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
        created_at: now,
        params_json: JSON.stringify(params),
        bonus_souls: params.bonus_souls ? 1 : 0,
        rerolls_allowed: params.rerolls_allowed,
      },
    });
    const gameId = Number(gi.lastInsertRowid);

    for (let idx = 0; idx < payload.players.length; idx++) {
      const pl = payload.players[idx];
      const r = await tx.execute({
        sql: `INSERT INTO game_players
                (game_id, player_id, character_id, had_reroll, loot_in_hand, coins,
                 deaths, treasures, souls, is_winner, team, seat_order,
                 pvp_kills, reroll_count, ready, joined_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
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
          0,
          pl.had_reroll ? 1 : 0,
          now,
        ],
      });
      const gpId = Number(r.lastInsertRowid);
      for (const treasureId of pl.treasure_ids) {
        await tx.execute({
          sql: "INSERT OR IGNORE INTO game_player_treasures (game_player_id, treasure_id) VALUES (?, ?)",
          args: [gpId, treasureId],
        });
      }
      for (const name of pl.treasure_names) {
        const treasureId = await resolveTreasureId(tx, name);
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

/* ============================== Ciclo de vida ============================= */

/** Transições permitidas. Fora daqui é 409 — evita "finalizar duas vezes" e
 * "retomar uma partida que nunca pausou" vindos de dois celulares ao mesmo
 * tempo. */
const ALLOWED_TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  setup: ["lobby", "andamento", "abortada"],
  lobby: ["andamento", "abortada"],
  andamento: ["pausada", "finalizada", "abortada"],
  pausada: ["andamento", "finalizada", "abortada"],
  finalizada: [],
  abortada: [],
};

export type LifecycleResult =
  | { ok: true; game: GameFull }
  | { ok: false; error: string; status: number };

/** Pausar / retomar / abandonar. Pause e resume viram **evento** (não coluna),
 * e é da soma desses intervalos que sai a duração ativa — é o que permite
 * partida em dois dias sem inflar o tempo (§7.2). */
export async function setGameStatus(
  gameId: number,
  next: GameStatus,
  byPlayerId: number | null
): Promise<LifecycleResult> {
  const game = await get<Game>("SELECT * FROM games WHERE id = ?", [gameId]);
  if (!game) return { ok: false, error: "partida não encontrada", status: 404 };
  if (!ALLOWED_TRANSITIONS[game.status]?.includes(next)) {
    return {
      ok: false,
      error: `não dá pra ir de "${game.status}" para "${next}"`,
      status: 409,
    };
  }

  if (next === "pausada") {
    await appendEvent(
      gameId,
      { type: "pause", player_id: null, other_player_id: null, ref_type: null, ref_id: null, ref_name: null, amount: 1, round: game.rounds, client_event_id: null },
      byPlayerId
    );
  } else if (next === "andamento" && game.status === "pausada") {
    await appendEvent(
      gameId,
      { type: "resume", player_id: null, other_player_id: null, ref_type: null, ref_id: null, ref_name: null, amount: 1, round: game.rounds, client_event_id: null },
      byPlayerId
    );
  }

  const ended = next === "abortada" ? nowIso() : null;
  await run(
    "UPDATE games SET status = ?, ended_at = COALESCE(?, ended_at) WHERE id = ?",
    [next, ended, gameId]
  );
  return { ok: true, game: (await getGame(gameId))! };
}

/**
 * Finalização: grava o snapshot final por jogador. Os números chegam
 * **pré-preenchidos** dos eventos (ver `getRunState`), mas o que vale é o que o
 * usuário confirmou — divergência com os eventos é avisada na tela, nunca
 * bloqueada (§7.3). O snapshot é o que o ranking lê (§1.3).
 */
export async function finishGame(
  gameId: number,
  payload: GameFinishPayload
): Promise<LifecycleResult> {
  const game = await get<Game>("SELECT * FROM games WHERE id = ?", [gameId]);
  if (!game) return { ok: false, error: "partida não encontrada", status: 404 };
  if (!ALLOWED_TRANSITIONS[game.status]?.includes("finalizada")) {
    return { ok: false, error: "esta partida não pode ser finalizada", status: 409 };
  }
  if (!payload.players.some((p) => p.is_winner)) {
    return { ok: false, error: "marque ao menos um vencedor", status: 400 };
  }

  const endedAt = nowIso();
  const derivedMinutes = await deriveActiveMinutes({ ...game, ended_at: endedAt });

  const db = await getClient();
  const tx = await db.transaction("write");
  try {
    await tx.execute({
      sql: `UPDATE games
               SET status = 'finalizada', ended_at = ?, duration_min = ?,
                   rounds = ?, notes = COALESCE(?, notes)
             WHERE id = ?`,
      args: [
        endedAt,
        payload.duration_min ?? derivedMinutes,
        payload.rounds ?? game.rounds,
        payload.notes,
        gameId,
      ],
    });

    for (const p of payload.players) {
      const upd = await tx.execute({
        sql: `UPDATE game_players
                 SET loot_in_hand = ?, coins = ?, deaths = ?, pvp_kills = ?,
                     treasures = ?, souls = ?, is_winner = ?
               WHERE game_id = ? AND player_id = ?`,
        args: [
          p.loot_in_hand,
          p.coins,
          p.deaths,
          p.pvp_kills,
          p.treasures,
          p.souls,
          p.is_winner ? 1 : 0,
          gameId,
          p.player_id,
        ],
      });
      if (upd.rowsAffected === 0) continue; // jogador não participou desta partida

      const gp = await tx.execute({
        sql: "SELECT id FROM game_players WHERE game_id = ? AND player_id = ?",
        args: [gameId, p.player_id],
      });
      const gpId = Number(gp.rows[0][0]);

      // Reescreve a posse de Tesouros do zero: finalizar de novo (correção)
      // não pode acumular itens de uma tentativa anterior.
      await tx.execute({
        sql: "DELETE FROM game_player_treasures WHERE game_player_id = ?",
        args: [gpId],
      });
      for (const treasureId of p.treasure_ids) {
        await tx.execute({
          sql: "INSERT OR IGNORE INTO game_player_treasures (game_player_id, treasure_id) VALUES (?, ?)",
          args: [gpId, treasureId],
        });
      }
      for (const name of p.treasure_names) {
        const treasureId = await resolveTreasureId(tx, name);
        await tx.execute({
          sql: "INSERT OR IGNORE INTO game_player_treasures (game_player_id, treasure_id) VALUES (?, ?)",
          args: [gpId, treasureId],
        });
      }
    }

    await tx.commit();
    return { ok: true, game: (await getGame(gameId))! };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

/** Contador de rodada — livre por decisão do usuário (§2.5): ninguém é
 * obrigado a usar e nada trava a mesa se ficar desatualizado. */
export async function setRounds(gameId: number, rounds: number | null): Promise<boolean> {
  const { changes } = await run("UPDATE games SET rounds = ? WHERE id = ?", [
    rounds === null ? null : Math.max(0, Math.trunc(rounds)),
    gameId,
  ]);
  return changes > 0;
}

/* ========================= Sorteio de personagem ========================== */

export type RollResult =
  | { ok: true; character: Character; reroll_count: number }
  | { ok: false; error: string; status: number };

/**
 * Sorteia o personagem de UM participante **no servidor**.
 *
 * Por que não no cliente (decisão §6.5 do plano): no navegador dá pra re-rolar
 * até gostar do resultado, e com dois celulares dois jogadores podem tirar o
 * mesmo personagem. Aqui o pool já exclui quem foi sorteado pelos outros, o
 * limite de re-rolls é conferido de verdade, e cada sorteio deixa rastro como
 * evento (`personagem_sorteado`) — auditoria de graça.
 */
export async function rollCharacter(
  gameId: number,
  playerId: number,
  byPlayerId: number | null
): Promise<RollResult> {
  const game = await get<Game>("SELECT * FROM games WHERE id = ?", [gameId]);
  if (!game) return { ok: false, error: "partida não encontrada", status: 404 };
  if (game.status === "finalizada" || game.status === "abortada") {
    return { ok: false, error: "partida já encerrada", status: 409 };
  }

  const gp = await get<GamePlayerRow>(
    "SELECT * FROM game_players WHERE game_id = ? AND player_id = ?",
    [gameId, playerId]
  );
  if (!gp) return { ok: false, error: "jogador não está nesta partida", status: 404 };

  const params = parseParams(game.params_json);
  const isReroll = gp.character_id != null;
  if (isReroll && gp.reroll_count >= params.rerolls_allowed) {
    return {
      ok: false,
      error:
        params.rerolls_allowed === 0
          ? "este modo não permite re-roll"
          : `limite de re-rolls atingido (${params.rerolls_allowed})`,
      status: 409,
    };
  }

  // Pool: respeita edição e tainted do modo, e exclui personagens já em uso na
  // mesa (inclusive o atual, pra o re-roll sempre entregar coisa diferente).
  const taken = await all<{ character_id: number }>(
    "SELECT character_id FROM game_players WHERE game_id = ? AND character_id IS NOT NULL",
    [gameId]
  );
  const excluded = new Set(taken.map((t) => t.character_id));

  const pool = await all<Character>(
    `SELECT * FROM characters
      WHERE active = 1
        ${params.edition === "base" ? "AND expansion = 'base'" : ""}
        ${params.allow_tainted ? "" : "AND tainted = 0"}`
  );
  const available = pool.filter((c) => !excluded.has(c.id));
  // Se a mesa é maior que o roster disponível, prefere repetir a sortear nada.
  const source = available.length ? available : pool.filter((c) => c.id !== gp.character_id);
  if (!source.length) {
    return { ok: false, error: "não há personagem disponível para sortear", status: 409 };
  }

  const chosen = source[Math.floor(Math.random() * source.length)];
  const nextRerolls = gp.reroll_count + (isReroll ? 1 : 0);

  await run(
    "UPDATE game_players SET character_id = ?, reroll_count = ?, had_reroll = ? WHERE id = ?",
    [chosen.id, nextRerolls, nextRerolls > 0 ? 1 : 0, gp.id]
  );
  await appendEvent(
    gameId,
    {
      type: "personagem_sorteado",
      player_id: playerId,
      other_player_id: null,
      ref_type: "personagem",
      ref_id: chosen.id,
      ref_name: chosen.name,
      amount: 1,
      round: game.rounds,
      client_event_id: null,
    },
    byPlayerId
  );

  return { ok: true, character: chosen, reroll_count: nextRerolls };
}

/** Escolha manual de personagem (modo de seleção livre). */
export async function setCharacter(
  gameId: number,
  playerId: number,
  characterId: number | null
): Promise<boolean> {
  const { changes } = await run(
    "UPDATE game_players SET character_id = ? WHERE game_id = ? AND player_id = ?",
    [characterId, gameId, playerId]
  );
  return changes > 0;
}

/* ================================ Leitura ================================= */

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

/** Estado completo de uma Run: partida + diário + estatística derivada. É o
 * que a tela ao vivo e a de finalização consomem — o cálculo é **do servidor**
 * pra que dois celulares nunca mostrem números diferentes (§6.4). */
export interface RunState {
  game: GameFull;
  events: GameEventFull[];
  derived: Record<number, DerivedPlayerStats>;
  active_minutes: number | null;
}

export async function getRunState(id: number): Promise<RunState | undefined> {
  const game = await getGame(id);
  if (!game) return undefined;
  const [events, derivedMap, active] = await Promise.all([
    listEvents(id),
    deriveStats(id),
    deriveActiveMinutes(game),
  ]);
  return {
    game,
    events,
    derived: Object.fromEntries(derivedMap),
    active_minutes: active,
  };
}

export async function deleteGame(id: number): Promise<boolean> {
  // Cascata manual (FKs não forçadas via HTTP libSQL em produção/Turso — o
  // ON DELETE CASCADE do schema só é aplicado de fato em dev local):
  // eventos → itens/tesouros possuídos → jogadores → jogo.
  const db = await getClient();
  const res = await db.batch(
    [
      { sql: "DELETE FROM game_events WHERE game_id = ?", args: [id] },
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
  return res[4].rowsAffected > 0;
}

export type { GamePlayerRow };
