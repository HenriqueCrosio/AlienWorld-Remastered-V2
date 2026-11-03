// 02/11 — mean brightness (0.3R+0.59G+0.11B) of the opaque pixels per frame, and of the COIL band only (y ≥ 150), as %
// of a REFERENCE frame (the form's approved frame: the A's or the B's). A clip far below 100 darkens the whole serpent
// (it flickers against the idle) — the round-2 rule: reject below ~90%. (`hab2-luz.mjs` with the reference as a parameter.)
//   node luz.mjs <ref.png> <dir> [<dir> ...]
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
const [REF, ...DIRS] = process.argv.slice(2);
const [r, rc] = await lum(REF);
for (const dir of DIRS) {
  const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length; const o = [];
  let pior = 999;
  for (let i = 0; i < n; i++) { const [a, c] = await lum(path.join(dir, `${i}.png`)); const pa = Math.round((a / r) * 100), pc = Math.round((c / rc) * 100); pior = Math.min(pior, pa, pc); o.push(`${pa}/${pc}`); }
  console.log(path.basename(dir).padEnd(22), o.join(' '), ' pior', pior);
}
