// BLOCK SOUND (16/11) — sheet 5 (the bosses): the warnings whose TIMING is the point, synthesized as the third version.
// Each matches the game's own number:
//   chefe.torre.missilCarga    the F1 tower's 0.65 s missile charge (`Boss.MISSILE_TELEGRAPH`, the blink at 24 Hz): a
//                              throbbing hum climbing 90 → 260 Hz, pulsing at the blink's rate, crackles on top
//   chefe.capitania.flakPavio  the flak shell's last 0.35 s (`tickFlak`, the blink at 30 Hz): fast ticks climbing
//   node scripts/_som/_sintetizar-folha5.mjs <pasta>      → <pasta>/<nome>-C.wav
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SR = 44100;
const [pasta] = process.argv.slice(2);
if (!pasta) throw new Error('uso: node scripts/_som/_sintetizar-folha5.mjs <pasta>');
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
let semente = 515151;
const ruido = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 1073741824) - 1;

// chefe.torre.missilCarga — 0.65 s: the hum climbs 90 → 260 Hz, throbbing at 12 Hz (the 24 Hz blink's on/off), with
// sparse crackles (short dark noise bursts) as the charge builds
{
  const y = amostras(0.65);
  tom(y, 0, 0.65, (u) => 90 + 170 * u, (u, t) => 0.5 * Math.min(1, u * 6) * (0.55 + 0.45 * Math.sin(2 * Math.PI * 12 * t)), [1, 0.6, 0.35, 0.2]);
  for (let k = 0; k < 9; k++) {
    const t0 = 0.08 + k * 0.06 + ((ruido() + 1) / 2) * 0.02;
    let lp = 0;
    const i0 = Math.floor(t0 * SR);
    for (let i = 0; i < SR * 0.01; i++) {
      lp += 0.3 * (ruido() - lp);
      if (i0 + i < y.length) y[i0 + i] += 0.25 * (0.4 + k / 12) * lp * Math.exp(-i / (SR * 0.002));
    }
  }
  gravar('chefe.torre.missilCarga', y);
}

// chefe.capitania.flakPavio — 0.35 s: ticks speeding up (0.07 → 0.025 s) and climbing 900 → 1400 Hz, the last on the burst
{
  const y = amostras(0.36);
  let t = 0;
  while (t < 0.34) {
    const u = t / 0.35;
    tom(y, t, 0.018, () => 900 + 500 * u, (v) => 0.4 * Math.min(1, v * 6) * (1 - v), [1, 0.2]);
    t += 0.07 - 0.045 * u;
  }
  gravar('chefe.capitania.flakPavio', y);
}

// ── 5b, the Serpente and the eel: the long warnings, as long as the game's (`numerosSerpente`, `numerosHab`,
// `enguia/numeros`). Low and swelling: they are read, not heard as alarms. ──
/** a low swell from f0 to f1 over `dur`, with a slow wobble and a band of dark noise growing on top */
function inchar(dur, f0, f1, wob, ruidoMax, harm = [1, 0.5, 0.3, 0.15]) {
  const y = amostras(dur);
  tom(y, 0, dur, (u, t) => f0 + (f1 - f0) * u + 3 * Math.sin(2 * Math.PI * wob * t), (u) => 0.45 * Math.min(1, u * 3) * (u > 0.94 ? (1 - u) / 0.06 : 1), harm);
  let lp = 0;
  for (let i = 0; i < y.length; i++) {
    const u = i / y.length;
    lp += 0.12 * (ruido() - lp);
    y[i] += ruidoMax * u * u * lp * (u > 0.94 ? (1 - u) / 0.06 : 1);
  }
  return y;
}
gravar('serpente.chegada.tremor', inchar(1.2, 38, 55, 9, 0.9, [1, 0.6, 0.4, 0.2])); // 1.2 s (`LUTA.tremor`)
gravar('serpente.raio.carga', inchar(0.75, 140, 420, 14, 0.4)); // the jaws open → the shot: 0.75 s
gravar('serpente.gas.carga', inchar(2.5, 90, 240, 6, 0.7)); // the orange's charge: 2.5 s (`HAB.gas.carga`)
gravar('enguia.canos.carga', inchar(1.8, 70, 160, 4, 0.8)); // the pipes' first warning: 1.8 s (`canos.aviso[0]`)
gravar('enguia.eco.leitura', inchar(2.0, 180, 260, 2.5, 0.15, [1, 0.25, 0.1])); // the Echo's reading: 2 s

// chefe.capitania.flakPavio H (ROUND 3, his direction: *"o som precisa ser de um click/estalo"*) — 0.35 s: three dry
// mechanical CLICKS speeding up (0, 0.17, 0.28 s), each a 2 ms snap of bright noise over a tiny 3.2 kHz ring and a
// low knock; no tone, no beep
{
  const y = amostras(0.36);
  for (const [t0, g] of [[0, 0.7], [0.17, 0.85], [0.28, 1]]) {
    const i0 = Math.floor(t0 * SR);
    for (let i = 0; i < SR * 0.002; i++) y[i0 + i] += g * ruido() * (1 - i / (SR * 0.002));
    tom(y, t0, 0.02, () => 3200, (u, t) => 0.25 * g * Math.exp(-t * 300), [1]);
    tom(y, t0, 0.03, () => 420, (u, t) => 0.4 * g * Math.exp(-t * 160), [1]);
  }
  gravar('chefe.capitania.flakPavio', y, 'H');
}
