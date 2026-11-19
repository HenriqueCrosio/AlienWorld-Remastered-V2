// THE NIGHT-MENU FOG MAPS (spec 2026-11-19-menu-neblina-chuva-design.md §3): baked once, read by the fog shader.
//   node scripts/_menu/_neblina-assar.mjs <outDir>
// Writes, at 2 px per game px (768x432):
//   neblina-mapa.png  R = density (where fog lives), G/B = flow direction (0.5 + 0.5 * v)
//   neblina-luz.png   R = the amber windows as soft pools (the fog lights up where it passes them)
//   neblina-ruido.png 256x256, R/G/B = three seamless (tiling) fbm noises: the shader samples them instead of computing
//                     noise per screen pixel (19/11: the computed noise was too heavy and stuttered)
//   neblina-conferir.png  the three maps over the painting, for checking
import sharp from 'sharp';
import fs from 'fs';

const OUT = process.argv[2];
if (!OUT) throw new Error('usage: _neblina-assar.mjs <outDir>');
fs.mkdirSync(OUT, { recursive: true });

const K = 2; // px per game px
const W = 384 * K, H = 216 * K;
const P = 'public/sprites/menu/k4/';

// His strokes (19/11), transcribed from the aligned print (`folhas/2026-11-19/neblina/tracos-sobre-pintura.jpg`), in
// game px, from the start to the arrowhead. They are EXAMPLES ("foram mais exemplos, mas pode se basear neles"):
// they reinforce the density and set the flow; the fog itself lives in every valley and slope.
export const TRACOS = [
  [[213, 59], [235, 69], [257, 72], [269, 88]],
  [[9, 129], [28, 140], [43, 153], [63, 164], [96, 170]],
  [[89, 104], [100, 118], [113, 133], [136, 146]],
  [[117, 103], [113, 118], [120, 130], [138, 139]],
  [[175, 103], [184, 115], [176, 135], [188, 149]],
  [[310, 98], [325, 105], [340, 118]],
  [[216, 154], [245, 157], [266, 158]],
  [[31, 201], [75, 204], [118, 204]],
  [[198, 201], [225, 205], [268, 200]],
];

const N = {
  // density
  vale: { y0: 0.34, y1: 0.95, min: 0.12 }, // the valley floor ramps from y0 to y1 (fraction of height)
  // the whole frame (him, 19/11): every structure, the tall ones too, gets the veil; the sky a lighter one
  ceu: 0.32, estruturas: 0.62,
  cidadeBorrao: 5, // px (at K): the terrain silhouette, softened so fog spills a little past it
  tracoLargura: 3, tracoBorrao: 16, tracoPeso: 0.75,
  valePeso: 0.8, borraoFinal: 5,
  // flow
  sigmaFluxo: 34 * K, deriva: [1, 0.14], pesoDeriva: 0.22,
  // light
  luzRaio: [1.6, 1.0], luzBorrao: 2, luzTeto: 1.0,
};

// sharp's blur returns 3 channels from a 1-channel raw buffer: keep one.
const borrar = (buf, sigma) => sharp(buf, { raw: { width: W, height: H, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer();
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The terrain: the front layer's alpha (the city and the slopes), at K.
const cidade = await sharp(P + 'cidade.png').resize(W, H, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
const alfa = Buffer.alloc(W * H);
for (let i = 0; i < W * H; i++) alfa[i] = cidade[i * 4 + 3];
const alfaB = await borrar(alfa, N.cidadeBorrao);

// The strokes, drawn thick and blurred wide.
const traco = Buffer.alloc(W * H);
const pinta = (x, y) => {
  const r = N.tracoLargura;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const X = Math.round(x + dx), Y = Math.round(y + dy);
    if (X >= 0 && Y >= 0 && X < W && Y < H && dx * dx + dy * dy <= r * r) traco[Y * W + X] = 255;
  }
};
const segs = [];
for (const t of TRACOS) for (let i = 0; i + 1 < t.length; i++) {
  const [x0, y0] = t[i].map((v) => v * K), [x1, y1] = t[i + 1].map((v) => v * K);
  const len = Math.hypot(x1 - x0, y1 - y0);
  for (let s = 0; s <= len; s += 1) pinta(x0 + ((x1 - x0) * s) / len, y0 + ((y1 - y0) * s) / len);
  segs.push({ x0, y0, x1, y1, tx: (x1 - x0) / len, ty: (y1 - y0) / len, len });
}
const tracoB = await borrar(traco, N.tracoBorrao);
let maxT = 1; for (const v of tracoB) maxT = Math.max(maxT, v);

const dens = Buffer.alloc(W * H);
for (let y = 0; y < H; y++) {
  const rampa = N.vale.min + (1 - N.vale.min) * sm(N.vale.y0, N.vale.y1, y / H);
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const a = alfaB[i] / 255;
    const v = Math.max(N.ceu + (N.estruturas - N.ceu) * a, N.valePeso * a * rampa) + N.tracoPeso * (tracoB[i] / maxT);
    dens[i] = Math.round(255 * Math.min(1, v));
  }
}
const densB = await borrar(dens, N.borraoFinal);

// The flow: each stroke's tangent, weighted by distance, over a gentle drift right and downhill. Coarse grid, then
// upscaled (it is smooth by construction).
const G = 4, gw = W / G, gh = H / G;
const fluxo = Buffer.alloc(gw * gh * 3); // 3 channels: 2 would read as grey + alpha
const [dx0, dy0] = N.deriva; const dl = Math.hypot(dx0, dy0);
for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
  const x = gx * G + G / 2, y = gy * G + G / 2;
  let vx = (N.pesoDeriva * dx0) / dl, vy = (N.pesoDeriva * dy0) / dl;
  for (const s of segs) {
    const u = Math.max(0, Math.min(1, ((x - s.x0) * s.tx + (y - s.y0) * s.ty) / s.len));
    const px = s.x0 + (s.x1 - s.x0) * u, py = s.y0 + (s.y1 - s.y0) * u;
    const d2 = (x - px) ** 2 + (y - py) ** 2;
    const w = Math.exp(-d2 / (2 * N.sigmaFluxo ** 2));
    vx += w * s.tx; vy += w * s.ty;
  }
  const l = Math.hypot(vx, vy) || 1;
  fluxo[(gy * gw + gx) * 3] = Math.round(255 * (0.5 + (0.5 * vx) / l));
  fluxo[(gy * gw + gx) * 3 + 1] = Math.round(255 * (0.5 + (0.5 * vy) / l));
}
const fluxoG = await sharp(fluxo, { raw: { width: gw, height: gh, channels: 3 } }).resize(W, H, { kernel: 'cubic' }).raw().toBuffer();

const mapa = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  mapa[i * 4] = densB[i];
  mapa[i * 4 + 1] = fluxoG[i * 3];
  mapa[i * 4 + 2] = fluxoG[i * 3 + 1];
  mapa[i * 4 + 3] = 255;
}
await sharp(mapa, { raw: { width: W, height: H, channels: 4 } }).png().toFile(OUT + '/neblina-mapa.png');

// The light: the amber windows of dados.json as soft pools (radius grows with the window's area).
const dados = JSON.parse(fs.readFileSync(P + 'dados.json', 'utf8'));
const luzF = new Float32Array(W * H);
for (const g of dados.grupos) {
  if (g.tipo !== 'janela') continue;
  const cx = (g.x + g.w / 2) * K, cy = (g.y + g.h / 2) * K;
  const r = (N.luzRaio[0] + N.luzRaio[1] * Math.sqrt(g.n)) * K;
  const a = 0.35 + 0.65 * Math.min(1, g.n / 18);
  const R = Math.ceil(r * 2.5);
  for (let y = Math.max(0, Math.floor(cy - R)); y < Math.min(H, cy + R); y++) for (let x = Math.max(0, Math.floor(cx - R)); x < Math.min(W, cx + R); x++) {
    luzF[y * W + x] += a * Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (2 * r * r));
  }
}
const luz = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const v = Math.round(255 * (1 - Math.exp(-N.luzTeto * luzF[i])));
  luz[i * 4] = luz[i * 4 + 1] = luz[i * 4 + 2] = v; luz[i * 4 + 3] = 255;
}
const luzB = await sharp(luz, { raw: { width: W, height: H, channels: 4 } }).blur(N.luzBorrao).png().toBuffer();
fs.writeFileSync(OUT + '/neblina-luz.png', luzB);

// For checking: density (blue-grey), light (amber) and flow arrows over the painting.
const full = await sharp(P + 'ceu.png').composite([{ input: P + 'cidade.png' }]).png().toBuffer();
const base = await sharp(full).resize(W, H).raw().toBuffer({ resolveWithObject: true });
const ch = base.info.channels;
const luzR = await sharp(luzB).raw().toBuffer();
const conf = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) {
  const d = densB[i] / 255, l = luzR[i * 4] / 255;
  for (let c = 0; c < 3; c++) {
    let v = base.data[i * ch + c] * 0.55;
    v = v * (1 - 0.75 * d) + [120, 150, 190][c] * 0.75 * d;
    v += [255, 170, 80][c] * 0.6 * l * d;
    conf[i * 3 + c] = Math.min(255, v);
  }
}
for (let gy = 6; gy < H; gy += 24) for (let gx = 6; gx < W; gx += 24) {
  const i = gy * W + gx; const vx = fluxoG[i * 3] / 127.5 - 1, vy = fluxoG[i * 3 + 1] / 127.5 - 1;
  for (let s = 0; s < 10; s++) { const X = Math.round(gx + vx * s), Y = Math.round(gy + vy * s); if (X < W && Y < H && X >= 0 && Y >= 0) { const j = (Y * W + X) * 3; conf[j] = 255; conf[j + 1] = s > 6 ? 255 : 60; conf[j + 2] = 60; } }
}
await sharp(conf, { raw: { width: W, height: H, channels: 3 } }).png().toFile(OUT + '/neblina-conferir.png');
console.log('ok', OUT);

// The seamless noise: periodic value-noise fbm (every octave's period divides 256, so it tiles).
const RN = 256;
const ruido = Buffer.alloc(RN * RN * 3);
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const sm3 = (t) => t * t * (3 - 2 * t);
const valor = (x, y, per, s) => {
  const c = RN / per, gx = x / c, gy = y / c, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = sm3(gx - x0), fy = sm3(gy - y0);
  const h = (i, j) => hash(((i % per) + per) % per, ((j % per) + per) % per, s);
  return (h(x0, y0) * (1 - fx) + h(x0 + 1, y0) * fx) * (1 - fy) + (h(x0, y0 + 1) * (1 - fx) + h(x0 + 1, y0 + 1) * fx) * fy;
};
for (let c = 0; c < 3; c++) {
  const vals = new Float32Array(RN * RN); let mn = 9, mx = -9;
  for (let y = 0; y < RN; y++) for (let x = 0; x < RN; x++) {
    let v = 0, a = 0.5, per = 4;
    for (let o = 0; o < 5; o++) { v += a * valor(x, y, per, 17 + c * 101 + o * 7); a *= 0.5; per *= 2; }
    vals[y * RN + x] = v; mn = Math.min(mn, v); mx = Math.max(mx, v);
  }
  for (let i = 0; i < RN * RN; i++) ruido[i * 3 + c] = Math.round((255 * (vals[i] - mn)) / (mx - mn));
}
await sharp(ruido, { raw: { width: RN, height: RN, channels: 3 } }).png().toFile(OUT + '/neblina-ruido.png');
console.log('ruido ok');
