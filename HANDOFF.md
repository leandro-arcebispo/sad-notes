# HANDOFF — IFSN / Sad Notes

> Para quem retomar este projeto numa nova janela de contexto. Leia isto antes
> de tocar em qualquer coisa — evita repetir bugs já resolvidos e descobertas
> já feitas.

## O que é o projeto

**Isaaquinho's Friends Sad Notes (IFSN)** — app de registro de partidas,
ranking e (no futuro) torneios de *The Binding of Isaac: Four Souls + Requiem*,
para um grupo de ~12 amigos. Estética pixel-art dark/dungeon/sad.

- **Raiz:** `C:\Workspace\sad-notes`
- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · better-sqlite3 · sharp
- **Porta:** 6007 (`npm run dev`, registrado em `C:\Workspace\.claude\launch.json` como `sad-notes`)
- **Banco:** `data/sad-notes.db` (SQLite, WAL) — não versionado
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

### Dados reais do usuário no banco (não são teste — não apagar)

- Jogadores: **Mané** (id 9, tem cabelo customizado aplicado, `hair_color`
  = `'natural'`) e **Robertinho** (id 10, sem customização — usa o fallback
  de rosto base).
- Ao menos 1 partida registrada (o usuário testou o wizard pela própria UI).
- Sprite **"cuia-hair-1"** (categoria `hair-styles`) e ornamento
  **"hairs-cuia-01"** (categoria `cabelo`) — cadastrados pelo próprio usuário.

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

### 7. Scripts de debug descartáveis

Vários bugs foram investigados com scripts `_debug.mjs`/`_clean.mjs` na raiz
do projeto, **sempre removidos depois** (`rm -f`). Se você ver algum desses
arquivos sobrando no repo, pode apagar sem dó — não são parte do projeto.

## Onde as coisas estão (mapa rápido)

```
app/
  page.tsx                      Ranking (frame-chest-torch)
  jogadores/page.tsx             Lista de jogadores (StatIcon do "+ New Born" via Frame actions)
  jogadores/[id]/avatar/page.tsx Editor unificado: Identidade (nome/história
                                  triste/rosto) + Avatar (cabelo+cor+diversos)
  partidas/page.tsx               Lista de partidas
  partidas/nova/page.tsx          Wizard de cadastro
  partidas/[id]/page.tsx          Detalhe da partida
  sprites/page.tsx                 Catálogo de sprites (Fase 4)
  ornamentos/page.tsx              Cadastro de ornamentos (Fase 5)
  backlog/page.tsx                 Backlog: form de bug/melhoria/feature + lista (Admin)
  api/**                           Rotas REST (players, games, characters,
                                    items, sprites, ornaments, players/[id]/avatar/*)
lib/
  db.ts               conexão SQLite + schema completo + settings
  types.ts            todos os tipos (Player, Game, Sprite, Ornament, AvatarRecipe...)
  validation.ts        parsePlayerInput / parseGamePayload
  players.ts, characters.ts, games.ts, items.ts   data layer core
  feedback.ts         data layer do Backlog (list/create/updateStatus/delete)
  sprites.ts, ornaments.ts, player-avatar.ts        data layer do pipeline de avatar
  avatar-geometry.ts   geometria PURA compartilhada (cliente+servidor)
  avatar-compose.ts    composição via sharp + cache PNG (só servidor)
  hair-colors.ts       paleta de tintura de cabelo (hue/sat/brightness),
                        compartilhada entre CSS filter (cliente) e
                        sharp().modulate() (servidor)
  ranking.ts           agregações do ranking
components/
  Frame, Sidebar, ComingSoon           shell/layout
  PlayerAvatar                        avatar (cache PNG ou fallback de rosto)
  JogadoresClient, GameWizard, DeleteGameButton, ItemTagInput
  BacklogClient                        form + lista do Backlog (Admin)
  SpritesClient                        catálogo de sprites
  OrnamentBuilder                       cadastro de ornamentos
  AvatarComposer, AvatarEditor          editor de avatar (Fase 6)
  RankFire                              chama animada do pódio
docs/
  BRIEF.md      visão geral, stack, decisões-chave
  ROADMAP.md    todas as features + status + ordem de implementação
  STYLE-GUIDE.md identidade visual (paleta, tipografia, componentes)
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
