// 17/10 — INSTALLS THE F4 FOREGROUND (polish block C, approved by him: "eu gostei das criações. Podemos usar as
// variações todas"). Packs every piece of the four border families — cut by `_cortar-frente-f4.mjs` from the
// approved strips, at full size and reduced by 2 — into ONE atlas (`public/sprites/f4-frente.png` + `.json`, Phaser
// JSON hash). Pieces differ in size, so a fixed-cell spritesheet would not fit them; a shelf packer does.
// Frame names: `<family>-<nn>` and `<family>-<nn>-meia` (the half-size one), and `<family>-<nn>-terco` (a third: only the drift layer, 17/10 — what goes
// to the back layers must SHRINK to read as distant, his rule). The game reads the family from the name
// and the height from the frame (see `PrimeiroPlanoF4`).
// 17/10, item 8: the same packer builds the F4 `destroco` skin (`f4-engolido`, the swallowed hull) and the back drift
// layer (`f4-deriva`, bones and clots) — hence the optional out name and family list.
//   node scripts/_polimento/_instalar-frente-f4.mjs [pieces root = docs/superpowers/folhas/2026-10-17/f4-frente/pecas-v2]
//     [out = public/sprites/f4-frente] [families = tendoes,ossos,polipos,membrana]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAIZ = process.argv[2] ?? 'docs/superpowers/folhas/2026-10-17/f4-frente/pecas-v2';
const OUT = process.argv[3] ?? 'public/sprites/f4-frente';
const FAMILIAS = (process.argv[4] ?? 'tendoes,ossos,polipos,membrana').split(',');
const LARGURA = 512, PAD = 1;

const pecas = [];
for (const f of FAMILIAS) {
  for (const arq of fs.readdirSync(path.join(RAIZ, f)).filter((a) => /^p-\d+(-meia|-terco)?\.png$/.test(a)).sort()) {
    const buf = fs.readFileSync(path.join(RAIZ, f, arq));
    const m = await sharp(buf).metadata();
    pecas.push({ nome: `${f}-${arq.slice(2, -4)}`, buf, w: m.width, h: m.height });
  }
}
// Shelf packing, tallest first: rows as high as their first piece.
pecas.sort((a, b) => b.h - a.h || b.w - a.w);
let x = 0, y = 0, linha = 0;
for (const p of pecas) {
  if (x + p.w > LARGURA) { x = 0; y += linha + PAD; linha = 0; }
  p.x = x; p.y = y;
  x += p.w + PAD;
  linha = Math.max(linha, p.h);
}
const ALTURA = y + linha;
await sharp({ create: { width: LARGURA, height: ALTURA, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(pecas.map((p) => ({ input: p.buf, left: p.x, top: p.y })))
  .png({ compressionLevel: 9 })
  .toFile(`${OUT}.png`);
const frames = {};
for (const p of pecas.sort((a, b) => a.nome.localeCompare(b.nome))) {
  frames[p.nome] = {
    frame: { x: p.x, y: p.y, w: p.w, h: p.h },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: p.w, h: p.h },
    sourceSize: { w: p.w, h: p.h },
  };
}
fs.writeFileSync(`${OUT}.json`, JSON.stringify({ frames, meta: { image: path.basename(OUT) + '.png', size: { w: LARGURA, h: ALTURA }, scale: '1' } }, null, 1));
const por = FAMILIAS.map((f) => `${f} ${pecas.filter((p) => p.nome.startsWith(f + '-')).length}`).join(', ');
console.log(`${OUT}.png ${LARGURA}×${ALTURA}: ${pecas.length} pieces (${por})`);
