// THE GUARDIAN ON THE LEASH, step 6 (23/11) — the C takes, synthesized on the game's own numbers (the mould of
// _sintetizar-folha5c.mjs): the ones whose TIMING is the point.
//   guardiao.aperto.onda    `APERTO.CRESCE` 0.45 s + `APERTO.TRAVESSIA` 2.5 s: HIS idea (*"um efeito de notas, como se
//                           fossem notas musicais de guitarra arranhando"*) — a pick scraping DOWN a wound string while
//                           the ring runs, dissonant low notes struck through a fuzz as it goes; the swell is the pick
//                           sliding UP (the read)
//   guardiao.serpente.trava `SERPENTE.TRAVA` 0.4 s: a ratchet tightening (ticks speeding up) over a rising tension hum,
//                           a hard click at the very end — the strike leaves on it
//   guardiao.teto.bombeia   `TETO.SOBE` 0.3 + `TETO.ESPALHA` 0.3: a heart thump, a wet surge rising up the cables,
//                           then a hiss spreading along the ceiling
//   node scripts/_som/_sintetizar-coleira.mjs <pasta>      → <pasta>/<nome>-C.wav
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SR = 44100;
const [pasta] = process.argv.slice(2);
if (!pasta) throw new Error('uso: node scripts/_som/_sintetizar-coleira.mjs <pasta>');
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
let semente = 23111;
const ruido = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 1073741824) - 1;
function baque(y, t0, f, g, dec = 22) {
  tom(y, t0, 0.18, (u) => f * (1 - 0.5 * u), (u, t) => g * Math.exp(-t * dec), [1, 0.35]);
  let lp = 0;
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < SR * 0.05 && i0 + i < y.length; i++) {
    lp += 0.06 * (ruido() - lp);
    y[i0 + i] += 0.6 * g * lp * Math.exp(-i / (SR * 0.012));
  }
}
/** a plucked string (Karplus–Strong) through a fuzz: the guitar note */
function corda(y, t0, f, g, dur, fuzz = 3.5) {
  const N = Math.max(2, Math.round(SR / f));
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = ruido();
  const i0 = Math.floor(t0 * SR);
  let p = 0;
  for (let i = 0; i < Math.floor(dur * SR) && i0 + i < y.length; i++) {
    const a = buf[p], b = buf[(p + 1) % N];
    buf[p] = (dur > 1.5 ? 0.4997 : 0.4985) * (a + b);
    p = (p + 1) % N;
    const env = Math.min(1, i / (SR * 0.004)) * (i > (dur - 0.05) * SR ? (Math.floor(dur * SR) - i) / (0.05 * SR) : 1);
    y[i0 + i] += (g * Math.tanh(fuzz * a)) / Math.tanh(fuzz) * env;
  }
}
/** a resonant band-pass (state variable) over a signal, the centre moving with `fc(u)` */
function passaBanda(x, fc, q = 6) {
  const out = new Float32Array(x.length);
  let lo = 0, bp = 0;
  for (let i = 0; i < x.length; i++) {
    const f = 2 * Math.sin((Math.PI * Math.min(fc(i / x.length), SR / 6)) / SR);
    const hi = x[i] - lo - bp / q;
    bp += f * hi;
    lo += f * bp;
    out[i] = bp;
  }
  return out;
}
/** the PICK SCRAPE: ticks (the pick on each winding) at a rate `taxa(u)`, through a band-pass sliding with `fc(u)` */
function raspa(y, t0, dur, taxa, fc, g) {
  const n = Math.floor(dur * SR);
  const x = new Float32Array(n);
  let fase = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    fase += taxa(u) / SR;
    const tick = Math.exp(-((fase % 1) * 18));
    x[i] = ruido() * (0.35 + 0.65 * tick);
  }
  const b = passaBanda(x, fc, 5);
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < n && i0 + i < y.length; i++) {
    const u = i / n;
    const env = Math.min(1, u / 0.04) * Math.min(1, (1 - u) / 0.08);
    y[i0 + i] += g * b[i] * env;
  }
}

// guardiao.aperto.onda — the swell (0.45 s: the pick slides UP, the read) and the run (2.5 s: it scrapes DOWN while
// dissonant low notes are struck through the fuzz — one every ~0.31 s, the tritone pairs falling)
{
  const CRESCE = 0.45, TRAV = 2.5, D = CRESCE + TRAV + 0.35;
  const y = amostras(D);
  raspa(y, 0, CRESCE, (u) => 18 + 30 * u, (u) => 700 + 1500 * u, 0.55);
  raspa(y, CRESCE, TRAV, (u) => 48 - 26 * u, (u) => 2300 - 1700 * u, 0.6);
  // the string squeal riding the scrape: a harmonic gliding down with a nervous vibrato
  tom(y, CRESCE, TRAV, (u, t) => (880 - 520 * u) * (1 + 0.012 * Math.sin(2 * Math.PI * 7 * t)), (u) => 0.07 * Math.min(1, u * 6) * (1 - u), [1, 0.3]);
  // the notes: E2, A#2 (the tritone), D#2, A2, D2, G#2, C#2, G2 — falling, one per ~0.31 s, struck as the ring passes
  const notas = [82.41, 116.54, 77.78, 110.0, 73.42, 103.83, 69.3, 98.0];
  notas.forEach((f, k) => corda(y, CRESCE + k * (TRAV / notas.length), f, 0.42 - k * 0.02, 0.6));
  // the first strike when the ring starts running: the read becomes the reflex
  corda(y, CRESCE, 55, 0.5, 0.9, 5);
  gravar('guardiao.aperto.onda', y);
}

// guardiao.serpente.trava — 0.4 s: 8 ratchet ticks speeding up over a tension hum 140 → 420 Hz, the click at 0.4
{
  const D = 0.46, TRAVA = 0.4;
  const y = amostras(D);
  let t = 0, k = 0;
  while (t < TRAVA - 0.02) {
    const g = 0.35 + 0.05 * k;
    const i0 = Math.floor(t * SR);
    let lp = 0;
    for (let i = 0; i < SR * 0.012 && i0 + i < y.length; i++) {
      lp += 0.5 * (ruido() - lp);
      y[i0 + i] += g * lp * Math.exp(-i / (SR * 0.0025));
    }
    t += 0.075 * Math.pow(0.82, k);
    k++;
  }
  tom(y, 0, TRAVA, (u) => 140 + 280 * u * u, (u) => 0.14 * Math.min(1, u * 5), [1, 0.6, 0.35, 0.2]);
  baque(y, TRAVA, 900, 0.8, 90);
  gravar('guardiao.serpente.trava', y);
}

// guardiao.teto.bombeia — 0.6 s: the thump (the heart pushes), the surge UP the cables (0.3 s, a wet band-passed rush
// rising), the hiss spreading along the ceiling (0.3 s, lighter, falling away)
{
  const SOBE = 0.3, ESPALHA = 0.3, D = SOBE + ESPALHA + 0.15;
  const y = amostras(D);
  baque(y, 0, 62, 1, 14);
  baque(y, 0.1, 52, 0.6, 18);
  const n = Math.floor(D * SR);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = ruido();
  const b = passaBanda(x, (u) => {
    const t = u * D;
    return t < SOBE ? 180 + 900 * (t / SOBE) : 1080 + 1400 * ((t - SOBE) / ESPALHA);
  }, 4);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = t < SOBE ? 0.5 * (t / SOBE) : 0.5 * Math.max(0, 1 - (t - SOBE) / (ESPALHA + 0.15));
    // the wet gurgle: the rush shivering at 22 Hz
    y[i] += b[i] * env * (0.7 + 0.3 * Math.sin(2 * Math.PI * 22 * t));
  }
  gravar('guardiao.teto.bombeia', y);
}

// ── ROUND 2 (23/11, him on the wave: *"seria interessante o inchar ter um som metálico parecido com esses e cada onda
// vir como uma nota distorcida"* — one ring per squeeze, so ONE note per squeeze; the gap alternates, so the note does:
// LOW for the low gap, the TRITONE above for the high one — the ear reads which gap comes) ──
// guardiao.aperto.incha     `APERTO.CRESCE` 0.45 s: the pick sliding UP a wound string, the scrape tightening
// guardiao.aperto.notaBaixa the run (2.5 s): ONE distorted note struck as the ring starts, ringing while it crosses — E1
// guardiao.aperto.notaAlta  the same, a tritone up — A#1
{
  const D = 0.5;
  const y = amostras(D);
  raspa(y, 0, 0.45, (u) => 16 + 46 * u * u, (u) => 600 + 2200 * u * u, 0.7);
  tom(y, 0, 0.45, (u) => 300 + 600 * u * u, (u) => 0.08 * u, [1, 0.4]);
  gravar('guardiao.aperto.incha', y);
}
for (const [nome, f] of [['guardiao.aperto.notaBaixa', 41.2], ['guardiao.aperto.notaAlta', 58.27]]) {
  const D = 2.8;
  const y = amostras(D);
  // the pick hits the wound string (a short scrape) and the note rings through the fuzz, two strings a hair apart
  raspa(y, 0, 0.06, () => 60, () => 1800, 0.5);
  corda(y, 0, f, 0.5, D, 6);
  corda(y, 0.004, f * 2.003, 0.3, D, 6);
  corda(y, 0.008, f * 3.0, 0.12, D * 0.6, 4);
  // it fades as the ring leaves by the left (the last 0.6 s)
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    if (t > D - 0.6) y[i] *= (D - t) / 0.6;
  }
  gravar(nome, y);
}
