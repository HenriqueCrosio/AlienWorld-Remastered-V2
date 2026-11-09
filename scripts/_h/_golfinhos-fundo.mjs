// BLOCO H (09/11, rodada 2) — the DOLPHINS at the back of chamber B (F4), his pick: *"vai ser o B (dois) só que eles vão
// chegar da extrema direita e cruzar a tela em diagonal até a parte de baixo [...] quero a silhueta deles nadando iguais a
// um golfinho e mais rápido do que está, faça pequenas bolhas de rastro"*. The approved swim (`golfinho-nado.png`, 9 ×
// 80×80, facing left) cut to the union bbox, ROTATED at full size (×4, nearest) to every angle the porpoising path takes,
// and only then reduced to each width (the 1 px rim stays a line — a sprite rotated by the engine would saw it), alpha
// 0/255, specks dropped, lit for distance under water (near-black body, the water's light on the top edge).
// Sheet `golfinho-fundo.png`: cells C×C, frame = ((width index × angles) + angle index) × 9 + swim frame.
// Sheet `bolha-agua.png`: 2 cells 3×3 — a 1 px bubble and a 3 px ring.
//   node scripts/_h/_golfinhos-fundo.mjs [outDir=public/sprites] [--folha <dir>]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { semIlhas } from '../_leviata/_luz-lua.mjs';

const args = process.argv.slice(2);
const OUT = args[0] && !args[0].startsWith('--') ? args[0] : 'public/sprites';
const FOLHA = args.includes('--folha') ? args[args.indexOf('--folha') + 1] : null;

/** Mirrors `src/f4/golfinhosFundo.ts` (`FOLHA_GOLFINHOS`): the widths, the angles (deg, + = clockwise on screen), the cell. */
export const GOLFINHOS = { larguras: [15, 20], angulos: Array.from({ length: 19 }, (_, k) => -75 + 5 * k), celula: 26 };
const CHAPADO = [[4, 8, 14], [8, 15, 26]];
// ⚠️ A TOM ABOVE the 1st round (74,116,146): the right half of chamber B is dark in the game (luminance 23–41,
// measured) and they enter there — the rim (and the bubbles) is what draws them on it.
const ARO = [96, 146, 172];
export const BOLHA = { ponto: [130, 175, 198], anel: [104, 150, 178] };

const { data, info } = await sharp('public/sprites/golfinho-nado.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const N = info.width / 80, Q = 80;
let x0 = Q, y0 = Q, x1 = 0, y1 = 0;
for (let q = 0; q < N; q++) for (let y = 0; y < Q; y++) for (let x = 0; x < Q; x++) {
  if (data[(y * info.width + q * Q + x) * 4 + 3] < 128) continue;
  x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
}
const W0 = x1 - x0 + 1, H0 = y1 - y0 + 1;
const SS = 4; // supersampling of the rotation
const LADO = Math.ceil(Math.hypot(W0, H0)) + 2; // the square every rotation fits in (source px)

/** Frame q rotated by `graus` into a LADO·SS square (RGBA, alpha 0/255), the bbox centre at the centre. */
function girar(q, graus) {
  const S = LADO * SS, out = Buffer.alloc(S * S * 4);
  const a = (graus * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const cx = W0 / 2, cy = H0 / 2;
  for (let Y = 0; Y < S; Y++) for (let X = 0; X < S; X++) {
    // inverse map: screen offset → source (rotate by −a)
    const dx = (X + 0.5) / SS - LADO / 2, dy = (Y + 0.5) / SS - LADO / 2;
    const sx = Math.floor(dx * c + dy * s + cx), sy = Math.floor(-dx * s + dy * c + cy);
    if (sx < 0 || sy < 0 || sx >= W0 || sy >= H0) continue;
    const i = ((sy + y0) * info.width + q * Q + sx + x0) * 4;
    if (data[i + 3] < 128) continue;
    const o = (Y * S + X) * 4;
    out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2]; out[o + 3] = 255;
  }
  return out;
}

const opaco = (d, w, h, x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;

/** The rotated square reduced so the body is `w` px wide (unrotated), lit for distance. */
async function reduzir(sq, w) {
  const k = w / W0, lado = Math.round(LADO * k);
  const { data: d } = await sharp(sq, { raw: { width: LADO * SS, height: LADO * SS, channels: 4 } })
    .resize(lado, lado, { fit: 'fill', kernel: 'mitchell' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < d.length; i += 4) d[i + 3] = d[i + 3] >= 110 ? 255 : 0;
  semIlhas(d, lado, lado, 2);
  const o = Buffer.from(d);
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
    const i = (y * lado + x) * 4;
    if (!d[i + 3]) continue;
    const borda = !opaco(d, lado, lado, x, y - 1) || !opaco(d, lado, lado, x + 1, y - 1);
    [o[i], o[i + 1], o[i + 2]] = borda ? ARO : CHAPADO[opaco(d, lado, lado, x, y - 2) ? 0 : 1];
  }
  return { png: await sharp(o, { raw: { width: lado, height: lado, channels: 4 } }).png().toBuffer(), lado };
}

fs.mkdirSync(OUT, { recursive: true });
const C = GOLFINHOS.celula, NA = GOLFINHOS.angulos.length;
const comps = [];
for (const [wi, w] of GOLFINHOS.larguras.entries()) for (const [ai, g] of GOLFINHOS.angulos.entries()) for (let q = 0; q < N; q++) {
  const { png, lado } = await reduzir(girar(q, g), w);
  if (lado > C) throw new Error(`cell ${C} < ${lado}`);
  const f = (wi * NA + ai) * N + q;
  comps.push({ input: png, left: (f % N) * C + Math.floor((C - lado) / 2), top: Math.floor(f / N) * C + Math.floor((C - lado) / 2) });
}
const linhas = GOLFINHOS.larguras.length * NA;
const arq = path.join(OUT, 'golfinho-fundo.png');
await sharp({ create: { width: C * N, height: C * linhas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toFile(arq);
console.log(arq, `${GOLFINHOS.larguras.length} larguras × ${NA} ângulos × ${N} quadros, células ${C}×${C} (bbox ${W0}×${H0})`);

// the bubbles: a dot and a ring, 3×3
const b = Buffer.alloc(6 * 3 * 4);
const pb = (x, y, c) => { const i = (y * 6 + x) * 4; b[i] = c[0]; b[i + 1] = c[1]; b[i + 2] = c[2]; b[i + 3] = 255; };
pb(1, 1, BOLHA.ponto);
for (const [x, y] of [[4, 0], [3, 1], [5, 1], [4, 2]]) pb(x, y, BOLHA.anel);
await sharp(b, { raw: { width: 6, height: 3, channels: 4 } }).png().toFile(path.join(OUT, 'bolha-agua.png'));
console.log(path.join(OUT, 'bolha-agua.png'));

if (FOLHA) {
  fs.mkdirSync(FOLHA, { recursive: true });
  // the 20 px row at every other angle, every frame, ×6, on the tunnel's blue
  const K = 6, sel = GOLFINHOS.angulos.map((g, i) => i).filter((i) => i % 2 === 0), cs = [];
  for (const [r, ai] of sel.entries()) for (let q = 0; q < N; q++) {
    const f = (1 * NA + ai) * N + q;
    const cel = await sharp(arq).extract({ left: (f % N) * C, top: Math.floor(f / N) * C, width: C, height: C }).png().toBuffer();
    cs.push({ input: await sharp(cel).resize(C * K, C * K, { kernel: 'nearest' }).png().toBuffer(), left: q * C * K, top: r * C * K });
  }
  await sharp({ create: { width: N * C * K, height: sel.length * C * K, channels: 4, background: '#2c4a66' } }).composite(cs).png()
    .toFile(path.join(FOLHA, 'golfinho-fundo-x6.png'));
}
