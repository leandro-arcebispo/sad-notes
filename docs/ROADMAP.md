# IFSN — Roadmap & Features

Inventário completo das features e a ordem de implementação. Status:
`[ ]` a fazer · `[~]` em andamento · `[x]` pronto.

---

## Features (o quê)

### F1 — Catálogo de Sprites
Base de tudo que é visual/customizável. Usável por quem **não** programa.
- [ ] Importar um sprite-sheet (upload no navegador).
- [ ] Recorte interativo (drag-select) de um sprite na sheet.
- [ ] Nomear + categorizar + salvar como PNG numa **pasta configurável** do projeto.
- [ ] Biblioteca navegável dos sprites recortados, reutilizável por outras telas.
- [ ] Catálogo no banco: nome, categoria, caminho, dimensões, **origem (sheet + x,y,w,h)**.
- Motor de recorte portado de `four-souls-mockups/assets` (crop.js/extract.js, zero deps).

### F2 — Cadastro de Partidas (wizard)
- [ ] **Setup:** almas p/ vencer · edição (Base | Base+Requiem) · nº de players ·
  seleção de personagem (livre | aleatória c/ re-roll) · formato (solo | duplas | trios) ·
  vínculo a **Torneio** ou **Global Board**.
- [ ] **Dados da partida:** duração (min) · nº de rodadas · vencedor(es) · participantes.
- [ ] **Estado final por player:** personagem · teve re-roll · cartas de loot na mão ·
  moedas restantes · itens ao fim · nº de mortes · almas ao fim · venceu?
- [ ] Listagem enxuta (só o essencial) + tela de **detalhe** completa.
- [ ] Pesquisar terminologia exata de Four Souls + Requiem na web ao desenhar o formulário.

### F3 — Ranking (derivado das partidas)
- [ ] Sincronizado automaticamente com o registrado (Global Board).
- [ ] Métricas sugeridas: **win-rate %**, almas/partida, colocação média,
  K/D (mortes), duração média, personagem favorito, streak atual, rating tipo ELO.
- [ ] *(Backlog)* Ranking por torneio específico.

### F4 — Identidade Visual Geral
- [x] Paleta, tipografia e componentes padrão em `app/globals.css` (v1).
- [x] Frames de sala como container de página (`components/Frame.tsx`).
- [x] `STYLE-GUIDE.md` escrito.
- [ ] Refino progressivo: escolher frame por tela, padronizar tabelas/botões/inputs
  conforme as telas nascem.

### F5 — Players & Avatar
- [ ] **CRUD de jogadores** (nome, apelido, cor do token, ativo). — *pré-requisito das partidas; entra cedo, na Fase 1.*
- [ ] **Avatar provisório** (Fase 1): rosto base do Isaac na cor escolhida, usando os
  assets `faces/`/`avatar-*.png` que já temos — dá identidade às tabelas sem depender
  do catálogo de sprites.
- [ ] **Cadastro de ornamentos:** posicionar sprite do catálogo sobre o Isaac base
  (offset/escala/z-order) + categoria (**cabelo** | **diverso**). Último diverso por cima.
- [ ] **Customização de avatar:** rosto base (Isaac em várias cores) + 1 cabelo + N diversos.
- [ ] Avatar usado em ranking, jogadores e partidas (receita + cache PNG). **Substitui o
  avatar provisório** em todas as telas.

### Backlog geral
- [ ] Torneios como entidade completa (chaveamento/registro atrelado + ranking próprio).
- [ ] Autenticação / multiusuário.
- [ ] Deploy (VPS/container com volume em `data/`).

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
| **1 — Jogadores & Personagens (F5-base)** | Players CRUD (nome, apelido, cor, ativo) · seed de personagens (base + Requiem) · **avatar provisório** (rosto base por cor) | F0 | `[ ]` |
| **2 — Núcleo de Partidas (F2)** | Schema expandido de `games`/`game_players` · wizard completo (setup → jogadores → estado final) · listagem + detalhe · itens por nome (autocomplete) | **Fase 1** | `[ ]` |
| **3 — Ranking (F3)** | Agregações sincronizadas, métricas novas, Global Board | Fase 2 | `[ ]` |
| **4 — Catálogo de Sprites (F1)** | Import + recorte + salvar + biblioteca | F0 | `[ ]` |
| **5 — Ornamentos (F5a)** | Posicionamento sobre Isaac base, usando o catálogo | Fase 4 | `[ ]` |
| **6 — Avatar completo (F5b)** | Customização + storage (receita + cache) · substitui o provisório nas telas | Fase 5 | `[ ]` |
| **7 — Polish visual (F4)** | Frames por página, componentes padronizados, style guide final | tudo | `[ ]` |
| **Backlog** | Torneios (entidade + ranking próprio), auth, deploy | — | `[ ]` |

> **Racional:** Fases 1→3 são o valor central → destravam uso real cedo, com o
> jogador básico como pré-requisito explícito das partidas. O pipeline de avatar
> (Fases 4→6) é o mais complexo/novo e é cosmético, então vem depois e só troca o
> avatar provisório. A identidade visual entra como fundação na Fase 0 e é
> refinada progressivamente. Itens e Torneios não viram fase (itens nascem por
> nome no cadastro; torneio é `tournament_id` nulo = Global Board até o backlog).
