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
- **Git:** identidade local ao repo ("Leandro" / leandro.arcebispo@proton.me), 34+ commits até agora.
  Repo público no GitHub, mas `master` protegida (PR obrigatório, 0 aprovações —
  ver decisão de arquitetura #7, "Fluxo de Git").

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

## ⚠️ A prod já existe, já está em uso, e diverge do banco local

Descoberto em 2026-07-19: ao contrário do que sessões anteriores registraram
("banco Turso sobe vazio", "falta provisionar"), **o Turso de produção já
existe, já tem credenciais, e já tem dado real** que não veio de nenhuma
sessão de trabalho documentada aqui — o usuário (ou o grupo) usa o app
publicado independentemente do ambiente local. Local e prod **divergiram nos
dois sentidos**: cada um tem trabalho real que o outro não tem. Ver a seção
"Dados reais" (mais abaixo) pra o inventário local *e* de prod.

**Regra pra qualquer trabalho futuro que toque o banco (scripts, migrações,
sync):** nunca assuma que a prod está vazia ou é um subconjunto do local (ou
vice-versa). Sempre faça uma leitura de reconhecimento na prod antes de
qualquer escrita — mesmo que uma sessão anterior tenha dito "a prod está
vazia", pode ter mudado. Prefira scripts que casam por chave natural (nome)
e pulam o que já existe, em vez de assumir uma tabela vazia.

Credenciais de prod: `.env.production.local` (não versionado, gitignored) com
`TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`/`BLOB_READ_WRITE_TOKEN` — o usuário
preencheu isso em 2026-07-19. Se `.env.production.local` não existir numa
sessão futura, não assuma que a prod nunca foi provisionada — pergunte, porque
agora sabemos que ela existe independente disso.

⚠️ **Esse arquivo já se chamou `.env.local`** até uma sessão posterior no
mesmo dia (2026-07-19, revisão da tela de Tesouros) — renomeado de propósito.
`next dev` carrega `.env.local` **em qualquer ambiente**, então enquanto o
arquivo tinha esse nome, todo `npm run dev` "local" estava na verdade batendo
no Turso remoto pela rede a cada query (medido: ~700ms–2.4s por query remota
vs ~1ms no arquivo local), deixando **todas** as páginas lentas — sintoma
reportado pelo usuário como "app lento depois de subir as imagens dos
Tesouros" (coincidência de sessão, não causa real). `.env.production.local` só
é carregado pelo Next quando `NODE_ENV=production` (`npm run build && npm run
start`), nunca em `npm run dev` — resolve sem tirar o arquivo do disco. Se
esse arquivo reaparecer com o nome `.env.local` numa sessão futura (ex.:
recriado do zero seguindo um exemplo desatualizado), **renomeie de novo**, não
apague.

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
  ⚠️ **Desatualizado** — em 2026-07-19 descobrimos que isso já foi provisionado
  e já está em uso real, com dado que nenhuma sessão daqui registrou. Ver o
  aviso "A prod já existe..." no topo do arquivo.

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

Sessão 2026-07-19 (Import de Tesouros — Fase A, popular a base sem cadastro
manual): objetivo era viabilizar o cadastro dos ~278 Tesouros do jogo sem
passar um a um pelo form. Investigação + decisão de escopo:
- **Fonte oficial:** `foursouls.com/card-search/?card_type=treasure` lista
  278 cartas em 6 páginas (`page/N/?card_type=treasure`), com nome (`alt=`) e
  URL real da carta (`data-src="https://foursouls.com/wp-content/uploads/..."`)
  — scrapeável com `curl` puro, sem precisar de JS/headless browser. O site
  mistura vários produtos (código de origem = prefixo do arquivo); filtrado a
  só **Base Game V2 (`b2`, 105) + Requiem (`r`, 53) = 158 Tesouros**, que é o
  que o grupo joga (o resto — `fsp2`, `soi`, `g2`, promos etc. — foi descartado).
- **Biblioteca local `public/sheets/items`** (238 PNGs do *Rebirth*, um por
  item, extraídos do Spriters Resource): avaliada como fonte de **ícone**
  automático e descartada por ora — só ~24% batem por nome exato com os 158
  Tesouros (muito nome de carta do Four Souls não existe como item avulso no
  Rebirth: "Belly Button", "Breakfast", "The Chest" etc.), e mesmo nos que
  batem cada PNG é uma sheet de animação heterogênea (grades diferentes por
  item), não um ícone único — recorte automático arriscaria pegar o frame
  errado. **Ícone e transformação continuam sendo cadastro visual manual**
  (tela `/artefatos/tesouros`, reaproveitando o cortador da Oficina),
  tesouro por tesouro — não foi automatizado.
- **O que FOI automatizado (Fase A, executada):** script descartável
  (`_import-treasures.mjs`, raiz do projeto, removido depois de rodar — padrão
  da armadilha #8) que baixou as 158 cartas oficiais e, pra cada uma, criou um
  `sprites` (categoria `treasure-card`) + um `treasures` com **nome + carta
  ilustrativa apenas** (`card_sprite_id`), deixando `icon_ornament_id`/
  `transform_ornament_id` `NULL` — o mesmo formato "pendente" que
  `resolveTreasureId` já criava pro campo livre do wizard. Casamento por nome
  usa a mesma `UNIQUE COLLATE NOCASE` da coluna `treasures.name`: nenhum
  Tesouro existente foi duplicado ou teve ícone/transformação sobrescrito
  (checagem: só atualiza `card_sprite_id` se ele já não tinha carta).
- **Resultado real no banco local:** 155 Tesouros novos criados + banco foi de
  1 → 159 linhas em `treasures`. **"Book of Belial" (id 3) ficou intacto**
  (não existe como carta de Treasure em `b2`/`r` no site, então não deu
  match — nenhum campo dele foi tocado). 158 sprites novos em
  `category='treasure-card'`, arquivos em `public/sprites/treasure-card/`.
  Um teste com 3 itens rodou antes do lote completo e gerou 3 sprites órfãos
  (baixados de novo no lote completo, mas pulados por já ter carta) — foram
  identificados por `card_sprite_id NOT IN (...)` e apagados (arquivo + linha)
  manualmente depois.
- **Verificado no browser:** `/artefatos/tesouros` lista as 159 linhas, editar
  um Tesouro importado (ex.: "Abel") mostra a carta carregada de verdade
  (308×420, `naturalWidth`/`naturalHeight` confirmados via JS, zero erro no
  console).
- ⚠️ Esse import rodou só no banco **local** primeiro — a sincronização com a
  prod aconteceu na sessão seguinte (Fase B, logo abaixo), com uma descoberta
  importante no meio do caminho.

Sessão 2026-07-19 (continuação — Fase B: ícone/transformação + sync pro
Turso de produção):
- **Ícone/transformação dos 158 Tesouros: decisão do usuário foi recorte
  manual**, sem mais automação. Investiguei antes de decidir: dos 158, só 34
  (21%) batem por nome exato com um arquivo em `public/sheets/items`; achei 2
  sheets bem melhores como matéria-prima (`Items (Repentance)(2).png`
  1312×896 e `Trinkets (Repentance)(1).png` 640×480, grids densos e
  uniformes tipo tela de coleção do jogo) mas não consegui confirmar uma
  lista de referência confiável da ordem dos itens nessa grade (fetch da
  wiki bloqueado) — fica como pista pra investigar de novo se algum dia
  valer a pena. **Transformação foi explicitamente deixada de fora** dessa
  fase (fica `NULL` pra todos, o schema já suporta). O recorte visual em si
  continua manual, tesouro por tesouro, via Oficina (`/sprites`) +
  `/artefatos/tesouros` — ferramentas que já existiam antes desta sessão.
- **Descoberta crítica ao tentar sincronizar pra prod:** o primeiro script
  escrito (`scripts/sync-catalog-to-prod.mjs`, assumia prod vazia nas 4
  tabelas de catálogo) **abortou sozinho** — a prod já tinha 11 sprites, 12
  sheets, 10 ornaments e 1 treasure (`"Lazaru's Rags"`, com ícone+
  transformação+carta já prontos, feito manualmente **direto em produção**),
  além de jogadores que não existem local (**Thalinha**, ativa) e 3
  jogadores `_TEST_*` de teste. Nada disso está documentado em nenhuma
  sessão anterior. Ver o novo aviso no topo do arquivo ("A prod já existe,
  já está em uso, e diverge do banco local") — mudou o entendimento de como
  esse projeto é operado: o usuário mexe na prod publicada
  independentemente das sessões de trabalho aqui.
- **Resolvido com escopo bem mais estreito**, confirmado com o usuário
  ("só adicionar os 158 novos, não tocar em nada que já existe em prod"):
  `scripts/sync-treasure-cards-to-prod.mjs` (substitui o
  `sync-catalog-to-prod.mjs`, que não deve ser usado sem revisar de novo —
  ficou no repo mas parte da premissa errada de prod vazia). O script novo:
  - Filtra os candidatos locais por **formato**, não por lista fixa:
    `card_sprite_id IS NOT NULL AND icon_ornament_id IS NULL AND
    transform_ornament_id IS NULL` — isola exatamente os 158 da Fase A
    (confirmado: dá 158, e o único que sobra fora do filtro é o "Book of
    Belial" local, que foi deixado de fora de propósito).
  - Por Tesouro: pula se já existir em prod por nome (`COLLATE NOCASE`,
    idempotente — dá pra rodar de novo sem duplicar), senão sobe a carta pro
    Blob e insere `sprites` + `treasures` na prod.
  - **Nunca toca** em `sheets`/`ornaments`/`players`/`games` — só soma
    `sprites` (categoria `treasure-card`) e `treasures`.
  - **Rodou de verdade** (`node --env-file=.env.local
    scripts/sync-treasure-cards-to-prod.mjs`): 158 criados, 0 pulados, 0
    falhas. Verificado depois: `sprites` 11→169 (+158), `treasures` 1→159
    (+158), `sheets`/`ornaments`/`players`/`games` sem nenhuma mudança —
    `"Lazaru's Rags"` continua exatamente igual (id 1, mesmos
    ornament/sprite ids).
  - Nota técnica (herdada do script anterior): não deu pra reaproveitar
    `initSchema`/`all`/`run` de `lib/db.ts` direto num script solto — Node
    não resolve imports TS sem extensão fora do Next (`Cannot find module
    './seed-characters'`).
- **Pra próxima rodada de sync** (quando o usuário tiver cortado mais
  ícones/transformações localmente): o filtro por formato deixa de servir
  sozinho, porque a partir de agora tesouros locais vão ter ícone/transform
  preenchidos. Vai precisar de um critério novo (ex.: sincronizar por nome
  específico, ou comparar `updated_at` se o schema ganhar essa coluna, ou
  qualquer outra forma de saber "o que mudou desde o último sync") — não
  existe hoje uma forma automática de saber isso, então trate como um
  problema em aberto pra próxima vez que "subir a base pro PRD" for pedido
  de novo.

Sessão 2026-07-19 (continuação — reformula a tela de Tesouros + acha e corrige
a causa da lentidão geral, commits `99a5e9c`/`5d3820c`, já no `origin/master`):
- **Motivo:** depois da importação dos 158 Tesouros (Fase A/B), a lista antiga
  de `/artefatos/tesouros` (rows horizontais sem paginação, form sempre
  visível no topo) ficou pouco usável com quase 160 linhas.
- **`TreasuresClient.tsx` passou a renderizar seu próprio `<Frame>`** (mesmo
  padrão do `JogadoresClient`) em vez de receber o `Frame` de fora em
  `app/artefatos/tesouros/page.tsx` (que agora só faz o fetch e devolve o
  client component puro) — necessário pra o botão do header reagir a estado
  do cliente (form aberto/fechado). **Se outra tela algum dia precisar de um
  header com ação dependente de estado, é esse o padrão a seguir.**
- **Form de cadastro/edição** (mesmos campos/lógica de antes, não mexido por
  pedido explícito do usuário) agora fica atrás de um botão **"+ Cadastrar
  Tesouro"** no header — abrir esconde a grade, "Cancelar"/"Cancelar edição"
  fecha e volta pra grade. O botão **"Remover tesouro" saiu da linha da lista
  e foi pro form** (só aparece editando um Tesouro existente).
- **Grade paginada com busca**: tudo client-side (o dataset inteiro já vinha
  do server component via `listTreasures()`, ~160 linhas é pouco pra filtrar
  em memória) — `input` filtra por nome em tempo real, sem debounce; 24 por
  página; busca reseta pra página 1.
- **Card virou vertical** (`.treasure-grid`/`.treasure-card`, CSS novo, não
  mexeu em `.ornament-list`/`.ornament-row` que o `OrnamentBuilder` ainda usa):
  carta em cima (`.treasure-card-art`, `aspect-ratio: 308/420`), dois
  quadrados iguais embaixo (ícone | transformação, `flex:1` cada — a soma das
  larguras bate exatamente com a largura da carta, verificado por
  `getBoundingClientRect` no browser). Label de desbloqueio (`"Terminar
  partida com o item"`) **removido** dos cards a pedido do usuário (info só
  fica visível dentro do form).
- **Edição = clicar no card inteiro** (é um `<button>`), sem ícone/botão
  separado — decisão tomada via pergunta direta ao usuário (opções eram
  card clicável / ícone de lápis no canto / botão "Editar" no rodapé); ele
  escolheu card clicável porque "Editar" ficou sendo a única ação restante no
  card depois que "Remover" foi pro form.
- **Contagem total**: o título do `Frame` virou `Tesouros (${treasures.length})`
  (total real, não o filtrado) em vez de um `<h2>"Tesouros cadastrados (N)"`
  separado — removido a pedido do usuário.
- ⚠️ **Achado nessa sessão (não relacionado à tela de Tesouros em si, mas
  descoberto verificando ela): o dev "local" estava lento em TODAS as
  páginas**, não só Tesouros. Causa: `.env.local` (criado numa sessão anterior
  no mesmo dia pra rodar o script de sync) tem credenciais reais do Turso, e
  `next dev` carrega `.env.local` **em qualquer ambiente** — então todo
  `npm run dev` estava na verdade batendo no banco remoto pela rede a cada
  query. Medido direto: **~700ms–2.4s por query no Turso remoto vs ~1ms no
  arquivo SQLite local**. Resolvido renomeando pra `.env.production.local`
  (só carregado pelo Next quando `NODE_ENV=production`, nunca em `next dev`)
  — ver o aviso completo na seção "A prod já existe..." no topo deste arquivo,
  que já documenta a regra pra não recriar `.env.local` por engano numa sessão
  futura. Scripts de sync e docs (`README.md`, os dois `scripts/sync-*.mjs`,
  `middleware.ts`) atualizados pro novo nome. Confirmado antes/depois com
  `curl` cronometrado em todas as páginas principais: `/` caiu de ~2.9s pra
  ~0.1s, `/partidas/nova` de ~1.9s pra ~0.44s.

Sessão 2026-07-19 (continuação — cadastro automático de 130 ícones a partir
do isaacguru.com, e correção de um achado errado da sessão anterior):
- **Correção:** a sessão anterior (Fase B) concluiu que "só 34/158 (21%) dos
  Tesouros importados batem por nome com item real do Rebirth" com base
  **só** na pasta local `public/sheets/items` (238 PNGs do Spriters
  Resource) e depois numa categoria parcial da wiki (`Category:Costume_images`,
  395 arquivos). As duas são bibliotecas **incompletas** — reconheci vários
  nomes "sem match" que são itens reais do Rebirth (`Abel`, `Battery Bum`,
  `Blank Card`, `Crystal Ball`, `Diplopia`, `Glass Cannon` etc.), então a
  frase "não existe como item avulso no Rebirth" **estava errada**: o gap era
  cobertura da fonte, não inexistência do item.
- **Fonte muito mais confiável achada:** `isaacguru.com/version/isaac_repentance`
  — base de dados estruturada com **1185 nomes** (todas as categorias:
  items/trinkets/pickups/consumables/machines/characters/transformations/curses
  da versão Repentance), extraída direto do DOM
  (`a.item-icon-container[name]`, escopado a `#item` pros 720 "ITEMS"). Cruzando
  com os 159 Tesouros: **140 batem** (130 na seção ITEMS + 10 em outras seções
  como trinket/pickup/machine); **19 realmente não encontrados em lugar
  nenhum do site** — esses sim são um sinal forte de "não existe como
  collectible do Rebirth" (nomes de carta Four Souls sem equivalente
  eletrônico: `Auction Gavel`, `Baby Haunt`, `Daddy Haunt`, `Fetal Haunt`,
  `Cursed Soul`, `Decoy`, `Handicapped Placard`, `Trick Penny`,
  `Ultra Flesh Kid!`, etc. — ver lista completa pedindo pro assistente
  reconstruir a consulta se precisar).
- **Ícones dos 130 (seção ITEMS) importados automaticamente pro banco
  local**, sem passar pela Oficina manual. Achado técnico: a grade principal
  do isaacguru **não usa `<img>` por item** — todos os ícones da tela de
  "All items" são fatias de **um único spritesheet CSS**
  (`/core/assets/img/spritesheets/mods/isaac_repentance.png`, 38656×32px,
  grid fixo de 32×32px por item, `background-position: -(id-1)*32px 0`,
  onde `id` é o número em `itemid="cN"` de cada item na seção `#item`). Ou
  seja, tecnicamente **precisa de recorte** (ao contrário do que a aparência
  visual sugeria) — mas como a grade é fixa e previsível, o corte foi
  automatizado 100% via `canvas` no browser (sem UI manual, sem
  `OrnamentBuilder`/Oficina): carregou o PNG mestre, recortou os 130 slots de
  32×32 relevantes, e um script Node descartável (`_register-icons.mjs`,
  removido depois) gravou cada um como `sprites` (categoria `treasure-icon`,
  `public/sprites/treasure-icon/`, mesmo padrão de nome/slug de
  `lib/sprites.ts::createSprite`) + `ornaments` (categoria `diverso`,
  `offset_x=0, offset_y=0, scale=100` — **o mesmo default que o form da UI
  usa quando você escolhe um sprite sem mexer nos controles de posição**,
  então o resultado é idêntico ao que sairia de recortar/posicionar manual)
  + `UPDATE treasures SET icon_ornament_id = ...`. Rodou limpo: 130 criados,
  0 falhas, nenhum Tesouro que já tinha ícone foi tocado (checagem
  `icon_ornament_id IS NOT NULL` antes de cada write). **Book of Belial (id
  3)** — o único que já tinha ícone manual — ficou intacto.
- **Verificado no browser:** `/artefatos/tesouros` → abrir "Abel" (um dos
  130) mostra Escala 100%/Pos X 0/Pos Y 0 no editor de posição, `<img>` do
  slot ícone carrega 32×32 sem erro 404, zero mensagem no console.
- **Transformação continua pendente** (os 130 só ganharam `icon_ornament_id`,
  `transform_ornament_id` segue `NULL`) — usuário vai atrás dessa fonte
  depois, fora desta sessão.
- **Só rodou no banco local.** Não sincronizado pra prod ainda — se for
  fazer isso, o filtro por formato do
  `scripts/sync-treasure-cards-to-prod.mjs` (`icon_ornament_id IS NULL`) **não
  serve mais** pra esses 130 (agora têm ícone), reforça o "problema em
  aberto" já registrado no fim da sessão de Fase B: precisa de um critério
  novo pra saber o que sincronizar da próxima vez.
- ⚠️ **BUG encontrado e corrigido na mesma sessão:** a primeira versão do
  script calculava a posição de cada item no spritesheet por
  `offset = -(itemid_numérico - 1) * 32px`, validado só nos primeiros ~20
  itens (`c1`..`c20`, onde a fórmula batia certinho por acaso — são
  contíguos). A numeração `itemid="cN"` do isaacguru **tem buracos** ao
  longo dos ~1200 slots do sheet (itens fora do jogo atual, promocionais
  etc. que ocupam um número mas não uma célula), então pra a maioria dos
  itens com id mais alto o offset calculado ficava errado por 1-3 células
  (64-96px), pegando o ícone de um vizinho. **Resultado:** praticamente
  todos os 130 ícones da primeira rodada saíram trocados — usuário percebeu
  ("pouquíssimos icones foram pro Tesouro certo"). **Correção:** os 130
  foram revertidos (script `_revert-icons.mjs`, descartável — apagou
  sprite+ornament+arquivo e limpou `icon_ornament_id`, verificado sobrar só
  o Book of Belial manual) e re-cadastrados lendo o valor real de `--x` do
  atributo `style` de cada `<span class="item-spritesheet-container">` no
  DOM (`style.match(/--x:\s*(-?\d+)px/)`), sem nenhum cálculo/extrapolação —
  só transcrição do valor que o próprio site já resolveu. **Lição pra
  qualquer scraping futuro desse tipo:** nunca inferir uma fórmula de
  posição a partir de uma amostra pequena e contígua sem testar em toda a
  faixa de valores real — prefira sempre ler o dado já resolvido direto do
  DOM/CSS computado quando disponível.

Sessão 2026-07-20 (continuação — ícones dos itens do mod "Repentance Plus"):
- Dos 28 Tesouros ainda sem ícone (19 nunca achados em nenhuma fonte + 9 que
  batiam noutras seções do isaacguru), o usuário indicou
  `isaacguru.com/mod/repentance_plus`. **Achado:** apesar do nome sugerir a
  DLC oficial "Repentance+ (Online Co-op)", essa URL é na verdade um **mod
  de fãs** chamado "Repentance Plus" (o site lista dezenas de mods sob
  `/mod/<slug>`, cada um com seu próprio spritesheet
  `--ssfile-<slug>`) — mas continha **7 dos 19 nomes "não encontrados em
  lugar nenhum"**: `Auction Gavel`, `Cheese Grater`, `Friendly Sack`,
  `Hand-Me-Downs`, `Handicapped Placard`, `Keeper's Penny`,
  `Ultra Flesh Kid!`. Ou seja, esses nomes de Tesouro do Four Souls parecem
  ter sido inspirados nesse mod específico, não em itens vanilla do Rebirth.
  Ficam pendentes: `Baby Haunt`, `Battery Bum`, `Chaos Card`, `Cursed Soul`,
  `Daddy Haunt`, `Decoy`, `Donation Machine`, `Fetal Haunt`,
  `Golden Razor Blade`, `Modeling Clay`, `No!`, `Portable Slot Machine`,
  `Shadow`, `Shiny Rock`, `Steamy Sale!`, `Suicide King`, `The Chest`,
  `The Map`, `The Shovel`, `Trick Penny`, `Two Of Clubs`.
- **Repetiu o mesmo padrão seguro da correção anterior**: sheet do mod
  (`/core/assets/img/spritesheets/mods/repentance_plus.png`, 6144×32px,
  confirmado altura=32 = uma linha só antes de confiar) recortado lendo o
  `--x` real do `style` de cada item no DOM, **sem calcular nada** por
  itemid (aqui o `itemid` nem é numérico, é o próprio nome do item — reforça
  que não dava pra usar fórmula de qualquer forma). Script descartável
  (removido depois), mesmo storage/ornament (offset 0,0, escala 100%) dos
  130 anteriores.
- **Resultado:** 7 criados, 0 falhas, nenhum tesouro existente tocado.
  Total de Tesouros com ícone no banco local: **138** (131 + 7). Verificado
  no browser: `auction-gavel-5f6dfa.png` carrega 32×32 sem erro, zero
  mensagem no console.

### Sincronização dos 137 ícones locais pra prod — EXECUTADA em 2026-07-20

O plano abaixo (mantido como registro) foi executado na mesma sessão em que
foi escrito, depois de reler esta seção e reconferir prod por leitura (regra
de sempre): `scripts/sync-treasure-icons-to-prod.mjs`, rodado com `node
--env-file=.env.production.local scripts/sync-treasure-icons-to-prod.mjs`.

**Resultado:** 137 criados, 1 pulado (`Book of Belial`, sem match em prod —
esperado, é o único tesouro que existe só local), 0 falhas. Confirmado
depois: `treasures.icon_ornament_id IS NOT NULL` em prod foi de 1→138;
`sprites` foi de 169→306 (+137); `sheets`/`players`/`games` sem nenhuma
mudança (12/5/0, iguais); `ornaments` categoria `diverso` foi de 3→140
(+137, cabelo continua 7); **"Lazaru's Rags"** (id 1) continua com os
mesmos `icon_ornament_id`/`transform_ornament_id`/`card_sprite_id` de
antes — não foi tocado (pulado corretamente por já ter ícone).

`transform_ornament_id` continua `NULL` em todos os 137 (fora de escopo
desta rodada, igual local) — fica como próximo passo em aberto quando o
usuário cortar as transformações.

**Script ficou no repo** (`scripts/sync-treasure-icons-to-prod.mjs`), não é
descartável — segue o mesmo padrão de `sync-treasure-cards-to-prod.mjs`
(idempotente, casa por nome, pula o que já existe) pra poder rodar de novo
com segurança se aparecerem ícones novos depois.

<details>
<summary>Plano original (como foi escrito antes de rodar)</summary>

### PLANO (ainda não executado): sincronizar os 137 ícones locais pra prod

Decidido nesta sessão, execução ficou pra uma janela de contexto futura —
**não rodar sem antes reler esta seção e confirmar que o estado da prod
ainda bate com o que está descrito aqui** (reconhecimento por leitura antes
de qualquer escrita, regra de sempre).

**Reconhecimento feito em 2026-07-20** (só leitura, via
`node --env-file=.env.production.local <script>` com uma query solta,
script descartável já removido):
- Prod tem **159 Tesouros**. Só **1 já tem ícone**: `"Lazaru's Rags"` (id 1,
  `icon_ornament_id`/`transform_ornament_id` manuais, feito direto em
  produção — **não tocar**).
- **158 têm carta (`card_sprite_id`) mas nenhum ícone** — são exatamente os
  candidatos a receber o que foi feito local nesta sessão (Fase A/B da
  sessão de 2026-07-19 subiu só nome+carta desses 158, de propósito).
- **`"Book of Belial"` não existe em prod** (nunca foi sincronizado —
  excluído de propósito do filtro da Fase B por já ter ícone/transformação
  manuais só no local). Dos 138 Tesouros locais com ícone agora, portanto,
  só **137** têm uma linha correspondente em prod pra receber o ícone; o
  138º (Book of Belial) fica de fora dessa rodada, é esperado.

**O que fazer:** criar `scripts/sync-treasure-icons-to-prod.mjs` seguindo
**exatamente o mesmo padrão** de `scripts/sync-treasure-cards-to-prod.mjs`
(já existe no repo, é o script real que fez a Fase B — usar como referência
de estrutura: dois clients libSQL — local `file:./data/sad-notes.db` e prod
via env vars —, `allRows()` helper, upload pro Blob com `@vercel/blob`
`put()`, cascata de log por item com `[i/total] nome ... resultado`).

Lógica do script:
1. Query local: todos os Tesouros com `icon_ornament_id IS NOT NULL`,
   fazendo `JOIN ornaments o ON o.id = t.icon_ornament_id JOIN sprites s ON
   s.id = o.sprite_id` pra pegar `s.path` (arquivo em `public/sprites/
   treasure-icon/...`), `s.width`/`s.height` (32×32 em todos os 137) e
   `o.offset_x`/`o.offset_y`/`o.scale` (deve ser sempre 0, 0, 100 — mas ler
   do banco em vez de hardcodar, por segurança).
2. Pra cada um, na prod: achar `SELECT id, icon_ornament_id FROM treasures
   WHERE name = ? COLLATE NOCASE`.
   - Não achou por nome → **pular** e logar como aviso (não devia acontecer
     pros 137, exceto o Book of Belial que fica de fora por design — mas
     não assumir, deixar o script constatar).
   - Achou mas **já tem** `icon_ornament_id` → **pular** (idempotente, dá
     pra rodar de novo sem duplicar — só o "Lazaru's Rags" deve cair aqui).
   - Achou e **não tem** ícone → segue pro passo 3.
3. Ler o PNG local (`fs.readFileSync` no caminho de `s.path`, igual o
   script de referência faz pra carta), subir pro Blob da prod
   (`put(key, buffer, { access: "public", contentType: "image/png",
   addRandomSuffix: false, allowOverwrite: true })`), inserir uma linha
   `sprites` em prod (categoria `treasure-icon`, mesmo nome/width/height do
   local), inserir uma linha `ornaments` em prod (categoria `diverso`,
   mesmos offset_x/offset_y/scale do local), e só então `UPDATE treasures
   SET icon_ornament_id = <novo id> WHERE id = <id da prod>`.
4. **Nunca tocar** em `transform_ornament_id`, `card_sprite_id`, `sheets`,
   `players`, `games` — só somar `sprites`+`ornaments` novos e apontar o
   ícone. Mesmo espírito de escopo estreito do script da Fase B.
5. Rodar com `node --env-file=.env.production.local
   scripts/sync-treasure-icons-to-prod.mjs`.

**Resultado esperado:** 137 criados, 0 ou 1 pulado (só se rodar de novo, ou
o próprio Lazaru's Rags se por acaso o nome baixar igual — não deve), 0
falhas. Verificar depois: `sprites` em prod sobe de N pra N+137,
`icon_ornament_id IS NOT NULL` em `treasures` sobe de 1 pra 138, contagem de
`sheets`/`ornaments`-de-cabelo/`players`/`games` **sem nenhuma mudança**, e
`"Lazaru's Rags"` continua exatamente igual (mesmos ids de
ornament/sprite).

</details>

### Bug encontrado e corrigido: 18 ícones de Tesouro com PNG corrompido (2026-07-20)

Depois do sync acima, o usuário reportou ícones quebrados ("Image corrupt or
truncated") em vários Tesouros. Investigação confirmou que **não era frescura
de exibição**: o stream zlib do `IDAT` de 18 dos 139 PNGs de
`treasure-icon` estava genuinamente inválido (`zlib.inflateSync` falhava —
`invalid code lengths set`, `invalid distances set`, etc., alguns até com o
chunk declarando um tamanho maior que o arquivo). Afetava só a categoria
`treasure-icon`; as outras 168 sprites do catálogo local passaram limpo. A
causa exata ficou sem confirmação (o script descartável das sessões
anteriores que gerou esses 130+7 ícones já tinha sido removido, ver armadilha
#8) — mas o padrão (~13% dos arquivos, sem relação óbvia com nome/tamanho)
sugere um bug de escrita/encoding pontual naquele script, não algo sistêmico
no pipeline atual.

**Lista dos 18:** Birthright, Blank Card, Cambion Conception, Cheese Grater,
Dead Bird, Dry Baby, Eternal D6, Flush!, Friendly Ball, Magic Skin, Monstro's
Tooth, Starter Deck, Tech X, The Battery, The Clicker, The D20, Undefined,
X-Ray Vision. Como esses 18 já tinham sido sincronizados pra prod no lote dos
137 (upload é um `fs.readFileSync` cru, sem validar o conteúdo), a corrupção
foi copiada byte a byte pra prod também.

**Correção:** re-cortados os 32×32 originais direto dos spritesheets fonte
(isaacguru.com `isaac_repentance.png` pros 16 do lote principal + o item
"Undefined"; mod `repentance_plus.png` pro "Cheese Grater"), usando as mesmas
posições `--x` já usadas da vez anterior (documentado no código descartável
antes de apagar). **Mudança de método:** as duas primeiras tentativas de
recortar via Browser pane + colar o PNG (dataURL base64) manualmente no disco
falharam silenciosamente — o hash SHA-256 do arquivo escrito não batia com o
da imagem original, mesmo com o tamanho em bytes idêntico (transcrição manual
de base64 longo é traiçoeira: caracteres visualmente parecidos como `I`/`l`/`1`
ou `O`/`0` se confundem fácil, e o erro saiu **idêntico** nas duas tentativas).
**Resolvido evitando esse canal por completo:** um script Node baixou os
spritesheets fonte direto via `fetch` nativo (sem CORS do lado servidor) e um
decodificador/codificador de PNG em JS puro, descartável (parse de chunks
IHDR/IDAT/IEND, inflate/deflate via `zlib` nativo, sem `sharp`/`pngjs`) fez o
recorte — zero transcrição manual envolvida. Cada um dos 18 PNGs gerados foi
validado (`zlib.inflateSync` limpo + tamanho raw batendo com `width×height×4`)
antes de gravar por cima do arquivo local; depois de gravar, os 139 arquivos
de `treasure-icon` **e** os 307 sprites do catálogo local inteiro foram
re-escaneados — zero corrompidos.

**Sync pra prod:** como path/dimensões não mudaram, só o conteúdo do PNG,
**não precisou tocar em nenhuma linha do banco** — só reenviei os 18 arquivos
corrigidos pro Blob usando a mesma key (`addRandomSuffix:false,
allowOverwrite:true`), o que sobrescreve o conteúdo na mesma URL. Confirmado
buscando de volta as 18 URLs de prod via `fetch` e validando o zlib de cada
uma — todas OK.

**Achado à parte, não corrigido:** o Tesouro chamado literalmente
**"Undefined"** (id 153) é provavelmente um bug de nome, não um Tesouro real
— veio do import do foursouls.com (Fase A) e algum card teve o nome mal
capturado (`alt=` vazio ou similar, sobrando a string `"undefined"`). Por
coincidência, o isaacguru.com **também** tem um item chamado literalmente
"Undefined" (`itemid="c324"`, `/wiki/isaac_repentance/c324`), o que fez o
Tesouro "casar" por nome com um ícone real durante a importação — mas
provavelmente não é o item certo pro card do Four Souls que esse Tesouro
deveria representar. A corrupção do ícone dele foi corrigida (mesma imagem
`c324` de antes, só sem estar mais corrompida), mas o nome/vínculo em si
continua suspeito. Se o usuário identificar qual card do Four Souls isso
deveria ser, o conserto é renomear o Tesouro em `/artefatos/tesouros` (nome é
`UNIQUE COLLATE NOCASE`, então precisa ser um nome que ainda não exista) e
trocar o ícone manualmente se o item certo for outro.

### Maldições — catálogo implementado (commit pendente, 2026-07-21)

Implementado o schema/API/tela planejados em `docs/PLANO-ARTEFATOS.md` §11
(criado na sessão anterior). **Só o catálogo** — nada de `game_player_curses`
nem desbloqueio, exatamente como decidido no plano.

- **Schema:** `curses` (id, `name` COLLATE NOCASE UNIQUE, `card_sprite_id` →
  sprites, created_at) no `initSchema` de `lib/db.ts` — sem migração
  idempotente (tabela nova). Sem cascata manual em `deleteCurse` (não há
  tabela filha ainda).
- **Tipos/data layer/API:** `Curse`/`CurseFull`/`CurseInput` (`lib/types.ts`),
  `lib/curses.ts` (list/get/create/update/delete, molde de `lib/treasures.ts`
  mas sem a complexidade de ornamento/slot), `parseCurseInput`
  (`lib/validation.ts`), `app/api/curses/route.ts` + `[id]/route.ts` (GET/
  POST/PATCH/DELETE, mesmo formato de erro de duplicidade dos Tesouros).
- **UI:** `/artefatos/maldicoes` (`components/CursesClient.tsx`) — **usuário
  pediu explicitamente "o mesmo card de Tesouros"**: reaproveita as classes
  `.treasure-grid`/`.treasure-card`/`.treasure-card-art` já existentes no
  `globals.css` (nenhum CSS novo), só que o card mostra **carta + nome**, sem
  os dois slots de ícone/transformação nem seletor de modo de desbloqueio —
  o form é só nome + grid de sprites `curse-card`. Item novo "Maldições" na
  Sidebar (`ARTIFACTS_NAV`, ícone `IconSkull` novo, mesmo padrão de ícone SVG
  de traço do `IconBug`/`IconGear`).
- **Oficina:** categoria de sprite `curse-card` adicionada ao segmentado de
  `SpritesClient.tsx` — a constante local **foi renomeada** de
  `TREASURE_CATEGORIES` pra `SPRITE_CATEGORIES` (deixou de ser exclusiva de
  Tesouro). A regra da armadilha #9 (`.card-art` pra imagem não-pixel-art) foi
  estendida pra também cobrir `curse-card`.
- **Verificado end-to-end no browser:** criar Maldição de teste
  (`__TESTE__ Amnésia`) via UI real (não só API — uma tentativa via `curl`
  mostrou os acentos corrompidos, mas era só a codificação do heredoc do
  shell Windows, não um bug do app; confirmado digitando pelo form de verdade
  que o nome com acento salva e recarrega certinho), editar, remover — tudo
  limpo ao final. `npx tsc --noEmit` limpo. Sem erro no console.
- **Conferência do banco local (2026-07-21):** os mesmos **12 Tesouros sem
  ícone** já documentados em 2026-07-20 continuam os mesmos, nenhum mudou:
  Baby Haunt, Cursed Soul, Daddy Haunt, Decoy, Fetal Haunt, Portable Slot
  Machine, Shadow, Steamy Sale!, The Chest, The Map, The Shovel, Two Of Clubs
  — todos com `card_sprite_id` preenchido (carta pronta pra virar Maldição
  assim que o usuário confirmar quais são quais). Trabalhado em branch
  própria (`feat/artefato-maldicoes`, a partir da `master` já com o merge do
  PR #2).

### Migração de 4 Maldições (Baby Haunt, Cursed Soul, Daddy Haunt, Fetal
Haunt) de `treasures` pra `curses` — local e prod (2026-07-21)

Usuário confirmou, dentre os 12 candidatos acima, que **estes 4 são
Maldições de verdade** (os outros 8 seguem pendentes de triagem — não
tocados). Script descartável (`_migrate-curses.mjs`, raiz do projeto,
removido depois em ambas as rodadas, padrão da armadilha #8) rodou
primeiro em **dry-run** (só leitura, conferindo `icon_ornament_id`/
`transform_ornament_id` ainda `NULL` e contando `game_player_treasures`
referenciando cada um — 0 nos dois bancos, nenhum tinha sido registrado
numa partida real) e só depois em modo de escrita: pra cada um, insere a
linha equivalente em `curses` (reaproveitando o mesmo `card_sprite_id` já
existente, sem re-upload) e só então apaga a linha de `treasures` (ordem
que respeita a armadilha #7 — repontar/criar antes de apagar o que ficaria
órfão, embora aqui não houvesse FK entrando em conflito por não haver
ornamento nenhum nos 4).

- **Local:** `treasures` 158→154, `curses` 0→4. Verificado no browser:
  `/artefatos/maldicoes` lista os 4 com a carta certa (mesmos arquivos
  `treasure-card` de antes, servidos com 200), `/artefatos/tesouros` caiu
  pra "Tesouros (154)" sem mais mostrar os 4. Zero erro no console.
- **Prod:** primeira tentativa deu **401** na conexão Turso mesmo num
  `SELECT 1` — o token de `.env.production.local` tinha expirado/rotacionado
  desde a sessão anterior (nada a ver com o código; confirmado isolando a
  conexão fora do script). Usuário gerou um token novo no painel do Turso e
  atualizou o arquivo; com o token novo, dry-run e execução rodaram limpos.
  **Resultado em prod:** `treasures` 159→155, `curses` 0→4 (mesmos 4 nomes,
  ids próprios de prod — card_sprite_id resolvido a partir do **próprio**
  `treasures` da prod, nunca cruzando id do local com o de prod).
  `sheets`/`players`/`games` sem nenhuma mudança causada por este script
  (12/6/0 — a diferença de contagem de `players` frente a sessões
  anteriores é o usuário usando o app entre sessões, não algo que este
  script tocou).
- **Restam 8 dos 12 pendentes** (Decoy, Portable Slot Machine, Shadow,
  Steamy Sale!, The Chest, The Map, The Shovel, Two Of Clubs) — ainda sem
  triagem do usuário, continuam em `treasures` sem ícone nos dois bancos.
  Repetir exatamente este processo (dry-run primeiro, sempre) quando o
  usuário trouxer o veredito desses.

### Import de 15 Maldições oficiais + campo `locked` (2026-07-21)

O usuário apontou que a carta de Maldição existe de verdade no jogo
eletrônico/físico dentro do **baralho de Monstro** (Monstros é um Artefato
futuro, ainda não implementado) e passou a URL
`foursouls.com/card-search/?...&card_type=monster`. **Achado:** essa busca,
apesar do parâmetro `card_type=monster`, devolve as cartas reais de
**Maldição** (`alt="Curse Of ..."`) — o site categoriza Curse como um
subtipo de "monster" internamente. Isso é a fonte oficial e completa das
Maldições do jogo (**15 cartas**, sem paginação, `curl` puro basta — mesmo
método de sempre), nada a ver com o scraping incompleto/impreciso da Fase A
que gerou a confusão original com Tesouro.

- **Divisão por produto:** 5 do Base Game V2 (`b2`) + 4 do Requiem (`r`) = 9
  dos produtos que o grupo joga (mesmo critério já usado no import dos 158
  Tesouros) + 6 de expansões que o grupo não joga hoje (`g2` ×2, `fsp2` ×2,
  `soi` ×1, `rwz` ×1). **Decisão do usuário: importar as 15, mas marcar as 6
  extras como "bloqueadas"** — não ficam de fora do catálogo (o grupo pode
  querer essas cartas no futuro), só aparecem visualmente indisponíveis.
- **Schema novo:** coluna `curses.locked` (INTEGER, default 0). Como
  `curses` já tinha linhas reais (as 4 migradas na sessão anterior), não dá
  pra usar só `CREATE TABLE IF NOT EXISTS` — precisou de um **helper de
  migração idempotente** novo em `lib/db.ts` (`ensureColumn()`, checa
  `PRAGMA table_info` antes do `ALTER TABLE ADD COLUMN`, primeiro desde a
  reescrita pro libSQL/Vercel — o `migrateSchema()` antigo do
  better-sqlite3 tinha sido descartado na migração). Chamado no fim do
  `initSchema()`.
- **UI:** checkbox "Bloqueada" no form (`CursesClient.tsx`), classe
  `.treasure-card.locked` no `globals.css` (opacidade 0.55 + grayscale na
  carta) + label "Bloqueada" no card — mesma linguagem visual já usada em
  `.ornament-row.locked` (Tesouro bloqueado no `AvatarEditor`), só que
  aplicada ao componente de carta em vez de linha de lista. Confirmado
  visualmente com `computer{screenshot}` (funcionou nesta sessão, ao
  contrário do timeout recorrente registrado na armadilha #5 — pode já ter
  sido corrigido no ambiente, mas manter `read_page`/`javascript_tool` como
  plano B se voltar a travar).
- **Import (script descartável `_import-curses.mjs`, removido depois em
  ambas as rodadas):** baixa a carta oficial (`data-src` do card-search,
  mesmo padrão da Fase A), grava sprite categoria `curse-card` (Blob em
  prod / disco em dev, mesmo `putImage` conceitual mas escrito solto porque
  scripts fora do Next não resolvem os imports TS — armadilha já conhecida)
  + linha `curses` com `locked` conforme o produto. Idempotente por nome
  (`COLLATE NOCASE`, pula se já existir).
- **Local:** dry-run limpo (zero colisão de nome) → execução: 15
  sprites + 15 curses criados. Verificado no browser: `/artefatos/maldicoes`
  lista as 19 (4 antigas + 15 novas), as 6 bloqueadas aparecem esmaecidas em
  grayscale com o rótulo "Bloqueada", zero erro no console.
- ⚠️ **Armadilha nova (script solto x schema do app):** a primeira tentativa
  em prod falhou no meio (`SQLITE_UNKNOWN: table curses has no column named
  locked`) porque o script de import, escrito solto (fora de `lib/db.ts`),
  não roda `ensureColumn()` — só o app de verdade (via `getClient()`) migra
  o schema. Isso já tinha acontecido antes com a tabela em si (script de
  migração anterior precisou recriar o `CREATE TABLE IF NOT EXISTS` local).
  **Efeito colateral:** a primeira carta do lote (`Curse Of Amnesia`) já
  tinha subido sprite+Blob antes de falhar no insert de `curses`, deixando
  um **sprite órfão em prod** (id 338) — identificado por leitura
  (`category='curse-card'` sem `curses` correspondente) e limpo (Blob
  `del()` + `DELETE FROM sprites`) antes de rodar a coluna `ALTER TABLE` e
  reexecutar o import do zero. **Lição:** scripts soltos que tocam schema
  precisam repetir manualmente qualquer migração de coluna nova que o app
  faria sozinho — não assumir que rodar contra prod uma vez "adianta" pra
  próxima tabela/coluna nova.
- **Resultado final em prod:** `curses` 4→19 (6 `locked=1`), `treasures`
  inalterado (155), `sheets`/`players`/`games` inalterados (12/6/0).

### 9 ícones a mais achados em seções fora de "Items" (2026-07-20)

Depois da lista de pendentes ser mostrada pro usuário, ele fez uma busca fina
no isaacguru.com e achou 9 dos 21 restantes em **seções diferentes de
"ITEMS"** (cards/trinkets/machines), que o scraping anterior (escopado só à
seção `#item`) não cobria:

- **Via spritesheet principal** (`isaac_repentance.png`, mesmo método de
  ler `--x` real do `style` no DOM, sem calcular fórmula): `Suicide King`
  (seção `consumable`, cards, `--x:-30528px`), `Chaos Card` (`consumable`,
  `--x:-30400px`), `Shiny Rock` (`trinket`, `--x:-24992px`), `Modeling Clay`
  (`trinket`, `--x:-28320px`), `NO!` (`trinket` — **nome no site é
  MAIÚSCULO**, `--x:-25824px`; nosso Tesouro chama `"No!"`, casou por
  `COLLATE NOCASE`), `Golden Razor` (seção `item`, `--x:-17632px` —
  **nome no site é `"Golden Razor"`, sem "Blade"**; nosso Tesouro chama
  `"Golden Razor Blade"`, precisou de mapeamento manual nome-site→nome-Tesouro
  em vez de casar automático).
- **Via mod `repentance_plus.png`**: `Trick Penny` (`trinket`,
  `--x:-416px`).
- **Achado técnico novo:** a seção `machine` (ex.: `Battery Bum` `itemid
  6.13`, `Donation Machine` `itemid 6.8`) **não usa spritesheet
  compartilhado** — cada máquina tem sua própria imagem **WEBP** embutida
  inline como `data:image/webp;base64,...` num `<span
  class="item-background-container">` (ao contrário do
  `item-spritesheet-container` das outras seções). Guardados **como WEBP
  mesmo**, sem reconverter pra PNG (`lib/storage.ts::putImage` não força
  formato, só recebe `contentType`; Next serve estático por extensão; `<img>`
  renderiza WEBP normalmente) — evita depender de um decodificador WEBP
  caseiro, que é bem mais complexo que PNG (múltiplos subformatos
  VP8/VP8L/VP8X).
- **Mudança de método relevante pra qualquer scraping futuro:** as tentativas
  anteriores de extrair essas imagens via Browser pane (JS `canvas.toDataURL`
  + colar o base64 manualmente num arquivo) já tinham falhado 2x nessa
  mesma sessão pro caso do "Undefined" (ver bug acima) — **transcrição manual
  de base64 longo é frágil** mesmo copiando com cuidado (caracteres
  visualmente parecidos se confundem). Resolvido de vez fazendo o **Node
  buscar o HTML/spritesheet direto por `fetch` nativo** (sem CORS do lado
  servidor) **e extrair tudo por regex/parsing programático** — zero
  transcrição manual em qualquer etapa. Esse é o método a preferir sempre
  que for extrair conteúdo binário de uma página: nunca fazer a IA copiar
  base64 longo à mão entre ferramentas.
- **Armadilha nova (dimensões erradas):** o script de registro assumiu
  `width=32, height=32` pra todo sprite novo (verdade pros 7 recortados do
  spritesheet, que são sempre 32×32 por construção) mas **as 2 imagens WEBP
  das máquinas têm tamanho próprio** (`Battery Bum` = 34×34, `Donation
  Machine` = 64×64 — descoberto só depois, testando no browser e reparando
  que `naturalWidth`/`naturalHeight` do `<img>` não batiam com o que tinha
  ido pro banco). Corrigido via `UPDATE sprites SET width=.., height=..`
  local **e** prod pros 2 ids certos. **Lição:** nunca hardcodar
  width/height de um sprite sem checar as dimensões reais do arquivo — só é
  seguro assumir um tamanho fixo quando o próprio código controla o recorte
  (como no `encodePngRGBA(32,32,...)` dos outros 7).
- **Resultado:** 9 criados (local + sincronizados pra prod reaproveitando o
  `scripts/sync-treasure-icons-to-prod.mjs` já existente — só precisou trocar
  o `contentType` fixo `"image/png"` por uma função que detecta `.webp` pela
  extensão). Verificado no browser: todos os 9 carregam sem erro 404/console,
  dimensões batendo com o arquivo real. Total de Tesouros com ícone: **147**
  local e prod. Restam **12** sem ícone (nenhum encontrado em nenhuma fonte
  até agora): `Baby Haunt`, `Cursed Soul`, `Daddy Haunt`, `Decoy`, `Fetal
  Haunt`, `Portable Slot Machine`, `Shadow`, `Steamy Sale!`, `The Chest`,
  `The Map`, `The Shovel`, `Two Of Clubs`.
- **Explicação do usuário sobre esses 12 (2026-07-20):** não são todos do
  mesmo tipo de pendência.
  - **Alguns são Tesouros do board game que existem no Rebirth/Repentance
    só com outro nome** — o usuário vai procurar o nome real e trazer o
    equivalente numa sessão futura pra eu recortar/cadastrar o ícone (mesmo
    processo de sempre: achar no isaacguru/mod, ler `--x` do DOM, recortar).
    Não são "não encontrados" de verdade, só ainda não linkados ao nome
    certo.
  - **Outros não são Tesouros de verdade — são Maldições** (mecânica
    diferente do board game) que vieram misturadas no import de Tesouros do
    foursouls.com (Fase A) por engano de escopo, não por bug: o card-search
    do site provavelmente lista os dois tipos juntos ou com filtro impreciso.
    **Decisão do usuário:** Maldições vão virar um **artefato novo e
    separado** (não uma correção dentro de Tesouros) — cadastro futuro,
    fora do escopo desta sessão. Quando essa feature for pedida, os que
    forem identificados como Maldição devem ser **removidos** da tabela
    `treasures` (não só deixados sem ícone) depois que o novo artefato
    existir e tiver o cadastro correspondente — não fazer isso adiantado
    sem o schema/tela novos existirem.
  - **Ainda não sei dizer quais dos 12 são cada categoria** — o usuário vai
    trazer essa triagem. Não tratar nenhum dos 12 como "confirmado sem
    correspondente" até essa resposta.
- ⚠️ **Susto no meio do caminho, resolvido:** ao conferir a contagem depois
  do registro, percebi que **"Book of Belial" (id 3) tinha sumido do banco
  local** (159→158 treasures) — investiguei e confirmei que nenhum script
  desta sessão (nem os de hoje, nem os do dia anterior) contém um `DELETE`
  contra o banco local, então perguntei o usuário antes de prosseguir.
  **Confirmado pelo usuário: foi ele mesmo**, apagou manualmente pela UI
  (provável `npm run dev` rodando em paralelo enquanto eu trabalhava nos
  scripts). Não é bug, mas fica registrado o processo: **sempre que um dado
  protegido sumir/mudar sem eu ter escrito o comando, parar e perguntar antes
  de continuar** — não assumir que foi um script seu só porque o timing
  bate, e não assumir que foi engano do usuário sem confirmar.
  `belial-tresure-icon`/`belial-tresure-transform` (sprites id 16/17) ficaram
  órfãos no banco (a linha `treasures` que os referenciava foi apagada, mas
  os sprites em si não são cascateados) — não limpos automaticamente, é lixo
  inofensivo até o usuário decidir o que fazer.

### Dados reais do usuário no banco (não são teste — não apagar)

Desde 2026-07-19 sabemos que **local e prod são dois bancos com dado real
independente** (ver aviso no topo do arquivo) — os dois inventários abaixo
não se sobrepõem exceto onde dito explicitamente.

**No banco local** (`data/sad-notes.db`):
- Jogadores: **Mané** (id 9, tem cabelo customizado aplicado, `hair_color`
  = `'natural'`) e **Robertinho** (id 10, sem customização — usa o fallback
  de rosto base).
- Ao menos 1 partida registrada (o usuário testou o wizard pela própria UI).
- Sprite **"cuia-hair-1"** (categoria `hair-styles`) e ornamento
  **"hairs-cuia-01"** (categoria `cabelo`) — cadastrados pelo próprio usuário.
- ~~Tesouro "Book of Belial" (id 3)~~ — **apagado pelo próprio usuário em
  2026-07-20** (pela UI, provavelmente com `npm run dev` rodando em paralelo
  numa sessão de trabalho aqui; ver "Susto no meio do caminho" acima).
  Deixou de existir no banco local; nunca existiu em prod. Os sprites
  `belial-tresure-icon`/`belial-tresure-transform` (ids 16/17) ficaram
  órfãos, sem nenhuma linha `treasures`/`ornaments` apontando pra eles —
  inofensivo, lixo que pode ser limpo quando o usuário quiser.
- 158 Tesouros importados do foursouls.com (Fase A/B, nome + carta, sem
  ícone/transformação) — ver sessões 2026-07-19 acima. **Também sincronizados
  pra prod** (não são exclusivos do local).
- 146 desses 158 ganharam `icon_ornament_id` (130 do isaacguru.com versão
  base + 7 do mod "Repentance Plus" + 9 achados em seções fora de "Items"
  pelo usuário, ver sessões 2026-07-19/20 acima) — **todos sincronizados pra
  prod também** em 2026-07-20 (ver seções acima). `transform_ornament_id`
  continua `NULL` em todos, nos dois bancos. Restam **12** Tesouros sem
  ícone em nenhum dos dois bancos (lista completa na seção "9 ícones a mais"
  acima).

**Na prod** (Turso, descoberto em 2026-07-19 — nada disso passou por uma
sessão de trabalho aqui):
- Jogadores: **Mané** (ativo) e **Thalinha** (ativa) — Thalinha não existe no
  banco local. Mais 3 jogadores `_TEST_Robertinho`/`_TEST_cryinguy`/`_TEST_cu`
  (inativos, claramente teste — o próprio usuário seguiu a convenção de
  prefixo `_TEST_` sugerida abaixo).
- Tesouro **"Lazaru's Rags"** (id 1) com ícone, transformação e carta já
  cadastrados e posicionados manualmente — trabalho real, não mexer.
- Catálogo de cosméticos que **não existe local**: 9 sprites de cabelo
  (Elsa, vintage, middlecut, Leia, sidecut, curvy, spiked, short, eyehide) +
  sheets de personagem (Eden hair variantes, Tainted Eve, Magdalene) + sheets
  de item (Spoon Bender, Skatole, The Book of Belial, The Pentagram,
  Lazarus' Rags — alguns com nome parecido a sheets locais mas são uploads
  independentes, hash diferente, **não são a mesma linha**).
- Os 158 Tesouros importados (mesmos nomes do local, sincronizados em
  2026-07-19 via `scripts/sync-treasure-cards-to-prod.mjs`).
- 137 desses 158 ganharam `icon_ornament_id` em 2026-07-20 via
  `scripts/sync-treasure-icons-to-prod.mjs` (mesmo lote do local, "Book of
  Belial" de fora por não existir em prod). `sprites` em prod: 169→306;
  `treasures` com ícone: 1→138.
- 0 partidas registradas em prod até 2026-07-20.

**O usuário usa o app entre as sessões de trabalho — tanto local quanto
publicado.** Isso já causou confusão mais de uma vez (dados que "apareceram"
no banco sem eu ter criado), e agora vale pros dois ambientes. **Nunca faça
`DELETE` em massa** (`players`, `games`, `sprites`, `ornaments`, etc.) em
NENHUM dos dois bancos sem antes checar o que já existe e filtrar
precisamente pelo que você mesmo criou (por id ou por um prefixo de nome tipo
`__TESTE__`/`__T__`/`_TEST_`).

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
7. **Fluxo de Git (decidido em 2026-07-20):** projeto pequeno, entre o
   usuário e um grupo de amigos — sem ambiente de homologação/staging, sem
   deploy de teste separado do de produção. Por isso **não existe branch
   `dev` persistente** (adicionaria cerimônia sem benefício, já que não há
   pra onde "promover" antes da `master`).
   - **Modelo:** uma branch só, `master`. Todo trabalho nasce numa **branch
     local de feature**, sobe como PR e é mergeado nela.
   - **`master` está protegida no GitHub** (Settings → Branches → regra pra
     `master` → "Require a pull request before merging", com **0
     aprovações obrigatórias**) — ninguém, nem quem tem permissão de
     escrita, consegue mais `git push` direto nela. O merge do PR pode
     acontecer na hora, sem esperar aprovação de ninguém.
   - **Por quê 0 aprovações e não exigir review:** o objetivo do PR aqui não
     é criar um portão de aprovação (o grupo é pequeno, exigir revisor
     travaria merge quando só uma pessoa está online) — é só criar uma
     **etapa de checkpoint** (o diff inteiro fica visível num lugar antes de
     entrar na `master`), sem impedir que qualquer colaborador suba a
     própria mudança quando quiser.
   - **Repo é público** (`private: false` no GitHub) mas isso é ortogonal à
     permissão de escrita: visibilidade pública deixa qualquer um **ler**
     o código/clonar/abrir PR de um fork próprio; só quem está em
     **Settings → Collaborators and teams** com Write/Maintain/Admin
     consegue de fato mergear algo na `master`. Um PR de estranho fica
     parado até um colaborador aprovar/mergear — nunca entra sozinho.
   - **Bypass de emergência:** a opção "Do not allow bypassing the above
     settings" foi deixada **desmarcada** de propósito — se um dia precisar
     empurrar algo direto na `master` numa emergência, ainda dá, sem
     precisar desfazer a regra primeiro.
8. **Maldições são um artefato separado de Tesouros (decidido em
   2026-07-20; catálogo implementado em 2026-07-21, ver sessão
   correspondente mais acima):** ao investigar os Tesouros sem ícone,
   descobriu-se que alguns dos 158 importados do foursouls.com (Fase A) não
   são Tesouros de verdade — são **Maldições**, mecânica diferente do board
   game que entrou junto por engano de escopo do scraping. Não viraram um
   novo `unlock_mode` nem um campo dentro de `treasures`: ganharam uma
   **tabela/tela nova e independente** (`curses` + `/artefatos/maldicoes`).
   Ver detalhe e lista de candidatos na sessão "9 ícones a mais" (2026-07-20)
   e o resultado em "Maldições — catálogo implementado" (2026-07-21, mais
   acima) — os registros identificados como Maldição ainda precisam ser
   **removidos** de `treasures` depois de migrados pra `curses` (migração em
   si ainda pendente da triagem do usuário).
9. **"Artefato" é um conceito mais amplo do que Tesouro (reformulado em
   2026-07-20):** um Artefato é qualquer entidade cadastrável do jogo usada
   pra **registro estruturado de partida** (seleção, não texto livre) —
   Personagens (já existia antes deste conceito, é o precedente), Tesouros
   (implementado), Maldições, Monstros e Salas (planejados). O desbloqueio
   de cosmético de avatar (item 6 acima) é só um recurso que **alguns**
   Artefatos têm (Tesouro tem; Monstro/Sala não têm) — generalizá-lo pra
   outros Artefatos (ex.: Personagem) virou um plano próprio, separado do
   catálogo em si. Ver `docs/PLANO-ARTEFATOS.md` (reescrito com essa visão)
   e os três planos irmãos: `docs/PLANO-COSMETICOS-AVATAR.md` (generalizar
   desbloqueio), `docs/PLANO-QUARTO-JOGADOR.md` (sala visual decorável) e
   `docs/PLANO-TORNEIOS.md` (torneios, sem formato definido). Nenhum dos
   quatro artefatos/planos novos (Maldições, Monstros, Salas, Cosméticos
   generalizados, Quarto do Jogador, Torneios) está implementado — são
   só planos.

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

### 9. `image-rendering: pixelated` é global — quebra arte que não é pixel art

`app/globals.css` tem um reset `img { image-rendering: pixelated; }` (mais
várias regras específicas repetindo isso: `.sprite-pick img`, `.ornament-thumb`
implícito, `.sprite-thumb img`, etc.) — correto pro design system pixel-art
(avatares, ícones/ornamentos recortados da Oficina, frames), mas **qualquer
imagem nova que não seja pixel art herda isso automaticamente e sai
serrilhada ao redimensionar**, principalmente em miniatura (menos notável
perto do tamanho nativo, mas nunca tão nítida quanto deveria). Mordeu nas
cartas de Tesouro (`treasure-card`, arte ilustrada baixada de
foursouls.com, 308×420) — o usuário reportou "resolução estranha" nos cards
pequenos.

**Regra:** toda imagem que não é pixel art (`treasure-card` e, desde
2026-07-21, também `curse-card`; se aparecer outra categoria de arte "lisa"
no futuro, o mesmo vale) precisa da classe `card-art` no `<img>`
(`img.card-art { image-rendering: auto; }`, fim do `globals.css` — mesma
especificidade das regras de sprite/ornamento acima, vence por vir depois
no arquivo). Lugares que já aplicam: `TreasuresClient.tsx`/`CursesClient.tsx`
(thumb da lista + picker do form) e `SpritesClient.tsx` (catálogo da
Oficina, condicional a `s.category === "treasure-card" || "curse-card"`
porque esse catálogo lista todas as categorias juntas). Se adicionar um
novo lugar que renderize `card_sprite_path`/sprite de categoria de carta,
lembre de aplicar a classe lá também.

### 10. `border-image-repeat: stretch` distorce frames em página alta

Quase todas as variantes de `public/design-system/frames.css` (28 no
catálogo, `.frame-brick` era a única exceção) usavam
`border-image-repeat: stretch` nas 4 tiras de borda do 9-slice. Isso é
inofensivo em página curta, mas em qualquer tela com muito conteúdo (ex.:
`/artefatos/tesouros` com 154 cartas) a tira lateral estica verticalmente pra
preencher a altura toda — o padrão de rebites/pranchas/livros vira um borrão
irreconhecível. Usuário reportou comparando com `foursouls.com/cards`, que
resolve replicando (tile) a borda em vez de esticar.

**Regra:** usar `border-image-repeat: round` (não `stretch`) em qualquer
frame nova. `round` reescala cada tile pra sempre fechar num número inteiro —
nunca corta ornamento no meio, ao contrário de `repeat` puro, cujo ponto de
corte depende da altura da página (imprevisível, já que a altura varia com a
quantidade de conteúdo). A reamostragem do `round` é imperceptível nesses
assets (~1–3% de ajuste por tile). Todas as 28 variantes de `frames.css`
foram trocadas pra `round` em 2026-07-21 (commit `a5db2f1`) — se adicionar
variante nova, já nasça com `round`.

**Limite conhecido, aceito como trade-off (não é bug a corrigir):** as artes
de frame foram desenhadas pra uma "sala" de tamanho fixo do jogo eletrônico,
não pra repetir infinitamente — elementos com inclinação/perspectiva na
parede (vigas, arcos, prateleiras) geram uma leve distorção de perspectiva
quando repetidos lado a lado, mais perceptível em frames "arquitetônicos"
(`frame-chest-torch`, `frame-library`, `frame-cathedral`) e quase invisível em
frames orgânicos sem direção definida (`frame-utero`, `frame-utero-purple`).
Usuário viu ao vivo no app e decidiu aceitar — não tentar mascarar com mais
engenharia (recorte manual de sprite pra tile "seamless" ficou descartado por
enquanto; se algum dia for necessário, o usuário tem os PSDs/fonte originais
dos frames, avisar antes de supor que os PNGs atuais bastam).

**Método de verificação que funcionou:** antes de tocar no CSS real, simulei
`stretch`/`repeat`/`round` fora do navegador com um script Node descartável
usando o `sharp` embutido no Next (`node_modules/next/node_modules/sharp` —
não é dependência direta do projeto, resolver por caminho completo ou
`createRequire`), recortando as tiras reais do PNG e compondo os 3 modos
lado a lado numa caixa de 900px. Serviu pra decidir a direção antes de
validar no app de verdade — mas a simulação (nearest-neighbor via sharp) não
é pixel-idêntica ao `border-image` real do Chrome, então a palavra final
sempre foi o app rodando (`preview_start` + `computer{screenshot}` no Browser
pane, que funcionou normalmente nesta sessão — os timeouts de `screenshot`/
`zoom` documentados no item #5 acima parecem ter sido pontuais de uma sessão
anterior, não uma limitação permanente deste ambiente; `zoom` com recorte de
região, porém, ainda não funciona — "region crop not yet supported", cai pra
screenshot cheio). Truque útil pra forçar
página alta e testar o pior caso: `resize_window` bem estreito (ex. 460px) —
reduz colunas por linha e multiplica a altura da página sem precisar de dado
de teste extra.

### 11. Scripts soltos (fora do Next) não migram schema sozinhos

`lib/db.ts::initSchema()` (incluindo o helper `ensureColumn()` que faz
`ALTER TABLE ADD COLUMN` idempotente) só roda dentro de `getClient()` —
ou seja, só quando o **app de verdade** conecta (via `npm run dev`/`start`
ou uma rota chamando `lib/db.ts`). Um script solto na raiz do projeto que
cria seu próprio `createClient()` direto (padrão de todos os
`scripts/sync-*.mjs` e dos `_*.mjs` descartáveis) **não** passa por isso —
se o schema mudou desde a última vez que o app rodou contra aquele banco
(nova tabela ou nova coluna), o script quebra no meio com erro de SQLite
(`no such table`/`has no column named ...`), podendo deixar dado parcial
gravado nas tabelas que já tinham sido escritas antes da que falhou.

**Regra:** todo script solto que grava em tabela nova/coluna nova precisa
repetir manualmente o DDL relevante (`CREATE TABLE IF NOT EXISTS`/
`ALTER TABLE ADD COLUMN` guardado por `PRAGMA table_info`) logo no início,
mesmo que o app já tenha rodado contra aquele banco antes — nunca assumir
que "já rodei um script aqui uma vez" cobre a próxima mudança de schema.
Se o script falhar no meio de um loop, **sempre conferir por leitura** se
alguma escrita parcial (ex.: um sprite sem a linha que deveria referenciá-lo)
ficou órfã antes de tentar de novo — mordeu num sprite+Blob órfão em prod
nesta sessão (Curse Of Amnesia, id 338), limpo antes do reprocessamento.

### Novo Artefato "Monstros" — catálogo implementado + 124 importados (2026-07-21)

Usuário pediu o próximo Artefato do `PLANO-ARTEFATOS.md` §12: **Monstros**
(*"Jogador Mané matou monstro X"*). Passou a URL
`foursouls.com/card-search/?...&card_type=monster` (a busca **real** de
monstro, diferente da usada nas Maldições — aquela tinha
`card_footnotes=c`, essa não) e pediu **só os do jogo base + Requiem**.

- **Schema/API/tela:** mesmo molde simples de Maldição (não o de Tesouro) —
  tabela `monsters` (`name` COLLATE NOCASE UNIQUE, `card_sprite_id`, sem
  campo `locked`), `lib/monsters.ts`, `parseMonsterInput`,
  `app/api/monsters/**`, tela `/artefatos/monstros`
  (`components/MonstersClient.tsx`, cópia do `CursesClient` sem o
  checkbox/classe de bloqueado). Categoria de sprite `monster-card` na
  Oficina + extensão do `.card-art`. Nav "Monstros" com ícone novo
  `IconClaw` (mesmo padrão SVG de traço do `IconSkull`).
- **Achado importante ao raspar a fonte:** a busca por produto (`b2`+`r`)
  devolveu **160 linhas brutas**, com **4 nomes duplicados** (reimpressão/
  variante de arte: `Chest`/`Dark Chest`/`Gold Chest` com um slug `_2`, e
  `Troll Bombs` reimpresso em `r`) — dedup manteve o slug sem sufixo `_2`
  (ou o primeiro visto em empate), resultando em **156 candidatos únicos**.
- ⚠️ **Descoberta igual à das Maldições, mais grave aqui:** o `card_type=monster`
  do site mistura **três coisas diferentes** no "baralho de monstro" do
  jogo físico — monstros de verdade, as próprias cartas de Maldição (as
  mesmas 9 já importadas), e **cartas de Evento** (Good/Bad Event, ex.:
  `Ambush!`, `Chest`, `Devil Deal`, `Secret Room!`) que ficam no baralho
  mas não são criaturas pra "matar". Palpite inicial por padrão de nome
  (`!` no final = evento) **provou-se errado** — bosses de verdade também
  têm `!` no nome (`Mom!`, `Satan!`, `MOTHER!`, `Ultra Greed!`). **Método
  confiável:** buscar a página individual de cada carta
  (`foursouls.com/cards/<produto>-<slug>/`) e extrair o rótulo de tipo real
  que o próprio site imprime ali (ex.: "Base Game V2 Basic Monster Card",
  "Requiem Boss Card", "... Holy/Charmed Monster Card", "... Bad Event
  Card") — 156 fetches individuais, script descartável, resultado
  conferido com o usuário antes de importar.
- **Classificação real dos 156:** Basic Monster (46) + Boss (43) +
  Holy/Charmed Monster (17) + Cursed Monster (10) + Epic Boss (8) = **124
  monstros de verdade** (importados) · Curse (9, já são Maldição — não
  duplicados) · Good Event (15) + Bad Event (8) = 23 cartas de Evento (fora
  de escopo do Artefato Monstro). Usuário confirmou excluir os 32 que não
  são monstro antes de eu rodar a importação.
- **Detalhe técnico:** nomes com apóstrofo vêm como entidade HTML
  (`&#8217;`, ex. `Mom&#8217;s Hand`) na extração via regex sobre o HTML
  cru (ao contrário de ler `alt=` pelo DOM do browser, que já decodifica) —
  decodificados manualmente (`&#8217;` → `'`) antes de gravar; confirmado
  no browser que "Mom's Hand"/"Holy Mom's Eye"/etc. aparecem certos.
- **Import (script descartável, removido depois em ambas as rodadas):**
  mesmo padrão do import de Maldição — baixa a carta oficial, grava sprite
  categoria `monster-card` (Blob em prod / disco em dev) + linha
  `monsters`, idempotente por nome.
- **Armadilha repetida (já catalogada como #11):** a primeira tentativa em
  prod falhou com `no such table: monsters` — o script solto não passa
  pelo `initSchema()` do app. Resolvido rodando o `CREATE TABLE IF NOT
  EXISTS monsters` manualmente em prod antes do import (mesma lição da
  sessão anterior com `curses.locked`, reforça a regra: sempre repetir o
  DDL relevante ao escrever via script solto).
- **Resultado:** local e prod idênticos — `monsters` 0→124,
  `curses`/`treasures`/`sheets`/`players`/`games` sem nenhuma mudança
  colateral (19/155/12/6/0 nos dois bancos). Verificado no browser (tela
  lista 124, paginação, cartas carregam, zero erro no console).
- **Próximo Artefato planejado seria "Salas"** (§13, ainda não pedido nesta
  sessão) — ver `docs/PLANO-ARTEFATOS.md` quando for a vez.

### Fix de frames esticando + troca de frame de 3 telas (2026-07-21, commit `a5db2f1`)

Usuário reportou frames distorcendo em página com muito conteúdo. Diagnóstico,
correção (`border-image-repeat: stretch` → `round` em toda `frames.css`) e o
trade-off de perspectiva aceito estão documentados na armadilha **#10** acima
— não duplicar aqui, só o que não cabia lá:

- **Troca de frame de 3 telas de Artefato** (pedido explícito do usuário,
  visual puro): `MonstersClient.tsx` `frame-chest` → **`frame-dank-depths-skulls`**,
  `TreasuresClient.tsx` `frame-chest` → **`frame-shop-stocked`**,
  `CursesClient.tsx` `frame-chest` → **`frame-cathedral-skulls`**. Eram as
  únicas 3 telas usando `frame-chest`, então nenhuma ficou nela — a variante
  continua existindo no catálogo (`frames.css`/`frames.md`) se algum dia
  precisar de novo.
- `frame-cathedral-skulls` tem um detalhe visual "torto" (as tochas do topo
  ficam parcialmente pra fora da caixa da borda, poking acima do limite
  superior) — **é assim no PNG original**, não foi introduzido pelo fix de
  `round`. Usuário viu ao vivo e achou até melhor que outras frames — não
  mexer nisso sem pedido explícito.
- **`components/Frame.tsx` (`FrameVariant`) estava incompleto:** só listava
  9 das 28 variantes catalogadas em `frames.md`. Ampliado com as 3 novas
  (`frame-dank-depths-skulls`, `frame-shop-stocked`, `frame-cathedral-skulls`)
  — ainda não é a lista completa das 28, só cresce sob demanda conforme uma
  tela passa a usar a variante. Se pegar erro de TS `Type '"frame-X"' is not
  assignable to type 'FrameVariant'` ao trocar uma variante, é só isso —
  adicionar a nova opção no union type.
- **Processo de verificação vale a pena registrar:** antes de aplicar no
  CSS de verdade, simulei os 3 modos (`stretch`/`repeat`/`round`) fora do
  navegador com um script `sharp` descartável pra comparar visualmente sem
  gastar ciclo de browser — mas quando o usuário viu o resultado ao vivo no
  app (não a simulação), notou que o "corte estranho" que a simulação
  mostrava não existia de verdade (era artefato do nearest-neighbor do
  `sharp`, não do `border-image` real do Chrome). **Lição:** simulação fora
  do navegador é boa pra decidir *direção* rápido, mas a palavra final tem
  que ser sempre o app rodando de verdade antes de reportar como pronto —
  já era a regra documentada (ver "Verificação neste ambiente" mais abaixo),
  só reforçando que ela valeu a pena de novo aqui.
- **Nota de processo (não sobre o produto):** esse fix inteiro foi commitado
  em cima da `feat/artefato-maldicoes` (branch que já tinha commits de outro
  assunto — o catálogo de Maldições/Monstros). Usuário apontou que isso
  mistura histórico de assuntos diferentes numa branch só e pediu **branch
  nova por tarefa/sessão** daqui pra frente — reforça o modelo já decidido
  no item 7 de "Decisões de arquitetura" (branch de feature → PR → master),
  só que aplicado de forma mais granular (uma branch por *assunto*, não uma
  branch guarda-chuva reaproveitada pra qualquer coisa que aparecer depois).
  Antes do primeiro commit de uma tarefa nova, checar `git status`/`git
  branch` e abrir uma branch nova se a atual já carrega outro assunto.

## Onde as coisas estão (mapa rápido)

```
app/
  page.tsx                      Ranking (frame-chest-torch)
  jogadores/page.tsx             Lista de jogadores (StatIcon do "+ New Born" via Frame actions)
  jogadores/[id]/avatar/page.tsx Editor unificado: Identidade (nome/história
                                  triste/rosto) + Cabelo + Tesouros (icon/transform)
  partidas/page.tsx               Lista de partidas
  partidas/nova/page.tsx          Wizard de cadastro (passo 3 usa TreasurePicker,
                                    icones+pendentes+campo livre)
  partidas/[id]/page.tsx          Detalhe da partida (coluna "Tesouros": ícones + itens legados)
  sprites/page.tsx                 Oficina (Admin): abas Spritesheets/Sprites — SÓ corta sprites
  artefatos/tesouros/page.tsx      CRUD de Tesouros + posicionamento (TreasuresClient)
  artefatos/maldicoes/page.tsx     CRUD de Maldições, só carta+nome (CursesClient)
  artefatos/monstros/page.tsx      CRUD de Monstros, só carta+nome (MonstersClient)
  spritesheets/ e ornamentos/       REMOVIDAS — redirect → /sprites (next.config.ts)
  backlog/page.tsx                 Backlog: form de bug/melhoria/feature + lista (Admin)
  api/**                           Rotas REST (players, games, characters,
                                    sprites, sheets, ornaments, treasures, curses,
                                    monsters, feedback, players/[id]/avatar/*)
                                    — api/items FOI REMOVIDA (sem consumidor)
lib/
  db.ts               conexão libSQL (async) + helpers all/get/run + schema + settings
                        + ensureColumn() (migração idempotente de coluna nova)
  types.ts            todos os tipos (Player, Game, Sprite, Ornament, Treasure,
                        Curse, Monster, UnlockMode, AvatarRecipe...)
  validation.ts        parsePlayerInput / parseGamePayload / parseTreasureInput /
                        parseCurseInput / parseMonsterInput
  players.ts, characters.ts, games.ts   data layer core
  feedback.ts         data layer do Backlog (list/create/updateStatus/delete)
  sprites.ts, ornaments.ts, treasures.ts, player-avatar.ts   data layer do
                        pipeline de avatar + Tesouros. treasures.ts também
                        tem resolveTreasureId (transacional, casa por nome
                        ou cria pendente — usado por games.ts::createGame)
  curses.ts            data layer de Maldições (list/get/create/update/delete —
                        catálogo puro, sem ornamento/desbloqueio/cascata)
  monsters.ts          data layer de Monstros — mesmo molde de curses.ts
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
  TreasurePicker                       seletor híbrido no wizard: ícones já
                                        cadastrados + chips de pendentes + campo
                                        de texto livre (0+ por jogador)
  BacklogClient                        form + lista do Backlog (Admin)
  SpritesClient                        catálogo de sprites (categorias fixas por
                                        papel de Artefato — `SPRITE_CATEGORIES`)
  TreasuresClient                       CRUD de Tesouros + posicionamento (icon/transform)
  CursesClient                          CRUD de Maldições — mesmo card visual de
                                        Tesouro (reaproveita `.treasure-*` do CSS),
                                        só carta+nome, sem posicionamento
  MonstersClient                        CRUD de Monstros — cópia do CursesClient
                                        sem o campo `locked`
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
  PLANO-ARTEFATOS.md   plano do catálogo de Artefatos (Tesouros implementado;
                        Maldições implementado — 8 dos 158 ainda em triagem;
                        Monstros implementado — 124 importados; Salas
                        planejada, não implementada) — reformulado em
                        2026-07-20 com visão mais ampla; leia antes de mexer
                        nesse sistema
  PLANO-COSMETICOS-AVATAR.md  plano (não implementado) de generalizar o
                        desbloqueio de cosmético pra além de Tesouro (ex.:
                        Personagem por vitória)
  PLANO-QUARTO-JOGADOR.md     plano (não implementado, mais especulativo) de
                        sala visual decorável por jogador com itens
                        desbloqueáveis (monstro, tesouro, tema de frame)
  PLANO-TORNEIOS.md     plano (não implementado, sem formato definido ainda)
                        de torneios como entidade — hoje só `games.tournament_id`
                        existe no schema, sempre `NULL`
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
