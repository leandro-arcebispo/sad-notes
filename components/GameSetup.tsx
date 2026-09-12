"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PlayerAvatar from "./PlayerAvatar";
import {
  TEAM_SIZE,
  type Character,
  type CharacterSelection,
  type Edition,
  type GameFormat,
  type GameModeFull,
  type GameModeParams,
  type Player,
} from "@/lib/types";

/**
 * **Etapa de Setup** — só o que é decidido ANTES de jogar.
 *
 * Não existe aqui nenhum campo de estado final (duração, rodadas, vencedor,
 * moedas): era essa mistura que fazia "Duração da partida" aparecer numa etapa
 * anterior ao jogo. Ao concluir, a partida **é gravada** (`status='andamento'`)
 * — é esse commit que destrava pause, registro ao vivo e, depois, a sessão
 * multi-celular. Ver docs/PLANO-PARTIDAS.md §7.1.
 */

type Part = { player_id: number; character_id: number | null; team: number | null };

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

export default function GameSetup({
  players,
  characters,
  modes,
}: {
  players: Player[];
  characters: Character[];
  modes: GameModeFull[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modeId, setModeId] = useState<number | null>(modes[0]?.id ?? null);
  const [params, setParams] = useState<GameModeParams>(
    modes[0]?.params ?? {
      edition: "base",
      souls_to_win: 4,
      bonus_souls: true,
      format: "solo",
      character_selection: "free",
      rerolls_allowed: 1,
      allow_tainted: false,
      enabled_events: ["morte", "alma_ganha", "monstro_derrotado"],
    }
  );
  const [playedAt, setPlayedAt] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [parts, setParts] = useState<Part[]>([]);
  const [newModeName, setNewModeName] = useState("");
  const [savingMode, setSavingMode] = useState(false);

  const availableChars = useMemo(
    () =>
      characters.filter(
        (c) =>
          (params.edition === "requiem" || c.expansion === "base") &&
          (params.allow_tainted || !c.tainted)
      ),
    [characters, params.edition, params.allow_tainted]
  );

  const teamSize = TEAM_SIZE[params.format];
  const numTeams =
    params.format === "solo" ? 0 : Math.max(2, Math.ceil(parts.length / teamSize));

  /** Trocar de modo recarrega os parâmetros — é o "partir de um preset" do
   * Project Zomboid. O que for editado daqui pra frente vale só nesta partida
   * (o snapshot é copiado no servidor), a não ser que vire um modo novo. */
  function pickMode(id: number | null) {
    setModeId(id);
    const mode = modes.find((m) => m.id === id);
    if (mode) setParams(mode.params);
  }

  function patchParams(p: Partial<GameModeParams>) {
    setParams((prev) => {
      const next = { ...prev, ...p };
      if (p.format && p.format !== prev.format) {
        setParts((ps) => ps.map((x) => ({ ...x, team: null })));
      }
      return next;
    });
  }

  function toggleInclude(id: number) {
    setParts((prev) =>
      prev.some((p) => p.player_id === id)
        ? prev.filter((p) => p.player_id !== id)
        : [...prev, { player_id: id, character_id: null, team: null }]
    );
  }
  function patchPart(id: number, p: Partial<Part>) {
    setParts((prev) => prev.map((x) => (x.player_id === id ? { ...x, ...p } : x)));
  }

  const canSubmit =
    parts.length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(playedAt) &&
    (params.format === "solo" || parts.every((p) => p.team != null));

  async function create(retro: boolean) {
    setError(null);
    setSubmitting(true);
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "setup",
        retro,
        played_at: playedAt,
        mode_id: modeId,
        params,
        tournament_id: null, // Global Board
        notes: notes.trim() || null,
        players: parts,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Erro ao criar a partida.");
      setSubmitting(false);
      return;
    }
    const game = await res.json();
    router.push(retro ? `/partidas/${game.id}/finalizar` : `/partidas/${game.id}/run`);
  }

  async function saveAsMode() {
    if (!newModeName.trim()) return;
    setError(null);
    setSavingMode(true);
    const res = await fetch("/api/game-modes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newModeName.trim(), params }),
    });
    setSavingMode(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Erro ao salvar o modo.");
      return;
    }
    setNewModeName("");
    router.refresh();
  }

  return (
    <div className="stack wizard">
      <div className="panel form-panel">
        <div className="setup-grid">
          <div className="field">
            <label>Modo de jogo</label>
            <select
              className="select"
              value={modeId ?? ""}
              onChange={(e) => pickMode(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— personalizado —</option>
              {modes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.is_preset ? "" : " ✎"}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Data</label>
            <input
              className="input"
              type="date"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
            />
          </div>

          <Seg<Edition>
            label="Edição"
            value={params.edition}
            onChange={(v) => patchParams({ edition: v })}
            options={[
              ["base", "Jogo base"],
              ["requiem", "Base + Requiem"],
            ]}
          />
          <div className="field">
            <label>Almas para vencer</label>
            <input
              className="input"
              type="number"
              min={1}
              max={20}
              value={params.souls_to_win}
              onChange={(e) =>
                patchParams({ souls_to_win: Math.max(1, Number(e.target.value) || 1) })
              }
            />
            {params.format !== "solo" && (
              <span className="muted" style={{ fontSize: 12 }}>
                As almas contam para o time.
              </span>
            )}
          </div>

          <Seg<GameFormat>
            label="Formato"
            value={params.format}
            onChange={(v) => patchParams({ format: v })}
            options={[
              ["solo", "Solo"],
              ["duo", "Duplas"],
              ["trio", "Trios"],
            ]}
          />
          <Seg<CharacterSelection>
            label="Seleção de personagem"
            value={params.character_selection}
            onChange={(v) => patchParams({ character_selection: v })}
            options={[
              ["free", "Livre"],
              ["random", "Aleatória"],
            ]}
          />

          <div className="field">
            <label>Re-rolls permitidos</label>
            <input
              className="input"
              type="number"
              min={0}
              max={10}
              value={params.rerolls_allowed}
              onChange={(e) =>
                patchParams({ rerolls_allowed: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </div>
          <div className="field">
            <label>Regras da casa</label>
            <label className="mini-check">
              <input
                type="checkbox"
                checked={params.bonus_souls}
                onChange={(e) => patchParams({ bonus_souls: e.target.checked })}
              />
              Usar almas bônus
            </label>
            <label className="mini-check">
              <input
                type="checkbox"
                checked={params.allow_tainted}
                onChange={(e) => patchParams({ allow_tainted: e.target.checked })}
              />
              Permitir tainted
            </label>
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Torneio</label>
            <div className="badge">🏳️ Global Board (torneios chegam depois)</div>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Notas (opcional)</label>
            <textarea
              className="textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 12, alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, maxWidth: 280 }}>
            <label>Salvar estes parâmetros como um modo</label>
            <input
              className="input"
              placeholder="ex.: Rápido com tainted"
              value={newModeName}
              onChange={(e) => setNewModeName(e.target.value)}
            />
          </div>
          <button
            className="btn"
            onClick={saveAsMode}
            disabled={!newModeName.trim() || savingMode}
          >
            {savingMode ? "Salvando…" : "Salvar modo"}
          </button>
        </div>
      </div>

      <div className="panel form-panel">
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <span className="muted">
            {parts.length} selecionado(s)
            {params.format !== "solo" ? ` · ${numTeams} times` : ""}
          </span>
          {params.character_selection === "random" && (
            <span className="badge">🎲 Personagens sorteados depois de começar</span>
          )}
        </div>

        {players.length === 0 && (
          <div className="center-empty">Cadastre jogadores primeiro na aba Jogadores.</div>
        )}

        <div className="stack" style={{ gap: 8 }}>
          {players.map((pl) => {
            const part = parts.find((p) => p.player_id === pl.id);
            const on = !!part;
            return (
              <div key={pl.id} className={`part-row${on ? " on" : ""}`}>
                <label className="part-check">
                  <input type="checkbox" checked={on} onChange={() => toggleInclude(pl.id)} />
                  <PlayerAvatar face={pl.base_face} size={40} avatarCache={pl.avatar_cache} />
                  <span className="pixel-label">{pl.name}</span>
                </label>
                {on && part && (
                  <div className="part-controls">
                    {params.character_selection === "free" && (
                      <select
                        className="select"
                        value={part.character_id ?? ""}
                        onChange={(e) =>
                          patchPart(pl.id, {
                            character_id: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      >
                        <option value="">— personagem —</option>
                        {availableChars.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                            {c.tainted ? " ✦" : ""}
                          </option>
                        ))}
                      </select>
                    )}
                    {params.format !== "solo" && (
                      <select
                        className="select team-select"
                        value={part.team ?? ""}
                        onChange={(e) =>
                          patchPart(pl.id, {
                            team: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      >
                        <option value="">— time —</option>
                        {Array.from({ length: numTeams }, (_, i) => i + 1).map((t) => (
                          <option key={t} value={t}>
                            Time {t}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && <div style={{ color: "var(--blood)" }}>{error}</div>}

      <div className="row wizard-nav">
        <button className="btn" onClick={() => router.push("/partidas")} disabled={submitting}>
          Cancelar
        </button>
        <div style={{ flex: 1 }} />
        {/* Partida que já aconteceu sem o app na mesa: pula direto pra
            finalização, sem cronômetro rodando (§7.4 do plano). */}
        <button className="btn" onClick={() => create(true)} disabled={!canSubmit || submitting}>
          Já jogamos — registrar direto
        </button>
        <button
          className="btn btn-accent"
          onClick={() => create(false)}
          disabled={!canSubmit || submitting}
        >
          {submitting ? "Criando…" : "Começar partida →"}
        </button>
      </div>
    </div>
  );
}

function Seg<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="seg">
        {options.map(([v, txt]) => (
          <button
            key={v}
            type="button"
            className={`seg-btn${value === v ? " active" : ""}`}
            onClick={() => onChange(v)}
          >
            {txt}
          </button>
        ))}
      </div>
    </div>
  );
}
