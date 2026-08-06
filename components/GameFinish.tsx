"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PlayerAvatar from "./PlayerAvatar";
import TreasurePicker, {
  type TreasurePickerOption,
  type TreasureSelection,
} from "./TreasurePicker";
import type { DerivedPlayerStats, GameFull } from "@/lib/types";

/**
 * **Etapa de finalização** — só estado final, e boa parte dele já vem
 * **derivada dos eventos** da Run (almas, mortes, PvP kills, duração). O
 * usuário confirma ou corrige: divergência entre o que ele digita e o que os
 * eventos dizem é **avisada, nunca bloqueada** — alma pode ter sido roubada ou
 * destruída, e quem estava na mesa manda. Ver docs/PLANO-PARTIDAS.md §7.3.
 */

type Row = {
  player_id: number;
  souls: number;
  coins: number;
  loot_in_hand: number;
  treasures: number;
  deaths: number;
  pvp_kills: number;
  treasure_ids: number[];
  treasure_names: string[];
  is_winner: boolean;
};

export default function GameFinish({
  game,
  derived,
  activeMinutes,
  treasureOptions,
}: {
  game: GameFull;
  derived: Record<number, DerivedPlayerStats>;
  activeMinutes: number | null;
  treasureOptions: TreasurePickerOption[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [duration, setDuration] = useState(
    activeMinutes === null ? "" : String(activeMinutes)
  );
  const [rounds, setRounds] = useState(game.rounds === null ? "" : String(game.rounds));
  const [notes, setNotes] = useState(game.notes ?? "");

  const [rows, setRows] = useState<Row[]>(() =>
    game.players.map((p) => {
      const d = derived[p.player_id];
      return {
        player_id: p.player_id,
        // Pré-preenchido do diário quando houver; senão, o que já estiver salvo.
        souls: d ? Math.max(0, d.souls) : p.souls,
        coins: p.coins,
        loot_in_hand: p.loot_in_hand,
        treasures: p.treasures,
        deaths: d ? d.deaths : p.deaths,
        pvp_kills: d ? d.pvp_kills : p.pvp_kills,
        treasure_ids: p.owned_treasures.map((t) => t.id),
        treasure_names: [],
        is_winner: p.is_winner === 1,
      };
    })
  );

  const playerById = useMemo(
    () => new Map(game.players.map((p) => [p.player_id, p])),
    [game.players]
  );
  const isTeamGame = game.format !== "solo";
  const teams = useMemo(
    () =>
      Array.from(
        new Set(game.players.map((p) => p.team).filter((t): t is number => t != null))
      ).sort((a, b) => a - b),
    [game.players]
  );
  const winnerTeam =
    rows.find((r) => r.is_winner)?.player_id != null
      ? playerById.get(rows.find((r) => r.is_winner)!.player_id)?.team ?? null
      : null;

  function patch(id: number, p: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.player_id === id ? { ...r, ...p } : r)));
  }
  function setWinnerSolo(id: number) {
    setRows((prev) => prev.map((r) => ({ ...r, is_winner: r.player_id === id })));
  }
  function setWinnerTeam(team: number) {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        is_winner: playerById.get(r.player_id)?.team === team,
      }))
    );
  }

  /** Soma de almas do time — o objetivo é do time em duplas/trios (§2.4). */
  function teamSouls(team: number): number {
    return rows
      .filter((r) => playerById.get(r.player_id)?.team === team)
      .reduce((acc, r) => acc + r.souls, 0);
  }

  /** Aviso (não trava) quando o número digitado não bate com o diário. */
  function mismatch(r: Row): string | null {
    const d = derived[r.player_id];
    if (!d) return null;
    const diffs: string[] = [];
    if (Math.max(0, d.souls) !== r.souls) diffs.push(`almas ${Math.max(0, d.souls)}`);
    if (d.deaths !== r.deaths) diffs.push(`mortes ${d.deaths}`);
    if (d.pvp_kills !== r.pvp_kills) diffs.push(`PvP ${d.pvp_kills}`);
    return diffs.length ? `diário registrou ${diffs.join(" · ")}` : null;
  }

  async function submit() {
    setError(null);
    if (!rows.some((r) => r.is_winner)) {
      setError("Marque o vencedor.");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/games/${game.id}/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        duration_min: duration === "" ? null : Number(duration),
        rounds: rounds === "" ? null : Number(rounds),
        notes: notes.trim() || null,
        players: rows,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Erro ao finalizar.");
      setSubmitting(false);
      return;
    }
    router.push(`/partidas/${game.id}`);
    router.refresh();
  }

  return (
    <div className="stack wizard">
      <div className="panel form-panel">
        <div className="setup-grid">
          <div className="field">
            <label>Duração (min)</label>
            <input
              className="input"
              type="number"
              min={0}
              value={duration}
              placeholder="—"
              onChange={(e) => setDuration(e.target.value)}
            />
            {activeMinutes !== null && (
              <span className="muted" style={{ fontSize: 12 }}>
                Cronometrado: {activeMinutes} min (sem contar pausas)
              </span>
            )}
          </div>
          <div className="field">
            <label>Rodadas</label>
            <input
              className="input"
              type="number"
              min={0}
              value={rounds}
              placeholder="—"
              onChange={(e) => setRounds(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Vencedor</label>
            {isTeamGame ? (
              <select
                className="select"
                value={winnerTeam ?? ""}
                onChange={(e) => setWinnerTeam(Number(e.target.value))}
              >
                <option value="">— time vencedor —</option>
                {teams.map((t) => (
                  <option key={t} value={t}>
                    Time {t} · {teamSouls(t)} almas
                  </option>
                ))}
              </select>
            ) : (
              <select
                className="select"
                value={rows.find((r) => r.is_winner)?.player_id ?? ""}
                onChange={(e) => setWinnerSolo(Number(e.target.value))}
              >
                <option value="">— quem venceu —</option>
                {rows.map((r) => (
                  <option key={r.player_id} value={r.player_id}>
                    {playerById.get(r.player_id)?.player_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Notas (opcional)</label>
            <textarea
              className="textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {rows.map((r) => {
          const gp = playerById.get(r.player_id)!;
          const warn = mismatch(r);
          return (
            <div key={r.player_id} className={`final-row${r.is_winner ? " winner" : ""}`}>
              <div className="final-id">
                <PlayerAvatar
                  face={gp.player_base_face}
                  size={44}
                  avatarCache={gp.player_avatar_cache}
                />
                <div>
                  <div className="pixel-label">
                    {gp.player_name}
                    {r.is_winner ? " 👑" : ""}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {gp.character_name ?? "sem personagem"}
                    {isTeamGame && gp.team ? ` · Time ${gp.team}` : ""}
                  </div>
                  {warn && (
                    <div style={{ fontSize: 11, color: "var(--accent)" }}>⚠ {warn}</div>
                  )}
                </div>
              </div>
              <div className="final-stats">
                <NumBox label="Almas" value={r.souls} onChange={(v) => patch(r.player_id, { souls: v })} />
                <NumBox label="Moedas" value={r.coins} onChange={(v) => patch(r.player_id, { coins: v })} />
                <NumBox label="Loot" value={r.loot_in_hand} onChange={(v) => patch(r.player_id, { loot_in_hand: v })} />
                <NumBox label="Tesouros" value={r.treasures} onChange={(v) => patch(r.player_id, { treasures: v })} />
                <NumBox label="Mortes" value={r.deaths} onChange={(v) => patch(r.player_id, { deaths: v })} />
                <NumBox label="PvP" value={r.pvp_kills} onChange={(v) => patch(r.player_id, { pvp_kills: v })} />
              </div>
              <div className="final-items">
                <label className="mini-label">Tesouros</label>
                <TreasurePicker
                  value={{ ids: r.treasure_ids, names: r.treasure_names }}
                  onChange={(v: TreasureSelection) =>
                    patch(r.player_id, { treasure_ids: v.ids, treasure_names: v.names })
                  }
                  options={treasureOptions}
                />
              </div>
            </div>
          );
        })}
      </div>

      {error && <div style={{ color: "var(--blood)" }}>{error}</div>}

      <div className="row wizard-nav">
        <button
          className="btn"
          onClick={() => router.push(`/partidas/${game.id}`)}
          disabled={submitting}
        >
          ← Voltar
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-accent" onClick={submit} disabled={submitting}>
          {submitting ? "Salvando…" : "Finalizar partida"}
        </button>
      </div>
    </div>
  );
}

function NumBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="numbox">
      <span className="mini-label">{label}</span>
      <input
        className="input"
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.trunc(Number(e.target.value)) || 0))}
      />
    </label>
  );
}
