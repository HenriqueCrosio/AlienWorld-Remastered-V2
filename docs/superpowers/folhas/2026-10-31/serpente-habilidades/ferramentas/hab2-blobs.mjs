// Flat single-colour connected regions (4-neighbour, exact colour) of >= MIN px, per frame.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const MIN = Number(process.env.MIN ?? 30);
for (const f of process.argv.slice(2)) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, seen = new Uint8Array(W * H), res = [];
  const col = (i) => (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2];
  for (let i = 0; i < W * H; i++) {
    if (seen[i] || data[i * 4 + 3] < 64) continue;
    const c = col(i), reg = [i]; seen[i] = 1;
    for (let q = 0; q < reg.length; q++) {
      const x = reg[q] % W, y = (reg[q] / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = yy * W + xx; if (seen[j] || data[j * 4 + 3] < 64 || col(j) !== c) continue; seen[j] = 1; reg.push(j);
      }
    }
    if (reg.length >= MIN) { let sx = 0, sy = 0; for (const j of reg) { sx += j % W; sy += (j / W) | 0; } res.push(`${reg.length}px #${c.toString(16).padStart(6, '0')} @${(sx / reg.length) | 0},${(sy / reg.length) | 0}`); }
  }
  console.log(path.relative('.', f), res.length ? res.join(' | ') : '-');
}
