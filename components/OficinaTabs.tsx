"use client";

import { useState } from "react";
import SpritesheetsClient from "./SpritesheetsClient";
import SpritesClient from "./SpritesClient";
import OrnamentBuilder from "./OrnamentBuilder";
import type { Sprite, SpriteSheet, OrnamentFull } from "@/lib/types";

type Tab = "sheets" | "sprites" | "ornaments";

const STAGES: { key: Tab; label: string; hint: string }[] = [
  { key: "sheets", label: "Spritesheets", hint: "Envie as imagens-fonte (as folhas de sprites)." },
  { key: "sprites", label: "Sprites", hint: "Recorte pedaços de uma sheet e monte o catálogo." },
  { key: "ornaments", label: "Ornamentos", hint: "Posicione um sprite como peça de avatar (cabelo/diverso)." },
];

/**
 * Oficina: as três etapas do pipeline de avatar numa página só, com um toggle
 * em fluxo. A ordem sugere o caminho (sheet → recorte → ornamento), mas cada
 * aba é independente — não precisa seguir a sequência.
 */
export default function OficinaTabs({
  sheets,
  sprites,
  categories,
  ornaments,
}: {
  sheets: SpriteSheet[];
  sprites: Sprite[];
  categories: string[];
  ornaments: OrnamentFull[];
}) {
  const [tab, setTab] = useState<Tab>("sheets");
  const active = STAGES.find((s) => s.key === tab)!;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="flow-tabs">
        {STAGES.map((s, i) => (
          <div className="flow-tab-wrap" key={s.key}>
            <button
              type="button"
              className={`flow-tab${tab === s.key ? " active" : ""}`}
              onClick={() => setTab(s.key)}
            >
              <span className="flow-step">{i + 1}</span>
              {s.label}
            </button>
            {i < STAGES.length - 1 && <span className="flow-arrow">→</span>}
          </div>
        ))}
      </div>
      <div className="muted flow-hint">{active.hint}</div>

      {tab === "sheets" && <SpritesheetsClient sheets={sheets} />}
      {tab === "sprites" && (
        <SpritesClient sprites={sprites} categories={categories} savedSheets={sheets} />
      )}
      {tab === "ornaments" && <OrnamentBuilder sprites={sprites} ornaments={ornaments} />}
    </div>
  );
}
