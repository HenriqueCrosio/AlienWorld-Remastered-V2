# Fase 2 — Passe Visual ("Frota Morta") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fundo pintado da colônia do cinturão como camada nova do vácuo, e uma facção nova
(ancorada na Capitânia) para os quatro inimigos redesenhados — batedor, canhoneira, kamikaze e
cargueiro — com canhoneira/batedor trocando de pele por FASE (biomec roxo na F1, cinturão na F2),
sem duplicar `EnemyKind` nem mexer em comportamento/balanceamento.

**Architecture:** Fundo: nova camada em `Parallax.buildSpace()`, mesmo mecanismo genérico
`paintedBg[]` que `paintBgF1` já usa (zero código novo em `update()`). Inimigos: troca de ARTE só
— `EnemySystem` ganha uma tabela `STAGE_2_SKIN` que resolve textura/anim por `EnemyKind` quando a
fase é a 2 (com guarda de textura: sem o PNG novo, cai na pele antiga); os quatro sprites entram
pelo pipeline de sempre do PixelLab, com a Capitânia como `style_images` de referência.

**Tech Stack:** TypeScript + Phaser 3 + Vite. PixelLab (`scripts/gerar.mjs`, `scripts/animar.mjs`,
`scripts/anim-sheet.mjs`/`scripts/install-anim.mjs`, `scripts/install-sprite.mjs`,
`scripts/sheet.mjs` para julgar candidatos ampliados). Sondas Playwright
(`scripts/probe-stage2.mjs`, já existente).

## Global Constraints

- **Facção nova do cinturão**: casco cinza-azulado frio (a cor da Capitânia) + acentos
  magenta/vermelho quentes nas janelas/bocas de canhão. A Capitânia (`public/sprites/capitania.png`)
  é a `style_images` de referência do PixelLab para os quatro redesenhos — nunca o sprite antigo
  de cada inimigo.
- **O drone continua roxo biomec** (reaproveitado da Fase 1) — variedade proposital, não mexer.
- **Comportamento e balanceamento INALTERADOS** nos quatro inimigos — só arte. Hitbox preservada
  (a `scale` de cada `EnemyDef` não muda; se a arte nova tiver dimensão nativa diferente da atual,
  gerar/recortar para bater com a dimensão nativa de hoje, não ajustar `scale`).
- **Canhoneira e batedor trocam de TEXTURA por FASE** (mesmo `EnemyKind`/comportamento): opção
  (A) do spec — chave nova condicionada à `stage` atual no momento do spawn, não duplicar a
  `EnemyDef`. Como os dois aparecem em AMBAS as fases com o MESMO `scale`, a arte nova do
  cinturão tem que nascer na MESMA dimensão nativa da arte biomec atual (batedor 27×26, canhoneira
  45×26) — senão o mesmo `scale` desenha tamanhos diferentes entre as duas aparições.
  **Atualizado após a Task 2:** na prática o PixelLab nem sempre entrega essa dimensão exata (o
  batedor saiu 115×36, um dardo bem mais alongado) — recortar à força pra caber em 27×26
  esmagaria o desenho. `STAGE_2_SKIN` agora aceita um `scale?: number` OPCIONAL por pele,
  usado no lugar de `DEFS.scale` só naquele spawn — `DEFS.scale` continua intocado (a Fase 1 não
  muda). Calibrar esse número por revisão visual (largura em tela parecida com a da Fase 1), não
  por conta de cabeça.
- **Guarda de textura** em toda arte nova (`textures.exists`); sem o PNG, a Fase 2 (e a Fase 1,
  no caso de batedor/canhoneira) continuam exatamente como hoje.
- **Arte aprovada asset por asset pelo Henrique antes de entrar no jogo.** Autoria dos commits:
  só Henrique (sem `Co-Authored-By`).
- Verificação por sonda/screenshot + `npm run build` (typecheck + vite) — não há testes
  unitários neste projeto.
- **Fora de escopo** (não mexer): a Canhoneira-Capitânia (arte já pronta), a mina sensora, os
  destroços (`destroco`), `setApproach()`/os números de escala da lua e do Leviatã.

---

## Estrutura de arquivos

- **`src/Parallax.ts`** — `buildSpace()`: camada nova `paintedBg` (fundo pintado). **[FEITO —
  ver Task 0.]**
- **`src/scenes/BootScene.ts`** — `FRAMES`/`ANIMS`/`ART`: chaves novas da facção do cinturão
  (`enemyScoutCinturao`, `enemyGunshipCinturao`) e a arte redesenhada de kamikaze/cargueiro (nas
  MESMAS chaves de hoje — eles não trocam por fase, só de skin permanente).
- **`src/systems/EnemySystem.ts`** — `STAGE_2_SKIN` (textura/anim por `EnemyKind` quando
  `stageId === 2`) + o construtor passa a receber `stageId`.
- **`src/scenes/GameScene.ts`** — um ponto: `new EnemySystem(this, this.stage.id)`.
- **`scripts/`** — pipeline de arte existente; `_ref-*.png` para style refs (gitignorado).

---

### Task 0: Fundo pintado do cinturão — ✅ FEITO

**Files:** Created `public/sprites/paint-bg-f2.png`; Modified `src/scenes/BootScene.ts`,
`src/Parallax.ts`.

- [x] **Step 1:** `node scripts/paint-bg.mjs assets/raw/paint-bg-f2-original.png public/sprites/paint-bg-f2.png 768 432` (corte central mínimo — a proporção original, 1672×941, já batia quase exata com a do jogo).
- [x] **Step 2:** Registrado em `BootScene.ART` como `paintBgF2: 'sprites/paint-bg-f2.png'`.
- [x] **Step 3:** `Parallax.buildSpace()` empurra 2 cópias para `this.paintedBg[]` (`depth −99`,
      `y=−108`), guardado por `this.mode === 'espaco' && textures.exists('paintBgF2')` — o guard
      de `mode` importa porque `buildSpace()` também roda no modo `'nebulosa'` (Fase 3), e a
      pintura é cenário só da Fase 2.
- [x] **Step 4:** Verificado — `npm run build` limpo; `node scripts/probe-stage2.mjs`
      (`probe-stage2-cinturao.png`/`-kamikaze.png`): a colônia (guindastes, janelas acesas)
      aparece atrás do cinturão/derelict/nebulosa, sem tapar a lua/Leviatã.
- [x] **Step 5:** Commit `feat(fase2): fundo pintado da colonia do cinturao (arte do Henrique)`
      em `72e840b`, branch `feat/fase2-visual`.

---

### Task 1: Referência de facção + infraestrutura de troca de textura por fase

**Files:** Modify `src/systems/EnemySystem.ts`, `src/scenes/GameScene.ts`.

**Interfaces:**
- Produces: `EnemySystem` passa a exigir `stageId: number` no construtor; `spawn()` resolve
  `texture`/`anim` por uma tabela `STAGE_2_SKIN` antes de cair no `def.texture`/`def.anim` de
  sempre. As Tasks 2 e 3 (batedor/canhoneira) só precisam colocar os PNGs nas chaves certas —
  nenhum código novo.

- [ ] **Step 1: Fixar a referência de facção**

Baixar `public/sprites/capitania.png` como `style_images` de referência para o PixelLab (as
Tasks 2–5 passam esse arquivo em `scripts/gerar.mjs "<descrição>" <size> side capitania.png`).
Confirmar o saldo PixelLab (`get_balance`) e orçar os 4 assets + animações.

- [x] **Step 2: Tabela de pele por fase, em `EnemySystem.ts`**

Adicionar logo abaixo de `DEFS`:

```ts
/**
 * PELE POR FASE: canhoneira e batedor trocam de arte entre a Fase 1 (biomec roxo, sempre) e a
 * Fase 2 (facção do cinturão) — mesmo `EnemyKind`/comportamento, só a textura. Fonte única de
 * verdade para o comportamento (opção A do spec 2026-08-05): sem o PNG do cinturão, `spawn()`
 * cai de volta em `def.texture`/`def.anim` — a Fase 1 e uma Fase 2 sem arte nova continuam
 * IDÊNTICAS a hoje.
 */
const STAGE_2_SKIN: Partial<Record<EnemyKind, { texture: string; anim: string }>> = {
  batedor: { texture: 'enemyScoutCinturao', anim: 'scout-cinturao-fly' },
  canhoneira: { texture: 'enemyGunshipCinturao', anim: 'gunship-cinturao-fly' },
};
```

- [x] **Step 3: `EnemySystem` passa a saber a fase atual**

```ts
export class EnemySystem {
  readonly enemies: Phaser.Physics.Arcade.Group;
  readonly enemyBullets: Phaser.Physics.Arcade.Group;

  private readonly muzzleFlash: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    /** A FASE atual (`GameScene.stage.id`) — só usada para a pele por fase (ver `STAGE_2_SKIN`). */
    private readonly stageId: number,
  ) {
```

(o resto do construtor não muda.)

- [x] **Step 4: `spawn()` resolve a pele antes de criar o sprite**

Trocar o início de `spawn()` — de:

```ts
  spawn(kind: EnemyKind, y: number, x = GAME_WIDTH + 16): void {
    const def = DEFS[kind];

    // A aranha ANDA — o y dela não é do roteiro, é da FÍSICA: os pés na linha do casco
    // (a banda `casco` do Parallax tem o topo em ~190; o centro dela assenta em cima).
    if (kind === 'aranha') y = 170;

    const texture = pickVariant(this.scene, def.texture);
    const e = this.enemies.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;

    // A animação só existe para a variante BASE. Tocá-la numa variante trocaria a textura
    // pelos quadros da base — e a variedade que acabamos de ganhar iria embora.
    if (texture === def.texture && def.anim && this.scene.anims.exists(def.anim)) {
      e.play(def.anim);
    }
```

para:

```ts
  spawn(kind: EnemyKind, y: number, x = GAME_WIDTH + 16): void {
    const def = DEFS[kind];

    // A aranha ANDA — o y dela não é do roteiro, é da FÍSICA: os pés na linha do casco
    // (a banda `casco` do Parallax tem o topo em ~190; o centro dela assenta em cima).
    if (kind === 'aranha') y = 170;

    // A PELE POR FASE (canhoneira/batedor): na Fase 2, tenta a textura do cinturão primeiro;
    // sem o PNG (guarda de textura), cai na arte biomec de sempre — ver STAGE_2_SKIN.
    const skin = this.stageId === 2 ? STAGE_2_SKIN[kind] : undefined;
    const hasSkin = skin !== undefined && this.scene.textures.exists(skin.texture);
    const baseTexture = hasSkin ? skin!.texture : def.texture;
    const baseAnim = hasSkin ? skin!.anim : def.anim;

    const texture = pickVariant(this.scene, baseTexture);
    const e = this.enemies.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;

    // A animação só existe para a variante BASE. Tocá-la numa variante trocaria a textura
    // pelos quadros da base — e a variedade que acabamos de ganhar iria embora.
    if (texture === baseTexture && baseAnim && this.scene.anims.exists(baseAnim)) {
      e.play(baseAnim);
    }
```

(o resto de `spawn()` — `setVelocityX`, `setScale(def.scale)`, `setTint(def.tint)`, hitbox, etc.
— não muda: continua lendo de `def`, que é a mesma `EnemyDef` nas duas fases.)

- [x] **Step 5: `GameScene` passa a fase ao construir o `EnemySystem`**

Em `src/scenes/GameScene.ts:191`, trocar:

```ts
    this.enemies = new EnemySystem(this);
```

por:

```ts
    this.enemies = new EnemySystem(this, this.stage.id);
```

- [x] **Step 6: Verificar** — `npm run build` PASS (typecheck pega qualquer assinatura
      desalinhada). Rodar `node scripts/probe-stage2.mjs` e `node scripts/probe-chain.mjs`: sem
      nenhum PNG novo instalado ainda, o comportamento tem que estar BYTE a byte igual ao de
      antes (batedor/canhoneira continuam com a arte biomec de sempre nas duas fases) — é a
      regressão que prova que a guarda funciona antes de qualquer arte nova entrar.

- [x] **Step 7: Commit** — `feat(fase2): infra de troca de pele por fase (canhoneira/batedor)`.

---

### Task 2: Batedor do cinturão (dardo magro, cinza-azulado + magenta)

**Files:** Create `public/sprites/enemy-scout-cinturao.png` (+ quadros de animação); Modify
`src/scenes/BootScene.ts` (`FRAMES`, `ANIMS`, `ART`).

**Interfaces:** Produces a textura `enemyScoutCinturao` + anim `scout-cinturao-fly`, lidas pela
`STAGE_2_SKIN` da Task 1.

- [x] **Step 1: Gerar no PixelLab** — `node scripts/gerar.mjs "sleek dart-shaped scout starship, cold blue-grey hull, glowing warm magenta cockpit window, sharp arrow-like silhouette, side view facing right" 27 sidescroller public/sprites/capitania.png` (⚠️ `view` é `'sidescroller'`/`'top-down'`, não `'side'` — a API rejeita `'side'` com 422). Lote de 4 candidatos; animação via `mcp__pixellab__animate_object` (frame_count=6 gera 6+1 referência = 7 quadros, batendo com o padrão `xAnim: 7` do resto do jogo).
- [x] **Step 2: Julgar candidatos ampliados** (`scripts/sheet.mjs`) e mostrar ao Henrique — aprovado o candidato #0 (dardo magro, cinza-azulado, faixa magenta); descartados #1 (mais "caixa", menos afilado), #2 (canhão visível no topo — lia como canhoneira, não batedor) e #3 (antena + paleta verde-água, fora da paleta pedida).
- [x] **Step 3: Instalar** — promovido via `mcp__pixellab__select_object_frames` (o lote fica em status `review`; promover cria um objeto `completed` próprio), depois `install-sprite.mjs`/`install-anim.mjs` como sempre.
- [x] **Step 4: Registrado em `BootScene.ts`** (`FRAMES.scoutCinturaoAnim: 7`, `ANIMS` com `frameRate: 12` igual ao `scout-fly`, `ART.enemyScoutCinturao` + `animFrames`).
- [x] **Step 5: Dimensão nativa divergiu bastante** (115×36, não 27×26 — a arte veio um dardo de verdade, bem mais alongado). Recortar pra 27×26 teria esmagado o desenho; em vez disso, `STAGE_2_SKIN.batedor` ganhou um campo `scale?: number` (0.28) que `spawn()` usa NO LUGAR de `DEFS.batedor.scale` só para essa pele — `DEFS.batedor.scale` (compartilhado com a Fase 1) não mudou. **Desvio do texto original deste step, registrado aqui.**
- [x] **Step 6: Verificar** — `npm run build` PASS; sonda dedicada (`scripts/_probe-batedor-cinturao.mjs`) confirmou os 4 batedores da primeira onda (F2, t≈9s) como dardos distintos e bem separados — a 1ª tentativa (antes de ligar o `scale` da pele em `spawn()`, bug pego na revisão visual) mostrava eles GRUDADOS numa massa só; corrigido e reverificado. `probe-chain.mjs`: Fase 1 sem erros de página (a arte biomec do batedor continua a mesma).
- [x] **Step 7: Commit** — `feat(fase2): arte nova do batedor (facao do cinturao)` em `6f41110`.

---

### Task 3: Canhoneira do cinturão (casco pesado, canhão magenta saliente)

**Files:** Create `public/sprites/enemy-gunship-cinturao.png` (+ quadros); Modify
`src/scenes/BootScene.ts`.

**Interfaces:** Produces a textura `enemyGunshipCinturao` + anim `gunship-cinturao-fly`.

- [ ] **Step 1: Gerar** — `node scripts/gerar.mjs "heavy blocky gunship, thick cold blue-grey hull plating, one large gun cannon jutting forward glowing warm magenta muzzle, side view facing right" 45 side public/sprites/capitania.png` (dimensão nativa 45×26, igual à `enemy-gunship.png` atual). Animação de voo/propulsão.
- [ ] **Step 2: Julgar + aprovação do Henrique.**
- [ ] **Step 3: Instalar** (`install-sprite.mjs` + `install-anim.mjs`, mesmo padrão da Task 2) como `enemy-gunship-cinturao*`.
- [ ] **Step 4: Registrar em `BootScene.ts`** — `FRAMES.gunshipCinturaoAnim`, `ANIMS` (`{ key: 'gunship-cinturao-fly', prefix: 'gunshipCinturaoAnim', frameRate: 8 }` — mesmo `frameRate` do `gunship-fly`), `ART` (`enemyGunshipCinturao` + `animFrames('gunshipCinturaoAnim', 'gunship-cinturao-anim')`).
- [ ] **Step 5: Medir dimensão nativa**; recortar para bater com 45×26 se divergir (não tocar `DEFS.canhoneira.scale`).
- [ ] **Step 6: Verificar** — build PASS; `probe-stage2.mjs`: a canhoneira na Fase 2 lê PESADA, casco frio com o canhão em destaque magenta, para-e-mira igual a sempre (telégrafo antes do tiro inalterado); `probe-chain.mjs`: a canhoneira na Fase 1 continua a arte biomec de sempre.
- [ ] **Step 7: Commit** — `feat(fase2): arte nova da canhoneira (facao do cinturao)`.

---

### Task 4: Kamikaze do cinturão (espeto na proa, facção nova)

**Files:** Create `public/sprites/enemy-kamikaze.png` (substitui a atual, MESMA chave — o
kamikaze não troca por fase); Modify `src/scenes/BootScene.ts` só se a contagem de quadros mudar.

- [ ] **Step 1: Gerar** — `node scripts/gerar.mjs "small interceptor with a sharp forward spike on the nose, cold blue-grey hull, warm orange-red glowing accents, side view facing right" 26 side public/sprites/capitania.png` (dimensão nativa 26×24, igual à atual). Animação de voo (o kamikaze vibra rápido — `frameRate` 14 já fixado em `ANIMS`, não muda).
- [ ] **Step 2: Julgar + aprovação do Henrique.**
- [ ] **Step 3: Instalar NA MESMA CHAVE** — `install-sprite.mjs <object-id> <frame> enemy-kamikaze` e `install-anim.mjs kamikaze-anim <url-base> <n> enemy-kamikaze` (sobrescrevendo `public/sprites/enemy-kamikaze*.png` — sem mudança nenhuma em `BootScene.ART`/`EnemySystem`, já apontam para essa chave).
- [ ] **Step 4: Se a contagem de quadros divergir de 7**, atualizar `FRAMES.kamikazeAnim` em `BootScene.ts`.
- [ ] **Step 5: Medir dimensão nativa**; recortar para bater com 26×24 se divergir (não tocar `DEFS.kamikaze.scale`).
- [ ] **Step 6: Verificar** — build PASS; `probe-stage2.mjs`: o kamikaze lê como espeto quente vindo em cima do jogador, casado com a paleta da Capitânia, mesmo tamanho/velocidade/homing de hoje.
- [ ] **Step 7: Commit** — `feat(fase2): arte nova do kamikaze (facao do cinturao)`.

---

### Task 5: Cargueiro do cinturão (barriga com hangar aberto, facção nova)

**Files:** Create `public/sprites/enemy-carrier.png` (substitui a atual, MESMA chave — o
cargueiro não troca por fase); Modify `src/scenes/BootScene.ts` só se a contagem de quadros mudar.

- [ ] **Step 1: Gerar** — `node scripts/gerar.mjs "slow bulky freighter with an open hangar bay glowing warm magenta on the belly, cold blue-grey hull, side view facing right" 60 side public/sprites/capitania.png` (dimensão nativa 60×39, igual à atual — o hangar aceso na barriga é onde os drones nascem, ver `EnemySystem.updateCarrier`). Animação lenta (`frameRate` 6, já fixado).
- [ ] **Step 2: Julgar + aprovação do Henrique.**
- [ ] **Step 3: Instalar NA MESMA CHAVE** — `install-sprite.mjs <object-id> <frame> enemy-carrier` e `install-anim.mjs carrier-anim <url-base> <n> enemy-carrier`.
- [ ] **Step 4: Se a contagem de quadros divergir de 7**, atualizar `FRAMES.carrierAnim`.
- [ ] **Step 5: RE-MEDIR onde a barriga/hangar fica no PNG novo** — `updateCarrier` cospe o drone em `e.y + Phaser.Math.Between(4, 14)`, relativo ao centro do sprite; confirmar visualmente que o drone ainda nasce de dentro do hangar aceso, não do meio do casco.
- [ ] **Step 6: Medir dimensão nativa**; recortar para bater com 60×39 se divergir (não tocar `DEFS.cargueiro.scale`).
- [ ] **Step 7: Verificar** — build PASS; `probe-stage2.mjs` (`probe-stage2-cargueiro.png`): o cargueiro lê pesado/lento, hangar aceso na barriga cuspindo drones, casado com a facção nova.
- [ ] **Step 8: Commit** — `feat(fase2): arte nova do cargueiro (facao do cinturao)`.

---

### Task 6: Regressão + revisão final

- [ ] **Step 1: `npm run build`** limpo (typecheck + vite).
- [ ] **Step 2: `node scripts/probe-stage2.mjs`** — verde, sem erro de página/console; os quatro
      screenshots (`cinturao`, `kamikaze`, `cargueiro`, `capitania`) mostram a facção nova coesa
      e a Capitânia intocada.
- [ ] **Step 3: `node scripts/probe-chain.mjs`** — a cadeia Fase 1 → chefão → zero-G → Fase 2
      continua fechando; a canhoneira/batedor da FASE 1 continuam com a arte biomec roxa (a pele
      do cinturão só aparece na Fase 2).
- [ ] **Step 4: Revisão a olho — roster lado a lado.** Um screenshot com os 4 redesenhados
      (mesmo princípio do `probe-roster-f1.mjs` da Fatia 1: "dá para distinguir num relance") +
      o drone roxo biomec ao lado — confirma o critério de sucesso #3 do spec (duas facções na
      mesma fase, legível).
- [ ] **Step 5: Hitbox/balanceamento** — conferir visualmente que nenhum dos quatro cresceu/
      encolheu em jogo (comparar com os screenshots do Task 0/commits anteriores).
- [ ] **Step 6: Merge** — seguir `superpowers:finishing-a-development-branch` a partir da branch
      `feat/fase2-visual` (mesmo fluxo das fatias 1 e 2).

---

## Self-review (cobertura do spec)

- Facção nova ancorada na Capitânia (style ref) → Task 1 Step 1, Tasks 2–5. ✔
- Drone continua roxo biomec → Global Constraints (nenhuma task mexe nele). ✔
- Redesenho dos 4 (batedor/canhoneira/kamikaze/cargueiro) → Tasks 2–5. ✔
- Canhoneira/batedor trocam de textura por FASE sem duplicar `EnemyKind` (opção A) → Task 1. ✔
- Comportamento/balanceamento/hitbox inalterados → Global Constraints + Steps de dimensão nativa
  em cada task. ✔
- Fundo pintado ENTRA (não substitui `Parallax('espaco')`), depth −99, guarda de `mode` +
  textura → Task 0 (feito). ✔
- Guarda de textura em toda arte nova → Constraints + Step de instalação de cada task. ✔
- Fora de escopo (Capitânia, mina, destroços, `setApproach()`) → nenhuma task toca esses
  arquivos/mecanismos. ✔
- Verificação (`npm run build`, `probe-stage2.mjs`, revisão a olho, hitbox) → Task 6. ✔

Sem placeholders de código onde há código (Task 1 traz o diff completo do `EnemySystem`/
`GameScene`). Tasks 2–5 são interativas por natureza (arte aprovada asset por asset pelo
Henrique) — os steps de geração/julgamento/aprovação são a ordem correta do pipeline
estabelecido (`docs/HANDOFF.md` §PixelLab), não placeholders.
