// Where the SAME 21×9 box sits best on each ship (the A of the sheet): every integer offset in the frame, keeping the
// one with the least box over empty space; ties → the one closest to the hull's centre. Draws the box today (red) and
// the fitted one (green). Usage: node scripts/_hitbox/_nave-encaixe.mjs <out-dir>
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OUT = process.argv[2] ?? '.';
const BOX = { w: 21, h: 9 };
const Z = 10;
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
  let cx = 0, cy = 0, n = 0;
  for (let p = 0; p < w * h; p++) {
    let todos = true, igual = true;
    for (const f of q) {
      if (!f.data[p * 4 + 3]) todos = false;
      for (let c = 0; c < 4; c++) if (f.data[p * 4 + c] !== q[0].data[p * 4 + c]) igual = false;
    }
    if (todos && (nave.nada || igual)) { casco[p] = 1; cx += p % w; cy += Math.floor(p / w); n++; }
  }
  cx /= n; cy /= n;
  // a pixel is inside the box when its CENTRE is (the same rule as `_nave.mjs`; the box can sit on half pixels, like the
  // centred 11.5 of today)
  const vazio = (ox, oy) => {
    let v = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
      if (x + 0.5 > ox && x + 0.5 < ox + BOX.w && y + 0.5 > oy && y + 0.5 < oy + BOX.h && !casco[y * w + x]) v++;
    return v;
  };
  let melhor = null;
  for (let oy = 0; oy <= h - BOX.h; oy += 0.5) for (let ox = 0; ox <= w - BOX.w; ox += 0.5) {
    const v = vazio(ox, oy), d = Math.hypot(ox + BOX.w / 2 - cx, oy + BOX.h / 2 - cy);
    if (!melhor || v < melhor.v || (v === melhor.v && d < melhor.d)) melhor = { ox, oy, v, d };
  }
  const hoje = { ox: (w - BOX.w) / 2, oy: (h - BOX.h) / 2 };
  // the offset relative to today's centred box, in world px (what the code would add to the body offset)
  const desloc = { x: melhor.ox - hoje.ox, y: melhor.oy - hoje.oy };
  out.push({ nave: nave.chave, vazioHojePct: Math.round((100 * vazio(hoje.ox, hoje.oy)) / (BOX.w * BOX.h)), vazioEncaixadoPct: Math.round((100 * melhor.v) / (BOX.w * BOX.h)), desloc });

  const W = w * Z, H = h * Z, img = Buffer.alloc(W * H * 4);
  const borda = (x, y, bx, by) => ((Math.abs(x - bx * Z) < 2 || Math.abs(x - (bx + BOX.w) * Z) < 2) && y >= by * Z && y <= (by + BOX.h) * Z)
    || ((Math.abs(y - by * Z) < 2 || Math.abs(y - (by + BOX.h) * Z) < 2) && x >= bx * Z && x <= (bx + BOX.w) * Z);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = Math.floor(x / Z), sy = Math.floor(y / Z), p = sy * w + sx, o = (y * W + x) * 4, d = q[0].data;
    let [R, G, B, A] = [d[p * 4], d[p * 4 + 1], d[p * 4 + 2], d[p * 4 + 3]];
    if (!A) [R, G, B, A] = (sx + sy) % 2 ? [22, 24, 30, 255] : [28, 30, 38, 255];
    if (borda(x, y, hoje.ox, hoje.oy)) [R, G, B] = [255, 40, 40];
    if (borda(x, y, melhor.ox, melhor.oy)) [R, G, B] = [60, 240, 90];
    img[o] = R; img[o + 1] = G; img[o + 2] = B; img[o + 3] = A;
  }
  await sharp(img, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, `encaixe-${nave.chave}.png`));
}
fs.writeFileSync(path.join(OUT, 'encaixe.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
