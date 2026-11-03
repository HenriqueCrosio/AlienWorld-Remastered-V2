// 02/11 — clears the generator's GREY FILL of a given exact colour: flat 4-connected regions bigger than `max` px
// (`hab2-limpa.mjs` with the colour as a parameter: on the A it paints #86877f, on the B #7e7d7d into the coil's hole).
// `medir` instead prints the biggest region of that colour per frame (run it on the approved frame first: the art's own
// regions must stay under `max`).
//   node cinza.mjs <in-dir> <out-dir> <rrggbb> [max=80]      ·      node cinza.mjs medir <dir> <rrggbb>
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const a = process.argv.slice(2);
const medir = a[0] === 'medir';
const [IN, OUT, HEX, MAXS] = medir ? [a[1], null, a[2], '0'] : a;
const MAX = Number(MAXS ?? 80), C = parseInt(HEX, 16);
const W = 256, H = 256;
if (OUT) fs.mkdirSync(OUT, { recursive: true });
const n = fs.readdirSync(IN).filter((f) => /^\d+\.png$/.test(f)).length;
const rel = [];
for (let f = 0; f < n; f++) {
  const d = await sharp(path.join(IN, `${f}.png`)).ensureAlpha().raw().toBuffer();
  const eh = (j) => d[j * 4 + 3] >= 64 && ((d[j * 4] << 16) | (d[j * 4 + 1] << 8) | d[j * 4 + 2]) === C;
  const visto = new Uint8Array(W * H);
  let tirados = 0, maior = 0;
  for (let s = 0; s < W * H; s++) {
    if (visto[s] || !eh(s)) continue;
    const reg = [s]; visto[s] = 1;
    for (let q = 0; q < reg.length; q++) {
      const x = reg[q] % W, y = (reg[q] / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy, j = Y * W + X;
        if (X >= 0 && Y >= 0 && X < W && Y < H && !visto[j] && eh(j)) { visto[j] = 1; reg.push(j); }
      }
    }
    maior = Math.max(maior, reg.length);
    if (!medir && reg.length > MAX) { for (const j of reg) d[j * 4 + 3] = 0; tirados += reg.length; }
  }
  rel.push(medir ? maior : tirados);
  if (OUT) await sharp(d, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, `${f}.png`));
}
console.log(path.basename(IN), medir ? `biggest #${HEX} region per frame:` : `#${HEX} px cleared per frame:`, rel.join(' '));
