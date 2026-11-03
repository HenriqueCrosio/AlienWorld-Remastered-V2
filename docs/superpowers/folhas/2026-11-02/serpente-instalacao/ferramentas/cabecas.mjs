// 02/11 — the heads' region of chosen frames, zoomed: [x0, y0, w, h] of the 256² frame, ×k, side by side, one row per dir.
//   node cabecas.mjs <out.png> <k> <x0,y0,w,h> <dir:i,i,i> [<dir:i,i> ...]
import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [OUT, K, CX, ...LS] = process.argv.slice(2);
const k = Number(K), [x0, y0, w, h] = CX.split(',').map(Number), G = 4;
const comp = []; let cols = 0;
for (let r = 0; r < LS.length; r++) {
  const [d, is] = LS[r].split(':'); const lista = is.split(',').map(Number); cols = Math.max(cols, lista.length);
  for (let c = 0; c < lista.length; c++) {
    const buf = await sharp(path.join(d, `${lista[c]}.png`)).extract({ left: x0, top: y0, width: w, height: h }).resize(w * k, h * k, { kernel: 'nearest' }).png().toBuffer();
    comp.push({ input: buf, left: c * (w * k + G), top: r * (h * k + G) });
  }
}
await sharp({ create: { width: cols * (w * k + G), height: LS.length * (h * k + G), channels: 4, background: '#1a1d26' } }).composite(comp).png().toFile(OUT);
