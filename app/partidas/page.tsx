import type { ReactNode } from "react";
import Link from "next/link";
import Frame from "@/components/Frame";
import StatIcon from "@/components/StatIcon";
import { listGames } from "@/lib/games";
import { EVENT_TYPE_DEFS } from "@/lib/game-events";
import {
  GAME_STATUS_LABELS,
  type Edition,
  type GameFormat,
  type GameListItem,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITION_LABEL: Record<Edition, string> = { base: "Base", requiem: "Requiem" };
const FORMAT_LABEL: Record<GameFormat, string> = { solo: "Solo", duo: "Duplas", trio: "Trios" };

export default async function PartidasPage() {
  const games = await listGames();
  return (
    <Frame
      variant="frame-library"
      title="Partidas"
      actions={
        <Link href="/partidas/nova" className="btn btn-accent">
          + Nova partida
        </Link>
      }
    >
      {games.length === 0 ? (
        <div className="panel">
          <div className="center-empty">
            Nenhuma partida registrada. Comece com “Nova partida”.
          </div>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          <table className="data-table">
            <colgroup>
              <col style={{ width: "14%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "29%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Data</th>
                <th>Situação</th>
                <th>Edição</th>
                <th>Formato</th>
                <th style={{ textAlign: "center" }}>Jogadores</th>
                <th style={{ textAlign: "center" }}>
                  <span className="th-icon"><StatIcon name="souls" /> Almas</span>
                </th>
                <th>Vencedor(es) · Diário</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const live = g.status !== "finalizada" && g.status !== "abortada";
                return (
                  <tr key={g.id} className={`clickable-row${live ? " live-row" : ""}`}>
                    <td>
                      <Link href={`/partidas/${g.id}`} className="row-link">
                        {g.played_at}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge status-${g.status}`}>
                        {GAME_STATUS_LABELS[g.status]}
                      </span>
                    </td>
                    <td>{EDITION_LABEL[g.edition]}</td>
                    <td>{FORMAT_LABEL[g.format]}</td>
                    <td style={{ textAlign: "center" }}>{g.num_players}</td>
                    <td style={{ textAlign: "center" }}>{g.souls_to_win}</td>
                    <td className="winners-cell">
                      {live ? (
                        <Link href={`/partidas/${g.id}/run`} className="row-link">
                          continuar na Run →
                        </Link>
                      ) : (
                        `👑 ${g.winners.join(" • ") || "—"}`
                      )}
                      <LogSummary log={g.log} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Frame>
  );
}

/** Resumo do Diário numa linha, embaixo do vencedor: só os contadores que não
 * são zero. Partida registrada sem Run (e sem tesouro na finalização) não tem
 * diário — não mostra nada. */
function LogSummary({ log }: { log: GameListItem["log"] }) {
  const parts: { key: string; icon: ReactNode; n: number; label: string }[] = [
    { key: "m", icon: EVENT_TYPE_DEFS.monstro_derrotado.icon, n: log.monsters, label: "monstros derrotados" },
    { key: "d", icon: EVENT_TYPE_DEFS.morte.icon, n: log.deaths, label: "mortes" },
    { key: "c", icon: EVENT_TYPE_DEFS.maldicao_recebida.icon, n: log.curses, label: "maldições" },
    { key: "t", icon: <StatIcon name="treasures" size={14} />, n: log.treasures, label: "tesouros" },
  ].filter((p) => p.n > 0);

  if (parts.length === 0) {
    return log.events > 0 ? (
      <span className="log-summary">
        {log.events} registro{log.events === 1 ? "" : "s"} no Diário
      </span>
    ) : null;
  }
  return (
    <span className="log-summary" title="Resumo do Diário da partida">
      {parts.map((p) => (
        <span key={p.key} className="log-summary-item" title={`${p.n} ${p.label}`}>
          {p.icon} {p.n}
        </span>
      ))}
    </span>
  );
}
