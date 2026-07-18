# IFSN — Roadmap & Features

Inventário completo das features e a ordem de implementação. Status:
`[ ]` a fazer · `[~]` em andamento · `[x]` pronto.

---

## Features (o quê)

### F1 — Catálogo de Sprites ✅
Base de tudo que é visual/customizável. Usável por quem **não** programa.
- [x] Importar um sprite-sheet (upload no navegador).
- [x] Recorte interativo (drag-select) de um sprite na sheet, com zoom (2×–12×).
- [x] Nomear + categorizar + salvar como PNG numa **pasta configurável** (`public/sprites/<cat>`).
- [x] Biblioteca navegável dos sprites recortados (agrupada por categoria) + excluir.
- [x] Catálogo no banco: nome, categoria, caminho, dimensões, **origem (sheet + x,y,w,h)**.
- Recorte feito no **cliente com Canvas** (codifica PNG nativo) em vez do encoder Node
  do mockup — mais simples, com prévia instantânea; servidor só grava o arquivo + cataloga.

### F2 — Cadastro de Partidas (wizard) ✅
- [x] **Setup:** almas p/ vencer · edição (Base | Base+Requiem) · nº de players ·
  seleção de personagem (livre | aleatória c/ re-roll) · formato (solo | duplas | trios) ·
  vínculo a **Global Board** (torneios no backlog).
- [x] **Dados da partida:** duração (min) · nº de rodadas · vencedor(es) · participantes.
- [x] **Estado final por player:** personagem · teve re-roll · cartas de loot na mão ·
  moedas restantes · itens ao fim · nº de mortes · almas ao fim · venceu?
- [x] Listagem enxuta (só o essencial) + tela de **detalhe** completa + excluir.
- [x] Wizard de 3 passos com sorteio/re-roll de personagens, times (duplas/trios) e
  Tesouros possuídos ao fim (seletor por ícone — ver F6; itens por nome livre
  foi o formato original, aposentado na feature Artefatos, mantido só como
  histórico read-only nas partidas antigas).

### F3 — Ranking (derivado das partidas) ✅
- [x] Sincronizado automaticamente com o registrado (Global Board), sempre calculado.
- [x] Colunas: Vitórias · Partidas · Win% · Almas · **Moedas** · Mortes · Streak.
- [x] Pódio (top 3) com chama animada por posição (`fire-rank1/2/3`); ordena por
  vitórias ↓, desempate win% ↓ e almas ↓.
- [ ] *(Backlog)* Métricas extras (colocação média, duração, personagem favorito,
  rating tipo ELO) e ranking por torneio específico.

### F4 — Identidade Visual Geral
- [x] Paleta, tipografia e componentes padrão em `app/globals.css` (v1).
- [x] Frames de sala como container de página (`components/Frame.tsx`).
- [x] `STYLE-GUIDE.md` escrito.
- [ ] Refino progressivo: escolher frame por tela, padronizar tabelas/botões/inputs
  conforme as telas nascem.

### F5 — Players & Avatar
- [x] **CRUD de jogadores** (nome, apelido, cor do token, ativo). — *pré-requisito das partidas; entregue na Fase 1.*
- [x] **Avatar provisório** (Fase 1): rosto base do Isaac na cor escolhida (6 faces),
  com anel na cor do token — dá identidade às tabelas sem depender do catálogo de sprites.
- [x] **Cadastro de ornamentos:** posicionar sprite do catálogo sobre o Isaac base
  (offset/escala) + categoria (**cabelo** | **diverso**). O "último diverso por cima"
  é resolvido na tela de customização do avatar (Fase 6), pela ordem de seleção — não
  é um campo do ornamento em si.
- [x] **Customização de avatar:** rosto base (Isaac em várias cores) + 1 cabelo + N diversos,
  com reordenação (o último/mais acima na pilha aparece por cima). *(A categoria "diverso"
  livre foi aposentada na feature Artefatos — F6: todo cosmético novo além do cabelo nasce
  como Tesouro, gated por desbloqueio; o pipeline de posicionamento é o mesmo.)*
- [x] Avatar usado em ranking, jogadores e partidas (receita em `player_ornaments` + cache
  PNG gerado via `sharp`). **Substitui o avatar provisório** em todas as telas (fallback
  automático pro rosto base quando o jogador não tem avatar customizado ainda).

### F6 — Artefatos & Desbloqueio de Cosméticos ✅
Plano completo (arquitetura, decisões, verificação fase a fase) em
`docs/PLANO-ARTEFATOS.md`. Resumo:
- [x] **Tesouros** (`/artefatos/tesouros`, menu "Artefatos"): CRUD de itens do
  jogo — nome, ícone (posição livre), transformação (posição correta), carta
  ilustrativa. Reaproveita o pipeline de ornamentos/avatar sem duplicar
  matemática de posicionamento.
- [x] **Sistema de desbloqueio plugável** (`lib/unlocks.ts`): 1º modo
  "terminar partida com o item"; escalável pra outros modos no futuro
  (vitórias acumuladas, concessão manual, conquistas) sem tocar no resto.
- [x] **Oficina** virou só cortador de sprites (perdeu o passo Ornamentos) e
  mudou de lugar no menu (principal → Admin).
- [x] **Wizard de partida:** texto livre de itens → seletor de Tesouros por
  ícone (0+). `items`/`game_player_items` viraram histórico read-only.
- [x] **Avatar do jogador:** seção "Tesouros" com toggle por cosmético,
  bloqueados aparecem esmaecidos; enforcement real no servidor.

### Backlog geral
- [ ] Torneios como entidade completa (chaveamento/registro atrelado + ranking próprio).
- [ ] Autenticação / multiusuário.
- [ ] Deploy (VPS/container com volume em `data/`).
- [ ] *(da feature Artefatos)* Tela própria de autoria de cabelo (o
  `OrnamentBuilder` saiu da Oficina mas fica reservado pra isso).
- [ ] *(da feature Artefatos)* Outros modos de desbloqueio (vitórias
  acumuladas, concessão manual, conquistas) — o sistema já nasce plugável.
- [ ] *(da feature Artefatos)* Reposicionamento do ícone por jogador (hoje a
  posição é autorada uma vez no Tesouro, vale pra todo mundo).

---

## Ordem de implementação (quando)

Reordenada para **resolver pré-requisitos**: cada fase só depende das anteriores.
O núcleo de partidas exige o jogador *básico* (não o avatar customizado), então
"Jogadores" vira uma fase própria e cedo. O avatar customizado (cadeia
sprites→ornamentos→composição) é cosmético e vem depois, **substituindo** um
avatar provisório (rosto base por cor) introduzido já na Fase 1.

**Cadeia de valor:** Fundação → Jogadores(+personagens) → Partidas → Ranking.
**Cadeia do avatar:** Catálogo de Sprites → Ornamentos → Avatar completo.

| Fase | Entrega | Depende de | Status |
|---|---|---|---|
| **0 — Fundação** | Pasta + git, scaffold Next.js, `db.ts`, design system importado, shell (sidebar + frame), docs (BRIEF/ROADMAP/STYLE-GUIDE) | — | `[x]` |
| **1 — Jogadores & Personagens (F5-base)** | Players CRUD (nome, apelido, cor, ativo) · seed de personagens (base + Requiem) · **avatar provisório** (rosto base por cor) | F0 | `[x]` |
| **2 — Núcleo de Partidas (F2)** | Schema expandido de `games`/`game_players` · wizard completo (setup → jogadores → estado final) · listagem + detalhe · itens por nome (autocomplete) | **Fase 1** | `[x]` |
| **3 — Ranking (F3)** | Agregações sincronizadas, métricas novas, Global Board | Fase 2 | `[x]` |
| **4 — Catálogo de Sprites (F1)** | Import + recorte + salvar + biblioteca | F0 | `[x]` |
| **5 — Ornamentos (F5a)** | Posicionamento sobre Isaac base, usando o catálogo | Fase 4 | `[x]` |
| **6 — Avatar completo (F5b)** | Customização + storage (receita + cache) · substitui o provisório nas telas | Fase 5 | `[x]` |
| **7 — Polish visual (F4)** | Frames por página, componentes padronizados, style guide final | tudo | `[ ]` |
| **Backlog** | Torneios (entidade + ranking próprio), auth, deploy | — | `[ ]` |

> **Racional:** Fases 1→3 são o valor central → destravam uso real cedo, com o
> jogador básico como pré-requisito explícito das partidas. O pipeline de avatar
> (Fases 4→6) é o mais complexo/novo e é cosmético, então vem depois e só troca o
> avatar provisório. A identidade visual entra como fundação na Fase 0 e é
> refinada progressivamente. Itens e Torneios não viram fase (itens nascem por
> nome no cadastro; torneio é `tournament_id` nulo = Global Board até o backlog).
