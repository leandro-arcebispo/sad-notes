"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FEEDBACK_AREAS,
  FEEDBACK_KINDS,
  FEEDBACK_PRIORITIES,
  FEEDBACK_STATUSES,
  type FeedbackArea,
  type FeedbackFull,
  type FeedbackKind,
  type FeedbackPriority,
  type FeedbackStatus,
  type Player,
} from "@/lib/types";

const KIND_LABEL: Record<FeedbackKind, string> = {
  bug: "Bug",
  melhoria: "Melhoria",
  feature: "Feature",
};
const PRIORITY_LABEL: Record<FeedbackPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};
const STATUS_LABEL: Record<FeedbackStatus, string> = {
  aberto: "Aberto",
  andamento: "Em andamento",
  concluido: "Concluído",
  descartado: "Descartado",
};
const AREA_LABEL: Record<string, string> = Object.fromEntries(
  FEEDBACK_AREAS.map((a) => [a.key, a.label])
);

/** Tintura por tipo, aplicada em cima do post-it (mesmo truque de
 * lib/hair-colors.ts: hue-rotate/saturate/brightness sobre a arte original). */
const KIND_TINT: Record<FeedbackKind, string> = {
  bug: "hue-rotate(-28deg) saturate(1.8) brightness(0.92)",
  melhoria: "none",
  feature: "hue-rotate(215deg) saturate(2.4) brightness(1.05)",
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BacklogClient({
  feedback,
  players,
}: {
  feedback: FeedbackFull[];
  players: Player[];
}) {
  const router = useRouter();

  // form de criação
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState<FeedbackArea>("geral");
  const [playerId, setPlayerId] = useState<string>("");
  const [priority, setPriority] = useState<FeedbackPriority>("media");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // filtro do board
  const [filterKind, setFilterKind] = useState<string>("");

  // card aberto no momento (modal de detalhe)
  const [detailId, setDetailId] = useState<number | null>(null);
  const [assigneeSel, setAssigneeSel] = useState<string>("");
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailMsg, setDetailMsg] = useState<string | null>(null);

  const canSave = title.trim().length > 0 && description.trim().length > 0 && !busy;

  // features não têm área específica: força N/A
  function pickKind(k: FeedbackKind) {
    setKind(k);
    if (k === "feature") setArea("na");
    else if (area === "na") setArea("geral");
  }

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        title: title.trim(),
        description: description.trim(),
        area,
        priority,
        player_id: playerId ? Number(playerId) : null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Erro ao salvar.");
      return;
    }
    setTitle("");
    setDescription("");
    setMsg("Enviado pro backlog. Valeu!");
    router.refresh();
  }

  function openDetail(f: FeedbackFull) {
    setDetailId(f.id);
    setAssigneeSel(f.assignee_player_id ? String(f.assignee_player_id) : "");
    setDetailMsg(null);
  }
  function closeDetail() {
    setDetailId(null);
    setDetailMsg(null);
  }

  const detail = useMemo(
    () => feedback.find((f) => f.id === detailId) ?? null,
    [feedback, detailId]
  );

  async function moveToColumn(status: FeedbackStatus) {
    if (!detail) return;
    if (status === "andamento" && !assigneeSel) {
      setDetailMsg("Escolha um responsável antes de mover pra Em andamento.");
      return;
    }
    setDetailBusy(true);
    setDetailMsg(null);
    const res = await fetch(`/api/feedback/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        assignee_player_id: assigneeSel ? Number(assigneeSel) : null,
      }),
    });
    setDetailBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setDetailMsg(j.error ?? "Erro ao mover.");
      return;
    }
    router.refresh();
  }

  async function saveAssignee() {
    if (!detail) return;
    setDetailBusy(true);
    setDetailMsg(null);
    const res = await fetch(`/api/feedback/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignee_player_id: assigneeSel ? Number(assigneeSel) : null }),
    });
    setDetailBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setDetailMsg(j.error ?? "Erro ao trocar responsável.");
      return;
    }
    router.refresh();
  }

  async function del() {
    if (!detail) return;
    if (!confirm("Remover este item do backlog?")) return;
    await fetch(`/api/feedback/${detail.id}`, { method: "DELETE" });
    closeDetail();
    router.refresh();
  }

  const columns = useMemo(() => {
    const byStatus: Record<FeedbackStatus, FeedbackFull[]> = {
      aberto: [],
      andamento: [],
      concluido: [],
      descartado: [],
    };
    for (const f of feedback) {
      if (filterKind && f.kind !== filterKind) continue;
      byStatus[f.status].push(f);
    }
    return byStatus;
  }, [feedback, filterKind]);

  return (
    <div className="stack" style={{ gap: 24 }}>
      {/* -------------------- formulário -------------------- */}
      <section className="panel" style={{ padding: 18 }}>
        <h2 className="title" style={{ fontSize: 20, marginBottom: 14 }}>
          Reportar bug / sugerir melhoria
        </h2>

        <div className="field">
          <label>Tipo</label>
          <div className="seg">
            {FEEDBACK_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                className={`seg-btn${kind === k ? " active" : ""}`}
                onClick={() => pickKind(k)}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Título</label>
          <input
            className="input"
            maxLength={80}
            value={title}
            placeholder="Resumo curto — vai aparecer no card do quadro"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Descrição</label>
          <textarea
            className="textarea"
            rows={4}
            maxLength={2000}
            value={description}
            placeholder={
              kind === "bug"
                ? "O que aconteceu? Onde? Como reproduzir?"
                : kind === "melhoria"
                ? "O que dá pra melhorar e por quê?"
                : "Descreva a nova funcionalidade que você queria."
            }
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
          <div className="field" style={{ flex: "1 1 200px", marginBottom: 0 }}>
            <label>Funcionalidade</label>
            <select
              className="select"
              value={area}
              disabled={kind === "feature"}
              onChange={(e) => setArea(e.target.value as FeedbackArea)}
            >
              {FEEDBACK_AREAS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ flex: "1 1 200px", marginBottom: 0 }}>
            <label>Quem está reportando</label>
            <select
              className="select"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
            >
              <option value="">— anônimo —</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ flex: "1 1 160px", marginBottom: 0 }}>
            <label>Prioridade</label>
            <div className="seg">
              {FEEDBACK_PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`seg-btn${priority === p ? " active" : ""}`}
                  onClick={() => setPriority(p)}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 16, alignItems: "center", gap: 14 }}>
          <button className="btn btn-accent" onClick={save} disabled={!canSave}>
            {busy ? "Enviando…" : "Enviar pro backlog"}
          </button>
          {msg && (
            <span className="muted" style={{ color: "var(--accent)" }}>
              {msg}
            </span>
          )}
        </div>
      </section>

      {/* -------------------- board -------------------- */}
      <section className="stack" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h2 className="title" style={{ fontSize: 20 }}>
            Backlog{" "}
            <span className="muted" style={{ fontSize: 13 }}>
              ({feedback.length})
            </span>
          </h2>
          <select className="select" value={filterKind} onChange={(e) => setFilterKind(e.target.value)}>
            <option value="">todos os tipos</option>
            {FEEDBACK_KINDS.map((k) => (
              <option key={k} value={k}>{KIND_LABEL[k]}</option>
            ))}
          </select>
        </div>

        {feedback.length === 0 ? (
          <div className="panel">
            <div className="center-empty">Backlog vazio. Preencha o formulário acima pra começar.</div>
          </div>
        ) : (
          <div className="kanban-board">
            {FEEDBACK_STATUSES.map((status) => (
              <div key={status} className={`kanban-col kanban-col-${status}`}>
                <div className="kanban-col-head">
                  {STATUS_LABEL[status]}{" "}
                  <span className="muted" style={{ fontSize: 12 }}>({columns[status].length})</span>
                </div>
                <div className="kanban-col-cards">
                  {columns[status].length === 0 ? (
                    <div className="kanban-col-empty muted">—</div>
                  ) : (
                    columns[status].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="postit-card"
                        onClick={() => openDetail(f)}
                        title={f.title}
                      >
                        <img
                          src="/sheets/note-postit..png"
                          alt=""
                          className="postit-bg"
                          style={{ filter: KIND_TINT[f.kind] }}
                        />
                        <span className="postit-body">
                          <span className="postit-title">{f.title}</span>
                          {f.assignee_name && (
                            <span className="postit-assignee">{f.assignee_name}</span>
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* -------------------- modal de detalhe -------------------- */}
      {detail && (
        <div className="modal-backdrop" onClick={closeDetail}>
          <div className="modal-panel panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <span className={`bl-tag kind-${detail.kind}`}>{KIND_LABEL[detail.kind]}</span>
                <span className={`bl-tag prio-${detail.priority}`}>{PRIORITY_LABEL[detail.priority]}</span>
                <span className="badge">{AREA_LABEL[detail.area] ?? detail.area}</span>
              </div>
              <button className="btn" onClick={closeDetail}>Fechar</button>
            </div>

            <h3 className="title" style={{ fontSize: 19, margin: "12px 0 4px" }}>{detail.title}</h3>
            <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
              {detail.player_name ?? "anônimo"} · {fmtDate(detail.created_at)}
            </div>
            <p className="backlog-desc">{detail.description}</p>

            <div className="field" style={{ marginTop: 14 }}>
              <label>Responsável</label>
              <div className="row" style={{ gap: 8 }}>
                <select
                  className="select"
                  value={assigneeSel}
                  onChange={(e) => setAssigneeSel(e.target.value)}
                  style={{ flex: 1 }}
                >
                  <option value="">— ninguém —</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button className="btn" onClick={saveAssignee} disabled={detailBusy}>
                  Salvar
                </button>
              </div>
            </div>

            <div className="field">
              <label>Mover para</label>
              <div className="seg" style={{ flexWrap: "wrap" }}>
                {FEEDBACK_STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`seg-btn${detail.status === s ? " active" : ""}`}
                    disabled={detailBusy}
                    onClick={() => moveToColumn(s)}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            {detailMsg && (
              <div className="muted" style={{ color: "var(--blood)", marginBottom: 10 }}>
                {detailMsg}
              </div>
            )}

            <button className="btn btn-danger" onClick={del}>Remover do backlog</button>
          </div>
        </div>
      )}
    </div>
  );
}
