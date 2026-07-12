"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PlayerAvatar from "./PlayerAvatar";
import ItemTagInput from "./ItemTagInput";
import {
  TEAM_SIZE,
  type Character,
  type CharacterSelection,
  type Edition,
  type GameFormat,
  type GamePayload,
  type Player,
} from "@/lib/types";

type Part = {
  player_id: number;
  character_id: number | null;
  had_reroll: boolean;
  team: number | null;
  loot_in_hand: number;
  coins: number;
  deaths: number;
  souls: number;
  items: string[];
  is_winner: boolean;
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

export default function GameWizard({
  players,
  characters,
  itemSuggestions,
}: {
  players: Player[];
  characters: Character[];
  itemSuggestions: string[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // setup
  const [soulsToWin, setSoulsToWin] = useState(4);
  const [edition, setEdition] = useState<Edition>("base");
  const [selection, setSelection] = useState<CharacterSelection>("free");
  const [format, setFormat] = useState<GameFormat>("solo");
  const [playedAt, setPlayedAt] = useState(todayIso());
  const [duration, setDuration] = useState<string>("");
  const [rounds, setRounds] = useState<string>("");
  const [notes, setNotes] = useState("");

  // participantes
  const [parts, setParts] = useState<Part[]>([]);

  const availableChars = useMemo(
    () => characters.filter((c) => (edition === "base" ? c.expansion === "base" : true)),
    [characters, edition]
  );
  const charById = useMemo(
    () => new Map(characters.map((c) => [c.id, c])),
    [characters]
  );
  const playerById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players]
  );

  const teamSize = TEAM_SIZE[format];
  const numTeams =
    format === "solo" ? 0 : Math.max(2, Math.ceil(parts.length / teamSize));

  function included(id: number) {
    return parts.some((p) => p.player_id === id);
  }
  function toggleInclude(id: number) {
    setParts((prev) =>
      included(id)
        ? prev.filter((p) => p.player_id !== id)
        : [
            ...prev,
            {
              player_id: id,
              character_id: null,
              had_reroll: false,
              team: null,
              loot_in_hand: 0,
              coins: 0,
              deaths: 0,
              souls: 0,
              items: [],
              is_winner: false,
            },
          ]
    );
  }
  function patch(id: number, p: Partial<Part>) {
    setParts((prev) =>
      prev.map((x) => (x.player_id === id ? { ...x, ...p } : x))
    );
  }

  function randomCharId(excludeIds: number[]): number | null {
    const pool = availableChars.filter((c) => !excludeIds.includes(c.id));
    const src = pool.length ? pool : availableChars;
    if (!src.length) return null;
    return src[Math.floor(Math.random() * src.length)].id;
  }
  function sortearTodos() {
    setParts((prev) => {
      const used: number[] = [];
      return prev.map((p) => {
        const id = randomCharId(used);
        if (id) used.push(id);
        return { ...p, character_id: id, had_reroll: false };
      });
    });
  }
  function reroll(id: number) {
    setParts((prev) => {
      const others = prev.filter((p) => p.player_id !== id).map((p) => p.character_id).filter(Boolean) as number[];
      return prev.map((p) =>
        p.player_id === id
          ? { ...p, character_id: randomCharId(others), had_reroll: true }
          : p
      );
    });
  }

  function setWinnerSolo(id: number) {
    setParts((prev) => prev.map((p) => ({ ...p, is_winner: p.player_id === id })));
  }
  function setWinnerTeam(team: number) {
    setParts((prev) => prev.map((p) => ({ ...p, is_winner: p.team === team })));
  }
  const winnerTeam = parts.find((p) => p.is_winner)?.team ?? null;

  function canAdvanceTo2() {
    return soulsToWin >= 1 && /^\d{4}-\d{2}-\d{2}$/.test(playedAt);
  }
  function canAdvanceTo3() {
    if (parts.length < 2) return false;
    if (format !== "solo" && parts.some((p) => p.team == null)) return false;
    return true;
  }

  async function submit() {
    setError(null);
    if (!parts.some((p) => p.is_winner)) {
      setError("Marque o vencedor.");
      return;
    }
    const payload: GamePayload = {
      played_at: playedAt,
      edition,
      souls_to_win: soulsToWin,
      character_selection: selection,
      format,
      tournament_id: null, // Global Board
      duration_min: duration === "" ? null : Number(duration),
      rounds: rounds === "" ? null : Number(rounds),
      notes: notes.trim() || null,
      players: parts.map((p) => ({
        player_id: p.player_id,
        character_id: p.character_id,
        had_reroll: p.had_reroll,
        loot_in_hand: p.loot_in_hand,
        coins: p.coins,
        deaths: p.deaths,
        souls: p.souls,
        is_winner: p.is_winner,
        team: p.team,
        items: p.items,
      })),
    };
    setSubmitting(true);
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Erro ao salvar.");
      setSubmitting(false);
      return;
    }
    const game = await res.json();
    router.push(`/partidas/${game.id}`);
  }

  return (
    <div className="stack wizard">
      <Steps step={step} />

      {step === 1 && (
        <div className="panel form-panel">
          <div className="setup-grid">
            <div className="field">
              <label>Almas para vencer</label>
              <input
                className="input" type="number" min={1} max={20} value={soulsToWin}
                onChange={(e) => setSoulsToWin(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div className="field">
              <label>Data</label>
              <input className="input" type="date" value={playedAt} onChange={(e) => setPlayedAt(e.target.value)} />
            </div>
            <Seg label="Edição" value={edition} onChange={setEdition}
              options={[["base", "Jogo base"], ["requiem", "Base + Requiem"]]} />
            <Seg label="Seleção de personagem" value={selection} onChange={setSelection}
              options={[["free", "Livre"], ["random", "Aleatória"]]} />
            <Seg label="Formato" value={format}
              onChange={(v) => { setFormat(v); setParts((prev) => prev.map((p) => ({ ...p, team: null, is_winner: false }))); }}
              options={[["solo", "Solo"], ["duo", "Duplas"], ["trio", "Trios"]]} />
            <div className="field">
              <label>Duração (min)</label>
              <input className="input" type="number" min={0} value={duration} placeholder="—"
                onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="field">
              <label>Rodadas</label>
              <input className="input" type="number" min={0} value={rounds} placeholder="—"
                onChange={(e) => setRounds(e.target.value)} />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Torneio</label>
              <div className="badge">🏳️ Global Board (torneios chegam depois)</div>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Notas (opcional)</label>
              <textarea className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="panel form-panel">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <span className="muted">
              {parts.length} selecionado(s){format !== "solo" ? ` · ${numTeams} times` : ""}
            </span>
            {selection === "random" && (
              <button className="btn" onClick={sortearTodos} disabled={parts.length === 0}>
                🎲 Sortear personagens
              </button>
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
                      <select className="select" value={part.character_id ?? ""}
                        onChange={(e) => patch(pl.id, { character_id: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">— personagem —</option>
                        {availableChars.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.tainted ? " ✦" : ""}
                          </option>
                        ))}
                      </select>
                      {selection === "random" ? (
                        <button className={`btn reroll${part.had_reroll ? " did" : ""}`} onClick={() => reroll(pl.id)}>
                          🎲 re-roll{part.had_reroll ? " ✓" : ""}
                        </button>
                      ) : (
                        <label className="mini-check">
                          <input type="checkbox" checked={part.had_reroll}
                            onChange={(e) => patch(pl.id, { had_reroll: e.target.checked })} />
                          re-roll
                        </label>
                      )}
                      {format !== "solo" && (
                        <select className="select team-select" value={part.team ?? ""}
                          onChange={(e) => patch(pl.id, { team: e.target.value ? Number(e.target.value) : null })}>
                          <option value="">— time —</option>
                          {Array.from({ length: numTeams }, (_, i) => i + 1).map((t) => (
                            <option key={t} value={t}>Time {t}</option>
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
      )}

      {step === 3 && (
        <div className="panel form-panel">
          <div className="field" style={{ maxWidth: 260 }}>
            <label>Vencedor</label>
            {format === "solo" ? (
              <select className="select" value={parts.find((p) => p.is_winner)?.player_id ?? ""}
                onChange={(e) => setWinnerSolo(Number(e.target.value))}>
                <option value="">— quem venceu —</option>
                {parts.map((p) => (
                  <option key={p.player_id} value={p.player_id}>{playerById.get(p.player_id)?.name}</option>
                ))}
              </select>
            ) : (
              <select className="select" value={winnerTeam ?? ""}
                onChange={(e) => setWinnerTeam(Number(e.target.value))}>
                <option value="">— time vencedor —</option>
                {Array.from({ length: numTeams }, (_, i) => i + 1).map((t) => (
                  <option key={t} value={t}>Time {t}</option>
                ))}
              </select>
            )}
          </div>

          <div className="stack" style={{ gap: 10, marginTop: 8 }}>
            {parts.map((p) => {
              const pl = playerById.get(p.player_id)!;
              return (
                <div key={p.player_id} className={`final-row${p.is_winner ? " winner" : ""}`}>
                  <div className="final-id">
                    <PlayerAvatar face={pl.base_face} size={44} avatarCache={pl.avatar_cache} />
                    <div>
                      <div className="pixel-label">{pl.name}{p.is_winner ? " 👑" : ""}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {p.character_id ? charById.get(p.character_id)?.name : "sem personagem"}
                        {format !== "solo" && p.team ? ` · Time ${p.team}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="final-stats">
                    <NumBox label="Almas" value={p.souls} onChange={(v) => patch(p.player_id, { souls: v })} />
                    <NumBox label="Moedas" value={p.coins} onChange={(v) => patch(p.player_id, { coins: v })} />
                    <NumBox label="Loot" value={p.loot_in_hand} onChange={(v) => patch(p.player_id, { loot_in_hand: v })} />
                    <NumBox label="Mortes" value={p.deaths} onChange={(v) => patch(p.player_id, { deaths: v })} />
                  </div>
                  <div className="final-items">
                    <label className="mini-label">Itens</label>
                    <ItemTagInput
                      value={p.items}
                      onChange={(items) => patch(p.player_id, { items })}
                      suggestions={itemSuggestions}
                      listId={`items-${p.player_id}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && <div style={{ color: "var(--blood)" }}>{error}</div>}

      <div className="row wizard-nav">
        <button className="btn" onClick={() => (step === 1 ? router.push("/partidas") : setStep((s) => (s - 1) as 1 | 2 | 3))} disabled={submitting}>
          {step === 1 ? "Cancelar" : "← Voltar"}
        </button>
        <div style={{ flex: 1 }} />
        {step < 3 ? (
          <button className="btn btn-accent"
            onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
            disabled={step === 1 ? !canAdvanceTo2() : !canAdvanceTo3()}>
            Continuar →
          </button>
        ) : (
          <button className="btn btn-accent" onClick={submit} disabled={submitting}>
            {submitting ? "Salvando…" : "Salvar partida"}
          </button>
        )}
      </div>
    </div>
  );
}

function Steps({ step }: { step: number }) {
  const labels = ["Setup", "Jogadores", "Resultado"];
  return (
    <div className="wizard-steps">
      {labels.map((l, i) => (
        <div key={l} className={`wstep${step === i + 1 ? " active" : ""}${step > i + 1 ? " done" : ""}`}>
          <span className="wstep-n">{i + 1}</span>
          <span className="pixel-label">{l}</span>
        </div>
      ))}
    </div>
  );
}

function Seg<T extends string>({
  label, value, onChange, options,
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
          <button key={v} type="button" className={`seg-btn${value === v ? " active" : ""}`} onClick={() => onChange(v)}>
            {txt}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumBox({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="numbox">
      <span className="mini-label">{label}</span>
      <input className="input" type="number" min={0} value={value}
        onChange={(e) => onChange(Math.max(0, Math.trunc(Number(e.target.value)) || 0))} />
    </label>
  );
}
