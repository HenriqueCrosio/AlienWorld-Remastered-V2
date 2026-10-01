// Shrinks an approved pixel-art piece by an exact factor with nearest sampling, then snaps alpha to 0/255 (no soft
// edges). For amorphous art (explosions) where a hand redraw is not worth it. Usage: node scripts/_reduzir.mjs <in> <out> <fator>
import sharp from 'sharp';
const [IN, OUT, F] = process.argv.slice(2);
const t = await sharp(IN).ensureAlpha().trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
const w = Math.max(1, Math.round(t.info.width * Number(F))), h = Math.max(1, Math.round(t.info.height * Number(F)));
const { data, info } = await sharp(t.data).resize(w, h, { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
for (let i = 3; i < data.length; i += 4) data[i] = data[i] > 110 ? 255 : 0;
await sharp(data, { raw: info }).png().toFile(OUT);
console.log(OUT, `${t.info.width}x${t.info.height} → ${w}x${h}`);
