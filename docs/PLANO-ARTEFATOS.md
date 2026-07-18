# PLANO — Artefatos, Tesouros & Desbloqueio de Cosméticos

> Prompt de planejamento da mudança grande iniciada em **2026-07-16**. Leia junto
> com o `HANDOFF.md` (mapa do projeto e armadilhas técnicas). Este documento é a
> fonte de verdade do escopo, da arquitetura-alvo e da divisão em fases. Marque o
> progresso aqui conforme cada fase fecha.

## 1. O que estamos construindo (resumo)

Hoje um cosmético (ornamento) fica disponível pra todo jogador assim que é
cadastrado. Vamos introduzir **desbloqueio de cosméticos** e reorganizar o
pipeline em torno de uma entidade nova, o **Tesouro (Treasure)** — a
representação de um item do jogo *Four Souls*.

Um **Tesouro** tem:

| Campo | O que é | Vira cosmético? |
|---|---|---|
| `name` | Idêntico ao nome do item no jogo (único) | — |
| `icon` | Ícone in-game do item (sprite recortado) | **Sim** — posicionado **livremente** no avatar |
| `transformation` | Impacto visual em Isaac (3º olho, chifre, berne… — sprite recortado) | **Sim** — posicionado **corretamente** no avatar |
| `card` | Foto da carta do jogo de tabuleiro (sprite recortado) | Não (só ilustrativo) |

**Regra de desbloqueio (1º modo, `treasure_item`):** um jogador só pode aplicar
os cosméticos (`icon`/`transformation`) de um Tesouro se **já terminou alguma
partida com aquele item em posse**. O sistema de desbloqueio é **plugável** —
outros modos virão depois (ver §4).

## 2. Decisões já tomadas (não re-perguntar)

1. **Cabelo fica livre; "diversos" são aposentados.** O cabelo (com cor) continua
   um cosmético **base**, sempre disponível, sem desbloqueio. O sistema genérico
   de ornamentos "diverso" deixa de receber cadastros novos — daqui pra frente
   todo cosmético aplicável ao avatar vem de um **Tesouro**. (A tela de autoria de
   cabelo migra pra um submenu futuro de Artefatos — ver §8, fora de escopo agora.)
2. **A partida só aceita Tesouros cadastrados.** O input de texto livre de itens
   no wizard vira um **seletor visual** (pelos ícones) dos Tesouros, 0 ou mais por
   jogador. O histórico antigo (itens de texto livre) continua **visível** e conta
   pro desbloqueio via casamento por nome (ver §4), então "promover" um item
   legado a Tesouro concede o desbloqueio retroativamente.
3. **Oficina vira só um cortador de sprites.** Perde o passo Ornamentos; fica
   `Spritesheets → Sprites`. As categorias de sprite passam a ser os três papéis
   de Tesouro: `treasure-icon`, `treasure-transform`, `treasure-card`.
4. **Oficina vai pra área Admin** da Sidebar (continua acessível a todos — só
   muda de lugar no menu).
5. **Menu novo "Artefatos"** (nav principal) com submenu **"Tesouros"** =
   listagem + CRUD dos Tesouros, incluindo a tela de posicionamento.

## 3. Arquitetura-alvo — modelo de dados

Princípio: **`ornaments` continua sendo o primitivo de "sprite posicionado"
(offset+scale)**, e um Tesouro **possui** até dois ornamentos (icon, transform).
Isso reaproveita 100% do pipeline de composição do avatar (`avatar-geometry.ts`,
`avatar-canvas.ts`, `AvatarComposer`, `player_ornaments`) — zero mudança na
matemática de render (respeita a armadilha #3 do HANDOFF: geometria num lugar só).

### Tabelas novas (via `CREATE TABLE IF NOT EXISTS` no `initSchema`)

```sql
CREATE TABLE IF NOT EXISTS treasures (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT NOT NULL COLLATE NOCASE UNIQUE,   -- idêntico ao jogo
  icon_ornament_id      INTEGER REFERENCES ornaments(id),      -- cosmético "ícone" (posição livre)
  transform_ornament_id INTEGER REFERENCES ornaments(id),      -- cosmético "transformação" (posição correta)
  card_path             TEXT,                                  -- imagem da carta (path/URL de um sprite treasure-card)
  unlock_mode           TEXT NOT NULL DEFAULT 'treasure_item', -- §4 — escalável
  created_at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_player_treasures (
  game_player_id INTEGER NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  treasure_id    INTEGER NOT NULL REFERENCES treasures(id),
  PRIMARY KEY (game_player_id, treasure_id)
);
```

**Sem novas colunas em tabelas existentes** → não precisa de migração idempotente
(`PRAGMA table_info`); só adicionar os dois `CREATE TABLE IF NOT EXISTS` ao
`initSchema` (mesmo padrão de `sheets`/`feedback`). FKs não são forçadas no
libSQL/HTTP → **cascata manual** via `db.batch([...], "write")` em `deleteTreasure`
e `deleteGame` (adicionar `game_player_treasures` à cascata de partida).

### O que muda em torno de `ornaments`

- Os dois ornamentos de um Tesouro são linhas normais em `ornaments`
  (`category = 'diverso'`, pra fluírem no stack de render sem tratamento especial).
  O **papel** (icon vs transform) vive nas FKs do Tesouro, não no ornamento.
- `player_ornaments` continua sendo "cosmético aplicado ao jogador". Aplicar o
  ícone de um Tesouro = inserir `player_ornaments(player, icon_ornament_id)`.
- **Cabelo** continua exatamente como está (`category = 'cabelo'` + `hair_color`).
- `AvatarRecipe` fica igual (`base_face` + `hair` + `diversos`). Os cosméticos de
  Tesouro aplicados são, na prática, o novo conteúdo de `diversos` — render idêntico.

### Legado (não apagar)

- `items` + `game_player_items` **permanecem** para exibir o histórico de partidas
  antigas e para o casamento por nome no desbloqueio. Partidas **novas** gravam em
  `game_player_treasures`. Ver §4 e Fase 5.

## 4. Sistema de desbloqueio (escalável) — `lib/unlocks.ts`

O ponto que o usuário marcou como importante: **plugável**. Modelagem:

```ts
// registro de modos — adicionar um modo novo = adicionar uma entrada aqui
type UnlockMode = "treasure_item" | "always"; // (futuros: "wins_threshold", "manual_grant", "achievement"...)

interface UnlockModeDef {
  key: UnlockMode;
  label: string;
  // Recebe o contexto pré-carregado do jogador (evita N+1) e decide desbloqueio.
  isUnlocked(treasure: Treasure, ctx: PlayerUnlockContext): boolean;
}
```

- `getUnlockedTreasureIds(playerId): Promise<Set<number>>` carrega **uma vez** o
  contexto do jogador (ids de tesouros que ele possuiu em partidas + nomes de
  itens legados que possuiu) e avalia cada Tesouro pelo seu `unlock_mode`. 2
  queries, O(1) por tesouro.
- **Modo `treasure_item`:** desbloqueado se o jogador terminou alguma partida
  possuindo o Tesouro. Conta **tanto** `game_player_treasures` (registro novo)
  **quanto** `game_player_items` legado casado por **nome** (COLLATE NOCASE). É
  isso que faz "promover item antigo → Tesouro" desbloquear retroativamente.
- **Modo `always`:** sempre desbloqueado (cosmético dado de graça).
- **Enforcement no servidor:** ao aplicar um cosmético de Tesouro
  (`POST /api/players/[id]/avatar/...`), validar que o Tesouro dono daquele
  ornamento está desbloqueado pro jogador. UI que só oferece os desbloqueados é
  conveniência; o servidor é a trava real.

Adicionar um modo novo no futuro = 1 entrada no registro + (se precisar) 1 query
no carregamento de contexto. Nenhuma outra parte muda.

## 5. Arquitetura-alvo — UI / navegação

- **Sidebar:** `Oficina` sai do nav principal e vai pro grupo **Admin**. Novo grupo
  **"Artefatos"** (nav principal, expansível) com sub-item **"Tesouros"**
  (`/artefatos/tesouros`). Ícone de Artefatos: um pixel-art do design system (ver
  `public/design-system/img/` — reaproveitar `icon-tesouros-new.png` ou similar).
- **Oficina (`/sprites`):** `OficinaTabs` perde a aba Ornamentos; categoria de
  sprite vira um segmentado fixo (`treasure-icon` / `treasure-transform` /
  `treasure-card`) no lugar do datalist livre.
- **Tesouros (`/artefatos/tesouros`):** listagem (nome + thumb do icon/transform/
  card) e o **TreasureBuilder** (form + tela de posicionamento):
  - Escolher `icon` entre os sprites `treasure-icon`; `transform` entre os
    `treasure-transform`; `card` entre os `treasure-card`.
  - Tela de posicionamento com **2 slots** (icon: livre; transform: correto) —
    reusa `avatar-geometry.ts` + preview no estilo do `OrnamentBuilder`/
    `AvatarComposer`, mas só com essas duas camadas. Salvar cria/atualiza os dois
    ornamentos e o Tesouro.
- **AvatarEditor (jogador):** a seção "Diversos" vira **"Tesouros"** — mostra os
  Tesouros **desbloqueados** do jogador; cada um oferece ligar/desligar o `icon`
  e/ou a `transformation`. Tesouros bloqueados aparecem apagados com dica ("jogue
  uma partida com este item para desbloquear") ou ocultos (decidir na Fase 3).
- **GameWizard (passo 3):** `ItemTagInput` (texto livre) → **TreasurePicker**
  (grade de ícones, multi-seleção 0+). O detalhe da partida passa a mostrar os
  ícones dos Tesouros (partidas antigas seguem mostrando os itens em texto).

## 6. Divisão em fases

Cada fase é fechável sozinha, com `npx tsc --noEmit` limpo e verificação no
browser (via `read_page` + `javascript_tool`, pois `screenshot`/`zoom` dão timeout
— armadilha #5). **Sempre ler o banco real antes de mexer em dado** (Mané id 9,
Robertinho id 10, partidas e sprites reais — armadilha do HANDOFF).

### Fase 0 — Reorganização da Oficina & navegação *(sem schema novo)*
- Sidebar: mover `Oficina` do `NAV` pro `ADMIN_NAV`.
- `OficinaTabs`: remover a aba/`OrnamentBuilder`; ficar `Spritesheets + Sprites`.
- `SpritesClient`: categorias fixas `treasure-icon`/`treasure-transform`/
  `treasure-card` (segmentado), tolerando categorias legadas na biblioteca.
- `app/sprites/page.tsx`: parar de buscar `listOrnaments` (não é mais usado ali).
- `OrnamentBuilder.tsx` fica no repo (será referência do TreasureBuilder), só
  desconectado da Oficina.
- **Verificar:** Oficina renderiza 2 abas; salvar sprite com categoria nova; tsc limpo.

### Fase 1 — Tesouros: dado + API *(sem UI ainda)*
- `lib/db.ts`: `treasures` + `game_player_treasures` no `initSchema`.
- `lib/types.ts`: `Treasure`, `TreasureInput`, `TreasureFull` (com sprites/ornamentos resolvidos), `UNLOCK_MODES`.
- `lib/treasures.ts`: `listTreasures`, `getTreasure`, `createTreasure`
  (cria os 2 ornamentos + o tesouro numa transação), `updateTreasure`,
  `deleteTreasure` (cascata manual: `game_player_treasures` + `player_ornaments`
  dos ornamentos + os 2 ornamentos + o tesouro).
- `lib/validation.ts`: `parseTreasureInput`.
- `app/api/treasures/route.ts` (GET/POST) + `app/api/treasures/[id]/route.ts` (GET/PATCH/DELETE).
- **Verificar:** criar/listar/editar/excluir Tesouro via API (curl), tsc limpo.

### Fase 2 — Menu Artefatos + tela de Tesouros (CRUD + posicionamento)
- Sidebar: grupo "Artefatos" + sub-item "Tesouros".
- `app/artefatos/tesouros/page.tsx` + `components/TreasureBuilder.tsx` +
  `components/TreasuresClient.tsx` (listagem). CSS `.treasure-*` no `globals.css`.
- Preview de posicionamento reusando `avatar-geometry` (2 camadas).
- **Verificar:** criar um Tesouro ponta a ponta (posições persistem, aparece na lista).

### Fase 3 — Desbloqueio (escalável) + aplicação no avatar
- `lib/unlocks.ts`: registro de modos + `getUnlockedTreasureIds` + contexto do jogador (com bridge de nome legado).
- `lib/player-avatar.ts`: helpers pra listar Tesouros desbloqueados + aplicados; aplicar/remover cosmético de Tesouro (reusa `player_ornaments`).
- `AvatarEditor`: seção "Diversos" → "Tesouros" (desbloqueados; toggle icon/transform).
- API de avatar: enforcement de desbloqueio no servidor.
- **Verificar:** Tesouro bloqueado não aplica (UI + API); desbloqueado aplica e entra no PNG de cache; Mané intacto.

### Fase 4 — Partida usa o cadastro de Tesouros
- `GameWizard` passo 3: `ItemTagInput` → `TreasurePicker` (ícones, multi).
- `lib/types.ts`/`validation.ts`: `players[].treasures: number[]` (ids); remover dependência de `items` no payload novo.
- `lib/games.ts`: gravar `game_player_treasures`; `getGame` lê Tesouros (icon+nome); manter leitura dos itens legados pra partidas antigas. Cascata de `deleteGame` inclui `game_player_treasures`.
- Detalhe/lista da partida mostram ícones dos Tesouros.
- **Verificar:** criar partida escolhendo Tesouros; desbloqueio recalcula; detalhe mostra ícones.

### Fase 5 — Limpeza, legado & docs
- Aposentar `ItemTagInput` (e o caminho de criação de item por texto), mantendo
  `items`/`game_player_items` só como histórico read-only.
- `FEEDBACK_AREAS`: adicionar `tesouros`/`artefatos`; revisar `ornamentos`/`sprites`.
- Atualizar `HANDOFF.md`, `ROADMAP.md`, `STYLE-GUIDE.md` e a memória do projeto.
- **Verificar:** fluxo completo (cortar sprite → criar Tesouro → jogar partida com ele → desbloquear → aplicar no avatar); tsc limpo.

## 7. Riscos & pontos de atenção

- **Dado real do usuário** entre sessões — nunca `DELETE` em massa; ler antes,
  filtrar por id/prefixo `__T__` no que for teste (armadilha do HANDOFF).
- **Cascata manual** obrigatória (FKs não forçadas no libSQL) em todo delete que
  toca `treasures`/`game_player_treasures`.
- **`route.ts` só exporta handlers HTTP** — validação em `lib/validation.ts` (armadilha #4).
- **PATCH não-parcial** — se o CRUD de Tesouro tiver PATCH, mandar o payload
  inteiro (mesma pegadinha do `/api/players/[id]`, armadilha #6).
- **`crossOrigin="anonymous"`** em qualquer `Image` que alimente canvas/toDataURL
  (sprites vêm do Blob — armadilha do cortador).
- **Testar imagem só em `npm run dev`**, nunca `npm run start` (404 em `public/`).
- **`next.config.ts` é o único config** — não recriar um `.mjs` (armadilha da Oficina).

## 8. Fora de escopo (backlog desta feature)

- **Autoria de cabelo** num submenu próprio de Artefatos (ex.: "Cabelos") — o
  `OrnamentBuilder` some da Oficina na Fase 0, então criar cabelo novo fica
  temporariamente indisponível; os cabelos já existentes seguem funcionando.
- **Galeria pública de Tesouros / vínculo com torneios / outros modos de
  desbloqueio** (`wins_threshold`, `manual_grant`, achievements) — o sistema já
  nasce preparado (§4), mas os modos extras ficam pra depois.
- **Reposicionamento do ícone por jogador** (hoje a posição é autorada uma vez no
  Tesouro; se o usuário quiser que cada jogador reposicione o próprio ícone,
  vira uma extensão do modelo — decidir se/quando).

## 9. Status das fases

- [x] Fase 0 — Reorganização da Oficina & navegação
- [x] Fase 1 — Tesouros: dado + API
- [x] Fase 2 — Menu Artefatos + tela de Tesouros
- [x] Fase 3 — Desbloqueio + aplicação no avatar
- [x] Fase 4 — Partida usa Tesouros
- [x] Fase 5 — Limpeza, legado & docs
