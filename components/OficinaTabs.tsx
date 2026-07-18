"use client";

import { useState } from "react";
import SpritesheetsClient from "./SpritesheetsClient";
import SpritesClient from "./SpritesClient";
import type { Sprite, SpriteSheet } from "@/lib/types";

type Tab = "sheets" | "sprites";

const STAGES: { key: Tab; label: string; hint: string }[] = [
  { key: "sheets", label: "Spritesheets", hint: "Envie as imagens-fonte (as folhas de sprites)." },
  { key: "sprites", label: "Sprites", hint: "Recorte pedaços de uma sheet e monte o catálogo." },
];

/**
 * Oficina: cortador de sprites (Spritesheets → Sprites), com um toggle em
 * fluxo. Cada aba é independente — não precisa seguir a sequência.
 */
export default function OficinaTabs({
  sheets,
  sprites,
}: {
  sheets: SpriteSheet[];
  sprites: Sprite[];
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
      {tab === "sprites" && <SpritesClient sprites={sprites} savedSheets={sheets} />}
    </div>
  );
}
