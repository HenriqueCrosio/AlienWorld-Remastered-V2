// BLOCK SOUND (17/11) — sheet 5c (the F4 core): the warnings whose TIMING is the point, synthesized as the third
// version, each on the game's own number — and the Serpente rain's WAVE redone as a missile IN SPACE (his note: *"o
// apito dos mísseis caindo parece fogos de artifício"*: no whistle — a whistle is air; here the burn comes through the
// hull).
//   guardiao.telegrafo    `BossNucleo.TELEGRAFO_DUR` 1.15 s, the lock at `TELEG_TRAVA` 0.62 (0.71 s): the heart speeds up
//                         until the lock, then a held tight hum is the escape window
//   guardiao.serra.aviso  `SerraGuardiao.AVISO_MS` 0.7 s: the disc spinning up
//   predador.carga        `Predador.CARGA[1]` 1.5 s, the pulse period 0.55 → 0.08 s on k² (`atualizarLuz`), the drop on
//                         all fours at `QUATRO_MS` 0.38 s before the end
//   predador.aviso        `Predador.AVISO` 0.5 s, the core pulsing at 0.2 s at the right edge
//   predador.lava.carga   `Predador.TELEG_LAVA` 0.5 s: the chest boiling
//   serpente.chuva.onda   ~1.5 s (a pod falls ~180 px from rest at `HAB.chuva.acel` 160 px/s²): ignition, then the
//                         rocket burn growing as it comes, all under 300 Hz — heard through the hull
//   node scripts/_som/_sintetizar-folha5c.mjs <pasta>      → <pasta>/<nome>-C.wav
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SR = 44100;
const [pasta] = process.argv.slice(2);
if (!pasta) throw new Error('uso: node scripts/_som/_sintetizar-folha5c.mjs <pasta>');
mkdirSync(pasta, { recursive: true });

function gravar(nome, y, id = 'C') {
  const f = Math.floor(SR * 0.005);
  for (let i = 0; i < f; i++) {
    y[i] *= i / f;
    y[y.length - 1 - i] *= i / f;
  }
  let pico = 0;
  for (const v of y) pico = Math.max(pico, Math.abs(v));
  const k = pico > 0 ? 0.89 / pico : 1;
  const saida = join(pasta, `${nome}-${id}.wav`);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', saida], { input: Buffer.from(new Float32Array(y.map((v) => v * k)).buffer) });
  console.log(saida);
}
const amostras = (seg) => new Float32Array(Math.floor(SR * seg));
function tom(y, t0, dur, freq, env, harm = [1]) {
  let fase = 0;
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < Math.floor(dur * SR) && i0 + i < y.length; i++) {
    const t = i / SR;
    fase += (2 * Math.PI * freq(t / dur, t)) / SR;
    let s = 0;
    harm.forEach((a, k) => (s += a * Math.sin((k + 1) * fase)));
    y[i0 + i] += s * env(t / dur, t);
  }
}
let semente = 51751;
const ruido = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 1073741824) - 1;
/** a low organic thump: a falling sine (f → f/2) with a fast decay, plus a breath of dark noise */
function baque(y, t0, f, g, dec = 22) {
  tom(y, t0, 0.18, (u) => f * (1 - 0.5 * u), (u, t) => g * Math.exp(-t * dec), [1, 0.35]);
  let lp = 0;
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < SR * 0.05 && i0 + i < y.length; i++) {
    lp += 0.06 * (ruido() - lp);
    y[i0 + i] += 0.6 * g * lp * Math.exp(-i / (SR * 0.012));
  }
}
/** the heart: a double thump (lub-dub) */
const coracao = (y, t0, f, g) => {
  baque(y, t0, f, g);
  baque(y, t0 + 0.09, f * 0.85, g * 0.7);
};

// guardiao.telegrafo — 1.15 s: beats from 0.3 s apart down to 0.09 s at the lock (0.71 s), under a hum rising 110 →
// 300 Hz; at the lock a crack, then the hum HOLDS tight (no more rise: he has decided) until the leap
{
  const D = 1.15, TRAVA = 0.62 * D;
  const y = amostras(D);
  let t = 0;
  while (t < TRAVA) {
    const k = t / TRAVA;
    coracao(y, t, 70, 0.55 + 0.35 * k);
    t += 0.3 - 0.21 * k;
  }
  tom(y, 0, TRAVA, (u) => 110 + 190 * u * u, (u) => 0.18 * Math.min(1, u * 4), [1, 0.5, 0.3]);
  tom(y, TRAVA, D - TRAVA, (u, tt) => 300 + 6 * Math.sin(2 * Math.PI * 30 * tt), (u) => 0.22 * (u > 0.9 ? (1 - u) / 0.1 : 1), [1, 0.6, 0.4, 0.2]);
  baque(y, TRAVA, 180, 0.9, 40);
  gravar('guardiao.telegrafo', y);
}

// guardiao.serra.aviso — 0.7 s: a disc spinning up — a buzz whose teeth rate climbs 12 → 45 Hz over a tone 90 → 260 Hz
{
  const D = 0.7;
  const y = amostras(D);
  let fd = 0;
  for (let i = 0; i < y.length; i++) {
    const u = i / y.length;
    fd += (2 * Math.PI * (12 + 33 * u * u)) / SR;
    const dentes = 0.5 + 0.5 * Math.sign(Math.sin(fd));
    y[i] += 0.35 * Math.min(1, u * 5) * dentes * ruido() * 0.5;
  }
  tom(y, 0, D, (u) => 90 + 170 * u, (u) => 0.4 * Math.min(1, u * 4), [1, 0.5, 0.35, 0.25, 0.15]);
  gravar('guardiao.serra.aviso', y);
}

// predador.carga — 1.5 s: the chest's pulses on the game's own curve (period 0.55 → 0.08 s on k²), a growl of dark
// noise swelling under them, and at 0.38 s before the end the heavy DROP on all fours
{
  const D = 1.5;
  const y = amostras(D);
  let fase = 0;
  let ultimo = -1;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const k = t / D;
    const periodo = 0.55 + (0.08 - 0.55) * k * k;
    fase += 1 / (periodo * SR);
    if (Math.floor(fase) !== ultimo) {
      ultimo = Math.floor(fase);
      baque(y, t, 55 + 30 * k, 0.4 + 0.4 * k, 26);
    }
  }
  let lp = 0;
  for (let i = 0; i < y.length; i++) {
    const u = i / y.length;
    lp += 0.04 * (ruido() - lp);
    y[i] += 1.4 * u * u * lp * (0.6 + 0.4 * Math.sin(2 * Math.PI * 23 * (i / SR)));
  }
  baque(y, D - 0.38, 48, 1.3, 14);
  gravar('predador.carga', y);
}

// predador.aviso — 0.5 s: three throbs 0.2 s apart rising, under a low growl
{
  const D = 0.5;
  const y = amostras(D);
  [0, 0.2, 0.4].forEach((t0, j) => baque(y, t0, 60 + 15 * j, 0.5 + 0.25 * j, 18));
  let lp = 0;
  for (let i = 0; i < y.length; i++) {
    const u = i / y.length;
    lp += 0.05 * (ruido() - lp);
    y[i] += 0.9 * Math.min(1, u * 3) * lp * (0.5 + 0.5 * Math.sin(2 * Math.PI * 19 * (i / SR)));
  }
  gravar('predador.aviso', y);
}

// predador.lava.carga — 0.5 s: the chest BOILING: thick bubbles (short rising blips 120–380 Hz) getting denser over a
// low boil
{
  const D = 0.5;
  const y = amostras(D);
  let t = 0.02;
  while (t < D - 0.05) {
    const u = t / D;
    const f = 120 + ((ruido() + 1) / 2) * 260;
    tom(y, t, 0.05, (v) => f * (1 + 0.8 * v), (v) => 0.35 * Math.sin(Math.PI * v), [1, 0.3]);
    t += 0.07 - 0.05 * u + ((ruido() + 1) / 2) * 0.02;
  }
  let lp = 0;
  for (let i = 0; i < y.length; i++) {
    lp += 0.03 * (ruido() - lp);
    y[i] += 1.2 * Math.min(1, (i / y.length) * 2) * lp;
  }
  gravar('predador.lava.carga', y);
}

// serpente.chuva.onda — 1.5 s, a missile wave IN SPACE: the ignition knock, then the burn — a dense low roar (noise
// low-passed under ~300 Hz, a 28 Hz engine flutter) growing as the pods come down; a sub swell under it; no tone that
// slides (that is the whistle he heard as fireworks)
{
  const D = 1.5;
  const y = amostras(D);
  baque(y, 0, 90, 1.0, 18);
  let a = 0, b = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const u = t / D;
    a += 0.035 * (ruido() - a);
    b += 0.035 * (a - b);
    const cresce = Math.min(1, u * 8) * (0.35 + 0.65 * u * u);
    const fim = u > 0.93 ? (1 - u) / 0.07 : 1;
    y[i] += 3.2 * b * cresce * fim * (0.75 + 0.25 * Math.sin(2 * Math.PI * 28 * t));
  }
  tom(y, 0.05, D - 0.05, () => 46, (u) => 0.3 * u * (u > 0.93 ? (1 - u) / 0.07 : 1), [1, 0.4]);
  gravar('serpente.chuva.onda', y);
}

// ── ROUND 2 (his choices: the gallop "refazer", no note) ──
// predador.galope C — the run clip's own cycle (`Predador.CORRIDA_MS` 620 ms): a gorilla's gallop, two PAIRS per cycle —
// the knuckles (0, 0.07 s) and the feet (0.31, 0.38 s) — each a heavy thump with a short dry knock on top. It is made
// EXACTLY periodic and 4 cycles + 0.5 s long: the loop treatment cross-fades the first 0.5 s into the tail, and with this
// length the two overlap on the same beat, so the seam keeps the rhythm
{
  const C = 0.62, N = 4, X = 0.5;
  const y = amostras(N * C + X);
  for (let c = 0; c <= N + 1; c++) {
    for (const [dt, f, g] of [[0, 52, 0.8], [0.07, 46, 0.65], [0.31, 58, 1], [0.38, 50, 0.75]]) {
      const t0 = c * C + dt;
      if (t0 >= y.length / SR) continue;
      baque(y, t0, f, g, 18);
      // the knock of the claws on the shell floor: a 4 ms burst of brighter noise
      const i0 = Math.floor(t0 * SR);
      for (let i = 0; i < SR * 0.004 && i0 + i < y.length; i++) y[i0 + i] += 0.25 * g * ruido() * (1 - i / (SR * 0.004));
    }
  }
  gravar('predador.galope', y);
}
