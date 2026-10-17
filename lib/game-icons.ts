/**
 * Ícones temáticos do jogo, no molde do `StatIcon` (que cobre só as 7
 * estatísticas). Substitui os emoji dos eventos da Run e os SVG de traço da
 * sidebar.
 *
 * ⚠️ Os arquivos são **cópias com nome fixo** em `design-system/img/game/`, e
 * não referências ao catálogo de Tesouros. Os sprites recortados ganham um
 * hash no nome (`book-of-sin-96ed8c.png`) gerado na hora do recorte, e em
 * produção os hashes são outros — um mapa por caminho do catálogo não valeria
 * nos dois bancos. Copiar resolve sem consultar o banco pra desenhar um ícone.
 *
 * Regra de escolha (veio de olhar os candidatos no tamanho real): sobre o
 * fundo escuro o ícone precisa de **silhueta clara ou cor saturada** — sprite
 * escuro e fino some a 22px. Ver `docs/PROPOSTA-ICONES.md`.
 */

export const GAME_ICONS = {
  /** Eternal D6 — dado branco, o mais legível do catálogo. */
  dice: "game/icon-dice.png",
  /** Book Of The Dead — livro escuro com caveira branca. */
  morte: "game/icon-morte.png",
  /** Guppy's Paw — pata rosa, lê bem mesmo pequena. */
  alma_roubada: "game/icon-alma-roubada.png",
  /** Blood Puppy — vermelho forte. */
  maldicao: "game/icon-maldicao.png",
  /** Monstro's Tooth — dente branco com chifres. */
  monstro: "game/icon-monstro.png",
  /** Blank Card — carta em branco. */
  nota: "game/icon-nota.png",
  /** Book Of Sin — livro com "7" vermelho. */
  sin: "game/icon-sin.png",
  /** The Poop — pilha de bugs, pro Backlog. */
  poop: "game/icon-poop.png",

  /* Já existiam no design system. */
  alma: "icon-souls.png",
  moedas: "icon-moedas-new.png",
  loot: "icon-loot.png",
  tesouro: "icon-treasures.png",
  trofeu: "icon-nav-ranking.png",
  coroa: "icon-wins.png",
  partidas: "icon-partidas.png",
  /** É um bicho de olhos em X: serve pra MORTES, não pra "partidas". */
  mortes: "icon-report.png",
  personagem: "character-card-back.png",
  rosto: "faces/face-white.png",
} as const;

export type GameIconName = keyof typeof GAME_ICONS;
