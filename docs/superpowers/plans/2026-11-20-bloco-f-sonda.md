# Bloco F — a SONDA: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** um inimigo novo, a `sonda` — a arte dele (escura na F2, ferrugem na F3) — no lugar dos dardos da F2 e em
ondas próprias na F3, que curva pelo caminho, atira uma vez com aviso, esquiva de quem mira e sai pela esquerda.

**Architecture:** a sonda é um `miudo` do `EnemySystem` (um `ComportamentoElite` que não é elite): o cérebro em
`src/entities/sonda/Sonda.ts`, as regras PURAS (sem Phaser) em `src/entities/sonda/regras.ts`, os números em
`src/data/numerosSonda.ts`. A onda (o caminho, quem atira) é decidida pela 1ª sonda que nasce e herdada pelas que nascem
logo depois. A pele vem da fase (`CtxElite.fase`).

**Tech Stack:** TypeScript, Phaser 3.90 (Arcade), Vite; testes em Node 24 (importa `.ts` direto) e Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-bloco-f-sonda-design.md`.

## Global Constraints

- Commit e push SÓ quando ele pedir, só no nome dele (SEM `Co-Authored-By`), nunca para `legacy`; vídeos, GIFs, `q/`,
  `cru/` fora. A ordem dos commits: o jogo (`feat`/`fix`), as ferramentas/testes/folhas (`chore`), os docs.
- A conversa em português; código, comentários, prompts e raciocínio em inglês.
- Editar com Edit/Write (ou script Python em arquivo que FALHA quando o trecho não é achado); um heredoc por comando.
- Enquanto ele joga ou durante filmagem: não editar `src/` nem `.html` do projeto — a cópia na 5174 (e reiniciar o
  servidor da cópia depois de editar vários arquivos: o Vite dela duplica módulos).
- O batedor (`batedor`) NÃO muda em fase nenhuma; a F1 não ganha sonda.
- Vida 2, 60 pontos, 3 por onda, tiro no máximo 1 por sonda e 1–2 por onda de 3, aviso 0,45 s, esquiva 1 vez com
  0,25 s de demora (spec §2–3).
- Arte: a dele é a base, nunca redesenhada; nada descartado da fila de review do PixelLab.

## File Structure

- Create `src/data/numerosSonda.ts` — os números (velocidade, caminho, tiro, esquiva, hitbox).
- Create `src/entities/sonda/regras.ts` — o caminho, quem atira, a esquiva, a inclinação: funções puras.
- Create `src/entities/sonda/Sonda.ts` — o `ComportamentoElite` (o estado no sprite, o voo, o tiro, a anim).
- Modify `src/systems/EnemySystem.ts` — `'sonda'` no `EnemyKind`, o `DEFS.sonda`, `fase` no `ctxElite`, o `fireAt` pela
  `vestirBola`, a pele do batedor fora do `STAGE_2_SKIN` (Task 3).
- Modify `src/entities/elites/tipos.ts` — `fase` no `CtxElite`.
- Modify `src/systems/PadroesDeTiro.ts` — `vestirBola`.
- Modify `src/systems/morte/numerosDestrocos.ts` — a sonda (classe comum).
- Modify `src/sandbox/config.ts` — a sonda no sandbox.
- Modify `src/scenes/BootScene.ts` — as texturas (Task 2) e as animações (Task 4).
- Modify `src/systems/StageDirector.ts` — as ondas (Task 3).
- Create `public/sprites/sonda/` — a arte dele e os quadros dos clipes.
- Create `scripts/test-sonda-regras.mjs`, `scripts/test-sonda-ondas.mjs`, `scripts/test-sonda-jogo.mjs`.

---

### Task 1: as regras puras e os números

**Files:**
- Create: `src/data/numerosSonda.ts`
- Create: `src/entities/sonda/regras.ts`
- Test: `scripts/test-sonda-regras.mjs`

**Interfaces:**
- Produces: `SONDA` (os números); `sortearCaminho(rnd, naveY): Caminho`, `yNoCaminho(c, x): number`,
  `quemAtira(rnd, n): boolean[]`, `xDoAviso(rnd): number`, `esquivaNova(): Esquiva`,
  `alinhada(naveX, naveY, x, y): boolean`, `passoEsquiva(s, t, dt, alinhadaAgora, y): Esquiva`,
  `desvioDaEsquiva(s, t): number`, `inclinacao(vy): Inclinacao`; os tipos `Caminho`, `Esquiva`, `Inclinacao`.

- [ ] **Step 1: escrever o teste (falha: os módulos não existem)**

```js
// THE SONDA's pure rules (spec 2026-11-20-bloco-f-sonda-design.md §3). From the root: node scripts/test-sonda-regras.mjs
import { SONDA as S } from '../src/data/numerosSonda.ts';
import {
  sortearCaminho, yNoCaminho, quemAtira, xDoAviso, esquivaNova, alinhada, passoEsquiva, desvioDaEsquiva, inclinacao,
} from '../src/entities/sonda/regras.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
/** a fixed sequence for `rnd` */
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
let semente = 7;
const rnd = () => (semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0) / 4294967296;

// ── the path ──
const merg = sortearCaminho(seq(0.1, 0.1), 120);
conferir(merg.tipo === 'mergulho' && merg.y0 === S.faixa[0] && merg.y1 === 120, 'rnd baixo: o mergulho, entrando alto, até a altura da nave', merg);
const diag = sortearCaminho(seq(0.9, 0.9), 120);
conferir(diag.tipo === 'diagonal' && diag.y0 === S.faixa[1] && diag.y1 === S.faixa[0], 'rnd alto: o corte em diagonal, de baixo para cima', diag);
conferir(sortearCaminho(seq(0.1, 0.1), 999).y1 === S.faixa[1], 'a nave fora da faixa: o mergulho para na borda da faixa', null);
for (const c of [merg, diag, sortearCaminho(seq(0.9, 0.1), 60), sortearCaminho(seq(0.1, 0.9), 60)]) {
  conferir(Math.abs(yNoCaminho(c, S.xEntra) - c.y0) < 1e-9, `${c.tipo}: nasce na altura de entrada`, yNoCaminho(c, S.xEntra));
  conferir(Math.abs(yNoCaminho(c, S.xSai) - c.y1) < 1e-9, `${c.tipo}: sai na altura final`, yNoCaminho(c, S.xSai));
  let dentro = true;
  for (let x = S.xEntra; x >= S.xSai; x -= 4) {
    const y = yNoCaminho(c, x);
    if (y < S.faixa[0] - 1e-9 || y > S.faixa[1] + 1e-9) dentro = false;
  }
  conferir(dentro, `${c.tipo}: o caminho inteiro fica dentro da faixa`, null);
}
conferir(yNoCaminho(merg, S.curva[1]) === yNoCaminho(merg, 0), 'o mergulho termina a curva e segue reto', [yNoCaminho(merg, S.curva[1]), yNoCaminho(merg, 0)]);
conferir(yNoCaminho(merg, S.curva[0] + 20) === merg.y0, 'o mergulho entra reto antes de curvar', null);

// ── who shoots ──
let soUmOuDois = true;
let viuUm = false;
let viuDois = false;
for (let i = 0; i < 500; i++) {
  const q = quemAtira(rnd, 3).filter(Boolean).length;
  if (q < 1 || q > 2) soUmOuDois = false;
  if (q === 1) viuUm = true;
  if (q === 2) viuDois = true;
}
conferir(soUmOuDois && viuUm && viuDois, 'numa onda de 3, atiram 1 ou 2 (os dois casos acontecem)', null);
conferir(JSON.stringify(quemAtira(rnd, 1)) === '[true]' && quemAtira(rnd, 0).length === 0, 'onda de 1: ela atira; onda vazia: ninguém', null);
let avisoNaFaixa = true;
for (let i = 0; i < 200; i++) {
  const x = xDoAviso(rnd);
  if (x > S.tiro.xAviso[0] || x < S.tiro.xAviso[1] || x > 384 - 13) avisoNaFaixa = false;
}
conferir(avisoNaFaixa, 'o aviso do tiro sempre com ela inteira na tela', null);

// ── the dodge ──
conferir(alinhada(80, 100, 300, 104) && !alinhada(80, 130, 300, 104) && !alinhada(320, 104, 300, 104), 'alinhada = mesma altura e À FRENTE dela', null);
let e = esquivaNova();
e = passoEsquiva(e, 0.2, 0.2, true, 60);
conferir(e.inicio === null, 'alinhada por menos que a demora: não esquiva', e);
e = passoEsquiva(e, 0.3, 0.1, true, 60);
conferir(e.inicio === 0.3 && e.dir === 1, 'alinhada pela demora: esquiva, para baixo quando está alta', e);
const antes = e;
e = passoEsquiva(e, 5, 0.1, true, 60);
conferir(e === antes, 'esquiva UMA vez só', e);
conferir(passoEsquiva(passoEsquiva(esquivaNova(), 0.2, 0.2, true, 60), 0.3, 0.1, false, 60).inicio === null, 'desalinhou antes da demora: o relógio zera', null);
conferir(passoEsquiva(passoEsquiva(esquivaNova(), 0.2, 0.2, true, 170), 0.3, 0.1, true, 170).dir === -1, 'baixa: esquiva para cima', null);
const pico = desvioDaEsquiva(e, 0.3 + S.esquiva.idaS);
conferir(Math.abs(pico - S.esquiva.passo) < 1e-9, 'o passo inteiro no fim da ida', pico);
conferir(desvioDaEsquiva(e, 0.3 + S.esquiva.idaS + S.esquiva.voltaS + 0.01) === 0, 'e volta ao caminho', null);
conferir(desvioDaEsquiva(esquivaNova(), 3) === 0, 'sem esquiva: desvio zero', null);

// ── the lean ──
conferir(inclinacao(-S.inclina - 1) === 'sobe' && inclinacao(S.inclina + 1) === 'desce' && inclinacao(0) === 'reto', 'a inclinação pela velocidade vertical', null);

console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo certo');
process.exitCode = falhas.length ? 1 : 0;
```

- [ ] **Step 2: rodar e ver falhar** — `node scripts/test-sonda-regras.mjs` → erro de módulo não encontrado.

- [ ] **Step 3: os números** — `src/data/numerosSonda.ts`:

```ts
/**
 * THE SONDA (spec 2026-11-20-bloco-f-sonda-design.md §2–3): the numbers he calibrates by GIF and in the `?sandbox`.
 * Distances in game px (384×216), times in s.
 */
export const SONDA = {
  /** px/s to the left (the batedor flies 95: she is a bigger target that shoots, a little slower). */
  vel: 80,
  /** How many per wave (spec §2: 3; the darts came 4–6). */
  porOnda: 3,
  /** A sonda born within this of the wave's first belongs to that wave (the stage spawns them `spacing` apart). */
  janelaOndaS: 1.5,
  /** The band of heights the paths use (under the HUD, over the bottom edge). */
  faixa: [30, 180] as const,
  /** The chance of the DIVE (else the diagonal cut). */
  chanceMergulho: 0.5,
  /** The dive curves between these x (from the first to the second), then flies level. */
  curva: [330, 190] as const,
  /** Where she is born (`EnemySystem.spawn`: GAME_WIDTH + 16) and where the diagonal ends (past the left edge). */
  xEntra: 400,
  xSai: -40,
  /** The shot: the warning starts at an x drawn in `xAviso` (she is whole on screen), lasts `avisoS`, then the orb. */
  tiro: { xAviso: [300, 230] as const, avisoS: 0.45, vel: 110 },
  /**
   * The dodge: the ship aligned (|dy| ≤ `faixaY`, at least `frenteMin` px in front of her) for `demoraS` → one step
   * of `passo` px to the open side, in `idaS`, back to the path in `voltaS`. Once per sonda.
   */
  esquiva: { faixaY: 10, frenteMin: 24, demoraS: 0.25, passo: 22, idaS: 0.18, voltaS: 0.6 },
  /** px/s of vertical speed past which she leans (the up / down clips). */
  inclina: 30,
  /** The fixed hitbox (spec §2: ~16×14, 60% × 55% of her 26×25). */
  corpo: { w: 16, h: 14 },
} as const;
```

- [ ] **Step 4: as regras** — `src/entities/sonda/regras.ts`:

```ts
import { GAME_HEIGHT } from '../../config';
import { SONDA as S } from '../../data/numerosSonda';

/**
 * THE SONDA's rules (spec 2026-11-20 §3), pure: the path, who shoots, the dodge, the lean. No Phaser — the tests run
 * them in Node (`scripts/test-sonda-regras.mjs`).
 */
export type TipoCaminho = 'mergulho' | 'diagonal';
/** The path of a WAVE: y as a function of x (drawn in space — no sine). */
export interface Caminho {
  tipo: TipoCaminho;
  /** the height she enters at (x = `xEntra`)… */
  y0: number;
  /** …and the one she ends at */
  y1: number;
}
export type Rnd = () => number;
const limitar = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
/** smoothstep on [0, 1], clamped */
export const suave = (u: number): number => {
  const k = limitar(u, 0, 1);
  return k * k * (3 - 2 * k);
};

/** The wave's path: the DIVE (from the high or low edge of the band to the ship's height) or the DIAGONAL CUT. */
export function sortearCaminho(rnd: Rnd, naveY: number): Caminho {
  const alto = rnd() < 0.5;
  const borda = alto ? S.faixa[0] : S.faixa[1];
  if (rnd() < S.chanceMergulho) return { tipo: 'mergulho', y0: borda, y1: limitar(naveY, S.faixa[0], S.faixa[1]) };
  return { tipo: 'diagonal', y0: borda, y1: alto ? S.faixa[1] : S.faixa[0] };
}

/** Where the path is at `x`: the dive curves between `curva[0]` and `curva[1]`, the diagonal runs the whole width. */
export function yNoCaminho(c: Caminho, x: number): number {
  const u =
    c.tipo === 'mergulho'
      ? suave((S.curva[0] - x) / (S.curva[0] - S.curva[1]))
      : limitar((S.xEntra - x) / (S.xEntra - S.xSai), 0, 1);
  return c.y0 + (c.y1 - c.y0) * u;
}

/** Which of a wave of `n` shoot: 1 or 2 of 3 (spec §3: gap > shot); a wave of 1 shoots. */
export function quemAtira(rnd: Rnd, n: number): boolean[] {
  const quantos = n <= 1 ? n : rnd() < 0.5 ? 1 : 2;
  const ordem = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
  }
  const marca: boolean[] = Array.from({ length: n }, () => false);
  for (let i = 0; i < quantos; i++) marca[ordem[i]] = true;
  return marca;
}

/** The x where her warning starts (she is whole on screen there). */
export function xDoAviso(rnd: Rnd): number {
  return S.tiro.xAviso[0] + (S.tiro.xAviso[1] - S.tiro.xAviso[0]) * rnd();
}

/** The dodge: how long the ship has been aligned, when the step started (`null` = not yet), and its side. */
export interface Esquiva {
  alinhadaS: number;
  inicio: number | null;
  dir: 1 | -1;
}
export const esquivaNova = (): Esquiva => ({ alinhadaS: 0, inicio: null, dir: 1 });

/** The ship AIMING at her: at her height and in front of her (she reacts to the aim, not to the shots). */
export function alinhada(naveX: number, naveY: number, x: number, y: number): boolean {
  return naveX <= x - S.esquiva.frenteMin && Math.abs(naveY - y) <= S.esquiva.faixaY;
}

/** One frame of the dodge at her clock `t`: aligned for `demoraS` → the step starts, to the open side; once. */
export function passoEsquiva(s: Esquiva, t: number, dt: number, alinhadaAgora: boolean, y: number): Esquiva {
  if (s.inicio !== null) return s;
  const a = alinhadaAgora ? s.alinhadaS + dt : 0;
  if (a >= S.esquiva.demoraS - 1e-9) return { alinhadaS: a, inicio: t, dir: y < GAME_HEIGHT / 2 ? 1 : -1 };
  return { ...s, alinhadaS: a };
}

/** How far the dodge takes her off the path at her clock `t` (out in `idaS`, back in `voltaS`). */
export function desvioDaEsquiva(s: Esquiva, t: number): number {
  if (s.inicio === null) return 0;
  const u = t - s.inicio;
  const { passo, idaS, voltaS } = S.esquiva;
  if (u < 0) return 0;
  if (u <= idaS) return s.dir * passo * suave(u / idaS);
  if (u < idaS + voltaS) return s.dir * passo * (1 - suave((u - idaS) / voltaS));
  return 0;
}

export type Inclinacao = 'reto' | 'sobe' | 'desce';
/** Her lean from her vertical speed (screen y grows downward). */
export function inclinacao(vy: number): Inclinacao {
  return vy < -S.inclina ? 'sobe' : vy > S.inclina ? 'desce' : 'reto';
}
```

- [ ] **Step 5: rodar e ver passar** — `node scripts/test-sonda-regras.mjs` → `tudo certo`; `npx tsc --noEmit -p .` limpo.

- [ ] **Step 6: checkpoint** (sem commit até ele pedir).

---

### Task 2: a sonda no jogo (o cérebro, a integração, a arte parada dele)

**Files:**
- Create: `src/entities/sonda/Sonda.ts`
- Create: `public/sprites/sonda/sonda-f2.png`, `public/sprites/sonda/sonda-f3.png` (a arte dele: os objetos
  `a606e9d2…` e `3f3bd97d…`, baixados em `scratchpad/batedores/novo-f2.png` e `novo-f3.png`)
- Modify: `src/entities/elites/tipos.ts` (o `CtxElite`), `src/systems/EnemySystem.ts`, `src/systems/PadroesDeTiro.ts`,
  `src/systems/morte/numerosDestrocos.ts`, `src/sandbox/config.ts`, `src/scenes/BootScene.ts`
- Test: `scripts/test-sonda-jogo.mjs`

**Interfaces:**
- Consumes: tudo da Task 1.
- Produces: `SONDA_COMPORTAMENTO: ComportamentoElite`; `peleDaFase(fase): PeleSonda`; `TEXTURA_SONDA`; o kind
  `'sonda'`; `PadroesDeTiro.vestirBola(b)`; `CtxElite.fase: number`; as chaves de animação que a Task 4 registra:
  `sonda-f2-voo`, `sonda-f2-sobe`, `sonda-f2-desce`, `sonda-f3-voo`, `sonda-f3-sobe`, `sonda-f3-desce`.

- [ ] **Step 1: o teste em jogo (falha: não há sonda)** — `scripts/test-sonda-jogo.mjs`:

```js
// THE SONDA IN THE GAME (spec 2026-11-20-bloco-f-sonda-design.md). npm run dev, then node scripts/test-sonda-jogo.mjs [--porta 5174]
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };
const porta = process.argv.includes('--porta') ? process.argv[process.argv.indexOf('--porta') + 1] : '5173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.keyboard.press('ArrowDown');
await page.evaluate(() => window.__som.contexto().resume());

/** starts stage `fase`, freezes the stage's own waves (the director's clock far away) and makes the ship untouchable */
async function fase(n) {
  await page.evaluate((f) => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: f, ship: 'interceptor' }), n);
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.ship?.active; }, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    // the stage's own script stops here (no gunship's warning mixes into the count), and so do the hazards and props
    s.director.next = s.director.script.length;
    s.hazardRate = 0;
    s.propRate = 0;
    s.waves = [];
    for (const e of s.enemies.enemies.getChildren()) e.destroy();
  });
}
/** a wave of 3, 0.3 s apart, as the stage spawns them; returns nothing (read them with `sondas()`) */
const onda = () => page.evaluate(async () => {
  const s = window.__game.scene.getScene('Game');
  for (let i = 0; i < 3; i++) {
    s.enemies.spawn('sonda', 100);
    await new Promise((r) => setTimeout(r, 300));
  }
});
const sondas = () => page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren()
  .filter((e) => e.active && e.getData('kind') === 'sonda').map((e) => ({ x: e.x, y: e.y, tex: e.texture.key, w: e.body.width, h: e.body.height })));
const tocados = () => page.evaluate(() => window.__som.diagnostico().tocados.length);
const desde = (n) => page.evaluate((k) => window.__som.diagnostico().tocados.slice(k), n);

// ── F2: the dark one, the path, the shot, the exit ──
await fase(2);
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.ship.setPosition(40, 200); });
let n0 = await tocados();
await onda();
const primeiras = await sondas();
ok(primeiras.length === 3 && primeiras.every((p) => p.tex.startsWith('sondaF2')), 'F2: a onda de 3 nasce com a pele ESCURA', primeiras);
ok(primeiras.every((p) => Math.abs(p.w - 16) < 0.5 && Math.abs(p.h - 14) < 0.5), 'a hitbox fixa 16×14', primeiras);
// the line: at the same x, the same y (they follow the leader's path)
const amostras = [];
for (let i = 0; i < 20; i++) { amostras.push(await sondas()); await page.waitForTimeout(150); }
const lider = amostras.map((a) => a[0]).filter(Boolean);
const ultima = amostras.map((a) => a[a.length - 1]).filter(Boolean);
const yEm = (pts, x) => { const p = pts.reduce((m, q) => (Math.abs(q.x - x) < Math.abs(m.x - x) ? q : m)); return Math.abs(p.x - x) < 6 ? p.y : null; };
const xs = [300, 250, 200];
const difs = xs.map((x) => { const a = yEm(lider, x); const b = yEm(ultima, x); return a === null || b === null ? null : Math.abs(a - b); }).filter((d) => d !== null);
ok(difs.length > 0 && difs.every((d) => d < 3), 'a fila segue o caminho da líder', difs);
await page.waitForFunction(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().every((e) => !e.active || e.getData('kind') !== 'sonda'), null, { timeout: 12000 }).catch(() => {});
ok((await sondas()).length === 0, 'as três saem pela esquerda', await sondas());
let t = await desde(n0);
const tiros = t.filter((x) => x === 'inimigo.tiro').length;
const avisos = t.filter((x) => x === 'inimigo.aviso').length;
ok(tiros >= 1 && tiros <= 2 && avisos === tiros, `atiram 1 ou 2, cada tiro com o aviso antes (${tiros} tiros, ${avisos} avisos)`, t);

// ── the dodge: the ship parked at her height, in front ──
await page.evaluate(() => window.__game.scene.getScene('Game').enemies.spawn('sonda', 100));
await page.waitForTimeout(200);
const a0 = (await sondas())[0];
await page.evaluate((y) => { const s = window.__game.scene.getScene('Game'); s.ship.setPosition(60, y); s.ship.body.setVelocity(0, 0); }, a0.y);
const caminho = [];
for (let i = 0; i < 16; i++) { const p = (await sondas())[0]; if (p) caminho.push(p); await page.evaluate((y) => window.__game.scene.getScene('Game').ship.setPosition(60, y), p?.y ?? a0.y); await page.waitForTimeout(80); }
const saltos = caminho.slice(1).map((p, i) => Math.abs(p.y - caminho[i].y));
ok(Math.max(...saltos) > 3, 'a nave mirando: ela dá o passo de lado', saltos);
await page.evaluate(() => { for (const e of window.__game.scene.getScene('Game').enemies.enemies.getChildren()) e.destroy(); });

// ── the electric holds her still ──
await page.evaluate(() => window.__game.scene.getScene('Game').enemies.spawn('sonda', 100));
await page.waitForTimeout(500);
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); const e = s.enemies.enemies.getChildren().find((q) => q.getData('kind') === 'sonda'); s.enemies.travar(e, 1500); });
const p1 = (await sondas())[0];
await page.waitForTimeout(600);
const p2 = (await sondas())[0];
ok(p1 && p2 && Math.abs(p1.x - p2.x) < 1 && Math.abs(p1.y - p2.y) < 1, 'o elétrico a prende parada no ar', [p1, p2]);

// ── F3: the rust one ──
await fase(3);
await page.evaluate(() => window.__game.scene.getScene('Game').enemies.spawn('sonda', 100));
await page.waitForTimeout(200);
ok((await sondas())[0]?.tex.startsWith('sondaF3'), 'F3: a pele de FERRUGEM', await sondas());

// ── F1 and the batedor untouched ──
await fase(1);
await page.evaluate(() => window.__game.scene.getScene('Game').enemies.spawn('batedor', 100));
await page.waitForTimeout(200);
const bat = await page.evaluate(() => window.__game.scene.getScene('Game').enemies.enemies.getChildren().filter((e) => e.active && e.getData('kind') === 'batedor').map((e) => e.texture.key));
ok(bat.length === 1 && bat[0].startsWith('enemyScout') && !bat[0].includes('Cinturao'), 'o batedor da F1 segue o roxo de sempre', bat);

ok(erros.length === 0, 'sem erros na página', erros);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
```

- [ ] **Step 2: rodar e ver falhar** — `node scripts/test-sonda-jogo.mjs` → ✘ (o `spawn('sonda')` não existe).

- [ ] **Step 3: a arte parada dele no `public`**

```bash
mkdir -p public/sprites/sonda
cp "<scratchpad>/batedores/novo-f2.png" public/sprites/sonda/sonda-f2.png
cp "<scratchpad>/batedores/novo-f3.png" public/sprites/sonda/sonda-f3.png
```
(`<scratchpad>` = `C:/Users/Henrique/AppData/Local/Temp/claude/0048f17c995fe4db/5d03abf8-5fbc-4509-958c-74020babde9c/scratchpad`;
sem ele, baixar de novo pelos `rotations/unknown.png` dos dois objetos com `get_object`.)

- [ ] **Step 4: `fase` no contexto** — em `src/entities/elites/tipos.ts`, no `CtxElite`, depois de `nascer`:

```ts
  /** The stage (1–4): who dresses by stage (the sonda: dark in the F2, rust in the F3). */
  fase: number;
```
e em `src/systems/EnemySystem.ts`, o `ctxElite` (l. ~356):

```ts
    return { scene: this.scene, alvo, tiros: this.tiros, ganchos: this.ganchos, nascer: (kind, x, y) => this.spawn(kind, y, x), fase: this.stageId };
```

- [ ] **Step 5: a bola num lugar só** — em `src/systems/PadroesDeTiro.ts`, depois de `vestirPadrao`:

```ts
  /**
   * The ORB of the belt (the F2 gunship's ammo, `bulletOrb`): its art untinted and not additive (the dark rim is half of
   * why it reads), pulsing, a CIRCLE hitbox — 10 px across on screen at 0.8 (measured: see `EnemySystem.fireAt`). The
   * sonda shoots it in the F2 and the F3.
   */
  static vestirBola(b: Tiro): void {
    b.setTexture('bulletOrb').setScale(0.8).clearTint();
    b.setBlendMode(Phaser.BlendModes.NORMAL);
    if (b.scene.anims.exists('bullet-orb-pulse')) b.play('bullet-orb-pulse');
    (b.body as Phaser.Physics.Arcade.Body).setCircle(6.25, 10 - 6.25, 12 - 6.25);
  }
```
e no `EnemySystem.fireAt`, o ramo `if (municao) { … }` passa a chamar `PadroesDeTiro.vestirBola(b);` (mantendo o
comentário longo que explica a medida). Conferir que `PadroesDeTiro` já importa `Phaser` (sim: `vestirPadrao` usa
`Phaser.BlendModes`).

- [ ] **Step 6: o cérebro** — `src/entities/sonda/Sonda.ts`:

```ts
import Phaser from 'phaser';
import { SONDA as S } from '../../data/numerosSonda';
import { PadroesDeTiro } from '../../systems/PadroesDeTiro';
import { Som } from '../../som/Som';
import { vestir, type ComportamentoElite, type CtxElite, type Sprite } from '../elites/tipos';
import {
  alinhada, desvioDaEsquiva, esquivaNova, inclinacao, passoEsquiva, quemAtira, sortearCaminho, xDoAviso, yNoCaminho,
  type Caminho, type Esquiva,
} from './regras';

export type PeleSonda = 'f2' | 'f3';
/** The skin by stage (spec §2): rust in the F3, dark everywhere else (the F2; the sandbox of any stage). */
export const peleDaFase = (fase: number): PeleSonda => (fase === 3 ? 'f3' : 'f2');
/** His static art (the PixelLab objects), the first frame of every clip. */
export const TEXTURA_SONDA: Record<PeleSonda, string> = { f2: 'sondaF2', f3: 'sondaF3' };

/** The WAVE being born: the first sonda draws the path and who shoots; the ones born right after inherit them. */
interface Onda {
  t0: number;
  caminho: Caminho;
  atiradores: boolean[];
  n: number;
}
let onda: Onda | null = null;

interface EstadoSonda {
  t: number;
  pele: PeleSonda;
  caminho: Caminho;
  atira: boolean;
  xAviso: number;
  /** her clock when the warning started (`null` = not yet) */
  aviso: number | null;
  atirou: boolean;
  esquiva: Esquiva;
  yAntes: number;
  /** the lean clip she is holding (`null` = level) — Task 4 */
  inclinada: 'sobe' | 'desce' | null;
}

function atirar(e: Sprite, ctx: CtxElite): void {
  ctx.tiros.mirado(e.x - 10, e.y, ctx.alvo.x, ctx.alvo.y, S.tiro.vel, PadroesDeTiro.vestirBola);
  Som.tocar('inimigo.tiro', { x: e.x });
}

/** Her clips (Task 4): the flight loop level, the lean held while the path climbs or dives, played back to level. */
function animar(e: Sprite, s: EstadoSonda, vy: number): void {
  const anims = e.scene.anims;
  const voo = `sonda-${s.pele}-voo`;
  const inc = inclinacao(vy);
  if (inc === 'reto') {
    if (s.inclinada) {
      const volta = `sonda-${s.pele}-${s.inclinada}`;
      s.inclinada = null;
      if (anims.exists(volta)) {
        e.playReverse(volta);
        if (anims.exists(voo)) e.anims.chain(voo);
        return;
      }
    }
    if (anims.exists(voo) && !e.anims.isPlaying) e.play(voo);
    return;
  }
  if (s.inclinada === inc) return;
  const chave = `sonda-${s.pele}-${inc}`;
  if (!anims.exists(chave)) return;
  s.inclinada = inc;
  e.play(chave);
}

/**
 * THE SONDA (spec 2026-11-20-bloco-f-sonda-design.md §3): the wave enters from the right on the LEADER's path (the dive
 * or the diagonal cut), she shoots at most once after her warning, steps aside once from whoever aims at her, and leaves
 * by the left. A `miudo`: driven like an elite, not one (it does not dim the foreground). Held by the electric, her
 * clock stops (`atualizar` does not run).
 */
export const SONDA_COMPORTAMENTO: ComportamentoElite = {
  iniciar(e, ctx) {
    const agora = ctx.scene.time.now / 1000;
    if (!onda || agora - onda.t0 > S.janelaOndaS || onda.n >= onda.atiradores.length) {
      onda = { t0: agora, caminho: sortearCaminho(Math.random, ctx.alvo.y), atiradores: quemAtira(Math.random, S.porOnda), n: 0 };
    }
    const i = onda.n++;
    const pele = peleDaFase(ctx.fase);
    // his art already faces left (the eye toward the ship): no mirror
    e.setFlipX(false);
    vestir(e, TEXTURA_SONDA[pele], S.corpo);
    e.setTint(0xffffff);
    e.setData('tint', 0xffffff);
    const y = yNoCaminho(onda.caminho, e.x);
    e.y = y;
    const s: EstadoSonda = {
      t: 0, pele, caminho: onda.caminho, atira: onda.atiradores[i] ?? false, xAviso: xDoAviso(Math.random), aviso: null,
      atirou: false, esquiva: esquivaNova(), yAntes: y, inclinada: null,
    };
    e.setData('elite', s);
    const voo = `sonda-${pele}-voo`;
    if (e.scene.anims.exists(voo)) e.play(voo);
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as EstadoSonda;
    s.t += dt;
    (e.body as Phaser.Physics.Arcade.Body).setVelocity(-S.vel, 0);
    s.esquiva = passoEsquiva(s.esquiva, s.t, dt, alinhada(ctx.alvo.x, ctx.alvo.y, e.x, e.y), e.y);
    const y = yNoCaminho(s.caminho, e.x) + desvioDaEsquiva(s.esquiva, s.t);
    const vy = dt > 0 ? (y - s.yAntes) / dt : 0;
    e.y = y;
    s.yAntes = y;
    animar(e, s, vy);

    if (!s.atira || s.atirou) return;
    if (s.aviso === null && e.x <= s.xAviso) {
      s.aviso = s.t;
      // the warning lasts the blink: the player READS it and leaves the line (the gunner's, block SOUND sheet 3)
      Som.tocar('inimigo.aviso', { x: e.x });
    }
    if (s.aviso === null) return;
    const resta = S.tiro.avisoS - (s.t - s.aviso);
    if (resta > 0) {
      e.setTint(Math.floor(resta * 30) % 2 === 0 ? 0xffd0d0 : 0xff6060);
      return;
    }
    e.setTint(0xffffff);
    atirar(e, ctx);
    s.atirou = true;
  },
};
```

- [ ] **Step 7: o kind e o DEFS** — em `src/systems/EnemySystem.ts`: no `EnemyKind`, depois de `| 'mosca'`, acrescentar
`| 'sonda'` (com o comentário `// the F2 (in place of the dart) and the F3: spec 2026-11-20-bloco-f-sonda`); o import
`import { SONDA_COMPORTAMENTO, TEXTURA_SONDA } from '../entities/sonda/Sonda';`; e no `DEFS`, depois da `mosca`:

```ts
  // THE SONDA (spec 2026-11-20-bloco-f-sonda-design.md): his art, dark in the F2 (in place of the dart), rust in the F3
  // (beside the batedores). A `miudo` with its own brain (`entities/sonda`): the path, one shot, the dodge.
  sonda: { texture: TEXTURA_SONDA.f2, hp: 2, speed: 0, wave: 0, fireRate: 0, score: 60, scale: 1, tint: 0xffffff, homing: 0, spawnRate: 0, elite: SONDA_COMPORTAMENTO, miudo: true },
```

- [ ] **Step 8: a morte, o sandbox, as texturas**
  - `src/systems/morte/numerosDestrocos.ts`: `sonda: { classe: 'comum', material: 'metal' },` ao lado do `batedor`.
  - `src/sandbox/config.ts`: `'sonda'` no fim de `INIMIGOS`; `sonda: 'sonda'` em `NOME_INIMIGO`; `sonda: 12` em
    `MAX_POR_ONDA`; `sonda: 0` no `PADRAO.inimigos`; e em todo outro `Record<TipoInimigo, …>` que o `tsc` apontar.
  - `src/scenes/BootScene.ts`, no mapa das texturas, depois de `enemyScoutCinturao` (l. ~793):

```ts
  // THE SONDA (20/11): his PixelLab art, dark (F2) and rust (F3) — the first frame of her clips (spec 2026-11-20).
  sondaF2: 'sprites/sonda/sonda-f2.png',
  sondaF3: 'sprites/sonda/sonda-f3.png',
```

- [ ] **Step 9: rodar** — `npx tsc --noEmit -p .`; `node scripts/test-sonda-regras.mjs`; `node scripts/test-sonda-jogo.mjs`
  → `tudo certo`. E os vizinhos que tocam no mesmo motor: `node scripts/test-elites-regras.mjs`,
  `node scripts/test-som-inimigos-jogo.mjs`, `node scripts/test-som-elites-jogo.mjs`.

- [ ] **Step 10: checkpoint** (sem commit).

---

### Task 3: as ondas — os dardos da F2 viram sondas, a F3 ganha as dela

**Files:**
- Modify: `src/systems/StageDirector.ts` (o `STAGE_2`, o `STAGE_3`), `src/systems/EnemySystem.ts` (o `STAGE_2_SKIN`)
- Test: `scripts/test-sonda-ondas.mjs`

**Interfaces:**
- Consumes: o kind `'sonda'` (Task 2).

- [ ] **Step 1: o teste (falha: a F2 ainda tem batedor)** — `scripts/test-sonda-ondas.mjs`:

```js
// THE SONDA's WAVES (spec 2026-11-20 §2). From the root: node scripts/test-sonda-ondas.mjs
import { STAGE_1, STAGE_2, STAGE_3 } from '../src/systems/StageDirector.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const ondas = (st, k) => st.filter((e) => e.type === 'wave' && e.kind === k);

conferir(ondas(STAGE_2, 'batedor').length === 0, 'F2: nenhum batedor (ele só existia como dardo)', ondas(STAGE_2, 'batedor'));
const s2 = ondas(STAGE_2, 'sonda');
conferir(JSON.stringify(s2.map((w) => w.t)) === JSON.stringify([9, 24, 33, 48, 58, 84]), 'F2: as sondas nos tempos dos dardos', s2.map((w) => w.t));
conferir(s2.every((w) => w.count === 3), 'F2: 3 por onda', s2.map((w) => w.count));
const s3 = ondas(STAGE_3, 'sonda');
conferir(s3.length === 3 && s3.every((w) => w.count === 3), 'F3: 3 ondas de 3', s3);
conferir(s3.every((w) => (w.t < 44.5 - 6 || w.t >= 57) && w.t < 91), 'F3: fora da passagem do rabo (o quadro vazio) e antes da arena', s3.map((w) => w.t));
conferir(ondas(STAGE_3, 'batedor').length === 5, 'F3: os 5 batedores roxos ficam', ondas(STAGE_3, 'batedor').length);
conferir(ondas(STAGE_1, 'sonda').length === 0 && ondas(STAGE_1, 'batedor').length === 7, 'F1: sem sonda, os batedores de sempre', ondas(STAGE_1, 'batedor').length);

console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo certo');
process.exitCode = falhas.length ? 1 : 0;
```
(antes do Step 3, conferir a contagem real de batedores da F1 — `grep -c "kind: 'batedor'"` no trecho do `STAGE_1` — e
ajustar o `7` do teste ao número de hoje: a F1 não muda.)

- [ ] **Step 2: rodar e ver falhar** — `node scripts/test-sonda-ondas.mjs` → FALHA na F2 e na F3.

- [ ] **Step 3: a F2** — no `STAGE_2`, as 6 linhas `kind: 'batedor'` (t 9, 24, 33, 48, 58, 84) trocam `kind` para
`'sonda'` e `count` para `3`, mantendo `t`, `spacing` e `y`. Um comentário acima da 1ª: `// 20/11 — THE SONDA in place
of the DART (spec 2026-11-20-bloco-f-sonda): his dark art, 3 per wave (the darts came 4–6), the same close line.`

- [ ] **Step 4: a F3** — no `STAGE_3`, três ondas novas, nos vãos do roteiro (o Ato 1 antes do rabo; o Ato 2 entre os
lança-mísseis e a arena):

```ts
  // 20/11 — THE RUST SONDA (spec 2026-11-20-bloco-f-sonda): its own waves, beside the purple batedores
  { t: 18.5, type: 'wave', kind: 'sonda', count: 3, spacing: 0.3, y: 60 },
```
(entre a água-viva de 16 e o kamikaze de 20), `{ t: 78, …, y: 140 }` (entre o kamikaze de 76 e a canhoneira de 80) e
`{ t: 89, …, y: 100 }` (depois do batedor de 87, antes do aviso da Serpente de 93) — cada uma inserida na posição do
tempo dela (o roteiro é lido em ordem).

- [ ] **Step 5: a pele do dardo sai** — no `STAGE_2_SKIN` (`src/systems/EnemySystem.ts`), apagar a linha `batedor: {
texture: 'enemyScoutCinturao', … }` e deixar no lugar: `// (the batedor's DART skin left on 20/11: the sonda took its
place — the PNGs stay on disk)`. Os carregamentos `enemyScoutCinturao` / `scoutCinturaoAnim` no `BootScene` ficam (o
Arquivo de Cartas ou outra cena pode usá-los: conferir com `grep -rn "ScoutCinturao\|scout-cinturao" src`; se só o
`STAGE_2_SKIN` usava, tirar também do carregamento).

- [ ] **Step 6: rodar** — `node scripts/test-sonda-ondas.mjs`, `node scripts/test-sonda-jogo.mjs`, `npx tsc --noEmit -p .`
→ verdes. Uma passada da F2 e da F3 com `scripts/probe-stage3.mjs` (ou a `?sandbox`) para ver as ondas na tela.

- [ ] **Step 7: checkpoint** (sem commit).

---

### Task 4: os clipes (PixelLab) — a folha, a escolha dele, o jogo

**Files:**
- Create: `public/sprites/sonda/sonda-<pele>-<clipe>-<n>.png` (os quadros escolhidos)
- Create: `docs/superpowers/folhas/2026-11-20/sonda/folha.html` (a folha)
- Modify: `src/scenes/BootScene.ts` (os quadros e as animações), `src/systems/morte/numerosDestrocos.ts` (o material
  da de ferrugem, se a folha disser carne)
- Test: `scripts/test-sonda-jogo.mjs` (as animações tocando)

**Interfaces:**
- Consumes: as chaves `sonda-<pele>-voo|sobe|desce` que o `Sonda.ts` já procura (Task 2).

- [ ] **Step 1: gerar o VOO das duas** (`animate_object` nos objetos dele; 2 gerações por clipe; quadro com folga). Os
  pedidos (em inglês, as cores ditas):
  - escura: *"hovering in place, the red-orange eye pulses slowly brighter and dimmer, the dark gunmetal shell and its
    spikes tremble very slightly; the body keeps its exact shape and dark colors, nothing comes out of the eye"*;
  - ferrugem: *"hovering in place, the small dark grey legs under the body paddle and twitch in a loop, the red-orange
    eye in its grey ring pulses slowly; the rust-brown armored shell keeps its exact shape and colors"*.
- [ ] **Step 2: gerar o INCLINAR** das duas, com as DUAS PONTAS fixas (a arte parada como 1º quadro; a inclinada
  ~15° como último; 4 intermediários): *"tilts its nose (the eye side) upward about 15 degrees, as if climbing"* e
  *"…downward about 15 degrees, as if diving"*; mesmas cores ditas.
- [ ] **Step 3: conferir cada geração AMPLIADA** (×8): a forma da arte dele mantida, nenhuma cor inventada (o olho, as
  patas), nada escurecido, emendas; o laço do voo fechando. Clipe que falha: descartar dali (nunca da fila de review).
- [ ] **Step 4: a folha** — `folha.html` com os clipes rodando a 12 fps na escala do jogo e ×4, sobre o fundo de cada
  fase (o cinturão; a nebulosa e o casco), as duas gerações lado a lado; e a de ferrugem morrendo como METAL e como
  CARNE (`docs/DESTROCOS.md` §14) para ele escolher o material. Mostrar a ele; ele escolhe um por clipe.
- [ ] **Step 5: instalar os escolhidos** — os quadros em `public/sprites/sonda/`; no `BootScene`, nos contadores de
  quadros (`… Anim: N`), no `animFrames(...)` e na lista das animações (`{ key, prefix, frameRate }`, ao lado de
  `ship-jato-thrust-azul`): `sonda-f2-voo` / `sonda-f3-voo` com `repeat: -1` e `frameRate: 10`; `sonda-f2-sobe`,
  `sonda-f2-desce`, `sonda-f3-sobe`, `sonda-f3-desce` com `repeat: 0` e `frameRate: 16` (seguir o formato exato da
  lista existente; se ela não aceitar `repeat`, registrar as quatro de inclinar com `this.anims.create` no mesmo lugar).
- [ ] **Step 6: o teste cobra as animações** — em `scripts/test-sonda-jogo.mjs`, depois do teste da F2:

```js
const anim = await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.enemies.spawn('sonda', 100); const e = s.enemies.enemies.getChildren().find((q) => q.active && q.getData('kind') === 'sonda'); return e.anims.currentAnim?.key ?? null; });
ok(anim === 'sonda-f2-voo', 'a escura voa com o laço dela', anim);
```
  e o mesmo na F3 com `'sonda-f3-voo'`. Rodar → verde.
- [ ] **Step 7: checkpoint** (sem commit).

---

### Task 5: o GIF em jogo, ele joga, os docs

- [ ] **Step 1: o GIF** — uma onda da F2 e uma da F3 em jogo, velocidade real, painéis lado a lado (o mergulho e o
  corte; o aviso e o tiro; a esquiva com a nave mirando; a saída), em `docs/superpowers/folhas/2026-11-20/sonda/`.
- [ ] **Step 2: ele julga e joga** (a F2 e a F3 inteiras); cada ajuste nos `numerosSonda.ts`, conferido no `?sandbox`.
- [ ] **Step 3: os docs** — o 🧭 do `docs/HANDOFF.md` (o 📍 do dia, o roadmap), o START do F (o item 1 feito; o que
  falta: a rocha do minerador), a memória.
- [ ] **Step 4: commit e push quando ele pedir** — `feat` (src + public), `chore` (scripts + folha), `docs`.
