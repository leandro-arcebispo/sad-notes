"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PlayerAvatar from "./PlayerAvatar";
import { EVENT_TYPE_DEFS } from "@/lib/game-events";
import {
  GAME_STATUS_LABELS,
  type Character,
  type DerivedPlayerStats,
  type GameEventFull,
  type GameEventType,
  type GameFull,
  type GameModeParams,
  type GameStatus,
} from "@/lib/types";

/**
 * **A Run** — a partida enquanto está acontecendo (docs/PLANO-PARTIDAS.md §7.2).
 * Vocabulário: *partida* é o registro (a linha em `games`); *Run* é esta tela.
 *
 * Pensada pra um celular em cima da mesa: placar no topo, paleta de eventos a
 * um toque, e o Diário logo abaixo pra todo mundo ver o que já foi registrado —
 * é o que resolve registro duplicado socialmente, sem código.
 *
 * Nada aqui trava a mesa (§2.5, decisão explícita do usuário): não existe "vez
 * de fulano", a rodada é um contador livre que ninguém é obrigado a usar, e
 * qualquer um registra ou apaga qualquer evento (§2.11).
 */

const POLL_MS = 4000;

/** Catálogo de Artefato pro passo de referência do evento. */
export interface RefOption {
  id: number;
  name: string;
}

type Step = "subject" | "counterpart" | "ref" | "text";

type Draft = {
  type: GameEventType;
  player_id: number | null;
  other_player_id: number | null;
  ref_id: number | null;
  ref_name: string;
};

type Pending = {
  key: string;
  label: string;
  body: Record<string, unknown>;
  failed: boolean;
};

export default function RunClient({
  initialGame,
  initialEvents,
  initialDerived,
  initialActiveMinutes,
  params,
  monsters,
  curses,
  characters,
}: {
  initialGame: GameFull;
  initialEvents: GameEventFull[];
  initialDerived: Record<number, DerivedPlayerStats>;
  initialActiveMinutes: number | null;
  params: GameModeParams;
  monsters: RefOption[];
  curses: RefOption[];
  characters: Character[];
}) {
  const router = useRouter();
  const game = initialGame;

  const [status, setStatus] = useState<GameStatus>(initialGame.status);
  const [rounds, setRounds] = useState<number>(initialGame.rounds ?? 0);
  const [activeMinutes, setActiveMinutes] = useState<number | null>(initialActiveMinutes);
  const [events, setEvents] = useState<GameEventFull[]>(initialEvents);
  const [derived, setDerived] = useState<Record<number, DerivedPlayerStats>>(initialDerived);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [refQuery, setRefQuery] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showChars, setShowChars] = useState(false);

  const isLive = status !== "finalizada" && status !== "abortada";
  const isPaused = status === "pausada";
  const isTeamGame = game.format !== "solo";

  /* ------------------------------- polling -------------------------------- */

  /**
   * Recarrega o estado inteiro (`since=0`) em vez de só o delta. O parâmetro
   * `since` existe na API e a sessão multi-celular vai usá-lo, mas aqui o
   * recarregamento completo é de propósito: **evento apagado em outro aparelho
   * não aparece num delta** (o soft-delete some da listagem), e a tela ficaria
   * com um registro fantasma. O custo real do poll é a query no servidor, que é
   * a mesma nos dois casos — o derivado varre todos os eventos de qualquer
   * jeito. Paga-se só bytes, e ganha-se convergência.
   */
  const refresh = useCallback(async () => {
    const res = await fetch(`/api/games/${game.id}/events?since=0`, { cache: "no-store" });
    if (!res.ok) return;
    const delta = await res.json();
    setEvents(delta.events);
    setDerived(delta.derived);
    setStatus(delta.status);
    setRounds(delta.rounds ?? 0);
    setActiveMinutes(delta.active_minutes);
  }, [game.id]);

  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  /** Reenvia o que ficou na fila local. Seguro por causa do `client_event_id`:
   * o servidor devolve o evento já gravado em vez de duplicar. */
  const flush = useCallback(async () => {
    const queue = pendingRef.current;
    for (const item of queue) {
      try {
        const res = await fetch(`/api/games/${game.id}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.body),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.error ?? "Erro ao registrar.");
        }
        setPending((prev) => prev.filter((p) => p.key !== item.key));
      } catch {
        // Rede caiu: mantém na fila e tenta de novo no próximo tick.
        setPending((prev) => prev.map((p) => (p.key === item.key ? { ...p, failed: true } : p)));
      }
    }
    await refresh();
  }, [game.id, refresh]);

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => {
      // Aba escondida não consulta: cada poll é uma query remota no Turso
      // (700ms–2.4s medidos), não vale queimar com a tela fora de vista.
      if (document.visibilityState !== "visible") return;
      void flush();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [isLive, flush]);

  /* ------------------------------- ações ---------------------------------- */

  async function changeStatus(next: GameStatus) {
    if (next === "abortada" && !confirm("Abandonar esta partida? Ela não vai contar no ranking.")) {
      return;
    }
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Não deu para mudar o estado da partida.");
      return;
    }
    if (next === "abortada") {
      router.push(`/partidas/${game.id}`);
      router.refresh();
      return;
    }
    await refresh();
  }

  async function bumpRounds(delta: number) {
    const next = Math.max(0, rounds + delta);
    setRounds(next); // otimista: o contador é livre, não vale travar a UI por ele
    await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rounds: next }),
    });
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

  async function pickCharacter(playerId: number, characterId: number | null) {
    setBusy(true);
    await fetch(`/api/games/${game.id}/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ character_id: characterId }),
    });
    setBusy(false);
    router.refresh();
  }

  async function removeEvent(eventId: number) {
    setError(null);
    setEvents((prev) => prev.filter((e) => e.id !== eventId)); // otimista
    const res = await fetch(`/api/games/${game.id}/events/${eventId}`, { method: "DELETE" });
    if (!res.ok) setError("Não deu para apagar o evento.");
    await refresh();
  }

  /* --------------------------- registro de evento -------------------------- */

  const refCatalog = useMemo<RefOption[]>(() => {
    if (!draft) return [];
    const refType = EVENT_TYPE_DEFS[draft.type].refType;
    if (refType === "monstro") return monsters;
    if (refType === "maldicao") return curses;
    return [];
  }, [draft, monsters, curses]);

  const filteredRefs = useMemo(() => {
    const q = refQuery.trim().toLowerCase();
    const list = q ? refCatalog.filter((o) => o.name.toLowerCase().includes(q)) : refCatalog;
    return list.slice(0, 40);
  }, [refCatalog, refQuery]);

  function startDraft(type: GameEventType) {
    setError(null);
    setRefQuery("");
    setDraft({ type, player_id: null, other_player_id: null, ref_id: null, ref_name: "" });
  }

  /**
   * Passos do registro, derivados do próprio `EVENT_TYPE_DEFS` — a mesma fonte
   * que valida no servidor. O passo de referência só aparece quando existe
   * catálogo: "ganhou alma" não para o jogo pra perguntar qual alma bônus foi
   * (o Artefato Almas Bônus ainda nem existe, §2.1), então sai em 2 toques.
   */
  function stepsFor(type: GameEventType): Step[] {
    const def = EVENT_TYPE_DEFS[type];
    const steps: Step[] = ["subject"];
    if (def.counterpartLabel) steps.push("counterpart");
    if (def.refType === "monstro" || def.refType === "maldicao") steps.push("ref");
    if (def.freeText) steps.push("text");
    return steps;
  }

  function currentStep(d: Draft): Step | "done" {
    for (const step of stepsFor(d.type)) {
      if (step === "subject" && d.player_id == null) return "subject";
      if (step === "counterpart" && d.other_player_id == null) return "counterpart";
      if (step === "ref" && d.ref_id == null) return "ref";
      // Passo de digitação NUNCA se conclui sozinho: quem encerra é o submit
      // do form. Se ele contasse como pronto ao ter texto, o rascunho virava
      // "done" na primeira letra e a folha desmontava com a nota pela metade.
      if (step === "text") return "text";
    }
    return "done";
  }

  function submitDraft(d: Draft) {
    const def = EVENT_TYPE_DEFS[d.type];
    const key =
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const subject = game.players.find((p) => p.player_id === d.player_id);
    const other = game.players.find((p) => p.player_id === d.other_player_id);
    const label = [
      def.icon,
      subject?.player_name ?? "",
      def.label.toLowerCase(),
      other ? `· ${other.player_name}` : "",
      d.ref_name ? `· ${d.ref_name}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const body = {
      type: d.type,
      player_id: d.player_id,
      other_player_id: d.other_player_id,
      ref_id: d.ref_id,
      ref_name: d.ref_name.trim() || null,
      round: rounds,
      // Chave de idempotência: reenvio por rede ruim não pode virar dois
      // registros (§6.1 do plano).
      client_event_id: key,
      amount: 1,
    };

    setDraft(null);
    setPending((prev) => [...prev, { key, label, body, failed: false }]);
  }

  // A fila é esvaziada por efeito, e não dentro do submit, pra que o clique
  // devolva o controle na hora — na mesa, o toque tem que responder mesmo com
  // a rede ruim.
  useEffect(() => {
    if (pending.length === 0) return;
    void flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.length]);

  /**
   * Rascunho que já tem tudo que precisa se envia sozinho: o ÚLTIMO toque do
   * fluxo já é o registro, sem um botão "confirmar" que ninguém ia apertar com
   * o jogo rolando. Quem termina digitando (a `nota`) nunca chega em "done"
   * por aqui — ver `currentStep`.
   */
  useEffect(() => {
    if (!draft) return;
    if (currentStep(draft) === "done") submitDraft(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  /* ------------------------------- placar --------------------------------- */

  const teams = useMemo(
    () =>
      Array.from(
        new Set(game.players.map((p) => p.team).filter((t): t is number => t != null))
      ).sort((a, b) => a - b),
    [game.players]
  );

  /** Em duplas/trios as almas contam pro TIME (§2.4) — é o total do time que
   * corre atrás do objetivo, não o de cada um. */
  function teamSouls(team: number): number {
    return game.players
      .filter((p) => p.team === team)
      .reduce((acc, p) => acc + (derived[p.player_id]?.souls ?? 0), 0);
  }

  const paletteTypes = useMemo(
    () => params.enabled_events.filter((t) => EVENT_TYPE_DEFS[t]?.manual),
    [params.enabled_events]
  );

  const def = draft ? EVENT_TYPE_DEFS[draft.type] : null;
  const step = draft ? currentStep(draft) : null;

  /* -------------------------------- render -------------------------------- */

  return (
    <div className="stack run">
      <div className="panel run-bar">
        <span className={`badge status-${status}`}>{GAME_STATUS_LABELS[status]}</span>
        {activeMinutes !== null && <span className="badge">⏱ {activeMinutes} min</span>}

        {isLive && (
          <>
            <button
              className="btn"
              onClick={() => changeStatus(isPaused ? "andamento" : "pausada")}
              disabled={busy}
            >
              {isPaused ? "▶️ Retomar" : "⏸️ Pausar"}
            </button>
            <span className="run-rounds">
              <button className="btn" onClick={() => bumpRounds(-1)} aria-label="menos uma rodada">
                −
              </button>
              <span className="badge">🔁 Rodada {rounds}</span>
              <button className="btn" onClick={() => bumpRounds(1)} aria-label="mais uma rodada">
                +
              </button>
            </span>
            <span style={{ flex: 1 }} />
            <button className="btn" onClick={() => changeStatus("abortada")} disabled={busy}>
              Abandonar
            </button>
            <a className="btn btn-accent" href={`/partidas/${game.id}/finalizar`}>
              Finalizar →
            </a>
          </>
        )}
      </div>

      {isPaused && (
        <div className="muted">
          Partida pausada — o tempo parado não entra na duração. Dá pra voltar amanhã.
        </div>
      )}

      <div className="run-board">
        {game.players.map((p) => {
          const d = derived[p.player_id];
          return (
            <div key={p.id} className="panel run-player">
              <div className="run-player-id">
                <PlayerAvatar
                  face={p.player_base_face}
                  size={48}
                  avatarCache={p.player_avatar_cache}
                />
                <div>
                  <div className="pixel-label">{p.player_name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {p.character_name ?? "sem personagem"}
                    {isTeamGame && p.team ? ` · Time ${p.team}` : ""}
                  </div>
                </div>
              </div>
              <div className="run-player-stats">
                <Stat icon="👻" label="almas" value={d?.souls ?? 0} big />
                <Stat icon="💀" label="mortes" value={d?.deaths ?? 0} />
                <Stat icon="🗡️" label="PvP" value={d?.pvp_kills ?? 0} />
                <Stat icon="👹" label="monstros" value={d?.monsters ?? 0} />
                <Stat icon="🩸" label="maldições" value={d?.curses ?? 0} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="meta-chips">
        {isTeamGame ? (
          teams.map((t) => (
            <span key={t} className="badge">
              Time {t}: {teamSouls(t)} / {game.souls_to_win} almas
            </span>
          ))
        ) : (
          <span className="badge">Objetivo: {game.souls_to_win} almas</span>
        )}
        {game.bonus_souls === 1 && <span className="badge">✨ com almas bônus</span>}
      </div>

      {isLive && (
        <div className="panel form-panel">
          <label className="mini-label">Registrar</label>
          <div className="run-palette">
            {paletteTypes.map((t) => {
              const d = EVENT_TYPE_DEFS[t];
              return (
                <button
                  key={t}
                  className={`btn run-evt${draft?.type === t ? " active" : ""}`}
                  onClick={() => (draft?.type === t ? setDraft(null) : startDraft(t))}
                >
                  <span className="run-evt-icon">{d.icon}</span>
                  {d.label}
                </button>
              );
            })}
          </div>

          {draft && def && step && step !== "done" && (
            <div className="run-sheet">
              <div className="run-sheet-head">
                <span className="pixel-label">
                  {def.icon}{" "}
                  {step === "subject"
                    ? def.subjectLabel
                    : step === "counterpart"
                      ? def.counterpartLabel
                      : step === "ref"
                        ? def.refType === "monstro"
                          ? "Qual monstro?"
                          : "Qual maldição?"
                        : "Escreva a nota"}
                </span>
                <button className="btn" onClick={() => setDraft(null)}>
                  cancelar
                </button>
              </div>

              {(step === "subject" || step === "counterpart") && (
                <div className="run-pick">
                  {game.players
                    .filter((p) => step === "subject" || p.player_id !== draft.player_id)
                    .map((p) => (
                      <button
                        key={p.id}
                        className="btn run-pick-player"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            ...(step === "subject"
                              ? { player_id: p.player_id }
                              : { other_player_id: p.player_id }),
                          })
                        }
                      >
                        <PlayerAvatar
                          face={p.player_base_face}
                          size={36}
                          avatarCache={p.player_avatar_cache}
                        />
                        {p.player_name}
                      </button>
                    ))}
                  {/* Contraparte opcional: morrer pra monstro, maldição ou
                      qualquer outra coisa conta a morte sem culpado (§2.3). */}
                  {step === "counterpart" && !def.counterpartRequired && (
                    <button className="btn" onClick={() => submitDraft(draft)}>
                      sem culpado (monstro, carta…)
                    </button>
                  )}
                </div>
              )}

              {step === "ref" && (
                <div className="stack" style={{ gap: 8 }}>
                  <input
                    className="input"
                    autoFocus
                    placeholder="buscar…"
                    value={refQuery}
                    onChange={(e) => setRefQuery(e.target.value)}
                  />
                  <div className="run-pick">
                    {filteredRefs.map((o) => (
                      <button
                        key={o.id}
                        className="btn"
                        onClick={() => submitDraft({ ...draft, ref_id: o.id, ref_name: o.name })}
                      >
                        {o.name}
                      </button>
                    ))}
                    {filteredRefs.length === 0 && <span className="muted">nada encontrado</span>}
                  </div>
                  <button className="btn" onClick={() => submitDraft(draft)}>
                    pular — registrar sem especificar
                  </button>
                </div>
              )}

              {step === "text" && (
                <form
                  className="row"
                  style={{ gap: 8 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (draft.ref_name.trim()) submitDraft(draft);
                  }}
                >
                  <input
                    className="input"
                    autoFocus
                    style={{ flex: 1 }}
                    placeholder="o que aconteceu…"
                    value={draft.ref_name}
                    onChange={(e) => setDraft({ ...draft, ref_name: e.target.value })}
                  />
                  <button className="btn btn-accent" type="submit" disabled={!draft.ref_name.trim()}>
                    Anotar
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      <div className="panel form-panel">
        <label className="mini-label">Diário da Run</label>
        {events.length === 0 && pending.length === 0 ? (
          <div className="center-empty">
            Nada registrado ainda. Os botões acima anotam o que acontecer na mesa.
          </div>
        ) : (
          <ul className="run-log">
            {pending.map((p) => (
              <li key={p.key} className="run-log-item sending">
                <span className="run-log-seq">⋯</span>
                <span className="run-log-text">{p.label}</span>
                <span className="muted run-log-meta">
                  {p.failed ? "sem conexão — tentando de novo" : "enviando…"}
                </span>
              </li>
            ))}
            {[...events].reverse().map((e) => (
              <li key={e.id} className="run-log-item">
                <span className="run-log-seq">#{e.seq}</span>
                <span className="run-log-text">{describe(e)}</span>
                <span className="muted run-log-meta">
                  {e.round != null ? `R${e.round}` : ""}
                  {e.created_by_name ? ` · ${e.created_by_name}` : ""}
                </span>
                {isLive && EVENT_TYPE_DEFS[e.type]?.manual && (
                  <button
                    className="run-log-del"
                    title="apagar este registro"
                    onClick={() => removeEvent(e.id)}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isLive && (
        <div className="panel form-panel">
          <button className="run-collapse" onClick={() => setShowChars((v) => !v)}>
            <span className="mini-label">Personagens</span>
            <span className="muted">{showChars ? "▲ esconder" : "▼ mostrar"}</span>
          </button>
          {showChars && (
            <div className="stack" style={{ gap: 8, marginTop: 10 }}>
              {game.players.map((p) => (
                <div key={p.id} className="part-row on">
                  <span className="part-check">
                    <PlayerAvatar
                      face={p.player_base_face}
                      size={32}
                      avatarCache={p.player_avatar_cache}
                    />
                    <span className="pixel-label">{p.player_name}</span>
                  </span>
                  <div className="part-controls">
                    <span className="badge">{p.character_name ?? "— sem personagem —"}</span>
                    {game.character_selection === "random" ? (
                      <button className="btn" onClick={() => rollFor(p.player_id)} disabled={busy}>
                        🎲{" "}
                        {p.character_id
                          ? `re-roll (${p.reroll_count}/${game.rerolls_allowed})`
                          : "sortear"}
                      </button>
                    ) : (
                      <select
                        className="select"
                        value={p.character_id ?? ""}
                        onChange={(e) =>
                          pickCharacter(p.player_id, e.target.value ? Number(e.target.value) : null)
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
          )}
        </div>
      )}

      {error && <div style={{ color: "var(--blood)" }}>{error}</div>}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  big,
}: {
  icon: string;
  label: string;
  value: number;
  big?: boolean;
}) {
  return (
    <span className={`run-stat${big ? " big" : ""}`} title={label}>
      <span className="run-stat-icon">{icon}</span>
      <span className="run-stat-value">{value}</span>
    </span>
  );
}

/** Frase do Diário. O significado de cada operando vem do tipo do evento — é
 * por isso que as colunas são `player_id`/`other_player_id` e não
 * `actor`/`target`: em "morte" o sujeito é quem SOFREU a ação. */
function describe(e: GameEventFull): string {
  const def = EVENT_TYPE_DEFS[e.type];
  const who = e.player_name ?? "alguém";
  const other = e.other_player_name;
  const ref = e.ref_name;

  switch (e.type) {
    case "morte":
      return other ? `${def.icon} ${who} morreu — ${other} matou` : `${def.icon} ${who} morreu`;
    case "alma_ganha":
      return `${def.icon} ${who} ganhou uma alma${ref ? ` (${ref})` : ""}`;
    case "alma_perdida":
      return `${def.icon} ${who} perdeu uma alma`;
    case "alma_roubada":
      return `${def.icon} ${who} roubou uma alma de ${other ?? "alguém"}`;
    case "monstro_derrotado":
      return `${def.icon} ${who} derrotou ${ref ?? "um monstro"}`;
    case "maldicao_recebida":
      return `${def.icon} ${who} pegou ${ref ?? "uma maldição"}`;
    case "personagem_sorteado":
      return `${def.icon} ${who} tirou ${ref ?? "um personagem"}`;
    case "pause":
      return `${def.icon} partida pausada`;
    case "resume":
      return `${def.icon} partida retomada`;
    case "nota":
      return `${def.icon} ${who}: ${ref ?? ""}`;
    default:
      return `${def.icon} ${def.label}`;
  }
}
