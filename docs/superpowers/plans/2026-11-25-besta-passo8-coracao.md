# A Besta refeita — passo 8: o coração para — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o clímax da fase 3 (spec §4.4). Plantada no chão, ela arremessa um campo de 18 estilhaços em 3 arcos, vira de
frente e crava as garras no próprio core. O coração para, e tudo o que voa congela, dela e do jogador: só a nave se
move. Os tiros disparados no congelamento param na frente da nave e se acumulam. Depois de 1,5 s o coração volta, tudo
retoma junto e a pilha sai de uma vez. A fase 3 não deixa ela morrer antes do coração parar.

**Architecture:** um módulo PURO (`src/entities/besta/coracao.ts`) com a figura do campo e o arremesso que leva cada
estilhaço ao seu lugar no instante do aperto, testado em Node. O `Predador` ganha o estado `coracao`: a sequência dos
clipes (a lava para o arremesso, o virar, o coracao-a dividido em aperto / parado / solta), o congelar e o descongelar
das lavas dela e das brasas, a trava da fase 3. O contrato `StageBoss.congelado()` / `limparCampo()` leva o congelamento
à `GameScene`, que congela os tiros do jogador e monta a pilha. A arma da nave suspende a perseguição e o alcance no
congelamento. A bomba no congelamento limpa o campo e gasta a pilha.

**Tech Stack:** TypeScript, Phaser 3.90, Vite; testes puros com `node --experimental-transform-types`; em jogo com
Playwright.

## Global Constraints

- A spec (§4.4): 18 estilhaços em 3 arcos de alturas diferentes, da direita para a esquerda, sem leque com vão; tudo o
  que voa congela, os projéteis dela e os do jogador; só a nave se move; os tiros do congelamento param na frente da nave
  e se acumulam; ~1,5 s; tudo retoma junto; o míssil congela como os tiros; a bomba no congelamento limpa o campo dela e
  gasta a rajada acumulada; ela fica vulnerável no congelamento, com o core aceso.
- A trava (§3): na fase 3 ela não morre antes do coração parar.
- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`); GIFs fora do git.

## As decisões MINHAS deste passo (marcar na folha e perguntar)

1. **O congelamento casa com o clipe:** o coracao-a fecha as garras no core (quadros 0–3), segura (3–12, durante os 1,5 s)
   e solta num estouro (13–15). O estouro é o coração voltando.
2. **O campo** é de estilhaços de metal em brasa (o tiro do rasgo), arremessados todos de uma vez do peito, no clipe da
   lava. Cada um chega ao seu lugar da figura exatamente no aperto, e todos seguem para a esquerda na retomada.
3. **O bolso:** entre o campo (até x≈196) e o corpo dela (x≈256) sobram ~50 px. Quem atravessa o mapa até ali solta a
   pilha no core à queima-roupa.
4. **A pilha acompanha a nave**, 12–20 px à frente, e sai na direção em que cada tiro ia.
5. **As brasas e as luzes da lava** também param (o emissor pausa). A sala fica iluminada só pelas brasas paradas.
6. **A trava da fase 3:** ela segura em 1 de vida até o coração parar uma vez. Com a trava, a próxima jogada é o coração.

## Task 1: as regras puras — `src/entities/besta/coracao.ts`, `scripts/test-besta-coracao.mjs`
## Task 2: no motor — `Predador.ts` (o estado, os clipes, o campo, congelar/descongelar, a trava), `Boss.ts`/`BossNucleo.ts` (o contrato), `GameScene.ts` (os tiros e a pilha, a bomba), `WeaponSystem.ts` (a perseguição e o alcance esperam)
## Task 3: no jogo — `scripts/_f4/_besta-coracao.mjs` (o teste) e `_besta-coracao-filme.mjs` (o filme), a folha `besta-bio/passo8.html`
