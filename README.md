# IFSN — Isaaquinho's Friends Sad Notes

Registro de partidas, ranking e torneios de **The Binding of Isaac: Four Souls +
Requiem**, para o grupo. Estética pixel-art dark/dungeon/sad.

- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript
- **Banco:** [libSQL/Turso](https://turso.tech) (SQLite-compatível) — em produção;
  arquivo local em dev
- **Imagens:** [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) — em
  produção; pasta `public/` em dev
- **Porta (dev):** 6007

## Rodar localmente

Sem nenhuma conta na nuvem: sem as variáveis de ambiente, o app usa um arquivo
SQLite local (`data/sad-notes.db`) e grava as imagens em `public/`.

```bash
npm install
npm run dev          # http://localhost:6007
```

Para simular produção localmente: `npm run build && npm run start`.

## Variáveis de ambiente

Copie [`.env.production.local.example`](.env.production.local.example) para
`.env.production.local`. Esse nome é proposital: o Next só carrega
`.env.production.local` quando `NODE_ENV=production` (ou seja, em `npm run
build && npm run start`) — **nunca** em `npm run dev`. Um `.env.local` comum
seria carregado em ambos e faria o dev "local" conversar com o Turso remoto
pela rede a cada query, deixando toda página lenta sem motivo. Todas são
**opcionais em dev** (há fallback local) e **necessárias em produção**:

| Variável | Para quê |
|---|---|
| `TURSO_DATABASE_URL` | URL do banco Turso (`libsql://...`). Sem ela → `file:./data/sad-notes.db`. |
| `TURSO_AUTH_TOKEN` | Token de acesso ao Turso. |
| `BLOB_READ_WRITE_TOKEN` | Token do Vercel Blob (injetado automaticamente ao anexar um Blob store). Sem ele → grava em `public/`. |
| `BASIC_AUTH_PASSWORD` | Senha da trava de acesso (HTTP Basic Auth). Sem ela, a trava fica **desligada**. |
| `BASIC_AUTH_USER` | Usuário do login (opcional, default `amigos`). |

## Deploy no Vercel

O app foi arquitetado para o Vercel (serverless): banco remoto (Turso) e imagens
em object storage (Blob), sem escrever em disco.

1. **Banco Turso** — via [turso.tech](https://turso.tech) (CLI ou dashboard):
   ```bash
   turso auth login
   turso db create sad-notes
   turso db show sad-notes --url        # → TURSO_DATABASE_URL
   turso db tokens create sad-notes     # → TURSO_AUTH_TOKEN
   ```
   Não precisa criar tabelas — o schema é criado no primeiro acesso
   (`CREATE TABLE IF NOT EXISTS`). O banco sobe vazio.

2. **Importar o repo** em [vercel.com/new](https://vercel.com/new) (Next.js é
   detectado automaticamente).

3. **Anexar o Blob**: no projeto, **Storage → Create → Blob** e conecte ao
   projeto (injeta `BLOB_READ_WRITE_TOKEN`). ⚠️ **Escolha acesso _Public_** — os
   sprites/avatares são servidos como URLs públicas em `<img>` e carregados no
   Canvas. Um store **privado quebra** (`Cannot use public access on a private
   store`) e o modo de acesso **não pode ser mudado depois de criado** — se
   errar, apague e crie um novo público.

4. **Env vars** em *Settings → Environment Variables*: `TURSO_DATABASE_URL`,
   `TURSO_AUTH_TOKEN`, `BASIC_AUTH_PASSWORD` (e `BASIC_AUTH_USER` se quiser).

5. **Deploy** (ou Redeploy, se já tinha buildado antes de setar as vars).

> ⚠️ Sem `TURSO_DATABASE_URL` em produção, o app cai no fallback de arquivo local
> e quebra (filesystem read-only do Vercel). Configure as env vars **antes** do
> deploy.

## Trava de acesso

`middleware.ts` protege todas as páginas e rotas de API com HTTP Basic Auth
quando `BASIC_AUTH_PASSWORD` está definido. Em dev (sem a variável) fica liberado.

## Arquitetura (mapa rápido)

```
app/                  rotas (App Router) — páginas (server components async) + api/**
components/           Sidebar, Frame, AvatarEditor, GameWizard, ...
lib/
  db.ts               conexão libSQL (async) + helpers all/get/run + schema + seed
  storage.ts          putImage/deleteImage — Blob (prod) / public/ (dev)
  asset-url.ts        assetUrl() — resolve URL do Blob OU caminho local
  avatar-canvas.ts    composição do avatar via Canvas (no navegador)
  avatar-geometry.ts  geometria pura compartilhada (cliente/servidor)
  players/games/...   camada de dados (toda assíncrona)
public/design-system/ frames pixel-art (28), fontes, ícones, texturas
data/                 banco SQLite local (dev) — não versionado
docs/                 BRIEF · ROADMAP · STYLE-GUIDE
```

Toda a camada de dados é **assíncrona** (libSQL). A composição do avatar acontece
no **cliente** (Canvas) e o PNG é enviado pra storage — não há `sharp` no servidor.

## Documentação

- [`HANDOFF.md`](HANDOFF.md) — **leia primeiro ao retomar o projeto**: estado
  atual, decisões tomadas, armadilhas técnicas conhecidas.
- [`docs/BRIEF.md`](docs/BRIEF.md) · [`docs/ROADMAP.md`](docs/ROADMAP.md) ·
  [`docs/STYLE-GUIDE.md`](docs/STYLE-GUIDE.md)
