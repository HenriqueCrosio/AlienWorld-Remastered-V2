# Fatia 9 — A Atmosfera nas fases — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar a Atmosfera (`src/systems/atmosfera/`) nas quatro fases e nos chefões, com um perfil por pintura de fundo, 15–25% abaixo das cutscenes, sem custar a leitura.

**Architecture:** `perfis.ts` ganha 8 perfis de fase (um por pintura) e o mapa `PERFIL_DA_PINTURA`; o `Parallax` passa a dizer qual pintura está na tela (`pinturaNaTela()`); o `GameScene` cria a Atmosfera e troca o perfil quando a pintura muda (1,5 s de transição). O shader ganha `uFlash`, que apaga o halo enquanto a câmera pisca.

**Tech Stack:** Phaser 3.90 (WebGL PostFXPipeline), TypeScript 5.7, Vite 6, Playwright (sondas), Node 24 (roda `.ts` direto).

**Spec:** `docs/superpowers/specs/2026-09-26-fatia9-atmosfera-fases-design.md`

## Global Constraints

- Base = nível médio das cutscenes: névoa 0,8 · grão 0,7 · halo 0,27 · vinheta 0,55 · cor 1. Fator: **×0,75** em `paintBgF1`, `paintBgZeroG`, `paintBgF2`; **×0,85** em `paintBgF3`, `paintBgF4a`–`d`. O fator multiplica névoa, grão, halo, vinheta e cor.
- Névoa BAIXA (`altura` 2), derivando para a esquerda.
- O chefão usa o perfil da fase (não há perfil de chefão).
- Limpos: profundidade ≥ 99 (HUD, banner, barras de vida dos chefões). A nave e o combate DENTRO do tratamento.
- Troca de pintura = transição de **1500 ms**; a largada = corte seco (0 ms).
- Sem WebGL: no-op.
- Commits de autoria SÓ do Henrique: **sem** `Co-Authored-By` e sem "Generated with Claude Code". Nunca empurrar para o remoto `legacy`.
- Editar código com a ferramenta Edit, NUNCA com `sed`/`node -e` (CRLF e `${}` falham em silêncio neste repo).
- Sondas com o dev server no ar (`npm run dev`, porta 5173), uma por vez.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| Modify `src/systems/atmosfera/perfis.ts` | `ChavePintura`, `perfilDeFase`, os 8 perfis de fase, `PERFIL_DA_PINTURA` |
| Modify `scripts/test-atmosfera-perfis.mjs` | cobre os perfis de fase e o mapa |
| Modify `src/systems/atmosfera/AtmosferaPipeline.ts` | `uFlash` apaga o halo durante o flash |
| Modify `src/systems/atmosfera/Atmosfera.ts` | alimenta `flash`; `estado()` expõe `flash` e `escuro` |
| Modify `src/Parallax.ts` | `pinturaNaTela(): ChavePintura` |
| Modify `src/scenes/GameScene.ts` | cria a Atmosfera e segue a pintura |
| Create `scripts/probe-atmosfera-fases.mjs` | a sonda da fatia |

---

### Task 1: Os perfis de fase e o mapa pintura → perfil

**Files:**
- Modify: `src/systems/atmosfera/perfis.ts`
- Test: `scripts/test-atmosfera-perfis.mjs`

**Interfaces:**
- Consumes: `PerfilAtmosfera`, `Cor`, `PERFIS`, `PISO_DENSIDADE` (já existem em `perfis.ts`).
- Produces:
  - `export type ChavePintura = 'paintBgF1' | 'paintBgZeroG' | 'paintBgF2' | 'paintBgF3' | 'paintBgF4a' | 'paintBgF4b' | 'paintBgF4c' | 'paintBgF4d'`
  - `export const PERFIS_FASE: Record<'faseF1' | 'faseZeroG' | 'faseF2' | 'faseF3' | 'faseF4a' | 'faseF4b' | 'faseF4c' | 'faseF4d', PerfilAtmosfera>`
  - `export const PERFIL_DA_PINTURA: Record<ChavePintura, PerfilAtmosfera>`

- [ ] **Step 1: Write the failing test**

In `scripts/test-atmosfera-perfis.mjs`, change the import line to:

```js
import { PERFIS, PERFIS_FASE, PERFIL_DA_PINTURA, PISO_DENSIDADE, interpolarPerfil } from '../src/systems/atmosfera/perfis.ts';
```

and add, right before the final `console.log(falhas === 0 ? ...` line:

```js
// ─── FATIA 9: as fases (spec 2026-09-26-fatia9-atmosfera-fases-design.md) ───
const PINTURAS = {
  paintBgF1: 'faseF1', paintBgZeroG: 'faseZeroG', paintBgF2: 'faseF2', paintBgF3: 'faseF3',
  paintBgF4a: 'faseF4a', paintBgF4b: 'faseF4b', paintBgF4c: 'faseF4c', paintBgF4d: 'faseF4d',
};
for (const [pintura, nome] of Object.entries(PINTURAS)) {
  ok(PERFIL_DA_PINTURA[pintura]?.nome === nome, `${pintura} → ${nome} (${PERFIL_DA_PINTURA[pintura]?.nome})`);
  ok(PERFIS_FASE[nome]?.nome === nome, `o perfil ${nome} existe`);
  ok(PERFIS_FASE[nome].nevoa.densidade >= PISO_DENSIDADE, `${nome}: densidade ${PERFIS_FASE[nome].nevoa.densidade} >= piso`);
  ok(PERFIS_FASE[nome].nevoa.altura === 2, `${nome}: névoa baixa (altura ${PERFIS_FASE[nome].nevoa.altura})`);
}
ok(Object.keys(PERFIL_DA_PINTURA).length === 8, `o mapa cobre as 8 pinturas (${Object.keys(PERFIL_DA_PINTURA).length})`);
const perto = (a, b) => Math.abs(a - b) < 1e-9;
ok(perto(PERFIS_FASE.faseF1.nevoa.densidade, 0.8 * 0.75) && perto(PERFIS_FASE.faseF1.grao, 0.7 * 0.75), 'as abertas são −25% da base (névoa 0,6, grão 0,525)');
ok(perto(PERFIS_FASE.faseF4a.nevoa.densidade, 0.8 * 0.85) && perto(PERFIS_FASE.faseF4a.vinheta, 0.55 * 0.85), 'as densas são −15% da base (névoa 0,68, vinheta 0,4675)');
ok(PERFIS_FASE.faseF3.nevoa.densidade > PERFIS_FASE.faseF2.nevoa.densidade, 'a F3 (densa) pesa mais que a F2 (aberta)');
ok(PERFIS_FASE.faseF4d.nevoa.densidade < PERFIS.viscera.nevoa.densidade, 'a fase fica abaixo da cutscene do mesmo lugar (F4d < víscera)');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-atmosfera-perfis.mjs`
Expected: FAIL — `SyntaxError: The requested module ... does not provide an export named 'PERFIL_DA_PINTURA'` (or `PERFIS_FASE`).

- [ ] **Step 3: Implement**

In `src/systems/atmosfera/perfis.ts`, append at the END of the file (after `interpolarPerfil`):

```ts
// ─── FATIA 9: AS FASES (spec 2026-09-26-fatia9-atmosfera-fases-design.md) ───
// ⚠️ Ele: *"utilizar o filtro um tom abaixo (talvez 15% a 25% menos) nas proprias fases e chefoes"*. Escolhas
// na folha `atmos-fases-15-25.png`: −15% nas DENSAS (F3, F4), −25% nas ABERTAS (F1, zero-G, F2); o chefão usa o
// perfil da fase; o tom segue a PINTURA na tela (o `Parallax` diz qual — `pinturaNaTela()`).

/** As pinturas de fundo das fases — cada uma tem o seu tom. */
export type ChavePintura =
  | 'paintBgF1'
  | 'paintBgZeroG'
  | 'paintBgF2'
  | 'paintBgF3'
  | 'paintBgF4a'
  | 'paintBgF4b'
  | 'paintBgF4c'
  | 'paintBgF4d';

/** O nível médio das cutscenes aprovadas (grão já suavizado) — o que o fator da fase multiplica. */
const BASE_FASE = { densidade: 0.8, grao: 0.7, halo: 0.27, vinheta: 0.55, grade: 1 } as const;
/** O laranja dos tiros e explosões: o halo das fases abertas, cujas pinturas quase não têm quente. */
const HALO_COMBATE: Cor = [230, 110, 40];

/**
 * Um perfil de fase: a base × `fator` (névoa, grão, halo, vinheta, cor). A névoa é BAIXA (rente ao chão — o céu,
 * onde o combate acontece, fica mais limpo) e corre para a esquerda com o mundo; a poeira é rala e rápida.
 */
function perfilDeFase(nome: string, fator: number, nevoa: Cor, halo: Cor): PerfilAtmosfera {
  const [r, g, b] = nevoa;
  return {
    nome,
    nevoa: { densidade: BASE_FASE.densidade * fator, cor: nevoa, altura: 2, velTras: [-10, 0], velFrente: [-25, 0], evolucao: 0.02 },
    halo: { forca: BASE_FASE.halo * fator, limiar: 0.59, cor: halo },
    grade: BASE_FASE.grade * fator,
    gradeQuente: 1,
    vinheta: BASE_FASE.vinheta * fator,
    grao: BASE_FASE.grao * fator,
    poeira: {
      quantidade: 60,
      cor: [Math.min(255, Math.round(r * 1.6)), Math.min(255, Math.round(g * 1.6)), Math.min(255, Math.round(b * 1.6))],
      deriva: [-30, 0],
      espalhar: 6,
    },
  };
}

const ABERTA = 0.75;
const DENSA = 0.85;

/** Os perfis das fases — cores amostradas de cada pintura (a mesma conta das cutscenes). */
export const PERFIS_FASE = {
  faseF1: perfilDeFase('faseF1', ABERTA, [45, 64, 83], HALO_COMBATE),
  faseZeroG: perfilDeFase('faseZeroG', ABERTA, [75, 73, 134], HALO_COMBATE),
  faseF2: perfilDeFase('faseF2', ABERTA, [52, 68, 107], HALO_COMBATE),
  faseF3: perfilDeFase('faseF3', DENSA, [74, 76, 113], [220, 120, 60]),
  faseF4a: perfilDeFase('faseF4a', DENSA, [69, 59, 83], [187, 85, 61]),
  faseF4b: perfilDeFase('faseF4b', DENSA, [48, 92, 142], [184, 84, 71]),
  faseF4c: perfilDeFase('faseF4c', DENSA, [70, 68, 101], [186, 74, 59]),
  faseF4d: perfilDeFase('faseF4d', DENSA, [96, 61, 83], [188, 65, 47]),
} satisfies Record<string, PerfilAtmosfera>;

/** A pintura na tela → o perfil dela. O `GameScene` troca quando a pintura muda. */
export const PERFIL_DA_PINTURA: Record<ChavePintura, PerfilAtmosfera> = {
  paintBgF1: PERFIS_FASE.faseF1,
  paintBgZeroG: PERFIS_FASE.faseZeroG,
  paintBgF2: PERFIS_FASE.faseF2,
  paintBgF3: PERFIS_FASE.faseF3,
  paintBgF4a: PERFIS_FASE.faseF4a,
  paintBgF4b: PERFIS_FASE.faseF4b,
  paintBgF4c: PERFIS_FASE.faseF4c,
  paintBgF4d: PERFIS_FASE.faseF4d,
};
```

- [ ] **Step 4: Run the tests**

Run: `node scripts/test-atmosfera-perfis.mjs` → all `✔`, `✔ PERFIS DA ATMOSFERA`.
Run: `npx tsc --noEmit` → exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/systems/atmosfera/perfis.ts scripts/test-atmosfera-perfis.mjs
git commit -m "feat(atmosfera): os perfis das fases — um por pintura, −15% nas densas, −25% nas abertas"
```

---

### Task 2: O flash, a pintura na tela e o GameScene ligado

**Files:**
- Modify: `src/systems/atmosfera/AtmosferaPipeline.ts`
- Modify: `src/systems/atmosfera/Atmosfera.ts`
- Modify: `src/Parallax.ts`
- Modify: `src/scenes/GameScene.ts`
- Create: `scripts/probe-atmosfera-fases.mjs`

**Interfaces:**
- Consumes (Task 1): `ChavePintura`, `PERFIL_DA_PINTURA` from `src/systems/atmosfera/perfis.ts`.
- Produces:
  - `AtmosferaPipeline.flash: number` (0–1) and uniform `uFlash`
  - `EstadoAtmosfera` gains `flash: number` and `escuro: number`
  - `Parallax.pinturaNaTela(): ChavePintura`
  - `GameScene` fields `atm: Atmosfera` (read by the probe as `s.atm`)

- [ ] **Step 1: Write the failing probe**

Create `scripts/probe-atmosfera-fases.mjs`:

```js
// A FATIA 9 (spec 2026-09-26-fatia9-atmosfera-fases-design.md): a Atmosfera nas fases. Em cada fase, pelo atalho de
// dev: a Atmosfera ligada, o perfil DA PINTURA NA TELA, a HUD na câmera limpa; na F1, a saída para o zero-G troca o
// tom; na F2, um flash quente apaga o halo; na F4, o tom acompanha as câmaras A → D. A nave fica INVULNERÁVEL.
//
//   npm run dev  noutro terminal, depois  node scripts/probe-atmosfera-fases.mjs   (~2,5 min: a F4 é longa)
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};
const NOME = {
  paintBgF1: 'faseF1', paintBgZeroG: 'faseZeroG', paintBgF2: 'faseF2', paintBgF3: 'faseF3',
  paintBgF4a: 'faseF4a', paintBgF4b: 'faseF4b', paintBgF4c: 'faseF4c', paintBgF4d: 'faseF4d',
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || s.scene.key !== 'Game') return { cena: s?.scene.key ?? '?' };
    s.invulnerableUntil = 1e12;
    s.lives = 9;
    const main = s.cameras.main;
    const limpa = s.cameras.getCamera('limpa');
    const hud = s.children.list.filter((o) => o.depth >= 99);
    return {
      cena: 'Game',
      pintura: s.parallax.pinturaNaTela(),
      atm: s.atm?.estado() ?? null,
      hudLimpa: !!limpa && hud.length > 0 && hud.every((o) => (o.cameraFilter & main.id) !== 0 && (o.cameraFilter & limpa.id) === 0),
      nHud: hud.length,
    };
  });
const espera = async (predicado, timeoutMs) => {
  const t0 = Date.now();
  let e = await estado();
  while (!predicado(e) && Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(250);
    e = await estado();
  }
  return e;
};
const abrir = async (tecla) => {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.keyboard.press(tecla);
  return espera((e) => e.cena === 'Game' && e.atm?.perfil, 10000);
};
const conferir = (rotulo, e) => {
  console.log(rotulo, JSON.stringify(e));
  ok(e.atm?.ativo === true, `${rotulo}: a Atmosfera está ligada`);
  ok(e.atm?.perfil === NOME[e.pintura], `${rotulo}: o perfil é o da pintura na tela (${e.pintura} → ${e.atm?.perfil})`);
  ok(e.hudLimpa, `${rotulo}: a HUD fica FORA do tratamento (${e.nHud} objetos)`);
};

// ─── F1 e a saída para o zero-G ───
const f1 = await abrir('Enter');
conferir('F1   ', f1);
ok(f1.pintura === 'paintBgF1', `a F1 abre na pintura da colônia (${f1.pintura})`);
await page.evaluate(() => window.__game.scene.getScenes(true)[0].parallax.breakAtmosphere());
const zg = await espera((e) => e.atm?.perfil === 'faseZeroG', 3000);
ok(zg.pintura === 'paintBgZeroG' && zg.atm?.perfil === 'faseZeroG', `rompida a atmosfera, o tom vira o do zero-G (${zg.pintura} → ${zg.atm?.perfil})`);

// ─── F2 e o flash quente ───
const f2 = await abrir('V');
conferir('F2   ', f2);
const flash = await page.evaluate(async () => {
  const s = window.__game.scene.getScenes(true)[0];
  s.cameras.main.flash(600, 255, 150, 80);
  await new Promise((r) => setTimeout(r, 120));
  return s.atm.estado().flash;
});
ok(flash > 0.3, `durante um flash quente o halo cede (flash=${flash})`);
const depois = await espera((e) => (e.atm?.flash ?? 1) === 0, 3000);
ok(depois.atm?.flash === 0, `passado o flash, o halo volta (flash=${depois.atm?.flash})`);

// ─── F3 ───
conferir('F3   ', await abrir('M'));

// ─── F4: as câmaras A → D ───
const f4 = await abrir('L');
conferir('F4 A ', f4);
ok(f4.pintura === 'paintBgF4a', `a F4 abre na câmara A (${f4.pintura})`);
const vistas = new Set([f4.atm?.perfil]);
const t0 = Date.now();
let e4 = f4;
while (e4.pintura !== 'paintBgF4d' && Date.now() - t0 < 140000) {
  await page.waitForTimeout(1000);
  e4 = await estado();
  if (e4.atm?.perfil) vistas.add(e4.atm.perfil);
}
conferir('F4 D ', e4);
ok(['faseF4a', 'faseF4b', 'faseF4c', 'faseF4d'].every((n) => vistas.has(n)), `o tom passou pelas quatro câmaras (${[...vistas].join(' → ')})`);

console.log(falhas === 0 ? '\n✔ A ATMOSFERA NAS FASES' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
```

- [ ] **Step 2: Run the probe to verify it fails**

Run (dev server no ar): `node scripts/probe-atmosfera-fases.mjs`
Expected: `[ERRO DE PÁGINA]` or `✘` — `s.parallax.pinturaNaTela is not a function` / `atm` null; exit 1.

- [ ] **Step 3: The flash in the shader**

In `src/systems/atmosfera/AtmosferaPipeline.ts`:
- in the GLSL uniform list, right after `uniform float uEscuro;`, add:

```glsl
uniform float uFlash;
```

- in the halo block, replace the line that adds the halo (`cor += uCorHalo * max(v, 0.0) * uForcaHalo * respira;`) with:

```glsl
  // ⚠️ O FLASH É DESENHADO ANTES DESTE SHADER: um flash quente faria a tela inteira passar no teste de "quente" e
  // o halo acenderia tudo. Enquanto a câmera pisca, o halo cede (`uFlash` = o quanto do flash está na tela).
  cor += uCorHalo * max(v, 0.0) * uForcaHalo * respira * (1.0 - uFlash);
```

- add a public field next to `escuro`:

```ts
  /** 0–1: o quanto do flash da câmera está na tela agora (o halo cede enquanto isso). */
  flash = 0;
```

- in `onPreRender`, right after the line that sets `uEscuro`, add:

```ts
    this.set1f('uFlash', this.flash);
```

(It must be set before the `if (!p)` early return, like `uEscuro`.)

- [ ] **Step 4: The controller feeds the flash and exposes it**

In `src/systems/atmosfera/Atmosfera.ts`:
- in `interface EstadoAtmosfera`, add after `limpos: number;`:

```ts
  /** 0–1: o quanto do flash da câmera está na tela (o halo cede). */
  flash: number;
  /** 0–1: o quanto do fade de saída já escureceu. */
  escuro: number;
```

- in `update`, where `pipeline.escuro` is set from the fade, add right after it:

```ts
    // O FLASH: `alpha` cai de 1 a 0 ao longo do flash (Phaser `Effects.Flash`, público e tipado).
    const flash = this.scene.cameras.main.flashEffect;
    this.pipeline.flash = flash.isRunning ? flash.alpha : 0;
```

- in `estado()`, add to the returned object:

```ts
      flash: this.pipeline ? +this.pipeline.flash.toFixed(3) : 0,
      escuro: this.pipeline ? +this.pipeline.escuro.toFixed(3) : 0,
```

- [ ] **Step 5: `Parallax.pinturaNaTela()`**

In `src/Parallax.ts`, add the import at the top (after the existing imports):

```ts
import type { ChavePintura } from './systems/atmosfera/perfis';
```

and add this public method right after `breakAtmosphere()`'s closing brace:

```ts
  /**
   * A PINTURA NA TELA — o que a Atmosfera segue (Fatia 9): cada pintura tem o seu tom. Na F1, depois de romper a
   * atmosfera, o céu é o zero-G; na F4, a câmara corrente (`pinturaAtual`, A–D).
   */
  pinturaNaTela(): ChavePintura {
    switch (this.mode) {
      case 'superficie':
        return this.exiting ? 'paintBgZeroG' : 'paintBgF1';
      case 'espaco':
        return 'paintBgF2';
      case 'nebulosa':
        return 'paintBgF3';
      case 'interior': {
        const p = this.pinturaAtual;
        return p === 'paintBgF4b' || p === 'paintBgF4c' || p === 'paintBgF4d' ? p : 'paintBgF4a';
      }
    }
  }
```

- [ ] **Step 6: The GameScene follows the painting**

In `src/scenes/GameScene.ts`:
- add the imports after `import { Fx } from '../systems/Fx';` (find the existing Fx import line; if the path differs, keep the pattern):

```ts
import { Atmosfera } from '../systems/atmosfera/Atmosfera';
import { PERFIL_DA_PINTURA, type ChavePintura } from '../systems/atmosfera/perfis';
```

- add fields right after `private fx!: Fx;`:

```ts
  /** A névoa, a luz e o grão (Fatia 9). Lido pela sonda. */
  private atm!: Atmosfera;
  /** A pintura cujo perfil está aplicado — quando a do `Parallax` muda, o tom troca. */
  private pinturaAtm: ChavePintura | null = null;
```

- in `create`, right after `this.fx = new Fx(this);`, add:

```ts
    // A ATMOSFERA (Fatia 9): a HUD, o banner e as barras de vida (profundidade 99+) ficam limpos; a nave e o combate
    // ficam dentro. O perfil entra no primeiro `update` (o da pintura na tela).
    this.atm = new Atmosfera(this, { limiteLimpo: 99, profundidadePoeira: -0.5 });
    this.pinturaAtm = null;
```

- in `update`, right after the line `const dt = (delta / 1000) * escala;`, add:

```ts
    // O TOM SEGUE A PINTURA: a largada entra seca; cada troca de pintura (a câmara da F4, a saída para o zero-G)
    // faz 1,5s de transição. Depois do hitstop: o freeze-frame congela a névoa junto.
    const pintura = this.parallax.pinturaNaTela();
    if (pintura !== this.pinturaAtm) {
      this.atm.perfil(PERFIL_DA_PINTURA[pintura], this.pinturaAtm ? 1500 : 0);
      this.pinturaAtm = pintura;
    }
    this.atm.update(dt);
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` → exit 0.
Run: `node scripts/test-atmosfera-perfis.mjs` → `✔ PERFIS DA ATMOSFERA`.
Run: `node scripts/probe-atmosfera-fases.mjs` → all `✔`, `✔ A ATMOSFERA NAS FASES`, no `[ERRO DE PÁGINA]`.
Run, one at a time (regressions): `node scripts/probe-stage2.mjs`, `node scripts/probe-stage3.mjs`, `node scripts/probe-stage4.mjs`, `node scripts/probe-interlude4.mjs` → each exits 0.

- [ ] **Step 8: Commit**

```bash
git add src/systems/atmosfera/AtmosferaPipeline.ts src/systems/atmosfera/Atmosfera.ts src/Parallax.ts src/scenes/GameScene.ts scripts/probe-atmosfera-fases.mjs
git commit -m "feat(atmosfera): as fases na Atmosfera — o tom segue a pintura, e o flash quente não acende o halo"
```

---

### Task 3: A folha real, o jogo dele e o registro

**Files:**
- Create: `docs/superpowers/folhas/2026-09-26/atmos-fases-real.png`
- Modify: `docs/HANDOFF.md` (🧭), `docs/TECH.md` (a seção da Atmosfera)

- [ ] **Step 1: Capture the real frames** (the same 16 moments of the preview, now with the shader):

```bash
D=scripts/_f9/_real
node scripts/_f9/_ver-fase.mjs Enter 7000,22000 $D f1 && node scripts/_f9/_ver-fase.mjs B 5000,14000 $D f1boss
node scripts/_f9/_ver-fase.mjs V 8000,24000 $D f2 && node scripts/_f9/_ver-fase.mjs C 6000 $D f2boss
node scripts/_f9/_ver-fase.mjs M 8000,24000 $D f3 && node scripts/_f9/_ver-fase.mjs N 6000 $D f3boss
node scripts/_f9/_ver-fase.mjs L 15000,48000,78000,116000 $D f4 && node scripts/_f9/_ver-fase.mjs K 6000,22000 $D f4boss
```

and build a 4-column sheet (ORIGINAL da prévia | REAL) comparing `scripts/_f9/_quadros/<x>.png` with `scripts/_f9/_real/<x>.png`, saved to `docs/superpowers/folhas/2026-09-26/atmos-fases-real.png`. (Add `scripts/_f9/_real/` to `.gitignore`.)

- [ ] **Step 2: Show him and let him PLAY each phase** (`http://localhost:5173/`: Enter/V/M/L, chefões B/C/N/K). Calibrations go into `perfis.ts` only (`BASE_FASE`, `ABERTA`, `DENSA`, colors); after each, re-run the Node test and `probe-atmosfera-fases.mjs`.

- [ ] **Step 3: Record**: in `docs/TECH.md`, in the Atmosfera section, add a line: *"Nas FASES (Fatia 9): o `GameScene` segue `Parallax.pinturaNaTela()` → `PERFIL_DA_PINTURA`; o halo cede durante o flash (`uFlash`)."*; in the 🧭 of `docs/HANDOFF.md`, mark the Fatia 9 row ✅ with the commit, the roadmap row 1 as "0–9 fechadas", and the frase de arranque pointing to the CALIBRAGEM.

- [ ] **Step 4: Commit**

```bash
git add .gitignore docs/superpowers/folhas/2026-09-26/atmos-fases-real.png docs/TECH.md docs/HANDOFF.md src/systems/atmosfera/perfis.ts
git commit -m "docs(f9): a Atmosfera nas fases, aprovada — a folha real e o registro"
```
