/**
 * Paleta de "tintura" de cabelo — aplicada como filtro CSS no preview (cliente)
 * e como `sharp().modulate()` equivalente na composição do PNG cacheado
 * (servidor), usando os mesmos três números (hue/saturation/brightness) nos
 * dois lados pra garantir que preview e avatar final fiquem idênticos.
 *
 * Os sprites de cabelo já vêm coloridos (não são templates em escala de
 * cinza), então a tintura é um deslocamento de matiz sobre a arte original —
 * não uma recolor exata, mas suficiente pro efeito estilizado.
 */
export type HairColorKey =
  | "natural"
  | "preto"
  | "castanho"
  | "loiro"
  | "ruivo"
  | "azul"
  | "verde"
  | "roxo"
  | "rosa"
  | "grisalho";

export interface HairColorRecipe {
  key: HairColorKey;
  label: string;
  hue: number; // graus
  saturation: number; // multiplicador
  brightness: number; // multiplicador
}

export const HAIR_COLORS: HairColorRecipe[] = [
  { key: "natural", label: "Natural", hue: 0, saturation: 1, brightness: 1 },
  { key: "preto", label: "Preto", hue: 0, saturation: 0.3, brightness: 0.55 },
  { key: "castanho", label: "Castanho", hue: 15, saturation: 1.3, brightness: 1.3 },
  { key: "loiro", label: "Loiro", hue: -25, saturation: 2, brightness: 2 },
  { key: "ruivo", label: "Ruivo", hue: -55, saturation: 2.4, brightness: 1.4 },
  { key: "azul", label: "Azul", hue: 180, saturation: 2.6, brightness: 1.4 },
  { key: "verde", label: "Verde", hue: 100, saturation: 2.2, brightness: 1.3 },
  { key: "roxo", label: "Roxo", hue: 260, saturation: 2.4, brightness: 1.3 },
  { key: "rosa", label: "Rosa", hue: 305, saturation: 2.6, brightness: 1.5 },
  { key: "grisalho", label: "Grisalho", hue: 0, saturation: 0.1, brightness: 2.3 },
];

export const DEFAULT_HAIR_COLOR: HairColorKey = "natural";

export function findHairColor(key: string | null | undefined): HairColorRecipe {
  return HAIR_COLORS.find((c) => c.key === key) ?? HAIR_COLORS[0];
}

/** Filtro CSS pra usar direto no `style` do preview client-side. */
export function hairColorCssFilter(key: string | null | undefined): string {
  const r = findHairColor(key);
  if (r.key === "natural") return "none";
  return `hue-rotate(${r.hue}deg) saturate(${r.saturation}) brightness(${r.brightness})`;
}
