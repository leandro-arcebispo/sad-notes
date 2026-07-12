# IFSN — Brief do Projeto

> **Isaaquinho's Friends Sad Notes (IFSN)** — plataforma local de registro de
> partidas, ranking e torneios do board game **The Binding of Isaac: Four Souls
> + Requiem**, para um grupo de ~12 amigos.

## Objetivo

Sair da POC (HTML estático) para um **app real**, com estruturas de dados
sólidas, armazenamento persistente e usabilidade profissional — mantendo a
identidade visual pixel-art dark/dungeon/sad.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **better-sqlite3** — banco em arquivo local (`data/sad-notes.db`, WAL)
- Porta **6007** (`npm run dev`)
- **Git** desde o commit inicial (trabalho cooperativo e rollback fino)

## Princípios de arquitetura

- **Legível sem IA.** Front incluso. Código que qualquer dev do grupo mantém:
  acesso a banco isolado em `lib/`, componentes pequenos e nomeados, tokens de
  estilo centralizados em `app/globals.css`.
- **Ranking é derivado**, nunca digitado à mão — sempre calculado das partidas.
- **Nada de exclusão destrutiva de histórico.** Jogadores/personagens com
  partidas são **desativados**, não apagados (preserva estatísticas).
- **Identidade visual é regra**, não enfeite: toda tela nova usa os frames de
  sala, a paleta e os componentes do `STYLE-GUIDE.md`.

## Decisões-chave (batidas no planejamento)

| Tema | Decisão |
|---|---|
| Ponto de partida | Projeto novo do zero (não reaproveita o `four-souls-tracker`). |
| Armazenamento de sprites | **PNG recortado** numa pasta configurável (`/public/sprites`) + **catálogo no banco** com nome/categoria/caminho e **coordenadas de origem** (x,y,w,h) para re-recorte. |
| Armazenamento de avatar | **Receita em camadas** (base + cabelo + N diversos, com z-order) composta dinamicamente + **cache de PNG achatado** para listas grandes (ranking). |
| Fonte visual | Design system dos mockups (`four-souls-mockups`): 28 frames pixel-art, fonte `IsaacGame`, ícones e texturas — copiados para `public/design-system/`. |

## Público e escopo

- ~12 amigos; um "escrivão" registra as partidas localmente.
- Sem autenticação por ora (backlog). Deploy futuro: VPS/container com volume
  para `data/`.

Ver `ROADMAP.md` para as features e a ordem de implementação, e
`STYLE-GUIDE.md` para a identidade visual.
