import { NextResponse } from "next/server";
import { createGame, listGames } from "@/lib/games";
import type {
  CharacterSelection,
  Edition,
  GameFormat,
  GamePayload,
  GamePlayerInput,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listGames());
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = parseGamePayload(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  return NextResponse.json(createGame(parsed.value), { status: 201 });
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
