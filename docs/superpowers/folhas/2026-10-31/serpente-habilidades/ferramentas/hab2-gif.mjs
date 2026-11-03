// A clip as a GIF for the sheet: frames over the arena's dark tone, cropped to the union bbox (+6 px), 2x nearest, 12 fps,
// looping with 0.5 s of the approved frame 0 before each play (the idle it leaves from and returns to).
//   node hab2-gif.mjs <clipdir> <out.gif> [fps=12]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [dir, out, fpsA] = process.argv.slice(2); const FPS = Number(fpsA ?? 12);
const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length;
const fr = []; for (let i = 0; i < n; i++) fr.push(await sharp(path.join(dir, `${i}.png`)).ensureAlpha().raw().toBuffer());
let x0 = 256, y0 = 256, x1 = 0, y1 = 0;
for (const d of fr) for (let i = 0; i < 256 * 256; i++) if (d[i * 4 + 3] > 64) { const x = i % 256, y = (i / 256) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
x0 = Math.max(0, x0 - 6); y0 = Math.max(0, y0 - 6); x1 = Math.min(255, x1 + 6); y1 = Math.min(255, y1 + 6);
const w = x1 - x0 + 1, h = y1 - y0 + 1;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gif-'));
const seq = [...Array(Math.round(FPS * 0.5)).fill(0), ...Array.from({ length: n }, (_, i) => i)];
for (const [k, i] of seq.entries()) {
  const img = await sharp(fr[i], { raw: { width: 256, height: 256, channels: 4 } }).extract({ left: x0, top: y0, width: w, height: h }).png().toBuffer();
  // sharp resizes BEFORE it composites, whatever the chain order: flatten first, then scale in a second pass
  const flat = await sharp({ create: { width: w, height: h, channels: 4, background: { r: 20, g: 24, b: 34, alpha: 1 } } }).composite([{ input: img }]).png().toBuffer();
  await sharp(flat).resize(w * 2, h * 2, { kernel: 'nearest' }).png().toFile(path.join(tmp, `${String(k).padStart(4, '0')}.png`));
}
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, '%04d.png'),
  '-vf', 'split[a][b];[a]palettegen=max_colors=255:stats_mode=full[p];[b][p]paletteuse=dither=none', '-loop', '0', out]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(out, `${w * 2}x${h * 2}`, seq.length, 'frames');
