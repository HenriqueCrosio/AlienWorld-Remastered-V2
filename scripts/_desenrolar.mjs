// Unwraps tile-wrapped candidates (rolls each image by half width/height, wrapping) and rebuilds the contact sheet.
import fs from 'fs';
import sharp from 'sharp';
const [DIR, OUTSHEET, Z] = process.argv.slice(2);
const z = Number(Z);
const files = fs.readdirSync(DIR).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
const comp = [];
let m;
for (const [i, f] of files.entries()) {
  const { data, info } = await sharp(`${DIR}/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  m = info;
  const out = Buffer.alloc(data.length);
  const dx = info.width / 2, dy = info.height / 2;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const s = (y * info.width + x) * 4, d = (((y + dy) % info.height) * info.width + ((x + dx) % info.width)) * 4;
    data.copy(out, d, s, s + 4);
  }
  const png = await sharp(out, { raw: info }).png().toBuffer();
  fs.writeFileSync(`${DIR}/${f.replace('.png', '-u.png')}`, png);
  const cw = info.width * z + 10, ch = info.height * z + 28;
  const x = 10 + (i % 8) * cw, yy = 10 + Math.floor(i / 8) * ch;
  comp.push({ input: await sharp(png).resize(info.width * z, info.height * z, { kernel: 'nearest' }).toBuffer(), left: x, top: yy + 18 });
  comp.push({ input: Buffer.from(`<svg width="60" height="18" xmlns="http://www.w3.org/2000/svg"><text x="0" y="14" font-family="Consolas" font-size="14" fill="#ffb040">#${i}</text></svg>`), left: x, top: yy });
}
const cw = m.width * z + 10, ch = m.height * z + 28;
await sharp({ create: { width: 20 + 8 * cw, height: 20 + Math.ceil(files.length / 8) * ch, channels: 4, background: '#262a33' } }).composite(comp).png().toFile(OUTSHEET);
console.log(OUTSHEET);
