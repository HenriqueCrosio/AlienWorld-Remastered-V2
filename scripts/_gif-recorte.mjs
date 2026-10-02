// Recorta a mesma região de vários quadros de um GIF, lado a lado (para ver um detalhe ao longo do tempo).
// Uso: node scripts/_gif-recorte.mjs <gif> <out.png> <x,y,w,h> <i,j,k...>
import sharp from 'sharp';
const [GIF, OUT, R, LISTA] = process.argv.slice(2);
const [x, y, w, h] = R.split(',').map(Number);
const ids = LISTA.split(',').map(Number);
const comp = [];
for (const [k, i] of ids.entries()) {
  const q = await sharp(GIF, { page: i }).extract({ left: x, top: y, width: w, height: h }).resize(w * 2, h * 2, { kernel: 'nearest' }).png().toBuffer();
  comp.push({ input: q, left: k * (w * 2 + 4), top: 0 });
}
await sharp({ create: { width: ids.length * (w * 2 + 4), height: h * 2, channels: 4, background: '#ff00ff' } }).composite(comp).png().toFile(OUT);
