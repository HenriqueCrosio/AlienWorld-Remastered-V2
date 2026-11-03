// Clears the generator's GREY FILL: flat regions (4-neighbour, exact colour #86877f) bigger than 80 px. In the approved
// art that plate colour never forms a region above 66 px; the fills the generator paints into see-through holes (the
// coil's hole, behind the necks) run 87..826 px. Nothing else is touched.
//   node hab2-limpa.mjs <in-dir> <out-dir>
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [inDir, outDir] = process.argv.slice(2);
const GREY = 0x86877f, MAX = 80;
fs.mkdirSync(outDir, { recursive: true });
const n = fs.readdirSync(inDir).filter((f) => /^\d+\.png$/.test(f)).length;
const rep = [];
for (let f = 0; f < n; f++) {
  const { data, info } = await sharp(path.join(inDir, `${f}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, seen = new Uint8Array(W * H);
  const isG = (i) => data[i * 4 + 3] >= 64 && ((data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2]) === GREY;
  let cl = 0;
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || !isG(i)) continue;
    const reg = [i]; seen[i] = 1;
    for (let q = 0; q < reg.length; q++) {
      const x = reg[q] % W, y = (reg[q] / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx; if (seen[j] || !isG(j)) continue; seen[j] = 1; reg.push(j);
      }
    }
    if (reg.length > MAX) for (const j of reg) { data[j * 4 + 3] = 0; cl++; }
  }
  rep.push(cl);
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(outDir, `${f}.png`));
}
console.log(path.basename(inDir).padEnd(8), 'grey px cleared per frame:', rep.join(' '));
