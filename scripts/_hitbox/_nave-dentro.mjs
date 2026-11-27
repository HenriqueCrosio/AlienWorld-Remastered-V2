// The LARGEST box that fits entirely inside each ship's hull (0 px over empty space), searched over every rectangle of
// the frame — the B of the sheet. Ties → the one reaching furthest forward (the nose: enemies come from the right).
// Usage: node scripts/_hitbox/_nave-dentro.mjs <out-dir>
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUT = process.argv[2] ?? '.';
const Z = 10;
const HOJE = { w: 21, h: 9 };
const NAVES = [
  { chave: 'a-laranja', pre: 'public/sprites/naves/humana-anim', n: 8 },
  { chave: 'jato-laranja', pre: 'public/sprites/ship-jato-anim', n: 9 },
  { chave: 'alien', pre: 'public/sprites/naves/alien-t2-anim', n: 10, nada: true },
];
const ler = async (f) => {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const out = [];
for (const nave of NAVES) {
  const q = [];
  for (let i = 0; i < nave.n; i++) q.push(await ler(`${nave.pre}-${i}.png`));
  const { w, h } = q[0];
  const casco = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    let todos = true, igual = true;
    for (const f of q) {
      if (!f.data[p * 4 + 3]) todos = false;
      for (let c = 0; c < 4; c++) if (f.data[p * 4 + c] !== q[0].data[p * 4 + c]) igual = false;
    }
    casco[p] = todos && (nave.nada || igual) ? 1 : 0;
  }
  // summed table: a rectangle is all hull when its sum equals its area
  const S = new Int32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    S[(y + 1) * (w + 1) + x + 1] = casco[y * w + x] + S[y * (w + 1) + x + 1] + S[(y + 1) * (w + 1) + x] - S[y * (w + 1) + x];
  const soma = (x0, y0, x1, y1) => S[y1 * (w + 1) + x1] - S[y0 * (w + 1) + x1] - S[y1 * (w + 1) + x0] + S[y0 * (w + 1) + x0];
  let melhor = null;
  for (let y0 = 0; y0 < h; y0++) for (let y1 = y0 + 3; y1 <= h; y1++) for (let x0 = 0; x0 < w; x0++) for (let x1 = x0 + 3; x1 <= w; x1++) {
    const a = (x1 - x0) * (y1 - y0);
    if (soma(x0, y0, x1, y1) !== a) continue;
    if (!melhor || a > melhor.a || (a === melhor.a && x1 > melhor.x1)) melhor = { x0, y0, x1, y1, a };
  }
  const caixa = { w: melhor.x1 - melhor.x0, h: melhor.y1 - melhor.y0 };
  out.push({ nave: nave.chave, caixa: `${caixa.w}×${caixa.h}`, area: melhor.a, areaHoje: HOJE.w * HOJE.h,
    centroDesloc: { x: (melhor.x0 + melhor.x1) / 2 - w / 2, y: (melhor.y0 + melhor.y1) / 2 - h / 2 } });

  const hoje = { ox: (w - HOJE.w) / 2, oy: (h - HOJE.h) / 2 };
  const W = w * Z, H = h * Z, img = Buffer.alloc(W * H * 4);
  const borda = (x, y, x0, y0, x1, y1) => ((Math.abs(x - x0 * Z) < 2 || Math.abs(x - x1 * Z) < 2) && y >= y0 * Z && y <= y1 * Z)
    || ((Math.abs(y - y0 * Z) < 2 || Math.abs(y - y1 * Z) < 2) && x >= x0 * Z && x <= x1 * Z);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = Math.floor(x / Z), sy = Math.floor(y / Z), p = sy * w + sx, o = (y * W + x) * 4, d = q[0].data;
    let [R, G, B, A] = [d[p * 4], d[p * 4 + 1], d[p * 4 + 2], d[p * 4 + 3]];
    if (!A) [R, G, B, A] = (sx + sy) % 2 ? [22, 24, 30, 255] : [28, 30, 38, 255];
    if (borda(x, y, hoje.ox, hoje.oy, hoje.ox + HOJE.w, hoje.oy + HOJE.h)) [R, G, B] = [255, 40, 40];
    if (borda(x, y, melhor.x0, melhor.y0, melhor.x1, melhor.y1)) [R, G, B] = [70, 170, 255];
    img[o] = R; img[o + 1] = G; img[o + 2] = B; img[o + 3] = A;
  }
  await sharp(img, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, `dentro-${nave.chave}.png`));
}
fs.writeFileSync(path.join(OUT, 'dentro.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
