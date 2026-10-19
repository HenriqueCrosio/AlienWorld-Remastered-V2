// BLOCO D · passo 2 — the SAME pipeline that made today's `f8-leviata` (`scripts/_f8/_recortar-leviata.mjs`), for a
// new 384×216 frame on black space, so a candidate reaches the scene exactly the way the old one did:
//   1. the body = the largest region that is not space (space = dark pixels flooded from the borders);
//   2. the lava = the hot pixels, in a layer of their own; the body goes COLD under them (the crust colour);
//   3. the cloud dissolves in ordered dither between x=244 and 319 of the FRAME (today's 225–300 of the cut + 19).
// Writes <outDir>/<name>-corpo.png, -lava.png, -caixa.json, and -cena.png (cold body + lava at 0.85, the look at the
// start of chapter 4) for the previews.
//   node scripts/_leviata/_recortar-novo.mjs <frame.png> <outDir>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [SRC, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const nome = path.basename(SRC, '.png');
const { data, info } = await sharp(SRC).resize(384, 216, { kernel: 'nearest' }).ensureAlpha().raw()
  .toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const lum = (p) => 0.3 * data[p * 4] + 0.59 * data[p * 4 + 1] + 0.11 * data[p * 4 + 2];

// A generated frame's space is not always today's (6,7,12): the cut follows its own corners, never above 14 (the
// darkest hull of the old art is lum 16).
const cantos = [0, W - 1, (H - 1) * W, H * W - 1].map(lum).sort((a, b) => a - b);
const CORTE = Math.min(14, Math.max(11, cantos[1] + 4));

const espaco = new Uint8Array(W * H);
const fila = [];
for (let x = 0; x < W; x++) fila.push(x, (H - 1) * W + x);
for (let y = 0; y < H; y++) fila.push(y * W, y * W + W - 1);
fila.forEach((p) => (espaco[p] = 1));
for (let k = 0; k < fila.length; k++) {
  const p = fila[k], x = p % W, y = (p / W) | 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const xx = x + dx, yy = y + dy, q = yy * W + xx;
    if (xx < 0 || yy < 0 || xx >= W || yy >= H || espaco[q]) continue;
    if (lum(q) < CORTE || data[q * 4 + 3] < 110) { espaco[q] = 1; fila.push(q); }
  }
}
const rot = new Int32Array(W * H).fill(-1);
let maior = -1, tam = 0, n = 0;
for (let p0 = 0; p0 < W * H; p0++) {
  if (espaco[p0] || rot[p0] !== -1) continue;
  const f = [p0]; rot[p0] = n;
  for (let k = 0; k < f.length; k++) {
    const p = f[k], x = p % W, y = (p / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy, q = yy * W + xx;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || espaco[q] || rot[q] !== -1) continue;
      rot[q] = n; f.push(q);
    }
  }
  if (f.length > tam) { tam = f.length; maior = n; }
  n++;
}
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let p = 0; p < W * H; p++) if (rot[p] === maior) {
  const x = p % W, y = (p / W) | 0;
  x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
}
const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
const corpo = Buffer.alloc(cw * ch * 4), lava = Buffer.alloc(cw * ch * 4);
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
  const fx = x + x0, fy = y + y0, p = fy * W + fx, i = p * 4, o = (y * cw + x) * 4;
  if (rot[p] !== maior) continue;
  const k = Math.min(1, Math.max(0, (fx - 244) / 75));
  // The cloud dissolves, with the old cut's dither phase (its box sat at 19, 41).
  if (k * 16 > BAYER[(fy - 41 + 400) % 4][(fx - 19 + 400) % 4]) continue;
  const quente = data[i] > 150 && data[i] > data[i + 2] * 2 && data[i + 1] > 40;
  if (quente) {
    data.copy(lava, o, i, i + 3); lava[o + 3] = 255;
    corpo[o] = 26; corpo[o + 1] = 22; corpo[o + 2] = 29; corpo[o + 3] = 255;
  } else { data.copy(corpo, o, i, i + 3); corpo[o + 3] = 255; }
}
const raw = { raw: { width: cw, height: ch, channels: 4 } };
await sharp(corpo, raw).png().toFile(path.join(outDir, `${nome}-corpo.png`));
await sharp(lava, raw).png().toFile(path.join(outDir, `${nome}-lava.png`));
const cena = Buffer.from(corpo);
for (let o = 0; o < cena.length; o += 4) if (lava[o + 3]) for (let c = 0; c < 3; c++) cena[o + c] = Math.round(corpo[o + c] * 0.15 + lava[o + c] * 0.85);
await sharp(cena, raw).png().toFile(path.join(outDir, `${nome}-cena.png`));
fs.writeFileSync(path.join(outDir, `${nome}-caixa.json`), JSON.stringify({ left: x0, top: y0, width: cw, height: ch }));
console.log(`${nome}: ${cw}×${ch} em (${x0},${y0}), corte lum<${CORTE}, ${n} regiões`);
