/**
 * Geometria compartilhada do avatar/ornamento — usada tanto no cliente
 * (OrnamentBuilder, AvatarComposer, ambos sem dependências de DOM aqui) quanto
 * no servidor (lib/avatar-compose.ts, via sharp). Manter num único lugar evita
 * repetir a matemática de posicionamento/proporção (já corrigimos um bug de
 * distorção por causa de duplicação).
 */

export const STAGE = 256;
export const FACE_BOX = {
  w: 96,
  h: 84,
  left: (STAGE - 96) / 2,
  top: (STAGE - 84) / 2,
};
/** Caixa de referência do ornamento em escala 100% — o sprite é ajustado
 * (contain) dentro dela preservando a proporção real, nunca esticado. */
export const ORN_REF = 128;

/** Janela quadrada centralizada usada para "enquadrar" o avatar final cacheado
 * (lib/avatar-compose.ts). O estágio de edição (256) tem folga generosa em
 * volta do rosto para posicionar ornamentos livremente, mas isso deixa o
 * avatar final com muita margem transparente e o rosto pequeno demais nas
 * telas (ranking, cards). O corte usa só a região central antes de reduzir
 * pro tamanho de cache, preenchendo bem mais o quadro. */
export const AVATAR_FRAME = 160;
export const AVATAR_FRAME_OFFSET = (STAGE - AVATAR_FRAME) / 2;

/** Dimensões do sprite ajustadas (contain) dentro de um box quadrado `ref`. */
export function fitContain(w: number, h: number, ref: number): { w: number; h: number } {
  if (!w || !h) return { w: ref, h: ref };
  return w >= h ? { w: ref, h: (h / w) * ref } : { w: (w / h) * ref, h: ref };
}

/** Caixa final (px inteiros) de um ornamento no estágio, dado o sprite e sua transformação. */
export function ornamentBox(
  spriteW: number,
  spriteH: number,
  offsetX: number,
  offsetY: number,
  scalePct: number
): { w: number; h: number; left: number; top: number } {
  const fit = fitContain(spriteW, spriteH, ORN_REF);
  const w = (fit.w * scalePct) / 100;
  const h = (fit.h * scalePct) / 100;
  return { w, h, left: (STAGE - w) / 2 + offsetX, top: (STAGE - h) / 2 + offsetY };
}
