"use client";

import { useState } from "react";

/**
 * Entrada de itens em "tags": digita o nome, Enter/vírgula adiciona. Autocomplete
 * via <datalist> a partir dos itens já vistos (o catálogo aprende sozinho).
 */
export default function ItemTagInput({
  value,
  onChange,
  suggestions,
  listId,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
  listId: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const name = raw.trim();
    if (!name) return;
    const exists = value.some((v) => v.toLowerCase() === name.toLowerCase());
    if (!exists) onChange([...value, name]);
    setDraft("");
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }

  return (
    <div className="tag-input">
      <div className="tag-list">
        {value.map((t, i) => (
          <span key={i} className="item-tag">
            {t}
            <button type="button" onClick={() => remove(i)} aria-label={`remover ${t}`}>
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className="input"
        list={listId}
        value={draft}
        placeholder="+ item (Enter)"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            remove(value.length - 1);
          }
        }}
        onBlur={() => add(draft)}
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
