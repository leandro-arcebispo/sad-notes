"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Frame from "./Frame";
import type { CurseFull, Sprite } from "@/lib/types";
import { assetUrl } from "@/lib/asset-url";

const PAGE_SIZE = 24;

function emptyForm() {
  return { name: "", cardSpriteId: null as number | null, locked: false };
}

export default function CursesClient({
  curses,
  sprites,
}: {
  curses: CurseFull[];
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

  const cardSprites = useMemo(() => sprites.filter((s) => s.category === "curse-card"), [sprites]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return curses;
    return curses.filter((c) => c.name.toLowerCase().includes(q));
  }, [curses, search]);
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

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setMsg(null);
    setFormOpen(true);
  }

  function startEdit(c: CurseFull) {
    setEditingId(c.id);
    setForm({ name: c.name, cardSpriteId: c.card_sprite_id, locked: !!c.locked });
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
      card_sprite_id: form.cardSpriteId,
      locked: form.locked,
    };
    const url = editingId ? `/api/curses/${editingId}` : "/api/curses";
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
    setMsg(editingId ? `“${form.name.trim()}” atualizada.` : `“${form.name.trim()}” cadastrada.`);
    setEditingId(null);
    setForm(emptyForm());
    router.refresh();
  }

  async function del(id: number) {
    await fetch(`/api/curses/${id}`, { method: "DELETE" });
    if (editingId === id) cancelEdit();
    router.refresh();
  }

  return (
    <Frame
      variant="frame-cathedral-skulls"
      title={`Maldições (${curses.length})`}
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
              + Cadastrar Maldição
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
                placeholder="ex.: Amnésia"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <label className="row" style={{ gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.locked}
                onChange={(e) => setForm((f) => ({ ...f, locked: e.target.checked }))}
              />
              Bloqueada (expansão que o grupo não joga hoje)
            </label>

            <div className="field">
              <label>Carta do jogo</label>
              {cardSprites.length === 0 ? (
                <div className="panel">
                  <div className="center-empty">
                    Nenhum sprite “curse-card” recortado ainda.
                    <br />
                    Corte na Oficina primeiro (Admin → Oficina).
                  </div>
                </div>
              ) : (
                <div className="sprite-grid" style={{ maxHeight: 220, overflowY: "auto" }}>
                  {cardSprites.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`sprite-pick${form.cardSpriteId === s.id ? " selected" : ""}`}
                      onClick={() =>
                        setForm((f) => ({ ...f, cardSpriteId: f.cardSpriteId === s.id ? null : s.id }))
                      }
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
                  {busy ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar maldição"}
                </button>
                <button className="btn" onClick={cancelEdit} disabled={busy}>
                  {editingId ? "Cancelar edição" : "Cancelar"}
                </button>
                {msg && <span className="muted" style={{ color: "var(--accent)" }}>{msg}</span>}
              </div>
              {editingId && (
                <button className="btn btn-danger" onClick={() => del(editingId)} disabled={busy}>
                  Remover maldição
                </button>
              )}
            </div>
          </div>
        )}

        {!formOpen && (
          <section className="stack" style={{ gap: 12 }}>
            {filtered.length === 0 ? (
              <div className="panel">
                <div className="center-empty">
                  {curses.length === 0 ? "Nenhuma maldição cadastrada ainda." : "Nenhuma maldição encontrada."}
                </div>
              </div>
            ) : (
              <>
                <div className="treasure-grid">
                  {pageItems.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`treasure-card${c.locked ? " locked" : ""}`}
                      onClick={() => startEdit(c)}
                    >
                      <div className="treasure-card-art">
                        {c.card_sprite_path ? (
                          <img className="card-art" src={assetUrl(c.card_sprite_path)} alt="" />
                        ) : (
                          <span className="muted" style={{ fontSize: 10 }}>Sem carta</span>
                        )}
                      </div>
                      <div className="pixel-label" style={{ marginTop: 8, fontSize: 13 }}>{c.name}</div>
                    </button>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="row" style={{ justifyContent: "center", gap: 12 }}>
                    <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={clampedPage <= 1}>
                      ← Anterior
                    </button>
                    <div className="seg">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`seg-btn${n === clampedPage ? " active" : ""}`}
                          onClick={() => setPage(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
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
