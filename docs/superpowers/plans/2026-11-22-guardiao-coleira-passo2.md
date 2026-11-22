# O Guardião na coleira, passo 2: o leque de lava e a salva mirada (plano)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** no tranco da coleira sai um leque de lava do miolo com UM vão sorteado (o padrão para desviar), e a salva de
glóbulos do `flutua` passa a mirar a nave.

**Architecture:** as regras são puras (`src/entities/guardiao/padroes.ts`: os ângulos da salva, as velocidades do leque)
e testadas no node; a lava em jogo é um módulo próprio (`src/entities/guardiao/lavaGuardiao.ts`: textura, lançar,
gravidade, luz, brasas, o respingo na borda), que o `BossNucleo` chama no tranco e atualiza todo quadro. O leque mira
uma COLUNA (`xAlvo`), não um ponto: todas as gotas têm o mesmo vx, então cruzam qualquer x no mesmo instante, e na coluna
alvo ficam a `passo` px uma da outra, uma faixa tirada (o vão).

**Tech Stack:** Phaser 3.90, TypeScript, Vite; testes puros com `node --experimental-transform-types`; em jogo, Playwright
com relógio em passos.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-22-guardiao-coleira-design.md` §5 (o leque e a salva), §10 passo 2.
- O leque: 5 gotas (100–66%), 6 (66–33%), 7 (33–0%); **um vão** por leque, sorteado a cada investida; gravidade
  `Predador.LAVA_G` = 260; cruza a metade esquerda em ~1 s; dano 1; a arte = a bola de lava do Predador (o gradiente
  `lavaBola`) menor, com luz e brasas.
- A salva: abertura 96° (`SALVA_ABRE`), 3/4/5 por degrau (`SALVA_N`), cadência 1,8 s; **o centro aponta para a nave**;
  com número par, desvio sorteado de meio passo (nunca um vão em cima da nave).
- Enquanto ele joga na 5173: `src/` e `.html` do projeto só na CÓPIA (5174). Módulos NOVOS de `src/` podem nascer no
  projeto (nada os importa ainda, o Vite não recarrega) e são copiados para a cópia; o `BossNucleo.ts` só na cópia.
- Commit e push só quando ele pedir, só no nome dele, sem Co-Authored-By. GIFs fora do git.
- Conversa em pt-br; código, comentários técnicos novos e raciocínio em inglês (comentários de domínio seguem o estilo do
  arquivo, em pt-br).

### Decisões deste plano (derivadas da spec, a confirmar no GIF)

- **O leque centra na altura da nave no tranco** (preso na arena). Sem isso, com 5 gotas ele cobre 108 px dos 160 da arena
  e a nave escaparia sempre pela mesma borda: o "sempre no mesmo lugar" de que ele reclamou.
- **A geometria:** faixas a `PASSO_LAVA` = 18 px na coluna alvo; a gota fere num círculo de 10 px; a nave tem 9 px de
  altura. Entre duas gotas vizinhas sobram 8 px (não passa); no vão, 2·18 − 10 = 26 px (passa com folga). O vão nunca é
  uma faixa da ponta (aí seria só um leque mais curto).
- **A coluna alvo** é x = 40 (a nave mora entre 30 e 120): à direita dela as gotas estão mais juntas que 18 px; à
  esquerda, mais abertas. `T_LAVA` = 1,0 s até ela.
- **Na borda, só respingo** (brasas + som), sem estilhaço que vire tiro: o padrão tem de ficar limpo (memória
  elites-pressionam-sem-punir).

---

### Task 1: As regras puras (a salva mirada e o leque com vão)

**Files:**
- Create: `src/entities/guardiao/padroes.ts`
- Test: `scripts/test-guardiao-padroes.mjs`

**Interfaces:**
- Produces:
  - `miraSalva(boca: Ponto, alvo: Ponto, limite = 60): number` (graus, preso em 180 ± limite)
  - `angulosSalva(n: number, abre: number, centro: number, rnd: () => number): number[]` (radianos)
  - `lequeLava(o: OpcoesLeque): LequeLava` com `OpcoesLeque { n, boca, xAlvo, T, g, passo, centroY, topo, base, rnd }`
    e `LequeLava { vel: Ponto[]; faixas: number[]; vao: number }`

- [ ] **Step 1: Write the failing test** (`scripts/test-guardiao-padroes.mjs`)

```js
// THE GUARDIAN'S PATTERNS — the pure rules of step 2 (spec 2026-11-22-guardiao-coleira-design.md §5). From the root:
//   node --experimental-transform-types scripts/test-guardiao-padroes.mjs
import { miraSalva, angulosSalva, lequeLava } from '../src/entities/guardiao/padroes.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const graus = (r) => (r * 180) / Math.PI;
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

// ── the aim ──
{
  conferir(Math.abs(miraSalva({ x: 200, y: 100 }, { x: 50, y: 100 }) - 180) < 1e-9, 'nave à esquerda na mesma altura: 180°', null);
  const alto = miraSalva({ x: 200, y: 100 }, { x: 50, y: 40 });
  conferir(alto > 180 && alto < 220, 'nave acima: o centro sobe (ângulo > 180° na tela, y para baixo)', alto);
  const atras = miraSalva({ x: 200, y: 100 }, { x: 260, y: 30 });
  conferir(atras <= 240 + 1e-9 && atras >= 120 - 1e-9, 'nave atrás dele: preso em 180 ± 60', atras);
}

// ── the salvo: odd puts a globule on the ship, even too (half-step offset), the opening is kept ──
for (const n of [3, 4, 5]) {
  for (const r of [0.1, 0.9]) {
    const a = angulosSalva(n, 96, 200, seq(r)).map(graus);
    const perto = Math.min(...a.map((x) => Math.abs(x - 200)));
    conferir(perto < 1e-6, `n=${n} (sorteio ${r}): um glóbulo exatamente na mira`, a);
    conferir(Math.abs(a[n - 1] - a[0] - 96) < 1e-6, `n=${n}: a abertura segue 96°`, a);
  }
}
{
  const lados = new Set([0.1, 0.9].map((r) => Math.sign(angulosSalva(4, 96, 200, seq(r)).map(graus).reduce((s, x) => s + x, 0) / 4 - 200)));
  conferir(lados.size === 2, 'n=4: o desvio de meio passo sorteia o lado', [...lados]);
}

// ── the lava fan: n drops, one gap, never at an end, all cross the target column together ──
const base = { boca: { x: 217, y: 113 }, xAlvo: 40, T: 1, g: 260, passo: 18, topo: 30, base: 190 };
for (const n of [5, 6, 7]) {
  for (const r of [0, 0.5, 0.999]) {
    const L = lequeLava({ ...base, n, centroY: 110, rnd: seq(r) });
    conferir(L.vel.length === n && L.faixas.length === n + 1, `n=${n}: ${n} gotas em ${n + 1} faixas`, L.vel.length);
    conferir(L.vao >= 1 && L.vao <= n - 1, `n=${n} (sorteio ${r}): o vão nunca é a faixa da ponta`, L.vao);
    // simulate to the target column
    const ys = L.vel.map((v) => {
      const t = (base.xAlvo - base.boca.x) / v.x;
      return base.boca.y + v.y * t + 0.5 * base.g * t * t;
    });
    const ts = L.vel.map((v) => (base.xAlvo - base.boca.x) / v.x);
    conferir(ts.every((t) => Math.abs(t - base.T) < 1e-9), `n=${n}: todas chegam à coluna em T`, ts);
    const sep = ys.slice(1).map((y, i) => y - ys[i]).sort((p, q) => p - q);
    conferir(Math.abs(sep[0] - 18) < 1e-6 && Math.abs(sep[sep.length - 1] - 36) < 1e-6 && sep.filter((s) => s > 20).length === 1,
      `n=${n}: vizinhas a 18 px, UM vão de 36 px (26 px livres)`, sep);
    conferir(ys.every((y) => y >= base.topo && y <= base.base), `n=${n}: todas dentro da arena na coluna`, ys);
  }
}
{
  const L = lequeLava({ ...base, n: 5, centroY: 32, rnd: seq(0.5) });
  conferir(L.faixas[0] >= base.topo, 'nave colada no teto: o leque fica preso na arena', L.faixas);
  const nao = lequeLava({ ...base, n: 5, centroY: 120, rnd: seq(0.5) });
  const meio = (nao.faixas[0] + nao.faixas[nao.faixas.length - 1]) / 2;
  conferir(Math.abs(meio - 120) < 1e-6, 'o leque centra na altura da nave', meio);
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-transform-types scripts/test-guardiao-padroes.mjs`
Expected: FAIL with `Cannot find module ... padroes.ts`

- [ ] **Step 3: Write the implementation** (`src/entities/guardiao/padroes.ts`)

```ts
/**
 * OS PADRÕES DO GUARDIÃO (spec 2026-11-22-guardiao-coleira-design.md §5): a salva MIRADA e o LEQUE DE LAVA com vão.
 * Puro: sem Phaser.
 */
export interface Ponto {
  x: number;
  y: number;
}

/** O centro da salva, em graus (y para baixo): a direção da boca à nave, presa em 180 ± `limite` (nunca atira para trás). */
export function miraSalva(boca: Ponto, alvo: Ponto, limite = 60): number {
  let a = (Math.atan2(alvo.y - boca.y, alvo.x - boca.x) * 180) / Math.PI;
  if (a < 0) a += 360;
  return Math.min(180 + limite, Math.max(180 - limite, a));
}

/**
 * Os ângulos (radianos) de uma salva de `n` com abertura `abre` (graus) centrada em `centro`. Com `n` PAR o meio é um
 * vão, e o vão cairia em cima da nave: o centro anda meio passo para um lado sorteado e um glóbulo vai nela.
 */
export function angulosSalva(n: number, abre: number, centro: number, rnd: () => number): number[] {
  if (n <= 1) return [(centro * Math.PI) / 180];
  const passo = abre / (n - 1);
  const c = n % 2 === 0 ? centro + (rnd() < 0.5 ? -1 : 1) * (passo / 2) : centro;
  return Array.from({ length: n }, (_, i) => ((c - abre / 2 + i * passo) * Math.PI) / 180);
}

export interface OpcoesLeque {
  n: number;
  boca: Ponto;
  /** a coluna em que as gotas ficam a `passo` px uma da outra */
  xAlvo: number;
  /** o tempo de voo até ela (s) */
  T: number;
  g: number;
  passo: number;
  /** o centro do leque na coluna (a altura da nave), preso na arena */
  centroY: number;
  topo: number;
  base: number;
  rnd: () => number;
}

export interface LequeLava {
  /** a velocidade de cada gota (px/s), do alto para baixo */
  vel: Ponto[];
  /** as n + 1 alturas na coluna alvo, e qual delas ficou sem gota */
  faixas: number[];
  vao: number;
}

/**
 * O LEQUE: n + 1 faixas a `passo` px na coluna alvo, uma tirada (o VÃO, nunca a da ponta). Todas as gotas têm o MESMO
 * vx: cruzam qualquer coluna no mesmo instante, um muro curvo que abre para a esquerda, com um buraco.
 */
export function lequeLava(o: OpcoesLeque): LequeLava {
  const nf = o.n + 1;
  const altura = (nf - 1) * o.passo;
  const c = altura >= o.base - o.topo ? (o.topo + o.base) / 2 : Math.min(o.base - altura / 2, Math.max(o.topo + altura / 2, o.centroY));
  const faixas = Array.from({ length: nf }, (_, i) => c - altura / 2 + i * o.passo);
  const vao = 1 + Math.min(nf - 3, Math.floor(o.rnd() * (nf - 2)));
  const vx = (o.xAlvo - o.boca.x) / o.T;
  const vel = faixas
    .filter((_, i) => i !== vao)
    .map((y) => ({ x: vx, y: (y - o.boca.y - 0.5 * o.g * o.T * o.T) / o.T }));
  return { vel, faixas, vao };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --experimental-transform-types scripts/test-guardiao-padroes.mjs`
Expected: every line `OK`, last line `TODOS OK`.

- [ ] **Step 5: No commit** (he commits when he asks). Copy the module to the working copy:
`cp src/entities/guardiao/padroes.ts <copia>/src/entities/guardiao/`

---

### Task 2: A lava em jogo (`LavaGuardiao`)

**Files:**
- Create: `src/entities/guardiao/lavaGuardiao.ts`

**Interfaces:**
- Consumes: `lequeLava`, `OpcoesLeque` (Task 1); `EnemySystem.enemyBullets` and `EnemySystem.release(b)`;
  `Som.tocar('predador.lava.arremesso' | 'predador.lava.impacto', { x, forca? })`.
- Produces: `class LavaGuardiao { constructor(scene, enemies, topo, base); leque(n, boca, centroY): LequeLava;
  atualizar(dt): void; destroy(): void }`, static `XALVO = 40`, `T = 1.0`, `PASSO = 18`, `G = 260`, `RAIO = 5`.

- [ ] **Step 1: Write the module**

```ts
/**
 * A LAVA DO MIOLO (spec 2026-11-22-guardiao-coleira-design.md §5): no tranco da coleira, a inércia arranca do miolo um
 * LEQUE de gotas de lava em arco, com um vão. A arte é a bola do Predador (o mesmo gradiente) menor, com a luz e as
 * brasas dela; a gravidade é a da lava da F4 (`Predador.LAVA_G`). Na borda, só respingo: o padrão fica limpo.
 */
import Phaser from 'phaser';
import type { EnemySystem } from '../../systems/EnemySystem';
import { Som } from '../../som/Som';
import { garantirLuzRadial } from '../Predador';
import { lequeLava, type LequeLava, type Ponto } from './padroes';

interface Gota {
  b: Phaser.Physics.Arcade.Sprite;
  luz: Phaser.GameObjects.Image;
}

export class LavaGuardiao {
  static readonly XALVO = 40;
  static readonly T = 1.0;
  static readonly PASSO = 18;
  static readonly G = 260;
  /** o raio que FERE (a textura tem 12 px; a borda do gradiente é só brilho) */
  static readonly RAIO = 5;
  private static readonly LADO = 12;

  private gotas: Gota[] = [];
  private readonly brasas: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: EnemySystem,
    private readonly topo: number,
    private readonly base: number,
  ) {
    // a luz da gota é a do Predador, que só nasce na troca
    garantirLuzRadial(scene);
    if (!scene.textures.exists('lavaGuardiao')) {
      const lado = LavaGuardiao.LADO;
      const tex = scene.textures.createCanvas('lavaGuardiao', lado, lado);
      if (tex) {
        const ctx = tex.getContext();
        const r = lado / 2;
        const g = ctx.createRadialGradient(r - 1, r - 1, 0, r, r, r);
        g.addColorStop(0, '#fff8d0');
        g.addColorStop(0.28, '#ffd23a');
        g.addColorStop(0.58, '#ff7a10');
        g.addColorStop(0.85, '#c01e08');
        g.addColorStop(1, 'rgba(90,8,2,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(r, r, r, 0, Math.PI * 2);
        ctx.fill();
        tex.refresh();
      }
    }
    this.brasas = scene.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 220, max: 420 },
        speed: { min: 6, max: 30 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xfff0a0, 0xffb030, 0xff6a10, 0xd02a08],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(40);
  }

  /** O LEQUE do tranco: `n` gotas da `boca`, centrado na altura `centroY` (a nave), um vão sorteado. */
  leque(n: number, boca: Ponto, centroY: number): LequeLava {
    const L = lequeLava({
      n,
      boca,
      xAlvo: LavaGuardiao.XALVO,
      T: LavaGuardiao.T,
      g: LavaGuardiao.G,
      passo: LavaGuardiao.PASSO,
      centroY,
      topo: this.topo,
      base: this.base,
      rnd: Math.random,
    });
    for (const v of L.vel) this.lancar(boca, v);
    this.brasas.explode(12, boca.x, boca.y);
    Som.tocar('predador.lava.arremesso', { x: boca.x });
    return L;
  }

  private lancar(p: Ponto, v: Ponto): void {
    const b = this.enemies.enemyBullets.get(p.x, p.y) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    b.setTexture('lavaGuardiao');
    b.clearTint();
    b.setScale(1);
    b.setFlipX(false);
    b.setDepth(41);
    const body = b.body as Phaser.Physics.Arcade.Body;
    const off = LavaGuardiao.LADO / 2 - LavaGuardiao.RAIO;
    body.setCircle(LavaGuardiao.RAIO, off, off);
    b.setData('ox', p.x);
    b.setData('oy', p.y);
    b.setData('lavaGuardiao', true);
    b.setVelocity(v.x, v.y);
    b.setRotation(Math.atan2(v.y, v.x));
    const luz = this.scene.add
      .image(p.x, p.y, 'luzRadial')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xff6a18)
      .setScale(0.5)
      .setDepth(40);
    this.gotas.push({ b, luz });
  }

  /** A gravidade é DAQUI (o pool é da fase inteira). Na borda da arena: respingo e some. Todo quadro, até depois da morte. */
  atualizar(dt: number): void {
    this.gotas = this.gotas.filter((g) => {
      if (g.b.active && g.b.getData('lavaGuardiao') === true) return true;
      g.luz.destroy();
      return false;
    });
    for (const { b, luz } of this.gotas) {
      const body = b.body as Phaser.Physics.Arcade.Body;
      body.velocity.y += LavaGuardiao.G * dt;
      b.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
      luz.setPosition(b.x, b.y).setAlpha(0.6 + Math.random() * 0.4);
      if (Math.random() < 0.7) this.brasas.emitParticleAt(b.x, b.y);
      const chao = b.y >= this.base - 2 && body.velocity.y > 0;
      const teto = b.y <= this.topo + 2 && body.velocity.y < 0;
      if (!chao && !teto) continue;
      const x = b.x, y = b.y;
      b.setData('lavaGuardiao', false);
      this.enemies.release(b);
      this.brasas.explode(10, x, y);
      Som.tocar('predador.lava.impacto', { x, forca: 0.6 });
    }
  }

  destroy(): void {
    for (const g of this.gotas) {
      g.luz.destroy();
      if (g.b.active) {
        g.b.setData('lavaGuardiao', false);
        this.enemies.release(g.b);
      }
    }
    this.gotas = [];
    this.brasas.destroy();
  }
}
```

- [ ] **Step 2: Typecheck** (in the copy, after copying the module): `cd <copia> && npx tsc --noEmit` → exit 0.
  The `release()` already resets the body to the `bolt2` rectangle, so the circle does not leak to the next slot.
- [ ] **Step 3: No commit.**

---

### Task 3: No `BossNucleo` (só na cópia): o leque no tranco, a salva mirada

**Files:**
- Modify (copy only): `src/entities/BossNucleo.ts` — import; field `lava`; constructor; `update()`; `case 'investe'`
  (the jerk); `case 'flutua'` (the salvo call); `leque()`; `destroy()`.
- Test: `scripts/test-guardiao-lava-jogo.mjs`

**Interfaces:**
- Consumes: `LavaGuardiao` (Task 2), `miraSalva`, `angulosSalva` (Task 1).
- Produces: `BossNucleo.lava` (read by the test), `static LAVA_N = [5, 6, 7]`, `BossNucleo.ultimoLeque: LequeLava | null`
  (read by the test).

- [ ] **Step 1: Write the failing in-game test** (`scripts/test-guardiao-lava-jogo.mjs`): F4 practice, ship invulnerable
  at (70, 60); force a lunge; on the jerk frame read `boss.ultimoLeque` and the active bullets with
  `getData('lavaGuardiao')`; step the clock to the target column time and check: `n` drops (5 at full life), the
  y-sorted separations are 18 px except one of 36 px, the band centred on the ship (±1 px, or clamped), all inside
  30–190. Then force a salvo (`acao='flutua'`, `cdTiro=0`) with the ship at (70, 50) and (70, 170) and check that
  the mean angle of the new `globuloGuardiao` bullets is within half a step of `miraSalva(boca, ship)`, and that one
  globule is within 1° of the aim. No page errors.

```js
// THE LAVA FAN AND THE AIMED SALVO IN GAME (spec 2026-11-22-guardiao-coleira-design.md §5). npm run dev, then
//   node scripts/test-guardiao-lava-jogo.mjs [--porta 5173]
import { chromium } from 'playwright';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const porta = arg('--porta', '5173');
const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const QUADRO = 1000 / 60;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
await page.waitForFunction(() => {
  const g = window.__game.scene;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const s = g.getScene('Game');
  return g.isActive('Game') && s.boss && s.boss.forma === 'guardiao' && !s.boss.entering && s.boss.acao === 'flutua';
}, null, { timeout: 120000, polling: 250 });
await page.evaluate(() => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.damageShip = () => {};
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  window.__step = (n) => {
    for (let i = 0; i < n; i++) {
      window.__passo.t += 1000 / 60;
      g.step(window.__passo.t, 1000 / 60);
    }
  };
});

// ── the lava fan at the jerk ──
const leque = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const b = s.boss;
  s.ship.setPosition(70, 60);
  b.serra?.destroy?.();
  b.serra = null;
  b.acao = 'flutua';
  b.proxima = 'investida';
  b.acaoT = 0;
  b.cdTiro = 99;
  for (let i = 0; i < 400 && b.acao !== 'tranco'; i++) window.__step(1);
  const gotas = () => s.enemies.enemyBullets.getChildren().filter((o) => o.active && o.getData('lavaGuardiao') === true);
  const n = gotas().length;
  const L = b.ultimoLeque;
  const x0 = gotas()[0]?.x;
  // step until the drops reach the target column (x = 40)
  for (let i = 0; i < 120 && gotas().length && gotas()[0].x > 40; i++) window.__step(1);
  const ys = gotas().map((o) => o.y).sort((p, q) => p - q);
  return { n, L, x0, ys, xs: gotas().map((o) => Math.round(o.x)) };
});
conferir(leque.n === 5, 'no tranco saem 5 gotas (vida cheia)', leque.n);
const sep = leque.ys.slice(1).map((y, i) => y - leque.ys[i]);
const grandes = sep.filter((s) => s > 27);
conferir(grandes.length === 1 && sep.every((s) => (s > 27 ? Math.abs(s - 36) < 3 : Math.abs(s - 18) < 3)),
  'na coluna x=40: vizinhas a ~18 px, UM vão de ~36 px', { sep, xs: leque.xs });
const faixas = leque.L?.faixas ?? [NaN];
const meio = (faixas[0] + faixas[faixas.length - 1]) / 2;
conferir(Math.abs(meio - 60) < 1.5 || faixas[0] <= 31, 'o leque centra na nave (ou fica preso no teto)', faixas);
conferir(leque.ys.every((y) => y >= 28 && y <= 192), 'todas dentro da arena na coluna', leque.ys);

// ── the aimed salvo ──
for (const naveY of [50, 170]) {
  const r = await page.evaluate((naveY) => {
    const s = window.__game.scene.getScene('Game');
    const b = s.boss;
    for (let i = 0; i < 300 && b.acao !== 'flutua'; i++) window.__step(1);
    s.ship.setPosition(70, naveY);
    const antes = new Set(s.enemies.enemyBullets.getChildren().filter((o) => o.active && o.texture.key === 'globuloGuardiao'));
    b.acaoT = 99;
    b.cdTiro = 0;
    window.__step(1);
    const novos = s.enemies.enemyBullets.getChildren().filter((o) => o.active && o.texture.key === 'globuloGuardiao' && !antes.has(o));
    const boca = { x: novos[0]?.getData('ox'), y: novos[0]?.getData('oy') };
    const mira = (Math.atan2(naveY - boca.y, 70 - boca.x) * 180) / Math.PI;
    const angs = novos.map((o) => (Math.atan2(o.body.velocity.y, o.body.velocity.x) * 180) / Math.PI).map((a) => (a < 0 ? a + 360 : a));
    return { mira: mira < 0 ? mira + 360 : mira, angs };
  }, naveY);
  const passo = 96 / (r.angs.length - 1);
  const media = r.angs.reduce((s, a) => s + a, 0) / r.angs.length;
  conferir(r.angs.length === 3, `nave em y=${naveY}: salva de 3 (vida cheia)`, r.angs);
  conferir(Math.abs(media - r.mira) <= passo / 2 + 0.5, `nave em y=${naveY}: o centro mira a nave`, r);
  conferir(Math.min(...r.angs.map((a) => Math.abs(a - r.mira))) < 1, `nave em y=${naveY}: um glóbulo na nave`, r);
}

conferir(erros.length === 0, 'nenhum erro de página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Run it against the copy, verify it fails**

Run: `node scripts/test-guardiao-lava-jogo.mjs --porta 5174`
Expected: FAIL on "no tranco saem 5 gotas" (0) and on the salvo aim (y=50 and y=170 both read 180°).

- [ ] **Step 3: Wire it in the copy's `BossNucleo.ts`**

Imports (with the other `./guardiao/` imports):
```ts
import { LavaGuardiao } from './guardiao/lavaGuardiao';
import { angulosSalva, miraSalva, type LequeLava } from './guardiao/padroes';
```
Fields (next to `cabos`):
```ts
  /** a lava do miolo: o leque do tranco (spec 2026-11-22 §5) */
  private readonly lava: LavaGuardiao;
  /** o último leque (lido pelo teste) */
  ultimoLeque: LequeLava | null = null;
  /** gotas no leque do tranco, por degrau */
  private static readonly LAVA_N = [5, 6, 7];
```
Constructor, right after `this.cabos = new CamadaCabos(...)`:
```ts
    this.lava = new LavaGuardiao(scene, enemies, BossNucleo.ARENA_TOPO, BossNucleo.ARENA_BASE);
```
`update()`, right after `this.cabos.atualizar(dt, this.sprite);`:
```ts
    // a lava no ar segue caindo depois da morte, como os glóbulos
    this.lava.atualizar(dt);
```
`case 'investe'`, inside the jerk branch, after `this.scene.cameras.main.shake(90, this.tranco.tremor);`:
```ts
          // O LEQUE: a inércia arranca a lava do miolo, centrada na nave, com um vão
          this.posicionarCore();
          this.ultimoLeque = this.lava.leque(BossNucleo.LAVA_N[this.degrau], { x: this.core.x, y: this.core.y }, target.y);
```
`case 'flutua'`, the salvo call becomes:
```ts
          this.leque(BossNucleo.SALVA_N[this.degrau], this.gMuzzle(), target);
```
`leque()` becomes:
```ts
  /** A SALVA MIRADA: a mesma abertura e o mesmo número, o centro na nave (spec 2026-11-22 §5). */
  private leque(n: number, boca: { x: number; y: number }, alvo: { x: number; y: number }): void {
    const centro = miraSalva(boca, alvo);
    for (const angle of angulosSalva(n, BossNucleo.SALVA_ABRE, centro, Math.random)) {
      this.gLobulo(angle, BossNucleo.SALVA_VEL, boca);
    }
  }
```
`destroy()`, next to `this.cabos.destroy();`:
```ts
    this.lava.destroy();
```

- [ ] **Step 4: Typecheck and run all guardian tests against the copy**

Run: `cd <copia> && npx tsc --noEmit` → exit 0. Then from the project root:
`node --experimental-transform-types scripts/test-guardiao-padroes.mjs`,
`node --experimental-transform-types scripts/test-guardiao-coleira.mjs`,
`node scripts/test-guardiao-coleira-jogo.mjs --porta 5174`,
`node scripts/test-guardiao-lava-jogo.mjs --porta 5174` → all `TODOS OK`.

- [ ] **Step 5: No commit.**

---

### Task 4: O GIF e a folha; mostrar e esperar o veredito

**Files:**
- Modify: `scripts/_guardiao/_gif-investida.mjs` — add `--cenas` to choose the ship heights (`--cenas 60,160`), keep
  the ship firing off and invulnerable (as today; the lava passes through it).
- Output: `docs/superpowers/folhas/2026-11-22/guardiao/lava-A.gif`; the folha in the scratchpad
  (`folha-guardiao/folha.html`), a new "Rodada 3" section on top.

- [ ] **Step 1:** film `node scripts/_guardiao/_gif-investida.mjs docs/superpowers/folhas/2026-11-22/guardiao/lava-A.gif --porta 5174 --variantes A`
  (two lunges, ship high then low; the second scene also shows two aimed salvos at the station).
- [ ] **Step 2:** open frames of the GIF magnified (the fan right after the jerk, the column at x≈40, a salvo) before
  showing him.
- [ ] **Step 3:** add the "Rodada 3" section to the folha: the GIF, the geometry in one line (18 px between drops, a
  26 px corridor, the band centred on the ship), the salvo aimed (a globule on the ship; with 4, half a step to a
  random side), and the questions: is the fan readable and fair? the gap wide enough? the drops' speed (~1 s to cross)?
- [ ] **Step 4:** show and wait for his verdict. Record it in the spec §10 (step 2).

---

## Self-review

- Spec §5: leque no tranco ✓ (Task 3), 5/6/7 por degrau ✓, um vão sorteado ✓ (Task 1), LAVA_G 260 ✓, ~1 s ✓ (T = 1),
  arte da bola do Predador menor + brasas + luz ✓ (Task 2), dano 1 ✓ (bala do pool = 1, como os glóbulos), salva com a
  mesma abertura/número/cadência ✓, centro na nave ✓, par com meio passo sorteado ✓. "Na borda, o estilhaço de lava que
  já existe": substituído por respingo visual (decisão acima, a confirmar no GIF).
- Types: `LequeLava`, `OpcoesLeque`, `Ponto` defined in Task 1, used with the same names in Tasks 2–3.
