import { all } from "./db";
import { RANKED_STATUS, type BaseFace, type GameStatus } from "./types";
import type { TournamentDef, TournamentTableDef } from "./tournament-defs";

/**
 * Classificação de torneio — **derivada das partidas**, nunca digitada. Mesmo
 * princípio do ranking global (`lib/ranking.ts`): o que vale é o snapshot das
 * partidas finalizadas, e a tabela é sempre recalculada daqui.
 *
 * A definição do torneio (mesas, jogadores, datas, pontuação) é estática e
 * mora em `lib/tournament-defs.ts` — decisão do usuário: sem CRUD.
 */

/** Um participante já resolvido do nome estático para o jogador cadastrado. */
export interface TournamentSeat {
  name: string;
  player_id: number | null;
  base_face: BaseFace | null;
  avatar_cache: string | null;
}

/** Resultado de um jogador numa mesa já finalizada. */
export interface TableResult {
  player_id: number;
  name: string;
  base_face: BaseFace;
  avatar_cache: string | null;
  place: number;
  points: number;
  souls: number;
  treasures: number;
  loot_in_hand: number;
  coins: number;
  is_winner: boolean;
  /** Empatou em TODOS os critérios com o vizinho — a ordem entre eles é
   * arbitrária e a tela avisa, em vez de fingir que decidiu. */
  tied: boolean;
}

export interface TournamentTableState {
  def: TournamentTableDef;
  seats: TournamentSeat[];
  /** Partida vinculada a esta mesa, se já foi criada. */
  game_id: number | null;
  game_status: GameStatus | null;
  results: TableResult[];
  /** Todos os nomes da mesa bateram com jogadores cadastrados? */
  ready: boolean;
}

export interface StandingRow {
  player_id: number;
  name: string;
  base_face: BaseFace;
  avatar_cache: string | null;
  points: number;
  played: number;
  firsts: number;
  seconds: number;
  thirds: number;
  souls: number;
  treasures: number;
  loot_in_hand: number;
  coins: number;
  rank: number;
  /** Está entre os que passam pra final? */
  qualified: boolean;
}

export interface TournamentState {
  def: TournamentDef;
  tables: TournamentTableState[];
  standings: StandingRow[];
  /** Nomes da definição que não bateram com nenhum jogador cadastrado. */
  missingPlayers: string[];
}

interface GamePlayerRowLite {
  game_id: number;
  tournament_slot: string | null;
  status: GameStatus;
  player_id: number;
  name: string;
  base_face: BaseFace;
  avatar_cache: string | null;
  souls: number;
  treasures: number;
  loot_in_hand: number;
  coins: number;
  is_winner: number;
}

/**
 * Ordem de colocação dentro da mesa, na regra definida pelo usuário:
 * **almas → tesouros → loots → moedas**.
 *
 * O vencedor registrado entra na frente de tudo: é ele quem bateu o critério de
 * vitória do jogo, e os números do fim de partida são desempate do resto.
 */
function comparePlacement(a: GamePlayerRowLite, b: GamePlayerRowLite): number {
  return (
    b.is_winner - a.is_winner ||
    b.souls - a.souls ||
    b.treasures - a.treasures ||
    b.loot_in_hand - a.loot_in_hand ||
    b.coins - a.coins
  );
}

/** Dois jogadores empatados em tudo que o critério olha. */
function fullyTied(a: GamePlayerRowLite, b: GamePlayerRowLite): boolean {
  return (
    a.is_winner === b.is_winner &&
    a.souls === b.souls &&
    a.treasures === b.treasures &&
    a.loot_in_hand === b.loot_in_hand &&
    a.coins === b.coins
  );
}

export async function getTournamentState(def: TournamentDef): Promise<TournamentState> {
  // Jogadores da definição resolvidos por NOME (local e prod têm ids
  // diferentes — ver o comentário em tournament-defs.ts).
  const wanted = Array.from(new Set(def.tables.flatMap((t) => t.playerNames)));
  const players = wanted.length
    ? await all<{
        id: number;
        name: string;
        base_face: BaseFace;
        avatar_cache: string | null;
      }>(
        `SELECT id, name, base_face, avatar_cache FROM players
          WHERE name COLLATE NOCASE IN (${wanted.map(() => "?").join(",")})`,
        wanted
      )
    : [];
  const byName = new Map(players.map((p) => [p.name.toLowerCase(), p]));
  const missingPlayers = wanted.filter((n) => !byName.has(n.toLowerCase()));

  // Todas as partidas deste torneio, com o estado final de cada participante.
  const rows = await all<GamePlayerRowLite>(
    `SELECT g.id AS game_id, g.tournament_slot, g.status,
            gp.player_id, p.name, p.base_face, p.avatar_cache,
            gp.souls, gp.treasures, gp.loot_in_hand, gp.coins, gp.is_winner
       FROM games g
       JOIN game_players gp ON gp.game_id = g.id
       JOIN players p ON p.id = gp.player_id
      WHERE g.tournament_id = ?
      ORDER BY g.id, gp.seat_order`,
    [def.id]
  );

  const bySlot = new Map<string, GamePlayerRowLite[]>();
  for (const r of rows) {
    const key = r.tournament_slot ?? "";
    const list = bySlot.get(key) ?? [];
    list.push(r);
    bySlot.set(key, list);
  }

  const tables: TournamentTableState[] = def.tables.map((tableDef) => {
    const seats: TournamentSeat[] = tableDef.playerNames.map((name) => {
      const p = byName.get(name.toLowerCase());
      return {
        name,
        player_id: p?.id ?? null,
        base_face: p?.base_face ?? null,
        avatar_cache: p?.avatar_cache ?? null,
      };
    });

    const gameRows = bySlot.get(tableDef.slot) ?? [];
    const gameId = gameRows[0]?.game_id ?? null;
    const status = gameRows[0]?.status ?? null;

    // Só partida finalizada vira colocação e ponto — mesma regra do ranking.
    let results: TableResult[] = [];
    if (status === RANKED_STATUS && gameRows.length > 0) {
      const sorted = [...gameRows].sort(comparePlacement);
      results = sorted.map((r, i) => ({
        player_id: r.player_id,
        name: r.name,
        base_face: r.base_face,
        avatar_cache: r.avatar_cache,
        place: i + 1,
        points: tableDef.scoring ? (def.pointsByPlace[i] ?? 0) : 0,
        souls: r.souls,
        treasures: r.treasures,
        loot_in_hand: r.loot_in_hand,
        coins: r.coins,
        is_winner: r.is_winner === 1,
        tied:
          (i > 0 && fullyTied(r, sorted[i - 1])) ||
          (i < sorted.length - 1 && fullyTied(r, sorted[i + 1])),
      }));
    }

    return {
      def: tableDef,
      seats,
      game_id: gameId,
      game_status: status,
      results,
      ready: seats.length > 0 && seats.every((s) => s.player_id != null),
    };
  });

  return {
    def,
    tables,
    standings: buildStandings(def, tables),
    missingPlayers,
  };
}

/**
 * Soma os pontos das mesas de classificação. Jogador que ainda não jogou
 * nenhuma mesa entra zerado (o cartaz lista os 6 desde o início, então sumir
 * da tabela seria pior que aparecer com 0).
 */
function buildStandings(def: TournamentDef, tables: TournamentTableState[]): StandingRow[] {
  const acc = new Map<number, StandingRow>();

  const touch = (
    id: number,
    name: string,
    base_face: BaseFace,
    avatar_cache: string | null
  ): StandingRow => {
    if (!acc.has(id)) {
      acc.set(id, {
        player_id: id,
        name,
        base_face,
        avatar_cache,
        points: 0,
        played: 0,
        firsts: 0,
        seconds: 0,
        thirds: 0,
        souls: 0,
        treasures: 0,
        loot_in_hand: 0,
        coins: 0,
        rank: 0,
        qualified: false,
      });
    }
    return acc.get(id)!;
  };

  // Todo mundo que a definição prevê aparece, mesmo sem ter jogado ainda.
  for (const t of tables) {
    if (!t.def.scoring) continue;
    for (const s of t.seats) {
      if (s.player_id != null) touch(s.player_id, s.name, s.base_face!, s.avatar_cache);
    }
  }

  for (const t of tables) {
    if (!t.def.scoring) continue;
    for (const r of t.results) {
      const row = touch(r.player_id, r.name, r.base_face, r.avatar_cache);
      row.points += r.points;
      row.played += 1;
      if (r.place === 1) row.firsts += 1;
      else if (r.place === 2) row.seconds += 1;
      else if (r.place === 3) row.thirds += 1;
      row.souls += r.souls;
      row.treasures += r.treasures;
      row.loot_in_hand += r.loot_in_hand;
      row.coins += r.coins;
    }
  }

  // Mesmo critério de desempate da mesa, aplicado aos totais do torneio.
  const rows = [...acc.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.firsts - a.firsts ||
      b.souls - a.souls ||
      b.treasures - a.treasures ||
      b.loot_in_hand - a.loot_in_hand ||
      b.coins - a.coins ||
      a.name.localeCompare(b.name)
  );
  rows.forEach((r, i) => {
    r.rank = i + 1;
    r.qualified = i < def.finalists;
  });
  return rows;
}
