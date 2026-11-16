// BLOCK SOUND (15/11) — the physical electric SNAP synthesized by hand (the shock and the arc, round 3: his choice
// "estalo elétrico físico" — a real spark, very short, without the hum or the continuous hiss). A spark is a burst, not
// a tone: ~8 ms of noise with a very fast decay, band-limited to the crack (1.2–7 kHz), and a whisper of body under it.
// The ARC is three snaps 70 ms apart, each a little weaker — the spark hopping.
//   node scripts/_som/_sintetizar-estalo.mjs <saida-choque.wav> <saida-arco.wav>
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [choque, arco] = process.argv.slice(2);
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);

/** one snap at level `a`, seed `s` (each snap a different burst) */
function estalo(saida, a = 0.9, s = 1) {
  // (a 1st try decayed at 700/s: after the trim and the fade-in it was 20 ms long and weak — 350/s keeps ~40 ms of crack)
  const expr = `${a}*exp(-350*t)*(2*random(${s})-1)+${a * 0.25}*exp(-90*t)*sin(2*PI*240*t)`;
  ff(['-f', 'lavfi', '-i', `aevalsrc=${expr}:s=44100:d=0.12`, '-af', 'highpass=f=1200,lowpass=f=7000,afade=t=out:st=0.09:d=0.03', saida]);
}

estalo(choque);
const tmp = mkdtempSync(join(tmpdir(), 'estalo-'));
try {
  const partes = [[0.9, 0, 1], [0.75, 70, 2], [0.6, 140, 3]].map(([a, atraso, s], i) => {
    const f = join(tmp, `e${i}.wav`);
    estalo(f, a, s);
    return { f, atraso };
  });
  const entradas = partes.flatMap((p) => ['-i', p.f]);
  const filtro = `${partes.map((p, i) => `[${i}]adelay=${p.atraso}[d${i}]`).join(';')};${partes.map((_, i) => `[d${i}]`).join('')}amix=inputs=${partes.length}:normalize=0`;
  ff([...entradas, '-filter_complex', filtro, arco]);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`estalo: ${choque}, ${arco}`);
