/**
 * Validação/normalização de payloads de API. Vive fora de app/api/**\/route.ts
 * de propósito: o Next.js exige que arquivos route.ts só exportem handlers
 * HTTP (GET/POST/...) + config — qualquer outro export quebra a checagem de
 * tipos das rotas tipadas.
 */
import {
  BASE_FACES,
  FEEDBACK_AREAS,
  FEEDBACK_KINDS,
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
  UNLOCK_MODES,
  type BaseFace,
  type CharacterSelection,
  type CurseInput,
  type Edition,
  type FeedbackArea,
  type FeedbackInput,
  type FeedbackKind,
  type FeedbackPatch,
  type FeedbackPriority,
  type FeedbackStatus,
  type GameFormat,
  type GamePayload,
  type GamePlayerInput,
  type MonsterInput,
  type PlayerInput,
  type TreasureInput,
  type UnlockMode,
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

export function parseFeedbackInput(
  body: unknown
): { value: FeedbackInput } | { error: string } {
  if (!body || typeof body !== "object") return { error: "corpo inválido" };
  const b = body as Record<string, unknown>;

  const title = typeof b.title === "string" ? b.title.trim() : "";
  if (!title) return { error: "título é obrigatório" };
  if (title.length > 80) return { error: "título deve ter no máximo 80 caracteres" };

  const description =
    typeof b.description === "string" ? b.description.trim() : "";
  if (!description) return { error: "descreva o bug/melhoria/feature" };

  const kind: FeedbackKind = FEEDBACK_KINDS.includes(b.kind as FeedbackKind)
    ? (b.kind as FeedbackKind)
    : "bug";

  const area: FeedbackArea = FEEDBACK_AREAS.some((a) => a.key === b.area)
    ? (b.area as FeedbackArea)
    : "geral";

  const priority: FeedbackPriority = FEEDBACK_PRIORITIES.includes(
    b.priority as FeedbackPriority
  )
    ? (b.priority as FeedbackPriority)
    : "media";

  const player_id =
    b.player_id === null || b.player_id === undefined || b.player_id === ""
      ? null
      : Math.trunc(Number(b.player_id)) || null;

  return {
    value: {
      kind,
      title,
      description: description.slice(0, 2000),
      area,
      priority,
      player_id,
    },
  };
}

/** Patch de mover coluna / trocar responsável / editar conteúdo — todos os
 * campos são opcionais, mas ao menos um precisa estar presente. */
export function parseFeedbackPatch(
  body: unknown
): { value: FeedbackPatch } | { error: string } {
  if (!body || typeof body !== "object") return { error: "corpo inválido" };
  const b = body as Record<string, unknown>;

  const patch: FeedbackPatch = {};

  if (b.status !== undefined) {
    if (!FEEDBACK_STATUSES.includes(b.status as FeedbackStatus)) {
      return { error: "status inválido" };
    }
    patch.status = b.status as FeedbackStatus;
  }

  if (b.assignee_player_id !== undefined) {
    if (b.assignee_player_id === null || b.assignee_player_id === "") {
      patch.assignee_player_id = null;
    } else {
      const n = Math.trunc(Number(b.assignee_player_id));
      if (!Number.isFinite(n) || n <= 0) return { error: "assignee_player_id inválido" };
      patch.assignee_player_id = n;
    }
  }

  if (b.kind !== undefined) {
    if (!FEEDBACK_KINDS.includes(b.kind as FeedbackKind)) return { error: "tipo inválido" };
    patch.kind = b.kind as FeedbackKind;
  }

  if (b.title !== undefined) {
    const title = typeof b.title === "string" ? b.title.trim() : "";
    if (!title) return { error: "título é obrigatório" };
    if (title.length > 80) return { error: "título deve ter no máximo 80 caracteres" };
    patch.title = title;
  }

  if (b.description !== undefined) {
    const description = typeof b.description === "string" ? b.description.trim() : "";
    if (!description) return { error: "descreva o bug/melhoria/feature" };
    patch.description = description.slice(0, 2000);
  }

  if (b.area !== undefined) {
    if (!FEEDBACK_AREAS.some((a) => a.key === b.area)) return { error: "área inválida" };
    patch.area = b.area as FeedbackArea;
  }

  if (b.priority !== undefined) {
    if (!FEEDBACK_PRIORITIES.includes(b.priority as FeedbackPriority)) {
      return { error: "prioridade inválida" };
    }
    patch.priority = b.priority as FeedbackPriority;
  }

  if (Object.keys(patch).length === 0) {
    return { error: "nada para atualizar" };
  }

  return { value: patch };
}

const EDITIONS: Edition[] = ["base", "requiem"];
const SELECTIONS: CharacterSelection[] = ["free", "random"];
const FORMATS: GameFormat[] = ["solo", "duo", "trio"];

function toInt(v: unknown, fallback = 0): number {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : fallback;
}
/** Remove duplicatas case-insensitive, preservando a capitalização da 1ª ocorrência. */
function dedupeCaseInsensitive(names: string[]): string[] {
  const seen = new Map<string, string>();
  for (const n of names) {
    const key = n.toLowerCase();
    if (!seen.has(key)) seen.set(key, n);
  }
  return Array.from(seen.values());
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
      treasure_ids: Array.isArray(p.treasure_ids)
        ? Array.from(
            new Set(
              (p.treasure_ids as unknown[])
                .map((x) => Math.trunc(Number(x)))
                .filter((x) => Number.isFinite(x) && x > 0)
            )
          )
        : [],
      treasure_names: dedupeCaseInsensitive(
        Array.isArray(p.treasure_names)
          ? (p.treasure_names as unknown[]).map((x) => String(x).trim()).filter((x) => x.length > 0)
          : []
      ),
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

function clamp(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

export function parseTreasureInput(
  body: unknown
): { value: TreasureInput } | { error: string } {
  if (!body || typeof body !== "object") return { error: "corpo inválido" };
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { error: "nome é obrigatório" };

  const unlock_mode: UnlockMode = UNLOCK_MODES.includes(b.unlock_mode as UnlockMode)
    ? (b.unlock_mode as UnlockMode)
    : "treasure_item";

  return {
    value: {
      name,
      icon_sprite_id: toIntOrNull(b.icon_sprite_id),
      icon_offset_x: clamp(b.icon_offset_x, -128, 128, 0),
      icon_offset_y: clamp(b.icon_offset_y, -128, 128, 0),
      icon_scale: clamp(b.icon_scale, 20, 300, 100),
      transform_sprite_id: toIntOrNull(b.transform_sprite_id),
      transform_offset_x: clamp(b.transform_offset_x, -128, 128, 0),
      transform_offset_y: clamp(b.transform_offset_y, -128, 128, 0),
      transform_scale: clamp(b.transform_scale, 20, 300, 100),
      card_sprite_id: toIntOrNull(b.card_sprite_id),
      unlock_mode,
    },
  };
}

export function parseCurseInput(
  body: unknown
): { value: CurseInput } | { error: string } {
  if (!body || typeof body !== "object") return { error: "corpo inválido" };
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { error: "nome é obrigatório" };

  return {
    value: {
      name,
      card_sprite_id: toIntOrNull(b.card_sprite_id),
      locked: Boolean(b.locked),
    },
  };
}

export function parseMonsterInput(
  body: unknown
): { value: MonsterInput } | { error: string } {
  if (!body || typeof body !== "object") return { error: "corpo inválido" };
  const b = body as Record<string, unknown>;

  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (!name) return { error: "nome é obrigatório" };

  return {
    value: {
      name,
      card_sprite_id: toIntOrNull(b.card_sprite_id),
    },
  };
}
