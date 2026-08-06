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
  /** Carta oficial do personagem (sprite categoria character-card). */
  card_sprite_id: number | null;
  /** Carta do item inicial/Eternal (sprite categoria character-item). Null = sem item fixo (ex.: Eden). */
  starter_item_sprite_id: number | null;
  /** Nome do item inicial — guardado à parte da imagem pra poder exibir mesmo sem carta cadastrada. */
  starter_item_name: string | null;
  /** Verso real do personagem, só pra cartas fisicamente dupla-face no jogo
   * (ex.: The Enigma). Null = sem verso próprio — a tela usa o verso
   * genérico (`/design-system/img/character-card-back.png`). */
  card_back_sprite_id: number | null;
  /** Verso real do item inicial, só pra itens dupla-face (ex.: Anima Sola →
   * The Revenant). Null = sem verso próprio — a tela usa o verso genérico
   * (`/design-system/img/eternal-card-back.png`). */
  starter_item_back_sprite_id: number | null;
}

/** Personagem com os sprites de carta/item já resolvidos, para exibição/CRUD
 * do Artefato "Personagens" (`/artefatos/personagens`). Ver docs/PLANO-ARTEFATOS.md. */
export interface CharacterFull extends Character {
  card_sprite_path: string | null;
  starter_item_sprite_path: string | null;
  card_back_sprite_path: string | null;
  starter_item_back_sprite_path: string | null;
}

export interface CharacterInput {
  name: string;
  expansion: "base" | "requiem";
  tainted: boolean;
  active: boolean;
  card_sprite_id: number | null;
  starter_item_sprite_id: number | null;
  starter_item_name: string | null;
  card_back_sprite_id: number | null;
  starter_item_back_sprite_id: number | null;
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

/* ============= Tesouros & Desbloqueio de cosméticos (Artefatos) ============ */

/** Registro de modos de desbloqueio — escalável: adicionar um modo novo aqui
 * (ver lib/unlocks.ts pra lógica) sem mexer no resto do sistema. */
export const UNLOCK_MODES = ["treasure_item", "always"] as const;
export type UnlockMode = (typeof UNLOCK_MODES)[number];

/** Um Tesouro = um item do jogo. `icon` (posição livre) e `transformation`
 * (posição correta) são cosméticos aplicáveis ao avatar, cada um resolvido
 * como um `ornaments` normal (reaproveita 100% do pipeline de avatar). `card`
 * é só ilustrativa (nunca aplicada ao avatar) — referencia um sprite direto. */
export interface Treasure {
  id: number;
  name: string;
  icon_ornament_id: number | null;
  transform_ornament_id: number | null;
  card_sprite_id: number | null;
  unlock_mode: UnlockMode;
  created_at: string;
}

/** Tesouro com os três sprites já resolvidos, para exibição/CRUD. */
export interface TreasureFull extends Treasure {
  icon_sprite_id: number | null;
  icon_sprite_path: string | null;
  icon_sprite_name: string | null;
  icon_sprite_width: number | null;
  icon_sprite_height: number | null;
  icon_offset_x: number | null;
  icon_offset_y: number | null;
  icon_scale: number | null;

  transform_sprite_id: number | null;
  transform_sprite_path: string | null;
  transform_sprite_name: string | null;
  transform_sprite_width: number | null;
  transform_sprite_height: number | null;
  transform_offset_x: number | null;
  transform_offset_y: number | null;
  transform_scale: number | null;

  card_sprite_path: string | null;
  card_sprite_name: string | null;
}

/** Um slot (ícone ou transformação) de Tesouro, já resolvido pra renderizar no
 * editor de avatar: geometria do ornamento + se está aplicado no jogador atual. */
export interface TreasureCosmeticSlot {
  ornament_id: number;
  sprite_path: string;
  sprite_width: number;
  sprite_height: number;
  offset_x: number;
  offset_y: number;
  scale: number;
  applied: boolean;
}

/** Um Tesouro pronto pra tela de customização do avatar de um jogador
 * específico: seus dois cosméticos (se existirem) + se está desbloqueado. */
export interface TreasureAvatarOption {
  id: number;
  name: string;
  unlocked: boolean;
  icon: TreasureCosmeticSlot | null;
  transform: TreasureCosmeticSlot | null;
}

export interface TreasureInput {
  name: string;
  icon_sprite_id: number | null;
  icon_offset_x: number;
  icon_offset_y: number;
  icon_scale: number;
  transform_sprite_id: number | null;
  transform_offset_x: number;
  transform_offset_y: number;
  transform_scale: number;
  card_sprite_id: number | null;
  unlock_mode: UnlockMode;
}

/* ============================ Maldições (Artefatos) ========================= */

/** Uma Maldição = carta + nome, sem cosmético de avatar (diferente de Tesouro:
 * não existe "ícone posicionado" nem "transformação" pra Maldição). Catálogo
 * de referência puro — ver docs/PLANO-ARTEFATOS.md §11. */
export interface Curse {
  id: number;
  name: string;
  card_sprite_id: number | null;
  /** 1 = carta de uma expansão que o grupo não joga hoje — aparece esmaecida
   * no catálogo, mas continua cadastrada (histórico/referência). */
  locked: number;
  created_at: string;
}

/** Maldição com o sprite da carta já resolvido, para exibição/CRUD. */
export interface CurseFull extends Curse {
  card_sprite_path: string | null;
  card_sprite_name: string | null;
}

export interface CurseInput {
  name: string;
  card_sprite_id: number | null;
  locked: boolean;
}

/* ============================ Monstros (Artefatos) ========================= */

/** Um Monstro = carta + nome, mesmo molde de Maldição (catálogo puro, sem
 * cosmético de avatar). Ver docs/PLANO-ARTEFATOS.md §12. */
export interface Monster {
  id: number;
  name: string;
  card_sprite_id: number | null;
  created_at: string;
}

export interface MonsterFull extends Monster {
  card_sprite_path: string | null;
  card_sprite_name: string | null;
}

export interface MonsterInput {
  name: string;
  card_sprite_id: number | null;
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
  { key: "artefatos", label: "Artefatos / Tesouros" },
  { key: "oficina", label: "Oficina (Admin)" },
  { key: "configuracoes", label: "Configurações" },
  { key: "geral", label: "Geral / App todo" },
  { key: "na", label: "N/A (feature nova)" },
] as const;
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number]["key"];

export interface Feedback {
  id: number;
  kind: FeedbackKind;
  title: string;
  description: string;
  area: FeedbackArea;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  player_id: number | null;
  assignee_player_id: number | null;
  created_at: string;
}

/** Linha do backlog com nome do autor e do responsável já resolvidos, para o board. */
export interface FeedbackFull extends Feedback {
  player_name: string | null;
  assignee_name: string | null;
}

export interface FeedbackInput {
  kind: FeedbackKind;
  title: string;
  description: string;
  area: FeedbackArea;
  priority: FeedbackPriority;
  player_id: number | null;
}

/** Patch parcial aceito por PATCH /api/feedback/[id] — mover de coluna, trocar
 * responsável e/ou editar o conteúdo do card. Campos ausentes preservam o
 * valor atual (merge em lib/feedback.ts::updateFeedback, nunca reseta pra
 * default — ver armadilha técnica #6 no HANDOFF sobre PATCH que não é parcial de verdade). */
export interface FeedbackPatch {
  status?: FeedbackStatus;
  assignee_player_id?: number | null;
  kind?: FeedbackKind;
  title?: string;
  description?: string;
  area?: FeedbackArea;
  priority?: FeedbackPriority;
}

/* ============================ Partidas (Fase 2) ============================ */

export const EDITIONS = ["base", "requiem"] as const;
export type Edition = (typeof EDITIONS)[number];

export const CHARACTER_SELECTIONS = ["free", "random"] as const;
export type CharacterSelection = (typeof CHARACTER_SELECTIONS)[number];

export const GAME_FORMATS = ["solo", "duo", "trio"] as const;
export type GameFormat = (typeof GAME_FORMATS)[number];

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
  /** Ciclo de vida — ver GAME_STATUSES. Partidas legadas nascem 'finalizada'. */
  status: GameStatus;
  /** Modo de jogo usado (só rótulo — os parâmetros valem por `params_json`). */
  mode_id: number | null;
  /** SNAPSHOT dos parâmetros do modo no momento do Setup. Editar o modo depois
   * NÃO pode alterar partidas antigas (§5 do plano). */
  params_json: string | null;
  bonus_souls: number; // 1 | 0
  rerolls_allowed: number;
  started_at: string | null;
  ended_at: string | null;
}

export interface GamePlayerRow {
  id: number;
  game_id: number;
  player_id: number;
  character_id: number | null;
  /** Legado (booleano da Fase 2). `reroll_count` é o campo vivo. */
  had_reroll: number;
  loot_in_hand: number;
  coins: number;
  deaths: number;
  treasures: number;
  souls: number;
  is_winner: number;
  team: number | null;
  seat_order: number;
  pvp_kills: number;
  reroll_count: number;
  /** Lobby (Fase 4). No fluxo de uma pessoa só, já nasce 1. */
  ready: number;
  joined_at: string | null;
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
  /** Ids de Tesouros (lib/treasures.ts) já cadastrados que o jogador possuía
   * ao terminar a partida — é isso que alimenta o desbloqueio (lib/unlocks.ts). */
  treasure_ids: number[];
  /** Nomes digitados no campo livre (item ainda sem cadastro visual). Resolvidos
   * dentro da transação de `createGame` (lib/treasures.ts::resolveTreasureId):
   * casa por nome com um Tesouro existente, senão cria um **pendente** (sem
   * ícone/transformação/carta) — evita travar o registro de partidas atrás do
   * cadastro manual de arte, sem duplicar a fonte de verdade de posse de item. */
  treasure_names: string[];
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

/** Um Tesouro possuído numa partida, já resolvido pra exibição (ícone). */
export interface GameTreasureRef {
  id: number;
  name: string;
  icon_sprite_path: string | null;
}

/* ============ Ciclo de vida, modos e eventos (docs/PLANO-PARTIDAS.md) ====== */

/**
 * A partida deixou de ser "uma linha criada no fim" e virou uma entidade com
 * ciclo de vida: `setup` → `andamento` ⇄ `pausada` → `finalizada` (ou
 * `abortada`). `lobby` está reservado pra sessão multi-celular (Fase 4).
 *
 * ⚠️ Só `finalizada` entra em ranking e desbloqueio — ver RANKED_STATUS.
 */
export const GAME_STATUSES = [
  "setup",
  "lobby",
  "andamento",
  "pausada",
  "finalizada",
  "abortada",
] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

/** Único status que conta pra ranking/estatística/desbloqueio (§2.10 do plano). */
export const RANKED_STATUS = "finalizada" satisfies GameStatus;

/** Status em que a partida ainda está sendo jogada (aparecem em destaque na lista). */
export const LIVE_STATUSES = ["setup", "lobby", "andamento", "pausada"] as const;

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  setup: "Em setup",
  lobby: "Aguardando jogadores",
  andamento: "Em andamento",
  pausada: "Pausada",
  finalizada: "Finalizada",
  abortada: "Abandonada",
};

/**
 * Tipos de evento registráveis durante a Run. O registro com o significado de
 * cada operando vive em `lib/game-events.ts` (`EVENT_TYPE_DEFS`) — tipo novo é
 * uma entrada lá, sem migração de schema.
 */
export const GAME_EVENT_TYPES = [
  "alma_ganha",
  "alma_perdida",
  "alma_roubada",
  "morte",
  "monstro_derrotado",
  "maldicao_recebida",
  "personagem_sorteado",
  "pause",
  "resume",
  "nota",
] as const;
export type GameEventType = (typeof GAME_EVENT_TYPES)[number];

/** Artefato ao qual um evento pode apontar. `alma_bonus` ainda não tem
 * catálogo (§2.1 do plano) — até lá o evento guarda só `ref_name`. */
export type GameEventRefType =
  | "monstro"
  | "maldicao"
  | "tesouro"
  | "personagem"
  | "alma_bonus";

export interface GameEvent {
  id: number;
  game_id: number;
  seq: number;
  round: number | null;
  type: GameEventType;
  /** Sujeito do evento — o significado exato por tipo está em EVENT_TYPE_DEFS. */
  player_id: number | null;
  /** Contraparte (ex.: quem matou, de quem roubou). */
  other_player_id: number | null;
  ref_type: GameEventRefType | null;
  ref_id: number | null;
  ref_name: string | null;
  amount: number;
  meta_json: string | null;
  created_by_player_id: number | null;
  client_event_id: string | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by_player_id: number | null;
}

/** Evento com os nomes já resolvidos, pro Diário da Run. */
export interface GameEventFull extends GameEvent {
  player_name: string | null;
  other_player_name: string | null;
  created_by_name: string | null;
}

/** Evento como chega do cliente. `client_event_id` é a chave de idempotência
 * (§6.1 do plano): reenvio por rede ruim não pode duplicar registro. */
export interface GameEventInput {
  type: GameEventType;
  player_id: number | null;
  other_player_id: number | null;
  ref_type: GameEventRefType | null;
  ref_id: number | null;
  ref_name: string | null;
  amount: number;
  round: number | null;
  client_event_id: string | null;
}

/** Estatísticas de um jogador derivadas dos eventos — usadas pra pré-preencher
 * a finalização. NÃO são a fonte de verdade do ranking (§1.3 do plano). */
export interface DerivedPlayerStats {
  souls: number;
  deaths: number;
  pvp_kills: number;
  monsters: number;
  curses: number;
  reroll_count: number;
}

/** Parâmetros de um modo de jogo. Os que o ranking/filtros consultam também
 * viram coluna real em `games`; o resto vive só aqui (§5 do plano). */
export interface GameModeParams {
  edition: Edition;
  souls_to_win: number;
  bonus_souls: boolean;
  format: GameFormat;
  character_selection: CharacterSelection;
  rerolls_allowed: number;
  allow_tainted: boolean;
  enabled_events: GameEventType[];
}

export interface GameMode {
  id: number;
  name: string;
  description: string | null;
  /** 1 = semeado pelo app; não pode ser apagado (pode ser copiado). */
  is_preset: number;
  params_json: string;
  active: number;
  created_at: string;
}

/** Modo com os parâmetros já desserializados. */
export interface GameModeFull extends GameMode {
  params: GameModeParams;
}

export interface GameModeInput {
  name: string;
  description: string | null;
  params: GameModeParams;
}

/** Payload do Setup — cria a partida ANTES de jogar (não tem estado final). */
export interface GameSetupPayload {
  played_at: string;
  mode_id: number | null;
  params: GameModeParams;
  tournament_id: number | null;
  notes: string | null;
  players: { player_id: number; character_id: number | null; team: number | null }[];
  /** Partida que já aconteceu sem o app na mesa (§7.4): nasce sem `started_at`,
   * então a duração não vem pré-preenchida com um cronômetro que nunca rodou —
   * fica em branco pro usuário digitar. */
  retro: boolean;
}

/** Estado final de um jogador na finalização. */
export interface GameFinishPlayerInput {
  player_id: number;
  loot_in_hand: number;
  coins: number;
  deaths: number;
  pvp_kills: number;
  treasures: number;
  souls: number;
  is_winner: boolean;
  treasure_ids: number[];
  treasure_names: string[];
}

export interface GameFinishPayload {
  duration_min: number | null;
  rounds: number | null;
  notes: string | null;
  players: GameFinishPlayerInput[];
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
    /** Itens de texto livre legados (partidas anteriores à Fase 4) — histórico
     * read-only, exibido junto dos Tesouros na tela de detalhe. */
    items: { id: number; name: string }[];
    /** Tesouros possuídos ao fim da partida (nome diferente do `treasures`
     * numérico herdado de GamePlayerRow — aquele é a contagem manual do
     * wizard, este é a lista de ids/ícones resolvidos). */
    owned_treasures: GameTreasureRef[];
  })[];
}
