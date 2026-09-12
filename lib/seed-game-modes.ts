import type { GameModeParams } from "./types";

/**
 * Presets de modo de jogo semeados na primeira subida (modelo Project Zomboid:
 * o usuário parte de um preset e salva o próprio "sandbox"). Dado puro, sem
 * import de `db.ts` — mesmo padrão de `seed-characters.ts`, que evita ciclo de
 * import (db.ts → seed → db.ts).
 *
 * ⚠️ Preset é TEMPLATE, não histórico: os parâmetros são copiados pra dentro
 * da partida no Setup (`games.params_json`). Editar um preset aqui ou pela UI
 * nunca altera partida já registrada — ver docs/PLANO-PARTIDAS.md §5.
 */

/** Eventos ligados por padrão na Run: tier 1 (sempre) + tier 2 (opcional). */
const EVENTOS_COMPLETOS: GameModeParams["enabled_events"] = [
  "morte",
  "alma_ganha",
  "monstro_derrotado",
  "maldicao_recebida",
  "alma_perdida",
  "alma_roubada",
];

/** Só o tier 1 — pra mesa que não quer parar pra anotar. */
const EVENTOS_BASICOS: GameModeParams["enabled_events"] = [
  "morte",
  "alma_ganha",
  "monstro_derrotado",
];

export interface SeedGameMode {
  name: string;
  description: string;
  params: GameModeParams;
}

export const SEED_GAME_MODES: SeedGameMode[] = [
  {
    name: "Clássico",
    description: "Jogo base, 4 almas, cada um por si, personagem à escolha.",
    params: {
      edition: "base",
      souls_to_win: 4,
      bonus_souls: true,
      format: "solo",
      character_selection: "free",
      rerolls_allowed: 1,
      allow_tainted: false,
      enabled_events: EVENTOS_COMPLETOS,
    },
  },
  {
    name: "Clássico Requiem",
    description: "Base + Requiem, 4 almas, personagem sorteado com 1 re-roll.",
    params: {
      edition: "requiem",
      souls_to_win: 4,
      bonus_souls: true,
      format: "solo",
      character_selection: "random",
      rerolls_allowed: 1,
      allow_tainted: true,
      enabled_events: EVENTOS_COMPLETOS,
    },
  },
  {
    name: "Rápido",
    description: "Jogo base, 2 almas — partida curta, registro enxuto.",
    params: {
      edition: "base",
      souls_to_win: 2,
      bonus_souls: false,
      format: "solo",
      character_selection: "free",
      rerolls_allowed: 1,
      allow_tainted: false,
      enabled_events: EVENTOS_BASICOS,
    },
  },
  {
    name: "Duplas",
    description: "Base + Requiem em duplas — as almas contam para o time.",
    params: {
      edition: "requiem",
      souls_to_win: 4,
      bonus_souls: true,
      format: "duo",
      character_selection: "random",
      rerolls_allowed: 1,
      allow_tainted: true,
      enabled_events: EVENTOS_COMPLETOS,
    },
  },
];
