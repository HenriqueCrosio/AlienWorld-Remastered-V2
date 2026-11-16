// BLOCK SOUND (16/11) — sheet 4 (the elites): the warnings whose TIMING is the point, synthesized by hand as the third
// version next to the PixelLab ones. Each matches the game's own number (`src/data/numerosElites.ts`):
//   drone.pisca  the mining drone's 0.6 s self-destruct blink (`drone.piscaS`): a whine climbing + beeps speeding up
//   lula.mira    the squid's 0.6 s aim (`cacador.miraS`): a thin tone rising slowly, a slow tremor (organic, not a radar)
//   lula.trava   the 0.3 s lock (`cacador.travaS`): two clicks and a short high sting, the blink of the dotted line
//   tubo.incha   the Tube's 0.6 s swelling (`tubo.inchaS`): a low groan rising, wet bubbling on top
//   node scripts/_som/_sintetizar-folha4.mjs <pasta>      → <pasta>/<nome>-C.wav
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SR = 44100;
const [pasta] = process.argv.slice(2);
if (!pasta) throw new Error('uso: node scripts/_som/_sintetizar-folha4.mjs <pasta>');
mkdirSync(pasta, { recursive: true });

const gravar = (nome, y) => gravarId(nome, y, 'C');
function gravarId(nome, y, id) {
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
let semente = 4242;
const ruido = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 1073741824) - 1;

// drone.pisca — 0.6 s: a whine 400 → 1600 Hz under beeps that speed up (0.12 → 0.03 s) toward the blast
{
  const y = amostras(0.6);
  tom(y, 0, 0.6, (u) => 400 + 1200 * u * u, (u) => 0.25 * Math.min(1, u * 8), [1, 0.3, 0.1]);
  let t = 0;
  while (t < 0.58) {
    const u = t / 0.6;
    tom(y, t, 0.025, () => 900 + 500 * u, (v) => 0.35 * Math.min(1, v * 6) * (1 - v), [1, 0.2]);
    t += 0.12 - 0.09 * u;
  }
  gravar('drone.pisca', y);
}

// drone.pisca C2 — HIS choice C, *"mas modulado, e com o efeito abafado do espaço"*: the same 0.6 s whine and beeps, now
// with a vibrato and a tremolo that speed up (6 → 22 Hz) toward the blast; the muffle is the catalogue's low-pass
{
  const y = amostras(0.6);
  let fm = 0;
  tom(y, 0, 0.6, (u, t) => {
    fm += (2 * Math.PI * (6 + 16 * u)) / SR;
    return (400 + 1200 * u * u) * (1 + 0.06 * Math.sin(fm));
  }, (u, t) => 0.3 * Math.min(1, u * 8) * (0.6 + 0.4 * Math.sin(2 * Math.PI * (6 + 16 * u) * t)), [1, 0.3, 0.1]);
  let t = 0;
  while (t < 0.58) {
    const u = t / 0.6;
    tom(y, t, 0.025, () => 900 + 500 * u, (v) => 0.3 * Math.min(1, v * 6) * (1 - v), [1, 0.2]);
    t += 0.12 - 0.09 * u;
  }
  gravarId('drone.pisca', y, 'C2');
}

// sentinela.sobrecarga D (ROUND 2, his "refazer" of round 1's alarm/buzz) — 1.0 s: the barrels spinning up, pulses
// accelerating 8 → 45 per second over a low body rising 110 → 260 Hz, a metallic overtone on each pulse
{
  const y = amostras(1.0);
  tom(y, 0, 1.0, (u) => 110 + 150 * u, (u) => 0.35 * Math.min(1, u * 5) * (u > 0.9 ? (1 - u) / 0.1 : 1), [1, 0.5, 0.25]);
  let t = 0;
  while (t < 0.97) {
    const u = t / 1.0;
    tom(y, t, 0.018, () => 1400 + 600 * u, (v) => 0.22 * (1 - v), [1, 0.3]);
    tom(y, t, 0.03, () => 180 + 120 * u, (v) => 0.4 * (1 - v), [1]);
    t += 1 / (8 + 37 * u);
  }
  gravarId('sentinela.sobrecarga', y, 'D');
}

// sentinela.sobrecarga D2 — HIS choice D, *"deixe mais grave e bem mais abafado"*: the same spin-up an octave-ish lower
// (body 65 → 160 Hz, the pulses' metal tick 600 → 900 Hz, the pulse body 100 → 170 Hz); the muffle is the catalogue's
// low-pass (900 Hz)
{
  const y = amostras(1.0);
  tom(y, 0, 1.0, (u) => 65 + 95 * u, (u) => 0.4 * Math.min(1, u * 5) * (u > 0.9 ? (1 - u) / 0.1 : 1), [1, 0.5, 0.25]);
  let t = 0;
  while (t < 0.97) {
    const u = t / 1.0;
    tom(y, t, 0.02, () => 600 + 300 * u, (v) => 0.16 * (1 - v), [1, 0.3]);
    tom(y, t, 0.035, () => 100 + 70 * u, (v) => 0.45 * (1 - v), [1]);
    t += 1 / (8 + 37 * u);
  }
  gravarId('sentinela.sobrecarga', y, 'D2');
}

// lula.mira — 0.6 s: a thin tone 700 → 1100 Hz, swelling, with a slow 7 Hz tremor (alive, not electronic)
{
  const y = amostras(0.6);
  tom(y, 0, 0.6, (u, t) => 700 + 400 * u + 18 * Math.sin(2 * Math.PI * 7 * t), (u) => 0.4 * Math.min(1, u * 2.5) * (u > 0.93 ? (1 - u) / 0.07 : 1), [1, 0.15, 0.05]);
  gravar('lula.mira', y);
}

// lula.trava — 0.3 s: two short clicks (the dotted line blinking) and a high sting at 1.8 kHz that dies
{
  const y = amostras(0.3);
  for (const t0 of [0, 0.06]) {
    let lp = 0;
    const i0 = Math.floor(t0 * SR);
    for (let i = 0; i < SR * 0.012; i++) {
      lp += 0.35 * (ruido() - lp);
      y[i0 + i] += 0.6 * lp * Math.exp(-i / (SR * 0.003));
    }
  }
  tom(y, 0.1, 0.2, () => 1800, (u, t) => 0.4 * Math.min(1, t * 400) * Math.exp(-u * 4), [1, 0.2]);
  gravar('lula.trava', y);
}

// drone.tiro — (the PixelLab gave two MUTE takes for "crystal shard") a soft rounded pop 320 → 160 Hz and a faint glassy
// ring at 2.3 kHz that dies in 80 ms: it repeats 3× a burst, so it stays low and short
{
  const y = amostras(0.16);
  tom(y, 0, 0.16, (u) => 160 + 160 * Math.exp(-u * 8), (u, t) => 0.6 * Math.min(1, t * 700) * Math.exp(-t * 30), [1, 0.3]);
  tom(y, 0.004, 0.12, () => 2300, (u, t) => 0.12 * Math.exp(-t * 45), [1, 0.5]);
  gravar('drone.tiro', y);
}

// tubo.incha — 0.6 s: a low groan 70 → 140 Hz swelling + a few soft wet bubbles (band-passed noise blips)
{
  const y = amostras(0.6);
  tom(y, 0, 0.6, (u, t) => 70 + 70 * u + 4 * Math.sin(2 * Math.PI * 5 * t), (u) => 0.5 * Math.min(1, u * 1.6) * (u > 0.92 ? (1 - u) / 0.08 : 1), [1, 0.5, 0.3, 0.15]);
  for (const t0 of [0.12, 0.24, 0.33, 0.41, 0.47, 0.52]) tom(y, t0, 0.035, (u) => 260 + 180 * u, (u) => 0.18 * Math.sin(Math.PI * u), [1]);
  gravar('tubo.incha', y);
}
