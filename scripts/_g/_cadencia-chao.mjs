// BLOCO G · round 5b — the TONE CADENCE of the F1 planes as they show on screen (each plane only where no nearer plane
// covers it): luminance percentiles back to front. A parallax reads when the tone steps monotonically (the far planes
// hazier/lighter, the near ones darker); a light plane between two dark ones breaks it (he, 20/10).
//   node scripts/_g/_cadencia-chao.mjs [dir=public/sprites/f1]
import sharp from 'sharp';
import fs from 'node:fs';
const DIR = process.argv[2] ?? 'public/sprites/f1';
const W = 384, H = 216;
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const D = JSON.parse(fs.readFileSync(`${DIR}/chao.json`, 'utf8'));
const pint = await sharp('public/sprites/f1/pintura.png').raw().ensureAlpha().toBuffer({ resolveWithObject: true });
const planos = [{ nome: 'pintura', img: pint.data, w: pint.info.width, y: 0, h: 216 }];
for (const n of ['vale', 'paisagem', 'frente', 'perto']) {
  const r = await sharp(`${DIR}/chao-${n}.png`).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  planos.push({ nome: n, img: r.data, w: r.info.width, y: D[n].y, h: D[n].h });
}
// who shows at each screen pixel (the nearest opaque plane)
const dono = new Int8Array(W * H).fill(0);
planos.forEach((p, k) => {
  if (k === 0) return;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < W; x++) if (p.img[(y * p.w + (x % p.w)) * 4 + 3] > 0) dono[(p.y + y) * W + x] = k;
});
const stats = planos.map(() => []);
for (let y = 120; y < H; y++) for (let x = 0; x < W; x++) {
  const k = dono[y * W + x], p = planos[k];
  const i = ((y - p.y) * p.w + (x % p.w)) * 4;
  stats[k].push(lum(p.img[i], p.img[i + 1], p.img[i + 2]));
}
for (const [k, s] of stats.entries()) {
  s.sort((a, b) => a - b);
  const q = (f) => Math.round(s[Math.floor(s.length * f)] ?? -1);
  console.log(planos[k].nome.padEnd(9), `px ${String(s.length).padStart(6)}  p10 ${q(0.1)}  p50 ${q(0.5)}  p75 ${q(0.75)}  p90 ${q(0.9)}  p98 ${q(0.98)}`);
}

// The check: back to front, the median and the 90th percentile only ever go DOWN.
const q = (s, f) => s[Math.floor(s.length * f)];
let ok = true;
for (let k = 1; k < stats.length; k++) for (const f of [0.5, 0.9]) {
  if (q(stats[k], f) >= q(stats[k - 1], f)) { ok = false; console.log(`✘ ${planos[k].nome} p${f * 100} ${Math.round(q(stats[k], f))} não é mais escuro que ${planos[k - 1].nome} (${Math.round(q(stats[k - 1], f))})`); }
}
console.log(ok ? '✔ A CADÊNCIA DE TONS DESCE PLANO A PLANO' : '✘ CADÊNCIA QUEBRADA');
process.exit(ok ? 0 : 1);
