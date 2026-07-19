"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Frame from "./Frame";
import { BASE_FACES, UNLOCK_MODES, type BaseFace, type Sprite, type TreasureFull, type UnlockMode } from "@/lib/types";
import { FACE_BOX, ornamentBox } from "@/lib/avatar-geometry";
import { assetUrl } from "@/lib/asset-url";

const UNLOCK_MODE_LABELS: Record<UnlockMode, string> = {
  treasure_item: "Terminar partida com o item",
  always: "Sempre disponível",
};

const PAGE_SIZE = 24;

type Slot = "icon" | "transform";

type SlotState = {
  spriteId: number | null;
  offsetX: number;
  offsetY: number;
  scale: number;
};

const EMPTY_SLOT: SlotState = { spriteId: null, offsetX: 0, offsetY: 0, scale: 100 };

function emptyForm() {
  return {
    name: "",
    unlockMode: "treasure_item" as UnlockMode,
    icon: EMPTY_SLOT,
    transform: EMPTY_SLOT,
    cardSpriteId: null as number | null,
  };
}

export default function TreasuresClient({
  treasures,
  sprites,
}: {
  treasures: TreasureFull[];
  sprites: Sprite[];
}) {
  const router = useRouter();
  const [previewFace, setPreviewFace] = useState<BaseFace>("white");
  const [activeSlot, setActiveSlot] = useState<Slot>("icon");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const iconSprites = useMemo(() => sprites.filter((s) => s.category === "treasure-icon"), [sprites]);
  const transformSprites = useMemo(() => sprites.filter((s) => s.category === "treasure-transform"), [sprites]);
  const cardSprites = useMemo(() => sprites.filter((s) => s.category === "treasure-card"), [sprites]);
  const spriteById = useMemo(() => new Map(sprites.map((s) => [s.id, s])), [sprites]);

  const activePool = activeSlot === "icon" ? iconSprites : transformSprites;
  const activeSlotState = activeSlot === "icon" ? form.icon : form.transform;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return treasures;
    return treasures.filter((t) => t.name.toLowerCase().includes(q));
  }, [treasures, search]);
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

  function patchActiveSlot(patch: Partial<SlotState>) {
    setForm((f) => ({ ...f, [activeSlot]: { ...f[activeSlot], ...patch } }));
  }
  function pickSprite(spriteId: number) {
    patchActiveSlot({ spriteId });
  }
  function clearSlot(slot: Slot) {
    setForm((f) => ({ ...f, [slot]: EMPTY_SLOT }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setActiveSlot("icon");
    setMsg(null);
    setFormOpen(true);
  }

  function startEdit(t: TreasureFull) {
    setEditingId(t.id);
    setForm({
      name: t.name,
      unlockMode: t.unlock_mode,
      icon: {
        spriteId: t.icon_sprite_id,
        offsetX: t.icon_offset_x ?? 0,
        offsetY: t.icon_offset_y ?? 0,
        scale: t.icon_scale ?? 100,
      },
      transform: {
        spriteId: t.transform_sprite_id,
        offsetX: t.transform_offset_x ?? 0,
        offsetY: t.transform_offset_y ?? 0,
        scale: t.transform_scale ?? 100,
      },
      cardSpriteId: t.card_sprite_id,
    });
    setActiveSlot("icon");
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
      icon_sprite_id: form.icon.spriteId,
      icon_offset_x: form.icon.offsetX,
      icon_offset_y: form.icon.offsetY,
      icon_scale: form.icon.scale,
      transform_sprite_id: form.transform.spriteId,
      transform_offset_x: form.transform.offsetX,
      transform_offset_y: form.transform.offsetY,
      transform_scale: form.transform.scale,
      card_sprite_id: form.cardSpriteId,
      unlock_mode: form.unlockMode,
    };
    const url = editingId ? `/api/treasures/${editingId}` : "/api/treasures";
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

  async function del(id: number) {
    await fetch(`/api/treasures/${id}`, { method: "DELETE" });
    if (editingId === id) cancelEdit();
    router.refresh();
  }

  return (
    <Frame
      variant="frame-chest"
      title={`Tesouros (${treasures.length})`}
      actions={
        !formOpen && (
          <button className="btn btn-accent" onClick={openCreate}>
            + Cadastrar Tesouro
          </button>
        )
      }
    >
      <div className="stack" style={{ gap: 22 }}>
        {formOpen && (
          <div className="ornament-layout">
            {/* -------- preview + sliders -------- */}
            <div className="preview-col">
              <div className="preview-stage">
                <img
                  className="preview-layer"
                  style={{ width: FACE_BOX.w, height: FACE_BOX.h, left: FACE_BOX.left, top: FACE_BOX.top }}
                  src={`/design-system/img/faces/face-${previewFace}.png`}
                  alt=""
                />
                {form.transform.spriteId && (() => {
                  const sprite = spriteById.get(form.transform.spriteId);
                  if (!sprite) return null;
                  const box = ornamentBox(sprite.width, sprite.height, form.transform.offsetX, form.transform.offsetY, form.transform.scale);
                  return (
                    <img
                      className="preview-layer"
                      style={{
                        width: box.w, height: box.h, left: box.left, top: box.top,
                        opacity: activeSlot === "transform" ? 1 : 0.55,
                      }}
                      src={assetUrl(sprite.path)}
                      alt=""
                    />
                  );
                })()}
                {form.icon.spriteId && (() => {
                  const sprite = spriteById.get(form.icon.spriteId);
                  if (!sprite) return null;
                  const box = ornamentBox(sprite.width, sprite.height, form.icon.offsetX, form.icon.offsetY, form.icon.scale);
                  return (
                    <img
                      className="preview-layer"
                      style={{
                        width: box.w, height: box.h, left: box.left, top: box.top,
                        opacity: activeSlot === "icon" ? 1 : 0.55,
                      }}
                      src={assetUrl(sprite.path)}
                      alt=""
                    />
                  );
                })()}
              </div>

              <div className="face-picker" style={{ justifyContent: "center" }}>
                {BASE_FACES.map((f) => (
                  <button key={f} type="button" className={`face-opt${previewFace === f ? " selected" : ""}`}
                    onClick={() => setPreviewFace(f)} title={f}>
                    <img src={`/design-system/img/faces/face-${f}.png`} alt={f} />
                  </button>
                ))}
              </div>

              <div className="sliders">
                <SliderRow label="Escala" min={20} max={200} value={activeSlotState.scale} suffix="%"
                  onChange={(v) => patchActiveSlot({ scale: v })} />
                <SliderRow label="Pos. X" min={-64} max={64} value={activeSlotState.offsetX}
                  onChange={(v) => patchActiveSlot({ offsetX: v })} />
                <SliderRow label="Pos. Y" min={-64} max={64} value={activeSlotState.offsetY}
                  onChange={(v) => patchActiveSlot({ offsetY: v })} />
              </div>
            </div>

            {/* -------- controles -------- */}
            <div className="controls-col">
              <div className="row" style={{ gap: 14 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Nome (idêntico ao jogo)</label>
                  <input className="input" value={form.name} maxLength={80} placeholder="ex.: Ladrão de Chaves"
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="field" style={{ width: 220 }}>
                  <label>Desbloqueio</label>
                  <select className="select" value={form.unlockMode}
                    onChange={(e) => setForm((f) => ({ ...f, unlockMode: e.target.value as UnlockMode }))}>
                    {UNLOCK_MODES.map((m) => (
                      <option key={m} value={m}>{UNLOCK_MODE_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <label style={{ margin: 0 }}>Cosmético em edição</label>
                  <div className="seg">
                    <button type="button" className={`seg-btn${activeSlot === "icon" ? " active" : ""}`}
                      onClick={() => setActiveSlot("icon")}>Ícone (posição livre)</button>
                    <button type="button" className={`seg-btn${activeSlot === "transform" ? " active" : ""}`}
                      onClick={() => setActiveSlot("transform")}>Transformação (posição correta)</button>
                  </div>
                </div>
                {activeSlotState.spriteId && (
                  <div className="row" style={{ justifyContent: "flex-end", marginTop: 4 }}>
                    <button className="btn btn-danger" onClick={() => clearSlot(activeSlot)}>Remover sprite deste slot</button>
                  </div>
                )}
                {activePool.length === 0 ? (
                  <div className="panel" style={{ marginTop: 8 }}>
                    <div className="center-empty">
                      Nenhum sprite “{activeSlot === "icon" ? "treasure-icon" : "treasure-transform"}” recortado ainda.
                      <br />
                      Corte na Oficina primeiro (Admin → Oficina).
                    </div>
                  </div>
                ) : (
                  <div className="sprite-grid" style={{ marginTop: 8, maxHeight: 220, overflowY: "auto" }}>
                    {activePool.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`sprite-pick${activeSlotState.spriteId === s.id ? " selected" : ""}`}
                        onClick={() => pickSprite(s.id)}
                        title={s.name}
                      >
                        <img src={assetUrl(s.path)} alt={s.name} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="field">
                <label>Carta do jogo (ilustrativa, não é cosmético)</label>
                {cardSprites.length === 0 ? (
                  <div className="panel">
                    <div className="center-empty">Nenhum sprite “treasure-card” recortado ainda.</div>
                  </div>
                ) : (
                  <div className="sprite-grid" style={{ maxHeight: 160, overflowY: "auto" }}>
                    {cardSprites.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`sprite-pick${form.cardSpriteId === s.id ? " selected" : ""}`}
                        onClick={() => setForm((f) => ({ ...f, cardSpriteId: f.cardSpriteId === s.id ? null : s.id }))}
                        title={s.name}
                      >
                        <img className="card-art" src={assetUrl(s.path)} alt={s.name} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="row">
                  <button className="btn btn-accent" onClick={save} disabled={busy || !form.name.trim()}>
                    {busy ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar tesouro"}
                  </button>
                  <button className="btn" onClick={cancelEdit} disabled={busy}>
                    {editingId ? "Cancelar edição" : "Cancelar"}
                  </button>
                  {msg && <span className="muted" style={{ color: "var(--accent)" }}>{msg}</span>}
                </div>
                {editingId && (
                  <button className="btn btn-danger" onClick={() => del(editingId)} disabled={busy}>
                    Remover tesouro
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------- tesouros cadastrados -------- */}
        {!formOpen && (
          <section className="stack" style={{ gap: 12 }}>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <input
                className="input"
                style={{ maxWidth: 260 }}
                placeholder="Buscar por nome…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            {filtered.length === 0 ? (
              <div className="panel">
                <div className="center-empty">
                  {treasures.length === 0 ? "Nenhum tesouro cadastrado ainda." : "Nenhum tesouro encontrado."}
                </div>
              </div>
            ) : (
              <>
                <div className="treasure-grid">
                  {pageItems.map((t) => (
                    <button key={t.id} type="button" className="treasure-card" onClick={() => startEdit(t)}>
                      <div className="treasure-card-art">
                        {t.card_sprite_path ? (
                          <img className="card-art" src={assetUrl(t.card_sprite_path)} alt="" />
                        ) : (
                          <span className="muted" style={{ fontSize: 10 }}>Sem carta</span>
                        )}
                      </div>
                      <div className="treasure-slots">
                        <div className="treasure-slot" title="Ícone">
                          {t.icon_sprite_path ? (
                            <img src={assetUrl(t.icon_sprite_path)} alt="" />
                          ) : (
                            <span className="muted" style={{ fontSize: 10 }}>—</span>
                          )}
                        </div>
                        <div className="treasure-slot" title="Transformação">
                          {t.transform_sprite_path ? (
                            <img src={assetUrl(t.transform_sprite_path)} alt="" />
                          ) : (
                            <span className="muted" style={{ fontSize: 10 }}>—</span>
                          )}
                        </div>
                      </div>
                      <div className="pixel-label" style={{ marginTop: 8, fontSize: 13 }}>{t.name}</div>
                    </button>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="row" style={{ justifyContent: "center", gap: 12 }}>
                    <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={clampedPage <= 1}>
                      ← Anterior
                    </button>
                    <span className="muted" style={{ fontSize: 13 }}>
                      Página {clampedPage} de {totalPages}
                    </span>
                    <button className="btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={clampedPage >= totalPages}>
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

function SliderRow({
  label, min, max, value, onChange, suffix = "",
}: {
  label: string; min: number; max: number; value: number; onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="slider-row">
      <span>{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <output>{value}{suffix}</output>
    </div>
  );
}
