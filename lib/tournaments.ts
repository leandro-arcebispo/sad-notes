import { all, getSetting, setSetting } from "./db";
import { RANKED_STATUS, type BaseFace, type GameStatus, type Player } from "./types";
import {
  rosterSettingKey,
  type TournamentDef,
  type TournamentTableDef,
} from "./tournament-defs";

/**
 * Classificação de torneio — **derivada das partidas**, nunca digitada. Mesmo
 * princípio do ranking global (`lib/ranking.ts`): o que vale é o snapshot das
 * partidas finalizadas, e a tabela é sempre recalculada daqui.
 *
 * O chaveamento é estático (`lib/tournament-defs.ts`); só **quem ocupa cada
 * vaga** é escolhido na tela e guardado em `settings`, pra dar pra montar o
 * torneio em produção sem deploy.
 */

/** Vaga do torneio ("Jogador 1".."Jogador 6") já resolvida — ou vazia. */
export interface TournamentSeat {
  /** Número da vaga no cartaz. */
  seat: number;
  label: string;
  player: Player | null;
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
  /** Monstros derrotados, contados no Diário da Run. `null` = a mesa não tem
   * Diário (registrada sem Run), então o número é desconhecido — não zero. */
  monsters: number | null;
  /** Mortes sofridas, do placar da finalização (`game_players.deaths`) —
   * existe até em mesa registrada sem Run. */
  deaths: number;
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
  /** Todas as vagas da mesa estão preenchidas? */
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
  /** Soma dos monstros das mesas que têm Diário; `null` se nenhuma tem.
   * Só informativo: NÃO entra no desempate (não está em STANDING_CRITERIA). */
  monsters: number | null;
  /** Soma das mortes sofridas nas mesas. Também só informativo: NÃO entra
   * no desempate. */
  deaths: number;
  rank: number;
  /** Está entre os que passam pra final? */
  qualified: boolean;
  /** Critério que pôs esta linha à frente da de baixo — null na última linha
   * ou quando empatam em tudo. A tela destaca a coluna que desempatou. */
  decided_by: StandingCriterion | null;
  /** Empatou em TODOS os critérios com um vizinho — a ordem entre eles é
   * alfabética, e a tela avisa em vez de fingir que decidiu. */
  tied: boolean;
}

/** Colunas que ordenam a classificação geral, da que pesa mais pra menos. */
export type StandingCriterion =
  | "points"
  | "firsts"
  | "souls"
  | "treasures"
  | "loot_in_hand"
  | "coins";

/**
 * Pontos, e depois o mesmo critério da mesa aplicado aos totais do torneio.
 * Lista única pra ordenar E pra dizer qual critério decidiu cada posição.
 */
const STANDING_CRITERIA: StandingCriterion[] = [
  "points",
  "firsts",
  "souls",
  "treasures",
  "loot_in_hand",
  "coins",
];

function standingDecider(a: StandingRow, b: StandingRow): StandingCriterion | null {
  return STANDING_CRITERIA.find((k) => a[k] !== b[k]) ?? null;
}

export interface TournamentState {
  def: TournamentDef;
  /** Vaga → jogador escolhido (ou null). Sempre `rosterSize` posições. */
  roster: TournamentSeat[];
  tables: TournamentTableState[];
  standings: StandingRow[];
  /** Quantas vagas ainda faltam preencher. */
  missingSeats: number;
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
  deaths: number;
  is_winner: number;
}

export const seatLabel = (seat: number) => `Jogador ${seat}`;

/* ------------------------------- participantes ---------------------------- */

/**
 * Participantes escolhidos, por vaga. Guardado em `settings` como JSON de ids
 * — ids e não nomes porque é o MESMO banco: em produção a escolha aponta pros
 * jogadores de produção, e renomear alguém não quebra o chaveamento.
 */
export async function getRosterIds(def: TournamentDef): Promise<(number | null)[]> {
  const raw = await getSetting(rosterSettingKey(def));
  const empty = Array<number | null>(def.rosterSize).fill(null);
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return empty;
    return empty.map((_, i) => {
      const v = Math.trunc(Number(parsed[i]));
      return Number.isFinite(v) && v > 0 ? v : null;
    });
  } catch {
    return empty;
  }
}

export type RosterSaveResult = { ok: true } | { ok: false; error: string };

/**
 * Grava os participantes. Vaga vazia é permitida (dá pra montar aos poucos),
 * mas **jogador repetido não**: a mesma pessoa em duas vagas a colocaria
 * jogando contra si mesma em alguma mesa do chaveamento.
 */
export async function saveRosterIds(
  def: TournamentDef,
  ids: (number | null)[]
): Promise<RosterSaveResult> {
  const normalized = Array<number | null>(def.rosterSize)
    .fill(null)
    .map((_, i) => {
      const v = Math.trunc(Number(ids[i]));
      return Number.isFinite(v) && v > 0 ? v : null;
    });

  const filled = normalized.filter((v): v is number => v != null);
  if (new Set(filled).size !== filled.length) {
    return { ok: false, error: "o mesmo jogador não pode ocupar duas vagas" };
  }

  if (filled.length > 0) {
    const found = await all<{ id: number }>(
      `SELECT id FROM players WHERE active = 1 AND id IN (${filled.map(() => "?").join(",")})`,
      filled
    );
    if (found.length !== filled.length) {
      return { ok: false, error: "algum jogador selecionado não existe mais" };
    }
  }

  await setSetting(rosterSettingKey(def), JSON.stringify(normalized));
  return { ok: true };
}

/* --------------------------------- estado --------------------------------- */

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
  const rosterIds = await getRosterIds(def);
  const wanted = rosterIds.filter((v): v is number => v != null);

  const players = wanted.length
    ? await all<Player>(
        `SELECT * FROM players WHERE id IN (${wanted.map(() => "?").join(",")})`,
        wanted
      )
    : [];
  const byId = new Map(players.map((p) => [p.id, p]));

  const roster: TournamentSeat[] = rosterIds.map((id, i) => ({
    seat: i + 1,
    label: seatLabel(i + 1),
    player: id != null ? byId.get(id) ?? null : null,
  }));
  const seatByNumber = new Map(roster.map((s) => [s.seat, s]));

  // Todas as partidas deste torneio, com o estado final de cada participante.
  const rows = await all<GamePlayerRowLite>(
    `SELECT g.id AS game_id, g.tournament_slot, g.status,
            gp.player_id, p.name, p.base_face, p.avatar_cache,
            gp.souls, gp.treasures, gp.loot_in_hand, gp.coins, gp.deaths, gp.is_winner
       FROM games g
       JOIN game_players gp ON gp.game_id = g.id
       JOIN players p ON p.id = gp.player_id
      WHERE g.tournament_id = ?
      ORDER BY g.id, gp.seat_order`,
    [def.id]
  );

  // Monstros saem do Diário (eventos), não do snapshot da finalização. Mesa
  // sem evento nenhum foi registrada sem Run: ali o número é desconhecido.
  const monsterRows = await all<{ game_id: number; player_id: number | null; monsters: number }>(
    `SELECT e.game_id, e.player_id,
            SUM(CASE WHEN e.type = 'monstro_derrotado' THEN e.amount ELSE 0 END) AS monsters
       FROM game_events e
       JOIN games g ON g.id = e.game_id
      WHERE g.tournament_id = ? AND e.deleted_at IS NULL
      GROUP BY e.game_id, e.player_id`,
    [def.id]
  );
  const gamesWithLog = new Set(monsterRows.map((m) => m.game_id));
  const monstersOf = new Map(
    monsterRows.map((m) => [`${m.game_id}:${m.player_id}`, Number(m.monsters)])
  );
  const monstersFor = (gameId: number, playerId: number): number | null =>
    gamesWithLog.has(gameId) ? monstersOf.get(`${gameId}:${playerId}`) ?? 0 : null;

  const bySlot = new Map<string, GamePlayerRowLite[]>();
  for (const r of rows) {
    const key = r.tournament_slot ?? "";
    const list = bySlot.get(key) ?? [];
    list.push(r);
    bySlot.set(key, list);
  }

  const tables: TournamentTableState[] = def.tables.map((tableDef) => {
    const seats: TournamentSeat[] = tableDef.seats.map(
      (n) => seatByNumber.get(n) ?? { seat: n, label: seatLabel(n), player: null }
    );

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
        monsters: monstersFor(r.game_id, r.player_id),
        deaths: r.deaths,
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
      ready: seats.length > 0 && seats.every((s) => s.player != null),
    };
  });

  return {
    def,
    roster,
    tables,
    standings: buildStandings(def, tables),
    missingSeats: roster.filter((s) => s.player == null).length,
  };
}

/**
 * Soma os pontos das mesas de classificação. Participante que ainda não jogou
 * entra zerado (o cartaz lista os 6 desde o início, então sumir da tabela seria
 * pior que aparecer com 0).
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
        monsters: null,
        deaths: 0,
        rank: 0,
        qualified: false,
        decided_by: null,
        tied: false,
      });
    }
    return acc.get(id)!;
  };

  // Todo mundo que já tem vaga aparece, mesmo sem ter jogado ainda.
  for (const t of tables) {
    if (!t.def.scoring) continue;
    for (const s of t.seats) {
      if (s.player) touch(s.player.id, s.player.name, s.player.base_face, s.player.avatar_cache);
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
      if (r.monsters != null) row.monsters = (row.monsters ?? 0) + r.monsters;
      row.deaths += r.deaths;
    }
  }

  const rows = [...acc.values()].sort((a, b) => {
    for (const k of STANDING_CRITERIA) {
      const d = b[k] - a[k];
      if (d) return d;
    }
    return a.name.localeCompare(b.name);
  });
  rows.forEach((r, i) => {
    r.rank = i + 1;
    r.qualified = i < def.finalists;
    const next = rows[i + 1];
    r.decided_by = next ? standingDecider(r, next) : null;
    // Quem ainda não jogou empata em zero com todo mundo: isso é tabela
    // vazia, não empate de verdade.
    r.tied =
      r.played > 0 &&
      ((next != null && r.decided_by === null) ||
        (i > 0 && standingDecider(rows[i - 1], r) === null));
  });
  return rows;
}
