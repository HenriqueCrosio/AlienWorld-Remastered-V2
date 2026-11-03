// 02/11 — several frames of a set side by side, each cropped to [x0, y0, w, h], zoomed ×k, with the ruler of `grade.mjs`
// (a line every 8 px, a brighter one and the canvas coordinate every 32) and the frame number on top — to read the
// skulls by eye. Optional marks per frame: `i@x,y` (a yellow cross on frame i).
//   node grades.mjs <out.png> <k> <x0,y0,w,h> <dir> <i,i,i> [i@x,y ...]
import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [OUT, K, CX, DIR, IDX, ...MARCAS] = process.argv.slice(2);
const k = Number(K), [x0, y0, w, h] = CX.split(',').map(Number), lista = IDX.split(',').map(Number), TOPO = 14, G = 6;
const marcas = MARCAS.map((m) => { const [i, p] = m.split('@'); const [x, y] = p.split(',').map(Number); return { i: Number(i), x, y }; });
const comp = [];
for (let c = 0; c < lista.length; c++) {
  const i = lista[c];
  const base = await sharp(path.join(DIR, `${i}.png`)).extract({ left: x0, top: y0, width: w, height: h }).resize(w * k, h * k, { kernel: 'nearest' }).png().toBuffer();
  let svg = `<svg width="${w * k}" height="${h * k + TOPO}" xmlns="http://www.w3.org/2000/svg"><rect width="${w * k}" height="${TOPO}" fill="#1a1d26"/><text x="3" y="11" font-size="11" fill="#ffffff" font-family="monospace">quadro ${i}</text>`;
  for (let x = Math.ceil(x0 / 8) * 8; x < x0 + w; x += 8) {
    const X = (x - x0) * k, forte = x % 32 === 0;
    svg += `<line x1="${X}" y1="${TOPO}" x2="${X}" y2="${h * k + TOPO}" stroke="#ffffff" stroke-opacity="${forte ? 0.5 : 0.15}"/>`;
    if (forte) svg += `<text x="${X + 2}" y="${TOPO + 10}" font-size="10" fill="#ffe08a" font-family="monospace">${x}</text>`;
  }
  for (let y = Math.ceil(y0 / 8) * 8; y < y0 + h; y += 8) {
    const Y = (y - y0) * k + TOPO, forte = y % 32 === 0;
    svg += `<line x1="0" y1="${Y}" x2="${w * k}" y2="${Y}" stroke="#ffffff" stroke-opacity="${forte ? 0.5 : 0.15}"/>`;
    if (forte) svg += `<text x="2" y="${Y - 2}" font-size="10" fill="#ffe08a" font-family="monospace">${y}</text>`;
  }
  for (const m of marcas.filter((m) => m.i === i)) {
    const X = (m.x - x0 + 0.5) * k, Y = (m.y - y0 + 0.5) * k + TOPO;
    svg += `<line x1="${X - 7}" y1="${Y}" x2="${X + 7}" y2="${Y}" stroke="#ffff00" stroke-width="2"/><line x1="${X}" y1="${Y - 7}" x2="${X}" y2="${Y + 7}" stroke="#ffff00" stroke-width="2"/>`;
  }
  svg += '</svg>';
  const fundo = await sharp({ create: { width: w * k, height: h * k + TOPO, channels: 4, background: '#1a1d26' } }).composite([{ input: base, left: 0, top: TOPO }, { input: Buffer.from(svg), left: 0, top: 0 }]).png().toBuffer();
  comp.push({ input: fundo, left: c * (w * k + G), top: 0 });
}
await sharp({ create: { width: lista.length * (w * k + G), height: h * k + TOPO, channels: 4, background: '#05060a' } }).composite(comp).png().toFile(OUT);
