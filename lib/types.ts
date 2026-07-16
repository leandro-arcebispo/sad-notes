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
  /** Chave de tintura aplicada ao ornamento de cabelo — ver lib/hair-colors.ts. */
  hair_color: string;
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
  hair_color: string;
}

/* ======================= Catálogo de Sprites (Fase 4) ===================== */

export interface Sprite {
  id: number;
  name: string;
  category: string;
  /** Caminho relativo a /public — ex.: "sprites/cabelo/hair-01-a1b2c3.png". */
  path: string;
  width: number;
  height: number;
  /** Proveniência (para re-recorte futuro): sheet de origem + retângulo. */
  source_sheet: string | null;
  sx: number | null;
  sy: number | null;
  sw: number | null;
  sh: number | null;
  created_at: string;
}

/* ===================== Spritesheets (fonte, não cortadas) ================= */

/** Sprite-sheet original guardada no site (Blob), fonte pros recortes.
 * Visível a todos na galeria e carregável no cortador. */
export interface SpriteSheet {
  id: number;
  name: string;
  /** URL do Blob (prod) ou /path local (dev). */
  path: string;
  width: number;
  height: number;
  created_at: string;
}

/* =========================== Ornamentos (Fase 5) =========================== */

export type OrnamentCategory = "cabelo" | "diverso";

export interface Ornament {
  id: number;
  sprite_id: number;
  name: string;
  category: OrnamentCategory;
  /** Deslocamento em px a partir do centro do estágio de preview (256×256). */
  offset_x: number;
  offset_y: number;
  /** Escala em porcentagem (20–200), aplicada sobre a caixa base de 128×128. */
  scale: number;
  created_at: string;
}

/** Ornamento com o sprite já resolvido, para exibição. */
export interface OrnamentFull extends Ornament {
  sprite_path: string;
  sprite_name: string;
  /** Dimensões reais do sprite — necessárias pra `fitContain` (evita distorção
   * ao compor o avatar, mesmo bug já corrigido no OrnamentBuilder). */
  sprite_width: number;
  sprite_height: number;
}

export interface OrnamentInput {
  sprite_id: number;
  name: string;
  category: OrnamentCategory;
  offset_x: number;
  offset_y: number;
  scale: number;
}

/* ========================= Avatar completo (Fase 6) ========================= */

/** Um ornamento aplicado a um jogador — carrega o row id (p/ remover/reordenar)
 * além dos dados do ornamento em si (posição/escala/sprite). */
export interface AppliedOrnament extends OrnamentFull {
  row_id: number;
  sort_order: number;
}

/** Receita completa do avatar de um jogador: base + no máx. 1 cabelo + N diversos
 * (ordem = empilhamento; o último da lista aparece por cima). */
export interface AvatarRecipe {
  base_face: BaseFace;
  /** Chave de tintura do cabelo (ver lib/hair-colors.ts) — só tem efeito se `hair` não for null. */
  hair_color: string;
  hair: AppliedOrnament | null;
  diversos: AppliedOrnament[];
}

/* ===================== Backlog / Feedback (Admin) ======================= */

export const FEEDBACK_KINDS = ["bug", "melhoria", "feature"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_PRIORITIES = ["baixa", "media", "alta"] as const;
export type FeedbackPriority = (typeof FEEDBACK_PRIORITIES)[number];

export const FEEDBACK_STATUSES = [
  "aberto",
  "andamento",
  "concluido",
  "descartado",
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/** Funcionalidades do app, para localizar onde é o bug/melhoria.
 * `na` = "Não se aplica" (usado por features novas). */
export const FEEDBACK_AREAS = [
  { key: "ranking", label: "Ranking" },
  { key: "partidas", label: "Partidas" },
  { key: "jogadores", label: "Jogadores" },
  { key: "avatar", label: "Avatar / Customização" },
  { key: "sprites", label: "Sprites" },
  { key: "ornamentos", label: "Ornamentos" },
  { key: "configuracoes", label: "Configurações" },
  { key: "geral", label: "Geral / App todo" },
  { key: "na", label: "N/A (feature nova)" },
] as const;
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number]["key"];

export interface Feedback {
  id: number;
  kind: FeedbackKind;
  description: string;
  area: FeedbackArea;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  player_id: number | null;
  created_at: string;
}

/** Linha do backlog com o nome do autor já resolvido, para a listagem. */
export interface FeedbackFull extends Feedback {
  player_name: string | null;
}

export interface FeedbackInput {
  kind: FeedbackKind;
  description: string;
  area: FeedbackArea;
  priority: FeedbackPriority;
  player_id: number | null;
}

/* ============================ Partidas (Fase 2) ============================ */

export type Edition = "base" | "requiem";
export type CharacterSelection = "free" | "random";
export type GameFormat = "solo" | "duo" | "trio";

export const TEAM_SIZE: Record<GameFormat, number> = { solo: 1, duo: 2, trio: 3 };

export interface Game {
  id: number;
  played_at: string; // YYYY-MM-DD
  edition: Edition;
  souls_to_win: number;
  character_selection: CharacterSelection;
  format: GameFormat;
  tournament_id: number | null; // null = Global Board
  duration_min: number | null;
  rounds: number | null;
  notes: string | null;
  created_at: string;
}

export interface GamePlayerRow {
  id: number;
  game_id: number;
  player_id: number;
  character_id: number | null;
  had_reroll: number;
  loot_in_hand: number;
  coins: number;
  deaths: number;
  treasures: number;
  souls: number;
  is_winner: number;
  team: number | null;
  seat_order: number;
}

/** Estado final de um jogador, como vem do wizard. */
export interface GamePlayerInput {
  player_id: number;
  character_id: number | null;
  had_reroll: boolean;
  loot_in_hand: number;
  coins: number;
  deaths: number;
  treasures: number;
  souls: number;
  is_winner: boolean;
  team: number | null;
  items: string[]; // nomes — resolvidos/criados por nome no servidor
}

export interface GamePayload {
  played_at: string;
  edition: Edition;
  souls_to_win: number;
  character_selection: CharacterSelection;
  format: GameFormat;
  tournament_id: number | null;
  duration_min: number | null;
  rounds: number | null;
  notes: string | null;
  players: GamePlayerInput[];
}

/** Linha enxuta para a listagem de partidas. */
export interface GameListItem extends Game {
  num_players: number;
  winners: string[]; // nomes dos vencedores
}

/** Partida expandida para a tela de detalhe. */
export interface GameFull extends Game {
  players: (GamePlayerRow & {
    player_name: string;
    player_color: string;
    player_base_face: BaseFace;
    player_avatar_cache: string | null;
    nickname: string | null;
    character_name: string | null;
    items: { id: number; name: string }[];
  })[];
}
