// Folha de contato de alguns quadros de um GIF (para conferir antes de mandar). Uso: node scripts/_gif-quadros.mjs <gif> <out.png> <i,j,k...>
import sharp from 'sharp';
const [GIF, OUT, LISTA] = process.argv.slice(2);
const ids = LISTA.split(',').map(Number);
const m = await sharp(GIF).metadata();
const h = m.pageHeight ?? m.height;
const comp = [];
for (const [k, i] of ids.entries()) {
  comp.push({ input: await sharp(GIF, { page: i }).png().toBuffer(), left: 0, top: k * (h + 6) });
}
await sharp({ create: { width: m.width, height: ids.length * (h + 6), channels: 4, background: '#ff00ff' } }).composite(comp).png().toFile(OUT);
console.log(m.pages, 'páginas', m.width, 'x', h);
