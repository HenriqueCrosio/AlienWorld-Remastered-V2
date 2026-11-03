// 02/11 — a frame of a 256² set, zoomed ×k with a ruler every 8 px (a brighter line every 32, the canvas coordinate
// written at each), cropped to [x0, y0, w, h] — to read points (the mouths, the skull) by eye, in canvas px.
// Optional marks: `x,y,#rrggbb` crosses drawn on top (to check a measured point).
//   node grade.mjs <frame.png> <out.png> <k> <x0,y0,w,h> [x,y,#cor ...]
import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [IN, OUT, K, CX, ...MARCAS] = process.argv.slice(2);
const k = Number(K), [x0, y0, w, h] = CX.split(',').map(Number);
const base = await sharp(IN).extract({ left: x0, top: y0, width: w, height: h }).resize(w * k, h * k, { kernel: 'nearest' }).png().toBuffer();
let svg = `<svg width="${w * k}" height="${h * k}" xmlns="http://www.w3.org/2000/svg">`;
for (let x = Math.ceil(x0 / 8) * 8; x < x0 + w; x += 8) {
  const X = (x - x0) * k, forte = x % 32 === 0;
  svg += `<line x1="${X}" y1="0" x2="${X}" y2="${h * k}" stroke="${forte ? '#ffffff' : '#ffffff'}" stroke-opacity="${forte ? 0.45 : 0.15}" stroke-width="1"/>`;
  if (forte) svg += `<text x="${X + 2}" y="10" font-size="10" fill="#ffe08a" font-family="monospace">${x}</text>`;
}
for (let y = Math.ceil(y0 / 8) * 8; y < y0 + h; y += 8) {
  const Y = (y - y0) * k, forte = y % 32 === 0;
  svg += `<line x1="0" y1="${Y}" x2="${w * k}" y2="${Y}" stroke="#ffffff" stroke-opacity="${forte ? 0.45 : 0.15}" stroke-width="1"/>`;
  if (forte) svg += `<text x="2" y="${Y - 2}" font-size="10" fill="#ffe08a" font-family="monospace">${y}</text>`;
}
for (const m of MARCAS) {
  const [mx, my, cor] = m.split(',');
  const X = (Number(mx) - x0 + 0.5) * k, Y = (Number(my) - y0 + 0.5) * k;
  svg += `<line x1="${X - 8}" y1="${Y}" x2="${X + 8}" y2="${Y}" stroke="${cor}" stroke-width="2"/><line x1="${X}" y1="${Y - 8}" x2="${X}" y2="${Y + 8}" stroke="${cor}" stroke-width="2"/>`;
}
svg += '</svg>';
await sharp(base).composite([{ input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(OUT);
