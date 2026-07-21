# PLANO — Artefatos (catálogo de entidades do jogo pra registro estruturado)

> Prompt de planejamento iniciado em **2026-07-16**, **reformulado em
> 2026-07-20** com uma visão mais ampla do que "Artefato" significa. Leia
> junto com o `HANDOFF.md` (mapa do projeto e armadilhas técnicas). Este
> documento é a fonte de verdade do escopo, da arquitetura-alvo e da divisão
> em fases **da família de Artefatos** (catálogo de entidades cadastráveis do
> jogo). Marque o progresso aqui conforme cada fase fecha.
>
> Três ideias que nasceram junto com essa reformulação **viraram planos
> próprios**, não deste arquivo — leia-os separadamente quando for mexer
> neles: `docs/PLANO-COSMETICOS-AVATAR.md` (generalizar o desbloqueio de
> cosméticos pra além de Tesouro), `docs/PLANO-QUARTO-JOGADOR.md` (sala
> visual decorável por jogador) e `docs/PLANO-TORNEIOS.md` (formato de
> torneio, ainda sem definição). Este documento aqui trata só do catálogo de
> Artefatos em si.

## 1. O que é um Artefato (visão ampliada em 2026-07-20)

A ideia original (2026-07-16) tratava "Artefato" como sinônimo de "Tesouro
mais o sistema de desbloqueio de cosmético". Na prática, o conceito é mais
amplo: **um Artefato é qualquer tipo de carta/evento/entidade do jogo de
tabuleiro que vale a pena cadastrar como catálogo, pra registrar partidas por
**seleção** em vez de **texto livre**.** Exemplos: Personagens, Monstros,
Tesouros, Maldições, Salas.

Meta central: sempre que uma partida for registrada, o que hoje seria "texto
digitado" vira "escolha de um item já cadastrado" — dá pra fazer perguntas
estruturadas depois (ex.: *"Mané terminou uma partida com o Tesouro Y"*,
*"Mané matou o Monstro X"*, *"Mané jogou com o Personagem Maggie"*, *"a
Partida Z teve tais Salas em campo"*), coisa que texto livre não permite de
forma confiável.

| Artefato | Cardinalidade no registro de partida | Status |
|---|---|---|
| **Personagens** (`characters`) | 1 por jogador por partida | ✅ já existia **antes** do conceito de Artefato — é o precedente que inspirou o padrão, não nasceu deste plano |
| **Tesouros** (`treasures`) | 0+ por jogador por partida | ✅ implementado (§3–§10 abaixo) |
| **Maldições** (`curses`) | ainda não definido | 🔲 planejado (§11) |
| **Monstros** (`monsters`) | 0+ por jogador por partida (quem matou) | 🔲 planejado (§12) |
| **Salas** (`rooms`) | 0+ por **partida** (não por jogador) | 🔲 planejado (§13) |

**Tesouro acabou carregando duas responsabilidades numa só feature**: (1) ser
um Artefato cadastrável pra registro de partida, e (2) conceder um cosmético
de avatar desbloqueável. Hoje entendemos que **(2) é um recurso adicional que
nem todo Artefato precisa ter** — Monstro e Sala, por exemplo, não têm
cosmético de avatar embutido (Monstro pode virar decoração do Quarto do
Jogador, mas isso é outro plano, não um cosmético de *avatar*). Por isso a
generalização do desbloqueio de cosmético pra outros Artefatos (ex.: vencer
com um Personagem) foi separada em `docs/PLANO-COSMETICOS-AVATAR.md` — este
documento aqui foca no catálogo/registro estruturado.

## 2. Decisões já tomadas (não re-perguntar)

1. **Cabelo fica livre; "diversos" genéricos foram aposentados.** O cabelo
   (com cor) continua um cosmético **base**, sempre disponível, sem
   desbloqueio. Todo cosmético de avatar novo nasce de um Tesouro (ou, no
   futuro, de outro Artefato com cosmético — ver `PLANO-COSMETICOS-AVATAR.md`).
2. **A partida aceita Tesouros cadastrados OU nome livre** *(revisado em
   2026-07-18 — ver §9; a versão original desta decisão, "só Tesouros
   cadastrados", vigorou só até a Fase 4)*. Um nome digitado que bate
   (case-insensitive) com um Tesouro existente linka nele; senão cria um
   Tesouro **pendente** (sem ícone/transformação/carta) — mesmo princípio que
   deve valer pra Monstros quando esse Artefato existir (§12).
3. **Oficina é só um cortador de sprites**, compartilhado por todos os
   Artefatos que precisarem de imagem — categorias fixas por papel
   (`treasure-icon`, `treasure-transform`, `treasure-card`, e futuramente
   `curse-card`/`monster-icon`/`room-icon` conforme cada Artefato nascer).
4. **Oficina fica na área Admin** da Sidebar (acessível a todos — só muda de
   lugar no menu).
5. **Menu "Artefatos"** (nav principal) agrupa os sub-itens de cada
   catálogo — hoje só **"Tesouros"**; **"Maldições"**, **"Monstros"** e
   **"Salas"** entram aqui conforme cada plano for implementado (§11–§13).

## 3. Tesouros — arquitetura implementada (primeira instância do padrão)

Princípio: **`ornaments` continua sendo o primitivo de "sprite posicionado"
(offset+scale)**, e um Tesouro **possui** até dois ornamentos (icon, transform).
Isso reaproveita 100% do pipeline de composição do avatar (`avatar-geometry.ts`,
`avatar-canvas.ts`, `AvatarComposer`, `player_ornaments`) — zero mudança na
matemática de render (respeita a armadilha #3 do HANDOFF: geometria num lugar só).

### Tabelas (via `CREATE TABLE IF NOT EXISTS` no `initSchema`)

```sql
CREATE TABLE IF NOT EXISTS treasures (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT NOT NULL COLLATE NOCASE UNIQUE,   -- idêntico ao jogo
  icon_ornament_id      INTEGER REFERENCES ornaments(id),      -- cosmético "ícone" (posição livre)
  transform_ornament_id INTEGER REFERENCES ornaments(id),      -- cosmético "transformação" (posição correta)
  card_sprite_id        INTEGER REFERENCES sprites(id),        -- imagem da carta (sprite categoria treasure-card)
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

Este par de tabelas (`<artefato>` + `game_player_<artefato>`, PK composta,
cascata manual) é o **molde** reaproveitado por Maldições/Monstros/Salas
abaixo — só muda o que cada Artefato carrega e a quem ele se relaciona
(jogador vs. partida inteira, ver §13).

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

## 4. Sistema de desbloqueio de cosméticos do Tesouro — `lib/unlocks.ts`

> Este sistema já existe e funciona **especificamente pra Tesouro**.
> Generalizá-lo pra outros Artefatos (ex.: cosmético de Personagem por
> vitória) é o assunto de `docs/PLANO-COSMETICOS-AVATAR.md` — não duplicar
> aqui, só manter esta seção como registro do que já está implementado.

O ponto que o usuário marcou como importante desde o início: **plugável**.
Modelagem:

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

## 5. UI / navegação (Tesouros)

- **Sidebar:** `Oficina` no grupo **Admin**. Grupo **"Artefatos"** (nav
  principal, expansível) com sub-item **"Tesouros"** (`/artefatos/tesouros`).
- **Oficina (`/sprites`):** `OficinaTabs` só corta sprites (`Spritesheets +
  Sprites`); categoria de sprite é um segmentado fixo por papel.
- **Tesouros (`/artefatos/tesouros`):** listagem (nome + thumb do icon/transform/
  card) e o **`TreasuresClient`** (form + tela de posicionamento — nome real do
  componente; a reformulação de 2026-07-19 documentada no `HANDOFF.md` deu a ele
  grade paginada + busca + Frame próprio):
  - Escolher `icon` entre os sprites `treasure-icon`; `transform` entre os
    `treasure-transform`; `card` entre os `treasure-card`.
  - Tela de posicionamento com **2 slots** (icon: livre; transform: correto) —
    reusa `avatar-geometry.ts` + preview no estilo do `OrnamentBuilder`/
    `AvatarComposer`, mas só com essas duas camadas. Salvar cria/atualiza os dois
    ornamentos e o Tesouro.
- **AvatarEditor (jogador):** a seção "Tesouros" mostra os Tesouros
  **desbloqueados** do jogador; cada um oferece ligar/desligar o `icon`
  e/ou a `transformation`. Tesouros bloqueados aparecem apagados.
- **GameWizard (passo 3):** `TreasurePicker` (grade de ícones + chips de
  pendentes + campo de tag livre, multi-seleção 0+ por jogador).

## 6. Divisão em fases (Tesouros) — todas concluídas

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
- `OrnamentBuilder.tsx` fica no repo (será referência do `TreasuresClient`), só
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
- `app/artefatos/tesouros/page.tsx` + `components/TreasuresClient.tsx`
  (form + listagem + posicionamento, tudo num componente cliente só). CSS
  `.treasure-*` no `globals.css`.
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

## 7. Riscos & armadilhas gerais (valem pra qualquer Artefato novo)

- **Dado real do usuário** entre sessões — nunca `DELETE` em massa; ler antes,
  filtrar por id/prefixo `__T__` no que for teste (armadilha do HANDOFF).
- **Cascata manual** obrigatória (FKs não forçadas no libSQL) em todo delete que
  toca uma tabela de Artefato ou sua relação com jogador/partida.
- **`route.ts` só exporta handlers HTTP** — validação em `lib/validation.ts` (armadilha #4).
- **PATCH não-parcial** — se o CRUD de um Artefato tiver PATCH, mandar o payload
  inteiro (mesma pegadinha do `/api/players/[id]`, armadilha #6).
- **`crossOrigin="anonymous"`** em qualquer `Image` que alimente canvas/toDataURL
  (sprites vêm do Blob — armadilha do cortador).
- **Testar imagem só em `npm run dev`**, nunca `npm run start` (404 em `public/`).
- **`next.config.ts` é o único config** — não recriar um `.mjs` (armadilha da Oficina).
- **Ao extrair sprite de um site externo (isaacguru.com, mods etc.):** ler a
  posição real do recorte no DOM/CSS, nunca calcular fórmula a partir de uma
  amostra pequena — e nunca fazer a IA transcrever base64 longo à mão entre
  ferramentas (buscar HTML/imagem direto via `fetch` no Node e extrair por
  regex/parsing é o método confiável, ver `HANDOFF.md`).

## 8. Fora de escopo deste documento (viraram outros planos ou ficam em aberto)

- **Autoria de cabelo** num submenu próprio de Artefatos (ex.: "Cabelos") — o
  `OrnamentBuilder` fica reservado pra isso, ainda não priorizado.
- **Generalizar o desbloqueio de cosmético pra outros Artefatos** (Personagem
  vencendo, etc.) → `docs/PLANO-COSMETICOS-AVATAR.md`.
- **Decoração desbloqueável de um "Quarto do Jogador"** usando sprite de
  Monstro/ícone de Tesouro/tema de Frame → `docs/PLANO-QUARTO-JOGADOR.md`.
- **Torneios como entidade** (formato ainda não definido) →
  `docs/PLANO-TORNEIOS.md`.
- **Reposicionamento do ícone por jogador** (hoje a posição é autorada uma vez no
  Tesouro; se o usuário quiser que cada jogador reposicione o próprio ícone,
  vira uma extensão do modelo — decidir se/quando).

## 9. Revisão pós-Fase-5 (2026-07-18) — campo livre voltou ao wizard

A Fase 4 tinha decidido "só Tesouros cadastrados" no wizard, sem texto livre.
Na prática isso trava o registro de partidas atrás do cadastro manual de arte
(cortar ícone+transformação item por item é lento) — o usuário pediu de volta
um campo livre, com uma regra pra evitar duplicidade:

- **Nome digitado bate (case-insensitive) com um Tesouro já existente** (com
  ou sem ícone) → linka nele, não cria nada novo.
- **Não bate com nada** → cria um Tesouro **pendente**: `icon_ornament_id`,
  `transform_ornament_id` e `card_sprite_id` todos `NULL`, `unlock_mode`
  default `'treasure_item'`. Aparece na listagem de `/artefatos/tesouros`
  com "—" nos três thumbnails, pronto pra ser editado (`updateTreasure` já
  suporta ir de sprite `null` → sprite real, testado desde a Fase 1) quando
  alguém tiver tempo de cortar a arte.
- **`game_player_treasures` continua sendo a única fonte de verdade de posse
  de item.** Não voltamos a escrever em `items`/`game_player_items` — aquele
  par de tabelas permanece congelado, só histórico read-only das partidas
  anteriores à Fase 4. Ou seja: isto não é "trazer o texto livre de volta",
  é um segundo caminho de escrita pro **mesmo** destino (`treasures` +
  `game_player_treasures`) que os ícones já escrevem.
- **Consequência aceita conscientemente:** se o mesmo item for digitado com
  grafias diferentes em partidas diferentes (typo, acento, espaço), vira dois
  Tesouros pendentes distintos — vai exigir limpeza manual depois (renomear/
  mesclar). Decisão explícita do usuário: "se errarmos o nome e ficar algo
  duplicado é consequência nossa". `TreasurePicker` mitiga isso mostrando os
  Tesouros pendentes existentes como chips clicáveis (não só os com ícone),
  então reaproveitar um nome já digitado antes é um clique, não precisa
  redigitar exato.

**Peças que mudaram:** `lib/treasures.ts::resolveTreasureId` (equivalente ao
antigo `resolveItemId`, mas cria Tesouro pendente em vez de item de texto,
roda dentro da mesma transação de `createGame`); `GamePlayerInput.treasure_names:
string[]` ao lado de `treasure_ids: number[]`; `components/TreasurePicker.tsx`
virou híbrido (grade de ícones + chips de pendentes + campo de tag livre,
com auto-match client-side antes de mandar pro servidor). **Nada** disso
reviveu `lib/items.ts`/`ItemTagInput`/`/api/items` — continuam deletados.

## 10. Revisão 2026-07-19/20 — import em massa de Tesouros (fora do fluxo pendente do §9)

As Fases 0–5 (e a revisão do §9) cobrem o Tesouro **nascendo** um de cada vez —
manual pelo form, ou pendente pelo campo livre do wizard. Em 2026-07-19/20 rodou
um caminho **paralelo e em lote**, fora desse fluxo, que este documento não
tinha registrado ainda (histórico completo, sessão a sessão, está no
`HANDOFF.md` — não duplicado aqui):

- **158 Tesouros importados de uma vez** do card-search oficial do
  `foursouls.com` (scripts descartáveis, um por rodada), casando por nome
  (`COLLATE NOCASE`) com o que já existia — mesmo "shape" de Tesouro pendente
  que `resolveTreasureId` já criava, só que em massa e só com `card_sprite_id`
  preenchido (sem ícone/transformação).
- **Ícones preenchidos depois, também em lote**, recortando de spritesheets
  de sites de referência do Rebirth (`isaacguru.com` + mods) — sempre lendo a
  posição real do recorte no DOM/CSS (nunca calculando fórmula por id, ver
  armadilha correspondente no `HANDOFF.md`), sempre pulando quem já tinha
  ícone/carta pra poder rodar de novo com segurança (idempotente).
- **Sincronizado pra prod** por scripts próprios em `scripts/sync-*.mjs`
  (ficam no repo, são idempotentes — casam por nome e pulam o que a prod já
  tem), porque prod e local **divergem** e têm dado real independente nos
  dois lados (ver aviso no topo do `HANDOFF.md`).
- **Consequência que motivou o §11 abaixo:** o card-search do `foursouls.com`
  não separa Tesouro de Maldição de forma confiável — algumas das linhas
  importadas nesse lote **não são Tesouros de verdade**, são Maldições que
  vieram junto. Isso só foi percebido depois, ao investigar por que alguns
  itens não tinham ícone em nenhuma fonte do Rebirth (são maldições, não
  itens colecionáveis).

## 11. Maldições — novo artefato, separado de Tesouros (planejado em 2026-07-20, não implementado)

**Motivação:** ao tentar completar os ícones dos 158 Tesouros importados
(§10), um punhado deles não tem correspondente em nenhuma fonte de item do
Rebirth. Investigando, dois motivos distintos (não um só):

1. **Alguns são Tesouros de verdade, só que renomeados** entre o board game e
   o jogo eletrônico — precisam só do nome certo pra virar um match normal
   (fluxo já existente, nada novo de schema/tela). Ver lista em aberto no
   `HANDOFF.md`, seção "9 ícones a mais" — o usuário vai trazer os nomes
   corretos numa sessão futura.
2. **Outros não são Tesouros — são Maldições**, uma mecânica **diferente** do
   *Four Souls*, que o scraping do §10 trouxe por engano de escopo (o
   card-search do site não filtra os dois tipos de forma limpa). **Decisão do
   usuário: Maldições não viram um caso especial dentro de `treasures`** (nada
   de reaproveitar `unlock_mode`, campo extra, ou flag `is_curse`) — ganham
   **artefato próprio, tela e tabela separadas**, no mesmo espírito de
   "Tesouro é uma entidade" do §1.

### Arquitetura proposta (espelha Tesouro onde faz sentido, mas mais simples)

Diferença chave em relação a Tesouro: uma Maldição **não tem cosmético de
avatar** (não existe "ícone posicionado no personagem" nem "transformação" —
isso é conceito de Tesouro). Uma Maldição é, na prática, só **nome + carta
ilustrativa** — mais perto de um catálogo de referência do que de um sistema
de desbloqueio. Proposta de schema, seguindo o padrão de `treasures`
(`CREATE TABLE IF NOT EXISTS` no `initSchema`, sem migração idempotente):

```sql
CREATE TABLE IF NOT EXISTS curses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL COLLATE NOCASE UNIQUE,  -- idêntico ao jogo
  card_sprite_id INTEGER REFERENCES sprites(id),     -- carta ilustrativa (sprite categoria curse-card)
  created_at  TEXT NOT NULL
);
```

- **Categoria de sprite nova:** `curse-card` (mesmo papel de `treasure-card`,
  mesma Oficina de recorte — só mais um item no segmentado fixo de
  categorias do `SpritesClient`).
- **Sem `game_player_curses` nesta primeira versão** — não há hoje um
  conceito de "jogador sofreu esta maldição numa partida" pedido pelo
  usuário. Se isso for necessário depois (ex.: estatística de "mais
  amaldiçoado"), é uma extensão natural (mesmo molde do §3: tabela
  `game_player_curses`, PK composta, cascata manual), mas **não está no
  escopo desta primeira versão** — perguntar antes de implementar.
- **Sem desbloqueio.** Maldição não é um cosmético que se aplica ao avatar,
  então `lib/unlocks.ts` não entra nessa história.
- **UI:** novo sub-item em **"Artefatos"** ao lado de "Tesouros" — ex.
  **"Maldições"** (`/artefatos/maldicoes`), CRUD simples (nome + carta),
  provavelmente reaproveitando boa parte de `TreasuresClient.tsx` (grade
  paginada + busca + form atrás de botão) só que sem a tela de posicionamento
  de ornamentos (não existe ícone/transform pra posicionar).

### Status: catálogo implementado (2026-07-21)

Schema + API + tela existem agora, exatamente como proposto acima: tabela
`curses` (`lib/db.ts`), tipos `Curse`/`CurseFull`/`CurseInput` (`lib/types.ts`),
data layer `lib/curses.ts` (list/get/create/update/delete — sem cascata manual,
não há tabela filha ainda), `parseCurseInput` (`lib/validation.ts`),
`app/api/curses/route.ts` + `[id]/route.ts`, tela `/artefatos/maldicoes`
(`components/CursesClient.tsx` — mesmo card visual de Tesouro via as classes
`.treasure-grid`/`.treasure-card`/`.treasure-card-art` já existentes, só carta
+ nome, sem slots de ícone/transformação nem seletor de desbloqueio) + item
"Maldições" na Sidebar (`ARTIFACTS_NAV`, ícone `IconSkull` novo). Categoria de
sprite nova `curse-card` adicionada ao segmentado da Oficina (renomeado de
`TREASURE_CATEGORIES` pra `SPRITE_CATEGORIES` em `SpritesClient.tsx`, já que
deixou de ser exclusivo de Tesouro) — a classe `.card-art` (não-pixelada) do
armadilha #9 do HANDOFF também foi estendida pra essa categoria.

### Migração dos dados já importados por engano

O processo (identificar → criar em `curses` reaproveitando o
`card_sprite_id` → só depois remover de `treasures` → repetir na prod lendo
antes de escrever) está descrito no `HANDOFF.md`, seção "Migração de 4
Maldições... — local e prod (2026-07-21)". Dos 12 candidatos (§10), o
usuário já confirmou **4 como Maldição de verdade** — migrados em local e
prod: **Baby Haunt, Cursed Soul, Daddy Haunt, Fetal Haunt**.

**Restam 8 sem triagem** (continuam em `treasures` sem ícone, nos dois
bancos): Decoy, Portable Slot Machine, Shadow, Steamy Sale!, The Chest, The
Map, The Shovel, Two Of Clubs. Podem ser Maldição ou Tesouro só renomeado
(§11 acima) — repetir o mesmo processo quando o usuário trouxer o
veredito.

### Import das 15 Maldições oficiais + campo `locked` (2026-07-21)

Além da migração acima (Maldições que vieram misturadas nos Tesouros), o
usuário trouxe a fonte **oficial e completa** de Maldição do jogo: o
card-search do `foursouls.com` filtrado por `card_type=monster` devolve as
15 cartas reais de Curse (o site as categoriza como um subtipo de
"monster" — condiz com o board game, onde Maldição fica dentro do baralho
de Monstro). Importadas todas as 15 (nome + carta oficial, mesmo padrão de
sprite `curse-card` da Fase A de Tesouros), local e prod.

**Campo novo `curses.locked`** (0/1): 9 das 15 são dos produtos que o grupo
joga (Base Game V2 + Requiem, mesmo critério do import de Tesouros) e
ficam desbloqueadas; as outras 6 (de expansões que o grupo não joga hoje)
foram cadastradas mesmo assim, mas com `locked=1` — aparecem esmaecidas/
grayscale no catálogo (`.treasure-card.locked` no `globals.css`), decisão
explícita do usuário ("importe todas, mas com layer de bloqueado") em vez
de simplesmente excluir as 6 do escopo como foi feito nos Tesouros.
Detalhe completo (incluindo a armadilha de script solto que não migra
schema sozinho) no `HANDOFF.md`, seção "Import de 15 Maldições oficiais +
campo `locked`".

**Total de Maldições agora: 19** (4 migradas de Tesouro + 15 oficiais, 6
delas bloqueadas) — nos dois bancos.

### Perguntas em aberto (confirmar com o usuário antes de implementar)

- Maldição tem **ícone** próprio (tipo o que aparece na carta, recortado à
  parte pra uso fora da carta inteira) ou só a carta ilustrativa já basta?
- Existe algum caso de uso de **aplicar uma Maldição num jogador/partida**
  (não só um catálogo de referência), ou é puramente informativo por agora?
- O menu deve ficar dentro de **"Artefatos"** (como Tesouros) ou merece um
  grupo de nav próprio?

## 12. Monstros — novo artefato (planejado em 2026-07-20, não implementado)

**Motivação:** exemplo dado pelo usuário — *"Jogador Mané matou monstro X"*.
Hoje esse dado não existe no app de nenhuma forma (nem texto livre). É um
Artefato novo no mesmo molde de Tesouro: catálogo (nome + sprite) + relação
com **jogador dentro de uma partida** (0+ monstros mortos por jogador).

### Arquitetura proposta

```sql
CREATE TABLE IF NOT EXISTS monsters (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL COLLATE NOCASE UNIQUE,
  sprite_id   INTEGER REFERENCES sprites(id), -- sprite categoria monster-icon
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_player_monsters (
  game_player_id INTEGER NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
  monster_id     INTEGER NOT NULL REFERENCES monsters(id),
  PRIMARY KEY (game_player_id, monster_id)
);
```

- **Mesmo molde de `game_player_treasures`** (§3): cascata manual em
  `deleteGame`/`deleteMonster`, sem migração idempotente (tabela nova).
- **Sem cosmético de avatar** — Monstro não posiciona nada no personagem.
  (O sprite dele pode virar decoração do **Quarto do Jogador** — ver
  `docs/PLANO-QUARTO-JOGADOR.md` — mas isso é consumo do catálogo, não algo
  que este Artefato precisa saber fazer.)
- **UI:** novo sub-item **"Monstros"** em Artefatos (`/artefatos/monstros`),
  CRUD simples (nome + sprite, sem posicionamento). No `GameWizard`, um
  seletor novo por jogador (`MonsterPicker`?) — mesmo padrão híbrido do
  `TreasurePicker` (ícones cadastrados + pendente por nome livre), pra não
  travar registro de partida atrás do cadastro manual de sprite de cada
  monstro do jogo.

### Perguntas em aberto (confirmar com o usuário antes de implementar)

- **Repetição:** um jogador pode matar o **mesmo** monstro mais de uma vez
  na mesma partida (ex.: "Boom Fly" reaparece)? Se sim, `PRIMARY KEY
  (game_player_id, monster_id)` não serve — precisaria virar uma tabela com
  `id` próprio + contagem, não um par único.
- **Chefões:** monstros-chefe merecem uma categoria/flag separada
  (`is_boss`?) pra estatísticas futuras ("chefe mais difícil" etc.), ou tudo
  é só "monstro" sem distinção por ora?
- **Volume:** o jogo tem muitos monstros — vale a pena um cadastro inicial
  em lote (mesmo padrão do import de Tesouros, §10) a partir de alguma fonte
  de referência, ou cadastro manual mesmo, um de cada vez, conforme aparecem
  em partidas reais?

## 13. Salas — novo artefato (planejado em 2026-07-20, não implementado)

**Motivação:** exemplo dado pelo usuário — *"A partida Z teve tais salas em
campo no seu decorrer"*. **Diferença importante em relação a todos os
Artefatos acima:** Sala é uma característica da **partida inteira**, não de
um jogador dentro dela — é o primeiro Artefato cuja relação de uso liga
direto em `games`, não em `game_players`.

### Arquitetura proposta

```sql
CREATE TABLE IF NOT EXISTS rooms (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL COLLATE NOCASE UNIQUE,
  sprite_id   INTEGER REFERENCES sprites(id), -- ilustração/ícone da sala
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_rooms (
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  PRIMARY KEY (game_id, room_id)
);
```

- **Cascata manual** em `deleteGame` (adicionar `game_rooms`, mesmo padrão
  dos outros Artefatos).
- **Possível ligação com os Frames do design system** (28 variantes, 9 temas
  de sala, hoje usados como container visual das páginas via
  `public/design-system/frames.md`) — as salas do jogo eletrônico já
  inspiraram esses frames, então pode fazer sentido reaproveitar a mesma
  ilustração como `sprite_id` da Sala. Isso é uma decisão de **apresentação**
  (qual imagem usar), não muda o schema acima — fica pra quando a tela
  existir.
- **UI:** `GameWizard` ganha um campo novo de multi-seleção — provavelmente
  no passo 1 ("Setup"), já que não depende de jogador. Sub-item **"Salas"**
  em Artefatos (`/artefatos/salas`) pro CRUD do catálogo.

### Perguntas em aberto (confirmar com o usuário antes de implementar)

- **Volume por partida:** o tabuleiro completo tem muitas salas — registrar
  **todas** as que apareceram numa partida real é prático de fazer no
  formulário (multi-seleção grande) ou o usuário só quer marcar as
  **notáveis** (ex.: salas de chefe, salas especiais)? Isso muda bastante o
  desenho da UI.
- **Ordem/sequência:** a ordem em que as salas apareceram durante a partida
  importa pra alguma estatística futura, ou é só um conjunto sem ordem
  (o que a PK composta acima já resolve)?
- **Fonte do cadastro inicial:** cadastro manual conforme as partidas
  acontecem, ou import em lote de alguma fonte de referência do jogo (mesmo
  padrão do §10)?

## 14. Relação com os planos irmãos

- **`docs/PLANO-COSMETICOS-AVATAR.md`** generaliza o desbloqueio de cosmético
  (§4) pra além de Tesouro — hoje só Tesouro concede cosmético de avatar;
  esse plano propõe estender pra Personagem (vencer com ele desbloqueia o
  skin/cosmético dele), reaproveitando o design plugável de `lib/unlocks.ts`.
- **`docs/PLANO-QUARTO-JOGADOR.md`** consome o catálogo de Monstros (§12) e
  os ícones de Tesouro como decoração desbloqueável de uma sala visual por
  jogador — depende de Monstros existir e da generalização do desbloqueio
  (ou de um sistema de desbloqueio próprio pra decoração, a definir nesse
  plano).
- **`docs/PLANO-TORNEIOS.md`** é independente deste documento (Torneios não
  precisa de nenhum Artefato pra existir), mas o Quarto do Jogador cita
  troféus de torneio como decoração futura — dependência de mão única
  (Quarto → Torneios), não o inverso.

## 15. Status geral

- [x] **Personagens** — catálogo pré-existente (`characters`), já usado no
  registro estruturado de partida antes mesmo deste plano existir.
- [x] **Tesouros** — Fases 0–5 + revisões (§3–§10) — implementado, local e prod.
- [x] **Maldições** — catálogo implementado (§11, schema/API/tela, campo
  `locked`); 19 cadastradas local+prod (4 migradas de Tesouro + 15 oficiais,
  6 delas `locked`); 8 Tesouros ainda pendentes de triagem (§10).
- [ ] **Monstros** — planejado (§12), não implementado.
- [ ] **Salas** — planejado (§13), não implementado.
