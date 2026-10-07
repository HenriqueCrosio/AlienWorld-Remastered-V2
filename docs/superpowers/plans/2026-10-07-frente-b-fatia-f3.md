# FRENTE B · Fatia F3 (Caçador-lula + Tentáculo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** os dois elites da F3 jogáveis — o Caçador de Vácuo como a LULA que some soltando TINTA, e o Tentáculo do casco
com a regra do casco — no roteiro da Fase 3 e no sandbox.

**Architecture:** a da F2 (spec-mãe §2): regras PURAS em `src/elitesRegras.ts` (testadas em node), números em
`src/data/numerosElites.ts`, um `ComportamentoElite` por elite em `src/entities/elites/`, todo dano pelo
`GameScene.ferirInimigo`, tiros por `PadroesDeTiro.vestirArte`. Novidades na infraestrutura: o elite pode ficar
INTOCÁVEL (`intocavel`), ouvir o RABO (`aoRabo`), saber a velocidade do CHÃO (`ctx.velChao`) e ter CORPOS que absorvem
tiro e ferem a nave (`EnemySystem.corposElite`). A tinta e o pontilhado são quadros ASSADOS por script.

**Tech Stack:** Phaser 3 (Arcade), TypeScript, Vite; sharp (scripts de arte); playwright (sonda e GIF).

**Spec:** `docs/superpowers/specs/2026-10-06-frente-b-fatia-f3-design.md` (com a emenda de 07/10).

## Global Constraints

- Tempos em segundos, distâncias em px de jogo (384×216), velocidades em px/s; todo número em `numerosElites.ts`.
- `elitesRegras.ts` e `numerosElites.ts` ficam PUROS (sem Phaser), importáveis em node com a extensão `.ts`.
- Elite pressiona, não pune (memória `elites-pressionam-sem-punir`).
- A tinta fica por cima do cenário e dos inimigos e POR BAIXO de todo tiro e da nave (§2.3).
- O que toca o casco anda com o casco (`velChao`); o que está solto anda na tela (§3.3).
- Arte de efeito é assada em pixel na resolução nativa — nada de Graphics vetorial para a tinta (memória
  `efeito-de-cena-assado-em-pixel`). A linha da mira é telégrafo (1px tracejado em código, como na folha).
- Commits só com a autoria do Henrique, sem trailer de co-autoria (memória `git-autoria`). Editar com Edit, não com
  `sed` (CRLF).

## Mapa de arquivos

| Arquivo | Papel |
|---|---|
| `src/data/numerosElites.ts` | + `cacador`, `tinta`, `tentaculo` |
| `src/elitesRegras.ts` | + `cacadorAvanca`, `cacadorTangivel`, `tintaDoSumico`, `tentaculoAvanca`, `rachadura1X`, `rachadura2X`, `tentaculoEnraizado`; `escolherPosto` aceita a faixa |
| `scripts/test-elites-regras.mjs` | + os casos da F3 |
| `scripts/_elites/_tinta-lib.mjs` | a tinta à mão (o algoritmo do teste aprovado), compartilhada |
| `scripts/_elites/_instalar-f3.mjs` | instala a lula (85%, sem o pixel claro), o pontilhado dela, os quadros da tinta e a arte provisória do Tentáculo |
| `src/scenes/BootScene.ts` | carrega as chaves novas + `FRAMES` + `ANIMS` |
| `src/entities/elites/tipos.ts` | `CtxElite.velChao`, `CtxElite.corpos`; `intocavel?`, `aoRabo?` |
| `src/systems/EnemySystem.ts` | `corposElite`, `velChao`, `intocavel()`, `aoRabo()`, DEFS `cacador`/`tentaculo`, depth 1 dos tiros |
| `src/systems/WeaponSystem.ts` | depth 1 dos tiros do jogador |
| `src/scenes/GameScene.ts` | overlaps dos corpos, nave em depth 1, `ferirInimigo` respeita o intocável, rabo, `velChao` |
| `src/entities/elites/Cacador.ts` | a lula |
| `src/entities/elites/Tentaculo.ts` | o Tentáculo |
| `src/sandbox/config.ts` (+ a arena) | os dois na montagem; casco revelado na F3 com Tentáculo |
| `src/systems/StageDirector.ts` | o roteiro do §4 |
| `scripts/probe-elites-f3.mjs` | a sonda em jogo real |
| `scripts/_elites/_gif.mjs` | + `cacador` e `tentaculo` (fase 3) |

---

### Task 1: Números e regras puras (TDD)

**Files:** Modify `src/data/numerosElites.ts`, `src/elitesRegras.ts`, `scripts/test-elites-regras.mjs`

**Produces:**
- `type EstadoCacador = 'escondido'|'surge'|'mira'|'trava'|'rajada'|'some'|'foi'`
- `cacadorAvanca(estado: EstadoCacador, t: number, sumicos: number): EstadoCacador` — `sumicos` = quantos SOME já
  começaram, contando o atual; o 3º SOME termina em `'foi'`.
- `cacadorTangivel(estado): boolean` — falso só em `escondido` e `foi`.
- `tintaDoSumico(n: number): 'sopro'|'cortina'` — `n` 1-based; o último (`ressurgimentos`) é a cortina.
- `type EstadoTentaculo = 'aviso1'|'bote'|'mergulho'|'pausa'|'aviso2'|'ergue'|'meiaLua'|'segura'|'afunda'|'foi'`
- `tentaculoAvanca(estado, t): EstadoTentaculo` — a ordem fixa, cada um pelo seu tempo.
- `rachadura1X(naveX, velChao): number` = `naveX + velChao × aviso1S`.
- `rachadura2X(naveX): number` = `min(rachadura2XMax, max(rachadura2X, naveX + rachadura2DistMin))`.
- `tentaculoEnraizado(estado): boolean` — `aviso1`, `aviso2`, `ergue`, `meiaLua`, `segura`, `afunda`.
- `escolherPosto(sorte, yAnterior, faixa = ELITES.sentinela)` — `faixa: { postoX, postoY, postoDistY }`.

- [ ] **Step 1: os testes** — acrescentar ao `test-elites-regras.mjs`:

```js
// ── O CAÇADOR (a lula, spec F3 §2) ──
const C = ELITES.cacador;
conferir(cacadorAvanca('escondido', C.escondidoS - 0.01, 0) === 'escondido' && cacadorAvanca('escondido', C.escondidoS, 0) === 'surge', 'escondido dura escondidoS e surge', C.escondidoS);
conferir(['surge', 'mira', 'trava', 'rajada'].every((f, k, a) => cacadorAvanca(f, 99, 1) === ['mira', 'trava', 'rajada', 'some'][k]), 'surge → mira → trava → rajada → some', null);
conferir(cacadorAvanca('some', C.someS, 1) === 'escondido' && cacadorAvanca('some', C.someS, C.ressurgimentos) === 'foi', `depois do ${C.ressurgimentos}º sumiço vai embora`, null);
conferir(!cacadorTangivel('escondido') && !cacadorTangivel('foi') && ['surge', 'mira', 'trava', 'rajada', 'some'].every(cacadorTangivel), 'escondido não tem corpo; visível, tem', null);
conferir(tintaDoSumico(1) === 'sopro' && tintaDoSumico(C.ressurgimentos - 1) === 'sopro' && tintaDoSumico(C.ressurgimentos) === 'cortina', 'sopro, sopro, CORTINA na saída', null);
const pc = escolherPosto(() => 0.5, null, C);
conferir(pc.x >= C.postoX[0] && pc.x <= C.postoX[1], 'o posto do caçador cai na metade direita', pc);

// ── O TENTÁCULO (spec F3 §3, a regra do casco §3.3) ──
const T = ELITES.tentaculo;
const ciclo = ['aviso1', 'bote', 'mergulho', 'pausa', 'aviso2', 'ergue', 'meiaLua', 'segura', 'afunda', 'foi'];
conferir(ciclo.slice(0, -1).every((f, k) => tentaculoAvanca(f, 99) === ciclo[k + 1]), 'um ciclo por aparição, na ordem da spec', null);
conferir(tentaculoAvanca('aviso1', T.aviso1S - 0.01) === 'aviso1', 'o aviso segura o tempo dele', T.aviso1S);
conferir(rachadura1X(100, 84) === 100 + 84 * T.aviso1S, 'a rachadura 1 nasce À FRENTE: o chão a traz até a nave', rachadura1X(100, 84));
conferir(rachadura2X(60) === T.rachadura2X && rachadura2X(260) === Math.min(T.rachadura2XMax, 260 + T.rachadura2DistMin), 'a rachadura 2 nasce longe da nave', [rachadura2X(60), rachadura2X(260)]);
conferir(tentaculoEnraizado('ergue') && tentaculoEnraizado('afunda') && !tentaculoEnraizado('bote') && !tentaculoEnraizado('mergulho'), 'preso ao casco só quando toca o casco', null);
```

(e importar `cacadorAvanca, cacadorTangivel, tintaDoSumico, tentaculoAvanca, rachadura1X, rachadura2X,
tentaculoEnraizado` no topo).

- [ ] **Step 2:** `node scripts/test-elites-regras.mjs` → FALHA (export ausente).
- [ ] **Step 3: os números** (`numerosElites.ts`, dentro de `ELITES`):

```ts
  cacador: {
    hp: 10, score: 300,
    escondidoS: 1.2, surgeS: 0.3, miraS: 0.6, travaS: 0.3, rajadaS: 0.25, someS: 0.4,
    ressurgimentos: 3,
    agulhaN: 3, agulhaEspacoS: 0.08, velAgulha: 200,
    postoX: [220, 340] as const, postoY: [36, 140] as const, postoDistY: 50,
  },
  tinta: {
    sopro: { cresceS: 0.15, seguraS: 0.5, someS: 0.9 },
    cortina: { cresceS: 0.35, seguraS: 1.2, someS: 1.9 },
    qps: 20,
  },
  tentaculo: {
    hp: 14, score: 350,
    aviso1S: 0.8, boteS: 0.7, mergulhoS: 0.9, pausaS: 0.6, aviso2S: 0.8, ergueS: 0.4, meiaLuaS: 0.2, seguraS: 0.8, afundaS: 0.6,
    chaoY: 153, tetoBoteY: 40, mergulhoDX: -56,
    rachadura2X: 350, rachadura2XMax: 370, rachadura2DistMin: 140,
    alturaErgue: 60, gomos: 8, gomoEspaco: 7,
    meiaLuaN: 6, meiaLuaArcoGraus: 140, velMeiaLua: 90,
  },
```

- [ ] **Step 4: as regras** (`elitesRegras.ts`): as funções do bloco **Produces** acima, com o `switch`/a ordem fixa.
- [ ] **Step 5:** `node scripts/test-elites-regras.mjs` → `TUDO OK`.
- [ ] **Step 6:** commit `feat(elites): as regras e os números da F3 — a lula (ciclo, tinta) e o Tentáculo (a regra do casco)`.

### Task 2: A arte instalada (a lula, o pontilhado, a tinta, a provisória do Tentáculo)

**Files:** Create `scripts/_elites/_tinta-lib.mjs`, `scripts/_elites/_instalar-f3.mjs`; Modify
`scripts/_elites/_tinta-f3.mjs` (passa a importar a lib), `src/scenes/BootScene.ts`.

**Produces (chaves de textura/animação):** `eliteCacador` (41×41), anims `elite-cacador-surge` / `elite-cacador-some`
(6 quadros, 20 qps, sem loop), `elite-tinta-sopro` (18 q) / `elite-tinta-cortina` (38 q) a 20 qps sem loop,
`eliteTentaculoCabeca` (24×22, boca à ESQUERDA), `eliteTentaculoGomo` (13×13), anim `elite-rachadura` (3 q, 8 qps,
loop), `eliteTiroAgulha` (5×1), `eliteTiroBolinha` (3×3).

- [ ] **Step 1:** extrair `tintaMao(img, T, cx, cy, t)` + `noise`/`bayer` do `_tinta-f3.mjs` para `_tinta-lib.mjs`
  (`T = { cresceS, seguraS, someS, blobs }`, `t` relativo ao começo); o teste passa a importar dela e gera o mesmo GIF.
- [ ] **Step 2:** `_instalar-f3.mjs`: (a) a lula 15 a 85% (`cacadorLula-21-15-085.png`) com o pixel claro trocado pela
  mediana dos vizinhos (pixel com `min(r,g,b) > 150`, listado no console) → `public/sprites/elite-cacador.png`;
  (b) pontilhado Bayer 4×4 em 6 passos → `elite-cacador-some-0..5.png` e o inverso `elite-cacador-surge-0..5.png`;
  (c) a tinta: SOPRO em quadro 48×48 (18 q) e CORTINA em 76×76 (38 q), centro no meio, fundo transparente →
  `elite-tinta-sopro-N.png` / `elite-tinta-cortina-N.png`; (d) a provisória à mão de 06/10 →
  `elite-tentaculo-cabeca.png`, `elite-tentaculo-gomo.png`, `elite-rachadura-0..2.png`, `tiros/elite-agulha.png`,
  `tiros/elite-bolinha.png`.
- [ ] **Step 3:** `BootScene`: `FRAMES` (`eliteCacadorSurgeAnim: 6`, `eliteCacadorSomeAnim: 6`, `eliteTintaSoproAnim: 18`,
  `eliteTintaCortinaAnim: 38`, `eliteRachaduraAnim: 3`), `ANIMS` (as cinco), e as chaves no mapa de PNGs.
- [ ] **Step 4:** `npx tsc --noEmit` limpo; o jogo carrega sem 404 (console).
- [ ] **Step 5:** commit `feat(elites): a arte da F3 instalada — a lula 15 (85%), o pontilhado, a tinta assada e a provisória do Tentáculo`.

### Task 3: A infraestrutura (intocável, rabo, chão, corpos, camadas)

**Files:** Modify `tipos.ts`, `EnemySystem.ts`, `WeaponSystem.ts`, `GameScene.ts`

**Produces:** `CtxElite.velChao: number`, `CtxElite.corpos: Phaser.Physics.Arcade.Group`;
`ComportamentoElite.intocavel?(e): boolean`, `ComportamentoElite.aoRabo?(e, ctx): void`;
`EnemySystem.corposElite`, `EnemySystem.velChao`, `EnemySystem.intocavel(e)`, `EnemySystem.aoRabo()`.

- [ ] **Step 1:** tipos + `EnemySystem` (grupo `corposElite` com `allowGravity: false`; `ctxElite` passa `velChao` e
  `corpos`; `intocavel`; `aoRabo` percorre os elites vivos). Os tiros inimigos e os do jogador nascem em depth 1
  (`createCallback` do grupo); a nave em depth 1 — a tinta mora em 0,5.
- [ ] **Step 2:** `GameScene`: `overlap(ship, corposElite) → damageShip`; `overlap(weapons.bullets, corposElite) →`
  o tiro morre no corpo (faísca + `release`), sem dano; `ferirInimigo` devolve `'bloqueado'` se `intocavel`;
  `case 'rabo'` chama `enemies.aoRabo()`; `enemies.velChao = SCROLL_SPEED * frenagem` a cada quadro.
- [ ] **Step 3:** `npx tsc --noEmit`; `node scripts/probe-elites.mjs` segue 15/15 (nada da F2 mudou).
- [ ] **Step 4:** commit `feat(elites): a infraestrutura da F3 — intocável, o rabo, a velocidade do chão e os corpos que absorvem`.

### Task 4: O Caçador (a lula)

**Files:** Create `src/entities/elites/Cacador.ts`; Modify `EnemySystem.ts` (DEFS `cacador`), `src/sandbox/config.ts`.

- [ ] **Step 1:** `CACADOR: ComportamentoElite` — nasce ESCONDIDO num posto (`escolherPosto(…, ELITES.cacador)`); a cada
  quadro `cacadorAvanca`; SURGE (mostra, liga o corpo, toca `elite-cacador-surge`), MIRA (linha 1px tracejada vermelha da
  boca à nave, seguindo), TRAVA (o ângulo congela, a linha pisca), RAJADA (3 agulhas `eliteTiroAgulha` na linha
  travada, a cada `agulhaEspacoS`), SOME (`sumicos++`, solta a tinta `tintaDoSumico(sumicos)` no lugar — sprite em depth
  0,5 que toca a animação e se destrói —, toca `elite-cacador-some`), ESCONDIDO (invisível, corpo desligado, novo
  posto longe da altura anterior), FOI (destrói sem pontos). `intocavel` = `!cacadorTangivel`. `aoRabo`: se visível,
  solta o SOPRO; destrói sem pontos.
- [ ] **Step 2:** DEFS `cacador` (`texture: 'eliteCacador'`, hp/score de `ELITES.cacador`, `elite: CACADOR`); sandbox:
  `cacador` em `INIMIGOS`, nome `caçador de vácuo (elite)`, máx 5.
- [ ] **Step 3:** `npx tsc --noEmit`; jogar no sandbox F3 com 1 caçador.
- [ ] **Step 4:** commit `feat(elites): o Caçador de Vácuo — a lula que mira, trava, atira 3 agulhas e some na tinta`.

### Task 5: O Tentáculo

**Files:** Create `src/entities/elites/Tentaculo.ts`; Modify `EnemySystem.ts` (DEFS `tentaculo`), sandbox.

- [ ] **Step 1:** `TENTACULO: ComportamentoElite` — a cabeça é o inimigo; `gomos` sprites em `ctx.corpos`; a rachadura é
  um sprite (`elite-rachadura`) em depth −74 sobre a placa do casco (−75). A raiz (`raizX`) e a rachadura andam
  `−velChao·dt` enquanto `tentaculoEnraizado`. BOTE: a cabeça vai do buraco ao ponto onde a nave estava no fim do aviso
  (teto `tetoBoteY`, nunca abaixo de `chaoY − 10`), os gomos seguem o CAMINHO dela; os pontos do caminho abaixo da crista
  andam com o chão (a raiz é o buraco enquanto os gomos passam). MERGULHO: o arco passa do ponto e cai `mergulhoDX`
  para trás, com tudo em depth −76 (atrás da placa). ERGUE/SEGURA/AFUNDA: coluna rígida sobre a raiz que rola. MEIA-LUA:
  6 `eliteTiroBolinha` num arco de 140° para cima. Abaixo da crista, os gomos são cortados (`setCrop`) e sem corpo; a
  cabeça só tem corpo acima da crista. `intocavel`: a cabeça escondida.
- [ ] **Step 2:** DEFS `tentaculo`; sandbox: `tentaculo` em `INIMIGOS`; na F3 com tentáculo, a arena revela o casco.
- [ ] **Step 3:** `npx tsc --noEmit`; jogar no sandbox F3.
- [ ] **Step 4:** commit `feat(elites): o Tentáculo do casco — a regra do casco, o bote, o mergulho por trás e a meia-lua`.

### Task 6: O roteiro da F3 (§4)

**Files:** Modify `src/systems/StageDirector.ts` (`STAGE_3`)

- [ ] **Step 1:** t=11 banner `CAÇADOR DE VÁCUO` + `cacador`; sai a onda de 6 drones de t=16; t=27,5 `cacador`;
  t=63,5 `tentaculo` (sai a onda de batedores de t=64 e os kamikazes de t=67); t=75 `tentaculo`.
- [ ] **Step 2:** commit `feat(elites): a F3 no roteiro — o Caçador no ato 1, o Tentáculo no ato 2`.

### Task 7: A sonda, os GIFs e a papelada

**Files:** Create `scripts/probe-elites-f3.mjs`; Modify `scripts/_elites/_gif.mjs`, docs.

- [ ] **Step 1:** a sonda (sandbox F3, invulnerável): o caçador escondido é intocável (`ferirInimigo` → `bloqueado`, hp
  igual); a rajada sai na linha travada (3 `eliteTiroAgulha` com o mesmo ângulo); cada sumiço cria um sprite de tinta
  (o 3º é a cortina); `aoRabo` o tira sem pontos; o tentáculo: a rachadura anda com o chão; os tiros do jogador morrem nos
  gomos sem tirar vida; a cabeça exposta perde vida; a meia-lua solta 6 bolinhas; no fim do ciclo ele some. E
  `probe-elites.mjs` segue 15/15.
- [ ] **Step 2:** `_gif.mjs` com `cacador` e `tentaculo` (fase 3; casco revelado para o tentáculo).
- [ ] **Step 3:** START novo, HANDOFF e memória.
- [ ] **Step 4:** commit `test(elites): a sonda da F3 e os GIFs` / `docs: …`.
