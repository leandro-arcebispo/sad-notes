/**
 * Roster inicial de personagens de The Binding of Isaac: Four Souls + Requiem.
 * Semeado só uma vez (se a tabela estiver vazia). É EDITÁVEL na tela de Ajustes
 * — o cadastro detalhado de cada personagem (itens iniciais, sprite, etc.) é
 * fase futura. A divisão base/requiem segue o critério do jogo de tabuleiro
 * ("jogo base" x "base + expansão Requiem").
 */
export type SeedCharacter = {
  name: string;
  expansion: "base" | "requiem";
  tainted: boolean;
};

const BASE: string[] = [
  "Isaac",
  "Magdalene",
  "Cain",
  "Judas",
  "???", // Blue Baby
  "Eve",
  "Samson",
  "Azazel",
  "Lazarus",
  "Eden",
  "The Lost",
  "Lilith",
  "Keeper",
  "Apollyon",
  "The Forgotten",
];

// Personagens não-tainted adicionados pela Requiem (era Repentance).
const REQUIEM_NORMAL: string[] = ["Bethany", "Jacob & Esau"];

// Os 17 tainted (Repentance), incluídos na Requiem.
const REQUIEM_TAINTED: string[] = [
  "Tainted Isaac",
  "Tainted Magdalene",
  "Tainted Cain",
  "Tainted Judas",
  "Tainted ???",
  "Tainted Eve",
  "Tainted Samson",
  "Tainted Azazel",
  "Tainted Lazarus",
  "Tainted Eden",
  "Tainted Lost",
  "Tainted Lilith",
  "Tainted Keeper",
  "Tainted Apollyon",
  "Tainted Forgotten",
  "Tainted Bethany",
  "Tainted Jacob",
];

export const SEED_CHARACTERS: SeedCharacter[] = [
  ...BASE.map((name) => ({ name, expansion: "base" as const, tainted: false })),
  ...REQUIEM_NORMAL.map((name) => ({
    name,
    expansion: "requiem" as const,
    tainted: false,
  })),
  ...REQUIEM_TAINTED.map((name) => ({
    name,
    expansion: "requiem" as const,
    tainted: true,
  })),
];
