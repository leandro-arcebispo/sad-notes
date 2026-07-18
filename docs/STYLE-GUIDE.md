# IFSN — Style Guide

Identidade visual: **pixel-art, dark / dungeon / sad**. Este guia é para o Claude
e para qualquer humano. A **fonte de verdade em código** é `app/globals.css`
(tokens CSS) — este documento explica o *porquê* e o *como usar*.

## Princípios (não negociáveis)

1. **Sem `border-radius`** — cantos retos (`--radius: 0`).
2. **Sombra dura, sem blur** — deslocada tipo `6px 6px 0 rgba(0,0,0,.5)`, nunca `box-shadow` borrado.
3. **Sem gradiente suave** — corte duro de 2 cores ou textura tingida.
4. **Pixel-art nítida** — `image-rendering: pixelated` em toda imagem; frames crescem aumentando `border-width` (fica "chunky", não borrado).
5. **Frames de sala são os containers de página** — nunca um `div` liso.

## Paleta (tokens em `:root`)

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#000000` | Fundo da página |
| `--panel` | `#1c1512` | Sidebar, cards escuros |
| `--panel-border` | `#3a2c24` | Bordas de UI |
| `--floor` | `#34261a` | Base de painéis/tabela (com textura) |
| `--text` | `#e8ddd0` | Texto principal |
| `--text-dim` | `#8a7a6d` | Texto secundário |
| `--accent` | `#e8b978` | **Dourado** — títulos, foco, destaque |
| `--accent-dim` | `#6b4e2e` | Dourado escuro (bordas de foco) |
| `--blood` | `#a01c1c` | Vermelho — mortes, perigo, deletar |
| `--soul` | `#cdb4ff` | Roxo pálido — almas |
| `--coin` | `#e6c24a` | Moedas |
| `--loot` | `#d7c9a6` | Cartas de loot |

## Tipografia

- **`--font-display`** = `IsaacGame` (pixel) → títulos, nav, **cabeçalho de tabela**, botões.
- **`--font-body`** = `Segoe UI`/system → corpo e formulários (legibilidade).
- Classes: `.title`, `.subtitle`, `.pixel-label`.

## Frames de sala

Container de página via `components/Frame.tsx` (`variant="frame-*"`). Catálogo
completo (28 variantes) e regras em `public/design-system/frames.md`.

```tsx
<Frame variant="frame-chest-torch" title="Ranking"> ...conteúdo... </Frame>
```

Uso por tela (`grep -rn "variant=" app/**/page.tsx components/*Client.tsx` pra
conferir o atual): Ranking → `frame-chest-torch` · Partidas/Nova/Detalhe →
`frame-library` · Jogadores → `frame-utero` · Avatar do jogador → `frame-cathedral`
· Oficina (Admin) → `frame-utero-purple` · Tesouros (Artefatos) → `frame-chest`
· Backlog (Admin) → `frame-library` · Configurações → `frame-brick`.

> ⚠️ `frame-cathedral*` tem um entalhe transparente no topo/base (bug conhecido
> da sheet original) — contra o `--bg` preto some, mas confira antes de usar sobre
> fundo claro.

## Componentes (classes prontas em `globals.css`)

| Classe | O que é |
|---|---|
| `.panel` | Painel base (floor + textura `buried` multiply + sombra dura). |
| `.btn`, `.btn-accent`, `.btn-danger` | Botões pixel (afundam no `:active`). |
| `.field` + `.input`/`.select`/`.textarea` | Bloco de formulário rotulado. |
| `.data-table` | Tabela de dados (cabeçalho dourado texturizado, `tabular-nums`). |
| `.badge`, `.tag` | Rótulos pequenos. |
| `.center-empty` | Estado vazio centralizado. |

## Regra de ouro para tabelas

Larguras via `<colgroup><col style="width:X%">` + `table-layout: fixed`. **Nunca**
`::before/::after` direto num `<tr>` (o browser embrulha num `<td>` fantasma e
desloca todas as colunas) — sempre em `<td>`/`<th>`.
