// 07/11 — stage 3: a painted effect the generator added to a gesture clip (the swim's "breathing" came with a spark star
// on the skull top in two frames) cleaned the way of `hab14-cuspe.mjs`: in a box, the pixels that pass a colour test
// (+1 px around) are the hole; the clean neighbour frame is laid over at the offset (±2 px) whose ring around the hole
// matches best, and fills it.
//   node scripts/_serpente/_enguia-gesto-limpa.mjs <clip-dir> <frame> <clean-neighbour> <x0,y0,x1,y1>
import sharp from 'sharp';

const [DIR, K, V, CAIXA] = process.argv.slice(2);
const [x0, y0, x1, y1] = CAIXA.split(',').map(Number);
const W = 96, H = 96;
const le = async (k) => (await sharp(`${DIR}/${k}.png`).ensureAlpha().raw().toBuffer());
const Q = await le(K), L = await le(V), out = Buffer.from(Q);
// (the spark: bright and warm — yellow-white to light orange; the hull is dark grey-blue)
const faisca = (i) => { const r = Q[i * 4], g = Q[i * 4 + 1], b = Q[i * 4 + 2]; return Q[i * 4 + 3] >= 128 && r > 150 && g > 100 && r > b + 50; };
const furo = new Uint8Array(W * H);
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (faisca(y * W + x)) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
  const X = x + dx, Y = y + dy;
  if (X >= 0 && X < W && Y >= 0 && Y < H) furo[Y * W + X] = 1;
}
const anel = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (furo[y * W + x]) continue;
  let perto = false;
  for (let dy = -2; dy <= 2 && !perto; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && X < W && Y >= 0 && Y < H && furo[Y * W + X]) { perto = true; break; } }
  if (perto) anel.push(y * W + x);
}
let melhor = null;
for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) {
  let s = 0;
  for (const i of anel) {
    const x = (i % W) + ox, y = Math.floor(i / W) + oy;
    if (x < 0 || x >= W || y < 0 || y >= H) { s += 300; continue; }
    const j = (y * W + x) * 4;
    s += Math.abs(Q[i * 4] - L[j]) + Math.abs(Q[i * 4 + 1] - L[j + 1]) + Math.abs(Q[i * 4 + 2] - L[j + 2]);
  }
  if (!melhor || s < melhor.s) melhor = { s, ox, oy };
}
let n = 0;
for (let i = 0; i < W * H; i++) if (furo[i]) {
  const x = (i % W) + melhor.ox, y = Math.floor(i / W) + melhor.oy, j = (y * W + x) * 4;
  for (let c = 0; c < 4; c++) out[i * 4 + c] = L[j + c];
  n++;
}
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${DIR}/${K}.png`);
console.log(`q${K}: ${n} px trocados pelo q${V} (deslocado ${melhor.ox},${melhor.oy}; erro do anel ${(melhor.s / anel.length).toFixed(1)})`);
