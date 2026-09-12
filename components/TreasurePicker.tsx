"use client";

import { useMemo, useState } from "react";
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

/** Quantos resultados a busca mostra de uma vez. Passar disso vira parede de
 * ícone de novo — se não achou no topo, é mais rápido digitar mais uma letra. */
const MAX_RESULTS = 24;

/**
 * Seletor de Tesouros da finalização: **mostra só o que foi escolhido**, e o
 * resto entra por busca.
 *
 * A versão anterior despejava o catálogo inteiro na tela — com 154 Tesouros
 * cadastrados isso dava ~150 ícones **por jogador** (medido: 292 ícones e uma
 * página de 6400px numa partida de 2), e achar um item virava caça ao tesouro
 * no sentido errado. Mesma solução que já funciona na busca de monstro da Run.
 *
 * O campo livre continua: item sem cadastro é registrado pelo nome e resolvido
 * no servidor (casa com um existente ou cria um pendente), pra não travar o
 * registro da partida atrás do cadastro visual.
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
  const [query, setQuery] = useState("");

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter((o) => o.name.toLowerCase().includes(q) && !value.ids.includes(o.id))
      .slice(0, MAX_RESULTS);
  }, [query, options, value.ids]);

  function add(id: number) {
    setQuery("");
    if (!value.ids.includes(id)) onChange({ ...value, ids: [...value.ids, id] });
  }

  function removeId(id: number) {
    onChange({ ...value, ids: value.ids.filter((v) => v !== id) });
  }

  function addName(raw: string) {
    const name = raw.trim();
    if (!name) return;
    setQuery("");

    // Digitou o nome de um Tesouro que já existe: gruda nele em vez de criar
    // um duplicado pendente.
    const match = options.find((o) => o.name.toLowerCase() === name.toLowerCase());
    if (match) {
      add(match.id);
      return;
    }
    if (value.names.some((n) => n.toLowerCase() === name.toLowerCase())) return;
    onChange({ ...value, names: [...value.names, name] });
  }

  function removeName(name: string) {
    onChange({ ...value, names: value.names.filter((n) => n !== name) });
  }

  const nothingChosen = value.ids.length === 0 && value.names.length === 0;

  return (
    <div className="treasure-picker">
      <div className="treasure-chosen">
        {value.ids.map((id) => {
          const t = byId.get(id);
          if (!t) return null;
          return (
            <button
              key={id}
              type="button"
              className="treasure-chip"
              title={`${t.name} — clique para remover`}
              onClick={() => removeId(id)}
            >
              {t.icon_sprite_path ? (
                <img src={assetUrl(t.icon_sprite_path)} alt="" />
              ) : null}
              <span>{t.name}</span>
              <span className="treasure-chip-x">×</span>
            </button>
          );
        })}
        {value.names.map((n) => (
          <button
            key={n}
            type="button"
            className="treasure-chip novo"
            title={`${n} (será cadastrado) — clique para remover`}
            onClick={() => removeName(n)}
          >
            <span>{n}</span>
            <span className="treasure-chip-x">×</span>
          </button>
        ))}
        {nothingChosen && <span className="muted">nenhum tesouro</span>}
      </div>

      <div className="treasure-search">
        <input
          className="input"
          value={query}
          placeholder={`buscar entre ${options.length} tesouros…`}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            // Enter pega o 1º resultado; sem resultado nenhum, cadastra o que
            // foi digitado como item novo.
            if (results.length > 0) add(results[0].id);
            else addName(query);
          }}
        />
        {query.trim() && (
          <div className="treasure-results">
            {results.map((t) => (
              <button
                key={t.id}
                type="button"
                className="treasure-result"
                onClick={() => add(t.id)}
              >
                {t.icon_sprite_path ? (
                  <img src={assetUrl(t.icon_sprite_path)} alt="" />
                ) : (
                  <span className="treasure-result-noicon">?</span>
                )}
                <span>{t.name}</span>
              </button>
            ))}
            {results.length === 0 && (
              <button type="button" className="treasure-result novo" onClick={() => addName(query)}>
                + cadastrar “{query.trim()}”
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
