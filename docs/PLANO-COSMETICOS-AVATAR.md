# PLANO — Cosméticos de Avatar (generalização do desbloqueio)

> Plano inicial, aberto em **2026-07-20**. Depende de `docs/PLANO-ARTEFATOS.md`
> (catálogo de entidades) — leia aquele primeiro. Este documento trata só de
> **generalizar** o sistema de desbloqueio de cosmético que já existe e
> funciona pra Tesouro, estendendo pra outros Artefatos.

## 1. O que já existe (não é este plano, é o ponto de partida)

Tesouro já concede cosmético de avatar de verdade, em produção:

- `treasures.icon_ornament_id` / `treasures.transform_ornament_id` — os dois
  slots de cosmético que um Tesouro pode ter.
- `treasures.unlock_mode` + `lib/unlocks.ts` (registro plugável de modos) —
  hoje só o modo `treasure_item`: jogador desbloqueia se terminou uma
  partida possuindo aquele Tesouro (`game_player_treasures` ou o legado
  `game_player_items` casado por nome).
- Enforcement no servidor (não só na UI) ao aplicar o cosmético.

Detalhe completo em `docs/PLANO-ARTEFATOS.md` §3–§4.

## 2. Ideia nova do usuário (2026-07-20)

Além de Tesouro, o usuário quer o mesmo tipo de recompensa pra **Personagem**:

> "O jogador ganhou uma partida com o Personagem Y: ganha a opção de
> personalizar o avatar com o cosmético de personagem."

Ou seja, o **gatilho** de desbloqueio muda (não é "possuir o item", é
"**vencer** uma partida jogando com aquele Personagem"), e o **Artefato**
credor do cosmético muda (`characters` em vez de `treasures`). A mecânica de
"cosmético aplicado ao avatar" em si (ornamento posicionado, cache PNG,
`player_ornaments`) continua a mesma — é o pipeline que Tesouro já usa.

## 3. Por que isso cabe bem no design existente

`lib/unlocks.ts` já nasceu **plugável** de propósito (`docs/PLANO-ARTEFATOS.md`
§4: "adicionar um modo novo no futuro = 1 entrada no registro + 1 query no
carregamento de contexto"). Um modo novo `character_win` é exatamente esse
caso de uso — não é preciso reformular nada do sistema, só estendê-lo.

## 4. O que falta pra existir (rascunho, não implementado)

### 4.1. Personagem precisa de um "slot" de cosmético

Hoje `characters` só tem `sprite_path` (a arte-base do personagem no jogo,
usada em outras telas — não é um cosmético de avatar posicionável). Pra
Personagem conceder cosmético do mesmo jeito que Tesouro concede, precisaria
de algo equivalente a `icon_ornament_id`/`transform_ornament_id` — provável
**migração idempotente** em `characters` (`PRAGMA table_info` antes de
`ALTER TABLE`, mesmo padrão já usado pra `game_players.treasures` e
`players.hair_color` — `characters` já tem dado real seedado, não é tabela
vazia).

### 4.2. Novo modo de desbloqueio: `character_win`

```ts
// esboço, não implementado
{
  key: "character_win",
  label: "Vencer uma partida com o personagem",
  isUnlocked(character, ctx) {
    // ctx precisaria saber: partidas em que ctx.playerId jogou com
    // character.id E is_winner = 1 (mesma tabela game_players, filtro diferente)
  }
}
```

- Contexto do jogador (`PlayerUnlockContext`) precisaria ganhar um novo dado
  pré-carregado: ids de personagens com os quais o jogador **venceu** ao
  menos uma partida (`game_players.character_id` + `is_winner = 1`).
- Diferente do modo `treasure_item` (que também aceita o legado
  `game_player_items`), aqui não há legado a considerar — `character_id` e
  `is_winner` já existem em `game_players` desde a Fase 2 do núcleo de
  partidas, dado real já está lá.

### 4.3. UI

- `AvatarEditor` ganharia uma seção nova, análoga a "Tesouros" — talvez
  "Personagens" — mostrando os personagens desbloqueados (venceu ao menos
  uma vez) com o cosmético correspondente pra ligar/desligar.
- Tela de cadastro de Personagem (ainda não existe uma dedicada — hoje o
  roster é só seed, ver `HANDOFF.md` decisão de arquitetura #5 "tela de
  Ajustes que ainda não existe") precisaria ganhar a mesma tela de
  posicionamento que Tesouro tem hoje (`TreasuresClient`-like), ou virar
  parte dessa tela de Ajustes futura.

## 5. Perguntas em aberto (confirmar com o usuário antes de implementar)

- **Quantos slots de cosmético um Personagem tem?** Tesouro tem 2 (icon +
  transform, papéis diferentes). Personagem é mais parecido com "transform"
  (troca a aparência do Isaac por completo, tipo uma skin) ou faz sentido
  ter os dois papéis também?
- **Cadastro de Personagem:** cabe dentro deste plano criar a tela de
  posicionamento pra Personagem, ou isso espera a tela de Ajustes/roster
  editável que já está no backlog geral (`HANDOFF.md` decisão #5)?
- **Empate/vitória em dupla ou time:** `is_winner` é por `game_player`, então
  times/duplas já funcionam sem ajuste extra — só confirmar que essa leitura
  está certa quando for implementar.
- **Esse padrão (Artefato → cosmético → modo de desbloqueio) deve virar
  genérico** (ex.: uma interface comum que qualquer Artefato com cosmético
  implementa) **ou é aceitável duplicar a lógica** uma segunda vez
  (Personagem copiando o padrão de Tesouro) até um terceiro caso aparecer?
  Generalizar cedo demais pode ser abstração prematura — decidir quando
  chegar a hora de implementar, não agora.

## 6. Status

- [ ] Nenhuma parte implementada — plano em fase de ideia.
