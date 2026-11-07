// 07/11 — stage 3, his note on every generation: GAPS at the joint — the scene showing through between the jaw's back
// and the neck. In the art's frame: the skull is drawn from the gesture frame up to the joint (x < CRANIO_X + SOBRE), the
// neck from the skin, which at rest covers what the E3 covers from FAIXA_X0 on. Their union may leave notches and holes
// near the joint that the E3 never had. (The skin is the real one, `faixaCorpo`: under the skull, x 56–65, only its
// middle band and the ramp down to the E3's jaw — that ramp misses a jaw the gesture moved; from x 66 the whole neck.) A gap = a pixel outside the union that a closing (radius R) of the union fills,
// near the joint. `medir` lists them per frame; `corrige` paints them into the frame (the E3's pixel and normal where the
// E3 has one there, else the nearest frame pixel), so the drawn skull closes them.
//   node scripts/_serpente/_enguia-gesto-vaos.mjs <medir|corrige> <pasta> <n>
import sharp from 'sharp';
import { CRANIO_X, SOBRE, FAIXA_X0, CENTRO, faixaCorpo } from './enguia/arte.mjs';
import { N } from './enguia/numeros.mjs';

const [MODO, PASTA, NQ] = process.argv.slice(2);
const W = 96, H = 96, OY = 16, R = 3, XA = 30, XB = CRANIO_X + SOBRE + 4;
const le = async (f) => (await sharp(f).ensureAlpha().toColourspace('srgb').raw({ depth: 'uchar' }).toBuffer({ resolveWithObject: true }));
const e3 = await le('docs/superpowers/folhas/2026-11-04/enguia-corpo/aprovada/cabeca-e3-pescoco.png');
const e3op = (x, y) => { const ay = y - OY; return x >= 0 && x < 96 && ay >= 0 && ay < 64 && e3.data[(ay * 96 + x) * 4 + 3] > 128; };
const nrm = await le(`${PASTA}/normais.png`), NW = nrm.info.width;
const nE = await le('docs/superpowers/folhas/2026-11-07/enguia-aneis/cabeca-normal.png');

// the skin at rest, in the 96×96 frame's coordinates (the F1 has the head at y 8; the frame has the E3 at y 16)
const F = await faixaCorpo(N), pele = new Uint8Array(W * H);
for (let u = 0; u < W - FAIXA_X0; u++) {
  const x = FAIXA_X0 + u;
  for (let r = 0; r < F.h; r++) {
    if (F.data[(r * F.w + u) * 4 + 3] <= 128) continue;
    const y = Math.round(F.liso[x] + r - CENTRO) - 8 + OY;
    if (y >= 0 && y < H) pele[y * W + x] = 1;
  }
}
const disco = []; for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= R * R) disco.push([dx, dy]);
const dilata = (m) => { const o = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x]) for (const [dx, dy] of disco) { const X = x + dx, Y = y + dy; if (X >= 0 && X < W && Y >= 0 && Y < H) o[Y * W + X] = 1; } return o; };
const erode = (m) => { const o = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let ok = 1; for (const [dx, dy] of disco) { const X = x + dx, Y = y + dy; if (X < 0 || X >= W || Y < 0 || Y >= H || !m[Y * W + X]) { ok = 0; break; } } o[y * W + x] = ok; } return o; };

let total = 0;
for (let k = 1; k < Number(NQ); k++) {
  const nome = `q${String(k).padStart(2, '0')}.png`, Q = await le(`${PASTA}/${nome}`), out = Buffer.from(Q.data);
  const U = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const doQuadro = x < CRANIO_X + SOBRE && Q.data[(y * W + x) * 4 + 3] > 128, daPele = !!pele[y * W + x];
    U[y * W + x] = doQuadro || daPele ? 1 : 0;
  }
  const Fc = erode(dilata(U));
  const vaos = [];
  for (let y = 0; y < H; y++) for (let x = XA; x < XB; x++) if (Fc[y * W + x] && !U[y * W + x]) vaos.push([x, y]);
  total += vaos.length;
  const xs = vaos.map((v) => v[0]), ys = vaos.map((v) => v[1]);
  console.log(`${nome}: ${vaos.length} px de vão${vaos.length ? ` (x ${Math.min(...xs)}–${Math.max(...xs)}, y ${Math.min(...ys)}–${Math.max(...ys)})` : ''}`);
  if (MODO !== 'corrige' || !vaos.length) continue;
  for (const [x, y] of vaos) {
    const i = (y * W + x) * 4, j = (y * NW + k * W + x) * 4;
    if (e3op(x, y)) { // the E3's own pixel and normal there
      const s = ((y - OY) * 96 + x) * 4;
      for (let c = 0; c < 4; c++) { out[i + c] = e3.data[s + c]; nrm.data[j + c] = nE.data[s + c]; }
    } else { // the nearest pixel of the frame
      let best = null;
      for (let r = 1; r < 6 && !best; r++) for (let dy = -r; dy <= r && !best; dy++) for (let dx = -r; dx <= r; dx++) {
        const X = x + dx, Y = y + dy;
        if (X >= 0 && X < W && Y >= 0 && Y < H && Q.data[(Y * W + X) * 4 + 3] > 128) { best = [X, Y]; break; }
      }
      if (!best) continue;
      const s = (best[1] * W + best[0]) * 4, sn = (best[1] * NW + k * W + best[0]) * 4;
      for (let c = 0; c < 4; c++) { out[i + c] = Q.data[s + c]; nrm.data[j + c] = nrm.data[sn + c]; }
    }
  }
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${PASTA}/${nome}`);
}
if (MODO === 'corrige') await sharp(nrm.data, { raw: { width: NW, height: H, channels: 4 } }).png().toFile(`${PASTA}/normais.png`);
console.log(`total: ${total} px`);
