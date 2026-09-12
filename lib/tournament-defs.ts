import type { Edition } from "./types";

/**
 * Definição **estática** de torneio — decisão do usuário: sem CRUD, a
 * definição mora no código e só o **resultado** é derivado das partidas.
 * Dado puro, sem import de `db.ts` (mesmo padrão de `seed-characters.ts` e
 * `seed-game-modes.ts`), pra não criar ciclo de import.
 *
 * Isto é a implementação de UM torneio concreto, não a entidade genérica que
 * `docs/PLANO-TORNEIOS.md` previa — de propósito: construir o caso real
 * primeiro é o que revela o que a entidade genérica precisa ter.
 *
 * ⚠️ **Jogadores são referenciados por NOME, não por id.** Local e produção
 * são dois bancos com ids independentes (ver o aviso no topo do HANDOFF), e o
 * usuário vai montar esta Copa em produção — id hardcoded aqui apontaria pra
 * outra pessoa lá. Nome é a chave natural, que é o padrão já adotado no
 * projeto pra qualquer coisa que atravesse os dois bancos.
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
  /** Nomes dos participantes. Vazio = definido pela classificação (a final). */
  playerNames: string[];
  /** Quantos jogadores a mesa tem (a final é montada depois, pelos 4 melhores). */
  seats: number;
  /** Mesa que vale pontos de classificação? A final decide o título, não pontua. */
  scoring: boolean;
}

export interface TournamentDef {
  /** Vai pra `games.tournament_id`. NULL nesse campo continua = Global Board. */
  id: number;
  slug: string;
  name: string;
  year: string;
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

/**
 * Os 6 participantes. **Edite esta lista** com os nomes exatos dos jogadores
 * cadastrados — é o único lugar que precisa mudar. Nome que não bater com um
 * jogador cadastrado aparece marcado como "não cadastrado" na tela, e a mesa
 * não deixa criar partida até resolver.
 */
export const COPA_2026_PLAYERS = [
  "Jogador 1",
  "Jogador 2",
  "Jogador 3",
  "Jogador 4",
  "Jogador 5",
  "Jogador 6",
] as const;

/** Atalho pra montar as mesas pelos números do cartaz (1-indexado). */
const p = (...nums: number[]) => nums.map((n) => COPA_2026_PLAYERS[n - 1]);

export const COPA_ISAACQUINHO_2026: TournamentDef = {
  id: 1,
  slug: "copa-isaacquinho-2026",
  name: "Copa Isaacquinho",
  year: "2026",
  edition: "base",
  soulsToWin: 4,
  pointsByPlace: [5, 3, 1],
  finalists: 4,
  format: "Fase de classificação e grande final!",
  rulesNote: "Jogo base, sem expansão",
  tables: [
    {
      slot: "A",
      label: "Mesa A",
      day: 1,
      dayLabel: "Dia 1",
      date: "2026-09-12T14:00",
      playerNames: p(1, 2, 3),
      seats: 3,
      scoring: true,
    },
    {
      slot: "B",
      label: "Mesa B",
      day: 1,
      dayLabel: "Dia 1",
      date: "2026-09-12T14:00",
      playerNames: p(4, 5, 6),
      seats: 3,
      scoring: true,
    },
    {
      slot: "C",
      label: "Mesa C",
      day: 2,
      dayLabel: "Dia 2",
      date: null,
      playerNames: p(1, 4, 6),
      seats: 3,
      scoring: true,
    },
    {
      slot: "D",
      label: "Mesa D",
      day: 2,
      dayLabel: "Dia 2",
      date: null,
      playerNames: p(2, 3, 5),
      seats: 3,
      scoring: true,
    },
    {
      slot: "E",
      label: "Mesa E",
      day: 3,
      dayLabel: "Dia 3",
      date: null,
      playerNames: p(2, 4, 5),
      seats: 3,
      scoring: true,
    },
    {
      slot: "F",
      label: "Mesa F",
      day: 3,
      dayLabel: "Dia 3",
      date: null,
      playerNames: p(1, 3, 6),
      seats: 3,
      scoring: true,
    },
    {
      slot: "FINAL",
      label: "Grande Final",
      day: 4,
      dayLabel: "Final",
      date: null,
      // Vazio de propósito: quem senta aqui sai da classificação.
      playerNames: [],
      seats: 4,
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
