// Unwraps tile-wrapped candidates by the EMPTY GAP: rolls each image so the longest cyclic run of near-empty columns
// (and rows) lands on the border, instead of a fixed half roll. Writes N-u.png next to N.png.
// Usage: node scripts/_desenrolar-vao.mjs <dir> <ids...>
import sharp from 'sharp';
const [DIR, ...ids] = process.argv.slice(2);
const maiorVao = (vazio) => { // index where the longest cyclic run of `true` starts, and its length
  const n = vazio.length; let best = [0, 0];
  for (let i = 0; i < n; i++) {
    if (!vazio[i] || vazio[(i - 1 + n) % n]) continue;
    let k = 0; while (k < n && vazio[(i + k) % n]) k++;
    if (k > best[1]) best = [i, k];
  }
  return best;
};
for (const id of ids) {
  const { data, info } = await sharp(`${DIR}/${id}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const a = (x, y) => data[(y * W + x) * 4 + 3];
  const contaCol = (x) => { let c = 0; for (let y = 0; y < H; y++) c += a(x, y) > 0; return c; };
  const contaLin = (y) => { let c = 0; for (let x = 0; x < W; x++) c += a(x, y) > 0; return c; };
  const [cx, kx] = maiorVao([...Array(W)].map((_, x) => contaCol(x) <= 1));
  const [cy, ky] = maiorVao([...Array(H)].map((_, y) => contaLin(y) <= 1));
  // the gap's centre goes to x=0, so the art is centred
  const md = (v, n) => ((v % n) + n) % n;
  const dx = md(-(cx + Math.floor(kx / 2)), W), dy = md(-(cy + Math.floor(ky / 2)), H);
  const out = Buffer.alloc(data.length);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = (y * W + x) * 4, d = (((y + dy) % H) * W + ((x + dx) % W)) * 4;
    data.copy(out, d, s, s + 4);
  }
  await sharp(out, { raw: info }).png().toFile(`${DIR}/${id}-u.png`);
  console.log(id, { gapX: kx, gapY: ky });
}
