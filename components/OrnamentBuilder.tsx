"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_FACES, type BaseFace, type Sprite, type OrnamentCategory, type OrnamentFull } from "@/lib/types";

/**
 * Estágio de preview 256×256. Rosto e caixa base do ornamento ficam
 * centralizados no mesmo ponto (centro do estágio) — assim, com offset 0,0,
 * o ornamento já cai em cima do rosto por padrão. Sliders: escala 20–200%,
 * offset X/Y de -64 a 64 a partir desse centro comum.
 */
const STAGE = 256;
const FACE_BOX = { w: 96, h: 84, left: (STAGE - 96) / 2, top: (STAGE - 84) / 2 };
/** Caixa de referência para o ornamento em escala 100% — o sprite é ajustado
 * (contain) dentro dela preservando a proporção real, nunca esticado. */
const ORN_REF = 128;

/** Dimensões do sprite ajustadas (contain) dentro de um box quadrado `ref`. */
function fitContain(w: number, h: number, ref: number): { w: number; h: number } {
  if (!w || !h) return { w: ref, h: ref };
  return w >= h ? { w: ref, h: (h / w) * ref } : { w: (w / h) * ref, h: ref };
}

export default function OrnamentBuilder({
  sprites,
  ornaments,
}: {
  sprites: Sprite[];
  ornaments: OrnamentFull[];
}) {
  const router = useRouter();
  const [previewFace, setPreviewFace] = useState<BaseFace>("white");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selectedSprite, setSelectedSprite] = useState<Sprite | null>(sprites[0] ?? null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<OrnamentCategory>("cabelo");
  const [scale, setScale] = useState(100);
  const [offX, setOffX] = useState(0);
  const [offY, setOffY] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(sprites.map((s) => s.category))).sort(),
    [sprites]
  );
  const visibleSprites = categoryFilter
    ? sprites.filter((s) => s.category === categoryFilter)
    : sprites;

  function pickTab(cat: OrnamentCategory) {
    setCategory(cat);
  }

  async function save() {
    if (!selectedSprite || !name.trim()) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/ornaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sprite_id: selectedSprite.id,
        name: name.trim(),
        category,
        offset_x: offX,
        offset_y: offY,
        scale,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Erro ao salvar.");
      return;
    }
    setMsg(`“${name.trim()}” salvo como ${category}.`);
    setName("");
    router.refresh();
  }

  async function del(id: number) {
    await fetch(`/api/ornaments/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="stack" style={{ gap: 22 }}>
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
            {selectedSprite && (() => {
              const fit = fitContain(selectedSprite.width, selectedSprite.height, ORN_REF);
              const w = (fit.w * scale) / 100;
              const h = (fit.h * scale) / 100;
              return (
                <img
                  className="preview-layer"
                  style={{
                    width: w,
                    height: h,
                    left: (STAGE - w) / 2 + offX,
                    top: (STAGE - h) / 2 + offY,
                  }}
                  src={`/${selectedSprite.path}`}
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
            <SliderRow label="Escala" min={20} max={200} value={scale} suffix="%" onChange={setScale} />
            <SliderRow label="Pos. X" min={-64} max={64} value={offX} onChange={setOffX} />
            <SliderRow label="Pos. Y" min={-64} max={64} value={offY} onChange={setOffY} />
          </div>
        </div>

        {/* -------- controles -------- */}
        <div className="controls-col">
          <div className="row" style={{ gap: 14 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Nome</label>
              <input className="input" value={name} maxLength={60} placeholder="ex.: Cabelo Eden 04"
                onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
            </div>
            <div className="field" style={{ width: 160 }}>
              <label>Categoria</label>
              <div className="seg">
                <button type="button" className={`seg-btn${category === "cabelo" ? " active" : ""}`} onClick={() => pickTab("cabelo")}>Cabelo</button>
                <button type="button" className={`seg-btn${category === "diverso" ? " active" : ""}`} onClick={() => pickTab("diverso")}>Diverso</button>
              </div>
            </div>
          </div>

          <div className="field">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <label style={{ margin: 0 }}>Sprite base (do catálogo)</label>
              <select className="select" style={{ width: 160 }} value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">todas categorias</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {sprites.length === 0 ? (
              <div className="panel" style={{ marginTop: 8 }}>
                <div className="center-empty">
                  Nenhum sprite no catálogo ainda.
                  <br />
                  Recorte sprites na aba Sprites primeiro.
                </div>
              </div>
            ) : (
              <div className="sprite-grid" style={{ marginTop: 8, maxHeight: 220, overflowY: "auto" }}>
                {visibleSprites.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`sprite-pick${selectedSprite?.id === s.id ? " selected" : ""}`}
                    onClick={() => setSelectedSprite(s)}
                    title={s.name}
                  >
                    <img src={`/${s.path}`} alt={s.name} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="row">
            <button className="btn btn-accent" onClick={save} disabled={busy || !selectedSprite || !name.trim()}>
              {busy ? "Salvando…" : "Salvar ornamento"}
            </button>
            {msg && <span className="muted" style={{ color: "var(--accent)" }}>{msg}</span>}
          </div>
        </div>
      </div>

      {/* -------- ornamentos cadastrados -------- */}
      <section className="stack" style={{ gap: 12 }}>
        <h2 className="title" style={{ fontSize: 20 }}>
          Ornamentos cadastrados <span className="muted" style={{ fontSize: 13 }}>({ornaments.length})</span>
        </h2>
        {ornaments.length === 0 ? (
          <div className="panel"><div className="center-empty">Nenhum ornamento cadastrado ainda.</div></div>
        ) : (
          <div className="ornament-list">
            {ornaments.map((o) => (
              <div key={o.id} className="ornament-row">
                <div className="ornament-thumb"><img src={`/${o.sprite_path}`} alt={o.name} /></div>
                <div className="ornament-meta">
                  <div className="pixel-label">{o.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {o.category} · escala {o.scale}% · x {o.offset_x} · y {o.offset_y}
                  </div>
                </div>
                <button className="btn btn-danger" onClick={() => del(o.id)}>Remover</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
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
