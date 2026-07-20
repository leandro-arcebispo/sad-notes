# PLANO — Torneios

> Plano inicial, aberto em **2026-07-20**. Ainda **sem formato definido** —
> este documento existe pra registrar o contexto e o que já existe no
> schema, não pra prescrever uma arquitetura. Não iniciar implementação sem
> antes fechar o formato com o usuário.

## 1. Contexto

Hoje o grupo joga em **mesas livres** ("Global Board"): serve pra treinar o
jogo, testar formatos mais rápidos, e alimentar estatísticas/ranking globais.
Não existe torneio de verdade ainda — é uma ideia futura, **sem formato
decidido** ("por hora não temos um formato", palavras do usuário).

## 2. O que já existe no schema (preparado, não usado de verdade)

- `games.tournament_id` (`INTEGER`, nullable) já existe desde o núcleo de
  partidas — hoje é **sempre `NULL`**, e `NULL` = "Global Board" (mesa
  livre). Nenhuma linha até 2026-07-20 tem esse campo preenchido (0 torneios
  reais, em local ou prod).
- `docs/ROADMAP.md` já lista **"Torneios como entidade completa
  (chaveamento/registro atrelado + ranking próprio)"** no backlog geral —
  este documento é o detalhamento futuro desse item, quando houver formato.
- `docs/ROADMAP.md` (F3 — Ranking) também já prevê **"ranking por torneio
  específico"** como métrica extra de backlog — mesma dependência.

## 3. O que ainda não sabemos (bloqueado até o usuário decidir)

- **Formato de torneio:** eliminatória simples/dupla, suíço, todos-contra-
  todos, grupos + mata-mata, outro? Sem isso não dá pra desenhar
  chaveamento/tabela.
- **Duração/cadência:** torneio é um evento único (uma tarde) ou se estende
  por várias sessões de jogo ao longo de semanas?
- **Inscrição:** todo jogador ativo entra automaticamente, ou existe
  inscrição/lista de participantes por torneio?
- **Pontuação/critério de vitória do torneio** (separado do critério de
  vitória de uma partida individual, que já existe).
- **Relação com o Quarto do Jogador:** `docs/PLANO-QUARTO-JOGADOR.md` já
  especula sprites de troféu de torneio como decoração desbloqueável pro
  vencedor — isso é só uma ideia futura citada lá, não uma dependência que
  bloqueia este plano.

## 4. Esqueleto de arquitetura (especulativo — não implementar ainda)

Só pra não perder o raciocínio de onde isso provavelmente encaixaria, **sem
comprometer nenhuma decisão**:

- Uma tabela `tournaments` nova (nome, formato, datas, status) seria o alvo
  natural de `games.tournament_id` deixar de ser sempre `NULL`.
- O Ranking (`lib/ranking.ts`) já agrega por `game_players` — filtrar por
  `games.tournament_id` pra um ranking "desse torneio" é uma extensão de
  query, não uma reformulação (`docs/ROADMAP.md` já antecipa isso).
- Chaveamento (se o formato escolhido precisar) seria uma estrutura nova,
  totalmente dependente do formato — não dá pra desenhar sem essa decisão.

## 5. Status

- [ ] Formato de torneio definido — **bloqueador de tudo o resto**.
- [ ] Schema (`tournaments` e o que mais o formato exigir).
- [ ] UI de cadastro/acompanhamento de torneio.
- [ ] Ranking por torneio (extensão do `lib/ranking.ts` existente).
