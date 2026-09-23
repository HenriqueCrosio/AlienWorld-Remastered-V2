# B3 · O Predador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Nota de execução (16/09):** ele mandou implementar direto (*"pode implementar e fazer, corrigimos
> depois"*). Este plano é executado INLINE na mesma sessão que escreveu a spec, então os passos de
> código trazem as interfaces, as constantes medidas e o comportamento exato — o código completo vai
> direto para os arquivos, não é duplicado aqui.
>
> **Status (17/09): EXECUTADO** — as 8 tasks entraram em 16/09 (`bd4fe02`…`25ffe5b`). Depois dele, duas rodadas
> de ajuste FORA deste plano, guiadas pelos testes jogados (`46cce12`, `933daa0`): elas mudaram a arte, o slash, o
> teto e a estrutura dos quadros. **O estado vivo NÃO é este plano:** é a 🚦/⏸️ do START e a seção 7 da spec.

**Goal:** trocar a 2ª forma do chefão da Fase 4 (o coração) pelo predador — surgimento, luta em três fases, breu.

**Architecture:** `BossNucleo` segue sendo o `StageBoss` da cena e fica com o guardião e a troca; a forma 2 inteira
mora num `Predador` novo, para quem o `BossNucleo` delega `update`/`damage`/`targets` depois da troca. A cena só
aprende um campo novo (`armaTravada`). Arte entra asset por asset: sem folha, o estático segura a luta.

**Tech Stack:** Phaser 3.90 (Arcade), TypeScript, Vite; sondas Playwright (`scripts/probe-*.mjs`); sharp para as folhas.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-16-fatia7-b3-predador-design.md`.
- Tela 384×216. Colisão de chão/teto: `GROUND_Y = 206`, `TETO_Y = 10`.
- A arte manda na hitbox: offsets só de `scripts/_f4/_medir-predador.mjs`, nunca a olho.
- Escalas: surgimento **0,7**, luta **0,47**. Vida da forma 2: **180**. Fases: >66% · >33% · resto.
- Arte entra asset por asset (`scene.textures.exists` / `anims.exists` antes de tocar).
- Commits só com a autoria dele, sem `Co-Authored-By`.
- Sondas rodam UMA POR VEZ com `npm run dev` de pé (swiftshader é lento; em paralelo elas brigam).

## Medidas (16/09, quadros de 256²)

| arte | alfa | miolo (o alvo) | offset do miolo ao centro |
|---|---|---|---|
| S (`giro/corrigido/0`) | x=7..250 y=0..253 | 52×53 em 134,123 | **+6, −5** |
| luta (`giro/corrigido/8`) | x=22..213 y=4..252 | 46×42 em 105,125 | **−23, −3** |
| teto (`teto/pose`) | x=35..215 y=0..253 | 44×40 em 132,110 | **+4, −18** |

## Arquivos

- Create `scripts/_f4/_instalar-predador.mjs` — monta as folhas em `public/sprites/predador-*.png`.
- Modify `src/scenes/BootScene.ts` — as entradas das texturas/folhas do predador.
- Modify `src/entities/Boss.ts` — `StageBoss.armaTravada?: boolean`.
- Modify `src/scenes/GameScene.ts` — `firing && !boss.armaTravada` no `weapons.update`.
- Modify `src/entities/BossNucleo.ts` — tira o coração; troca vira explosão sangrenta + sangue na tela + `Predador`.
- Create `src/entities/Predador.ts` — a forma 2 inteira.
- Modify `scripts/probe-stage4.mjs` — os asserts do coração viram os do predador.
- Create `scripts/_f4/_ver-predador.mjs` — captura quadro a quadro para ele julgar.

---

### Task 1: A arte instalada

**Files:** Create `scripts/_f4/_instalar-predador.mjs` · Modify `src/scenes/BootScene.ts`

**Produces:** texturas `predadorS`, `predadorLuta`, `predadorTeto` (256²) e folhas de 256² por quadro:
`predadorUrroSheet`, `predadorGiroSheet`, `predadorIdleSheet`, `predadorSlashSheet`, `predadorLavaSheet`,
`predadorTetoLavaSheet`, `predadorMorteSheet` — cada folha só é escrita se os quadros existirem em
`assets/raw/furia-predador-anim/<clipe>/` (giro vem de `furia-predador-giro/corrigido/`).

- [ ] Script: para cada clipe, lê `0..N.png`, confere 256², aplica a correção de brilho do `_giro-brilho.mjs`
      (gama para a lum do quadro 0 do clipe), compõe em linha, grava em `public/sprites/`.
- [ ] `BootScene`: entradas `{ path, w: 256, h: 256 }` das folhas e as três poses estáticas.
- [ ] Run `node scripts/_f4/_instalar-predador.mjs` → lista das folhas escritas. `npm run typecheck` → sem erro.
- [ ] Commit `feat(b3): a arte do predador instalada`.

### Task 2: A sonda cobra o predador (falha antes)

**Files:** Modify `scripts/probe-stage4.mjs:190-290`

**Consumes:** estado exposto pelo boss: `boss.forma === 'predador'`, `boss.predador.estado`, `boss.predador.fase`,
`boss.predador.hp`, `boss.predador.recuperando`, `boss.predador.breu`, `boss.armaTravada`.

- [ ] Troca os asserts do coração por:
  1. depois de zerar o guardião: `forma === 'predador'` e `armaTravada === true` durante `estado === 'surgindo'`;
  2. espera `estado !== 'surgindo'` (timeout 8s) → `armaTravada === false` e a escala do sprite ≈ 0,47;
  3. a bala real (a nave mirando o `targets[0]`) baixa `predador.hp`;
  4. `damage(10)` com `recuperando === true` tira 20; com `false`, tira 10;
  5. levar a vida a ≤33% → `breu === true`;
  6. `damage(999)` → a cutscene final (os asserts de `Interlude4`/`GameOver` ficam como estão).
- [ ] Run `node scripts/probe-stage4.mjs` → FALHA em "a casca morta revela o PREDADOR".

### Task 3: A arma trava pela cena

**Files:** Modify `src/entities/Boss.ts:12-27`, `src/scenes/GameScene.ts:552-558`

- [ ] `StageBoss`: `readonly armaTravada?: boolean;` com o comentário do porquê (trava de cena, não de calor).
- [ ] `GameScene.update`: `const travada = this.boss?.armaTravada === true;` e `(this.controller.autoFire || input.firing) && !travada`.
- [ ] `npm run typecheck` → ok. Commit `feat(b3): o chefão pode travar a arma do jogador`.

### Task 4: A troca — explosão sangrenta, sangue na tela, o predador surge

**Files:** Modify `src/entities/BossNucleo.ts` · Create `src/entities/Predador.ts` (esqueleto + surgimento)

**Produces:** `class Predador { constructor(scene, enemies, fx, sprite, x, y); readonly core: Sprite; estado; fase; hp;
recuperando: boolean; breu: boolean; armaTravada: boolean; update(dt, target); damage(n): boolean; destroy() }`.
`BossNucleo.forma: 'guardiao' | 'predador'`; `BossNucleo.predador: Predador | null`; `armaTravada` delega.

- [ ] `BossNucleo`: remove `nucleo-beat`, `aberto`, `cicloT`, `cdParede`, `updateCoracao`, `parede`, `mirado`, as constantes `C_*`.
      `HP_CORACAO` → `HP_PREDADOR = 180`. `trocarParaCoracao` → `trocarParaPredador`: a partir de `MORTE_MS`, a
      explosão sangrenta (`fx.explodeBig` + emissor de gotas vermelho-escuras com `gravityY` + `cameras.main.flash(260,120,0,0)`
      + `shake(500, 0.012)`) e `sangueNaTela()` (8–12 manchas desenhadas em `Graphics` → textura `sangueTela`, imagens com
      `setScrollFactor(0)`, depth 95, escorrendo +18px e apagando até ~3000ms). A carcaça apaga (alpha) até `TROCA_MS`.
      Em `TROCA_MS` cria o `Predador` na estação do guardião.
- [ ] `armaTravada` fica `true` desde a vida do guardião zerar (não só depois do `TROCA_MS`).
- [ ] `Predador` — estado `surgindo`: escala 0,7, textura `predadorS`, corpo desligado, `damage` devolve false;
      toca `predador-urro` (1200ms, tranco no meio); depois `predador-giro` enquanto um tween faz o arco
      (sobe ~40px e desce até a linha do chão) e leva a escala de 0,7 a 0,47 em 800ms; pousa → `chao`, arma destrava.
- [ ] `damage` e `update` do `BossNucleo` delegam ao predador; `targets[0]` passa a ser o `core` do predador.
- [ ] Run `npm run typecheck`; `node scripts/probe-stage4.mjs` → passa 1–2 da Task 2.
- [ ] Commit `feat(b3): a troca — explosão sangrenta, sangue na tela e o surgimento do predador`.

### Task 5: Fase 1 — investida+slash, lava, dano dobrado

**Files:** Modify `src/entities/Predador.ts`

**Constantes:** `CARGA = 1.5` (s) · `CARGA_MIN = 0.9` · `BOTE_VEL = 320` · `SLASH_MS = 200` · `RECUP_SLASH = 1.0` ·
`TELEG_LAVA = 0.5` · `RECUP_LAVA = 0.6` · `DANO_RECUP = 2` · `LAVA_G = 260` (px/s²) · `LAVA_VOO = 1.1` (s).

- [ ] `chao`: idle (`predador-idle` ou `predadorLuta`), escolhe o próximo ataque a cada 1,2–2s (alterna, sem repetir 3×).
- [ ] `carga`: o glow do core pulsa com período que cai de 0,5s a 0,08s; guarda `alvoY = target.y` no último quadro.
- [ ] `bote`: corpo inteiro, velocidade para a esquerda até `x < 90` ou chegar na altura; `slash` (anim `predador-slash`) 200ms.
- [ ] `recupera`: parado; `recuperando = true`; o core brilha mais (é o convite).
- [ ] `lava`: telégrafo (anim `predador-lava` ou tint) → 1–3 bolas do pool `enemyBullets` (textura `bolt3`, tint laranja),
      `vx = (alvoX - x)/LAVA_VOO`, `vy = (alvoY - y - 0.5·g·t²)/t`; a gravidade é aplicada pelo predador numa lista própria.
      Ao cruzar `GROUND_Y`/`TETO_Y`: some.
- [ ] `damage(n)`: `hp -= n * (recuperando ? DANO_RECUP : 1)`; tint; barra; `hp ≤ 0` → true.
- [ ] Probe asserts 3–4 passam. Commit `feat(b3): fase 1 — investida com slash, lava em arco e o dano dobrado`.

### Task 6: Fase 2 — a ronda

**Files:** Modify `src/entities/Predador.ts`

**Constantes:** âncoras `[{x:300,chao},{x:250,chao},{x:330,teto},{x:270,teto}]` · linha de apoio medida da borda
desenhada (`CHAO_APOIO`, `TETO_APOIO`) · `FORA_MIN = 1.0`, `FORA_MAX = 2.0`.

- [ ] Depois de cada ataque (fase ≥2), 50%: `salto` para outra âncora (arco de 600ms, corpo inteiro machuca);
      no teto usa `predadorTeto`/`predador-teto-lava` e o miolo do teto (+4,−18).
- [ ] 25%: `saida` — salta para `x > 384 + 80`, `fora` por 1–2s, `reentrada` numa âncora sorteada com o core acendendo
      0,5s antes no ponto de entrada.
- [ ] Commit `feat(b3): fase 2 — a ronda pelo chão e pelo teto, e a saída pela direita`.

### Task 7: Fase 3 — o breu e a lava em estilhaços

**Files:** Modify `src/entities/Predador.ts`

- [ ] Entrada: estado `urroBreu` (anim urro na pose atual, 900ms), camada `Rectangle` preta 384×216 `setScrollFactor(0)`
      depth 5, alpha 0 → 0,96 em 600ms; `ship.setDepth(6)` enquanto houver breu; halo `Image` 'puff' ADD, raio ~14px, depth 5.5.
- [ ] O core: `Image` ADD na posição do miolo, depth 7, alpha pulsando (período 2,4s; na carga o período cai).
- [ ] A revelação: uma cópia do sprite (mesma textura/quadro/flip/escala), depth 6.5, tint 0x5a1410, alpha = 0,55·pulso.
- [ ] Lava na fase 3: ao cruzar a borda, 6 estilhaços radiais (180–220px/s, sem gravidade).
- [ ] `destroy()` tira o breu e devolve a profundidade da nave.
- [ ] Probe assert 5 passa. Commit `feat(b3): fase 3 — o breu, o core que revela e a lava em estilhaços`.

### Task 8: A morte, a sonda verde, a captura, os docs

**Files:** Modify `src/entities/Predador.ts`, `scripts/probe-stage4.mjs` · Create `scripts/_f4/_ver-predador.mjs` ·
Modify `docs/superpowers/plans/2026-09-08-fatia7-moldura-START.md`, `docs/HANDOFF.md`

- [ ] Morte: `dead = true`, toca `predador-morte`, breu apaga em 800ms (a cadeia do `killBoss` já vem por cima).
- [ ] `node scripts/probe-stage4.mjs` → todos verdes. `npm run typecheck` → ok. `npm run build` → ok.
- [ ] `_ver-predador.mjs`: fotos do surgimento (+1100, +1600, +2200, +3000, +3600ms), de uma carga, de uma lava,
      do teto, do breu (pulso baixo e alto) → `docs/superpowers/folhas/2026-09-16/predador-em-jogo.png`.
- [ ] START: seção ⏸️ nova (o que entrou, o que olhar, os knobs). HANDOFF: o estado.
- [ ] Commit `feat(b3): a morte do predador, a sonda da fase 4 e a folha para ele julgar`.
