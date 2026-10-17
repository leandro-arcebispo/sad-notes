"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Rascunho de formulário no **navegador**, não no servidor.
 *
 * Antes disso, sair de qualquer formulário perdia tudo: medido na tela de
 * Finalizar, 12 campos preenchidos + 1 Tesouro escolhido viravam zero ao
 * clicar "Voltar". Dói mais lá porque numa mesa de 3 são 18 campos,
 * preenchidos depois de uma ou duas horas de jogo, no celular — onde o
 * navegador descarta aba em segundo plano sozinho.
 *
 * É `localStorage` de propósito, e não uma gravação parcial no servidor:
 * resolve o caso real sem inventar estado "meio salvo" no banco, que traria
 * pergunta nova (uma finalização pela metade conta pro ranking? aparece pros
 * outros?). O rascunho é privado do aparelho e morre quando o formulário é
 * enviado.
 */

const PREFIX = "ifsn:draft:";

function readDraft<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // Modo privado / storage bloqueado: seguir sem rascunho é melhor que quebrar.
    return null;
  }
}

export interface FormDraft {
  /** Havia rascunho salvo e ele foi aplicado. */
  restored: boolean;
  /** Apaga o rascunho (chamar depois de enviar com sucesso). */
  clear: () => void;
  /** Apaga e marca como não-restaurado — para o botão "descartar rascunho". */
  discard: () => void;
}

export function useFormDraft<T>(
  key: string,
  snapshot: T,
  restore: (saved: T) => void
): FormDraft {
  const [restored, setRestored] = useState(false);
  /**
   * Trava de gravação. Sem ela, o efeito de salvar roda no mesmo commit do
   * efeito de restaurar — e, como o `setState` da restauração só aparece no
   * render seguinte, ele gravaria o formulário VAZIO por cima do rascunho que
   * acabou de ser lido.
   */
  const [hydrated, setHydrated] = useState(false);

  const json = useMemo(() => {
    try {
      return JSON.stringify(snapshot);
    } catch {
      return "";
    }
  }, [snapshot]);

  // Restaura uma vez, depois de montar. Ler no initializer do useState
  // quebraria a hidratação: `localStorage` não existe no servidor, então o
  // HTML do servidor e o do cliente sairiam diferentes.
  useEffect(() => {
    const saved = readDraft<T>(key);
    if (saved) {
      restore(saved);
      setRestored(true);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** Como o formulário nasce: serve de referência pra saber se há algo de
   * fato digitado. Capturado no primeiro render, antes de qualquer
   * restauração (que só acontece em efeito). */
  const pristine = useRef(json).current;

  useEffect(() => {
    if (!hydrated || !json) return;
    try {
      // Formulário igual ao estado inicial não tem rascunho — guardar um
      // faria "Descartar" gravar de volta o que acabou de ser descartado, e
      // na visita seguinte apareceria um "rascunho restaurado" que não
      // restaurou nada.
      if (json === pristine) window.localStorage.removeItem(PREFIX + key);
      else window.localStorage.setItem(PREFIX + key, json);
    } catch {
      // Cota estourada ou storage bloqueado — não vale derrubar o formulário.
    }
  }, [key, json, hydrated, pristine]);

  function clear() {
    try {
      window.localStorage.removeItem(PREFIX + key);
    } catch {
      /* idem */
    }
  }

  return {
    restored,
    clear,
    discard: () => {
      clear();
      setRestored(false);
    },
  };
}
