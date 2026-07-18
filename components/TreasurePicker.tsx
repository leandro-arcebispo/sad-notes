"use client";

import { assetUrl } from "@/lib/asset-url";

export interface TreasurePickerOption {
  id: number;
  name: string;
  icon_sprite_path: string;
}

/** Seletor de Tesouros por ícone (0 ou mais) — usado no passo final do wizard
 * de partida pra registrar quais itens um jogador possuía ao terminar. É o
 * que alimenta o sistema de desbloqueio (lib/unlocks.ts): não exige que o
 * Tesouro já esteja desbloqueado, é justamente o que concede o desbloqueio. */
export default function TreasurePicker({
  value,
  onChange,
  options,
}: {
  value: number[];
  onChange: (v: number[]) => void;
  options: TreasurePickerOption[];
}) {
  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  if (options.length === 0) {
    return (
      <span className="muted" style={{ fontSize: 12 }}>
        Nenhum tesouro com ícone cadastrado ainda.
      </span>
    );
  }

  return (
    <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      {options.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`sprite-pick sprite-pick-sm${value.includes(t.id) ? " selected" : ""}`}
          title={t.name}
          onClick={() => toggle(t.id)}
        >
          <img src={assetUrl(t.icon_sprite_path)} alt={t.name} />
        </button>
      ))}
    </div>
  );
}
