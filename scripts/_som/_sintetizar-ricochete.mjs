// BLOCK SOUND (16/11) — THE SHIPS' RICOCHETS, synthesized from what his two references MEASURED (only measured: their
// licence is unknown — "C:/Users/Henrique/Music/ricochetes variados.mp3" and "ricochete laser.mp3"; nothing of them is
// in these files).
//
// The TERMINUS (a rotary gun's rounds): the reference has 5 ricochets back to back (onsets 0.26 / 0.49 / 0.80 / 1.23 /
// 1.56 s). Each one: a bright CRACK (spectral centre ~4.8 kHz, peak ~2.3 kHz) and then a noisy WHIZZ with a resonant
// note that differs from one to the next (820 / 650 / 1000–1200 wobbling / ~same / 820 Hz), the brightness falling from
// ~5 to ~2.5 kHz; 0.23 / 0.31 / 0.43 / 0.33 / 0.78 s. Five variations here, one per measured ricochet, drawn at random
// in the game.
// The X-AELO (a laser): one "pew" falling 2.3 kHz → ~300 Hz, held full to ~0.6 s then gone; 0.89 s in all.
//   node scripts/_som/_sintetizar-ricochete.mjs <pasta>
//   → <pasta>/nave.terminus.ricochete-S1…S5.wav, nave.terminus.ricochete-S.wav (a demo: 8 drawn at random, as the game
//     does), nave.xaelo.ricochete-L1.wav (as measured), nave.xaelo.ricochete-L2.wav (shorter: the shot repeats 4.5/s)
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { original } from './_original.mjs';

const SR = 44100;
const [pasta, ...resto] = process.argv.slice(2);
if (!pasta) throw new Error('uso: node scripts/_som/_sintetizar-ricochete.mjs <pasta> [--cadeia <nome> <arquivo>…]');
mkdirSync(pasta, { recursive: true });
// `--cadeia <nome> <arquivo>…`: only the demo chain of OTHER takes (the PixelLab set): 8 drawn at random, as the game does
const cadeia = resto[0] === '--cadeia' ? { nome: resto[1], arquivos: resto.slice(2) } : null;

function gravar(nome, y) {
  const f = Math.floor(SR * 0.004);
  for (let i = 0; i < f; i++) y[y.length - 1 - i] *= i / f;
  let pico = 0;
  for (const v of y) pico = Math.max(pico, Math.abs(v));
  const k = pico > 0 ? 0.89 / pico : 1;
  const buf = Buffer.from(new Float32Array(y.map((v) => v * k)).buffer);
  const saida = join(pasta, `${nome}.wav`);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', saida], { input: buf });
  console.log(saida);
  return y.map((v) => v * k);
}

let semente = 20261116;
const ruido = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 1073741824) - 1;

/** A 2-pole resonator over noise: the band of the whizz, centred on `f(u)`, its width by `r`. */
function banda(y, i0, n, f, amp, r = 0.992) {
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < n && i0 + i < y.length; i++) {
    const u = i / n;
    const c = 2 * r * Math.cos((2 * Math.PI * f(u)) / SR);
    const s = ruido() * (1 - r) * 6 + c * b1 - r * r * b2;
    b2 = b1;
    b1 = s;
    y[i0 + i] += s * amp(u, i / SR);
  }
}
function tom(y, i0, n, f, amp, harm = [1], tetoHz = 20000) {
  let fase = 0;
  for (let i = 0; i < n && i0 + i < y.length; i++) {
    const u = i / n;
    const fu = f(u);
    fase += (2 * Math.PI * fu) / SR;
    let s = 0;
    harm.forEach((a, k) => { if ((k + 1) * fu <= tetoHz) s += a * Math.sin((k + 1) * fase); });
    y[i0 + i] += s * amp(u, i / SR);
  }
}

/** One ricochet: the crack, then the whizz (a noisy band falling in brightness + the resonant note `nota(u)`). */
function ricochete(dur, nota, { brilho0 = 5000, brilho1 = 2500, curva = 1.4 } = {}) {
  const n = Math.floor(SR * dur);
  const y = new Float32Array(n);
  // the CRACK: 4 ms of bright noise and a short ring at ~2.3 kHz
  for (let i = 0; i < SR * 0.004; i++) y[i] += 0.9 * ruido() * (1 - i / (SR * 0.004));
  tom(y, 0, Math.floor(SR * 0.04), () => 2300, (u, t) => 0.4 * Math.exp(-t * 110), [1, 0.4]);
  // the WHIZZ: the band follows the brightness down; the note rides on it
  const caida = (u) => Math.pow(1 - u, curva) * Math.min(1, u * 60);
  banda(y, Math.floor(SR * 0.006), n, (u) => brilho0 + (brilho1 - brilho0) * u, (u) => 0.5 * caida(u), 0.97);
  tom(y, Math.floor(SR * 0.006), n, nota, (u) => 0.32 * caida(u), [1, 0.18, 0.08]);
  return y;
}

/** 8 of `T` drawn at random (never the same twice in a row), 0.18–0.32 s apart, each at 75–100 %. */
function demo(nome, T) {
  const y = new Float32Array(Math.floor(SR * 3.2));
  let t = 0.02;
  let ultimo = -1;
  for (let k = 0; k < 8; k++) {
    let j;
    do j = Math.floor(((ruido() + 1) / 2) * T.length) % T.length;
    while (j === ultimo && T.length > 1);
    ultimo = j;
    const i0 = Math.floor(t * SR);
    const g = 0.75 + 0.25 * ((ruido() + 1) / 2);
    T[j].forEach((v, i) => { if (i0 + i < y.length) y[i0 + i] += v * g; });
    t += 0.18 + 0.14 * ((ruido() + 1) / 2);
  }
  gravar(nome, y);
}

if (cadeia) {
  const ler = (f) => {
    const raw = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', original(f), '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
    const y = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
    let pico = 0;
    for (const v of y) pico = Math.max(pico, Math.abs(v));
    return y.map((v) => (v * 0.89) / (pico || 1));
  };
  demo(cadeia.nome, cadeia.arquivos.map(ler));
  process.exit(0);
}

// THE TERMINUS: the five measured ricochets
const T = [
  ricochete(0.23, (u) => 820 + 1480 * Math.exp(-u * 9), { curva: 1.2 }),
  ricochete(0.31, (u) => 640 + 180 * u, { brilho0: 4300, brilho1: 2400 }),
  ricochete(0.43, (u) => 1100 + 140 * Math.sin(u * 18) - 300 * Math.exp(-u * 10), { brilho0: 5500, brilho1: 3500 }),
  ricochete(0.33, (u) => 1200 + 120 * Math.sin(u * 14) - 400 * Math.exp(-u * 12), { brilho0: 5600, brilho1: 4200 }),
  ricochete(0.78, (u) => 820 + 1480 * Math.exp(-u * 20), { brilho0: 4900, brilho1: 2400, curva: 1.8 }),
].map((y, i) => gravar(`nave.terminus.ricocheteS${i + 1}-A`, y));

// the demo: 8 drawn at random (the cap of the game is 110 ms; this is a trigger held on a wall)
demo('nave.terminus.ricochete-S', T);

// THE X-AELO: the laser "pew" bouncing off
function laser(dur, cheioAte) {
  const n = Math.floor(SR * dur);
  const y = new Float32Array(n);
  for (let i = 0; i < SR * 0.003; i++) y[i] += 0.5 * ruido() * (1 - i / (SR * 0.003));
  const env = (u) => Math.min(1, u * 80) * (u < cheioAte ? 1 - 0.35 * (u / cheioAte) : 0.65 * Math.pow((1 - u) / (1 - cheioAte), 2));
  // the sweep, as measured: it HOLDS ~2.3 kHz for 0.07 s, drops to ~750 Hz by 0.13 s, then glides down to ~300 Hz
  const seg = (u) => u * dur;
  const f = (u) => {
    const t = seg(u);
    if (t < 0.07) return 2300 - 1000 * t;
    if (t < 0.13) return 2230 - ((t - 0.07) / 0.06) * 1480;
    return 300 + 450 * Math.exp(-(t - 0.13) * 4.2);
  };
  // bright on purpose (the measured centre stays ~2–3.6 kHz): a saw-like stack up to the 9th
  const serra = [1, 0.6, 0.45, 0.35, 0.28, 0.22, 0.17, 0.13, 0.1];
  tom(y, 0, n, f, (u) => 0.3 * env(u), serra, 7000);
  // a slight detuned twin: the laser's shimmer
  tom(y, 0, n, (u) => 1.012 * f(u), (u) => 0.14 * env(u), [1, 0.4, 0.2]);
  return y;
}
gravar('nave.xaelo.ricochete-L1', laser(0.89, 0.62));
gravar('nave.xaelo.ricochete-L2', laser(0.42, 0.5));
