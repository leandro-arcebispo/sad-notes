import Frame from "@/components/Frame";
import PlayerAvatar from "@/components/PlayerAvatar";
import RankFire from "@/components/RankFire";
import StatIcon from "@/components/StatIcon";
import { getRanking } from "@/lib/ranking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function RankingPage() {
  const rows = getRanking();

  return (
    <Frame variant="frame-chest-torch" title="Ranking">
      {rows.length === 0 ? (
        <div className="panel">
          <div className="center-empty">
            O ranking se alimenta das partidas registradas.
            <br />
            Registre uma partida para o Global Board começar a pontuar.
          </div>
        </div>
      ) : (
        <div className="panel" style={{ padding: 0 }}>
          <table className="data-table ranking-table">
            <colgroup>
              <col style={{ width: "30%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Jogador</th>
                <th style={{ textAlign: "center" }}>
                  <span className="th-icon"><StatIcon name="wins" size={25} /> Vitórias</span>
                </th>
                <th style={{ textAlign: "center" }}>
                  <span className="th-icon"><StatIcon name="games" size={25} /> Partidas</span>
                </th>
                <th style={{ textAlign: "center" }}>Win %</th>
                <th style={{ textAlign: "center" }}>
                  <span className="th-icon"><StatIcon name="souls" size={25} /> Almas</span>
                </th>
                <th style={{ textAlign: "center" }}>
                  <span className="th-icon"><StatIcon name="coins" size={25} /> Moedas</span>
                </th>
                <th style={{ textAlign: "center" }}>
                  <span className="th-icon"><StatIcon name="treasures" size={25} /> Tesouros</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.player_id}>
                  <td>
                    <div className="rank-player">
                      <span className="rank-badge">
                        {r.rank <= 3 ? (
                          <RankFire rank={r.rank as 1 | 2 | 3} />
                        ) : (
                          <span className="rank-num">{r.rank}</span>
                        )}
                      </span>
                      <PlayerAvatar face={r.base_face} size={48} avatarCache={r.avatar_cache} />
                      <span className="player-name">{r.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>{r.wins}</td>
                  <td style={{ textAlign: "center" }}>{r.games}</td>
                  <td style={{ textAlign: "center" }}>{pct(r.win_pct)}</td>
                  <td style={{ textAlign: "center" }}>{r.souls}</td>
                  <td style={{ textAlign: "center" }}>{r.coins}</td>
                  <td style={{ textAlign: "center" }}>{r.treasures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Frame>
  );
}
