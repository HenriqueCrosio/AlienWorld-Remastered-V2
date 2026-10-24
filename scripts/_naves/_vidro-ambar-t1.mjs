// 23/10 — the black T1 (the jato) had a BLACK canopy: "o T1 tem o vidro preto, seria interessante manter o âmbar das
// outras". Cause: the jato's frames bob 0–2 px, so A's amber canopy only landed on the frames aligned with the still;
// the others went through the colour table (glass → grey) and the canopy would blink amber/black. Strict fix: in each
// frame, ONLY the canopy pixels (today's glass colour #2f3a3a in x 19–24) get the amber of the T0/T2 windows, the same
// ramp in every frame; every other pixel stays as it was (the script counts them).
//   node scripts/_naves/_vidro-ambar-t1.mjs <blackDir>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = process.argv[2];
const VIDRO = '2f3a3a';
// Top row (4 px) lighter, bottom row (6 px, the windshield runs 2 px further forward) darker — light from above.
const TOPO = ['eb953f', 'eb953f', 'e7a861', 'fadfa8'];
const BASE = ['b35937', 'b35937', 'eb953f', 'eb953f', 'eb7530', 'b35937'];
const rgb = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));

const nomes = ['ship-jato.png', ...[...Array(9).keys()].flatMap((i) => [`ship-jato-anim-${i}.png`, `ship-jato-azul-anim-${i}.png`])];
for (const n of nomes) {
  const hoje = await sharp(path.join('public/sprites', n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const preta = await sharp(path.join(DIR, n)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = hoje.info.width, out = Buffer.from(preta.data);
  const vidro = [];
  for (let y = 0; y < hoje.info.height; y++) for (let x = 19; x <= 24; x++) {
    const i = (y * W + x) * 4;
    if (hoje.data[i + 3] > 40 && hoje.data.subarray(i, i + 3).toString('hex') === VIDRO) vidro.push([x, y]);
  }
  const topo = Math.min(...vidro.map(([, y]) => y));
  for (const [x, y] of vidro) {
    const cor = y === topo ? TOPO[x - 19] : BASE[x - 19];
    if (!cor) throw new Error(`${n}: canopy pixel outside the ramp at ${x},${y}`);
    out.set(rgb(cor), (y * W + x) * 4);
  }
  let mudou = 0;
  for (let i = 0; i < out.length; i += 4) if (out.readUInt32BE(i) !== preta.data.readUInt32BE(i)) mudou++;
  await sharp(out, { raw: { width: W, height: hoje.info.height, channels: 4 } }).png().toFile(path.join(DIR, n));
  console.log(`${n}: vidro ${vidro.length} px (linha ${topo}) · pixels alterados ${mudou}`);
}
