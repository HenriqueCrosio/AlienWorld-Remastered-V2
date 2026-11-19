// His red strokes (screenshot 18-19/11) mapped to game px (384x216) via the alignment found by _neblina-alinhar.mjs.
import sharp from 'sharp';
import fs from 'fs';
const [,, shotPath, outDir] = process.argv;
const A = { s: 1.09, ox: 7, oy: 19 }; // screenshot px -> game px: x/(4s)+ox
const { data, info } = await sharp(shotPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const pts = [];
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const i = (y * info.width + x) * 3, r = data[i], g = data[i + 1], b = data[i + 2];
  if (r > 140 && g < 70 && b < 70 && r > 2.6 * g) pts.push([x / (4 * A.s) + A.ox, y / (4 * A.s) + A.oy]);
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outDir + '/tracos-pontos.json', JSON.stringify(pts.map(([x, y]) => [+x.toFixed(2), +y.toFixed(2)])));
// overlay on the painting at k4 for checking
const P = 'public/sprites/menu/k4/';
const full = await sharp(P + 'ceu.png').composite([{ input: P + 'cidade.png' }]).raw().toBuffer();
const buf = Buffer.from(full);
for (const [x, y] of pts) { const X = Math.round(x * 4), Y = Math.round(y * 4); for (let d = -1; d <= 1; d++) for (let e = -1; e <= 1; e++) { const xx = X + d, yy = Y + e; if (xx < 0 || yy < 0 || xx >= 1536 || yy >= 864) continue; const j = (yy * 1536 + xx) * 4; buf[j] = 255; buf[j + 1] = 40; buf[j + 2] = 40; buf[j + 3] = 255; } }
await sharp(buf, { raw: { width: 1536, height: 864, channels: 4 } }).png().toFile(outDir + '/tracos-sobre-pintura.png');
console.log('pontos', pts.length);
