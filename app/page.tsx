import Frame from "@/components/Frame";
import PlayerAvatar from "@/components/PlayerAvatar";
import RankFire from "@/components/RankFire";
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
              <col style={{ width: "28%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Jogador</th>
                <th style={{ textAlign: "center" }}>Vitórias</th>
                <th style={{ textAlign: "center" }}>Partidas</th>
                <th style={{ textAlign: "center" }}>Win %</th>
                <th style={{ textAlign: "center" }}>Almas</th>
                <th style={{ textAlign: "center" }}>Moedas</th>
                <th style={{ textAlign: "center" }}>Mortes</th>
                <th style={{ textAlign: "center" }}>Streak</th>
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
                      <PlayerAvatar face={r.base_face} color={r.color} size={40} />
                      <span className="player-name">{r.name}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>{r.wins}</td>
                  <td style={{ textAlign: "center" }}>{r.games}</td>
                  <td style={{ textAlign: "center" }}>{pct(r.win_pct)}</td>
                  <td style={{ textAlign: "center" }}>{r.souls}</td>
                  <td style={{ textAlign: "center" }}>{r.coins}</td>
                  <td style={{ textAlign: "center" }}>{r.deaths}</td>
                  <td style={{ textAlign: "center" }}>
                    {r.streak > 0 ? `🔥${r.streak}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Frame>
  );
}
