import Frame from "@/components/Frame";

export default function RankingPage() {
  return (
    <Frame variant="frame-chest-torch" title="Ranking">
      <div className="panel" style={{ padding: 0 }}>
        <table className="data-table">
          <colgroup>
            <col style={{ width: "34%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "17%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Jogador</th>
              <th style={{ textAlign: "center" }}>Vitórias</th>
              <th style={{ textAlign: "center" }}>Partidas</th>
              <th style={{ textAlign: "center" }}>Almas</th>
              <th style={{ textAlign: "center" }}>Win %</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={5}
                className="center-empty"
                style={{ borderBottom: "none" }}
              >
                O ranking será alimentado pelas partidas registradas.
                <br />
                (Fase 2 — sincronização com o cadastro de partidas)
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Frame>
  );
}
