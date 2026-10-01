// Contact sheet of ALL candidates of a PixelLab job: downloads every index, saves them, and tiles them numbered.
// Usage: node scripts/_contato-pixellab.mjs <job_id> <n> <zoom> <outdir> <tag>
import fs from 'fs';
import sharp from 'sharp';

const [JOB, N, Z, OUT, TAG] = process.argv.slice(2);
const n = Number(N), z = Number(Z);
fs.mkdirSync(`${OUT}/${TAG}`, { recursive: true });
const imgs = [];
for (let i = 0; i < n; i++) {
  const r = await fetch(`https://api.pixellab.ai/mcp/images/${JOB}/download?index=${i}`);
  if (!r.ok) break;
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(`${OUT}/${TAG}/${i}.png`, buf);
  imgs.push(buf);
}
const m = await sharp(imgs[0]).metadata();
const cw = m.width * z + 10, ch = m.height * z + 28, cols = Math.min(8, imgs.length);
const comp = [];
for (const [i, b] of imgs.entries()) {
  const x = 10 + (i % cols) * cw, y = 10 + Math.floor(i / cols) * ch;
  comp.push({ input: await sharp(b).resize(m.width * z, m.height * z, { kernel: 'nearest' }).toBuffer(), left: x, top: y + 18 });
  comp.push({ input: Buffer.from(`<svg width="60" height="18" xmlns="http://www.w3.org/2000/svg"><text x="0" y="14" font-family="Consolas" font-size="14" fill="#ffb040">#${i}</text></svg>`), left: x, top: y });
}
const W = 20 + cols * cw, H = 20 + Math.ceil(imgs.length / cols) * ch;
await sharp({ create: { width: W, height: H, channels: 4, background: '#262a33' } }).composite(comp).png().toFile(`${OUT}/${TAG}-contato.png`);
console.log(`${TAG}: ${imgs.length} candidatos → ${OUT}/${TAG}-contato.png`);
