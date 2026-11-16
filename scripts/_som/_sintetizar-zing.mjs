// BLOCK SOUND (15/11) — the electric ZING synthesized by hand (sheet 2, his "refazer" of the shock and the arc: *"precisa
// ser algo gostoso de ouvir, está muito ruidoso e em sequência é uma tortura"*). No noise at all: a tonal sweep down
// (2.6 kHz → 0.5 kHz, exponential) with a soft fifth on top, a 1 ms attack, a quick decay and a light 90 Hz tremolo
// for the "electric" feel. The ARC is three zings 60 ms apart, rising in pitch — the shock jumping enemy to enemy.
//   node scripts/_som/_sintetizar-zing.mjs <saida-choque.wav> <saida-arco.wav>
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [choque, arco] = process.argv.slice(2);
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

/** one zing; `k` multiplies the pitch, `a` the level */
function zing(saida, k = 1, a = 0.6, d = 0.24) {
  const fase = `(${2600 * k}*(1-exp(-9*t))/9+${500 * k}*t)`;
  const expr = `${a}*(1-exp(-400*t))*exp(-14*t)*(1+0.2*sin(2*PI*90*t))*(sin(2*PI*${fase})+0.3*sin(3*PI*${fase}))`;
  ff(['-f', 'lavfi', '-i', `aevalsrc=${expr}:s=44100:d=${d}`, saida]);
}

zing(choque);
const tmp = mkdtempSync(join(tmpdir(), 'zing-'));
try {
  const partes = [[1, 0.6, 0], [1.2, 0.5, 60], [1.45, 0.42, 120]].map(([k, a, atraso], i) => {
    const f = join(tmp, `z${i}.wav`);
    zing(f, k, a);
    return { f, atraso };
  });
  const entradas = partes.flatMap((p) => ['-i', p.f]);
  const filtro = `${partes.map((p, i) => `[${i}]adelay=${p.atraso}[d${i}]`).join(';')};${partes.map((_, i) => `[d${i}]`).join('')}amix=inputs=${partes.length}:normalize=0`;
  ff([...entradas, '-filter_complex', filtro, arco]);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`zing: ${choque}, ${arco}`);
