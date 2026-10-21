// BLOCO G · diagnosis: for each beacon of the F1 horizon, how many pixels of its box the off layer changes, and the
// reddest pixel of the box lit vs off.
//   node scripts/_g/_medir-farois-f1.mjs [layersDir=public/sprites/f1]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [S = 'public/sprites/f1'] = process.argv.slice(2);
const D = JSON.parse(fs.readFileSync(path.join(S, 'dados.json'), 'utf8'));
const p = await sharp(path.join(S, 'pintura.png')).ensureAlpha().raw().toBuffer();
const a = await sharp(path.join(S, 'apagadas.png')).ensureAlpha().raw().toBuffer();
for (const g of D.grupos.filter((q) => q.tipo === 'farol')) {
  const x0 = Math.max(0, Math.floor(g.x - 3)), y0 = Math.max(0, Math.floor(g.y - 3));
  const x1 = Math.min(D.w, Math.ceil(g.x + g.w + 3)), y1 = Math.min(D.h, Math.ceil(g.y + g.h + 3));
  let muda = 0, best = null;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * D.w + x) * 4;
    if (a[i + 3]) muda++;
    const verm = p[i] - (p[i + 1] + p[i + 2]) / 2;
    if (!best || verm > best.verm) best = { x, y, verm, aceso: [p[i], p[i + 1], p[i + 2]], apagado: a[i + 3] ? [a[i], a[i + 1], a[i + 2]] : null };
  }
  console.log(JSON.stringify({ x: g.x, y: g.y, w: g.w, h: g.h, muda, best }));
}
