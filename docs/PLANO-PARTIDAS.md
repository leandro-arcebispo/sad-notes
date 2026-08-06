# PLANO — Registro de Partidas (reformulação)

> Aberto em **2026-08-06**. Substitui o desenho da Fase 2 (`docs/ROADMAP.md`
> F2), que continua valendo como histórico do que existe hoje.
>
> **Fonte de verdade deste sistema.** As regras do jogo apuradas no §2 foram
> confirmadas com o usuário — não re-perguntar. Ler antes de tocar em
> `lib/games.ts`, `components/GameWizard.tsx` ou no schema de `games`.

---

## 0. Por que reformular

O registro de partidas + o ranking são **o motivo do app existir**. O que
existe hoje funciona, mas é um formulário retrospectivo disfarçado de wizard:

- Uma partida **só passa a existir quando acaba**. O `GameWizard` mantém tudo
  em `useState` e dispara um único `POST /api/games` no final; `createGame`
  insere jogo + jogadores + tesouros numa transação atômica.
- Por isso "Duração da partida" está na etapa de **Setup** — não por descuido,
  mas porque *todas* as etapas são preenchidas depois do jogo. O wizard não são
  "as fases da partida", são "as abas de um formulário".
- Não existe onde gravar nada durante o jogo.
- Não dá pra pausar, retomar, nem jogar em dois dias.
- Multi-dispositivo é impossível por construção (o estado mora num navegador).

**Momento certo pra fazer isso:** o banco local tem só **4 partidas**, todas de
teste (id 3, 7, 8, 12 — nas quatro, `duration_min == rounds`, o que denuncia
preenchimento aleatório). Não há histórico real pra migrar.

---

## 1. As três decisões estruturantes

### 1.1 A partida vira uma entidade com ciclo de vida

Deixa de ser "uma linha criada no fim" e passa a ser criada no Setup e mutada
até a finalização.

```
setup → (lobby) → andamento ⇄ pausada → finalizada
                       ↘ abortada
```

Tudo o mais — pause, registro ao vivo, sessão multi-celular, badges — decorre
disso. Sem isso, nada decorre.

### 1.2 O que acontece durante a partida é um log de eventos append-only

Em vez de uma coluna nova pra cada coisa que o grupo queira anotar
(`deaths`, `pvp_kills`, `monsters_killed`, `curses_taken`, …), **tudo é uma
linha em `game_events`**, com um registro de tipos em código
(`lib/game-events.ts`) no mesmo padrão plugável que já funcionou em
`lib/unlocks.ts`.

Por que isso é o certo aqui, e não over-engineering:

- **Tipo de evento novo = uma entrada no registro, zero migração.**
- **Estatística nova = query nova, não schema novo.** "Quem mais morre",
  "monstro que mais mata", "maldição mais sofrida", "quem mais mata jogador"
  já estão gravados no dia em que o evento nasce, mesmo que a tela só apareça
  meses depois. É isso que separa *escalável* de *vamos ter que registrar tudo
  de novo*.
- **É o formato natural do multi-dispositivo:** cada celular *acrescenta*
  linhas, ninguém *edita* a mesma linha. Merge sem conflito, de graça.
- **Undo = soft-delete de um evento**, não recálculo de contador.
- **Dá consumidor aos catálogos de Artefatos.** Os **124 Monstros** e **15
  Maldições** cadastrados hoje não são usados em lugar nenhum do app. É o
  registro em andamento que os transforma em dado — e destrava modos de
  desbloqueio novos ("derrotou o Boss X") no `unlocks.ts`, que já é plugável.

### 1.3 O ranking continua lendo o snapshot final, não os eventos

**Decisão consciente.** `lib/ranking.ts` não muda de fonte: continua agregando
`game_players`. Os eventos são a camada de *insight/badge*, não a fonte de
verdade do placar.

Motivo: alma pode ser roubada e destruída (§2.2), então a soma de eventos
**não reconcilia** com o estado final por natureza — e partidas registradas
retroativamente não terão evento nenhum. Derivar o ranking de eventos criaria
um pesadelo de reconciliação em troca de nada.

O que os eventos fazem é **pré-preencher** a finalização e alimentar
estatísticas/conquistas.

---

## 2. Regras do jogo apuradas com o usuário (2026-08-06) — não re-perguntar

### 2.1 Almas bônus
São almas expostas na mesa o tempo todo, ganháveis por gatilhos diversos
(ex.: primeiro jogador a ter 25 moedas). **Têm cartas próprias** → viram um
**Artefato próprio no futuro** (candidato pro `docs/PLANO-ARTEFATOS.md`).
**Por hora: só uma flag no setup** ("essa partida usa almas bônus?").

> Consequência de desenho: o evento `alma_ganha` já nasce com `ref_type`/
> `ref_id`/`ref_name`, então quando o Artefato "Almas Bônus" existir, ele
> encaixa sem migração — hoje grava só o nome/livre.

### 2.2 Almas podem ser perdidas, roubadas e destruídas
Uma alma conquistada **pode ser perdida** por vários eventos. Pode ser
**roubada** (troca de dono) ou **destruída** (sai do jogo).
→ Três eventos distintos: `alma_ganha`, `alma_perdida`, `alma_roubada`.
→ É a razão do §1.3.

### 2.3 Morte e PvP kill
- Toda morte, seja causada por jogador, monstro ou qualquer outra coisa,
  conta **+1 morte** pra quem morreu.
- Se houve um jogador responsável, ele leva **+1 PvP kill**.
- O que a morte *rende* mecanicamente depende da build e **não importa** pro
  registro.

→ Um evento só (`morte`), com a contraparte (o matador) **opcional**.
Morte é dado neutro, não penalidade — decisão de 2026-07-13 que tirou "Mortes"
do ranking; continua valendo.

### 2.4 Duplas/trios: almas contam pro time
`souls_to_win` é objetivo **do time**, não do jogador. As almas continuam
gravadas por jogador (`game_players.souls`) e são **somadas por time** pra
avaliar a vitória e pra exibir na Mesa.

### 2.5 Rodadas e turnos — deliberadamente frouxo
- Rodada = uma volta completa na mesa. Turno = a jogada de um jogador.
- **O app não pode travar a mesa.** Nada de "vez de fulano" que impeça voltar
  atrás, nem que atrapalhe o "ei, esqueci de usar isso, posso usar?". Existem
  consensos na mesa e o jogo tem que ficar livre.

→ **Nada de rastreamento de turno nesta rodada de trabalho.** A rodada é um
**contador livre** (+/−) na tela da Mesa, que ninguém é obrigado a usar. Os
eventos são carimbados com o valor atual do contador (`game_events.round`),
só pra dar ordem aproximada — sem nenhuma trava.
Upgrade (turno atribuído, estatística por turno) fica pra depois, **dependendo
de como o pessoal lidar com o app**.

### 2.6 Monstros
Menos de 10 por partida, no geral. → **Viável registrar cada monstro
derrotado** com um toque (não precisa restringir a bosses).

### 2.7 Maldições
São **transitórias** — geralmente se perde a maldição ao morrer.
→ Evento pontual (`maldicao_recebida`), **não** é uma máquina de estado.
(Bônus de graça: dá pra derivar "morreu sob a maldição X" cruzando eventos.)

### 2.8 Expansões
**Só base e Requiem por hora.** O enum `edition: base | requiem` fica como
está. Escape hatch: se um dia entrar Gold Box/Warp Zone, vira lista de
expansões dentro de `params_json` sem migrar `games`.

### 2.9 Re-roll de personagem
Parâmetro **de setup**, padrão atual = **1**. Vira `rerolls_allowed` nos
parâmetros do modo de jogo.

### 2.10 Partida abandonada não conta no ranking
→ `status = 'abortada'` sai de toda agregação. **E partida em andamento também
sai** — só `finalizada` conta.

### 2.11 Quem registra o quê (multi-device)
**Liberado:** qualquer um registra qualquer evento, com carimbo de autoria
(`created_by_player_id`), timeline visível pra todos, e qualquer um pode
apagar um evento errado (soft-delete com autoria).

### 2.12 Moedas e loot no fim
Não são critério de vitória e não desempatam nada. Servem pra **estatística e
badges** ("Rico: juntou 10 moedas no total", "cosmético X ao juntar N
moedas"). Os **critérios do ranking ainda não estão fechados** — trabalho
separado; este plano só garante que o dado esteja lá.

---

## 3. Schema

### 3.1 Colunas novas em `games` (via `ensureColumn` — armadilha #12 do HANDOFF)

| Coluna | Tipo | Nota |
|---|---|---|
| `status` | `TEXT NOT NULL DEFAULT 'finalizada'` | `setup`\|`lobby`\|`andamento`\|`pausada`\|`finalizada`\|`abortada`. O default **backfilla as 4 partidas legadas corretamente**. |
| `mode_id` | `INTEGER REFERENCES game_modes(id)` | só referência ("jogamos no modo X") |
| `params_json` | `TEXT` | **snapshot** dos parâmetros (ver §4) |
| `bonus_souls` | `INTEGER NOT NULL DEFAULT 0` | flag do §2.1 |
| `rerolls_allowed` | `INTEGER NOT NULL DEFAULT 1` | §2.9 |
| `started_at` | `TEXT` | ISO; carimbado ao sair do Setup |
| `ended_at` | `TEXT` | ISO; carimbado na finalização |

`duration_min` e `rounds` **continuam existindo** e continuam sendo o valor
final canônico — só param de ser digitados no Setup: são **pré-preenchidos**
na finalização (duração derivada dos eventos de pause; rodadas do contador
livre) e permanecem editáveis.

### 3.2 Colunas novas em `game_players`

| Coluna | Tipo | Nota |
|---|---|---|
| `pvp_kills` | `INTEGER NOT NULL DEFAULT 0` | §2.3 — snapshot, pré-preenchido dos eventos |
| `reroll_count` | `INTEGER NOT NULL DEFAULT 0` | substitui na prática o `had_reroll` booleano (que fica como legado) |
| `ready` | `INTEGER NOT NULL DEFAULT 1` | lobby (Fase 5); no fluxo de 1 pessoa já nasce 1 |
| `joined_at` | `TEXT` | idem |

**Linha de corte do snapshot (princípio):** *números escalares que o usuário
quer digitar no fim* ficam em `game_players` (almas, moedas, loot, tesouros,
mortes, pvp_kills). *Tudo que aponta pra um Artefato* (qual monstro, qual
maldição) vive **só** em eventos.

### 3.3 `game_modes` (nova)

```sql
CREATE TABLE IF NOT EXISTS game_modes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT,
  is_preset   INTEGER NOT NULL DEFAULT 0,  -- 1 = semeado pelo app (não apagável)
  params_json TEXT NOT NULL,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);
```

### 3.4 `game_events` (nova — o coração)

```sql
CREATE TABLE IF NOT EXISTS game_events (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id              INTEGER NOT NULL REFERENCES games(id),
  seq                  INTEGER NOT NULL,          -- ordem dentro da partida
  round                INTEGER,                   -- contador livre (§2.5)
  type                 TEXT NOT NULL,             -- ver lib/game-events.ts
  player_id            INTEGER REFERENCES players(id),  -- sujeito do evento
  other_player_id      INTEGER REFERENCES players(id),  -- contraparte
  ref_type             TEXT,                      -- 'monstro'|'maldicao'|'tesouro'|'alma_bonus'
  ref_id               INTEGER,
  ref_name             TEXT,                      -- fallback sem cadastro
  amount               INTEGER NOT NULL DEFAULT 1,
  meta_json            TEXT,
  created_by_player_id INTEGER REFERENCES players(id),
  client_event_id      TEXT,                      -- idempotência (§6.1)
  created_at           TEXT NOT NULL,
  deleted_at           TEXT,
  deleted_by_player_id INTEGER REFERENCES players(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ge_client ON game_events(game_id, client_event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ge_seq    ON game_events(game_id, seq);
```

> **Por que `player_id` / `other_player_id` e não `actor` / `target`:** o par
> actor/target quebra em "morte" (o sujeito da estatística é quem *sofreu*, não
> quem executou). Nomes neutros + o significado declarado por tipo no registro
> `EVENT_TYPE_DEFS` — que é a mesma fonte que gera os rótulos da UI. Sem
> convenção implícita pra alguém errar depois.

---

## 4. Catálogo de tipos de evento (`lib/game-events.ts`)

Registro plugável, no molde de `UNLOCK_MODE_DEFS`:

| `type` | `player_id` | `other_player_id` | `ref` | Deriva |
|---|---|---|---|---|
| `alma_ganha` | quem ganhou | — | alma bônus / monstro / livre | +1 alma |
| `alma_perdida` | quem perdeu | — | — | −1 alma |
| `alma_roubada` | quem roubou | de quem | — | +1 / −1 |
| `morte` | quem morreu | quem matou *(opcional)* | — | +1 morte; +1 pvp_kill p/ a contraparte |
| `monstro_derrotado` | quem derrotou | — | `monstro` | contagem por monstro |
| `maldicao_recebida` | quem recebeu | — | `maldicao` | contagem por maldição |
| `personagem_sorteado` | quem sorteou | — | `personagem` | reroll_count (auditoria, §6.5) |
| `pause` / `resume` | — | — | — | duração ativa |
| `nota` | quem escreveu | — | — | texto livre no diário |

Cada entrada declara: rótulo, ícone, quais operandos pede, rótulo de cada
operando (ex.: `morte` → "Quem morreu" / "Matou (opcional)"), tier
(básico/completo), e como agrega.

**Tiers** (o que aparece na Mesa é configurável **por modo de jogo**):

| Tier | Eventos | Racional |
|---|---|---|
| **1 — sempre** | morte, alma ganha, monstro derrotado | 1 toque, alto valor |
| **2 — opcional** | PvP (contraparte da morte), maldição, alma perdida/roubada | 1–2 toques |
| **3 — nunca** | cada moeda, cada loot, cada item comprado, cada dano | ✅ acordado: pesado demais, sem retorno |

**Tesouros continuam só na finalização** (decisão do usuário): o que importa é
com o que o jogador **terminou**, e isso já funciona hoje via
`game_player_treasures` + `TreasurePicker` — e é a fonte do desbloqueio. **Não
mexer.**

### Estatísticas derivadas (queries, não colunas)

```
mortes(p)     = COUNT(morte WHERE player_id = p)
pvp_kills(p)  = COUNT(morte WHERE other_player_id = p)
almas(p)      = COUNT(alma_ganha p) + COUNT(alma_roubada player_id=p)
                − COUNT(alma_perdida p) − COUNT(alma_roubada other_player_id=p)
monstros(p)   = COUNT(monstro_derrotado p)      -- e por ref_id: "monstro que mais mata"
maldicoes(p)  = COUNT(maldicao_recebida p)
duracao       = (ended_at − started_at) − Σ(intervalos pause→resume)
```

---

## 5. Modos de jogo (o modelo Project Zomboid)

Presets vêm semeados; o usuário cria os próprios **partindo de um existente**
(= Sandbox).

**Regra inegociável: o modo é copiado pra dentro da partida (snapshot).**
Editar o preset "Clássico" em outubro **não pode** alterar as partidas de
agosto. `mode_id` é rótulo; `params_json` da partida é a verdade.

**Híbrido nos parâmetros (importante):** o que o ranking e os filtros
consultam continua **coluna real** em `games` (`edition`, `souls_to_win`,
`format`, `character_selection`) — nenhuma query existente quebra. A cauda
longa fica em `params_json`, validada por um tipo em `lib/game-modes.ts`;
parâmetro novo = zero migração.

```ts
interface GameModeParams {
  edition: "base" | "requiem";
  souls_to_win: number;
  bonus_souls: boolean;               // §2.1
  format: "solo" | "duo" | "trio";    // almas contam por time em duo/trio (§2.4)
  character_selection: "free" | "random";
  rerolls_allowed: number;            // padrão 1 (§2.9)
  allow_tainted: boolean;
  enabled_events: EventType[];        // quais botões aparecem na Mesa (§4)
}
```

Presets iniciais sugeridos: **Clássico** (base, 4 almas, solo, livre, 1 reroll,
almas bônus on) · **Clássico Requiem** (requiem, seleção aleatória) ·
**Rápido** (2 almas) · **Duplas** (requiem, duo).

Isso também prepara os torneios: um torneio é "um conjunto de partidas que
compartilham um modo + um recorte de ranking" — encaixa em
`docs/PLANO-TORNEIOS.md` sem retrabalho.

---

## 6. Multi-dispositivo: o que é decidido AGORA

A sessão multi-celular fica pra depois, mas estas 7 coisas custam quase nada
hoje e custam caro depois. É aqui que mora o "moldar a solução visando ela".

1. **`client_event_id` (idempotência) desde o primeiro evento.** Celular com
   rede ruim reenvia; sem chave de deduplicação nascem mortes fantasmas.
   Índice `UNIQUE(game_id, client_event_id)`. Custo hoje: uma coluna.
2. **`created_by_player_id` em todo evento desde o dia 1**, mesmo com uma
   pessoa só registrando. Depois vira "quem anotou o quê" sem migração.
3. **Toda mutação via rota de API** (nada de Server Action exclusiva) — o
   segundo dispositivo precisa chamar exatamente a mesma coisa.
4. **Estado derivado no servidor**, não no cliente. Se "almas atuais" é
   calculado no React, dois celulares mostram números diferentes.
   `lib/games.ts` calcula, todo mundo lê o mesmo.
5. **Sorteio de personagem no SERVIDOR** (mais sério do que parece): no
   cliente dá pra re-rolar até gostar, e dois celulares podem sortear o mesmo
   personagem. No servidor vira anti-trapaça + auditoria + `reroll_count`
   derivado de brinde. **Isso muda o código de hoje:** o `sortearTodos()`
   atual (bulk, no cliente) precisa virar operação **por participante**,
   porque no futuro cada um sorteia o seu.
6. **`ready` / `joined_at` em `game_players` desde já** — auto-preenchidos no
   fluxo de 1 pessoa, viram a mecânica de "Ready" no lobby.
7. **Sync por polling incremental, não WebSocket.** Em Vercel serverless +
   Turso, conexão longa é briga desnecessária.
   `GET /api/games/[id]/events?since=<seq>` com fila local no cliente que
   descarrega quando a rede volta. ⚠️ **Cada poll é uma query remota ao
   Turso — o HANDOFF já mediu 700ms–2.4s por query remota.** Intervalo de
   **3–5s**, resposta enxuta (só eventos novos), e polling só enquanto a tela
   da Mesa está aberta. Nada de 1s.

### Identidade — "Quem é você?" (decidido em 2026-08-06)

Hoje o app tem **basic-auth com uma senha só pro grupo inteiro**
(`middleware.ts`) — não existe "quem é você". Sem isso, "cada um no seu
celular" não sabe de quem é cada registro.

**Decisão do usuário: seletor de perfil no modelo Netflix.**

- Tela "Quem é você?" lista os **jogadores ativos** cadastrados pra seleção,
  com o avatar composto (`PlayerAvatar`) — reaproveita o que já existe.
- Quem não estiver na lista vai pro caminho de **criar jogador novo**
  (atalho pro fluxo de `/jogadores`, sem duplicar formulário).
- **Sem PIN, sem senha.** Qualquer um pode entrar em qualquer perfil, de
  propósito — "tipo um Netflix compartilhado". É um grupo de 12 amigos; a
  trava seria cerimônia sem benefício.
- A escolha grava num **cookie** e é trocável a qualquer momento.

**Consequência importante: isso ficou barato demais pra ser Fase 4.**
Sem PIN e sem auth, sobrou um seletor + um cookie + leitura no servidor. Por
isso **subiu pra Fase 1** (ver §9), e o ganho é que
`created_by_player_id` nasce **preenchido de verdade** desde o primeiro evento,
em vez de ficar `NULL` até a fase de multiplayer — que era exatamente o risco
que o item 2 desta lista tentava evitar.

Ganho colateral fora das partidas: o **Backlog** já tem `player_id` e
`assignee_player_id` e hoje exige escolher o autor na mão a cada card — passa
a vir pré-preenchido.

**Compatibilidade com auth real depois:** continua 100%. Se um dia virar login
de verdade, troca-se a origem do cookie e o `player_id` segue o mesmo — nada
que dependa de identidade precisa mudar.

---

## 7. As três etapas (UI)

### 7.1 Setup — só o que é decidido antes do jogo
Modo/preset · edição · almas pra vencer · almas bônus (flag) · formato ·
seleção de personagem · re-rolls permitidos · participantes · data.

**Sai daqui:** duração, rodadas, vencedor, moedas, loot, tesouros — tudo que é
estado final.

Ao concluir o Setup a partida **é gravada** (`status='andamento'`,
`started_at`). É esse commit que destrava todo o resto.

### 7.2 "A Run" — a partida em andamento *(nome decidido em 2026-08-06)*

> **Vocabulário (fixar pra não confundir depois):** *partida* é o **registro**
> (a linha em `games`, o que aparece na listagem e no ranking); ***Run*** é a
> partida **enquanto está rolando** — a tela ao vivo. Termo do próprio Isaac,
> onde uma "run" é uma jogatina. Rota: `/partidas/[id]/run`. O log de eventos
> é o **Diário da Run**.

Tela única, pensada pra celular sobre a mesa:
- grid de jogadores (avatar + almas atuais + almas do time em duo/trio);
- botões de 1 toque por evento (tiers do §4, filtrados pelo modo);
- **contador de rodada livre** (+/−), sem trava nenhuma (§2.5);
- **diário** (timeline ao vivo) — todo mundo vê o que já foi registrado, o que
  resolve duplicação social sem código;
- **pausar / retomar** — pause é só mais um evento, e
  `duração = Σ intervalos ativos` (não relógio de parede). Resolve "partida em
  2 dias" sem tabela extra;
- **abortar partida** (§2.10).

### 7.3 Finalização — derivada, com override
Campos **já chegam pré-preenchidos** a partir dos eventos (almas, mortes,
pvp_kills, rodadas, duração). O usuário confirma ou corrige.
Só é digitado do zero o que não dá pra derivar: **moedas, cartas de loot,
tesouros com que terminou, vencedor**.
Se o número digitado divergir do que os eventos dizem, aviso discreto — **não
bloqueia**. O humano manda.

### 7.4 Registro retroativo (não perder isso!)
Nem toda partida vai ser acompanhada pelo app. Tem que continuar existindo o
caminho **"registrar partida já jogada"**: Setup → pula a Mesa → Finalização,
gravando direto como `finalizada`, sem evento nenhum. É o fluxo de hoje,
preservado como atalho — não como o padrão.

---

## 8. Impacto no que já existe

| Arquivo | Mudança | Criticidade |
|---|---|---|
| `lib/ranking.ts` | ✅ **Feito.** Filtra `g.status='finalizada'` nas duas queries (a agregação não fazia join com `games`). Medido no banco real: sem o filtro, Mané ia a 3 vitórias/**5** partidas em vez de 3/4 — win% de 75% → 60% por causa de uma partida que nem tinha acabado. | 🔴 obrigatório (§2.10) |
| `lib/unlocks.ts` | ✅ **Feito.** `loadPlayerContext` tinha o mesmo buraco — desbloquearia cosmético de partida não terminada. | 🔴 obrigatório |
| `lib/games.ts` | ✅ **Feito.** `deleteGame` inclui `game_events` na cascata manual (FK não é garantida em Turso; armadilha #7). Verificado: 12 eventos + 2 participantes + 1 tesouro removidos junto. | 🔴 obrigatório |
| `components/GameWizard.tsx` | ✅ **Deletado.** Virou `GameSetup` + `GameFinish` + `GameLiveControls`; sorteio foi pro servidor e virou por-participante. | 🟡 |
| `app/partidas/page.tsx` | ✅ **Feito.** Coluna "Situação" + linha destacada e "continuar →" pra partida em andamento. | 🟡 |
| `app/partidas/[id]/page.tsx` | ✅ Controles de ciclo de vida quando a partida está rolando. O **Diário** de eventos vem na Fase 2. | 🟡 |
| `game_player_treasures` / `TreasurePicker` | **Nada muda.** | ✅ |

**Ganho colateral no `unlocks.ts`:** com eventos + agregados, modos novos
ficam triviais e cobrem o que o usuário pediu no §2.12 — `monster_kill`
("derrotou o Boss X"), `stat_threshold` ("juntou N moedas no total" → badge
"Rico"). **O primeiro lote de badges não precisa de sistema novo**, só de
entradas no registro que já existe.

---

## 9. Fases

| Fase | Entrega | Vale sozinha? |
|---|---|---|
| **1 — Modelo & ciclo de vida** ✅ **(2026-08-06)** | schema (§3) · `game_modes` + presets semeados · API de ciclo de vida · Setup grava a partida · Finalização vira etapa · sorteio no servidor · filtros de status no ranking/unlocks · registro retroativo preservado · **"Quem é você?"** (§6) | Corrige o absurdo da duração e destrava tudo |
| **2 — A Run** | tela ao vivo · paleta de eventos tier 1+2 · Diário da Run *(pause/retomar, contador de rodada e finalização pré-preenchida já saíram na Fase 1)* | **É o registro que o usuário quer, hoje** |
| **3 — Estatísticas & badges** | telas de estatística por evento · novos `unlock_mode`s (`monster_kill`, `stat_threshold`) · primeiros badges | Colhe o que 1–2 plantaram |
| **4 — Sessão multi-celular** | lobby · convite · ready · cada um sorteia o seu · polling incremental · cada um registra o seu | A feature grande |

Fases 1 e 2 juntas já entregam a reformulação pedida. 3 e 4 são incrementos
que o modelo passa a permitir sem retrabalho.

> A identidade era a Fase 4 na primeira versão deste plano. Com a decisão do
> §6 (seletor tipo Netflix, sem PIN), ficou barata o bastante pra entrar na
> Fase 1 — e é melhor que entre, senão `created_by_player_id` fica `NULL` em
> todo evento até a fase de multiplayer.

---

## 10. Riscos e armadilhas

1. **Coluna nova em tabela existente** → `ensureColumn()`, nunca outra função
   (armadilha #12 do HANDOFF). `status` com `DEFAULT 'finalizada'` backfilla
   as partidas legadas corretamente — conferir depois de rodar.
2. **Cascata manual obrigatória** em `deleteGame` incluindo `game_events` —
   FKs não são garantidas em Turso/HTTP (armadilha #7).
3. **Custo de query remota no polling** — 700ms–2.4s por query no Turso,
   medido. Intervalo 3–5s, payload incremental, polling só com a tela aberta.
4. **Partida órfã em `andamento`** esquecida por dias: precisa de "abortar"
   fácil e de destaque na listagem.
5. **Prod e local divergem e o usuário usa o app entre as sessões** — nunca
   `DELETE` em massa; ler antes de escrever (aviso do topo do HANDOFF).
6. ⚠️ **O token do `.env.production.local` está retornando 401** (conferido em
   2026-08-06). Precisa ser renovado antes de qualquer script tocar prod ou de
   conferir se há partida real lá.

---

## 11. Decisões fechadas e pontas soltas

Fechado em 2026-08-06:

- [x] **Nome da tela ao vivo:** **"Run"** (§7.2) — partida = registro,
      Run = a partida acontecendo.
- [x] **Identidade:** seletor de perfil tipo Netflix, sem PIN, todo mundo pode
      entrar em qualquer perfil (§6). **Subiu pra Fase 1.**

Ainda em aberto (não bloqueiam as Fases 1–2):

- [ ] **Critérios do ranking** — §2.12: ainda não fechados. Trabalho separado;
      este plano só garante que o dado esteja gravado.
- [ ] **Artefato "Almas Bônus"** — §2.1: cadastro futuro, entra no
      `PLANO-ARTEFATOS.md` quando o usuário quiser.
- [ ] **Renovar o token do Turso de prod** (401 em 2026-08-06) — §10.6.
