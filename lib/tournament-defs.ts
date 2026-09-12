import type { Edition } from "./types";

/**
 * Definição **estática** de torneio: mesas, dias, pontuação e regras moram no
 * código, sem CRUD. Dado puro, sem import de `db.ts` (mesmo padrão de
 * `seed-characters.ts` e `seed-game-modes.ts`), pra não criar ciclo de import.
 *
 * **A única coisa que NÃO é estática são os participantes.** O cartaz fala em
 * "Jogador 1".."Jogador 6" — são *vagas*, e quem senta em cada uma é escolhido
 * na própria tela, entre os jogadores cadastrados, e fica guardado em
 * `settings` (ver `lib/tournaments.ts`). Assim dá pra montar a Copa em
 * produção sem deploy, e o chaveamento continua fixo como no cartaz.
 *
 * Isto é a implementação de UM torneio concreto, não a entidade genérica que
 * `docs/PLANO-TORNEIOS.md` previa — de propósito: construir o caso real
 * primeiro é o que revela o que a entidade genérica precisa ter.
 */

export interface TournamentTableDef {
  /** Identificador da mesa dentro do torneio — vai pra `games.tournament_slot`. */
  slot: string;
  /** Rótulo exibido ("Mesa A", "Grande Final"). */
  label: string;
  /** Agrupamento por dia, como no cartaz. */
  day: number;
  dayLabel: string;
  /** ISO local, ou null enquanto for "a definir". */
  date: string | null;
  /** Vagas da mesa, pelos números do cartaz (1..6). Vazio = quem senta sai da
   * classificação (a Grande Final). */
  seats: number[];
  /** Quantos jogadores a mesa comporta. */
  size: number;
  /** Mesa que vale pontos de classificação? A final decide o título, não pontua. */
  scoring: boolean;
}

export interface TournamentDef {
  /** Vai pra `games.tournament_id`. NULL nesse campo continua = Global Board. */
  id: number;
  slug: string;
  name: string;
  year: string;
  /** Quantas vagas o torneio tem ("Jogador 1".."Jogador N"). */
  rosterSize: number;
  /** Regras fixas das partidas do torneio. */
  edition: Edition;
  soulsToWin: number;
  /** Pontuação por colocação na mesa, do 1º em diante. */
  pointsByPlace: number[];
  /** Quantos passam pra final. */
  finalists: number;
  format: string;
  rulesNote: string;
  tables: TournamentTableDef[];
}

export const COPA_ISAACQUINHO_2026: TournamentDef = {
  id: 1,
  slug: "copa-isaacquinho-2026",
  name: "Copa Isaacquinho",
  year: "2026",
  rosterSize: 6,
  edition: "base",
  soulsToWin: 4,
  pointsByPlace: [5, 3, 1],
  finalists: 4,
  format: "Fase de classificação e grande final!",
  rulesNote: "Jogo base, sem expansão",
  tables: [
    { slot: "A", label: "Mesa A", day: 1, dayLabel: "Dia 1", date: "2026-09-12T14:00", seats: [1, 2, 3], size: 3, scoring: true },
    { slot: "B", label: "Mesa B", day: 1, dayLabel: "Dia 1", date: "2026-09-12T14:00", seats: [4, 5, 6], size: 3, scoring: true },
    { slot: "C", label: "Mesa C", day: 2, dayLabel: "Dia 2", date: null, seats: [1, 4, 6], size: 3, scoring: true },
    { slot: "D", label: "Mesa D", day: 2, dayLabel: "Dia 2", date: null, seats: [2, 3, 5], size: 3, scoring: true },
    { slot: "E", label: "Mesa E", day: 3, dayLabel: "Dia 3", date: null, seats: [2, 4, 5], size: 3, scoring: true },
    { slot: "F", label: "Mesa F", day: 3, dayLabel: "Dia 3", date: null, seats: [1, 3, 6], size: 3, scoring: true },
    {
      slot: "FINAL",
      label: "Grande Final",
      day: 4,
      dayLabel: "Final",
      date: null,
      // Vazio de propósito: quem senta aqui sai da classificação.
      seats: [],
      size: 4,
      scoring: false,
    },
  ],
};

export const TOURNAMENTS: TournamentDef[] = [COPA_ISAACQUINHO_2026];

export function findTournament(slug: string): TournamentDef | undefined {
  return TOURNAMENTS.find((t) => t.slug === slug);
}

export function findTournamentById(id: number): TournamentDef | undefined {
  return TOURNAMENTS.find((t) => t.id === id);
}

/** Chave em `settings` onde ficam os participantes escolhidos deste torneio. */
export function rosterSettingKey(def: TournamentDef): string {
  return `tournament:${def.slug}:roster`;
}
