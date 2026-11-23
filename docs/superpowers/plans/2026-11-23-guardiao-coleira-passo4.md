# O Guardião na coleira — passo 4: o aperto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** aos 33–0 %, o Guardião opera o próprio Leviatã pela coleira: um PUXÃO (os cabos esticam, a borda estremece) e
uma CONSTRIÇÃO que corre a arena da direita para a esquerda, as bordas de cima e de baixo inchando para dentro no mesmo
ponto até um vão de 50 px — a ação nova do rodízio (spec `specs/2026-11-22-guardiao-coleira-design.md` §7 e §8).

**Architecture:** um módulo PURO (`src/entities/guardiao/aperto.ts`: o perfil do anel, as fases, o empurrão pela normal
da parede) testado em Node; uma camada Phaser (`src/entities/guardiao/camadaAperto.ts`) que redesenha a FAIXA da moldura
coluna a coluna numa CanvasTexture, cada coluna deslocada um número inteiro de pixels, lendo os pixels das próprias
texturas da faixa e da saia (a continuação dela além da tela), com as peças originais apagadas por alpha enquanto isso;
a `Moldura` ganha só um leitor (`pecasDaFaixa`); o `BossNucleo` ganha a ação `aperto` e o rodízio dos 33–0 % passa a
investida → serpentes → aperto → serra.

**Tech Stack:** TypeScript, Phaser 3.90 (Arcade), Vite; testes puros com `node --experimental-transform-types`; em jogo
e o filme com Playwright + sharp (o molde de `test-guardiao-serpente-jogo.mjs` e `_gif-serpentes.mjs`).

## Global Constraints

- O que a spec fixa (§7): o aviso é um puxão forte — os cabos esticam para cima, o corpo se firma, a borda inteira
  estremece **~0,6 s**; a onda corre **da direita para a esquerda**, as bordas de cima e de baixo incham **no mesmo
  ponto**, o vão **~50 px, nunca menos**, a tela em **~2,5 s**; cada coluna desloca um **número inteiro** de pixels —
  nada estica nem se redesenha; o contato **empurra, não tira vida**; **sem salva** durante a onda.
- A janela de dano (§8): na estação, operando os cabos, o miolo aberto.
- O rodízio (§8): 33–0 % investida → serpentes → aperto → serra (o teto que sangra entra no passo 5).
- A faixa é DECORAÇÃO na `Moldura` (a colisão do jogo é a mesa); o aperto não muda a física da moldura — quem empurra é
  o `BossNucleo`, com as superfícies deformadas da camada.
- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`); GIFs fora do git.

## As decisões MINHAS deste passo (marcar na folha e perguntar)

1. **O vão alterna alto/baixo** a cada aperto: A em y 80, B em y 138 (a figura fixa que se lê, como os pulsos A/B; nunca
   sorteado).
2. **O anel incha no lugar à direita (0,45 s) antes de correr** — é ali que o vão se lê; depois corre a 175 px/s (mais
   rápido que a nave, 110: não dá para ficar à frente dele).
3. **O empurrão é pela normal da parede:** no flanco da frente ele também leva a nave para a esquerda.
4. **A forma:** um cosseno levantado de 64 px de meia largura (com 46 a parede de 80 px subia em tenda).
5. **O que aparece quando a borda desce:** a continuação da própria peça (a saia, em espelho) — na faixa D isso traz as
   luzes vermelhas da parte de baixo da peça, que normalmente ficam fora da tela.

## Task 1: as regras puras

**Files:** Create `src/entities/guardiao/aperto.ts`, `scripts/test-guardiao-aperto.mjs`.

- [x] `APERTO` (AVISO 0,6, CRESCE 0,45, TRAVESSIA 2,5, MEIA 64, VAO 50, X0 372, X1 −66, TREME 1 px em blocos de 6
  colunas a cada 0,05 s), `VAOS_Y = [80, 138]`.
- [x] `anel(x, xc)`, `deslocamentos(x, yTeto, yChao, xc, amp, vaoY) → { teto, chao }` (inteiros, `floor`: o vão nunca
  abaixo de 50 com as superfícies reais da coluna).
- [x] `class Aperto` (aviso → cresce → corre → fim), `empurrar(nave, w, h, teto, chao)`.
- [x] O teste: o vão ≥ 50 em toda coluna, todo xc, toda amplitude, com as superfícies oscilando 29–31/183–187; inteiro;
  no pico o vão centrado; as fases e os tempos; só para a esquerda; nasce na borda e sai inteiro; mais rápido que a
  nave; o empurrão (no vão nada, dentro sai, no flanco leva para a esquerda, longe nada).
  Run: `node --experimental-transform-types scripts/test-guardiao-aperto.mjs` → `TODOS OK`.

## Task 2: a camada e o leitor da moldura

**Files:** Create `src/entities/guardiao/camadaAperto.ts`; Modify `src/systems/Moldura.ts` (+ `pecasDaFaixa()`).

- [x] `pecasDaFaixa()`: teto e chão, de trás para a frente (a saia, a peça), e os traços.
- [x] `CamadaAperto(scene, moldura)`: CanvasTexture 384×216 a depth −0,58; `soltar(vaoY)` apaga as peças (alpha 0) e
  mostra a camada; por quadro mede os deslocamentos (o anel + o estremecer do aviso), lê cada coluna das texturas (o
  flip, o tint, a escala de cada peça) deslocada, e devolve `tetoEm(x)`/`chaoEm(x)` deformados; no fim (ou `cancelar`)
  devolve o alpha e esconde a camada.

## Task 3: no Guardião

**Files:** Modify `src/entities/BossNucleo.ts`, `src/entities/guardiao/padroes.ts`, `src/scenes/GameScene.ts` (passa a
`moldura` ao `BossNucleo`), `scripts/test-guardiao-padroes.mjs`.

- [x] `AcaoGuardiao` + `'aperto'`; `RODIZIO[2] = ['investida', 'serpentes', 'aperto', 'serra']`.
- [x] A ação `aperto`: `soltar(VAOS_Y[vez % 2])`, os cabos tensos + `golpe(9)`, o tremor da câmera 0,6 s; o balanço
  reduzido (o das serpentes), o miolo brilhando, sem salva; no fim os cabos soltam e ele volta a flutuar.
- [x] `empurrarNave`: `empurrar` com a caixa 21×9 e as superfícies deformadas, `updateFromGameObject` no corpo.
- [x] Na morte (`trocarParaPredador`) e no `destroy`: `cancelar`.

## Task 4: em jogo, o filme, a folha

**Files:** Create `scripts/test-guardiao-aperto-jogo.mjs`, `scripts/_guardiao/_gif-aperto.mjs`.

- [x] Em jogo: as fases; o vão A e depois o B; o vão ≥ 50 medido na camada; a borda incha ≥ 60 px; a parada é empurrada
  e fica sempre dentro do corredor deformado, sem dano; sem salva; ele na estação; o miolo toma dano; a faixa original
  some e volta inteira; os cabos tensos e depois soltos; a que lê passa sem encostar.
- [x] O filme: `node scripts/_guardiao/_gif-aperto.mjs <out.gif> --paineis 0:le,0:parada` (0 = vão A, 1 = vão B).
- [x] A folha (passo 4, rodadas 1 e 2) e o veredito dele: APROVADO na rodada 2 (a borda torcida cobra 1 vida, o fio
  aceso é o hitbox — `CamadaAperto.FIO`, `BossNucleo.morde`).
