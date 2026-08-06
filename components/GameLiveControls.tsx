"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PlayerAvatar from "./PlayerAvatar";
import type { Character, GameFull, GameStatus } from "@/lib/types";

/**
 * Controles de uma partida que ainda está rolando: ciclo de vida (pausar,
 * retomar, abandonar, finalizar) e o sorteio de personagem por participante.
 *
 * O sorteio bate na API **por jogador**, e não em lote, porque é a mesma rota
 * que a sessão multi-celular vai usar quando cada um sortear no próprio
 * aparelho (docs/PLANO-PARTIDAS.md §6.5). O resultado sai do servidor: aqui não
 * dá pra re-rolar até gostar nem tirar o personagem que outro já pegou.
 */
export default function GameLiveControls({
  game,
  characters,
}: {
  game: GameFull;
  characters: Character[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPaused = game.status === "pausada";

  async function changeStatus(status: GameStatus) {
    if (status === "abortada" && !confirm("Abandonar esta partida? Ela não vai contar no ranking.")) {
      return;
    }
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Não deu para mudar o estado da partida.");
      return;
    }
    router.refresh();
  }

  async function bumpRounds(delta: number) {
    const next = Math.max(0, (game.rounds ?? 0) + delta);
    setBusy(true);
    await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rounds: next }),
    });
    setBusy(false);
    router.refresh();
  }

  async function rollFor(playerId: number) {
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/games/${game.id}/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "roll" }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Não deu para sortear.");
      return;
    }
    router.refresh();
  }

  async function pickFor(playerId: number, characterId: number | null) {
    setBusy(true);
    await fetch(`/api/games/${game.id}/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ character_id: characterId }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="stack">
      <div className="panel form-panel">
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {isPaused ? (
            <button className="btn" onClick={() => changeStatus("andamento")} disabled={busy}>
              ▶️ Retomar
            </button>
          ) : (
            <button className="btn" onClick={() => changeStatus("pausada")} disabled={busy}>
              ⏸️ Pausar
            </button>
          )}

          {/* Contador de rodada livre: ninguém é obrigado a usar e nada trava a
              mesa se ficar desatualizado (§2.5 — decisão do usuário). */}
          <span className="row" style={{ gap: 4, alignItems: "center" }}>
            <button className="btn" onClick={() => bumpRounds(-1)} disabled={busy}>
              −
            </button>
            <span className="badge">🔁 Rodada {game.rounds ?? 0}</span>
            <button className="btn" onClick={() => bumpRounds(1)} disabled={busy}>
              +
            </button>
          </span>

          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => changeStatus("abortada")} disabled={busy}>
            Abandonar
          </button>
          <a className="btn btn-accent" href={`/partidas/${game.id}/finalizar`}>
            Finalizar partida →
          </a>
        </div>
      </div>

      <div className="panel form-panel">
        <label className="mini-label">Personagens</label>
        <div className="stack" style={{ gap: 8, marginTop: 8 }}>
          {game.players.map((p) => (
            <div key={p.id} className="part-row on">
              <span className="part-check">
                <PlayerAvatar
                  face={p.player_base_face}
                  size={36}
                  avatarCache={p.player_avatar_cache}
                />
                <span className="pixel-label">{p.player_name}</span>
              </span>
              <div className="part-controls">
                <span className="badge">{p.character_name ?? "— sem personagem —"}</span>
                {game.character_selection === "random" ? (
                  <button className="btn" onClick={() => rollFor(p.player_id)} disabled={busy}>
                    🎲 {p.character_id ? `re-roll (${p.reroll_count}/${game.rerolls_allowed})` : "sortear"}
                  </button>
                ) : (
                  <select
                    className="select"
                    value={p.character_id ?? ""}
                    onChange={(e) =>
                      pickFor(p.player_id, e.target.value ? Number(e.target.value) : null)
                    }
                    disabled={busy}
                  >
                    <option value="">— personagem —</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.tainted ? " ✦" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div style={{ color: "var(--blood)" }}>{error}</div>}
    </div>
  );
}
