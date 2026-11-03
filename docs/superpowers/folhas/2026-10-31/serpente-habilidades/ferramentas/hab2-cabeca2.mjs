// Cyan-head zoom, rows of mixed clips: each row = the approved frame 0, then <dir>:<i> tiles. Crop x 0..120, y 0..110.
//   node hab2-cabeca2.mjs <out.png> "<dir>:<i>+<dir>:<i>+..." ["..."]
import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [out, ...rows] = process.argv.slice(2);
const X = 0, Y = 0, w = 120, h = 110, Z = 3, gap = 6;
const ref = 'C:/Users/Henrique/AppData/Local/Temp/claude/C--Users-Henrique-Documents-Projetos-folder-AlienWorld-resmater/8ff31437-57ef-4a5b-82a7-281ddc3ef938/scratchpad/bote/A-quadro0-256.png';
const tile = async (f, label) => {
  const crop = await sharp(f).extract({ left: X, top: Y, width: w, height: h }).resize(w * Z, h * Z, { kernel: 'nearest' }).png().toBuffer();
  const svg = `<svg width="${w * Z}" height="${h * Z}" xmlns="http://www.w3.org/2000/svg"><text x="5" y="${h * Z - 8}" font-size="16" fill="#ff0" font-family="monospace">${label}</text></svg>`;
  return sharp({ create: { width: w * Z, height: h * Z, channels: 4, background: '#262b38' } }).composite([{ input: crop }, { input: Buffer.from(svg) }]).png().toBuffer();
};
const comp = []; let maxc = 0;
for (const [r, row] of rows.entries()) {
  const ts = [await tile(ref, 'aprovada')];
  for (const s of row.split('+')) { const [d, i] = s.split(':'); ts.push(await tile(path.join(d, `${i}.png`), `${path.basename(d)} ${i}`)); }
  ts.forEach((t, c) => comp.push({ input: t, left: c * (w * Z + gap), top: r * (h * Z + gap) }));
  maxc = Math.max(maxc, ts.length);
}
await sharp({ create: { width: maxc * (w * Z + gap), height: rows.length * (h * Z + gap), channels: 4, background: '#000' } }).composite(comp).png().toFile(out);
