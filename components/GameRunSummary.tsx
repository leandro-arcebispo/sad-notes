import type { ReactNode } from "react";
import PlayerAvatar from "./PlayerAvatar";
import StatIcon from "./StatIcon";
import { EVENT_TYPE_DEFS } from "@/lib/game-events";
import { assetUrl } from "@/lib/asset-url";
import type { GameEventFull, GameFull } from "@/lib/types";

/**
 * **O que cada um fez** — o Diário condensado por jogador, na tela de detalhe:
 * quais monstros derrotou, quem matou, de quem morreu, que maldições pegou e
 * com que tesouros terminou. Os números vêm dos eventos (o mesmo cálculo de
 * `deriveStats`), por isso podem não bater com o placar oficial da tabela de
 * cima — que é o snapshot da finalização (docs/PLANO-PARTIDAS.md §1.3).
 */

type Tally = Map<string, number>;

interface PlayerLog {
  monsters: Tally;
  curses: Tally;
  kills: Tally;
  killedBy: Tally;
  deaths: number;
  pvp: number;
}

function bump(t: Tally, key: string, n: number) {
  t.set(key, (t.get(key) ?? 0) + n);
}

function summarize(events: GameEventFull[]): Map<number, PlayerLog> {
  const out = new Map<number, PlayerLog>();
  const of = (id: number | null) => {
    if (id == null) return null;
    if (!out.has(id)) {
      out.set(id, {
        monsters: new Map(),
        curses: new Map(),
        kills: new Map(),
        killedBy: new Map(),
        deaths: 0,
        pvp: 0,
      });
    }
    return out.get(id)!;
  };

  for (const e of events) {
    const n = e.amount || 1;
    const subject = of(e.player_id);
    switch (e.type) {
      case "monstro_derrotado":
        if (subject) bump(subject.monsters, e.ref_name ?? "monstro sem nome", n);
        break;
      case "maldicao_recebida":
        if (subject) bump(subject.curses, e.ref_name ?? "maldição sem nome", n);
        break;
      case "morte": {
        if (subject) subject.deaths += n;
        const killer = of(e.other_player_id);
        if (killer && subject) {
          killer.pvp += n;
          bump(killer.kills, e.player_name ?? "alguém", n);
          bump(subject.killedBy, e.other_player_name ?? "alguém", n);
        }
        break;
      }
      default:
        break;
    }
  }
  return out;
}

/** "Pin, Gurdy ×2" — repetição vira multiplicador em vez de nome duplicado. */
function tallyText(t: Tally): string {
  return [...t.entries()].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name)).join(", ");
}

export default function GameRunSummary({
  players,
  events,
  isTeamGame,
}: {
  players: GameFull["players"];
  events: GameEventFull[];
  isTeamGame: boolean;
}) {
  const logs = summarize(events);
  const icon = (t: keyof typeof EVENT_TYPE_DEFS) => EVENT_TYPE_DEFS[t].icon;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="mini-label">O que cada um fez</label>
      <div className="run-board">
        {players.map((p) => {
          const log = logs.get(p.player_id);
          const treasures = p.owned_treasures;
          const legacy = p.items;
          const nothing =
            !log ||
            (log.monsters.size === 0 &&
              log.curses.size === 0 &&
              log.deaths === 0 &&
              log.pvp === 0);
          return (
            <div key={p.id} className={`panel run-player${p.is_winner ? " winner-card" : ""}`}>
              <div className="run-player-id">
                <PlayerAvatar
                  face={p.player_base_face}
                  size={44}
                  avatarCache={p.player_avatar_cache}
                />
                <div>
                  <div className="pixel-label">
                    {p.is_winner ? "👑 " : ""}
                    {p.player_name}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {p.character_name ?? "sem personagem"}
                    {isTeamGame && p.team ? ` · Time ${p.team}` : ""}
                  </div>
                </div>
              </div>

              {log && !nothing && (
                <div className="run-player-stats">
                  <Chip icon={icon("monstro_derrotado")} label="monstros derrotados" value={sum(log.monsters)} />
                  <Chip icon={icon("morte")} label="mortes" value={log.deaths} />
                  <Chip icon="🗡️" label="abates PvP" value={log.pvp} />
                  <Chip icon={icon("maldicao_recebida")} label="maldições" value={sum(log.curses)} />
                </div>
              )}

              <dl className="player-log">
                {log && log.monsters.size > 0 && (
                  <Line icon={icon("monstro_derrotado")} label="Derrotou">
                    {tallyText(log.monsters)}
                  </Line>
                )}
                {log && log.kills.size > 0 && (
                  <Line icon="🗡️" label="Matou">
                    {tallyText(log.kills)}
                  </Line>
                )}
                {log && log.killedBy.size > 0 && (
                  <Line icon={icon("morte")} label="Morto por">
                    {tallyText(log.killedBy)}
                  </Line>
                )}
                {log && log.curses.size > 0 && (
                  <Line icon={icon("maldicao_recebida")} label="Maldições">
                    {tallyText(log.curses)}
                  </Line>
                )}
                <Line icon={<StatIcon name="treasures" size={14} />} label="Tesouros">
                  {treasures.length === 0 && legacy.length === 0 ? (
                    <span className="muted">nenhum</span>
                  ) : (
                    <span className="player-log-treasures">
                      {treasures.map((t) => (
                        <span key={t.id} className="item-tag ro log-treasure">
                          {t.icon_sprite_path && (
                            <img src={assetUrl(t.icon_sprite_path)} alt="" />
                          )}
                          {t.name}
                        </span>
                      ))}
                      {legacy.map((i) => (
                        <span key={`legacy-${i.id}`} className="item-tag ro">{i.name}</span>
                      ))}
                    </span>
                  )}
                </Line>
              </dl>

              {nothing && events.length > 0 && (
                <div className="muted" style={{ fontSize: 12 }}>
                  Nenhum monstro, morte ou maldição no Diário.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function sum(t: Tally): number {
  let n = 0;
  for (const v of t.values()) n += v;
  return n;
}

function Chip({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <span className="run-stat" title={label}>
      <span className="run-stat-icon">{icon}</span>
      <span className="run-stat-value">{value}</span>
    </span>
  );
}

function Line({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="player-log-line">
      <dt>
        <span className="player-log-icon">{icon}</span> {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
