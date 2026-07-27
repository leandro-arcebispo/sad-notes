"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Frame from "./Frame";
import type { CharacterFull, Sprite } from "@/lib/types";
import { assetUrl } from "@/lib/asset-url";

const PAGE_SIZE = 24;

const CHARACTER_BACK_FALLBACK = "/design-system/img/character-card-back.png";
const ITEM_BACK_FALLBACK = "/design-system/img/eternal-card-back.png";

function emptyForm() {
  return {
    name: "",
    expansion: "base" as "base" | "requiem",
    tainted: false,
    active: true,
    cardSpriteId: null as number | null,
    starterItemSpriteId: null as number | null,
    starterItemName: "",
    cardBackSpriteId: null as number | null,
    starterItemBackSpriteId: null as number | null,
  };
}

export default function CharactersClient({
  characters,
  sprites,
}: {
  characters: CharacterFull[];
  sprites: Sprite[];
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [flippedChar, setFlippedChar] = useState<Set<number>>(new Set());
  const [flippedItem, setFlippedItem] = useState<Set<number>>(new Set());

  const cardSprites = useMemo(
    () => sprites.filter((s) => s.category === "character-card"),
    [sprites]
  );
  const itemSprites = useMemo(
    () => sprites.filter((s) => s.category === "character-item"),
    [sprites]
  );

  const visible = useMemo(() => characters.filter((c) => c.active === 1), [characters]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((c) => c.name.toLowerCase().includes(q));
  }, [visible, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE),
    [filtered, clampedPage]
  );

  function handleSearchChange(v: string) {
    setSearch(v);
    setPage(1);
  }

  function toggleFlip(setter: typeof setFlippedChar, id: number) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setMsg(null);
    setFormOpen(true);
  }

  function startEdit(c: CharacterFull) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      expansion: c.expansion,
      tainted: !!c.tainted,
      active: c.active === 1,
      cardSpriteId: c.card_sprite_id,
      starterItemSpriteId: c.starter_item_sprite_id,
      starterItemName: c.starter_item_name ?? "",
      cardBackSpriteId: c.card_back_sprite_id,
      starterItemBackSpriteId: c.starter_item_back_sprite_id,
    });
    setMsg(null);
    setFormOpen(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
    setMsg(null);
    setFormOpen(false);
  }

  async function save() {
    if (!form.name.trim()) return;
    setBusy(true);
    setMsg(null);
    const payload = {
      name: form.name.trim(),
      expansion: form.expansion,
      tainted: form.tainted,
      active: form.active,
      card_sprite_id: form.cardSpriteId,
      starter_item_sprite_id: form.starterItemSpriteId,
      starter_item_name: form.starterItemName.trim() || null,
      card_back_sprite_id: form.cardBackSpriteId,
      starter_item_back_sprite_id: form.starterItemBackSpriteId,
    };
    const url = editingId ? `/api/characters/${editingId}` : "/api/characters";
    const res = await fetch(url, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Erro ao salvar.");
      return;
    }
    setMsg(editingId ? `“${form.name.trim()}” atualizado.` : `“${form.name.trim()}” cadastrado.`);
    setEditingId(null);
    setForm(emptyForm());
    router.refresh();
  }

  function spritePicker(
    label: string,
    options: Sprite[],
    selectedId: number | null,
    onPick: (id: number | null) => void,
    emptyCategory: string
  ) {
    return (
      <div className="field" style={{ flex: 1, minWidth: 260 }}>
        <label>{label}</label>
        {options.length === 0 ? (
          <div className="panel">
            <div className="center-empty">
              Nenhum sprite “{emptyCategory}” recortado ainda.
              <br />
              Corte na Oficina primeiro (Admin → Oficina).
            </div>
          </div>
        ) : (
          <div className="sprite-grid" style={{ maxHeight: 220, overflowY: "auto" }}>
            {options.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`sprite-pick${selectedId === s.id ? " selected" : ""}`}
                onClick={() => onPick(selectedId === s.id ? null : s.id)}
                title={s.name}
              >
                <img className="card-art" src={assetUrl(s.path)} alt={s.name} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Frame
      variant="frame-isaacs-room"
      title={`Personagens (${characters.length})`}
      actionsGrow
      actions={
        !formOpen && (
          <>
            <input
              className="input"
              style={{ flex: 1, maxWidth: 480 }}
              placeholder="Buscar por nome…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <button className="btn btn-accent" onClick={openCreate}>
              + Cadastrar Personagem
            </button>
          </>
        )
      }
    >
      <div className="stack" style={{ gap: 22 }}>
        {formOpen && (
          <div className="stack" style={{ gap: 14 }}>
            <div className="field">
              <label>Nome (idêntico ao jogo)</label>
              <input
                className="input"
                value={form.name}
                maxLength={80}
                placeholder="ex.: Isaac"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="row" style={{ gap: 20, flexWrap: "wrap" }}>
              <div className="seg">
                <button
                  type="button"
                  className={`seg-btn${form.expansion === "base" ? " active" : ""}`}
                  onClick={() => setForm((f) => ({ ...f, expansion: "base" }))}
                >
                  Base
                </button>
                <button
                  type="button"
                  className={`seg-btn${form.expansion === "requiem" ? " active" : ""}`}
                  onClick={() => setForm((f) => ({ ...f, expansion: "requiem" }))}
                >
                  Requiem
                </button>
              </div>

              <label className="row" style={{ gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={form.tainted}
                  onChange={(e) => setForm((f) => ({ ...f, tainted: e.target.checked }))}
                />
                Tainted
              </label>

              <label className="row" style={{ gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                Ativo (aparece no sorteio de partidas)
              </label>
            </div>

            <div className="field">
              <label>Item inicial (nome)</label>
              <input
                className="input"
                value={form.starterItemName}
                maxLength={80}
                placeholder="ex.: The D6 (deixe vazio se o personagem não tem item fixo)"
                onChange={(e) => setForm((f) => ({ ...f, starterItemName: e.target.value }))}
              />
            </div>

            <div className="row" style={{ gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
              {spritePicker(
                "Carta do personagem",
                cardSprites,
                form.cardSpriteId,
                (id) => setForm((f) => ({ ...f, cardSpriteId: id })),
                "character-card"
              )}
              {spritePicker(
                "Carta do item inicial",
                itemSprites,
                form.starterItemSpriteId,
                (id) => setForm((f) => ({ ...f, starterItemSpriteId: id })),
                "character-item"
              )}
            </div>

            <div className="row" style={{ gap: 20, flexWrap: "wrap", alignItems: "flex-start" }}>
              {spritePicker(
                "Verso do personagem (só se a carta for fisicamente dupla-face, ex.: The Enigma)",
                cardSprites,
                form.cardBackSpriteId,
                (id) => setForm((f) => ({ ...f, cardBackSpriteId: id })),
                "character-card"
              )}
              {spritePicker(
                "Verso do item (só se a carta for fisicamente dupla-face, ex.: Anima Sola)",
                itemSprites,
                form.starterItemBackSpriteId,
                (id) => setForm((f) => ({ ...f, starterItemBackSpriteId: id })),
                "character-item"
              )}
            </div>

            <div className="row">
              <button className="btn btn-accent" onClick={save} disabled={busy || !form.name.trim()}>
                {busy ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar personagem"}
              </button>
              <button className="btn" onClick={cancelEdit} disabled={busy}>
                {editingId ? "Cancelar edição" : "Cancelar"}
              </button>
              {msg && <span className="muted" style={{ color: "var(--accent)" }}>{msg}</span>}
            </div>
          </div>
        )}

        {!formOpen && (
          <section className="stack" style={{ gap: 12 }}>
            {filtered.length === 0 ? (
              <div className="panel">
                <div className="center-empty">
                  {characters.length === 0
                    ? "Nenhum personagem cadastrado ainda."
                    : "Nenhum personagem encontrado."}
                </div>
              </div>
            ) : (
              <>
                <div className="character-grid">
                  {pageItems.map((c) => {
                    const isCharFlipped = flippedChar.has(c.id);
                    const isItemFlipped = flippedItem.has(c.id);
                    return (
                      <div key={c.id} className="treasure-card">
                        <div className="character-pair">
                          <div
                            className={`character-flip${isCharFlipped ? " flipped" : ""}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleFlip(setFlippedChar, c.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") toggleFlip(setFlippedChar, c.id);
                            }}
                          >
                            <div className="character-flip-inner">
                              <div className="treasure-card-art character-flip-face">
                                {c.card_sprite_path ? (
                                  <img className="card-art" src={assetUrl(c.card_sprite_path)} alt="" />
                                ) : (
                                  <span className="muted" style={{ fontSize: 10 }}>Sem carta</span>
                                )}
                              </div>
                              <div className="treasure-card-art character-flip-face back">
                                <img
                                  className="card-art"
                                  src={
                                    c.card_back_sprite_path
                                      ? assetUrl(c.card_back_sprite_path)
                                      : CHARACTER_BACK_FALLBACK
                                  }
                                  alt=""
                                />
                              </div>
                            </div>
                          </div>

                          <div
                            className={`character-flip${isItemFlipped ? " flipped" : ""}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleFlip(setFlippedItem, c.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") toggleFlip(setFlippedItem, c.id);
                            }}
                          >
                            <div className="character-flip-inner">
                              <div className="treasure-card-art character-flip-face">
                                {c.starter_item_sprite_path ? (
                                  <img className="card-art" src={assetUrl(c.starter_item_sprite_path)} alt="" />
                                ) : c.starter_item_name ? (
                                  <span className="pixel-label" style={{ fontSize: 12, padding: 8 }}>
                                    {c.starter_item_name}
                                  </span>
                                ) : (
                                  <span className="muted" style={{ fontSize: 10, padding: 8 }}>
                                    Sem item cadastrado
                                  </span>
                                )}
                              </div>
                              <div className="treasure-card-art character-flip-face back">
                                <img
                                  className="card-art"
                                  src={
                                    c.starter_item_back_sprite_path
                                      ? assetUrl(c.starter_item_back_sprite_path)
                                      : ITEM_BACK_FALLBACK
                                  }
                                  alt=""
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="row" style={{ marginTop: 8, gap: 4, alignItems: "center" }}>
                          <div className="pixel-label" style={{ fontSize: 13 }}>{c.name}</div>
                          <button
                            type="button"
                            className="character-edit-btn"
                            title="Editar"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(c);
                            }}
                          >
                            ✎
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="row" style={{ justifyContent: "center", gap: 12 }}>
                    <button
                      className="btn"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={clampedPage <= 1}
                    >
                      ← Anterior
                    </button>
                    <span className="muted" style={{ fontSize: 13 }}>
                      Página {clampedPage} de {totalPages}
                    </span>
                    <button
                      className="btn"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={clampedPage >= totalPages}
                    >
                      Próxima →
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>
    </Frame>
  );
}
