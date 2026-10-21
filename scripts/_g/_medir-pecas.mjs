// BLOCO G · round 6 — the brightness of each candidate piece against the painting (his rule, 20/10: the structures in
// the painting's darkness). Per PNG: the median and 90th percentile of the luminance of its opaque pixels, leaving out
// the energy lights (warm amber and magenta), and the share of the silhouette edge that is a near-black OUTLINE.
//   node scripts/_g/_medir-pecas.mjs <dir> [--json]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const [DIR, ...resto] = process.argv.slice(2);
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const energia = (r, g, b) => (r >= 90 && r > b + 40 && r > g * 1.1) || (r > 120 && b > 90 && g < r * 0.6); // amber | magenta
const fora = [];
for (const n of fs.readdirSync(DIR).filter((f) => f.endsWith('.png')).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))) {
  const { data, info } = await sharp(path.join(DIR, n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, ls = [];
  let borda = 0, contorno = 0;
  const op = (x, y) => x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] > 128;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!op(x, y)) continue;
    const i = (y * W + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    if (!energia(r, g, b)) ls.push(lum(r, g, b));
    if (!op(x - 1, y) || !op(x + 1, y) || !op(x, y - 1) || !op(x, y + 1)) { borda++; if (lum(r, g, b) < 8) contorno++; }
  }
  ls.sort((a, b) => a - b);
  const q = (f) => Math.round(ls[Math.floor(ls.length * f)] ?? 0);
  fora.push({ n, p50: q(0.5), p90: q(0.9), contorno: Math.round((contorno / Math.max(1, borda)) * 100) });
}
if (resto.includes('--json')) console.log(JSON.stringify(fora));
else for (const f of fora) console.log(f.n.padEnd(26), `p50 ${String(f.p50).padStart(3)}  p90 ${String(f.p90).padStart(3)}  contorno ${f.contorno}%`);
