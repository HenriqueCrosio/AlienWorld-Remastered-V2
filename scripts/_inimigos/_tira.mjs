// 27/10 — a strip of chosen frames from a film's frame folder (`_q-*`), in a grid: to look at a film without playing it.
//   node scripts/_inimigos/_tira.mjs <framesDir> <out.png> <i,j,k…> [colunas=3] [escala=0.5] [corte=x,y,w,h]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const [DIR, OUT, IDX, COLS = '3', ESC = '0.5', CORTE] = process.argv.slice(2);
const nomes = fs.readdirSync(DIR).filter((n) => n.endsWith('.png')).sort();
const idx = IDX.split(',').map(Number).filter((i) => i < nomes.length);
const tiles = [];
for (const i of idx) {
  let img = sharp(path.join(DIR, nomes[i]));
  if (CORTE) {
    const [x, y, w, h] = CORTE.split(',').map(Number);
    img = sharp(await img.extract({ left: x, top: y, width: w, height: h }).png().toBuffer());
  }
  const m = await img.metadata();
  const w = Math.round(m.width * Number(ESC)), h = Math.round(m.height * Number(ESC));
  const rot = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="16"><rect width="100%" height="100%" fill="#000"/><text x="3" y="12" font-size="12" fill="#ffb040" font-family="monospace">#${i} (${(i / 30).toFixed(1)} s)</text></svg>`);
  tiles.push({ png: await img.resize(w, h, { kernel: 'nearest' }).png().toBuffer(), rot, w, h });
}
const C = Number(COLS), tw = tiles[0].w, th = tiles[0].h + 16;
const L = Math.ceil(tiles.length / C);
const comp = [];
tiles.forEach((t, k) => {
  const x = (k % C) * (tw + 4), y = Math.floor(k / C) * (th + 4);
  comp.push({ input: t.rot, left: x, top: y }, { input: t.png, left: x, top: y + 16 });
});
await sharp({ create: { width: C * (tw + 4), height: L * (th + 4), channels: 4, background: '#222' } }).composite(comp).png().toFile(OUT);
console.log(OUT);
