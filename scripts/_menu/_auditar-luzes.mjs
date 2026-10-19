// BLOCO E · the audit of every light that blinks in the menu: lit vs off, cropped exactly as the rig crops it, ×4.
//   node scripts/_menu/_auditar-luzes.mjs <layersDir> <out.png>
// Every light that blinks in the menu, lit vs off exactly as the rig crops it, ×4.
import sharp from 'sharp';
import fs from 'node:fs';
const [S, OUT] = process.argv.slice(2);
const D = JSON.parse(fs.readFileSync(S + '/dados.json', 'utf8'));
const rnd = (s) => () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const janelas = D.grupos.filter((g) => g.tipo === 'janela' && g.n <= 6), esc = [], rj = rnd(23);
while (esc.length < 24 && janelas.length) esc.push(janelas.splice(Math.floor(rj() * janelas.length), 1)[0]);
const far = D.grupos.filter((g) => g.tipo === 'farol' && g.n <= 4);
const k = 4, M = 6, Z = 4, T = (2 * M + 2) * k * Z;
const tiles = [];
for (const [g, margem] of [...esc.map((g) => [g, 1]), ...far.map((g) => [g, 3])]) {
  const cx = g.x + g.w / 2, cy = g.y + g.h / 2;
  const l = Math.max(0, Math.round((cx - M - 1) * k)), t = Math.max(0, Math.round((cy - M - 1) * k)), w = (2 * M + 2) * k, h = (2 * M + 2) * k;
  const on = await sharp(S + '/cidade.png').extract({ left: Math.min(l, 1536 - w), top: Math.min(t, 864 - h), width: w, height: h }).toBuffer();
  const L = Math.min(l, 1536 - w), Tt = Math.min(t, 864 - h);
  const bx = Math.max(0, Math.floor((g.x - margem) * k)), by = Math.max(0, Math.floor((g.y - margem) * k));
  const bw = Math.min(1536 - bx, Math.ceil((g.w + 2 * margem) * k)), bh = Math.min(864 - by, Math.ceil((g.h + 2 * margem) * k));
  const pedaco = await sharp(S + '/apagadas.png').extract({ left: bx, top: by, width: bw, height: bh }).toBuffer();
  // clip the piece to the tile
  const ox = bx - L, oy = by - Tt;
  const off = await sharp(on).composite([{ input: pedaco, left: ox, top: oy }]).png().toBuffer();
  for (const b of [on, off]) tiles.push(await sharp(b).resize(w * Z, h * Z, { kernel: 'nearest' }).png().toBuffer());
}
const COL = 8, linhas = Math.ceil(tiles.length / COL);
await sharp({ create: { width: COL * (T + 6), height: linhas * (T + 6), channels: 4, background: '#401010' } })
  .composite(tiles.map((b, i) => ({ input: b, left: (i % COL) * (T + 6) + (i % 2 ? 0 : 6), top: Math.floor(i / COL) * (T + 6) }))).png().toFile(OUT);
console.log('janelas', esc.length, 'faróis', far.length, 'tiles', tiles.length);
