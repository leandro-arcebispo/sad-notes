import { all, get, nowIso, run } from "./db";
import {
  CHARACTER_SELECTIONS,
  EDITIONS,
  GAME_EVENT_TYPES,
  GAME_FORMATS,
  type GameEventType,
  type GameMode,
  type GameModeFull,
  type GameModeInput,
  type GameModeParams,
} from "./types";

/**
 * Modos de jogo — o "preset vs sandbox" do Project Zomboid: o usuário parte de
 * um preset e salva a própria variação. Ver docs/PLANO-PARTIDAS.md §5.
 *
 * ⚠️ **O modo é template, não histórico.** No Setup os parâmetros são COPIADOS
 * pra dentro da partida (`games.params_json`). Editar um modo nunca reescreve
 * partida já registrada — é a regra inegociável do §5.
 */

export const DEFAULT_PARAMS: GameModeParams = {
  edition: "base",
  souls_to_win: 4,
  bonus_souls: true,
  format: "solo",
  character_selection: "free",
  rerolls_allowed: 1,
  allow_tainted: false,
  enabled_events: ["morte", "alma_ganha", "monstro_derrotado"],
};

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.trunc(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}

/**
 * Normaliza qualquer entrada (formulário, JSON do banco, payload de API) num
 * `GameModeParams` válido. É o único ponto que precisa mudar pra adicionar um
 * parâmetro novo — parâmetro novo não exige migração de schema (§5 do plano).
 */
export function normalizeParams(raw: unknown): GameModeParams {
  const o = (raw ?? {}) as Record<string, unknown>;
  const events = Array.isArray(o.enabled_events)
    ? (o.enabled_events.filter((e) =>
        GAME_EVENT_TYPES.includes(e as GameEventType)
      ) as GameEventType[])
    : DEFAULT_PARAMS.enabled_events;

  return {
    edition: oneOf(o.edition, EDITIONS, DEFAULT_PARAMS.edition),
    souls_to_win: clampInt(o.souls_to_win, 1, 20, DEFAULT_PARAMS.souls_to_win),
    bonus_souls: o.bonus_souls === undefined ? DEFAULT_PARAMS.bonus_souls : !!o.bonus_souls,
    format: oneOf(o.format, GAME_FORMATS, DEFAULT_PARAMS.format),
    character_selection: oneOf(
      o.character_selection,
      CHARACTER_SELECTIONS,
      DEFAULT_PARAMS.character_selection
    ),
    rerolls_allowed: clampInt(o.rerolls_allowed, 0, 10, DEFAULT_PARAMS.rerolls_allowed),
    allow_tainted: o.allow_tainted === undefined ? DEFAULT_PARAMS.allow_tainted : !!o.allow_tainted,
    // Dedupe preservando ordem — a ordem define a ordem dos botões na Run.
    enabled_events: [...new Set(events)],
  };
}

/** Desserializa `params_json` (de um modo ou de uma partida) com fallback
 * seguro: JSON corrompido/ausente vira os defaults em vez de derrubar a tela. */
export function parseParams(json: string | null | undefined): GameModeParams {
  if (!json) return { ...DEFAULT_PARAMS };
  try {
    return normalizeParams(JSON.parse(json));
  } catch {
    return { ...DEFAULT_PARAMS };
  }
}

function hydrate(m: GameMode): GameModeFull {
  return { ...m, params: parseParams(m.params_json) };
}

export async function listGameModes(includeInactive = false): Promise<GameModeFull[]> {
  const rows = await all<GameMode>(
    `SELECT * FROM game_modes
      ${includeInactive ? "" : "WHERE active = 1"}
      ORDER BY is_preset DESC, name COLLATE NOCASE`
  );
  return rows.map(hydrate);
}

export async function getGameMode(id: number): Promise<GameModeFull | undefined> {
  const row = await get<GameMode>("SELECT * FROM game_modes WHERE id = ?", [id]);
  return row ? hydrate(row) : undefined;
}

export async function createGameMode(input: GameModeInput): Promise<GameModeFull> {
  const params = normalizeParams(input.params);
  const { lastId } = await run(
    `INSERT INTO game_modes (name, description, is_preset, params_json, active, created_at)
     VALUES (?, ?, 0, ?, 1, ?)`,
    [input.name.trim(), input.description?.trim() || null, JSON.stringify(params), nowIso()]
  );
  return (await getGameMode(lastId))!;
}

export async function updateGameMode(
  id: number,
  input: GameModeInput
): Promise<GameModeFull | undefined> {
  const existing = await getGameMode(id);
  if (!existing) return undefined;
  const params = normalizeParams(input.params);
  await run(
    "UPDATE game_modes SET name = ?, description = ?, params_json = ? WHERE id = ?",
    [input.name.trim(), input.description?.trim() || null, JSON.stringify(params), id]
  );
  return await getGameMode(id);
}

/**
 * Presets semeados não são apagáveis (o usuário copia e edita a cópia). Modo
 * criado pelo usuário é **arquivado**, não deletado: partidas antigas guardam
 * `mode_id` como rótulo e ficariam órfãs de nome se a linha sumisse — mesmo
 * raciocínio do soft-delete de jogadores.
 */
export async function archiveGameMode(id: number): Promise<"ok" | "preset" | "notfound"> {
  const mode = await getGameMode(id);
  if (!mode) return "notfound";
  if (mode.is_preset) return "preset";
  await run("UPDATE game_modes SET active = 0 WHERE id = ?", [id]);
  return "ok";
}
