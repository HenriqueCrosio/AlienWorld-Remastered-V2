// Pads a sprite (trimmed) into a square transparent frame with margin, for animation tools. Prints base64.
import sharp from 'sharp';
import fs from 'fs';
const [IN, OUT, W] = process.argv.slice(2);
const f = await sharp(IN).ensureAlpha().trim({ threshold: 1 }).raw().toBuffer({ resolveWithObject: true });
const n = Number(W);
const png = await sharp({ create: { width: n, height: n, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: f.data, raw: f.info, left: Math.round((n - f.info.width) / 2), top: Math.round((n - f.info.height) / 2) }]).png().toBuffer();
fs.writeFileSync(OUT, png);
console.log(`${OUT} ${f.info.width}x${f.info.height} → ${n}`);
console.log(png.toString('base64'));
