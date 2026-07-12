"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Sprite } from "@/lib/types";

type Sheet = { dataUrl: string; w: number; h: number; name: string };
type Rect = { x: number; y: number; w: number; h: number };

const ZOOMS = [2, 4, 6, 8, 12];
const CATEGORY_HINTS = ["cabelo", "diverso", "avatar-base", "item", "icone", "outro"];

export default function SpritesClient({
  sprites,
  categories,
}: {
  sprites: Sprite[];
  categories: string[];
}) {
  const router = useRouter();
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [zoom, setZoom] = useState(4);
  const [sel, setSel] = useState<Rect | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("diverso");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const catOptions = Array.from(new Set([...categories, ...CATEGORY_HINTS]));

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result);
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        setSheet({ dataUrl: src, w: img.naturalWidth, h: img.naturalHeight, name: file.name });
        setSel(null);
        setPreview(null);
        setMsg(null);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function makeCrop(r: Rect): string | null {
    const img = imgRef.current;
    if (!img || r.w < 1 || r.h < 1) return null;
    const c = document.createElement("canvas");
    c.width = r.w;
    c.height = r.h;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
    return c.toDataURL("image/png");
  }

  function startSelect(e: React.MouseEvent<HTMLImageElement>) {
    if (!sheet) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const nat = (ev: { clientX: number; clientY: number }) => ({
      x: Math.min(sheet.w, Math.max(0, Math.round((ev.clientX - rect.left) / zoom))),
      y: Math.min(sheet.h, Math.max(0, Math.round((ev.clientY - rect.top) / zoom))),
    });
    const start = nat(e);
    const move = (ev: MouseEvent) => {
      const cur = nat(ev);
      setSel({
        x: Math.min(start.x, cur.x),
        y: Math.min(start.y, cur.y),
        w: Math.abs(cur.x - start.x),
        h: Math.abs(cur.y - start.y),
      });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      setSel((s) => {
        if (s && s.w >= 1 && s.h >= 1) setPreview(makeCrop(s));
        else setPreview(null);
        return s;
      });
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  async function save() {
    if (!sheet || !sel || !preview || !name.trim()) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/sprites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        category: category.trim() || "outro",
        dataUrl: preview,
        width: sel.w,
        height: sel.h,
        source_sheet: sheet.name,
        sx: sel.x,
        sy: sel.y,
        sw: sel.w,
        sh: sel.h,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Erro ao salvar.");
      return;
    }
    setMsg(`“${name.trim()}” salvo em ${category}.`);
    setName("");
    router.refresh();
  }

  async function del(id: number) {
    await fetch(`/api/sprites/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const byCategory = sprites.reduce<Record<string, Sprite[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="stack" style={{ gap: 22 }}>
      {/* -------- importar & recortar -------- */}
      <section className="panel form-panel">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <label className="btn btn-accent" style={{ cursor: "pointer" }}>
            Importar sprite-sheet
            <input type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
          </label>
          {sheet && (
            <div className="row" style={{ gap: 10 }}>
              <span className="muted" style={{ fontSize: 12 }}>
                {sheet.name} · {sheet.w}×{sheet.h}px
              </span>
              <span className="muted">Zoom:</span>
              {ZOOMS.map((z) => (
                <button key={z} className={`btn zoom-btn${zoom === z ? " active" : ""}`} onClick={() => setZoom(z)}>
                  {z}×
                </button>
              ))}
            </div>
          )}
        </div>

        {!sheet ? (
          <div className="center-empty">
            Importe um sprite-sheet e arraste na imagem para recortar um sprite.
          </div>
        ) : (
          <div className="cropper-grid">
            <div className="sheet-viewport">
              <div className="sheet-stage" style={{ width: sheet.w * zoom, height: sheet.h * zoom }}>
                <img
                  src={sheet.dataUrl}
                  alt=""
                  draggable={false}
                  onMouseDown={startSelect}
                  style={{ width: sheet.w * zoom, height: sheet.h * zoom, imageRendering: "pixelated", display: "block", cursor: "crosshair" }}
                />
                {sel && (
                  <div
                    className="sel-box"
                    style={{ left: sel.x * zoom, top: sel.y * zoom, width: sel.w * zoom, height: sel.h * zoom }}
                  />
                )}
              </div>
            </div>

            <aside className="crop-side">
              <div className="mini-label">Prévia</div>
              <div className="crop-preview">
                {preview ? <img src={preview} alt="prévia" /> : <span className="muted">arraste na imagem</span>}
              </div>
              {sel && sel.w >= 1 && (
                <div className="muted" style={{ fontSize: 12 }}>
                  {sel.w}×{sel.h}px · origem {sel.x},{sel.y}
                </div>
              )}
              <div className="field">
                <label>Nome</label>
                <input className="input" value={name} maxLength={60} placeholder="ex.: hair-mohawk"
                  onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
              </div>
              <div className="field">
                <label>Categoria</label>
                <input className="input" list="sprite-cats" value={category}
                  onChange={(e) => setCategory(e.target.value)} />
                <datalist id="sprite-cats">
                  {catOptions.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <button className="btn btn-accent" onClick={save} disabled={busy || !preview || !name.trim()}>
                {busy ? "Salvando…" : "Salvar sprite"}
              </button>
              {msg && <div className="muted" style={{ fontSize: 12, color: "var(--accent)" }}>{msg}</div>}
            </aside>
          </div>
        )}
      </section>

      {/* -------- biblioteca -------- */}
      <section className="stack" style={{ gap: 12 }}>
        <h2 className="title" style={{ fontSize: 20 }}>
          Biblioteca <span className="muted" style={{ fontSize: 13 }}>({sprites.length})</span>
        </h2>
        {sprites.length === 0 ? (
          <div className="panel"><div className="center-empty">Nenhum sprite recortado ainda.</div></div>
        ) : (
          Object.entries(byCategory).map(([cat, list]) => (
            <div key={cat} className="stack" style={{ gap: 8 }}>
              <div className="pixel-label muted" style={{ letterSpacing: "0.06em" }}>{cat} · {list.length}</div>
              <div className="sprite-grid">
                {list.map((s) => (
                  <div key={s.id} className="sprite-card">
                    <div className="sprite-thumb"><img src={`/${s.path}`} alt={s.name} /></div>
                    <div className="sprite-name" title={s.name}>{s.name}</div>
                    <div className="muted" style={{ fontSize: 11 }}>{s.width}×{s.height}</div>
                    <button className="btn btn-danger sprite-del" onClick={() => del(s.id)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
