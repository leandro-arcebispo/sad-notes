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
- [ ] CRUD de jogadores (nome, apelido, cor do token).
- [ ] **Cadastro de ornamentos:** posicionar sprite do catálogo sobre o Isaac base
  (offset/escala/z-order) + categoria (**cabelo** | **diverso**). Último diverso por cima.
- [ ] **Customização de avatar:** rosto base (Isaac em várias cores) + 1 cabelo + N diversos.
- [ ] Avatar usado em ranking, jogadores e partidas (receita + cache PNG).

### Backlog geral
- [ ] Torneios como entidade completa (chaveamento/registro atrelado + ranking próprio).
- [ ] Autenticação / multiusuário.
- [ ] Deploy (VPS/container com volume em `data/`).

---

## Ordem de implementação (quando)

Prioriza valor real primeiro e respeita dependências (avatar depende do catálogo).

| Fase | Entrega | Depende de | Status |
|---|---|---|---|
| **0 — Fundação** | Pasta + git, scaffold Next.js, `db.ts`, design system importado, shell (sidebar + frame), docs (BRIEF/ROADMAP/STYLE-GUIDE) | — | `[x]` |
| **1 — Núcleo de Partidas (F2)** | Players CRUD + characters, schema expandido de `games`/`game_players`, wizard completo, listagem + detalhe | F0 | `[ ]` |
| **2 — Ranking (F3)** | Agregações sincronizadas, métricas novas, Global Board | Fase 1 | `[ ]` |
| **3 — Catálogo de Sprites (F1)** | Import + recorte + salvar + biblioteca | F0 | `[ ]` |
| **4 — Ornamentos (F5a)** | Posicionamento sobre Isaac base, usando o catálogo | Fase 3 | `[ ]` |
| **5 — Avatar (F5b)** | Customização + storage (receita + cache) + uso nas telas | Fase 4 | `[ ]` |
| **6 — Polish visual (F4)** | Frames por página, componentes padronizados, style guide final | tudo | `[ ]` |
| **Backlog** | Torneios completos, auth, deploy | — | `[ ]` |

> **Racional:** F2+F3 são o valor central → destravam uso real cedo. O pipeline
> de avatar (F1→F5) é o mais complexo/novo e vem depois. A identidade visual
> entra como fundação na Fase 0 e é refinada progressivamente.
