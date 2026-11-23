# O Guardião na coleira — passo 5: o teto que sangra — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** aos 33–0 %, depois da serra, o Guardião bombeia pelos cabos e o teto do hospedeiro sangra: um pulso sobe pelos
cabos e corre a borda de cima, 4 pontos incham e acendem, e cada um solta uma coluna reta de gotas grossas em duas ondas
alternadas — a última ação nova do rodízio (spec `specs/2026-11-22-guardiao-coleira-design.md` §7 e §8).

**Architecture:** um módulo PURO (`src/entities/guardiao/tetoSangra.ts`: a linha do tempo, os pontos, o inchaço, a
agenda das gotas) testado em Node; a camada da borda do passo 4 vira GENÉRICA (`camadaBorda.ts` + o contrato
`deformaBorda.ts`: o aperto e o teto são duas fontes da mesma borda viva, com a mesma lei do fio que morde); as gotas
num módulo Phaser próprio (`sangueTeto.ts`, no grupo `perigos`); o pulso nos cabos em `CamadaCabos.pulso`; o
`BossNucleo` ganha a ação `teto` e o rodízio dos 33–0 % termina em … → serra → teto.

**Tech Stack:** TypeScript, Phaser 3.90 (Arcade), Vite; testes puros com `node --experimental-transform-types`; em jogo
e o filme com Playwright + sharp.

## Global Constraints

- O que a spec fixa (§7): o aviso — ele bombeia pelos cabos, um pulso aceso sobe ao teto e se espalha pela borda; **4–6
  pontos** da borda de cima, **sobre os 2/3 da esquerda**, incham e acendem **~0,8 s**. A queda — cada ponto solta uma
  **coluna reta** de gotas grossas (gravidade, sem arco); **duas ondas alternadas**, a 2ª **0,7 s depois**, nos **vãos**
  da 1ª; na borda de baixo, respingo. O material — o **sangue quente do hospedeiro**, mais escuro e viscoso que a lava do
  miolo; a gota **estica antes de soltar**. **Dano 1.**
- O teste da spec (§11): as duas ondas do teto nunca se sobrepõem.
- As leis que já valem: a parede não protege (a lava atravessa e respinga — a gota também); a borda viva morde só onde o
  fio acende (passo 4, ele); figura fixa, nunca sorteada; peça ≲ 8 px em pixel.
- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`); GIFs fora do git.

## As decisões MINHAS deste passo (marcar na folha e perguntar)

1. **A figura:** 4 pontos por onda a cada 64 px — A em 32, 96, 160, 224; B em 64, 128, 192, 256.
2. **A coluna:** 3 gotas por ponto a 0,1 s (com 0,14 s a janela da troca era 0,07 s); a gravidade da lava (260).
3. **Cada onda tem o seu aviso:** a 2ª acende quando a 1ª solta.
4. **O sangue:** escuro, com um halo carmim fraco (sem ele a gota sumia no vermelho do fundo).
5. **O pulso** que corre a borda é outra luz (vermelha, 3 px) e não morde; os pontos inchados levam o fio e mordem.

## Task 1: as regras puras

**Files:** Create `src/entities/guardiao/tetoSangra.ts`, `scripts/test-guardiao-teto.mjs`.

- [x] `TETO` (SOBE 0,3, ESPALHA 0,3, INCHA_A 0,8, INCHA_B 0,7, ESTICA 0,25, GOTAS 3, ENTRE 0,1, MURCHA 0,3, MEIA 8,
  ALTURA 6, G 260, RAIO 3,5), `PONTOS_A`, `PONTOS_B`, `class TetoQueSangra implements DeformaBorda` (`passo`, `quedas`,
  `inchaco`, `penduradas`, `deslocar`, `luzTeto`, `pulsoCabos`, `frente`; estáticos `inicio`, `solta`, `ultima`, `queda`).
- [x] O teste: 4–6 pontos por onda, nos 2/3 da esquerda, nunca no mesmo x, B no meio dos vãos de A, o vão de uma onda
  cabe a nave; as fases; 3 gotas por ponto; a 2ª 0,7 s depois; ~0,8 s de aviso; o inchaço inteiro; só o teto; a janela
  da troca ≥ o tempo de a nave andar 32 px (de y 60 para baixo); o pulso sobe e corre só para a esquerda; a gota estica;
  as duas luzes nunca no mesmo lugar.

## Task 2: a borda viva genérica

**Files:** Create `src/entities/guardiao/deformaBorda.ts`; Rename `camadaAperto.ts` → `camadaBorda.ts`
(`CamadaBorda`, `iniciar(fonte)`); Modify `aperto.ts` (`Aperto implements DeformaBorda`: `treme`, `deslocar`),
`BossNucleo.ts` (o campo `aperto` → `borda`), `test-guardiao-aperto-jogo.mjs`, `_gif-aperto.mjs`.

- [x] A luz que não morde (`luzTeto`): 3 px, onde não há fio.
- [x] Os testes do aperto seguem verdes.

## Task 3: as gotas, o pulso, no Guardião

**Files:** Create `src/entities/guardiao/sangueTeto.ts`; Modify `camadaCabos.ts` (`pulso`), `padroes.ts`
(`'teto'`, o rodízio), `BossNucleo.ts` (a ação `teto`), `scripts/test-guardiao-padroes.mjs`.

- [x] A gota em pixel (7×11, quatro tons escuros), pendurada esticando (`pendurar`), solta no `perigos` com aceleração
  (sem gravidade de mundo), o halo carmim, o respingo na borda de baixo, o fim fora da tela.
- [x] O pulso: uma conta de luz de 7 px subindo cada corda, do corpo à âncora.
- [x] A ação `teto`: `borda.iniciar(new TetoQueSangra())`, os cabos dão um tranco a cada onda, o balanço reduzido, o
  miolo aberto, sem salva; acaba quando a borda murchou e a última gota saiu; na morte, a borda volta e o pulso apaga.

## Task 4: em jogo, o filme, a folha

**Files:** Create `scripts/test-guardiao-teto-jogo.mjs`, `scripts/_guardiao/_gif-teto.mjs`.

- [x] Em jogo: as fases; o pulso; a faixa substituída; 24 gotas em 8 colunas; retas e acelerando; a parada perde 1
  vida, a que lê 0, a escondida na faixa do teto é mordida; sem salva; na estação; o miolo toma dano; no fim tudo volta.
- [x] O filme: `node scripts/_guardiao/_gif-teto.mjs <out.gif>` (`le`: no vão da 1ª onda, depois na coluna velha dela).
- [x] A folha (passo 5, rodada 1) e o veredito dele: APROVADO como está.
