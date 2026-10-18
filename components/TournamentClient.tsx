"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";
import StatIcon, { type StatIconName } from "./StatIcon";
import type { StandingCriterion, TournamentState } from "@/lib/tournaments";
import { EVENT_TYPE_DEFS } from "@/lib/game-events";
import { GAME_STATUS_LABELS, type Player } from "@/lib/types";

/** Colunas de desempate da classificação, na ordem em que o critério as lê. */
const TIEBREAK_STATS: {
  key: Exclude<StandingCriterion, "points" | "firsts">;
  icon: StatIconName;
  label: string;
}[] = [
  { key: "souls", icon: "souls", label: "Almas" },
  { key: "treasures", icon: "treasures", label: "Tesouros" },
  { key: "loot_in_hand", icon: "loot", label: "Loot" },
  { key: "coins", icon: "coins", label: "Moedas" },
];

/** Monstros derrotados e mortes sofridas: colunas informativas depois do
 * desempate — não decidem posição nenhuma. Monstros vêm do Diário da Run;
 * mortes, do placar da finalização. */
const MONSTER_ICON = EVENT_TYPE_DEFS.monstro_derrotado.icon;
const EXTRA_COLS = 2;

const COLS = 5 + TIEBREAK_STATS.length + EXTRA_COLS;

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
      {/* Colunas na ordem do desempate: quem lê da esquerda pra direita refaz
          a conta, e a célula `.tourney-dec` mostra onde ela parou. Em largura
          estreita os stats saem das colunas e viram chips sob o nome. */}
      <div className="panel tourney-standings-panel" style={{ padding: 0 }}>
        <table className="data-table tourney-standings">
          <thead>
            <tr className="tourney-grp">
              <th colSpan={3} />
              <th colSpan={2}>Classificação</th>
              <th colSpan={TIEBREAK_STATS.length}>Desempate →</th>
              <th colSpan={EXTRA_COLS}>Fora do desempate</th>
            </tr>
            <tr>
              <th className="col-rank">#</th>
              <th className="col-player">Jogador</th>
              <th className="col-num col-played">Mesas</th>
              <th className="col-num">
                <span className="tourney-lbl-long">Pontos</span>
                <span className="tourney-lbl-short">Pts</span>
              </th>
              <th className="col-places">1º/2º/3º</th>
              {TIEBREAK_STATS.map((s) => (
                <th key={s.key} className="col-num col-stat">
                  <span className="th-icon th-icon-stack">
                    <StatIcon name={s.icon} size={20} />
                    {s.label}
                  </span>
                </th>
              ))}
              <th
                className="col-num col-stat"
                title="Monstros derrotados, contados no Diário da Run — não entra no desempate"
              >
                <span className="th-icon th-icon-stack">
                  <span className="th-emoji">{MONSTER_ICON}</span>
                  Monstros
                </span>
              </th>
              <th
                className="col-num col-stat"
                title="Mortes sofridas, do placar da finalização — não entra no desempate"
              >
                <span className="th-icon th-icon-stack">
                  <StatIcon name="deaths" size={20} />
                  Mortes
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.length === 0 ? (
              <tr>
                <td colSpan={COLS}>
                  <div className="center-empty">
                    {missingSeats === def.rosterSize
                      ? "Escolha os participantes para montar as mesas."
                      : "A classificação aparece assim que a primeira mesa for finalizada."}
                  </div>
                </td>
              </tr>
            ) : (
              standings.map((r) => (
                <Fragment key={r.player_id}>
                  <tr className={r.qualified ? "winner-row" : ""}>
                    <td className="col-rank">{r.qualified ? `★ ${r.rank}` : r.rank}</td>
                    <td className="col-player">
                      <div className="row" style={{ gap: 10 }}>
                        <PlayerAvatar face={r.base_face} size={36} avatarCache={r.avatar_cache} />
                        <span>
                          {r.name}
                          {r.tied && (
                            <span
                              className="muted"
                              title="empate em todos os critérios — ficou em ordem alfabética"
                            >
                              {" "}
                              ⚠
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="tourney-chips">
                        <span
                          className={`tourney-chip${r.decided_by === "firsts" ? " tourney-dec" : ""}`}
                          title="1º / 2º / 3º lugares"
                        >
                          <StatIcon name="wins" size={14} />
                          {r.firsts}/{r.seconds}/{r.thirds}
                        </span>
                        {TIEBREAK_STATS.map((s) => (
                          <span
                            key={s.key}
                            className={`tourney-chip${r.decided_by === s.key ? " tourney-dec" : ""}`}
                            title={s.label}
                          >
                            <StatIcon name={s.icon} size={14} />
                            {r[s.key]}
                          </span>
                        ))}
                        <span className="tourney-chip" title="Monstros derrotados (Diário da Run)">
                          {MONSTER_ICON} {r.monsters ?? "—"}
                        </span>
                        <span className="tourney-chip" title="Mortes sofridas">
                          <StatIcon name="deaths" size={14} />
                          {r.deaths}
                        </span>
                      </div>
                    </td>
                    <td className="col-played tourney-dim">{r.played}</td>
                    <td className="tourney-pts">{r.points}</td>
                    <td className={`col-places${r.decided_by === "firsts" ? " tourney-dec" : ""}`}>
                      {r.firsts} / {r.seconds} / {r.thirds}
                    </td>
                    {TIEBREAK_STATS.map((s) => (
                      <td
                        key={s.key}
                        className={`col-stat ${r.decided_by === s.key ? "tourney-dec" : "tourney-dim"}`}
                      >
                        {r[s.key]}
                      </td>
                    ))}
                    <td
                      className="col-stat tourney-dim"
                      title={r.monsters == null ? "nenhuma mesa dele tem Diário da Run" : undefined}
                    >
                      {r.monsters ?? "—"}
                    </td>
                    <td className="col-stat tourney-dim">{r.deaths}</td>
                  </tr>
                  {r.rank === def.finalists && standings.length > def.finalists && (
                    <tr className="tourney-cut">
                      <td colSpan={COLS}>linha da Grande Final</td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="muted" style={{ fontSize: 12 }}>
        ★ = entre os {def.finalists} que vão para a Grande Final. Empate em pontos se
        resolve na ordem das colunas: 1ºs lugares → almas → tesouros → loots → moedas. Em
        dourado, o critério que separou o jogador do de baixo. Monstros e mortes não
        desempatam; os monstros vêm do Diário da Run (— = mesa registrada sem Run).
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
