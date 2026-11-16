// BLOCK SOUND (16/11) — the TERMINUS shot as a COMPOSITION of two rotary guns (his idea): the M2 (the heavy slow one,
// the shots you can count) answers the trigger AT ONCE; the A1 (the A-10 buzz) ENTERS LATER — the sound that travelled
// slower than the light — and on release it keeps sounding a moment after the M2 stops (his reference: "o ruído alto do
// final é o som chegando"). In SPACE there is no air to carry it: the M2 muffled, the A1 gone or only felt through the
// hull. Writes the test demos for the sheet.
//   node scripts/_som/_compor-terminus.mjs <pasta-saida>
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { original } from './_original.mjs';

const SR = 44100;
const [saida] = process.argv.slice(2);
mkdirSync(saida, { recursive: true });
const RAW = 'assets/raw/sons/minigun';
const ler = (arquivo) => {
  const raw = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', original(arquivo), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
};
const parte = (id) => ({ arranque: ler(join(RAW, `${id}-arranque.wav`)), laco: ler(join(RAW, `${id}-laco.wav`)), parada: ler(join(RAW, `${id}-parada.wav`)) });
const M2 = parte('M2');
const A1 = parte('A1');

/** One gun held for `seg` s, starting at `t0` s: spin-up, the loop for as long as held (20 ms overlaps), spin-down. */
function segurar(g, t0, seg, total) {
  const y = new Float32Array(Math.floor(SR * total));
  const ov = Math.floor(SR * 0.02);
  const pos = (s) => Math.floor(SR * s);
  const colar = (x, i0, entra, sai) => {
    for (let i = 0; i < x.length && i0 + i < y.length; i++) {
      let k = 1;
      if (entra && i < ov) k *= Math.sin(((i / ov) * Math.PI) / 2);
      if (sai && i >= x.length - ov) k *= Math.cos((((i - (x.length - ov)) / ov) * Math.PI) / 2);
      if (i0 + i >= 0) y[i0 + i] += x[i] * k;
    }
  };
  let i = pos(t0);
  const fim = pos(t0 + seg);
  colar(g.arranque, i, false, true);
  i += g.arranque.length - ov;
  while (i < fim - ov) {
    // the last piece of the loop is cut where the trigger was released
    const resta = Math.min(g.laco.length, fim - i + ov);
    colar(g.laco.subarray(0, resta), i, true, true);
    i += resta - ov;
  }
  colar(g.parada, i, true, false);
  return y;
}

function passaBaixa(x, fc) {
  const a = Math.exp((-2 * Math.PI * fc) / SR);
  for (let passo = 0; passo < 2; passo++) {
    let v = 0;
    for (let i = 0; i < x.length; i++) x[i] = v = (1 - a) * x[i] + a * v;
  }
  return x;
}
const misturar = (partes) => {
  const n = Math.max(...partes.map(([x]) => x.length));
  const y = new Float32Array(n);
  for (const [x, k] of partes) for (let i = 0; i < x.length; i++) y[i] += x[i] * k;
  return y;
};
function wav(nome, x) {
  let pico = 0;
  for (const v of x) pico = Math.max(pico, Math.abs(v));
  const k = pico > 0 ? 0.9 / pico : 1;
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i] * k)) * 32767), 44 + i * 2);
  writeFileSync(join(saida, `${nome}.wav`), b);
}

/** The arrival: how late the A-10 buzz comes in after the trigger, and how long it outlives the release. */
// (16/11, him: *"o A1 pode ser até mais curto do que é"* — the arrival is a SHORT burst, not the whole hold: at most
// `a1MaxS` of buzz, then its spin-down.)
// (16/11, round 2, him: *"em todos, o A1 entra muito cedo, ele precisa aparecer no limiar do término do tiro. mas isso só
// acontece se o player soltar o gatilho, se ele continuar com o dedo colado, continua apenas o efeito do tiro normal"* —
// the A1 is tied to the RELEASE, not to the press: `aposSoltarS` after letting go; while held, only the M2. And *"no
// espaço ele pode ser menos abafado, mas ainda com o abafo"*: 900 → 1800 Hz, the hull 140 → 300 Hz.)
export const CHEGADA = { aposSoltarS: 0.08, a1MaxS: 0.6, nivelA1F1: 0.85, nivelM2F1: 1, m2NoEspacoHz: 1800, a1PeloCascoHz: 300, a1PeloCascoNivel: 0.5 };

/**
 * THE PEAK VERSION (16/11, him: *"pense no A1 como a rajada que chega depois, mas o som dela tem um pico e depois o fade
 * acontece até sumir — na vida real não é assim, mas talvez aqui fique melhor"*): the arrival rises fast to a peak and
 * fades away, instead of a held burst with a spin-down. `pico.subidaS` up, then `pico.someS` down to nothing.
 */
export const PICO = { subidaS: 0.05, someS: 0.85, curva: 1.8 };

function envelopePico(x, t0) {
  const i0 = Math.floor(SR * t0);
  const sobe = Math.floor(SR * PICO.subidaS);
  const some = Math.floor(SR * PICO.someS);
  for (let i = 0; i < x.length; i++) {
    const k = i - i0;
    let g = 0;
    if (k >= 0 && k < sobe) g = k / sobe;
    else if (k >= sobe && k < sobe + some) g = Math.pow(1 - (k - sobe) / some, PICO.curva);
    x[i] *= g;
  }
  return x;
}

const compor = (seg, espaco, pico = false) => {
  const chega = seg + CHEGADA.aposSoltarS;
  const total = chega + 1.3;
  const m2 = segurar(M2, 0, seg, total);
  // the A1 comes ON THE RELEASE (the sound that travelled, arriving as the shooting ends): a short burst of its own, or
  // (the peak version) a peak that fades
  const a1 = pico
    ? envelopePico(segurar(A1, chega, PICO.subidaS + PICO.someS, total), chega)
    : segurar(A1, chega, CHEGADA.a1MaxS, total);
  if (espaco === null) return misturar([[m2, CHEGADA.nivelM2F1], [a1, CHEGADA.nivelA1F1]]);
  passaBaixa(m2, CHEGADA.m2NoEspacoHz);
  if (espaco === 'sem') return m2;
  return misturar([[m2, 1], [passaBaixa(a1, CHEGADA.a1PeloCascoHz), CHEGADA.a1PeloCascoNivel]]);
};

// THE GAME'S PARTS (16/11, his choice: the F1 with the PEAK, the space with the burst through the hull). The M2's own
// spin-up / loop / spin-down are used as they are (assets/raw/sons/minigun/M2-*); here the two ARRIVALS, each starting
// at 0 (the game fires them on the release): the peak (atmosphere) and the hull burst (space, below 300 Hz).
{
  const dur = PICO.subidaS + PICO.someS + 0.05;
  wav('chegada-pico', envelopePico(segurar(A1, 0, PICO.subidaS + PICO.someS, dur), 0));
  wav('chegada-casco', passaBaixa(segurar(A1, 0, CHEGADA.a1MaxS, CHEGADA.a1MaxS + 0.5), CHEGADA.a1PeloCascoHz));
}

for (const [sufixo, pico] of [['', false], ['-pico', true]]) {
  wav(`F1-segurado${sufixo}`, compor(2.2, null, pico));
  wav(`F1-toque${sufixo}`, compor(0.3, null, pico));
  wav(`F2-segurado${sufixo}`, compor(2.2, 'casco', pico));
  wav(`F2-toque${sufixo}`, compor(0.3, 'casco', pico));
}
console.log(`composição da TERMINUS em ${saida}`);
