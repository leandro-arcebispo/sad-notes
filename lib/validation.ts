/**
 * Validação/normalização de payloads de API. Vive fora de app/api/**\/route.ts
 * de propósito: o Next.js exige que arquivos route.ts só exportem handlers
 * HTTP (GET/POST/...) + config — qualquer outro export quebra a checagem de
 * tipos das rotas tipadas.
 */
import {
  BASE_FACES,
  type BaseFace,
  type CharacterSelection,
  type Edition,
  type GameFormat,
  type GamePayload,
  type GamePlayerInput,
  type PlayerInput,
} from "./types";
import { HAIR_COLORS, DEFAULT_HAIR_COLOR } from "./hair-colors";

export function parsePlayerInput(
  body: unknown
): { value: PlayerInput } | { error: string } {
  if (!body || typeof body !== "object") return { error: "corpo inválido" };
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { error: "nome é obrigatório" };

  const nickname =
    typeof b.nickname === "string" && b.nickname.trim()
      ? b.nickname.trim()
      : null;

  const color =
    typeof b.color === "string" && /^#[0-9a-fA-F]{6}$/.test(b.color)
      ? b.color
      : "#e8b978";

  const base_face: BaseFace = BASE_FACES.includes(b.base_face as BaseFace)
    ? (b.base_face as BaseFace)
    : "white";

  const hair_color = HAIR_COLORS.some((c) => c.key === b.hair_color)
    ? (b.hair_color as string)
    : DEFAULT_HAIR_COLOR;

  return { value: { name, nickname, color, base_face, hair_color } };
}

const EDITIONS: Edition[] = ["base", "requiem"];
const SELECTIONS: CharacterSelection[] = ["free", "random"];
const FORMATS: GameFormat[] = ["solo", "duo", "trio"];

function toInt(v: unknown, fallback = 0): number {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : fallback;
}
function toIntOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : null;
}

export function parseGamePayload(
  body: unknown
): { value: GamePayload } | { error: string } {
  if (!body || typeof body !== "object") return { error: "corpo inválido" };
  const b = body as Record<string, unknown>;

  const played_at =
    typeof b.played_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.played_at)
      ? b.played_at
      : "";
  if (!played_at) return { error: "data (played_at) inválida" };

  const edition = EDITIONS.includes(b.edition as Edition)
    ? (b.edition as Edition)
    : "base";
  const character_selection = SELECTIONS.includes(
    b.character_selection as CharacterSelection
  )
    ? (b.character_selection as CharacterSelection)
    : "free";
  const format = FORMATS.includes(b.format as GameFormat)
    ? (b.format as GameFormat)
    : "solo";

  const souls_to_win = toInt(b.souls_to_win, 4);
  if (souls_to_win < 1) return { error: "almas para vencer deve ser >= 1" };

  if (!Array.isArray(b.players) || b.players.length < 2) {
    return { error: "a partida precisa de ao menos 2 jogadores" };
  }

  const seen = new Set<number>();
  const players: GamePlayerInput[] = [];
  for (const raw of b.players as unknown[]) {
    if (!raw || typeof raw !== "object") return { error: "jogador inválido" };
    const p = raw as Record<string, unknown>;
    const player_id = toInt(p.player_id, 0);
    if (!player_id) return { error: "player_id ausente" };
    if (seen.has(player_id)) return { error: "jogador repetido na partida" };
    seen.add(player_id);
    players.push({
      player_id,
      character_id: toIntOrNull(p.character_id),
      had_reroll: Boolean(p.had_reroll),
      loot_in_hand: Math.max(0, toInt(p.loot_in_hand)),
      coins: Math.max(0, toInt(p.coins)),
      deaths: Math.max(0, toInt(p.deaths)),
      treasures: Math.max(0, toInt(p.treasures)),
      souls: Math.max(0, toInt(p.souls)),
      is_winner: Boolean(p.is_winner),
      team: toIntOrNull(p.team),
      items: Array.isArray(p.items)
        ? (p.items as unknown[])
            .map((x) => String(x).trim())
            .filter((x) => x.length > 0)
        : [],
    });
  }

  if (!players.some((p) => p.is_winner)) {
    return { error: "marque ao menos um vencedor" };
  }

  return {
    value: {
      played_at,
      edition,
      souls_to_win,
      character_selection,
      format,
      tournament_id: toIntOrNull(b.tournament_id),
      duration_min: toIntOrNull(b.duration_min),
      rounds: toIntOrNull(b.rounds),
      notes:
        typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : null,
      players,
    },
  };
}
