"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Frame from "./Frame";
import PlayerAvatar from "./PlayerAvatar";
import { BASE_FACES, type BaseFace, type Player } from "@/lib/types";

const DEFAULT_COLOR = "#e8b978";

type FormState = {
  name: string;
  nickname: string;
  base_face: BaseFace;
};

const emptyForm = (): FormState => ({
  name: "",
  nickname: "",
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
      color: DEFAULT_COLOR,
      base_face: form.base_face,
    };
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
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
    <Frame
      variant="frame-utero"
      title="Jogadores"
      actions={
        !form && (
          <button className="btn btn-accent" onClick={openNew}>
            + New Born
          </button>
        )
      }
    >
      <div className="stack">
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

        {!form && (
          <>
            {active.length === 0 ? (
              <div className="panel">
                <div className="center-empty">
                  Nenhum jogador ainda. Recrute o bando com “New Born”.
                </div>
              </div>
            ) : (
              <div className="players-grid">
                {active.map((p) => (
                  <div key={p.id} className="player-card">
                    <div className="player-top">
                      <PlayerAvatar face={p.base_face} size={68} avatarCache={p.avatar_cache} />
                      <div className="player-meta">
                        <div className="player-name pixel-label">{p.name}</div>
                        {p.nickname && <div className="muted">“{p.nickname}”</div>}
                      </div>
                    </div>
                    <div className="player-actions">
                      <Link href={`/jogadores/${p.id}/avatar`} className="btn">
                        Editar
                      </Link>
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
                      <div className="player-top">
                        <PlayerAvatar face={p.base_face} size={68} avatarCache={p.avatar_cache} />
                        <div className="player-meta">
                          <div className="player-name pixel-label">{p.name}</div>
                          {p.nickname && <div className="muted">“{p.nickname}”</div>}
                        </div>
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
          </>
        )}
      </div>
    </Frame>
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
            <label>História triste</label>
            <input
              className="input"
              value={form.nickname}
              maxLength={40}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
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
          Criar jogador
        </button>
      </div>
    </div>
  );
}
