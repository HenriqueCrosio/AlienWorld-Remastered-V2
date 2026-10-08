// Contact sheet for the triage (before any sheet goes to him): every candidate of one piece, magnified, numbered.
//   node scripts/_elites/_triagem-f3.mjs <out.png> <piece> <seed> [zoom] [cols]
// (07/10: the hunter round was cacadorLula/Vespa/Arraia/Louva seed 21; the tentacle round, tentaculo* seed 31.)
import fs from 'node:fs';
import sharp from 'sharp';

const [OUT, PECA, SEED, ZOOM = '3', COLS = '8'] = process.argv.slice(2);
const D = process.env.CAND ?? 'docs/superpowers/folhas/2026-10-07/elites/cand';
const Z = Number(ZOOM), NC = Number(COLS), LH = 18;
const arqs = fs.readdirSync(D)
  .filter((f) => new RegExp(`^${PECA}-${SEED}-(\\d+)\\.png$`).test(f))
  .sort((a, b) => Number(a.match(/-(\d+)\.png$/)[1]) - Number(b.match(/-(\d+)\.png$/)[1]));
const m = await sharp(`${D}/${arqs[0]}`).metadata();
const CW = m.width * Z + 8, CH = m.height * Z + LH + 4;
const comp = [];
for (const [k, f] of arqs.entries()) {
  const left = (k % NC) * CW, top = Math.floor(k / NC) * CH;
  comp.push({
    input: Buffer.from(`<svg width="${CW}" height="${LH}" xmlns="http://www.w3.org/2000/svg"><text x="2" y="14" font-family="Consolas" font-size="13" fill="#ffb040">${f.match(/-(\d+)\.png$/)[1]}</text></svg>`),
    left, top,
  });
  comp.push({ input: await sharp(`${D}/${f}`).resize(m.width * Z, m.height * Z, { kernel: 'nearest' }).png().toBuffer(), left: left + 4, top: top + LH });
}
await sharp({ create: { width: NC * CW, height: Math.ceil(arqs.length / NC) * CH, channels: 4, background: '#2a3040' } })
  .composite(comp).png().toFile(OUT);
console.log(OUT, arqs.length);
