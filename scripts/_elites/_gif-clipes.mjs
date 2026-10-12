// A GIF of animation CLIPS side by side (one panel each, magnified, labelled) — to compare takes in motion.
//   node scripts/_elites/_gif-clipes.mjs <out.gif> <fps> <zoom> <colunas> <clipDir> [<clipDir> ...]
// Each clipDir holds 0.png … N.png. A shorter clip holds its last frame until the longest one ends; then all restart.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [OUT, FPS, ZOOM, COLS, ...CLIPES] = process.argv.slice(2);
const Z = Number(ZOOM), C = Number(COLS);
const LH = 20, FUNDO = '#232a40';

const clipes = [];
for (const dir of CLIPES) {
  const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length;
  const quadros = [];
  for (let i = 0; i < n; i++) {
    const m = await sharp(path.join(dir, `${i}.png`)).metadata();
    quadros.push(await sharp(path.join(dir, `${i}.png`)).resize(m.width * Z, m.height * Z, { kernel: 'nearest' }).png().toBuffer());
  }
  const m = await sharp(quadros[0]).metadata();
  clipes.push({ nome: path.basename(dir), quadros, w: m.width, h: m.height });
}
const cw = Math.max(...clipes.map((c) => c.w)), ch = Math.max(...clipes.map((c) => c.h)) + LH;
const W = C * cw, H = Math.ceil(clipes.length / C) * ch;
const total = Math.max(...clipes.map((c) => c.quadros.length)) + 4;
const rotulos = clipes.map((c, k) => ({
  input: Buffer.from(`<svg width="${cw}" height="${LH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="15" font-family="Consolas" font-size="14" fill="#ffb040">${c.nome}</text></svg>`),
  left: (k % C) * cw,
  top: Math.floor(k / C) * ch,
}));
const paginas = [];
for (let i = 0; i < total; i++) {
  const comp = clipes.map((c, k) => ({ input: c.quadros[Math.min(i, c.quadros.length - 1)], left: (k % C) * cw, top: Math.floor(k / C) * ch + LH }));
  paginas.push(await sharp({ create: { width: W, height: H, channels: 4, background: FUNDO } }).composite([...comp, ...rotulos]).png().toBuffer());
}
await sharp(paginas, { join: { animated: true } }).gif({ delay: Array(total).fill(Math.round(1000 / Number(FPS))), loop: 0 }).toFile(OUT);
console.log(OUT, total, 'quadros');
