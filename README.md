# IFSN — Isaaquinho's Friends Sad Notes

Registro de partidas, ranking e torneios de **The Binding of Isaac: Four Souls +
Requiem**, para o grupo. App local, estética pixel-art dark/dungeon/sad.

- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · better-sqlite3
- **Porta:** 6007 — `npm run dev`
- **Banco:** `data/sad-notes.db` (criado automaticamente, WAL)

## Rodar

```bash
npm install
npm run dev       # http://localhost:6007
```

## Estrutura

```
app/                  rotas (App Router) — cada tela é uma pasta
components/           Sidebar, Frame, ComingSoon, ...
lib/db.ts             conexão SQLite + settings (cada fase estende o schema)
public/design-system/ frames pixel-art (28), fonte IsaacGame, ícones, texturas
public/sprites/       PNGs recortados pelo Catálogo de Sprites (F1) — não versionados
data/                 banco SQLite local — não versionado
docs/                 BRIEF · ROADMAP (features + ordem) · STYLE-GUIDE
```

## Documentação

- [`docs/BRIEF.md`](docs/BRIEF.md) — visão, stack, decisões-chave.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — todas as features + ordem de implementação.
- [`docs/STYLE-GUIDE.md`](docs/STYLE-GUIDE.md) — identidade visual (o código vive em `app/globals.css`).

Estado atual: **Fase 0 (Fundação) concluída** — scaffold, design system, shell e docs.
Próxima: **Fase 1 — Núcleo de Partidas**.
