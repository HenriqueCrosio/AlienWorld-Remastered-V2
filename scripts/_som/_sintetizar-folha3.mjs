// BLOCK SOUND (16/11) — sheet 3 (enemies and hazards): the takes whose TIMING is the point, synthesized by hand as the
// third version next to the PixelLab and Kenney ones. Each matches the game's own number:
//   inimigo.aviso   the gunship's 0.45 s telegraph (EnemySystem.TELEGRAPH): a soft tone rising 180 → 520 Hz
//   torre.aviso     the F1 colony turret's 0.4 s telegraph (TerrainSystem.TELEGRAPH): two servo ticks + a low rise
//   kamikaze.travar two short rounded tones, a fourth apart: "locked"
//   sensor.acordar  the sensor mine waking: a chirp up and a low hum that dies
//   sensor.pavio    the 0.7 s fuse (DebrisSystem sensor.fuse): beeps that speed up and climb, the last one at 0.7 s
//   esfincter.gas   a 3 s low hiss loop (brown noise through a band, a slow sputter) — the hoses leaking
// No high hiss on purpose (what repeats is soft): everything sits below ~2.5 kHz.
//   node scripts/_som/_sintetizar-folha3.mjs <pasta>      → <pasta>/<nome>-C.wav
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SR = 44100;
const [pasta] = process.argv.slice(2);
if (!pasta) throw new Error('uso: node scripts/_som/_sintetizar-folha3.mjs <pasta>');
mkdirSync(pasta, { recursive: true });

function gravar(nome, y, id = 'C') {
  // 5 ms fade at both ends: no click
  const f = Math.floor(SR * 0.005);
  for (let i = 0; i < f; i++) {
    y[i] *= i / f;
    y[y.length - 1 - i] *= i / f;
  }
  const buf = Buffer.from(new Float32Array(y).buffer);
  const saida = join(pasta, `${nome}-${id}.wav`);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', saida], { input: buf });
  console.log(saida);
}

const amostras = (seg) => new Float32Array(Math.floor(SR * seg));

/** A tone whose frequency follows `freq(t)` (phase integrated), with `harm` = amplitudes of harmonics 1, 2, 3… */
function tom(y, t0, dur, freq, env, harm = [1]) {
  let fase = 0;
  const i0 = Math.floor(t0 * SR);
  for (let i = 0; i < Math.floor(dur * SR) && i0 + i < y.length; i++) {
    const t = i / SR;
    fase += (2 * Math.PI * freq(t / dur)) / SR;
    let s = 0;
    harm.forEach((a, k) => (s += a * Math.sin((k + 1) * fase)));
    y[i0 + i] += s * env(t / dur, t);
  }
}

// a deterministic noise (the same file every run)
let semente = 1234567;
const ruido = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 1073741824) - 1;

// inimigo.aviso — 0.45 s, swelling, rising; a light 28 Hz flutter so it reads as "charging", not as a pure test tone
{
  const y = amostras(0.45);
  tom(y, 0, 0.45, (u) => 180 + 340 * u * u, (u, t) => 0.45 * Math.min(1, u * 3) * (0.85 + 0.15 * Math.sin(2 * Math.PI * 28 * t)) * (u > 0.94 ? (1 - u) / 0.06 : 1), [1, 0.35, 0.12]);
  gravar('inimigo.aviso', y);
}

// torre.aviso — 0.4 s: two short servo ticks (filtered noise bursts) then a low rise 140 → 360 Hz
{
  const y = amostras(0.4);
  for (const t0 of [0, 0.07]) {
    let lp = 0;
    const i0 = Math.floor(t0 * SR);
    for (let i = 0; i < SR * 0.025; i++) {
      lp += 0.25 * (ruido() - lp);
      y[i0 + i] += 0.6 * lp * Math.exp(-i / (SR * 0.006));
    }
  }
  tom(y, 0.12, 0.28, (u) => 140 + 220 * u, (u) => 0.4 * Math.min(1, u * 4) * (u > 0.9 ? (1 - u) / 0.1 : 1), [1, 0.5, 0.25, 0.1]);
  gravar('torre.aviso', y);
}

// kamikaze.travar — two rounded tones, 520 then 694 Hz (a fourth up), 90 ms each, 40 ms apart
{
  const y = amostras(0.26);
  const env = (u) => Math.min(1, u * 12) * Math.exp(-3 * u);
  tom(y, 0, 0.09, () => 520, (u) => 0.4 * env(u), [1, 0, 0.2, 0, 0.06]);
  tom(y, 0.13, 0.12, () => 694, (u) => 0.45 * env(u), [1, 0, 0.2, 0, 0.06]);
  gravar('kamikaze.travar', y);
}

// sensor.acordar — a chirp 300 → 900 Hz in 80 ms, then a 90 Hz hum dying over 0.3 s
{
  const y = amostras(0.42);
  tom(y, 0, 0.08, (u) => 300 + 600 * u, (u) => 0.4 * Math.min(1, u * 8) * (1 - u * 0.5), [1, 0.2]);
  tom(y, 0.07, 0.35, () => 90, (u) => 0.5 * Math.min(1, u * 10) * Math.exp(-5 * u), [1, 0.4, 0.2]);
  gravar('sensor.acordar', y);
}

// sensor.pavio — 0.7 s of beeps: the gap shrinks 0.16 → 0.035 s and the pitch climbs 700 → 1150 Hz; the last at ~0.7 s
{
  const y = amostras(0.74);
  let t = 0;
  while (t < 0.7) {
    const u = t / 0.7;
    tom(y, t, 0.03, () => 700 + 450 * u, (v) => 0.4 * Math.min(1, v * 6) * (1 - v), [1, 0.15]);
    t += 0.16 - 0.125 * u;
  }
  gravar('sensor.pavio', y);
}

// acerto.indestrutivel (ROUND 2, his "refazer" of round 1's tink / ping / light metal) — a dry low TOC with no ring:
// a sine dropping 420 → 230 Hz in 45 ms over a 6 ms puff of dark noise; the shot dies on the thing, nothing sings
{
  const y = amostras(0.09);
  tom(y, 0, 0.09, (u) => 230 + 190 * Math.exp(-u * 6), (u, t) => 0.55 * Math.min(1, t * 900) * Math.exp(-t * 55), [1, 0.25]);
  let lp = 0;
  for (let i = 0; i < SR * 0.006; i++) {
    lp += 0.2 * (ruido() - lp);
    y[i] += 0.35 * lp * (1 - i / (SR * 0.006));
  }
  gravar('acerto.indestrutivel', y, 'F');
}

// kamikaze.travar (ROUND 3, his direction: *"algo que dá lock em você, mas mais curto e agudo. Como algo sibilante que
// te marca"*) — 0.2 s: a narrow hiss (white noise through a resonant band sweeping 5 → 7.5 kHz) over a thin sine rising
// 2.2 → 3.1 kHz; a fast attack, gone in 200 ms
{
  const y = amostras(0.2);
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    const u = t / 0.2;
    const f = 5000 + 2500 * u;
    // a 2-pole resonator (the "band" of the hiss)
    const r = 0.985;
    const c = 2 * r * Math.cos((2 * Math.PI * f) / SR);
    const s = ruido() * 0.06 + c * b1 - r * r * b2;
    b2 = b1;
    b1 = s;
    y[i] = s * 0.5 * Math.min(1, t * 400) * Math.exp(-u * 3);
  }
  tom(y, 0, 0.2, (u) => 2200 + 900 * u, (u, t) => 0.22 * Math.min(1, t * 300) * Math.exp(-u * 2.5));
  gravar('kamikaze.travar', y, 'J');
}

// acerto.indestrutivel (ROUND 3, his direction: *"precisa ter som de ricochete, algo batendo num objeto mais duro que faz
// o projetil ricochetear"*) — 0.32 s: a hard click (a 3 ms bright noise burst + a short 1.9 kHz ring) and the WHINE of
// the projectile leaving, a sine gliding 3.4 → 1.5 kHz with a little doppler wobble, fading as it goes
{
  const y = amostras(0.32);
  for (let i = 0; i < SR * 0.003; i++) y[i] += 0.7 * ruido() * (1 - i / (SR * 0.003));
  tom(y, 0, 0.05, () => 1900, (u, t) => 0.35 * Math.exp(-t * 90), [1, 0.3]);
  tom(y, 0.012, 0.3, (u) => 1500 + 1900 * Math.exp(-u * 3) + 60 * Math.sin(u * 40), (u, t) => 0.32 * Math.min(1, t * 200) * Math.pow(1 - u, 1.6), [1, 0.12]);
  gravar('acerto.indestrutivel', y, 'J');
}

// esfincter.gas — 3 s loop: brown noise through a soft band (~200–1500 Hz), a slow sputter (two incommensurate wobbles)
{
  const y = amostras(3);
  let marrom = 0;
  let lp = 0;
  let hp = 0;
  for (let i = 0; i < y.length; i++) {
    const t = i / SR;
    marrom = 0.985 * marrom + 0.15 * ruido();
    lp += 0.18 * (marrom - lp); // low-pass ~1.4 kHz
    hp += 0.03 * (lp - hp); // the part below ~200 Hz, taken out
    const gota = 0.75 + 0.15 * Math.sin(2 * Math.PI * 1.7 * t) + 0.1 * Math.sin(2 * Math.PI * 4.3 * t + 1);
    y[i] = 0.9 * (lp - hp) * gota;
  }
  gravar('esfincter.gas', y);
}
