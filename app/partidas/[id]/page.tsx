import Link from "next/link";
import { notFound } from "next/navigation";
import Frame from "@/components/Frame";
import PlayerAvatar from "@/components/PlayerAvatar";
import DeleteGameButton from "@/components/DeleteGameButton";
import StatIcon from "@/components/StatIcon";
import { getGame } from "@/lib/games";
import type { Edition, GameFormat } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITION_LABEL: Record<Edition, string> = { base: "Jogo base", requiem: "Base + Requiem" };
const FORMAT_LABEL: Record<GameFormat, string> = { solo: "Solo", duo: "Duplas", trio: "Trios" };

export default async function PartidaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const game = getGame(Number((await params).id));
  if (!game) notFound();

  return (
    <Frame
      variant="frame-library"
      title={`Partida · ${game.played_at}`}
      actions={
        <span className="row" style={{ gap: 8 }}>
          <Link href="/partidas" className="btn">← Partidas</Link>
          <DeleteGameButton id={game.id} />
        </span>
      }
    >
      <div className="stack">
        <div className="meta-chips">
          <span className="badge">{EDITION_LABEL[game.edition]}</span>
          <span className="badge">{FORMAT_LABEL[game.format]}</span>
          <span className="badge"><StatIcon name="souls" size={14} /> {game.souls_to_win} almas p/ vencer</span>
          <span className="badge">🎭 {game.character_selection === "random" ? "Aleatória" : "Livre"}</span>
          {game.duration_min != null && <span className="badge">⏱ {game.duration_min} min</span>}
          {game.rounds != null && <span className="badge">🔁 {game.rounds} rodadas</span>}
          <span className="badge">🏳️ Global Board</span>
        </div>
        {game.notes && <div className="muted">“{game.notes}”</div>}

        <div className="panel" style={{ padding: 0 }}>
          <table className="data-table">
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "30%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Jogador</th>
                <th>Personagem</th>
                <th style={{ textAlign: "center" }}>
                  <span className="th-icon"><StatIcon name="souls" /> Almas</span>
                </th>
                <th style={{ textAlign: "center" }}>
                  <span className="th-icon"><StatIcon name="coins" /> Moedas</span>
                </th>
                <th style={{ textAlign: "center" }}>
                  <span className="th-icon"><StatIcon name="loot" /> Loot</span>
                </th>
                <th style={{ textAlign: "center" }}>
                  <span className="th-icon"><StatIcon name="deaths" /> Mortes</span>
                </th>
                <th>Itens</th>
              </tr>
            </thead>
            <tbody>
              {game.players.map((p) => (
                <tr key={p.id} className={p.is_winner ? "winner-row" : ""}>
                  <td>
                    <div className="row" style={{ gap: 10 }}>
                      <PlayerAvatar face={p.player_base_face} size={40} avatarCache={p.player_avatar_cache} />
                      <span>
                        {p.is_winner ? "👑 " : ""}
                        {p.player_name}
                        {game.format !== "solo" && p.team ? (
                          <span className="muted"> · Time {p.team}</span>
                        ) : null}
                      </span>
                    </div>
                  </td>
                  <td>
                    {p.character_name ?? "—"}
                    {p.had_reroll ? <span className="tag" style={{ marginLeft: 6 }}>re-roll</span> : null}
                  </td>
                  <td style={{ textAlign: "center" }}>{p.souls}</td>
                  <td style={{ textAlign: "center" }}>{p.coins}</td>
                  <td style={{ textAlign: "center" }}>{p.loot_in_hand}</td>
                  <td style={{ textAlign: "center" }}>{p.deaths}</td>
                  <td className="items-cell">
                    {p.items.length
                      ? p.items.map((i) => <span key={i.id} className="item-tag ro">{i.name}</span>)
                      : <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Frame>
  );
}
