/** Cores de rosto base disponíveis (assets em /design-system/img/faces). */
export const BASE_FACES = [
  "white",
  "slate",
  "black",
  "red",
  "green",
  "pink",
] as const;
export type BaseFace = (typeof BASE_FACES)[number];

export interface Player {
  id: number;
  name: string;
  nickname: string | null;
  /** Cor do token do jogador (hex) — usada como acento em tabelas/ranking. */
  color: string;
  /** Rosto base do avatar provisório (Fase 1). Vira a camada de baixo do avatar composto (Fase 6). */
  base_face: BaseFace;
  /** Caminho do PNG achatado do avatar composto (Fase 6). Null até lá. */
  avatar_cache: string | null;
  active: number; // 1 | 0 (soft-delete: jogadores com histórico nunca são apagados)
  created_at: string;
}

export interface Character {
  id: number;
  name: string;
  /** 'base' = jogo base · 'requiem' = adicionado pela expansão Requiem. */
  expansion: "base" | "requiem";
  tainted: number; // 1 | 0
  sprite_path: string | null; // retrato do personagem (cadastro detalhado é fase futura)
  active: number;
}

/** Payload de criação/edição de jogador vindo do formulário. */
export interface PlayerInput {
  name: string;
  nickname: string | null;
  color: string;
  base_face: BaseFace;
}
