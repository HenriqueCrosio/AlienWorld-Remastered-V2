import sharp from 'sharp';
const [DIR, OUT, ...ids] = process.argv.slice(2);
const Z = 6, comp = [];
for (const [i, id] of ids.entries()) {
  const b = await sharp(`${DIR}/${id}.png`).ensureAlpha().toBuffer();
  const m = await sharp(b).metadata();
  comp.push({ input: await sharp(b).resize(m.width * Z, m.height * Z, { kernel: 'nearest' }).toBuffer(), left: 10 + i * (m.width * Z + 20), top: 30 });
  comp.push({ input: Buffer.from(`<svg width="80" height="24" xmlns="http://www.w3.org/2000/svg"><text x="0" y="18" font-family="Consolas" font-size="18" fill="#ffb040">#${id}</text></svg>`), left: 10 + i * (m.width * Z + 20), top: 4 });
}
const m = await sharp(`${DIR}/${ids[0]}.png`).metadata();
await sharp({ create: { width: 20 + ids.length * (m.width * Z + 20), height: 40 + m.height * Z, channels: 4, background: '#262a33' } }).composite(comp).png().toFile(OUT);
