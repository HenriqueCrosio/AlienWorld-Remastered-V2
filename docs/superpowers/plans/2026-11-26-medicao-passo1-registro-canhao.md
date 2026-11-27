# A medição das lutas, passo 1: o registro e o canhão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a dev-only fight recorder (`?registro`) and the first robot, the CANHÃO, that kills a boss with a given hand and reports the time per phase — checked on the Capitânia.

**Architecture:** the recorder lives in `src/dev/registro/` (imported only by `main.ts` under `import.meta.env.DEV`); it hangs on the Game scene's CREATE event, wraps the scene's `Medidas` (the sandbox's effective-damage counter) to count hits on the boss, reads `StageBoss.devFaseAtual` every frame to cut the fight into phases, samples the threats every 100 ms, and takes the ship's blows from `damageShip`, which now says its CAUSE. The pure maths (denied area, breathing room, the per-phase summary) sit in `contas.ts` with a pure test. The canhão is a Playwright script that drives the ship by sprite position at the ship's own max speed and holds the fire key.

**Tech Stack:** TypeScript, Phaser 3.90 Arcade, Playwright (Chromium, SwiftShader), Node 24 (`--experimental-transform-types` for the pure tests).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-26-medicao-das-lutas-design.md` (§3 o registro, §4.1 o canhão, §8 os testes).
- Nothing reaches the player's build: `src/dev/registro/` is only imported dynamically under `import.meta.env.DEV`; GameScene imports its type with `import type`.
- The ship moves by sprite position, at most `body.maxVelocity` px/s; never `body.reset` (memory: the body box is offset from the sprite).
- Don't edit `src/` while he plays (memory `filmagem-vite-recarrega`); the robots may run on the copy at port 5174.
- Code, comments and prompts in English; the conversation and the sheets in pt-br. Commits only when he asks, in his name, no Co-Authored-By.

---

### Task 1: the pure maths of the recorder

**Files:**
- Create: `src/dev/registro/contas.ts`
- Test: `scripts/test-registro-contas.mjs`

**Interfaces:**
- Produces: `areaNegada(caixas: Caixa[], largura: number, altura: number, raio?: number, celula?: number): number`; `respiroMax(novas: number[], t0: number, t1: number): number`; `resumirTrecho(tr: Trecho): ResumoTrecho`; types `Caixa {l,r,t,b}`, `Golpe {t,causa,ataque,quem,x,y,absorvido}`, `Trecho`, `ResumoTrecho`.

- [ ] **Step 1: the failing test** — `scripts/test-registro-contas.mjs`:

```js
// THE FIGHT RECORDER'S MATHS (spec 2026-11-26 §3): the denied area, the breathing room, the per-phase summary.
//   node --experimental-transform-types scripts/test-registro-contas.mjs
import { areaNegada, respiroMax, resumirTrecho } from '../src/dev/registro/contas.ts';

const falhas = [];
const conferir = (ok, nome, info) => { console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${ok ? '' : ` → ${JSON.stringify(info)}`}`); if (!ok) falhas.push(nome); };
conferir(areaNegada([], 384, 216) === 0, 'nenhuma ameaça: nada negado');
// one point threat in the middle: a disc of radius 12 → π·144 / (384·216) ≈ 0.55 %
const um = areaNegada([{ l: 192, r: 192, t: 108, b: 108 }], 384, 216);
conferir(Math.abs(um - (Math.PI * 144) / (384 * 216)) < 0.002, 'um ponto nega um disco de 12 px', um);
// a box covering the whole screen denies everything
conferir(areaNegada([{ l: -10, r: 400, t: -10, b: 230 }], 384, 216) === 1, 'a tela coberta: tudo negado');
// breathing room: threats at 1, 2, 6 s in a phase 0..8 s → the biggest gap is 4 s (2 → 6)
conferir(respiroMax([1, 2, 6], 0, 8) === 4, 'o maior respiro entre ameaças novas', respiroMax([1, 2, 6], 0, 8));
conferir(respiroMax([], 3, 5) === 2, 'sem ameaça nova: a fase inteira é respiro');
const r = resumirTrecho({
  fase: 'capitania1', t0: 1000, t1: 11000, dano: 40, disparos: 50, acertos: 40,
  golpes: [
    { t: 2000, causa: 'tiro', ataque: 'base', quem: 'tracer', x: 60, y: 100, absorvido: false },
    { t: 3000, causa: 'tiro', ataque: 'base', quem: 'tracer', x: 60, y: 100, absorvido: true },
    { t: 4000, causa: 'inimigo', ataque: 'base', quem: 'kamikaze', x: 60, y: 100, absorvido: false },
  ],
  amostras: [{ n: 2, area: 0.1 }, { n: 6, area: 0.3 }],
  novas: [1500, 9000],
});
conferir(r.s === 10, 'o tempo da fase em s', r.s);
conferir(r.acerto === 0.8, 'a fração de acerto', r.acerto);
conferir(r.golpes === 3 && r.vidas === 2, 'os golpes e as vidas (o absorvido não conta como vida)', r);
conferir(r.porCausa['tiro:tracer'] === 2 && r.porCausa['inimigo:kamikaze'] === 1, 'os golpes por causa', r.porCausa);
conferir(r.ameacasMedia === 4 && r.ameacasPico === 6, 'as ameaças na tela, média e pico', r);
conferir(Math.abs(r.areaMedia - 0.2) < 1e-9 && r.areaPico === 0.3, 'a área negada, média e pico', r);
conferir(r.respiroMax === 7.5, 'o respiro da fase (1,5 → 9 s)', r.respiroMax);
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: run it** — `node --experimental-transform-types scripts/test-registro-contas.mjs` → fails (module not found).

- [ ] **Step 3: the implementation** — `src/dev/registro/contas.ts`:

```ts
/**
 * THE FIGHT RECORDER'S MATHS (spec 2026-11-26-medicao-das-lutas §3), pure: the denied area (the share of the field
 * within `raio` px of a threat — the `medir-capitania` ruler), the breathing room (the biggest gap without a NEW threat)
 * and the per-phase summary. No Phaser (`scripts/test-registro-contas.mjs`).
 */
export interface Caixa { l: number; r: number; t: number; b: number }

export interface Golpe {
  /** scene ms */
  t: number;
  /** what the scene's call site says: 'tiro', 'corpo', 'morde', 'perigo', 'inimigo', 'borda', 'chao', 'outro' */
  causa: string;
  /** the boss's attack then (`StageBoss.devAtaque`, or the phase) */
  ataque: string;
  /** what touched, when known (a bullet's kind: 'tracer', 'flak', 'lava'…; an enemy's kind) */
  quem: string;
  x: number;
  y: number;
  /** the cards' hull took it (no life lost) */
  absorvido: boolean;
}

export interface Trecho {
  fase: string;
  t0: number;
  t1: number;
  dano: number;
  disparos: number;
  acertos: number;
  golpes: Golpe[];
  /** every 100 ms: the threats on screen and the denied area */
  amostras: { n: number; area: number }[];
  /** scene ms of each threat that appeared */
  novas: number[];
}

export interface ResumoTrecho {
  fase: string;
  s: number;
  dano: number;
  disparos: number;
  acertos: number;
  acerto: number;
  golpes: number;
  vidas: number;
  porCausa: Record<string, number>;
  porAtaque: Record<string, number>;
  ameacasMedia: number;
  ameacasPico: number;
  areaMedia: number;
  areaPico: number;
  respiroMax: number;
}

/** The share of the field (cells of `celula` px) within `raio` px of any box. */
export function areaNegada(caixas: readonly Caixa[], largura: number, altura: number, raio = 12, celula = 4): number {
  if (!caixas.length) return 0;
  const W = Math.ceil(largura / celula), H = Math.ceil(altura / celula);
  const r2 = raio * raio;
  let negadas = 0;
  for (let j = 0; j < H; j++) {
    const y = j * celula + celula / 2;
    for (let i = 0; i < W; i++) {
      const x = i * celula + celula / 2;
      for (const c of caixas) {
        const dx = Math.max(c.l - x, 0, x - c.r);
        const dy = Math.max(c.t - y, 0, y - c.b);
        if (dx * dx + dy * dy <= r2) {
          negadas++;
          break;
        }
      }
    }
  }
  return negadas / (W * H);
}

/** The biggest gap (same unit as the times) between new threats inside [t0, t1], the ends included. */
export function respiroMax(novas: readonly number[], t0: number, t1: number): number {
  const ts = novas.filter((t) => t >= t0 && t <= t1).sort((a, b) => a - b);
  let maior = 0, antes = t0;
  for (const t of ts) {
    maior = Math.max(maior, t - antes);
    antes = t;
  }
  return Math.max(maior, t1 - antes);
}

const somar = (m: Record<string, number>, k: string): void => {
  m[k] = (m[k] ?? 0) + 1;
};

export function resumirTrecho(tr: Trecho): ResumoTrecho {
  const porCausa: Record<string, number> = {};
  const porAtaque: Record<string, number> = {};
  for (const g of tr.golpes) {
    somar(porCausa, g.quem ? `${g.causa}:${g.quem}` : g.causa);
    somar(porAtaque, g.ataque);
  }
  const n = tr.amostras.map((a) => a.n);
  const area = tr.amostras.map((a) => a.area);
  const media = (a: number[]): number => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  return {
    fase: tr.fase,
    s: (tr.t1 - tr.t0) / 1000,
    dano: tr.dano,
    disparos: tr.disparos,
    acertos: tr.acertos,
    acerto: tr.disparos ? tr.acertos / tr.disparos : 0,
    golpes: tr.golpes.length,
    vidas: tr.golpes.filter((g) => !g.absorvido).length,
    porCausa,
    porAtaque,
    ameacasMedia: media(n),
    ameacasPico: n.length ? Math.max(...n) : 0,
    areaMedia: media(area),
    areaPico: area.length ? Math.max(...area) : 0,
    respiroMax: respiroMax(tr.novas, tr.t0, tr.t1) / 1000,
  };
}
```

- [ ] **Step 4: run it** — same command → `tudo certo`.

### Task 2: the recorder in the game

**Files:**
- Create: `src/dev/registro/tipos.ts`, `src/dev/registro/RegistroLuta.ts`, `src/dev/registro/ligar.ts`
- Modify: `src/main.ts` (the dev import), `src/entities/Boss.ts` (`devAtaque?` on `StageBoss`), `src/entities/BossCapitania.ts` (`devAtaque`), `src/scenes/GameScene.ts` (`registro` field; `damageShip(impacto?, materia?, causa = 'outro', quem?)` + `this.registro?.golpe(...)`; every call site says its cause)
- Test: `scripts/test-registro-jogo.mjs`

**Interfaces:**
- Consumes: Task 1 (`resumirTrecho`, `areaNegada`, `Trecho`, `Golpe`).
- Produces: `GanchoRegistro { golpe(causa: string, absorvido: boolean, quem?: Phaser.GameObjects.GameObject): void }`; `window.__registro: RegistroLuta` with `resumo(): ResumoLuta` (`{ estagio, mao, comecou, terminou, s, fases: ResumoTrecho[], total: ResumoTrecho }`); `StageBoss.devAtaque?: string`.

- [ ] **Step 1: the failing test** — `scripts/test-registro-jogo.mjs`: `?fase=besta3&mao=nenhuma&registro`; waits for the fight; holds fire 3 s with the ship aligned to her core; forces 2 blows through `damageShip(undefined, undefined, 'teste')` with the invulnerability cleared; kills her (`boss.damage(99999)` after `vistas.add('coracao')`); checks `__registro.resumo()`: a phase `besta3` exists, `terminou` true, `total.golpes === 2` with `porCausa.teste === 2`, `total.disparos > 10`, `0 < total.acertos <= total.disparos`, `total.dano > 0`, samples taken (`ameacasMedia >= 0` and the phase has ≥ 10 samples), no console error.
- [ ] **Step 2: run it** — fails (`__registro` undefined).
- [ ] **Step 3: the implementation** (code in the files; the key rules):
  - `ligar.ts`: only with `?registro`; on every CREATE of the Game scene: a fresh `Medidas` when the scene has none of its own (not the sandbox's), a `RegistroLuta`, `scene.registro = r`, `postupdate → r.quadro()`, off at SHUTDOWN; `window.__registro = r`.
  - `RegistroLuta`: wraps `medidas.dano` (the `(chefão)` sources = one hit + the damage); per frame: the fight starts when the boss exists and is not `entering`; the phase = `boss.devFaseAtual ?? 'luta'`, a change closes the stretch; new player shots = bullets active now and not last frame; every 100 ms the threats (enemy shots, the boss's `perigos`, live enemies) → `n`, `areaNegada` of their bodies, and the new ones → `novas`; ends at `boss.isDead`.
  - The threat kind (`quem`): `tracer`/`flak`/`estilhaco`/`lava` by the data flags, else the `kind` data, else the texture key.
  - `damageShip`: `this.registro?.golpe(causa, true, quem)` in the hull branch, `this.registro?.golpe(causa, false, quem)` after the life is lost. The enemy-shot overlap calls `damageShip` BEFORE releasing the shot (so its data is still readable).
- [ ] **Step 4: run it** — passes; `npx tsc --noEmit -p .` clean.
- [ ] **Step 5: the build** — `npm run build`, then `grep -rl "RegistroLuta\|__registro" dist/` → nothing.

### Task 3: the canhão

**Files:**
- Create: `scripts/_rebalance/robo/canhao.mjs`, `scripts/_rebalance/robo/comum.mjs`

**Interfaces:**
- Consumes: `window.__registro.resumo()`.
- Produces: `node scripts/_rebalance/robo/canhao.mjs --chefe capitania|guardiao|torre|serpente --mao nenhuma|mediana|forte [--porta 5173] [--teto 900] [--saida file.json]` → prints the table, writes the JSON `{ robo: 'canhao', chefe, mao, teto: bool, resumo }`.

- [ ] **Step 1** `comum.mjs`: open the page at `?fase=<first phase>&mao=<hand>&registro`, wait for the Game scene with the boss, a loop helper that stops the `Cartas` scene whenever it opens, the table printer.
- [ ] **Step 2** `canhao.mjs`: invulnerable every frame; in `postupdate` the aim point (the live `targets` with an enabled body, the nearest; else the boss body's centre), the goal `x = aim.x − 90` (clamped 16…aim.x − 30), `y = aim.y`, the ship moved toward it at `body.maxVelocity.x` px/s; the fire key held; ends at `isDead` or at the ceiling (game seconds).
- [ ] **Step 3: the check on the Capitânia** — `--chefe capitania` with the three hands: each ends (no ceiling), `mediana` faster than `nenhuma`, `forte` faster than `mediana`; both phases present; `acerto` > 0.5.
- [ ] **Step 4: report** to him the table (pt-br).
