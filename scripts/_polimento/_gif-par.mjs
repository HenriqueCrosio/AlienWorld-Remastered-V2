// 15/10 — A BEFORE × AFTER GIF from two strips of `_sequencia.mjs` (same stage, same steps): the two panels stacked,
// each brought to 2× the game's resolution (nearest), with a label. One frame per photo, `ms` each.
//   node scripts/_polimento/_gif-par.mjs <before dir> <after dir> <out gif> [ms] ["label before"] ["label after"]
import fs from 'node:fs';
import sharp from 'sharp';

const [A, B, OUT, MS = '67', LA = 'ANTES', LB = 'DEPOIS'] = process.argv.slice(2);
const W = 768, H = 432;
const lista = (d) => fs.readdirSync(d).filter((f) => f.endsWith('.png')).sort();
const fa = lista(A), fb = lista(B);
const n = Math.min(fa.length, fb.length);
const rotulo = (txt) => Buffer.from(
  `<svg width="${W}" height="28"><rect width="100%" height="100%" fill="#0d0f15"/><text x="10" y="20" font-family="Segoe UI, sans-serif" font-size="16" font-weight="700" fill="#d9dde6">${txt}</text></svg>`,
);
const paginas = [];
for (let i = 0; i < n; i++) {
  const a = await sharp(`${A}/${fa[i]}`).resize(W, H, { kernel: 'nearest' }).toBuffer();
  const b = await sharp(`${B}/${fb[i]}`).resize(W, H, { kernel: 'nearest' }).toBuffer();
  paginas.push(await sharp({ create: { width: W, height: 2 * (H + 28), channels: 4, background: '#0d0f15' } })
    .composite([
      { input: rotulo(LA), left: 0, top: 0 },
      { input: a, left: 0, top: 28 },
      { input: rotulo(LB), left: 0, top: H + 28 },
      { input: b, left: 0, top: 2 * 28 + H },
    ])
    .png().toBuffer());
}
await sharp(paginas, { join: { animated: true } }).gif({ delay: Array(n).fill(Number(MS)), loop: 0 }).toFile(OUT);
console.log(OUT, n, 'frames');
