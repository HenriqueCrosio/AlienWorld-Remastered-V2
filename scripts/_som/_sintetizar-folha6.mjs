// BLOCK SOUND (17/11) — sheet 6 (the interface): the RETRO TOUCHES (spec §1: "com toques retrô onde ajudam a LER o
// jogo"), the third version of every interface sound. Retro but DARK: triangle and square tones through a one-pole
// low-pass (the cockpit's muffle, no bright chiptune), short envelopes, nothing that tires on the ×8. Every melody here
// is our own (the 1-UP is not anybody's 1-UP). Times from the code where the screen has one:
//   cartas.mesa      the cards come in 50 ms apart, each a 200 ms slide (`CartasScene.create`)
//   resultado.conta  a counter's ticks, an exact 2.0 s loop (it runs while the points count up)
//   estrela.pegar    C1/C2/C3: the 1st, 2nd and 3rd star of the stage, each a step higher
//   node scripts/_som/_sintetizar-folha6.mjs <pasta>      → <pasta>/<nome>-C.wav (estrela.pegar-C1/C2/C3)
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SR = 44100;
const [pasta] = process.argv.slice(2);
if (!pasta) throw new Error('uso: node scripts/_som/_sintetizar-folha6.mjs <pasta>');
mkdirSync(pasta, { recursive: true });

function gravar(nome, y, id = 'C') {
  const f = Math.floor(SR * 0.003);
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
let semente = 61717;
const ruido = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 1073741824) - 1;

/**
 * One retro note into `y`: `forma` triangle or square, frequency `f` (Hz, or a function of 0..1 for a slide), `dur` s,
 * a fast attack and an exponential decay (`dec` per s), through a one-pole low-pass at `corte` Hz.
 */
function nota(y, t0, dur, f, { forma = 'tri', g = 0.5, dec = 8, corte = 2600, ataque = 0.004 } = {}) {
  const i0 = Math.floor(t0 * SR);
  const n = Math.floor(dur * SR);
  const a = 1 - Math.exp((-2 * Math.PI * corte) / SR);
  let fase = 0, lp = 0;
  for (let i = 0; i < n && i0 + i < y.length; i++) {
    const u = i / n, t = i / SR;
    fase += (typeof f === 'function' ? f(u) : f) / SR;
    const p = fase % 1;
    const s = forma === 'tri' ? 1 - 4 * Math.abs(p - 0.5) : p < 0.5 ? 1 : -1;
    const env = Math.min(1, t / ataque) * Math.exp(-dec * t) * (u > 0.9 ? (1 - u) / 0.1 : 1);
    lp += a * (s - lp);
    y[i0 + i] += g * env * lp;
  }
}
/** a soft swish of band-limited noise (the cards sliding) */
function swish(y, t0, dur, g = 0.5) {
  const i0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let a = 0, b = 0;
  for (let i = 0; i < n && i0 + i < y.length; i++) {
    const u = i / n;
    a += 0.25 * (ruido() - a);
    b += 0.25 * (a - b);
    y[i0 + i] += g * (a - b) * 4 * Math.sin(Math.PI * u) ** 2;
  }
}

// the navigation — short and soft (they repeat)
{ const y = amostras(0.06); nota(y, 0, 0.05, 660, { g: 0.5, dec: 40 }); gravar('ui.mover', y); }
{ const y = amostras(0.16); nota(y, 0, 0.06, 523, { dec: 18 }); nota(y, 0.06, 0.09, 784, { dec: 14 }); gravar('ui.confirmar', y); }
{ const y = amostras(0.16); nota(y, 0, 0.06, 784, { dec: 18 }); nota(y, 0.06, 0.09, 523, { dec: 14 }); gravar('ui.voltar', y); }
{ const y = amostras(0.03); nota(y, 0, 0.025, 1000, { g: 0.4, dec: 90, corte: 3000 }); gravar('ui.ajustar', y); }
{ const y = amostras(0.1); [440, 554, 659].forEach((f, i) => nota(y, i * 0.025, 0.04, f, { g: 0.4, dec: 30 })); gravar('ui.aba', y); }
{ const y = amostras(0.2); [0, 0.11].forEach((t) => nota(y, t, 0.07, 150, { forma: 'quad', g: 0.5, dec: 10, corte: 900 })); gravar('ui.negar', y); }
// the pause: the world sinks / comes back
{ const y = amostras(0.4); nota(y, 0, 0.3, (u) => 600 - 400 * u, { g: 0.5, dec: 5, corte: 1800 }); nota(y, 0.2, 0.2, 196, { g: 0.3, dec: 8 }); gravar('ui.pausa.abrir', y); }
{ const y = amostras(0.3); nota(y, 0, 0.26, (u) => 200 + 400 * u, { g: 0.5, dec: 5, corte: 1800 }); gravar('ui.pausa.fechar', y); }
// the remap: waiting for the key, the swap
{ const y = amostras(0.32); [0, 0.2].forEach((t) => nota(y, t, 0.08, 880, { g: 0.4, dec: 20 })); gravar('ui.captura', y); }
{ const y = amostras(0.14); nota(y, 0, 0.12, (u) => 440 + 220 * u, { g: 0.35, dec: 10 }); nota(y, 0, 0.12, (u) => 660 - 220 * u, { g: 0.35, dec: 10 }); gravar('ui.troca', y); }
// START: a power-up over a low thrum
{
  const y = amostras(0.6);
  [262, 330, 392, 523].forEach((f, i) => nota(y, i * 0.06, 0.12, f, { g: 0.45, dec: 9 }));
  nota(y, 0, 0.55, 65, { forma: 'quad', g: 0.35, dec: 4, corte: 300 });
  gravar('ui.comecar', y);
}
// the card table: three slides, 50 ms apart, 200 ms each (the game's own tween) + the choice
{ const y = amostras(0.32); [0, 0.05, 0.1].forEach((t) => swish(y, t, 0.2, 0.6)); gravar('cartas.mesa', y); }
{ const y = amostras(0.45); nota(y, 0, 0.4, 660, { g: 0.45, dec: 7 }); nota(y, 0, 0.4, 990, { g: 0.25, dec: 9 }); nota(y, 0, 0.3, 82, { forma: 'quad', g: 0.3, dec: 10, corte: 250 }); gravar('cartas.escolher', y); }
// the rarity, one family: 1, 2, 3, 4 notes — the epic with a low hit
{
  const notas = { comum: [523], incomum: [523, 659], rara: [523, 659, 784], epica: [523, 659, 784, 1047] };
  for (const [r, ns] of Object.entries(notas)) {
    const y = amostras(0.15 + ns.length * 0.08 + 0.3);
    ns.forEach((f, i) => nota(y, i * 0.08, 0.35, f, { g: 0.4, dec: 6 }));
    if (r === 'epica') nota(y, 0, 0.5, 55, { forma: 'quad', g: 0.5, dec: 5, corte: 220 });
    gravar(`cartas.raridade.${r}`, y);
  }
}
// the stars: each one a step higher (C1, C2, C3); the three complete; the extra life at the next stage
[784, 988, 1175].forEach((f, i) => { const y = amostras(0.18); nota(y, 0, 0.16, f, { g: 0.45, dec: 14 }); nota(y, 0, 0.16, f * 2, { g: 0.12, dec: 20 }); gravar('estrela.pegar', y, `C${i + 1}`); });
{
  const y = amostras(1.0);
  [523, 659, 784, 1047].forEach((f, i) => nota(y, i * 0.07, 0.14, f, { g: 0.45, dec: 10 }));
  nota(y, 0.3, 0.6, 1047, { g: 0.35, dec: 3 });
  nota(y, 0.3, 0.6, 784, { g: 0.25, dec: 3 });
  gravar('estrela.completa', y);
}
{ const y = amostras(0.6); [392, 523, 659].forEach((f, i) => nota(y, i * 0.12, 0.3, f, { g: 0.4, dec: 6 })); gravar('vida.extra', y); }
// SHIP LOST: a falling minor line over a dark pad
{
  const y = amostras(1.4);
  [392, 349, 311, 262].forEach((f, i) => nota(y, i * 0.22, 0.4, f, { g: 0.4, dec: 4, corte: 1600 }));
  nota(y, 0, 1.35, 65, { forma: 'quad', g: 0.25, dec: 1.5, corte: 220 });
  gravar('ui.navePerdida', y);
}
// the result: the counter (an exact loop), the medal (a dark bell), the record (a fast run), the stage cleared (a swell)
// (20 ticks/s: the loop treatment cross-fades the first 0.5 s into the tail — 0.5 s must be a whole number of ticks,
// or the seam doubles them)
{ const y = amostras(2.0); for (let k = 0; k < 40; k++) nota(y, k * 0.05, 0.012, 1200, { g: 0.35, dec: 120, corte: 3000, ataque: 0.001 }); gravar('resultado.conta', y); }
{
  const y = amostras(1.4);
  for (const [f, g, d] of [[392, 0.5, 2.5], [981, 0.25, 3.5], [1510, 0.12, 5]]) nota(y, 0, 1.38, f, { g, dec: d, corte: 2800 });
  nota(y, 0, 0.3, 65, { forma: 'quad', g: 0.3, dec: 9, corte: 220 });
  gravar('resultado.medalha', y);
}
{ const y = amostras(0.8); [523, 587, 659, 784, 880, 1047].forEach((f, i) => nota(y, i * 0.045, 0.1, f, { g: 0.4, dec: 12 })); nota(y, 0.28, 0.5, 1047, { g: 0.35, dec: 4 }); gravar('resultado.recorde', y); }
{
  const y = amostras(1.5);
  for (const f of [131, 196, 262]) nota(y, 0, 1.45, f, { g: 0.3, dec: 1.2, corte: 1400, ataque: 0.35 });
  nota(y, 0.45, 1.0, 392, { g: 0.3, dec: 2, corte: 2200, ataque: 0.05 });
  nota(y, 0.75, 0.7, 523, { g: 0.25, dec: 2.5, corte: 2400, ataque: 0.03 });
  gravar('resultado.fase', y);
}
// ALERT (a proposal): two low urgent beeps
{ const y = amostras(0.55); [0, 0.28].forEach((t) => nota(y, t, 0.2, 330, { forma: 'quad', g: 0.45, dec: 4, corte: 1100 })); gravar('ui.alerta', y); }
