"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PlayerAvatar from "./PlayerAvatar";
import { BASE_FACES, type BaseFace, type Player } from "@/lib/types";

const TOKEN_COLORS = [
  "#e8b978", "#a01c1c", "#3f7f4f", "#3b6ea5", "#8a4fbf",
  "#c98a2b", "#c95c8a", "#5f9ea0", "#b0a89a",
];

type FormState = {
  id: number | null;
  name: string;
  nickname: string;
  color: string;
  base_face: BaseFace;
};

const emptyForm = (): FormState => ({
  id: null,
  name: "",
  nickname: "",
  color: TOKEN_COLORS[0],
  base_face: "white",
});

export default function JogadoresClient({ players }: { players: Player[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = players.filter((p) => p.active === 1);
  const archived = players.filter((p) => p.active === 0);

  function openNew() {
    setError(null);
    setForm(emptyForm());
  }
  function openEdit(p: Player) {
    setError(null);
    setForm({
      id: p.id,
      name: p.name,
      nickname: p.nickname ?? "",
      color: p.color,
      base_face: p.base_face,
    });
  }
  function refresh() {
    startTransition(() => router.refresh());
  }

  async function submit() {
    if (!form) return;
    if (!form.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      nickname: form.nickname.trim() || null,
      color: form.color,
      base_face: form.base_face,
    };
    const res = await fetch(
      form.id ? `/api/players/${form.id}` : "/api/players",
      {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Erro ao salvar.");
      return;
    }
    setForm(null);
    refresh();
  }

  async function setActive(p: Player, active: boolean) {
    await fetch(`/api/players/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: active ? 1 : 0 }),
    });
    refresh();
  }

  return (
    <div className="stack">
      {!form && (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-accent" onClick={openNew}>
            + Novo jogador
          </button>
        </div>
      )}

      {form && (
        <PlayerForm
          form={form}
          setForm={setForm}
          onSubmit={submit}
          onCancel={() => setForm(null)}
          error={error}
          pending={pending}
        />
      )}

      {active.length === 0 && !form ? (
        <div className="panel">
          <div className="center-empty">
            Nenhum jogador ainda. Recrute o bando com “Novo jogador”.
          </div>
        </div>
      ) : (
        <div className="players-grid">
          {active.map((p) => (
            <div key={p.id} className="player-card">
              <PlayerAvatar face={p.base_face} size={68} avatarCache={p.avatar_cache} />
              <div className="player-meta">
                <div className="player-name pixel-label">{p.name}</div>
                {p.nickname && <div className="muted">“{p.nickname}”</div>}
              </div>
              <div className="player-actions">
                <Link href={`/jogadores/${p.id}/avatar`} className="btn">
                  Avatar
                </Link>
                <button className="btn" onClick={() => openEdit(p)}>
                  Editar
                </button>
                <button className="btn btn-danger" onClick={() => setActive(p, false)}>
                  Arquivar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <details className="archived">
          <summary className="pixel-label">
            Arquivados ({archived.length})
          </summary>
          <div className="players-grid" style={{ marginTop: 12 }}>
            {archived.map((p) => (
              <div key={p.id} className="player-card is-archived">
                <PlayerAvatar face={p.base_face} size={68} avatarCache={p.avatar_cache} />
                <div className="player-meta">
                  <div className="player-name pixel-label">{p.name}</div>
                  {p.nickname && <div className="muted">“{p.nickname}”</div>}
                </div>
                <div className="player-actions">
                  <button className="btn" onClick={() => setActive(p, true)}>
                    Reativar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function PlayerForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  error,
  pending,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  error: string | null;
  pending: boolean;
}) {
  return (
    <div className="panel form-panel">
      <div className="form-grid">
        <div className="form-fields">
          <div className="field">
            <label>Nome</label>
            <input
              className="input"
              value={form.name}
              autoFocus
              maxLength={40}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
          </div>
          <div className="field">
            <label>Apelido (opcional)</label>
            <input
              className="input"
              value={form.nickname}
              maxLength={40}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
          </div>
          <div className="field">
            <label>Cor do token</label>
            <div className="swatch-row">
              {TOKEN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`swatch${form.color === c ? " selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setForm({ ...form, color: c })}
                  aria-label={c}
                />
              ))}
              <input
                type="color"
                className="swatch swatch-custom"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                aria-label="Cor personalizada"
              />
            </div>
          </div>
          <div className="field">
            <label>Rosto base</label>
            <div className="face-picker">
              {BASE_FACES.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`face-opt${form.base_face === f ? " selected" : ""}`}
                  onClick={() => setForm({ ...form, base_face: f })}
                  title={f}
                >
                  <img src={`/design-system/img/faces/face-${f}.png`} alt={f} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-preview">
          <div className="muted pixel-label" style={{ fontSize: 12 }}>
            Prévia
          </div>
          <PlayerAvatar face={form.base_face} size={110} />
          <div className="player-name pixel-label">{form.name || "—"}</div>
          {form.nickname && <div className="muted">“{form.nickname}”</div>}
        </div>
      </div>

      {error && <div style={{ color: "var(--blood)", marginTop: 8 }}>{error}</div>}

      <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
        <button className="btn" onClick={onCancel} disabled={pending}>
          Cancelar
        </button>
        <button className="btn btn-accent" onClick={onSubmit} disabled={pending}>
          {form.id ? "Salvar" : "Criar jogador"}
        </button>
      </div>
    </div>
  );
}
