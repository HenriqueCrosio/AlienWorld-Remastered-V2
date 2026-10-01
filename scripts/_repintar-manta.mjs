// Recolours warm (fire/plasma) pixel art into the alien manta energy palette, keeping each pixel's brightness.
// Usage: node scripts/_repintar-manta.mjs <in.png> <out.png>
import sharp from 'sharp';
const [IN, OUT] = process.argv.slice(2);
const RAMPA = [0x06222a, 0x0e4a55, 0x0e6b7a, 0x17a6bd, 0x3ee0f0, 0x8ff2fa, 0xe8feff];
const { data, info } = await sharp(IN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.from(data);
for (let i = 0; i < data.length; i += 4) {
  if (!data[i + 3]) continue;
  const l = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
  const c = RAMPA[Math.min(RAMPA.length - 1, Math.floor(l * RAMPA.length))];
  out[i] = (c >> 16) & 255; out[i + 1] = (c >> 8) & 255; out[i + 2] = c & 255;
}
await sharp(out, { raw: info }).png().toFile(OUT);
