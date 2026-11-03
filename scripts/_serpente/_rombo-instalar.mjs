// 28/10 — THE BREACH, INSTALLED (S1, his choice: concept A, the tear). The chosen inpaint is a 318×100 strip of the
// prow's hull (duto2 | duto | placa, 34 px of sky above the crest) with the tear in its middle. Two layers out of it:
//   - `serpente-rombo.png`: the whole strip — it goes INTO the hull band (`Parallax.inserirNoCasco`), so its sides are
//     the band's own pieces and there is no seam; the dark hole and the plates bent up are behind her;
//   - `serpente-rombo-labio.png`: the hull's FACE in front of her coils — the strip's pixels from the crest's row down,
//     except the hole (a polygon drawn on the art, around the dark interior, measured on the 5× grid of 28/10). Through
//     the hole she shows; around it, the face hides what of her is inside the hull.
// And a check image (the lip over magenta, the hole outlined).
//   node scripts/_serpente/_rombo-instalar.mjs <conceito.png> <dir de saída>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [ARQ, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
/** the lip starts at this row (the plates bent up above it stay behind her) */
const LABIO_DE = 30;
/** the hole, in the strip's px (concept A) */
const BURACO = [[114, 30], [124, 24], [150, 24], [176, 22], [192, 27], [198, 36], [199, 48], [197, 62], [190, 70], [186, 82], [176, 89], [140, 90], [126, 85], [116, 76], [110, 64], [108, 50], [110, 38]];

const dentro = (x, y, pol) => {
  let c = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i], [xj, yj] = pol[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

const { data, info } = await sharp(ARQ).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const labio = Buffer.from(data);
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (y < LABIO_DE || dentro(x + 0.5, y + 0.5, BURACO)) labio[(y * info.width + x) * 4 + 3] = 0;
}
await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(path.join(OUT, 'serpente-rombo.png'));
await sharp(labio, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(path.join(OUT, 'serpente-rombo-labio.png'));
const svg = `<svg width="${info.width * 4}" height="${info.height * 4}" xmlns="http://www.w3.org/2000/svg"><polygon points="${BURACO.map(([x, y]) => `${x * 4},${y * 4}`).join(' ')}" fill="none" stroke="#0f0" stroke-width="2"/><line x1="0" y1="${LABIO_DE * 4}" x2="${info.width * 4}" y2="${LABIO_DE * 4}" stroke="#ff0" stroke-width="1"/></svg>`;
const lab = await sharp(labio, { raw: { width: info.width, height: info.height, channels: 4 } }).flatten({ background: '#ff00ff' }).resize(info.width * 4, info.height * 4, { kernel: 'nearest' }).png().toBuffer();
await sharp(lab).composite([{ input: Buffer.from(svg) }]).png().toFile(path.join(OUT, 'labio-confere.png'));
console.log('rombo e lábio em', OUT, `${info.width}x${info.height}`);
