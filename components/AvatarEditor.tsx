"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AvatarComposer from "./AvatarComposer";
import type { AvatarRecipe, OrnamentFull, Player } from "@/lib/types";

export default function AvatarEditor({
  player,
  initialRecipe,
  hairOptions,
  diversoOptions,
}: {
  player: Player;
  initialRecipe: AvatarRecipe;
  hairOptions: OrnamentFull[];
  diversoOptions: OrnamentFull[];
}) {
  const router = useRouter();
  const [recipe, setRecipe] = useState(initialRecipe);
  const [busy, setBusy] = useState(false);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (res.ok) {
      const next = await res.json();
      setRecipe(next);
      router.refresh(); // atualiza avatar_cache exibido em outras telas (players, ranking)
    }
  }

  const setHair = (ornamentId: number | null) =>
    call(`/api/players/${player.id}/avatar/hair`, "PUT", { ornament_id: ornamentId });
  const addDiverso = (ornamentId: number) =>
    call(`/api/players/${player.id}/avatar/diversos`, "POST", { ornament_id: ornamentId });
  const removeDiverso = (rowId: number) =>
    call(`/api/players/${player.id}/avatar/diversos/${rowId}`, "DELETE");
  const moveDiverso = (rowId: number, direction: "up" | "down") =>
    call(`/api/players/${player.id}/avatar/diversos/${rowId}`, "PATCH", { direction });

  // ordena do topo da pilha (maior sort_order = mais por cima) pro fundo, pra edição intuitiva
  const stacked = [...recipe.diversos].sort((a, b) => b.sort_order - a.sort_order);

  return (
    <div className="stack" style={{ gap: 22 }}>
      <div className="ornament-layout">
        <div className="preview-col">
          <AvatarComposer recipe={recipe} />
          <div className="pixel-label">{player.name}</div>
          {busy && <div className="muted" style={{ fontSize: 12 }}>atualizando…</div>}
        </div>

        <div className="controls-col">
          {/* -------- cabelo (só um) -------- */}
          <section className="stack" style={{ gap: 8 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 className="title" style={{ fontSize: 18 }}>Cabelo</h2>
              {recipe.hair && (
                <button className="btn btn-danger" onClick={() => setHair(null)} disabled={busy}>
                  Remover
                </button>
              )}
            </div>
            {hairOptions.length === 0 ? (
              <div className="panel"><div className="center-empty">Nenhum ornamento de cabelo cadastrado ainda.</div></div>
            ) : (
              <div className="sprite-grid">
                {hairOptions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`sprite-pick${recipe.hair?.id === o.id ? " selected" : ""}`}
                    title={o.name}
                    onClick={() => setHair(o.id)}
                    disabled={busy}
                  >
                    <img src={`/${o.sprite_path}`} alt={o.name} />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* -------- diversos (vários, empilhados) -------- */}
          <section className="stack" style={{ gap: 8 }}>
            <h2 className="title" style={{ fontSize: 18 }}>Diversos</h2>
            {diversoOptions.length === 0 ? (
              <div className="panel"><div className="center-empty">Nenhum ornamento diverso cadastrado ainda.</div></div>
            ) : (
              <div className="sprite-grid">
                {diversoOptions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className="sprite-pick"
                    title={`+ ${o.name}`}
                    onClick={() => addDiverso(o.id)}
                    disabled={busy}
                  >
                    <img src={`/${o.sprite_path}`} alt={o.name} />
                  </button>
                ))}
              </div>
            )}

            {stacked.length > 0 && (
              <div className="ornament-list" style={{ marginTop: 6 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Do topo da pilha (aparece por cima) pro fundo:
                </div>
                {stacked.map((o, idx) => (
                  <div key={o.row_id} className="ornament-row">
                    <div className="ornament-thumb"><img src={`/${o.sprite_path}`} alt={o.name} /></div>
                    <div className="ornament-meta pixel-label">{o.name}</div>
                    <div className="row" style={{ gap: 4 }}>
                      <button className="btn" disabled={busy || idx === 0} onClick={() => moveDiverso(o.row_id, "up")} title="Trazer pra frente">▲</button>
                      <button className="btn" disabled={busy || idx === stacked.length - 1} onClick={() => moveDiverso(o.row_id, "down")} title="Mandar pra trás">▼</button>
                      <button className="btn btn-danger" disabled={busy} onClick={() => removeDiverso(o.row_id)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
