# PROPOSTA — Ícones temáticos (2026-10-16)

> ⚠️ **TENTADO E REVERTIDO em 2026-10-17.** Foi implementado (commit 695a2ac)
> e o usuário pediu rollback: *"não ficou bom"*. O que ficou de pé foi só a
> **padronização de tipografia**, que vinha no mesmo commit. Os PNGs copiados
> pra `design-system/img/game/` foram removidos junto.
>
> Antes de tentar de novo, perguntar **o que** não funcionou: a arte em si, o
> filtro `grayscale` da sidebar que apaga os ícones fora do item ativo, o
> tamanho, ou a ideia toda. A proposta abaixo continua válida como
> levantamento do que existe no catálogo.

> Substituir os ícones genéricos (SVG de traço e emoji) por arte do próprio
> jogo. **Nada implementado ainda** — é proposta pra aprovar.
>
> Todos os candidatos foram **vistos no tamanho real de uso** (22px e 32px
> sobre o fundo `--panel`), não escolhidos por nome.

## A regra que apareceu ao olhar

Sobre o fundo escuro do app, **o ícone precisa de silhueta clara ou cor
saturada**. Sprite escuro e fino **some** a 22px.

- ✅ Funcionam: Eternal D6 (dado branco), Blank Card (branco), Guppy's Paw
  (rosa), Blood Puppy (vermelho), The Poop (marrom), Monstro's Tooth (branco),
  Guppy's Head (branco), Sacred Heart (vermelho).
- ❌ Somem a 22px: Spider Mod, Halo Of Flies, Dead Bird, Eye Of Greed,
  Dad's Lost Coin.
- ❌ Busy demais: Curse Of The Tower (é uma carta de tarô inteira).

Pool disponível: **148 ícones de Tesouro** (quase todos 32×32), 124 cartas de
Monstro, 15 de Maldição, mais os ícones do design system.

---

## 1. Achados antes de trocar nada

**A nav "Partidas" usa um ícone de MORTE.** `Sidebar.tsx:13` aponta pra
`icon-report.png`, que é o sprite de bicho com olhos de X — e o mesmo arquivo
está mapeado como `deaths` no `StatIcon`. A semântica certa é "mortes", não
"partidas".

**E o ícone certo já existe e está quase sem uso:** `icon-partidas.png` são
duas adagas cruzadas, hoje usado só no `StatIcon` como `games`.

**`trophy-source.png` não é usado em lugar nenhum.**

---

## 2. Sidebar — trocar os SVG de traço

| Onde | Hoje | Proposta | Por quê |
|---|---|---|---|
| Ranking | `icon-nav-ranking.png` (troféu) | **`icon-wins.png`** (coroa) | Libera o troféu pro torneio; coroa = campeão do ranking |
| Partidas | `icon-report.png` ⚠️ *(é morte)* | **`icon-partidas.png`** (adagas cruzadas) | Corrige a semântica, e o asset já existe |
| Jogadores | `icon-isaac-avatar.png` | *manter* | Já é temático |
| Torneios | `IconTrophy` (SVG) | **`icon-nav-ranking.png`** (troféu) | Troféu pertence ao torneio |
| Personagens | `IconMask` (SVG) | **`character-card-back.png`** | É literalmente o verso da carta de personagem |
| Tesouros | `icon-treasures.png` (baú) | *manter* | Já é temático |
| Maldições | `IconSkull` (SVG) | **Book Of Sin** `treasure-icon/book-of-sin-96ed8c` | Livro escuro com "7" vermelho, lê bem a 22px |
| Monstros | `IconClaw` (SVG) | **Monstro's Tooth** `treasure-icon/monstro-s-tooth-fa5958` | Dente branco com chifres; "Monstro" no nome é bônus |
| Oficina | `IconSheets` (SVG) | **Blank Card** `treasure-icon/blank-card-df4882` | Carta em branco = a matéria-prima do cortador |
| Backlog | `IconBug` (SVG) | **The Poop** `treasure-icon/the-poop-5a8900` | Pilha de bugs; o grupo vai achar graça. Alternativa séria: Mom's Pills |
| Configurações | `IconGear` (SVG) | **R Key** `treasure-icon/r-key-41b303` | Chave = ajustes. Única sem candidato forte — ver §4 |
| Quem é você | `IconUser` (SVG) | **`faces/face-white.png`** | O fallback já é um rosto base; usar o mesmo |

---

## 3. Eventos da Run — trocar os emoji

Hoje em `lib/game-events.ts`, campo `icon`. Emoji renderiza com a fonte do
sistema operacional — é o que mais destoa do pixel art, e muda de desenho
entre Android, iPhone e Windows.

| Evento | Hoje | Proposta |
|---|---|---|
| `alma_ganha` | 👻 | **`icon-souls.png`** (fantasma do design system) |
| `alma_perdida` | 🕳️ | **`icon-souls.png` esmaecido** (mesmo ícone, `opacity: .45` + tom vermelho) |
| `alma_roubada` | 🫱 | **Guppy's Paw** `treasure-icon/guppy-s-paw-77088f` — pata rosa, lê ótimo a 22px |
| `morte` | 💀 | **Book Of The Dead** `treasure-icon/book-of-the-dead-70b786` ou **The Dead Cat** |
| `monstro_derrotado` | 👹 | **Monstro's Tooth** (o mesmo da nav) |
| `maldicao_recebida` | 🩸 | **Blood Puppy** `treasure-icon/blood-puppy-0d142a` — vermelho forte |
| `personagem_sorteado` | 🎲 | **Eternal D6** `treasure-icon/eternal-d6-4aa24f` — dado branco, o mais legível de todos |
| `nota` | 📝 | **Blank Card** (o mesmo da Oficina) |
| `pause` / `resume` | ⏸️ ▶️ | *manter símbolo* — não existe item de "pausa" e o significado é universal |

> Reaproveitar o mesmo sprite em dois lugares (Monstro's Tooth, Blank Card) é
> proposital: ajuda a ler "monstro" e "carta/nota" como conceitos, não como
> telas diferentes.

---

## 4. Pontos fracos desta proposta

- **Configurações** não tem candidato bom. R Key é uma carta bege, meio
  apagada. Talvez valha manter o SVG de engrenagem aqui, ou recortar um
  ícone novo na Oficina.
- **Reaproveitar `icon-souls.png` pra "perdeu alma"** só muda opacidade/cor —
  pode ficar sutil demais no Diário. Testar antes de fechar.
- **Trocar o troféu do Ranking** mexe num ícone ao qual o grupo já se
  acostumou. Se incomodar, a saída é usar `trophy-source.png` (hoje sem uso)
  pro Torneio e deixar o Ranking como está.
- Emoji tem uma vantagem que a arte perde: **cor imediata e silhueta
  familiar**. Se algum evento ficar ilegível a 22px no Diário, é melhor voltar
  o emoji nesse caso específico do que forçar consistência.

---

## 5. Trabalho que isso implica

Os sprites já estão em `public/sprites/treasure-icon/` e são servidos como
estáticos — **nenhum asset novo precisa ser produzido**. O trabalho é:

1. Um componente `GameIcon` no molde do `StatIcon` (hoje só cobre as 7
   estatísticas), mapeando nome → caminho.
2. `EVENT_TYPE_DEFS.icon` deixa de ser emoji e passa a ser a chave desse mapa —
   o registro já é plugável, então é trocar o valor.
3. `Sidebar.tsx` troca os `<IconX />` por `<img>`; os SVG viram código morto e
   podem sair.

⚠️ **Os caminhos dos sprites têm hash no nome** (`...-96ed8c.png`), gerado no
recorte. Em produção os ids/caminhos **são outros** — o mapa não pode ser
hardcoded por caminho se tiver que valer nos dois bancos. Resolver por **nome
do Tesouro** (chave natural, padrão já adotado no projeto) ou copiar os PNGs
escolhidos pra `public/design-system/img/` com nome fixo. **A segunda é mais
simples e não depende do banco** — recomendada.
