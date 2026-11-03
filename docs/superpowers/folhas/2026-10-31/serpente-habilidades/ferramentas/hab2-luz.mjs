// Mean brightness (0.3R+0.59G+0.11B) of the opaque pixels per frame, and of the COIL band only (y >= 150), as % of the
// approved frame 0. A clip frame far below 100 darkens the whole serpent (reads as a flicker against the idle).
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const lum = async (f) => {
  const d = await sharp(f).ensureAlpha().raw().toBuffer(); let s = 0, n = 0, sc = 0, nc = 0;
  for (let i = 0; i < 256 * 256; i++) if (d[i * 4 + 3] > 64) {
    const l = 0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2]; s += l; n++;
    if (i / 256 >= 150) { sc += l; nc++; }
  }
  return [s / n, sc / nc];
};
const [r, rc] = await lum('C:/Users/Henrique/AppData/Local/Temp/claude/C--Users-Henrique-Documents-Projetos-folder-AlienWorld-resmater/8ff31437-57ef-4a5b-82a7-281ddc3ef938/scratchpad/bote/A-quadro0-256.png');
for (const dir of process.argv.slice(2)) {
  const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length; const o = [];
  for (let i = 0; i < n; i++) { const [a, c] = await lum(path.join(dir, `${i}.png`)); o.push(`${Math.round((a / r) * 100)}/${Math.round((c / rc) * 100)}`); }
  console.log(path.basename(dir).padEnd(8), o.join(' '));
}
