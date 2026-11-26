# A Besta refeita — passo 7: os olhos no escuro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** na fase 3 (o breu), ela sai da tela e acendem três luzes, só na frente da nave (a parede da direita e o teto).
Ela é a luz que pulsa com o coração; as outras duas são brasas fora do ritmo, que estouram no fim. Depois de dois
batimentos a verdadeira salta pela linha onde a nave estava no último batimento: da parede, reto atravessando a sala e
saindo pela esquerda; do teto, os olhos correm até a coluna da nave e ela cai reta (spec §4.3, com a escolha "A" dele,
25/11: nada por trás da nave).

**Architecture:** um módulo PURO (`src/entities/besta/olhos.ts`) com as figuras (a tabela fixa que gira), os ritmos, as
batidas e os saltos, testado em Node. O `Predador` ganha o estado `olhos`: sai pela direita (o salto para trás), acende
as luzes (glow aditivo + os olhos assados em pixel), conta os batimentos no pulso do core (mais rápido nos olhos), marca
a nave em cada batimento e salta. Depois do salto da parede ela volta pela direita (o aviso + o galope até a âncora,
o `reentrar` de hoje refeito).

**Tech Stack:** TypeScript, Phaser 3.90, Vite; testes puros com `node --experimental-transform-types`; em jogo com
Playwright.

## Global Constraints

- A spec (§4.3): três luzes de uma tabela fixa (três figuras que se alternam); a verdadeira pulsa com o coração (o
  batimento que se ouve e que a luz mostra); as falsas são brasas fora do ritmo que estouram no lugar (sem projétil
  longo); depois de dois batimentos (~1,6 s) ela salta pela altura da nave no último batimento, a ~380 px/s, com o corpo
  inteiro ferindo e o core aceso; do teto, reto para baixo na coluna da nave.
- A escolha dele (25/11, "A"): as luzes só na parede da direita e no teto; o salto da parede atravessa e sai pela
  esquerda, sem parar atrás da nave (memória `nada-atras-da-nave`).
- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`); GIFs fora do git.

## As decisões MINHAS deste passo (marcar na folha e perguntar)

1. **O coração acelera nos olhos:** o batimento do breu é de 2,4 s. Nos olhos ele vai para 0,8 s, e os dois batimentos
   dão 1,6 s, como a spec.
2. **As três figuras:** (parede 60, **parede 150**, teto 250), (parede 105, **teto 175**, teto 300), (**parede 70**,
   parede 165, teto 220). A verdadeira alterna parede / teto / parede.
3. **As brasas** pulsam a 0,62× e 1,45× do coração, com fases que as deixam apagadas nos batimentos. Estouram só em
   faíscas, sem perigo.
4. **Do teto, os olhos correm até a coluna da nave** (700 px/s, ela ainda no escuro) e ela cai reta. Cair na diagonal
   deslizava o corpo pendurado.
5. **O salto da parede** sai pelo descola-a, e o motor leva o voo em linha reta. A linha passa pelo ponto onde a nave
   estava e segue até sair pela esquerda.
6. **A volta depois do salto da parede:** o aviso na borda direita e o galope até a âncora, como a volta antiga.

## Task 1: as regras puras — `src/entities/besta/olhos.ts`, `scripts/test-besta-olhos.mjs`
## Task 2: no Predador — o estado, as luzes, o batimento, o salto, a volta pela direita
## Task 3: no jogo — `scripts/_f4/_besta-olhos.mjs` (parede e teto; a nave parada leva, a que foge escapa), os GIFs, a folha `besta-bio/passo7.html`
