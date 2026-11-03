// Palette lock + grey-fill cleanup for a generated clip.
//   node hab2-trava.mjs <in-dir> <out-dir> [T=0.09] [--stats]
// 1) GREY FILL: the generator paints flat light-grey blobs into see-through holes (the coil's hole, behind necks).
//    Connected regions (8-neighbour) of low-saturation mid-light pixels (chroma < 0.03, L 0.50..0.80 in OKLab) of
//    >= 12 px become transparent, plus their 1-px rim of near-grey anti-alias.
// 2) LOCK: every remaining opaque pixel whose nearest approved colour (serpente.png, 52 colours) is within T in OKLab
//    snaps to it. Farther pixels (the generator's effects: streaks, sprays, tongues) are kept as drawn.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [inDir, outDir, Targ, flag] = process.argv.slice(2);
const T = Number(Targ ?? 0.09);
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const oklab = (r, g, b) => {
  r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const ap = await sharp('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/public/sprites/serpente.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const pal = new Map();
for (let i = 0; i < ap.info.width * ap.info.height; i++) if (ap.data[i * 4 + 3] >= 128) pal.set((ap.data[i * 4] << 16) | (ap.data[i * 4 + 1] << 8) | ap.data[i * 4 + 2], 1);
const P = [...pal.keys()].map((k) => { const r = k >> 16, g = (k >> 8) & 255, b = k & 255; return { r, g, b, lab: oklab(r, g, b) }; });
const cache = new Map();
const near = (r, g, b) => {
  const k = (r << 16) | (g << 8) | b; let v = cache.get(k); if (v) return v;
  const L = oklab(r, g, b); let best = null, bd = 1e9;
  for (const p of P) { const d = Math.hypot(L[0] - p.lab[0], L[1] - p.lab[1], L[2] - p.lab[2]); if (d < bd) { bd = d; best = p; } }
  v = { p: best, d: bd }; cache.set(k, v); return v;
};
fs.mkdirSync(outDir, { recursive: true });
const n = fs.readdirSync(inDir).filter((f) => /^\d+\.png$/.test(f)).length;
const hist = new Array(20).fill(0); let tot = 0;
for (let f = 0; f < n; f++) {
  const { data, info } = await sharp(path.join(inDir, `${f}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const greyish = (i, lo, hi, cmax) => {
    if (data[i * 4 + 3] < 64) return false;
    const [L, a, b] = oklab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    return Math.hypot(a, b) < cmax && L >= lo && L <= hi;
  };
  // 1) grey fill regions
  const seen = new Uint8Array(W * H); let apagados = 0;
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || !greyish(i, 0.5, 0.8, 0.03)) continue;
    const reg = [i]; seen[i] = 1;
    for (let q = 0; q < reg.length; q++) {
      const x = reg[q] % W, y = (reg[q] / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx; if (seen[j] || !greyish(j, 0.5, 0.8, 0.03)) continue; seen[j] = 1; reg.push(j);
      }
    }
    if (reg.length < 12) continue;
    const borda = new Set();
    for (const j of reg) {
      data[j * 4 + 3] = 0; apagados++;
      const x = j % W, y = (j / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) borda.add(yy * W + xx); }
    }
    for (const j of borda) if (greyish(j, 0.38, 0.85, 0.045)) { data[j * 4 + 3] = 0; apagados++; }
  }
  // 2) lock
  let travados = 0, livres = 0;
  for (let i = 0; i < W * H; i++) {
    if (data[i * 4 + 3] < 64) { data[i * 4 + 3] = 0; continue; }
    data[i * 4 + 3] = 255;
    const { p, d } = near(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    hist[Math.min(19, Math.floor(d / 0.01))]++; tot++;
    if (d <= T) { data[i * 4] = p.r; data[i * 4 + 1] = p.g; data[i * 4 + 2] = p.b; travados++; } else livres++;
  }
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(outDir, `${f}.png`));
  if (!flag) console.log(path.basename(inDir), f, 'grey cleared', apagados, 'locked', travados, 'kept (effects)', livres);
}
if (flag === '--stats') console.log(path.basename(inDir), 'nearest-distance histogram (0.01 bins, % of px):', hist.map((h) => ((h / tot) * 100).toFixed(1)).join(' '));
