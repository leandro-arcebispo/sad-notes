"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AvatarComposer from "./AvatarComposer";
import { BASE_FACES, type AvatarRecipe, type BaseFace, type OrnamentFull, type Player } from "@/lib/types";
import { HAIR_COLORS, hairColorCssFilter } from "@/lib/hair-colors";
import { assetUrl } from "@/lib/asset-url";
import { composeAvatarDataUrl } from "@/lib/avatar-canvas";

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

  // -------- identidade (nome, história triste, rosto base) --------
  const [name, setName] = useState(player.name);
  const [nickname, setNickname] = useState(player.nickname ?? "");
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [savingIdentity, setSavingIdentity] = useState(false);

  function pickFace(f: BaseFace) {
    setRecipe((r) => ({ ...r, base_face: f }));
  }

  async function saveIdentity() {
    if (!name.trim()) {
      setIdentityError("Nome é obrigatório.");
      return;
    }
    setIdentityError(null);
    setSavingIdentity(true);
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        nickname: nickname.trim() || null,
        color: player.color,
        base_face: recipe.base_face,
        hair_color: recipe.hair_color,
      }),
    });
    if (!res.ok) {
      setSavingIdentity(false);
      const j = await res.json().catch(() => ({}));
      setIdentityError(j.error ?? "Erro ao salvar.");
      return;
    }
    // rosto base pode ter mudado → recompõe o avatar
    await syncAvatar(recipe);
    setSavingIdentity(false);
    router.refresh();
  }

  /**
   * Compõe o PNG do avatar no navegador (Canvas) a partir da receita atual e
   * envia pra storage (Blob em prod / disco em dev). Sem cabelo nem diversos,
   * limpa o cache — o avatar volta a ser só o rosto base. Não bloqueia a edição
   * se falhar (ex.: CORS de imagem).
   */
  async function syncAvatar(next: AvatarRecipe) {
    try {
      if (!next.hair && next.diversos.length === 0) {
        await fetch(`/api/players/${player.id}/avatar/cache`, { method: "DELETE" });
        return;
      }
      const dataUrl = await composeAvatarDataUrl(next);
      await fetch(`/api/players/${player.id}/avatar/cache`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
    } catch (e) {
      console.error("falha ao gerar/enviar avatar", e);
    }
  }

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) {
      const next: AvatarRecipe = await res.json();
      setRecipe(next);
      await syncAvatar(next); // recompõe e sobe o PNG
      router.refresh(); // atualiza avatar_cache exibido em outras telas (players, ranking)
    }
    setBusy(false);
  }

  const setHair = (ornamentId: number | null) =>
    call(`/api/players/${player.id}/avatar/hair`, "PUT", { ornament_id: ornamentId });

  async function setHairColorKey(key: string) {
    setBusy(true);
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || player.name,
        nickname: nickname.trim() || null,
        color: player.color,
        base_face: recipe.base_face,
        hair_color: key,
      }),
    });
    if (res.ok) {
      const nextRecipe = { ...recipe, hair_color: key };
      setRecipe(nextRecipe);
      await syncAvatar(nextRecipe);
      router.refresh();
    }
    setBusy(false);
  }
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
          <div className="pixel-label">{name || "—"}</div>
          {busy && <div className="muted" style={{ fontSize: 12 }}>atualizando…</div>}
        </div>

        <div className="controls-col">
          {/* -------- identidade -------- */}
          <section className="stack" style={{ gap: 8 }}>
            <h2 className="title" style={{ fontSize: 18 }}>Identidade</h2>
            <div className="field">
              <label>Nome</label>
              <input
                className="input"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>História triste</label>
              <input
                className="input"
                value={nickname}
                maxLength={40}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Rosto base</label>
              <div className="face-picker">
                {BASE_FACES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`face-opt${recipe.base_face === f ? " selected" : ""}`}
                    onClick={() => pickFace(f)}
                    title={f}
                  >
                    <img src={`/design-system/img/faces/face-${f}.png`} alt={f} />
                  </button>
                ))}
              </div>
            </div>
            {identityError && (
              <div style={{ color: "var(--blood)" }}>{identityError}</div>
            )}
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-accent" onClick={saveIdentity} disabled={savingIdentity}>
                Salvar
              </button>
            </div>
          </section>

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
                    <img src={assetUrl(o.sprite_path)} alt={o.name} />
                  </button>
                ))}
              </div>
            )}

            {recipe.hair && (() => {
              const hairSpritePath = recipe.hair.sprite_path;
              return (
              <div className="stack" style={{ gap: 6, marginTop: 4 }}>
                <div className="muted" style={{ fontSize: 12 }}>Cor do cabelo</div>
                <div className="hair-color-row">
                  {HAIR_COLORS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className={`hair-color-pick${recipe.hair_color === c.key ? " selected" : ""}`}
                      title={c.label}
                      onClick={() => setHairColorKey(c.key)}
                      disabled={busy}
                    >
                      <img
                        src={assetUrl(hairSpritePath)}
                        alt={c.label}
                        style={{ filter: hairColorCssFilter(c.key) }}
                      />
                    </button>
                  ))}
                </div>
              </div>
              );
            })()}
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
                    <img src={assetUrl(o.sprite_path)} alt={o.name} />
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
