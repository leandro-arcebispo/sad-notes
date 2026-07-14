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

  // form
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState<FeedbackArea>("geral");
  const [playerId, setPlayerId] = useState<string>("");
  const [priority, setPriority] = useState<FeedbackPriority>("media");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // filtro da lista
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterKind, setFilterKind] = useState<string>("");

  const canSave = description.trim().length > 0 && !busy;

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
    setDescription("");
    setMsg("Enviado pro backlog. Valeu!");
    router.refresh();
  }

  async function changeStatus(id: number, status: FeedbackStatus) {
    await fetch(`/api/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function del(id: number) {
    if (!confirm("Remover este item do backlog?")) return;
    await fetch(`/api/feedback/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const visible = useMemo(
    () =>
      feedback.filter(
        (f) =>
          (!filterStatus || f.status === filterStatus) &&
          (!filterKind || f.kind === filterKind)
      ),
    [feedback, filterStatus, filterKind]
  );

  const openCount = feedback.filter((f) => f.status === "aberto").length;

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

      {/* -------------------- lista -------------------- */}
      <section className="stack" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h2 className="title" style={{ fontSize: 20 }}>
            Backlog{" "}
            <span className="muted" style={{ fontSize: 13 }}>
              ({feedback.length} · {openCount} aberto{openCount === 1 ? "" : "s"})
            </span>
          </h2>
          <div className="row" style={{ gap: 10 }}>
            <select className="select" value={filterKind} onChange={(e) => setFilterKind(e.target.value)}>
              <option value="">todos os tipos</option>
              {FEEDBACK_KINDS.map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
            <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">todos os status</option>
              {FEEDBACK_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="panel">
            <div className="center-empty">
              {feedback.length === 0
                ? "Backlog vazio. Preencha o formulário acima pra começar."
                : "Nenhum item com esse filtro."}
            </div>
          </div>
        ) : (
          <div className="backlog-list">
            {visible.map((f) => (
              <div key={f.id} className={`backlog-row status-${f.status}`}>
                <div className="backlog-head">
                  <span className={`bl-tag kind-${f.kind}`}>{KIND_LABEL[f.kind]}</span>
                  <span className={`bl-tag prio-${f.priority}`}>{PRIORITY_LABEL[f.priority]}</span>
                  <span className="badge">{AREA_LABEL[f.area] ?? f.area}</span>
                  <span className="backlog-meta muted">
                    {f.player_name ?? "anônimo"} · {fmtDate(f.created_at)}
                  </span>
                </div>
                <p className="backlog-desc">{f.description}</p>
                <div className="backlog-actions">
                  <label className="muted" style={{ fontSize: 12 }}>Status</label>
                  <select
                    className="select"
                    value={f.status}
                    onChange={(e) => changeStatus(f.id, e.target.value as FeedbackStatus)}
                  >
                    {FEEDBACK_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  <button className="btn btn-danger" onClick={() => del(f.id)}>Remover</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
