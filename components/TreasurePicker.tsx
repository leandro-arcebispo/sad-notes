"use client";

import { useState } from "react";
import { assetUrl } from "@/lib/asset-url";

export interface TreasurePickerOption {
  id: number;
  name: string;
  /** null = Tesouro "pendente" (já existe, mas sem ícone cadastrado ainda). */
  icon_sprite_path: string | null;
}

export interface TreasureSelection {
  /** Tesouros já cadastrados (com ou sem ícone) selecionados por clique. */
  ids: number[];
  /** Nomes digitados no campo livre, ainda não resolvidos a um id — viram um
   * Tesouro novo (pendente) ou casam com um existente na hora de salvar a
   * partida (lib/treasures.ts::resolveTreasureId). */
  names: string[];
}

/**
 * Seletor de Tesouros do passo final do wizard: grade de ícones pra quem já
 * tem arte cadastrada, chips de texto pra Tesouros pendentes (cadastrados só
 * pelo nome) e um campo livre pra registrar qualquer outro item na hora —
 * não trava o registro da partida atrás do cadastro visual completo. Se o
 * nome digitado bater (case-insensitive) com uma opção já existente, gruda
 * nela em vez de duplicar.
 */
export default function TreasurePicker({
  value,
  onChange,
  options,
}: {
  value: TreasureSelection;
  onChange: (v: TreasureSelection) => void;
  options: TreasurePickerOption[];
}) {
  const [draft, setDraft] = useState("");

  const iconOptions = options.filter((o) => o.icon_sprite_path);
  const pendingOptions = options.filter((o) => !o.icon_sprite_path);

  function toggleId(id: number) {
    onChange({
      ...value,
      ids: value.ids.includes(id) ? value.ids.filter((v) => v !== id) : [...value.ids, id],
    });
  }

  function addName(raw: string) {
    const name = raw.trim();
    if (!name) return;
    setDraft("");

    const match = options.find((o) => o.name.toLowerCase() === name.toLowerCase());
    if (match) {
      if (!value.ids.includes(match.id)) toggleId(match.id);
      return;
    }
    if (value.names.some((n) => n.toLowerCase() === name.toLowerCase())) return;
    onChange({ ...value, names: [...value.names, name] });
  }

  function removeName(name: string) {
    onChange({ ...value, names: value.names.filter((n) => n !== name) });
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      {(iconOptions.length > 0 || pendingOptions.length > 0) && (
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {iconOptions.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`sprite-pick sprite-pick-sm${value.ids.includes(t.id) ? " selected" : ""}`}
              title={t.name}
              onClick={() => toggleId(t.id)}
            >
              <img src={assetUrl(t.icon_sprite_path!)} alt={t.name} />
            </button>
          ))}
          {pendingOptions.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`treasure-pending-pick${value.ids.includes(t.id) ? " selected" : ""}`}
              title={`${t.name} (sem ícone cadastrado ainda)`}
              onClick={() => toggleId(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="tag-input">
        <div className="tag-list">
          {value.names.map((n) => (
            <span key={n} className="item-tag">
              {n}
              <button type="button" onClick={() => removeName(n)} aria-label={`remover ${n}`}>
                ×
              </button>
            </span>
          ))}
        </div>
        <input
          className="input"
          value={draft}
          placeholder="+ item sem cadastro (Enter)"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addName(draft);
            } else if (e.key === "Backspace" && !draft && value.names.length) {
              removeName(value.names[value.names.length - 1]);
            }
          }}
          onBlur={() => addName(draft)}
        />
      </div>
    </div>
  );
}
