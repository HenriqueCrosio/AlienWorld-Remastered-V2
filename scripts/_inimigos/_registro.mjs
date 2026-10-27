// 27/10 — how a sheet's art shifts inside its frame across the animation: per frame, the rigid (dx, dy) that best lays it
// over frame 0 and how many opaque pixels still differ after it (a body that bobs = a clean shift; one that breathes or
// sways = a residue). The marks live in frame pixels: a shift moves them off the edge they took.
//   node scripts/_inimigos/_registro.mjs <sheet.png> <frameW> [frameH]
import sharp from 'sharp';
const [file, fw, fh] = process.argv.slice(2);
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, w = Number(fw), h = Number(fh) || info.height;
const cols = Math.floor(W / w), rows = Math.floor(info.height / h);
const a = (q, x, y) => {
  if (x < 0 || y < 0 || x >= w || y >= h) return false;
  const cx = (q % cols) * w, cy = Math.floor(q / cols) * h;
  return data[((cy + y) * W + cx + x) * 4 + 3] >= 128;
};
let tot = 0;
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a(0, x, y)) tot++;
const out = [];
for (let q = 1; q < cols * rows; q++) {
  let best = null;
  for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
    let d = 0;
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) if (a(0, x, y) !== a(q, x + dx, y + dy)) d++;
    if (!best || d < best.d) best = { dx, dy, d };
  }
  let d0 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a(0, x, y) !== a(q, x, y)) d0++;
  out.push(`q${q}: sem ${d0} → (${best.dx},${best.dy}) ${best.d}`);
}
console.log(file, `${tot} opacos`);
console.log(out.join('\n'));
