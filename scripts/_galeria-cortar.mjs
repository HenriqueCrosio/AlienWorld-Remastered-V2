// A saved PixelLab result comes back as ONE grid sheet (image.png): this downloads it and slices it into numbered
// frames (row-major), then builds a contact sheet. Usage: node scripts/_galeria-cortar.mjs <url> <cell px> <outdir> <tag> [zoom]
import fs from 'fs';
import sharp from 'sharp';

const [URL_, CEL, OUT, TAG, Z = '3'] = process.argv.slice(2);
const c = Number(CEL), z = Number(Z);
const r = await fetch(URL_);
if (!r.ok) throw new Error(`download ${r.status}`);
const folha = Buffer.from(await r.arrayBuffer());
const m = await sharp(folha).metadata();
const cols = Math.floor(m.width / c), rows = Math.floor(m.height / c);
fs.mkdirSync(`${OUT}/${TAG}`, { recursive: true });
const comp = [];
let n = 0;
for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
  const q = await sharp(folha).extract({ left: x * c, top: y * c, width: c, height: c }).png().toBuffer();
  const { info } = await sharp(q).raw().toBuffer({ resolveWithObject: true });
  fs.writeFileSync(`${OUT}/${TAG}/${n}.png`, q);
  const cw = c * z + 10, ch = c * z + 28, cx = 10 + (n % 8) * cw, cy = 10 + Math.floor(n / 8) * ch;
  comp.push({ input: await sharp(q).resize(c * z, c * z, { kernel: 'nearest' }).toBuffer(), left: cx, top: cy + 18 });
  comp.push({ input: Buffer.from(`<svg width="60" height="18" xmlns="http://www.w3.org/2000/svg"><text x="0" y="14" font-family="Consolas" font-size="14" fill="#ffb040">#${n}</text></svg>`), left: cx, top: cy });
  n++;
  void info;
}
const cw = c * z + 10, ch = c * z + 28;
await sharp({ create: { width: 20 + Math.min(8, n) * cw, height: 20 + Math.ceil(n / 8) * ch, channels: 4, background: '#262a33' } }).composite(comp).png().toFile(`${OUT}/${TAG}-contato.png`);
console.log(`${TAG}: folha ${m.width}x${m.height} → ${n} quadros de ${c}px`);
