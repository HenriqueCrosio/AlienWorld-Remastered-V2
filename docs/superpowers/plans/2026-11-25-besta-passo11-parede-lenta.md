# A Besta refeita — passo 11: a parede em câmera lenta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** dar sentido ao ataque da parede na meia volta (fase 2). Ele jogou e viu o golpe do canto atacar o ar, porque a
nave quase sempre está no fim da esquerda. A ideia dele: *"fazer parecido quando ele para o coração e tudo congela, mas ao
invés de congelar, o que ele envia fica num slow motion pesado... ele vai lançar uma parede de algo e, nessa parede, vai
ter um caminho que o jogador vai precisar fazer para desviar. Assim dá tempo de desviar, o jogador que não fizer toma
dano"*. Na parede da direita ela aperta o próprio core pela metade, e o coração DESACELERA. Ela solta uma laje de lava
do chão ao teto, que atravessa a sala devagar, com um corredor sinuoso aberto nela. Quem segue o corredor passa; quem
não segue toma o dano.

**A história em dois degraus:** na fase 2 o coração desacelera (a laje lenta); na fase 3 ele para (tudo congela). O
jogador aprende o poder dela antes do clímax.

**Architecture:** um módulo PURO (`src/entities/besta/parede.ts`) com as figuras do corredor (colunas, alturas dos vãos),
a linha do tempo da laje e a prova de que o corredor é percorrível na velocidade da nave, testado em Node. O `Predador`
troca o golpe do canto de baixo da rota da volta (`canto BD`, em `volta.ts`) por um trecho novo `parede`: segura na
parede, aperta o core (o `coracao-aperta` pela metade), solta a laje e segue a rota (descola → voo → pouso → rasgo). As
peças da laje são lavas do pool dela, sem gravidade (a causa visível da lentidão é o coração: cada peça pulsa no batimento
lento dela). O golpe do canto de cima (`canto CD`) fica até ele dizer.

**Tech Stack:** TypeScript, Phaser 3.90, Vite; testes puros com `node --experimental-transform-types`; em jogo com
Playwright.

## Global Constraints

- O pedido dele (acima): a parede tem um caminho; dá tempo de desviar; quem não faz toma dano.
- Memória `ataque-bullet-hell-geometrico`: a figura é FIXA e se lê; nunca vão sorteado peça a peça. O sorteio é só ENTRE
  figuras fixas (como as luzes dos olhos).
- Memória `fisica-do-lugar-nos-ataques`: toda lentidão ou curva precisa de causa visível — aqui, o coração que
  desacelera (o pulso das peças e o som).
- Memória `nada-atras-da-nave`: ela lança da parede da DIREITA, na frente da nave; a laje sai pela borda da esquerda.
- A nave anda a 110 px/s (`FreeController.SPEED`); o acerto é pelo desenho (`tocaDesenho`) e a caixa da lava é 9×6.
- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`); GIFs fora do git.

## As decisões MINHAS deste passo (marcar na folha e perguntar)

1. **A laje:** 5 colunas a 36 px uma da outra, peças a cada ~14 px do chão ao teto, e em cada coluna um vão de 44 px
   (a nave tem 9 de altura). O vão muda de altura de coluna para coluna em no máximo 48 px.
2. **A velocidade:** 55 px/s para a esquerda (a nave é 2× mais rápida). Cada coluna passa pela nave a cada ~0,65 s, e
   trocar de vão leva ~0,45 s. A laje inteira cruza a sala em ~9 s.
3. **As figuras:** três corredores fixos, sorteados: o zigue-zague que desce, o que sobe e o S. Um teste prova que, para
   cada um, a nave a 110 px/s cabe em todos os vãos a tempo.
4. **Os tiros dele atravessam a laje** (não são absorvidos), e o core dela fica aceso na parede enquanto a laje anda:
   quem está no corredor pode atirar nela. O golpe do canto de baixo sai da rota.
5. **O aviso:** o aperto pela metade (o `coracao-aperta` até o quadro 2), o batimento lento (o pulso tocado a 0,6×) e
   a laje nascendo da parede de uma vez, antes de andar (~0,6 s parada).
6. **O som** entra numa folha própria depois (o coração desacelerando, a laje andando); até lá, o batimento lento e o
   arremesso da lava.

## Task 1: as regras puras — `src/entities/besta/parede.ts`, `scripts/test-besta-parede.mjs`

- [ ] O teste primeiro: as três figuras; cada coluna cobre do chão ao teto menos o vão; o vão ≥ 44 px; a troca entre
  colunas ≤ 48 px; a prova da nave: com 110 px/s e o tempo entre colunas (36 / 55 s), a nave sai de um vão e entra no
  próximo antes da coluna chegar; a laje sai inteira pela borda da esquerda.
- [ ] O módulo: `PAREDE` (as constantes acima), `figuraDaParede(n)`, `pecas(figura, x0)` (as posições iniciais),
  `percorrivel(figura, vNave, vLaje)`.
- [ ] `node --experimental-transform-types scripts/test-besta-parede.mjs` → "tudo certo".

## Task 2: no motor — `volta.ts` (o trecho `parede` no lugar do `canto BD`), `Predador.ts` (o aperto pela metade, lançar a laje, o pulso lento das peças, os tiros atravessando), `scripts/test-besta-volta.mjs` (a rota nova)

- [ ] A rota: agarra → troca 1, 2 → quina CD → canto CD → descida → **parede** → descola → voo → pouso.
- [ ] As peças: lavas `metal` sem gravidade e com velocidade fixa; ficam fora de `beber` e do congelamento do coração.
- [ ] `npx tsc --noEmit -p .` limpo; os testes puros passam.

## Task 3: no jogo — `scripts/_f4/_besta-parede.mjs` (o teste), a folha `besta-bio/passo11.html`

- [ ] A nave que segue o corredor (o caminho das figuras, a 110 px/s) leva 0 toques em cada figura; a parada leva o dano;
  a laje sai pela esquerda; a volta termina no rasgo; nenhum erro no console.
- [ ] A folha: as três figuras desenhadas sobre a arena de verdade, no tamanho do jogo; o GIF em jogo da nave fazendo o
  corredor, ao lado da que fica parada; as decisões acima para ele marcar.
- [ ] O `_besta-volta.mjs` troca a checagem do `canto BD` pela da laje.
