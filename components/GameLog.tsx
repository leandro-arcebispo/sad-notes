"use client";

import { Fragment, useMemo, useState } from "react";
import { describeEvent } from "@/lib/game-events";
import type { GameEventFull, GameEventType, GameStatus } from "@/lib/types";

/**
 * **Diário da partida** — o registro do que a mesa anotou na Run, na tela de
 * detalhe. Diferente do Diário da Run (que é ao vivo e mostra o mais novo em
 * cima), aqui a partida é lida como história: em ordem cronológica, quebrada
 * por rodada quando a mesa usou o contador, e fechando com o resultado.
 *
 * Só leitura: apagar registro errado é coisa da Run, enquanto ela está aberta.
 */

type Filter = "todos" | "monstros" | "mortes" | "almas" | "maldicoes" | "notas" | "mesa";

const FILTERS: { key: Exclude<Filter, "todos">; label: string; types: GameEventType[] }[] = [
  { key: "monstros", label: "Monstros", types: ["monstro_derrotado"] },
  { key: "mortes", label: "Mortes", types: ["morte"] },
  { key: "almas", label: "Almas", types: ["alma_ganha", "alma_perdida", "alma_roubada"] },
  { key: "maldicoes", label: "Maldições", types: ["maldicao_recebida"] },
  { key: "notas", label: "Notas", types: ["nota"] },
  { key: "mesa", label: "Mesa", types: ["personagem_sorteado", "pause", "resume"] },
];

/** Os amigos jogam no Brasil; fuso fixo pra que o HTML do servidor (UTC no
 * Vercel) e o do navegador saiam iguais e a hidratação não reclame. */
const TZ = "America/Sao_Paulo";
const fmtTime = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const fmtDay = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" });

export default function GameLog({
  events,
  status,
  endedAt,
  winners,
}: {
  events: GameEventFull[];
  status: GameStatus;
  endedAt: string | null;
  winners: string[];
}) {
  const [filter, setFilter] = useState<Filter>("todos");

  const counts = useMemo(() => {
    const out = new Map<Filter, number>();
    for (const f of FILTERS) {
      out.set(f.key, events.filter((e) => f.types.includes(e.type)).length);
    }
    return out;
  }, [events]);

  const visible = useMemo(() => {
    if (filter === "todos") return events;
    const types = FILTERS.find((f) => f.key === filter)!.types;
    return events.filter((e) => types.includes(e.type));
  }, [events, filter]);

  // Partida que atravessou a meia-noite (ou foi pausada pra outro dia) mostra
  // a data junto da hora sempre que o dia muda.
  const firstDay = events.length ? fmtDay.format(new Date(events[0].created_at)) : null;
  const multiDay = events.some((e) => fmtDay.format(new Date(e.created_at)) !== firstDay);
  const stamp = (iso: string) => {
    const d = new Date(iso);
    return multiDay ? `${fmtDay.format(d)} ${fmtTime.format(d)}` : fmtTime.format(d);
  };

  const finished = status === "finalizada";
  const abandoned = status === "abortada";

  return (
    <div className="panel form-panel">
      <div className="game-log-head">
        <label className="mini-label">
          Diário da partida{events.length > 0 ? ` · ${events.length} registros` : ""}
        </label>
        {events.length > 0 && (
          <div className="seg game-log-filters">
            <button
              type="button"
              className={`seg-btn${filter === "todos" ? " active" : ""}`}
              onClick={() => setFilter("todos")}
            >
              Tudo
            </button>
            {FILTERS.filter((f) => (counts.get(f.key) ?? 0) > 0).map((f) => (
              <button
                key={f.key}
                type="button"
                className={`seg-btn${filter === f.key ? " active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label} {counts.get(f.key)}
              </button>
            ))}
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="center-empty">
          {finished || abandoned
            ? "Partida registrada sem passar pela Run — não tem Diário."
            : "Nada registrado ainda. O que a mesa anotar na Run aparece aqui."}
        </div>
      ) : (
        <ul className="run-log game-log">
          {visible.map((e, i) => {
            // O contador da Run começa em 0: rodada 0 = a mesa ainda não usou
            // o contador, então não ganha cabeçalho.
            const prev = visible[i - 1];
            const newRound = !!e.round && e.round !== prev?.round;
            return (
              <Fragment key={e.id}>
                {newRound && <li className="game-log-round">Rodada {e.round}</li>}
                <li className={`run-log-item game-log-${e.type}`}>
                  <span className="run-log-seq">#{e.seq}</span>
                  <span className="run-log-text">{describeEvent(e)}</span>
                  <span className="muted run-log-meta">
                    {stamp(e.created_at)}
                    {e.created_by_name ? ` · por ${e.created_by_name}` : ""}
                  </span>
                </li>
              </Fragment>
            );
          })}
          {filter === "todos" && (finished || abandoned) && (
            <li className="run-log-item game-log-end">
              <span className="run-log-seq">🏁</span>
              <span className="run-log-text">
                {abandoned
                  ? "Partida abandonada — fica fora do ranking"
                  : winners.length
                    ? `Fim de partida — 👑 ${winners.join(" • ")} ${winners.length > 1 ? "venceram" : "venceu"}`
                    : "Fim de partida"}
              </span>
              <span className="muted run-log-meta">{endedAt ? stamp(endedAt) : ""}</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
