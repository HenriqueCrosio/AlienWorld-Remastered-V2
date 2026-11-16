// BLOCK SOUND (16/11) — a ROTARY GUN built from a firing GRAIN (his ask: the TERMINUS shot *"baseado no A-10 [...] para
// produzir o som, pense numa minigun rodando"*). A minigun is not one sound per bullet: the barrels SPIN UP, the shots
// fuse into a buzz while the trigger is held, and the barrels SPIN DOWN. Measured on his reference (16/11): the A-10
// burst repeats every 8 ms (~125/s) with its energy below 600 Hz (2–6 kHz 10 dB down, above 6 kHz almost nothing).
//
// Writes <saida>-arranque.wav (the spin-up: the rate ramps up, the motor whine rises), <saida>-laco.wav (the held fire,
// loopable), <saida>-parada.wav (the spin-down), and <saida>-demo.wav (spin-up + 2 loops + spin-down: ~2 s of a held
// trigger, for the sheet).
//   node scripts/_som/_sintetizar-minigun.mjs <saida-prefixo> --taxa 125 [--grao sintetico|<arquivo>] [--grao-ms 12]
//        [--jitter 0.06] [--corte 1800] [--assobio 0.05] [--laco-externo <arquivo>]
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const SR = 44100;
const args = process.argv.slice(2);
const saida = args[0];
const op = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const taxa = Number(op('--taxa', 125));
const graoArg = op('--grao', 'sintetico');
const graoMs = Number(op('--grao-ms', 12));
const jitter = Number(op('--jitter', 0.06));
const corte = Number(op('--corte', 1800));
const assobio = Number(op('--assobio', 0.05));
const lacoExterno = op('--laco-externo', null);

let semente = 20261116;
const rnd = () => (semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0) / 4294967296;

const ler = (arquivo) => {
  const raw = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', arquivo, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
};

/** The grain: one shot of the train. Synthetic = a short low thump (noise burst + 90 Hz body); or a real shot's attack. */
function grao() {
  const n = Math.floor((SR * graoMs) / 1000);
  const g = new Float32Array(n);
  if (graoArg === 'sintetico') {
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      // (16/11, measured against his reference: the 1st grain had the mids 7 dB short and the top 7 dB over — a 380 Hz
      // body fills the 600 Hz–2 kHz band the A-10 burst has, the noise stays a short click)
      g[i] = 0.55 * Math.exp(-700 * t) * (rnd() * 2 - 1) + 0.6 * Math.exp(-90 * t) * Math.sin(2 * Math.PI * 90 * t) + 0.5 * Math.exp(-70 * t) * Math.sin(2 * Math.PI * 380 * t);
    }
  } else {
    const x = ler(graoArg);
    let ini = 0;
    while (ini < x.length && Math.abs(x[ini]) < 0.02) ini++;
    for (let i = 0; i < n && ini + i < x.length; i++) g[i] = x[ini + i] * Math.min(1, (n - i) / (n * 0.3));
  }
  let pico = 0;
  for (const v of g) pico = Math.max(pico, Math.abs(v));
  for (let i = 0; i < n; i++) g[i] /= pico || 1;
  return g;
}

/** One-pole low-pass in place (the reference's energy sits low). */
function passaBaixa(x, fc) {
  const a = Math.exp((-2 * Math.PI * fc) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) x[i] = y = (1 - a) * x[i] + a * y;
}

/** A pulse train of the grain: `taxaDe(t)` = shots/s at time t (s), over `dur` s. */
function trem(g, dur, taxaDe) {
  const x = new Float32Array(Math.floor(SR * dur) + g.length);
  let t = 0;
  while (t < dur) {
    const r = taxaDe(t);
    if (r <= 0.5) break;
    const i0 = Math.floor(t * SR);
    const amp = 0.82 + 0.18 * rnd();
    for (let j = 0; j < g.length && i0 + j < x.length; j++) x[i0 + j] += g[j] * amp;
    t += (1 / r) * (1 + (rnd() * 2 - 1) * jitter);
  }
  return x.subarray(0, Math.floor(SR * dur));
}

/** The barrels' motor whine, its frequency `f(t)` and level `a(t)`. */
function apito(dur, f, a) {
  const x = new Float32Array(Math.floor(SR * dur));
  let fase = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    fase += (2 * Math.PI * f(t)) / SR;
    x[i] = a(t) * (Math.sin(fase) + 0.4 * Math.sin(2 * fase) + 0.2 * Math.sin(3 * fase));
  }
  return x;
}

const somar = (a, b) => { const n = Math.max(a.length, b.length); const y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = (a[i] ?? 0) + (b[i] ?? 0); return y; };
const fade = (x, inMs, outMs) => { const ni = Math.floor((SR * inMs) / 1000); const no = Math.floor((SR * outMs) / 1000); for (let i = 0; i < ni && i < x.length; i++) x[i] *= i / ni; for (let i = 0; i < no && i < x.length; i++) x[x.length - 1 - i] *= i / no; return x; };
const juntar = (...xs) => { const n = xs.reduce((s, x) => s + x.length, 0); const y = new Float32Array(n); let o = 0; for (const x of xs) { y.set(x, o); o += x.length; } return y; };
/** The demo's joins: 20 ms equal-power overlaps (a loop butted against itself clicks at the seam). */
function juntarSuave(...xs) {
  const ov = Math.floor(SR * 0.02);
  const n = xs.reduce((s, x) => s + x.length, 0) - ov * (xs.length - 1);
  const y = new Float32Array(n);
  let o = 0;
  xs.forEach((x, k) => {
    for (let i = 0; i < x.length; i++) {
      let g = 1;
      if (k > 0 && i < ov) g = Math.sin(((i / ov) * Math.PI) / 2);
      if (k < xs.length - 1 && i >= x.length - ov) g *= Math.cos((((i - (x.length - ov)) / ov) * Math.PI) / 2);
      y[o + i] += x[i] * g;
    }
    o += x.length - ov;
  });
  return y;
}

function wav(arquivo, x) {
  let pico = 0;
  for (const v of x) pico = Math.max(pico, Math.abs(v));
  const k = pico > 0.95 ? 0.95 / pico : 1;
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i] * k)) * 32767), 44 + i * 2);
  writeFileSync(arquivo, b);
}

const ARRANQUE = 0.28;
const LACO = 1.2;
const PARADA = 0.45;
const fMax = 640;

let laco;
let arranqueFogo;
let paradaFogo;
if (lacoExterno) {
  // the held fire from a generated take: 1.2 s from its middle; the ramps are its own fade under the whine
  const x = ler(lacoExterno);
  const ini = Math.max(0, Math.floor(x.length / 2 - (SR * LACO) / 2));
  laco = x.slice(ini, ini + Math.floor(SR * LACO));
  arranqueFogo = fade(x.slice(ini, ini + Math.floor(SR * ARRANQUE)), ARRANQUE * 1000 * 0.9, 0);
  paradaFogo = fade(x.slice(ini, ini + Math.floor(SR * 0.18)), 0, 170);
} else {
  const g = grao();
  laco = trem(g, LACO, () => taxa);
  // spin-up: the rate climbs from a few shots to the full rate; spin-down: it falls off in 0.18 s
  arranqueFogo = trem(g, ARRANQUE, (t) => Math.max(8, taxa * Math.pow(t / ARRANQUE, 1.6)));
  paradaFogo = trem(g, 0.2, (t) => taxa * Math.max(0, 1 - t / 0.18));
  for (const x of [laco, arranqueFogo, paradaFogo]) passaBaixa(x, corte);
}
const arranque = somar(arranqueFogo, apito(ARRANQUE, (t) => 140 + (fMax - 140) * Math.pow(t / ARRANQUE, 0.7), (t) => assobio * (t / ARRANQUE)));
const lacoComApito = somar(laco, apito(LACO, () => fMax, () => assobio * 0.6));
const parada = somar(juntar(paradaFogo, new Float32Array(Math.floor(SR * PARADA) - paradaFogo.length)), apito(PARADA, (t) => fMax * Math.pow(1 - t / PARADA, 1.4) + 60, (t) => assobio * 0.8 * Math.pow(1 - t / PARADA, 1.2)));
fade(parada, 0, 40);

wav(`${saida}-arranque.wav`, arranque);
wav(`${saida}-laco.wav`, lacoComApito);
wav(`${saida}-parada.wav`, parada);
wav(`${saida}-demo.wav`, juntarSuave(arranque, lacoComApito, lacoComApito, parada));
console.log(`minigun ${saida}: rate ${taxa}/s, grain ${graoArg}${lacoExterno ? `, held fire from ${lacoExterno}` : ''}`);
