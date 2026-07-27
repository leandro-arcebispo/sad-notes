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
  "Blue Baby",
  "Eve",
  "Samson",
  "Azazel",
  "Lazarus",
  "Eden",
  "Lilith",
  "Apollyon",
  "The Forgotten",
];

// Personagens não-tainted adicionados pela Requiem (era Repentance). "The
// Lost" está aqui (não em BASE) porque a fonte oficial do card game
// (foursouls.com) categoriza a carta dele como "Gold Box V2", mas o grupo
// joga com ele dentro do deck físico Base+Requiem — ver HANDOFF.md.
const REQUIEM_NORMAL: string[] = ["Bethany", "Jacob & Esau", "The Lost", "Flash Isaac"];

// Os 17 tainted (Repentance), incluídos na Requiem. Nome é o epíteto oficial
// impresso na própria carta do Four Souls (ex. "The Broken"), não "Tainted X"
// — a coluna `tainted` já marca a condição, não precisa repetir no nome.
const REQUIEM_TAINTED: string[] = [
  "The Broken", // Tainted Isaac
  "The Dauntless", // Tainted Magdalene
  "The Hoarder", // Tainted Cain
  "The Deceiver", // Tainted Judas
  "The Soiled", // Tainted Blue Baby
  "The Curdled", // Tainted Eve
  "The Savage", // Tainted Samson
  "The Benighted", // Tainted Azazel
  "The Enigma", // Tainted Lazarus
  "The Capricious", // Tainted Eden
  "The Baleful", // Tainted Lost
  "The Harlot", // Tainted Lilith
  "The Miser", // Tainted Keeper
  "The Empty", // Tainted Apollyon
  "The Fettered", // Tainted Forgotten
  "The Zealot", // Tainted Bethany
  "The Deserter", // Tainted Jacob & Esau
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
