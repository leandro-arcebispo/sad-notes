import { cookies } from "next/headers";
import { get } from "./db";
import type { Player } from "./types";

/**
 * "Quem é você?" — identidade por dispositivo, no modelo **seletor de perfil
 * da Netflix** (decisão do usuário, docs/PLANO-PARTIDAS.md §6).
 *
 * Qualquer um pode entrar em qualquer perfil, de propósito: é um grupo de ~12
 * amigos, e uma trava seria cerimônia sem benefício. Por isso o cookie é
 * **simples e sem assinatura** — não há nada a proteger quando o próprio
 * seletor é aberto; assinar daria só uma falsa sensação de segurança.
 *
 * O que isso resolve de verdade é **autoria**: `created_by_player_id` nos
 * eventos passa a nascer preenchido desde o primeiro registro, em vez de ficar
 * `NULL` até a fase de multi-celular.
 *
 * ⚠️ Isto NÃO substitui o `middleware.ts` (basic-auth): a senha do grupo
 * continua sendo a porta do site; o perfil é a camada de dentro. Se um dia
 * virar login de verdade, só a origem do cookie muda — o `player_id` que o
 * resto do app consome continua o mesmo.
 */

export const IDENTITY_COOKIE = "ifsn_player_id";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getCurrentPlayerId(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(IDENTITY_COOKIE)?.value;
  if (!raw) return null;
  const id = Math.trunc(Number(raw));
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * O jogador do dispositivo, revalidado contra o banco. Jogador apagado ou
 * arquivado devolve `null` — assim um perfil que saiu do ar não fica
 * "logado" para sempre num celular esquecido.
 */
export async function getCurrentPlayer(): Promise<Player | null> {
  const id = await getCurrentPlayerId();
  if (!id) return null;
  const player = await get<Player>(
    "SELECT * FROM players WHERE id = ? AND active = 1",
    [id]
  );
  return player ?? null;
}

/** Só pode ser chamado de Route Handler / Server Action (não de RSC). */
export async function setCurrentPlayer(playerId: number): Promise<void> {
  const store = await cookies();
  store.set(IDENTITY_COOKIE, String(playerId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

/** Só pode ser chamado de Route Handler / Server Action (não de RSC). */
export async function clearCurrentPlayer(): Promise<void> {
  const store = await cookies();
  store.delete(IDENTITY_COOKIE);
}
