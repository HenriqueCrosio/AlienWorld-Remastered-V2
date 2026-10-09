// CONTINUITY of an animation (09/10, he: "os rodopios ficaram irreais… mudanças bruscas de posição, parecem
// espelhados"): for each pair of neighbour frames, how far the centre of mass moved and how much of the drawing
// changed (the share of pixels whose opacity flips). A frame whose change is far above the clip's median is a JUMP.
//   node scripts/_elites/_continuidade.mjs <dir-with-0.png..N.png> [<dir> ...]     (dirs are concatenated in order;
//   the 1st frame of each later dir is skipped — it repeats the previous dir's last pose)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const dirs = process.argv.slice(2);
const arqs = [];
dirs.forEach((d, k) => {
  const n = fs.readdirSync(d).filter((f) => /^\d+\.png$/.test(f)).length;
  for (let i = k === 0 ? 0 : 1; i < n; i++) arqs.push(path.join(d, `${i}.png`));
});
const qs = [];
for (const a of arqs) {
  const { data, info } = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let sx = 0, sy = 0, n = 0;
  const op = new Uint8Array(info.width * info.height);
  for (let i = 0; i < op.length; i++)
    if (data[i * 4 + 3] > 64) {
      op[i] = 1;
      sx += i % info.width;
      sy += Math.floor(i / info.width);
      n++;
    }
  qs.push({ a, cx: sx / n, cy: sy / n, n, op });
}
const passos = [];
for (let i = 1; i < qs.length; i++) {
  const p = qs[i - 1], q = qs[i];
  let muda = 0, uni = 0;
  for (let k = 0; k < q.op.length; k++) {
    if (p.op[k] || q.op[k]) uni++;
    if (p.op[k] !== q.op[k]) muda++;
  }
  passos.push({ i, centro: Math.hypot(q.cx - p.cx, q.cy - p.cy), muda: muda / uni });
}
// The ruler (09/10): the rejected rolls changed ~49% of the drawing EVERY frame (all jumps, so a relative test misses
// them); the smooth side→front turn changed ~18%. Above 30% per frame reads as a jump.
const LIMITE = 0.3;
const med = [...passos.map((p) => p.muda)].sort((a, b) => a - b)[Math.floor(passos.length / 2)];
for (const p of passos)
  console.log(`${String(p.i).padStart(2)}  centro ${p.centro.toFixed(1).padStart(5)}px  muda ${(p.muda * 100).toFixed(0).padStart(3)}%${p.muda > LIMITE ? '   ← SALTO' : ''}`);
const saltos = passos.filter((p) => p.muda > LIMITE).length;
console.log(`\nmediana ${(med * 100).toFixed(0)}%, maior ${(Math.max(...passos.map((p) => p.muda)) * 100).toFixed(0)}%, saltos: ${saltos}`);
