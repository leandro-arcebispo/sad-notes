# HANDOFF — IFSN / Sad Notes

> Para quem retomar este projeto numa nova janela de contexto. Leia isto antes
> de tocar em qualquer coisa — evita repetir bugs já resolvidos e descobertas
> já feitas.

## O que é o projeto

**Isaaquinho's Friends Sad Notes (IFSN)** — app de registro de partidas,
ranking e (no futuro) torneios de *The Binding of Isaac: Four Souls + Requiem*,
para um grupo de ~12 amigos. Estética pixel-art dark/dungeon/sad.

- **Raiz:** `C:\Workspace\sad-notes`
- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · **libSQL/Turso**
  (`@libsql/client`) · **Vercel Blob** (`@vercel/blob`). ⚠️ **Migrado do
  better-sqlite3 + sharp** — esses dois foram REMOVIDOS (ver sessão de migração
  pro Vercel abaixo). Não reintroduza.
- **Porta:** 6007 (`npm run dev`, registrado em `C:\Workspace\.claude\launch.json` como `sad-notes`)
- **Banco:** Turso em produção (`TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`); em dev,
  fallback pra arquivo local `data/sad-notes.db` (mesmo formato SQLite) — não
  versionado. Toda a camada de dados é **assíncrona** (`await`).
- **Git:** identidade local ao repo ("Leandro" / leandro.arcebispo@proton.me), 17 commits até agora

## ⚠️ Não confundir com as pastas irmãs

No mesmo `C:\Workspace`, existem 3 outras pastas relacionadas ao mesmo jogo
que **NÃO são este projeto**:

- `four-souls-poc` — a POC HTML estática original (só histórico/ideia).
- `four-souls-mockups` — o design system de onde copiamos os frames/fonte/ícones
  (`public/design-system` aqui é uma cópia dessa pasta).
- `four-souls-tracker` — um app Next.js anterior (porta 6006) que o usuário
  **decidiu explicitamente ignorar** ao começar este projeto do zero. Pode ter
  código parecido, mas não é reaproveitado aqui.

Só o `sad-notes` é o projeto ativo.

## Estado atual (2026-07-12)

Todas as **6 fases centrais do roadmap estão prontas** (ver `docs/ROADMAP.md`
para o detalhamento feature a feature):

| Fase | O quê | Commit |
|---|---|---|
| 0 | Fundação (scaffold, design system, shell, docs) | `252cb99` |
| 1 | Jogadores & Personagens (CRUD, seed roster, avatar provisório) | `85137a3` |
| 2 | Núcleo de Partidas (wizard 3 passos, listagem, detalhe) | `58d216e` |
| 3 | Ranking derivado das partidas | `f753fd9` |
| 4 | Catálogo de Sprites (importar sheet, recortar, biblioteca) | `6b69c90` |
| 5 | Ornamentos (posicionar sprite sobre o Isaac base) | `f036bf9` + 2 fixes |
| 6 | Avatar completo (base+cabelo+diversos, cache PNG via sharp) | `f9c2ccf` + 3 fixes |

Depois da Fase 6 vieram ajustes visuais pontuais (avatar sem moldura, mais
zoom, fonte nova "Upheaval", ícones pixel-art do design system distribuídos
nos cabeçalhos de tabela — `components/StatIcon.tsx`, usado em Ranking,
Partidas e Detalhe de Partida). **Falta:** Fase 7 (Polish visual) e o Backlog
(torneios completos, autenticação, deploy) — nada bloqueante, é refinamento.

Sessão 2026-07-13 (revisão página a página, começando pelo Ranking):
- Novo campo **`treasures`** em `game_players` (coluna adicionada via migração
  idempotente em `lib/db.ts` → `migrateSchema()`, checa `PRAGMA table_info`
  antes de rodar `ALTER TABLE` — necessário porque o banco real já existia
  com dados do usuário). Plumbing completo: `lib/types.ts`
  (`GamePlayerRow`/`GamePlayerInput`), `lib/validation.ts`, `lib/games.ts`
  (insert), `lib/ranking.ts` (soma agregada), `components/GameWizard.tsx`
  (novo `NumBox "Tesouros"` no step 3, entre Loot e Mortes).
- Ranking (`app/page.tsx`): coluna "Mortes" **removida** e substituída por
  "Tesouros" — decisão do usuário: mortes não é penalidade (build de "morrer
  muito mas vencer" é válida), só um dado a mais, não cabe como métrica de
  destaque no ranking agregado. **Mortes continua sendo registrada** no
  wizard e por partida — só sumiu do resumo do Ranking.
- Ícones do Ranking aumentados para 25px (os das outras tabelas continuam
  16px, é só o `size` do `StatIcon`, não mudou o default do componente).
- Ícone `icon-tesouros-new.png` já existia em `public/design-system/img/`
  (copiado junto com o design system inteiro), só faltava ser referenciado.
- Ícone do item "Ranking" da sidebar trocado do SVG genérico (`IconTrophy`,
  removido) para o troféu pixel-art da POC (`four-souls-poc/index.html`,
  primeiro `<img>` em base64 do nav). Extraído e salvo como
  `public/design-system/img/icon-nav-ranking.png`. Se precisar extrair mais
  ícones da POC no futuro, eles estão embutidos como `data:image/png;base64`
  direto no HTML (não em arquivos separados) — procurar por
  `src="data:image/png;base64,` em `four-souls-poc/index.html`.
- Trabalho está indo **página por página** a pedido do usuário — não mexer
  nas telas de Partidas/Jogadores/etc. além do que já foi pedido até ele
  confirmar a próxima página.

Sessão 2026-07-13 (continuação — tela de Jogadores, commit `20e2b49`):
- **Editar + Avatar unificados.** `/jogadores/[id]/avatar` (antes só
  ornamentos) agora tem uma seção "Identidade" no topo (Nome, História
  triste, Rosto base + botão Salvar) além de Cabelo/Diversos. O botão
  "Avatar" separado no card do jogador sumiu — só existe "Editar" (que leva
  pra essa tela) e "Arquivar". O form inline de editar na lista de Jogadores
  (`JogadoresClient`) só serve mais pra **criar** jogador novo; ficou sem o
  campo `id` no `FormState` e sempre faz POST.
- **Cor do Token removida da UI.** O campo `players.color` continua existindo
  no banco (usado em queries antigas, não removido pra evitar migração), mas
  não tem mais nenhum picker/swatch — todo jogador novo recebe um hex fixo
  (`DEFAULT_COLOR` em `JogadoresClient.tsx`) e o valor de um jogador existente
  é preservado ao salvar (ver armadilha técnica #6 abaixo).
- **Form de criar sem distração.** Enquanto `form` (criar jogador) está
  aberto em `JogadoresClient`, a grid de cards (ativos e arquivados) fica
  escondida — evita o usuário se perder entre o form e os cards durante o
  cadastro.
- **Nova feature: cor de cabelo.** `lib/hair-colors.ts` define uma paleta de
  10 "tinturas" (Natural + 9 cores) como trincas `{hue, saturation,
  brightness}`. O mesmo trio alimenta o filtro CSS do preview
  (`AvatarComposer`, client) **e** o `sharp().modulate()` na composição do
  PNG cacheado (`avatar-compose.ts`, servidor) — os dois ficam idênticos
  porque usam os mesmos números. Novo campo `players.hair_color` (migração
  idempotente em `migrateSchema()`, default `'natural'`). O seletor só
  aparece na seção "Cabelo" do editor quando o jogador já tem um cabelo
  aplicado (a cor não faz sentido sem cabelo). Cada swatch mostra o próprio
  sprite do cabelo do jogador já tingido (preview fiel, não é um chip de cor
  genérico).
- **Estado real:** Mané (id 9) tem cabelo aplicado mas `hair_color` foi
  deixado em `'natural'` de propósito (testei "Azul"/"Ruivo" durante o
  desenvolvimento e reverti pra não alterar o dado real dele).

Sessão 2026-07-13 (continuação — Backlog / Feedback no Admin):
- **Nova tela `/backlog`** (item no menu Admin da `Sidebar`, ícone `IconBug`).
  Form pros amigos reportarem bug/melhoria/feature pro backlog do app +
  lista gerenciável. Tabela nova `feedback` (criada no `initSchema` via
  `CREATE TABLE IF NOT EXISTS` — não precisou de migração idempotente por ser
  tabela zerada).
- **Campos:** `kind` (bug|melhoria|feature, segmentado), `description` (texto
  livre, obrigatório, até 2000 chars), `area` (funcionalidade afetada — select
  de `FEEDBACK_AREAS` em `lib/types.ts`; `na` = "N/A feature nova", forçado
  quando kind=feature), `priority` (baixa|media|alta), `status`
  (aberto|andamento|concluido|descartado, default aberto, editável na lista),
  `player_id` (quem reportou — só jogadores **ativos**, `null` = anônimo),
  `created_at` automático.
- **Plumbing:** `lib/feedback.ts` (data layer), `parseFeedbackInput` em
  `lib/validation.ts`, `app/api/feedback/route.ts` (GET/POST) +
  `app/api/feedback/[id]/route.ts` (PATCH status / DELETE),
  `components/BacklogClient.tsx`, CSS `.backlog-*`/`.bl-tag`/`.textarea` no fim
  do `globals.css`.
- **Robertinho (id 10) foi arquivado** pelo usuário entre sessões (`active=0`),
  por isso só o Mané aparece no select "quem está reportando" (correto: só
  ativos preenchem). Verificado end-to-end (criar/PATCH/DELETE via UI+API).
- ⚠️ O `confirm()` do botão "Remover" **trava o Browser pane** neste ambiente
  (igual screenshot/zoom, ver armadilha #5). Funciona normal num browser real;
  pra testar delete aqui, use a API direto (`curl -X DELETE`).

Sessão 2026-07-14 (MIGRAÇÃO GRANDE — pronta pro Vercel):
Decisão do usuário: hospedar no Vercel. Como a arquitetura antiga gravava em
disco local (SQLite + PNGs) e usava módulos nativos, foi re-arquitetada:
- **Banco: better-sqlite3 (sync) → libSQL/Turso (async).** Novo `lib/db.ts`
  exporta `getClient()` + helpers `all/get/run` (mapeiam Row→objeto plano, senão
  o JSON serializa como array!). Prod usa Turso (`TURSO_DATABASE_URL` +
  `TURSO_AUTH_TOKEN`); sem essas vars cai em `file:./data/sad-notes.db` (dá pra
  rodar/testar local sem conta). **Toda a camada de dados virou `async`** —
  todos os `lib/*.ts`, todas as rotas `app/api/**` e todos os server components
  (páginas) usam `await`. `getSetting`/`setSetting` também são async.
- **FKs não são forçadas** nas conexões HTTP do libSQL → as cascatas
  `ON DELETE CASCADE` viraram **cascata manual** via `db.batch([...], "write")`
  em `deleteGame`, `deleteSprite`, `deleteOrnament`. Transação interativa
  (`db.transaction("write")`) em `createGame`; `resolveItemId` agora recebe o
  `Transaction`.
- **Imagens: `public/*` (disco) → Vercel Blob.** Nova `lib/storage.ts`
  (`putImage`/`deleteImage`): com `BLOB_READ_WRITE_TOKEN` usa o Blob (devolve
  URL `https://`), senão grava em `public/` e devolve `/path` (fallback dev).
  `sprites.path` e `players.avatar_cache` agora guardam **URL OU /path** — use
  sempre `assetUrl()` (`lib/asset-url.ts`) pra renderizar (nunca mais `/${path}`).
- **Avatar: composição sharp no servidor → Canvas no cliente.** `avatar-compose.ts`
  foi DELETADO. Nova `lib/avatar-canvas.ts` (`composeAvatarDataUrl`) compõe no
  navegador reaproveitando a MESMA geometria (`avatar-geometry.ts`) e o MESMO
  filtro de tintura (`hairColorCssFilter`) do preview → preview == PNG final.
  O `AvatarEditor` chama `syncAvatar()` após cada mudança: compõe e faz
  `PUT /api/players/[id]/avatar/cache` (nova rota) que grava na storage e
  atualiza `avatar_cache`; sem cabelo nem diversos, faz `DELETE` (volta pro
  rosto base). As rotas de mutação de ornamento **não** regeneram mais nada no
  servidor.
- **`sharp` e `better-sqlite3` REMOVIDOS** do package.json. `next.config.ts`
  novo com `serverExternalPackages: ["@libsql/client","libsql"]`.
- **Testado local (modo file: + storage local):** build limpo, tsc zero erros,
  leitura de dados reais, criar+deletar partida (transação+cascata), e o fluxo
  de avatar ponta a ponta no browser (hair→200, cache→200, PNG gerado, avatar_cache
  gravado, zero erro no console). Jogador de teste (id 14) criado e apagado —
  Mané/Robertinho intactos.
- **Falta só provisionar (é do usuário):** criar banco Turso + Blob store no
  Vercel e setar as env vars (`.env.local.example` documenta todas). "Começar do
  zero" na nuvem foi a decisão — **não há script de migração de dados**; o banco
  Turso sobe vazio (schema criado no 1º acesso via `CREATE TABLE IF NOT EXISTS`).

Sessão 2026-07-13 (continuação — preparação pra hospedar / publicar):
- **Plano de hospedagem escolhido:** self-host na máquina do usuário (o app já
  roda nela) exposto via **Cloudflare Tunnel**. Motivo: a arquitetura grava em
  disco local (SQLite em `data/`, PNGs em `public/sprites` e `public/avatars`)
  e usa módulos nativos (`better-sqlite3`, `sharp`) — incompatível com
  serverless efêmero (Vercel/Netlify) sem re-arquitetar. Fly.io seria a opção
  "sempre-online" (volume persistente) mas pede cartão. Não re-arquitetar por
  enquanto: uso baixo, ~12 amigos.
- **Trava de acesso implementada:** `middleware.ts` na raiz — HTTP Basic Auth
  protegendo TODAS as páginas e rotas de API (menos `_next/static`,
  `_next/image`, `favicon.ico`). Só ativa quando `BASIC_AUTH_PASSWORD` está
  definido (ver `.env.local.example`); sem a var (dev) libera tudo. Usuário do
  prompt = `BASIC_AUTH_USER` (default `amigos`). Comparação constant-time,
  roda no edge runtime (usa `atob`, não node crypto). **Antes de abrir o túnel,
  defina `BASIC_AUTH_PASSWORD` em `.env.local`.** Se usar Cloudflare Access na
  frente, isto vira 2ª camada.
- **Build de produção validado:** `npm run build` passa limpo (Next 15.5.20,
  módulos nativos compilam sem precisar de `next.config`/`serverExternalPackages`;
  middleware registrado, 34 kB). Auth testada com `next start` numa porta
  separada: sem auth→401, senha errada→401, senha certa→200, idem nas rotas de
  API. **O app nunca tinha rodado em produção antes — só `dev`; agora roda.**
- **Runbook pra publicar:** `.env.local` com a senha → `npm run build` →
  `npm run start` (porta 6007, produção) → `cloudflared tunnel --url
  http://localhost:6007` (URL efêmera) ou túnel nomeado no domínio do usuário.
  Backup = copiar `data/*.db*` + `public/avatars` + `public/sprites`.
- **Ainda no backlog de publicação (não bloqueante):** rotação de backup
  automática e, se quiser sempre-online sem depender do PC ligado, migrar pra
  Fly.io (Dockerfile + volume) — nada disso foi feito ainda.

Sessão 2026-07-16 (Spritesheets — fonte, não cortadas):
- **Nova feature:** guardar as spritesheets originais no site pra todos verem +
  carregar direto no cortador. Tabela nova `sheets` (id, name, path, width,
  height, created_at) no `initSchema`. `lib/sheets.ts` (list/create/delete via
  storage+Blob), `app/api/sheets` (GET/POST) + `[id]` (DELETE),
  `components/SpritesheetsClient.tsx` (upload + galeria + remover), página
  `app/spritesheets/page.tsx` (`frame-scarred-womb`). Item **"Spritesheets" no
  menu principal** da Sidebar (todos veem — decisão do usuário), ícone
  `IconSheets`. CSS `.sheet-gallery`/`.sheet-card`/`.saved-sheet-pick`.
- **Integração no cortador (`SpritesClient`):** recebe `savedSheets` da página
  `/sprites` e mostra uma faixa "Salvas no site" — clicar carrega a sheet via
  `loadSavedSheet` (cria `Image` com `crossOrigin="anonymous"` — ESSENCIAL, senão
  o canvas fica tingido e o `toDataURL` do recorte quebra). Reusa o `makeCrop`
  existente. Verificado no browser (dev): carrega + recorta sem tingir.
- **Upload:** file → dataURL → POST (mesmo padrão dos sprites). Guarda de
  tamanho no cliente (~3 MB) por causa do limite de body do Vercel (~4,5 MB) —
  sheets maiores precisariam de client-direct-upload (`@vercel/blob/client`),
  não implementado (pixel-art cabe folgado).
- ⚠️ **ARMADILHA DE TESTE LOCAL:** `npm run start` (produção) retorna **404**
  pra arquivos gravados em `public/` em RUNTIME (só serve o snapshot do build).
  Isso afeta o fallback de storage local (sprites/avatars/sheets) — mas **só no
  `npm run start`**; no `npm run dev` o Next serve dinâmico, e em produção
  (Vercel) as imagens vão pro Blob (não pro `public/`), então não é bug real.
  **Pra testar features de imagem localmente, use `npm run dev`, não `start`.**

Sessão 2026-07-16 (continuação — Oficina: unifica Sprites/Spritesheets/Ornamentos):
- As 3 telas do pipeline de avatar viraram **uma página só** em `/sprites`
  (título "Oficina", menu principal, item "Oficina" com `IconSheets`). Toggle em
  fluxo `Spritesheets → Sprites → Ornamentos` (`components/OficinaTabs.tsx`,
  client com `useState` da aba) mostrando a etapa ativa; a ordem sugere o caminho
  (sheet cadastrada → cortada → vira ornamento) mas cada aba é independente.
- `app/sprites/page.tsx` agora busca tudo em paralelo (`Promise.all`:
  sheets/sprites/categories/ornaments) e passa pro `OficinaTabs`, que renderiza
  `SpritesheetsClient` / `SpritesClient` / `OrnamentBuilder` conforme a aba.
- **Removidas** as páginas `/spritesheets` e `/ornamentos` + seus itens de menu
  (o item Spritesheets saiu do menu principal; Sprites e Ornamentos saíram do
  Admin — Admin agora só tem Backlog). Ícones `IconGrid`/`IconStar` removidos da
  Sidebar. **Redirects** `/spritesheets`→`/sprites` e `/ornamentos`→`/sprites`
  no `next.config.ts` (307) pra links antigos não darem 404.
- CSS `.flow-tabs`/`.flow-tab`/`.flow-step`/`.flow-arrow` no globals.css.
- ⚠️ **ARMADILHA (custou tempo):** existiam DOIS configs — um `next.config.mjs`
  antigo (pré-migração, `serverExternalPackages: ["better-sqlite3"]`) e o meu
  `next.config.ts`. **O Next dá precedência ao `.mjs` e ignora o `.ts`
  silenciosamente** — por isso os redirects (e o `serverExternalPackages` do
  libsql) nunca aplicavam. Deletei o `.mjs`; agora só existe `next.config.ts`.
  Se algo em `next.config` "não pega", cheque se não há um segundo arquivo de
  config vencendo. (Produção funcionava mesmo com o config errado porque o Next
  externaliza esses pacotes por conta própria.)

Sessão 2026-07-16 (continuação — ARTEFATOS / TESOUROS: sistema de desbloqueio
de cosméticos, 5 fases, plano completo em `docs/PLANO-ARTEFATOS.md`):
- **O quê:** cosméticos deixaram de ficar sempre disponíveis. Nasceu a
  entidade **Tesouro** (`treasures`: `name` único = item do jogo, `icon` +
  `transformation` = cosméticos de avatar posicionados via ornamento, `card` =
  ilustrativa) e um **sistema de desbloqueio plugável** (`lib/unlocks.ts`):
  1º modo `treasure_item` = jogador só usa o cosmético se já terminou uma
  partida possuindo aquele item (registrado agora em `game_player_treasures`,
  gravado pelo `GameWizard`/`TreasurePicker` no lugar do texto livre antigo).
- **Modelo:** `ornaments` continua o primitivo "sprite posicionado"; um
  Tesouro **possui** até 2 ornamentos (`icon_ornament_id`/`transform_ornament_id`,
  `category='diverso'`) — reaproveita 100% do pipeline de composição do avatar
  (`avatar-geometry.ts`, `avatar-canvas.ts`, `player_ornaments`), zero mudança
  na matemática de render. Cabelo continua livre/base, fora do desbloqueio.
- **Oficina** (`/sprites`) mudou de lugar (nav principal → Admin) e perdeu a
  aba Ornamentos — agora só corta sprites, com categorias fixas
  (`treasure-icon`/`treasure-transform`/`treasure-card`) no lugar do datalist
  livre. `OrnamentBuilder.tsx` **fica no repo, intencionalmente não deletado**
  (reservado pra uma futura tela de autoria de cabelo — backlog, não confundir
  com "dead code" a apagar).
- **Menu novo "Artefatos" > "Tesouros"** (`/artefatos/tesouros`,
  `TreasuresClient.tsx`): CRUD completo com tela de posicionamento de 2 slots
  (ícone/transformação) reaproveitando a geometria/CSS do antigo
  `OrnamentBuilder`.
- **Avatar do jogador:** seção "Diversos" virou "Tesouros" — mostra os
  Tesouros com toggle por slot, bloqueados aparecem esmaecidos/desabilitados
  (exceto se já aplicados, pra permitir remover). Enforcement real no
  servidor (`addPlayerDiverso` em `lib/player-avatar.ts` rejeita aplicar
  cosmético de Tesouro bloqueado), não só na UI.
- **Wizard de partida:** o texto livre de itens (`ItemTagInput`) foi
  **retirado e deletado** — o passo 3 agora usa `TreasurePicker` (ícones,
  0 ou mais). `items`/`game_player_items` (schema antigo) **permanecem só
  como histórico read-only** das partidas anteriores a esta feature —
  `lib/items.ts` e `/api/items` foram deletados (sem consumidor).
  `FEEDBACK_AREAS` atualizado (`sprites`→`oficina`, `ornamentos` removido,
  `artefatos` novo).
- **Descoberta técnica:** FKs **são** forçadas em dev local mesmo achando que
  não (mordeu em `updateTreasure`, ver armadilha #7) e o `ON DELETE CASCADE`
  do schema **funciona sozinho em dev local** — mas isso NÃO é garantido em
  produção via Turso HTTP, então toda cascata continua sendo escrita
  manualmente mesmo assim (`deleteGame` agora limpa `game_player_treasures`
  explicitamente).
- **Verificado ponta a ponta** em todas as 5 fases (curl direto na API +
  Browser pane): criar Tesouro → cortar sprites → posicionar ícone/transform →
  jogar partida de teste registrando o item → desbloqueio concedido de
  verdade → aplicar cosmético no avatar → PNG regenerado → enforcement no
  servidor rejeitando jogador sem desbloqueio → tudo limpo ao final, dados
  reais intactos.
- ⚠️ **Achado de dado real (não fui eu):** o usuário criou um Tesouro
  **"Book of Belial"** e aplicou o ícone dele 3× duplicado no Robertinho
  usando a UI antiga (antes do toggle da Fase 3) — ver seção "Dados reais"
  abaixo, não limpar sem avisar.

Sessão 2026-07-18 (revisão — campo livre de volta no wizard, sem reviver
`items`): o cadastro completo de Tesouro (ícone+transformação+carta, corte
manual) é lento demais pra travar o registro de partidas atrás dele. Ver
`docs/PLANO-ARTEFATOS.md` §9 (a decisão #2 do §2 foi atualizada — release
note completa está lá, não duplicada aqui). Resumo mecânico: `TreasurePicker`
virou híbrido (grade de ícones + chips de Tesouros pendentes + campo de tag
livre); `lib/treasures.ts::resolveTreasureId` (novo) roda dentro da transação
de `createGame` e ou linka num Tesouro existente por nome (case-insensitive)
ou cria um **pendente** (sem ícone/transformação/carta — editável depois em
`/artefatos/tesouros` como qualquer outro). `game_player_treasures` continua
sendo a única fonte de verdade de posse de item — **não** voltou a escrever
em `items`/`game_player_items` (`lib/items.ts`/`ItemTagInput`/`/api/items`
continuam deletados da Fase 5). Verificado: nome com capitalização diferente
de um Tesouro existente ("book OF belial" → "Book of Belial") linkou sem
duplicar; nome novo virou pendente e apareceu certo na tela de detalhe
(ícone quando tem, chip de texto quando não tem).

### Dados reais do usuário no banco (não são teste — não apagar)

- Jogadores: **Mané** (id 9, tem cabelo customizado aplicado, `hair_color`
  = `'natural'`) e **Robertinho** (id 10, sem customização — usa o fallback
  de rosto base).
- Ao menos 1 partida registrada (o usuário testou o wizard pela própria UI).
- Sprite **"cuia-hair-1"** (categoria `hair-styles`) e ornamento
  **"hairs-cuia-01"** (categoria `cabelo`) — cadastrados pelo próprio usuário.
- Tesouro **"Book of Belial"** (id 3, criado pelo usuário entre sessões, ao
  testar a tela de Tesouros da Fase 2) com ícone e transformação cadastrados.
  Robertinho (id 10) tem o ícone desse Tesouro aplicado **3 vezes duplicado**
  no avatar (mesma posição/escala, visualmente idêntico a 1x — sobrou da UI
  antiga de "Diversos", que não tinha toggle nem prevenção de duplicata, antes
  da Fase 3). Inofensivo, mas não é intencional. **Não veio de mim** — descoberto
  na verificação da Fase 3. Não limpar sem avisar o usuário; o novo toggle na
  tela de Avatar (Fase 3) deixa fácil ele mesmo remover as cópias extras
  clicando no ícone do Tesouro (cada clique tira uma aplicação).

**O usuário usa o app entre as sessões de trabalho.** Isso já causou confusão
mais de uma vez (dados que "apareceram" no banco sem eu ter criado). **Nunca
faça `DELETE` em massa** (`players`, `games`, `sprites`, `ornaments`, etc.) sem
antes checar o que já existe e filtrar precisamente pelo que você mesmo criou
(por id ou por um prefixo de nome tipo `__TESTE__`/`__T__`).

## Decisões de arquitetura que já foram tomadas (não re-perguntar)

1. **Sprites:** PNG recortado (via Canvas no cliente) salvo em
   `public/sprites/<categoria>/` + catálogo no banco com nome/categoria/caminho
   e **coordenadas de origem** (sheet + x,y,w,h) para permitir re-recorte.
2. **Avatar:** receita em camadas (`player_ornaments`: base_face do jogador +
   no máx. 1 ornamento categoria `cabelo` + N ornamentos categoria `diverso`
   empilhados por `sort_order`) **+ cache de PNG achatado** gerado com `sharp`
   e servido de `public/avatars/`. O cache é regenerado a cada mutação e o
   arquivo antigo é apagado automaticamente.
3. **Empilhamento dos diversos:** "o último aparece por cima" é resolvido pela
   **ordem de seleção** na tela de customização (`sort_order` crescente = mais
   por cima), não é um campo do ornamento em si.
4. **Torneios:** não existem como entidade ainda. `games.tournament_id` é
   sempre `null` = "Global Board". Vem no Backlog.
5. **Roster de personagens:** semeado com o melhor palpite do assistente
   (roster clássico = base; Bethany/Jacob&Esau + 17 tainted = Requiem) — é
   **editável depois** numa tela de Ajustes que ainda não existe; não é dado
   sagrado do jogo real, só um seed inicial.
6. **Desbloqueio de cosméticos (Artefatos/Tesouros):** cabelo é livre/base
   (sem desbloqueio); todo cosmético novo do avatar nasce como um **Tesouro**
   (ícone + transformação) e só pode ser aplicado se desbloqueado. O sistema
   é **plugável por design** (`lib/unlocks.ts`) — hoje só existe o modo
   "terminar partida com o item", mas outros modos (vitórias acumuladas,
   concessão manual, conquistas) podem ser somados sem mexer no resto.
   Detalhe completo em `docs/PLANO-ARTEFATOS.md`.

## Armadilhas técnicas já descobertas (não repetir)

### 1. `sharp`: `.composite().resize()` encadeados numa pipeline só

**Não** confie que o sharp executa as operações na ordem em que aparecem no
código quando encadeadas direto (`sharp(x).composite(layers).resize(w,h)...`).
Isso já produziu avatares com as camadas de ornamento na posição/tamanho
errados — um bug bem sutil, só descoberto comparando bounds de pixel exatos.

**Regra:** sempre finalizar cada etapa da composição num buffer próprio via
`.toBuffer()` antes de começar uma nova operação numa instância `sharp()`
separada. Ver `lib/avatar-compose.ts` (tem o comentário no código) e reaproveite
esse padrão em qualquer composição de imagem futura.

### 2. `frames.css` precisa ser linkado como `<link>` estático

O design system (`public/design-system/frames.css`) tem `url("img/...")`
relativos. Ele é servido via `<link rel="stylesheet" href="/design-system/frames.css">`
no `app/layout.tsx` — **não** importado como módulo CSS do Next (isso quebra
os caminhos relativos das imagens dos frames).

### 3. Geometria do avatar/ornamento é compartilhada num só lugar

`lib/avatar-geometry.ts` tem `STAGE`, `FACE_BOX`, `ORN_REF`, `AVATAR_FRAME`,
`fitContain()`, `ornamentBox()` — usado tanto no cliente (`OrnamentBuilder`,
`AvatarComposer`) quanto no servidor (`avatar-compose.ts`). **Nunca duplique
essa matemática** — já causou um bug de distorção (sprite não-quadrado
esticado) quando as constantes viviam em dois lugares.

- `AVATAR_FRAME = 130` (em `lib/avatar-geometry.ts`) é o "zoom" do avatar
  final cacheado — ajustado 2x a pedido do usuário (160→130) até ficar perto
  de preencher o quadro todo. Se aparecer corte perceptível de ornamentos
  maiores no futuro, é esse único número que ajusta o equilíbrio.

### 4. `route.ts` do Next só pode exportar handlers HTTP

Funções de validação (`parsePlayerInput`, `parseGamePayload`) vivem em
`lib/validation.ts`, não dentro dos arquivos `app/api/**/route.ts` — exportar
qualquer coisa além de `GET`/`POST`/etc. de um `route.ts` quebra a checagem de
tipos das rotas tipadas do Next 15.

### 5. Ambiente: `computer{screenshot}` e `zoom` dão timeout

Neste ambiente (Browser pane), `computer{action:"screenshot"}` e
`computer{action:"zoom"}` **sempre** dão timeout de 30s. Verificação visual é
feita via `read_page` (árvore de acessibilidade) + `javascript_tool`
(`getComputedStyle`, `getBoundingClientRect`, `document.fonts`, `fetch` HEAD) +
análise de pixel direto no arquivo PNG gerado (com `sharp`, rodando um script
Node descartável a partir da raiz do projeto — `cd` explícito, senão
`better-sqlite3`/`sharp` não resolvem).

### 6. `PATCH /api/players/[id]` não é parcial de verdade

`parsePlayerInput` (em `lib/validation.ts`) sempre valida o payload **inteiro**
e preenche default pra qualquer campo ausente (`hair_color` ausente → volta
pra `'natural'`, `color` ausente → volta pro hex padrão, etc.) — não é um
PATCH parcial real, é um PUT disfarçado. **Já causou um bug**: o botão
"Salvar" da seção Identidade em `AvatarEditor.tsx` mandava só
`{name, nickname, color, base_face}` sem `hair_color`, e isso resetava
silenciosamente a cor do cabelo toda vez que o usuário editava o nome.

**Regra:** qualquer PATCH pra esse endpoint precisa mandar **todos** os
campos de `PlayerInput` (`name`, `nickname`, `color`, `base_face`,
`hair_color`), mesmo os que não mudaram — sempre a partir do estado local
mais atual (`recipe.hair_color`, `player.color`, etc.), nunca omitindo um
campo assumindo que o backend vai preservar o valor antigo. Se adicionar um
novo campo em `PlayerInput` no futuro, procure todo `fetch(`/api/players/`
em `components/` e atualize os payloads.

### 7. FKs são forçadas em dev local (arquivo SQLite), mesmo achando que não

O comentário espalhado pelo código ("FKs não são forçadas nas conexões HTTP do
libSQL", cascata sempre manual) é verdade pra **Turso em produção**, mas em
**dev local** (`file:./data/sad-notes.db`) as foreign keys **são** aplicadas de
verdade pelo motor SQLite. Isso mordeu na Fase 1 (`lib/treasures.ts`,
`updateTreasure`): ao limpar o slot `transform` de um Tesouro, o código
apagava o ornamento órfão **antes** de atualizar `treasures.transform_ornament_id`
pra `NULL` — a linha `treasures` ainda apontava pro ornamento no momento do
`DELETE`, e o SQLite local rejeitou com `SQLITE_CONSTRAINT: FOREIGN KEY
constraint failed`.

**Regra:** em qualquer fluxo de update/delete que troque ou libere uma FK
(não só criar linha nova), sempre **repontar/gravar a FK pai primeiro** (ou
como `NULL`) e só **depois** apagar a linha órfã que ela referenciava — nunca
o inverso. `deleteTreasure`/`deleteOrnament`/`deleteSprite`/`deleteGame` já
seguiam essa ordem por acidente (deletam sempre a linha "pai" antes das
filhas que ela referenciava indiretamente); o bug só apareceu num caminho de
**update** que ninguém tinha escrito antes.

### 8. Scripts de debug descartáveis

Vários bugs foram investigados com scripts `_debug.mjs`/`_clean.mjs` na raiz
do projeto, **sempre removidos depois** (`rm -f`). Se você ver algum desses
arquivos sobrando no repo, pode apagar sem dó — não são parte do projeto.

## Onde as coisas estão (mapa rápido)

```
app/
  page.tsx                      Ranking (frame-chest-torch)
  jogadores/page.tsx             Lista de jogadores (StatIcon do "+ New Born" via Frame actions)
  jogadores/[id]/avatar/page.tsx Editor unificado: Identidade (nome/história
                                  triste/rosto) + Cabelo + Tesouros (icon/transform)
  partidas/page.tsx               Lista de partidas
  partidas/nova/page.tsx          Wizard de cadastro (passo 3 usa TreasurePicker)
  partidas/[id]/page.tsx          Detalhe da partida (coluna "Tesouros": ícones + itens legados)
  sprites/page.tsx                 Oficina (Admin): abas Spritesheets/Sprites — SÓ corta sprites
  artefatos/tesouros/page.tsx      CRUD de Tesouros + posicionamento (TreasuresClient)
  spritesheets/ e ornamentos/       REMOVIDAS — redirect → /sprites (next.config.ts)
  backlog/page.tsx                 Backlog: form de bug/melhoria/feature + lista (Admin)
  api/**                           Rotas REST (players, games, characters,
                                    sprites, sheets, ornaments, treasures,
                                    feedback, players/[id]/avatar/*)
                                    — api/items FOI REMOVIDA (sem consumidor)
lib/
  db.ts               conexão libSQL (async) + helpers all/get/run + schema + settings
  types.ts            todos os tipos (Player, Game, Sprite, Ornament, Treasure,
                        UnlockMode, AvatarRecipe...)
  validation.ts        parsePlayerInput / parseGamePayload / parseTreasureInput
  players.ts, characters.ts, games.ts   data layer core
  feedback.ts         data layer do Backlog (list/create/updateStatus/delete)
  sprites.ts, ornaments.ts, treasures.ts, player-avatar.ts   data layer do
                        pipeline de avatar + Tesouros
  unlocks.ts           sistema de desbloqueio PLUGÁVEL (registro de modos) —
                        getUnlockedTreasureIds/isTreasureUnlockedForPlayer
  avatar-geometry.ts   geometria PURA compartilhada (cliente+servidor)
  avatar-canvas.ts     composição do avatar via Canvas (só cliente/navegador)
  storage.ts           putImage/deleteImage — Vercel Blob (prod) / public/ (dev)
  asset-url.ts         assetUrl() — resolve URL do Blob OU /path local
  hair-colors.ts       paleta de tintura de cabelo (hue/sat/brightness),
                        compartilhada entre CSS filter (cliente) e
                        sharp().modulate() (servidor)
  ranking.ts           agregações do ranking
  items.ts             REMOVIDO (Fase 5) — texto livre de itens aposentado;
                        `items`/`game_player_items` seguem no schema só como
                        histórico read-only (lidos direto em lib/games.ts)
components/
  Frame, Sidebar, ComingSoon           shell/layout
  PlayerAvatar                        avatar (cache PNG ou fallback de rosto)
  JogadoresClient, GameWizard, DeleteGameButton
  TreasurePicker                       seletor de ícones no wizard (0+ por jogador)
  BacklogClient                        form + lista do Backlog (Admin)
  SpritesClient                        catálogo de sprites (categorias fixas de Tesouro)
  TreasuresClient                       CRUD de Tesouros + posicionamento (icon/transform)
  OrnamentBuilder                       NÃO usado em nenhuma página — reservado
                                        pra futura tela de autoria de cabelo,
                                        não é dead code a apagar
  AvatarComposer, AvatarEditor          editor de avatar (seção Tesouros na Fase 3)
  RankFire                              chama animada do pódio
  ItemTagInput                          REMOVIDO (Fase 5)
docs/
  BRIEF.md            visão geral, stack, decisões-chave
  ROADMAP.md          todas as features + status + ordem de implementação
  STYLE-GUIDE.md       identidade visual (paleta, tipografia, componentes)
  PLANO-ARTEFATOS.md   plano completo da feature Artefatos/Tesouros (5 fases,
                        arquitetura, decisões) — leia antes de mexer nesse sistema
public/
  design-system/   frames (28), fonte IsaacGame, ícones, texturas (copiado dos mockups)
  fonts/            Upheaval (fonte nova do usuário, .ttf usado via @font-face)
  sprites/          PNGs recortados pelo catálogo (gerados, não versionados)
  avatars/          PNGs de avatar cacheados (gerados, não versionados)
```

## Estilo visual (resumo — ver `docs/STYLE-GUIDE.md` para o completo)

- Paleta e tipografia em `app/globals.css` (fonte única de verdade, é o style
  guide em código). `--font-display` = **Upheaval** (trocada recentemente,
  fallback IsaacGame) usada em títulos/nav/cabeçalhos; `--font-body` = Segoe UI.
- Sem `border-radius`, sombras duras (nunca `blur`), pixel art nítida
  (`image-rendering: pixelated`).
- Container de página = `<Frame variant="frame-*">` (28 variantes disponíveis,
  catálogo em `public/design-system/frames.md`).
- `PlayerAvatar` **não tem mais moldura** (sem borda/fundo/sombra) — só a
  imagem, a pedido do usuário. Tamanhos: ranking 48px, cards de jogador 68px,
  wizard 40-44px, detalhe de partida 40px, prévia de formulário 110px.

## Como continuar

1. Leia `docs/ROADMAP.md` pra ver o que falta exatamente (Fase 7 + Backlog).
2. Rode `npm run dev` (porta 6007) ou use o preview registrado como `sad-notes`.
3. Antes de mexer em dados via script, **sempre** rode uma consulta de leitura
   primeiro pra ver o que já existe de real no banco.
4. Sempre `npx tsc --noEmit` depois de mudanças maiores — o projeto está limpo
   (zero erros) e deve continuar assim.
5. Verificação de UI: uma vez que `screenshot`/`zoom` não funcionam aqui, use
   `read_page` + `javascript_tool` pra provar que a mudança funciona de verdade
   antes de reportar como pronta.
