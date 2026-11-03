// How far each frame of the clip's TAIL is from the approved frame 0 (whole image): silhouette flips and colour changes
// (> 60 summed RGB) as % of the approved's opaque pixels. A cut back to idle from a frame far from it is a pop.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const ref = await sharp('C:/Users/Henrique/AppData/Local/Temp/claude/C--Users-Henrique-Documents-Projetos-folder-AlienWorld-resmater/8ff31437-57ef-4a5b-82a7-281ddc3ef938/scratchpad/bote/A-quadro0-256.png').ensureAlpha().raw().toBuffer();
let base = 0; for (let i = 0; i < 256 * 256; i++) if (ref[i * 4 + 3] > 64) base++;
for (const dir of process.argv.slice(2)) {
  const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length;
  const out = [];
  for (let f = Math.max(0, n - 4); f < n; f++) {
    const d = await sharp(path.join(dir, `${f}.png`)).ensureAlpha().raw().toBuffer();
    let s = 0, c = 0;
    for (let i = 0; i < 256 * 256; i++) {
      const a = ref[i * 4 + 3] > 64, b = d[i * 4 + 3] > 64;
      if (a !== b) s++; else if (a && Math.abs(ref[i * 4] - d[i * 4]) + Math.abs(ref[i * 4 + 1] - d[i * 4 + 1]) + Math.abs(ref[i * 4 + 2] - d[i * 4 + 2]) > 60) c++;
    }
    out.push(`f${f}: silh ${((s / base) * 100).toFixed(1)}% cor ${((c / base) * 100).toFixed(1)}%`);
  }
  console.log(path.basename(dir).padEnd(8), out.join(' | '));
}
