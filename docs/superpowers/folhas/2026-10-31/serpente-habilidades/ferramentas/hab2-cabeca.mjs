// Cyan-head zoom: one row per clip -> approved frame 0, then chosen frames. Crop x 10..120, y 5..100 on the 256 canvas.
//   node hab2-cabeca.mjs <out.png> <clipdir>:<i,j,k> ...
import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [out, ...specs] = process.argv.slice(2);
const X = 10, Y = 5, w = 110, h = 95, Z = 3, gap = 6;
const ref = 'C:/Users/Henrique/AppData/Local/Temp/claude/C--Users-Henrique-Documents-Projetos-folder-AlienWorld-resmater/8ff31437-57ef-4a5b-82a7-281ddc3ef938/scratchpad/bote/A-quadro0-256.png';
const tile = async (f, label) => {
  const crop = await sharp(f).extract({ left: X, top: Y, width: w, height: h }).resize(w * Z, h * Z, { kernel: 'nearest' }).png().toBuffer();
  const svg = `<svg width="${w * Z}" height="${h * Z}" xmlns="http://www.w3.org/2000/svg"><text x="4" y="${h * Z - 6}" font-size="14" fill="#ff0" font-family="monospace">${label}</text></svg>`;
  return sharp({ create: { width: w * Z, height: h * Z, channels: 4, background: '#262b38' } }).composite([{ input: crop }, { input: Buffer.from(svg) }]).png().toBuffer();
};
const comp = []; let maxc = 0;
for (const [r, s] of specs.entries()) {
  const [dir, list] = s.split(':'); const idx = list.split(',').map(Number);
  const row = [await tile(ref, 'APROVADA')];
  for (const i of idx) row.push(await tile(path.join(dir, `${i}.png`), `${path.basename(dir)} ${i}`));
  row.forEach((t, c) => comp.push({ input: t, left: c * (w * Z + gap), top: r * (h * Z + gap) }));
  maxc = Math.max(maxc, row.length);
}
await sharp({ create: { width: maxc * (w * Z + gap), height: specs.length * (h * Z + gap), channels: 4, background: '#000' } }).composite(comp).png().toFile(out);
