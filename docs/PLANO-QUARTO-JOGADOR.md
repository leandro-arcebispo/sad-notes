# PLANO — Quarto do Jogador

> Plano inicial, aberto em **2026-07-20**. É a ideia **mais distante** das
> quatro discutidas nessa sessão — depende de peças que ainda não existem
> (`docs/PLANO-ARTEFATOS.md` §12 "Monstros" e, possivelmente,
> `docs/PLANO-COSMETICOS-AVATAR.md`). Não iniciar implementação: este
> documento é só pra registrar a visão antes que ela se perca.

## 1. A ideia

Um espaço visual **personalizável por jogador** — um "quarto" — decorado com
itens que o próprio jogador foi desbloqueando ao jogar. Diferente do avatar
(que veste o personagem), o Quarto é um cenário/cômodo em volta dele.

Peças de decoração cogitadas:

- **Sprite de Monstro** — desbloqueado ao matar aquele monstro numa partida
  (depende de `docs/PLANO-ARTEFATOS.md` §12 "Monstros" existir primeiro —
  hoje esse Artefato nem está implementado).
- **Ícone de Tesouro** — já existe hoje (`treasures.icon_ornament_id` +
  todo o catálogo de ~150 ícones já recortados), então esta peça é a que
  tem menos trabalho de pré-requisito.
- **Tema da sala = um Frame do design system** — o design system já tem
  **28 variantes de frame em 9 temas** (`public/design-system/frames.md`),
  usados hoje só como container visual de página (`<Frame variant="...">`)
  sem nenhum conceito de posse/desbloqueio por jogador. A ideia é
  reaproveitar essas mesmas artes como "papel de parede" do Quarto —
  funciona bem visualmente porque frame, sprite de monstro e ícone de
  Tesouro **vêm todos do jogo eletrônico**, mesma linguagem visual.
- **Troféus de Torneio** (ideia futura, mais distante ainda) — quando
  `docs/PLANO-TORNEIOS.md` tiver um formato definido e torneios acontecerem
  de verdade, sprites de troféu próprios do grupo poderiam virar decoração
  exclusiva de quem venceu. Dependência de mão única (este plano depende de
  Torneios existir pra essa peça específica, não o inverso).

## 2. Por que isso é mais complexo do que parece

O Frame hoje é **livre** — qualquer página escolhe qualquer variante, sem
noção de "posse". Pra virar decoração desbloqueável do Quarto, o Frame
precisaria deixar de ser só uma classe CSS escolhida à mão e virar (pelo
menos parcialmente) uma entidade com desbloqueio — um sistema novo, não
uma reaproveitamento direto do que existe. Duas leituras possíveis (não
decidido):

- **Opção A — só frames novos são gated:** os 28 frames atuais continuam
  livres (usados nas páginas do app normalmente); só uma leva **nova** de
  frames "de troféu"/especiais nasce com dono e regra de desbloqueio.
- **Opção B — todo frame vira um Artefato:** os 28 existentes migram pra
  virar um catálogo com desbloqueio (ex.: `always` pra manter o
  comportamento atual, e modos novos pra frames especiais) — mais trabalho,
  mais generalização, mais risco de over-engineering se não houver um caso
  de uso real pros frames "antigos" precisarem de dono.

## 3. Esqueleto de arquitetura (especulativo — não implementar ainda)

Sem resolver as perguntas do §4, dá pra antecipar a forma geral:

- Uma tabela de "decoração do quarto" por jogador, no mesmo espírito de
  `player_ornaments` (jogador + item + posição), mas os itens vêm de fontes
  diferentes (Monstro, Tesouro, Frame/tema) — provavelmente **não** dá pra
  usar uma FK só (tipo `ornament_id`), porque nem todo item de decoração é
  um `ornament`. Pode precisar de um campo tipo `decoration_type` +
  `decoration_ref_id` (polimórfico) ou de uma tabela por tipo de decoração —
  decidir quando o modelo de dados dos itens (Monstro, principalmente)
  estiver mais maduro.
- O "tema" (Frame) provavelmente é um campo separado do quarto (1 por
  quarto), diferente das decorações (N por quarto, posicionadas livremente
  tipo os ornamentos "diverso" do avatar).

## 4. Perguntas em aberto (confirmar com o usuário antes de implementar)

- **Composição do quarto:** é uma imagem só (tema de fundo fixo + itens
  posicionados livremente por cima, tipo o avatar hoje) ou uma grade/grid de
  slots fixos (tipo "3 espaços de decoração", sem posição livre)?
- **Onde aparece:** página própria do jogador, um card na lista de
  Jogadores, dentro do editor de avatar (mesma tela), ou uma seção nova no
  nav principal?
- **Frames — Opção A ou B do §2?** Isso muda bastante o escopo: A é uma
  adição pequena (só frames novos); B é uma migração do sistema de frames
  inteiro.
- **Ordem de dependências:** este plano só faz sentido depois de Monstros
  (`docs/PLANO-ARTEFATOS.md` §12) existir — vale começar só com Tesouro como
  decoração (já disponível hoje) enquanto Monstros não nasce, ou espera os
  dois pra lançar junto?

## 5. Status

- [ ] Nenhuma parte implementada — plano em fase de ideia, bloqueado por
      `docs/PLANO-ARTEFATOS.md` §12 (Monstros) não existir ainda.
