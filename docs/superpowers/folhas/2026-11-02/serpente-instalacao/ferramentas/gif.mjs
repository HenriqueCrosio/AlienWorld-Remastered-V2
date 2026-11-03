// 02/11 — a GIF of a frame sequence, nearest-neighbour ×k, on the fight's dark background (ffmpeg's own palette).
// The sequence is a list of `dir:a-b` pieces (b < a plays backwards) and `dir:i*n` holds (frame i, n times).
//   node gif.mjs <out.gif> <fps> <k> <piece> [<piece> ...]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const [OUT, FPS, K, ...PECAS] = process.argv.slice(2);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gif-'));
let n = 0;
const add = (f) => fs.copyFileSync(f, path.join(tmp, `${String(n++).padStart(4, '0')}.png`));
for (const p of PECAS) {
  const [d, r] = p.split(':');
  if (r.includes('*')) { const [i, v] = r.split('*').map(Number); for (let j = 0; j < v; j++) add(path.join(d, `${i}.png`)); continue; }
  const [a, b] = r.split('-').map(Number), s = b >= a ? 1 : -1;
  for (let i = a; s > 0 ? i <= b : i >= b; i += s) add(path.join(d, `${i}.png`));
}
const k = Number(K);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', FPS, '-i', path.join(tmp, '%04d.png'),
  '-filter_complex', `[0]scale=iw*${k}:ih*${k}:flags=neighbor[a];color=c=0x1a1d26:s=${256 * k}x${256 * k}:r=${FPS}[bg];[bg][a]overlay=shortest=1[c];[c]split[c1][c2];[c1]palettegen=reserve_transparent=0[p];[c2][p]paletteuse=dither=none`,
  OUT]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(OUT, n, 'quadros');
