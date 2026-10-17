# REVISÃO — Registro de Partidas (2026-10-16)

> Levantamento feito com o app rodando e medições reais (não leitura de
> código). Uma partida de teste foi criada e removida; as 10 partidas reais
> ficaram intactas.

## ✅ Atacado em 2026-10-16 (branch `fix/revisao-partidas`)

| # | Item | Resultado medido |
|---|---|---|
| 1 | Perda de dados | rascunho em `localStorage`; sobrevive a sair/voltar **e** a recarga total |
| 2 | Celular | largura útil na Run **159px → 255px (+60%)**, sem rolagem horizontal |
| 3 | Navegação | voltar não cai mais no formulário de criar; `<a href>` da Run virou `<Link>` |
| 4 | Duração | **49448 min → 61 min**; Run avisa "parada há N dias" |
| 5 | Tipografia | Run com **uma família** de fonte, 12 → 7 combinações |
| 5b | Ícones | emoji e SVG genérico → arte do jogo (ver `PROPOSTA-ICONES.md`) |
| — | Almas negativas | placar da Run clampa em 0, como a finalização já fazia |

**Fica pendente:** o item 6 (partidas em andamento indistinguíveis na lista)
e a conversão dos ~54 `fontSize` inline pros tokens novos — nenhum dos dois
entrou na ordem combinada.

---

---

## 1. 🔴 Perda de dados nos formulários

**Nenhum formulário do app guarda rascunho.** Zero `localStorage`, zero
`sessionStorage`, zero aviso de "sair sem salvar" (confirmado por varredura em
`components/`, `app/` e `lib/`).

**Medido na tela de Finalizar:** preenchidos 12 campos numéricos + escolhido 1
Tesouro → clicado "← Voltar" → voltado → **tudo zerado**
(`0,0,0,0,0,0,0,0,0,0,0,0`, Tesouro sumido).

Por que dói mais aqui que em outro lugar: numa mesa de 3 são **18 campos**,
preenchidos depois de uma ou duas horas de jogo, por alguém cansado, no
celular — onde o navegador descarta aba em segundo plano sozinho.

- `components/GameFinish.tsx` — 7 `useState`, nada persistido.
- `components/GameSetup.tsx` — 10 `useState`, nada persistido.
- `components/RunClient.tsx` — **não** tem o problema: o estado mora no
  servidor (eventos). A exceção é a **fila local de eventos pendentes**, que é
  `useState` e some na navegação (ver item 3).

**Caminhos possíveis:** rascunho em `localStorage` por partida
(`draft:finish:<gameId>`), ou gravar parcial no servidor. O primeiro é bem mais
barato e resolve 90% do caso.

---

## 2. 🔴 Layout quebrado no celular

**O app inteiro tem UMA media query em ~1800 linhas de CSS**
(`app/globals.css:1801`), e ela só ajusta `.run-board` e `.run-evt`. **Não
toca `.main` nem `.sidebar`.**

- `.sidebar` → `position: fixed; width: 216px`
- `.main` → `margin-left: 216px`, sem breakpoint

**Medido em viewport de celular: sobram 159px de conteúdo.** A Run — a tela
escrita explicitamente "pensada pra um celular em cima da mesa" — é a mais
prejudicada pelo problema.

**12 alvos de toque abaixo de 44px.** O pior: o `×` que apaga evento no Diário
tem **18×19px** — difícil de acertar no dedo, e é ação destrutiva.

---

## 3. 🟡 Navegação

**Voltar da Run cai no formulário de criar partida.** Medido: criada partida →
`/partidas/28/run` → voltar → `/partidas/nova`. Você acabou de começar um jogo
e o botão voltar te oferece "criar um jogo".
→ `components/GameSetup.tsx:142` usa `router.push` onde deveria ser
`router.replace` (padrão para "criei o recurso, não volte pro formulário").

**O "← Voltar" da Finalização não volta.** Leva ao detalhe
(`components/GameFinish.tsx:321`), mas você veio da Run.

**`components/RunClient.tsx:389` usa `<a href>` em vez de `<Link>`.** O botão
"Finalizar →" **recarrega a página inteira**: engasgo no celular e, pior,
**descarta a fila local de eventos pendentes** — se algo ainda não subiu
quando você toca Finalizar, some.

*(Os demais fluxos estão certos: finalizar e abandonar têm `redirect` de guarda
na página, então voltar neles não quebra.)*

---

## 4. 🟡 A duração infla sozinha

A partida 19 mostra **"⏱ 49448 min"** — 34 dias. `deriveActiveMinutes` soma
tempo de relógio enquanto a partida está aberta, e ninguém pausa ao largar a
mesa: só vai embora.

Pior: esse número vai **pré-preenchido** no campo Duração da finalização.

Estado atual do banco local: **4 partidas abertas**, a mais velha há **71
dias** (#16), além de #17, #19 e #22.

**Caminhos:** teto na duração sugerida, auto-pausa por inatividade, ou um
aviso de "esta partida está aberta há N dias" na lista. Vale também pensar em
como encerrar as 4 que estão penduradas.

---

## 5. 🟡 Almas negativas no placar

Na Run, um jogador aparece com **👻 -1**. `alma_perdida` e `alma_roubada`
podem empurrar abaixo de zero.

A tela de Finalizar **clampa** em zero (`Math.max(0, d.souls)`), a Run **não**.
Duas telas mostrando números diferentes pro mesmo dado, e "-1 alma" não
significa nada pra quem olha o placar.

---

## 6. 🟡 Partidas em andamento são indistinguíveis na lista

Três linhas idênticas: `2026-09-12 · Em andamento · Base · Solo · 2 · 4`. Não
dá pra saber qual continuar sem abrir uma por uma.

A lista mostra os **vencedores** das finalizadas, mas nada que identifique as
**abertas** — justamente as acionáveis. Faltam os nomes dos jogadores, a hora,
ou o placar parcial.

A data também sai em **ISO cru** (`2026-09-12`), enquanto a tela de torneio
formata em pt-BR.

---

## 7. 🟡 Tipografia sem padrão

Combinações fonte+tamanho coexistindo **na mesma tela**:

| Tela | Combinações |
|---|---|
| Run | **12** |
| Finalizar | 7 |
| Setup | 6 |

- **O `×` do Diário renderiza em Arial** — fonte que não existe no design
  system. `.run-log-del` zera `background`/`border` mas não declara `font`, e
  `<button>` cai no default do navegador em vez de herdar.
- **Segoe UI vaza em 11 classes** que nunca declararam `font-family`:
  `.muted`, `.run-log-text`, `.treasure-chip`, `.treasure-result`,
  `.tourney-name`, `.center-empty`, `.item-tag`, `.row-link`,
  `.winners-cell`, `.items-cell`, `.tourney-roster-chip`. Resultado: a dica
  embaixo do campo é Segoe UI e o label em cima é Upheaval.
- **`.run-stat-icon` usa `font-size: 0.9em` e computa 12.6px.** Pixel font em
  tamanho fracionário renderiza borrada — o oposto do `image-rendering:
  pixelated` que o resto do app persegue.
- **54 `fontSize` inline hardcoded** nos componentes, com 8 valores diferentes
  (10, 11, 12, 13, 15, 18, 19, 20). Não existe escala tipográfica.

**Caminho:** tokens de escala no `globals.css` (`--fs-1`…`--fs-6`) + uma regra
que force a fonte de display nos elementos de UI. Sem isso volta a espalhar.

---

## 8. Ícones genéricos → proposta temática

Ver `docs/PROPOSTA-ICONES.md`.
