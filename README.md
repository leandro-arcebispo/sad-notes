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

- [`HANDOFF.md`](HANDOFF.md) — **leia primeiro se estiver retomando o projeto numa sessão nova**:
  estado atual, decisões já tomadas, armadilhas técnicas conhecidas.
- [`docs/BRIEF.md`](docs/BRIEF.md) — visão, stack, decisões-chave.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — todas as features + ordem de implementação.
- [`docs/STYLE-GUIDE.md`](docs/STYLE-GUIDE.md) — identidade visual (o código vive em `app/globals.css`).

Estado atual: **Fase 6 concluída** — Avatar completo (base + cabelo + N diversos,
reordenáveis, com PNG cacheado via `sharp`; substitui o avatar provisório em
ranking/jogadores/partidas). Fases 0–5 prontas (fundação, jogadores/personagens,
núcleo de partidas, ranking, sprites, ornamentos).
Próxima: **Fase 7 — Polish visual** (backlog restante: torneios, auth, deploy).
