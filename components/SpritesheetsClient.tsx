"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SpriteSheet } from "@/lib/types";
import { assetUrl } from "@/lib/asset-url";

/** Limite prático: o corpo da requisição no Vercel é ~4,5 MB, e o base64 infla
 * ~1,37×. Barramos antes com mensagem clara em vez de falhar no upload. */
const MAX_BYTES = 3.2 * 1024 * 1024;

export default function SpritesheetsClient({ sheets }: { sheets: SpriteSheet[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reenviar o mesmo arquivo depois
    if (!file) return;
    setErr(null);
    setMsg(null);
    if (file.size > MAX_BYTES) {
      setErr(
        `Imagem muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). ` +
          `O limite é ~3 MB — reduza a sheet ou salve como PNG otimizado.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onload = () => upload(dataUrl, img.naturalWidth, img.naturalHeight, file.name);
      img.onerror = () => setErr("Não consegui ler essa imagem.");
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  async function upload(dataUrl: string, width: number, height: number, filename: string) {
    setBusy(true);
    const res = await fetch("/api/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: filename, dataUrl, width, height }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Falha no upload.");
      return;
    }
    setMsg("Spritesheet enviada!");
    router.refresh();
  }

  async function del(id: number, name: string) {
    if (!confirm(`Remover a spritesheet "${name}"?`)) return;
    await fetch(`/api/sheets/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="stack" style={{ gap: 22 }}>
      <section className="panel form-panel">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="stack" style={{ gap: 4 }}>
            <div className="pixel-label">Enviar spritesheet</div>
            <div className="muted" style={{ fontSize: 12 }}>
              PNG, JPG, WEBP ou GIF · até ~3 MB. Ficam disponíveis pra todo mundo aqui e no cortador de sprites.
            </div>
          </div>
          <label className={`btn btn-accent${busy ? " disabled" : ""}`} style={{ cursor: busy ? "default" : "pointer" }}>
            {busy ? "Enviando…" : "Escolher imagem"}
            <input type="file" accept="image/*" onChange={onFile} disabled={busy} style={{ display: "none" }} />
          </label>
        </div>
        {err && <div style={{ color: "var(--blood)", marginTop: 10, fontSize: 13 }}>{err}</div>}
        {msg && <div className="muted" style={{ marginTop: 10, fontSize: 13, color: "var(--accent)" }}>{msg}</div>}
      </section>

      <section className="stack" style={{ gap: 12 }}>
        <h2 className="title" style={{ fontSize: 20 }}>
          Spritesheets <span className="muted" style={{ fontSize: 13 }}>({sheets.length})</span>
        </h2>
        {sheets.length === 0 ? (
          <div className="panel"><div className="center-empty">Nenhuma spritesheet enviada ainda.</div></div>
        ) : (
          <div className="sheet-gallery">
            {sheets.map((s) => (
              <div key={s.id} className="sheet-card">
                <a className="sheet-thumb" href={assetUrl(s.path)} target="_blank" rel="noreferrer" title="Ver em tamanho real">
                  <img src={assetUrl(s.path)} alt={s.name} />
                </a>
                <div className="sheet-meta">
                  <div className="sheet-name" title={s.name}>{s.name}</div>
                  <div className="muted" style={{ fontSize: 11 }}>{s.width}×{s.height}px</div>
                </div>
                <button className="btn btn-danger sheet-del" onClick={() => del(s.id, s.name)} title="Remover">×</button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
