"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";
import type { TournamentState } from "@/lib/tournaments";
import { GAME_STATUS_LABELS, type Player } from "@/lib/types";

/**
 * Tela de torneio. O chaveamento é estático (`lib/tournament-defs.ts`) e a
 * classificação é derivada das partidas — nunca digitada.
 *
 * A única coisa editável aqui são os **participantes**: quem ocupa cada vaga
 * ("Jogador 1".."Jogador 6") é escolhido entre os jogadores cadastrados e fica
 * em `settings`, pra dar pra montar o torneio em produção sem deploy.
 */
export default function TournamentClient({
  state,
  players,
}: {
  state: TournamentState;
  players: Player[];
}) {
  const router = useRouter();
  const { def, roster, tables, standings, missingSeats } = state;

  const [picks, setPicks] = useState<(number | null)[]>(() =>
    roster.map((s) => s.player?.id ?? null)
  );
  const [editing, setEditing] = useState(missingSeats > 0);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byDay = Array.from(new Set(tables.map((t) => t.def.day))).sort((a, b) => a - b);
  const dirty = picks.some((p, i) => p !== (roster[i].player?.id ?? null));

  async function saveRoster() {
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/tournaments/${def.slug}/roster`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roster: picks }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Não deu para salvar os participantes.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function startTable(slot: string) {
    const table = tables.find((t) => t.def.slot === slot);
    if (!table || !table.ready) return;
    setError(null);
    setBusy(slot);

    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "setup",
        retro: false,
        played_at: (table.def.date ?? new Date().toISOString()).slice(0, 10),
        mode_id: null,
        tournament_id: def.id,
        tournament_slot: slot,
        notes: `${def.name} ${def.year} · ${table.def.label}`,
        params: {
          edition: def.edition,
          souls_to_win: def.soulsToWin,
          // Mesa de 3 é cada um por si: `format` no app é tamanho de TIME,
          // então "solo" com 3 participantes — nada a ver com "trio".
          format: "solo",
          character_selection: "free",
          bonus_souls: true,
          allow_tainted: false,
          enabled_events: [
            "morte",
            "alma_ganha",
            "monstro_derrotado",
            "maldicao_recebida",
            "alma_perdida",
            "alma_roubada",
          ],
        },
        players: table.seats.map((s) => ({
          player_id: s.player!.id,
          character_id: null,
          team: null,
        })),
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Não deu para criar a partida desta mesa.");
      setBusy(null);
      return;
    }
    const game = await res.json();
    router.push(`/partidas/${game.id}/run`);
  }

  return (
    <div className="stack">
      <div className="meta-chips">
        <span className="badge">🏆 {def.format}</span>
        <span className="badge">🎮 {def.rulesNote}</span>
        <span className="badge">👻 {def.soulsToWin} almas</span>
        <span className="badge">
          1º = {def.pointsByPlace[0]} pts · 2º = {def.pointsByPlace[1]} pts · 3º ={" "}
          {def.pointsByPlace[2]} pt
        </span>
      </div>

      {/* ----------------------------- participantes ------------------------- */}
      <div className={`panel form-panel${missingSeats > 0 ? " tourney-warn" : ""}`}>
        <button className="run-collapse" onClick={() => setEditing((v) => !v)}>
          <span className="mini-label">
            Participantes
            {missingSeats > 0 && ` — faltam ${missingSeats} de ${def.rosterSize}`}
          </span>
          <span className="muted">{editing ? "▲ esconder" : "▼ trocar"}</span>
        </button>

        {!editing && (
          <div className="tourney-roster-summary">
            {roster.map((s) => (
              <span key={s.seat} className="tourney-roster-chip">
                {s.player ? (
                  <>
                    <PlayerAvatar
                      face={s.player.base_face}
                      size={26}
                      avatarCache={s.player.avatar_cache}
                    />
                    {s.player.name}
                  </>
                ) : (
                  <span className="muted">{s.label} — vaga aberta</span>
                )}
              </span>
            ))}
          </div>
        )}

        {editing && (
          <>
            {players.length < def.rosterSize && (
              <div className="muted" style={{ marginTop: 8 }}>
                Só há {players.length} jogador(es) cadastrado(s) para {def.rosterSize} vagas
                — dá para deixar vagas abertas e completar depois.{" "}
                <Link href="/jogadores" className="row-link">
                  Cadastrar jogadores
                </Link>
                .
              </div>
            )}
            <div className="tourney-roster">
              {roster.map((s, i) => (
                <div key={s.seat} className="field">
                  <label>{s.label}</label>
                  <select
                    className="select"
                    value={picks[i] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value ? Number(e.target.value) : null;
                      setPicks((prev) => prev.map((p, j) => (j === i ? v : p)));
                    }}
                  >
                    <option value="">— vaga aberta —</option>
                    {players.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        // Já está em outra vaga: aparece, mas não deixa escolher —
                        // a mesma pessoa em duas vagas jogaria contra si mesma.
                        disabled={picks.includes(p.id) && picks[i] !== p.id}
                      >
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
              <button
                className="btn"
                onClick={() => setPicks(roster.map((s) => s.player?.id ?? null))}
                disabled={!dirty || saving}
              >
                Desfazer
              </button>
              <button className="btn btn-accent" onClick={saveRoster} disabled={saving}>
                {saving ? "Salvando…" : "Salvar participantes"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ------------------------------ classificação ------------------------ */}
      <div className="panel" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "8%" }}>#</th>
              <th>Jogador</th>
              <th style={{ textAlign: "center", width: "12%" }}>Pontos</th>
              <th style={{ textAlign: "center", width: "12%" }}>Mesas</th>
              <th style={{ textAlign: "center", width: "16%" }}>1º / 2º / 3º</th>
              <th style={{ textAlign: "center", width: "12%" }}>Almas</th>
            </tr>
          </thead>
          <tbody>
            {standings.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="center-empty">
                    {missingSeats === def.rosterSize
                      ? "Escolha os participantes para montar as mesas."
                      : "A classificação aparece assim que a primeira mesa for finalizada."}
                  </div>
                </td>
              </tr>
            ) : (
              standings.map((r) => (
                <tr key={r.player_id} className={r.qualified ? "winner-row" : ""}>
                  <td>{r.qualified ? `★ ${r.rank}` : r.rank}</td>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <PlayerAvatar face={r.base_face} size={36} avatarCache={r.avatar_cache} />
                      <span>{r.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <strong>{r.points}</strong>
                  </td>
                  <td style={{ textAlign: "center" }}>{r.played}</td>
                  <td style={{ textAlign: "center" }}>
                    {r.firsts} / {r.seconds} / {r.thirds}
                  </td>
                  <td style={{ textAlign: "center" }}>{r.souls}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        ★ = entre os {def.finalists} que vão para a Grande Final. Desempate: pontos →
        1ºs lugares → almas → tesouros → loots → moedas.
      </div>

      {/* --------------------------------- mesas ----------------------------- */}
      {byDay.map((day) => {
        const dayTables = tables.filter((t) => t.def.day === day);
        const label = dayTables[0]?.def.dayLabel ?? `Dia ${day}`;
        const date = dayTables[0]?.def.date;
        return (
          <div key={day} className="stack" style={{ gap: 10 }}>
            <div className="row" style={{ gap: 10, alignItems: "baseline" }}>
              <span className="pixel-label tourney-day">{label}</span>
              <span className="muted">
                {date
                  ? new Date(date).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "data a definir"}
              </span>
            </div>

            <div className="tourney-grid">
              {dayTables.map((t) => (
                <div key={t.def.slot} className="panel tourney-table">
                  <div className="tourney-table-head">
                    <span className="pixel-label">{t.def.label}</span>
                    {t.game_status && (
                      <span className={`badge status-${t.game_status}`}>
                        {GAME_STATUS_LABELS[t.game_status]}
                      </span>
                    )}
                  </div>

                  {t.results.length > 0 ? (
                    <ul className="tourney-seats">
                      {t.results.map((r) => (
                        <li key={r.player_id} className={r.place === 1 ? "first" : ""}>
                          <span className="tourney-place">{r.place}º</span>
                          <PlayerAvatar face={r.base_face} size={28} avatarCache={r.avatar_cache} />
                          <span className="tourney-name">
                            {r.name}
                            {r.tied && (
                              <span className="muted" title="empate em todos os critérios">
                                {" "}
                                ⚠
                              </span>
                            )}
                          </span>
                          <span className="tourney-points">{r.points} pts</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="tourney-seats">
                      {t.seats.length === 0 && (
                        <li className="muted">Definida pela classificação</li>
                      )}
                      {t.seats.map((s) => (
                        <li key={s.seat}>
                          <span className="tourney-place">—</span>
                          {s.player ? (
                            <PlayerAvatar
                              face={s.player.base_face}
                              size={28}
                              avatarCache={s.player.avatar_cache}
                            />
                          ) : (
                            <span className="tourney-place">?</span>
                          )}
                          <span className="tourney-name">
                            {s.player ? s.player.name : s.label}
                          </span>
                          {!s.player && (
                            <span className="muted" style={{ fontSize: 11 }}>
                              vaga aberta
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="tourney-table-foot">
                    {t.game_id ? (
                      <Link
                        href={
                          t.game_status === "finalizada" || t.game_status === "abortada"
                            ? `/partidas/${t.game_id}`
                            : `/partidas/${t.game_id}/run`
                        }
                        className="btn"
                      >
                        {t.game_status === "finalizada" || t.game_status === "abortada"
                          ? "ver partida"
                          : "▶ continuar na Run"}
                      </Link>
                    ) : (
                      <button
                        className="btn btn-accent"
                        disabled={!t.ready || busy !== null}
                        title={
                          t.ready
                            ? undefined
                            : t.seats.length === 0
                              ? "os finalistas saem da classificação"
                              : "esta mesa ainda tem vaga aberta"
                        }
                        onClick={() => startTable(t.def.slot)}
                      >
                        {busy === t.def.slot
                          ? "Criando…"
                          : t.seats.length === 0
                            ? "aguardando classificação"
                            : "▶ Começar mesa"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {error && <div style={{ color: "var(--blood)" }}>{error}</div>}
    </div>
  );
}
