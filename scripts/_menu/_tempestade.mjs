// BLOCO E · the storm's masks for the menu (spec §4.3), baked once per density so the game doesn't build them (in the
// mock they were built in the page: seconds, and ~37 MB of textures). Reads the city layer from `_camadas.mjs`.
//   node scripts/_menu/_tempestade.mjs <layersDir>      (layersDir holds cidade.png and dados.json)
// Writes <layersDir>/tempestade/: flash0..2.png and nuvem.png at HALF resolution, raio0..2.png at full, each cropped to
// its box, and tempestade.json ({ reducao, flashes, raios, nuvem }: boxes in the layer's full-resolution pixels).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { TEMPESTADE as T } from '../../src/menu/numerosMenu.ts';
import { lcg } from '../../src/menu/acaso.ts';

const [DIR] = process.argv.slice(2);
const OUT = path.join(DIR, 'tempestade');
fs.mkdirSync(OUT, { recursive: true });
const dados = JSON.parse(fs.readFileSync(path.join(DIR, 'dados.json'), 'utf8'));
const K = dados.k, W = dados.w, H = dados.h, REDUCAO = 2;
const cidade = await sharp(path.join(DIR, 'cidade.png')).ensureAlpha().raw().toBuffer();
const sst = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

// The region: his polygon, white on black, blurred (the soft edge).
const pontos = T.regiao.map(([x, y]) => `${x * K},${y * K}`).join(' ');
const svgRegiao = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#000"/><polygon points="${pontos}" fill="#fff"/></svg>`;
const regiao = await sharp(Buffer.from(svgRegiao)).blur(T.borda * K).extractChannel(0).raw().toBuffer();

// Per pixel: how much a flash lights it (the cloud's own brightness; never the warm lit buildings) and where a bolt or
// the rolling cloud may show (not over the near-black silhouettes: they stand in front of the storm).
const nuvem = new Float32Array(W * H), ceu = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
  const j = i * 4;
  if (cidade[j + 3] < 255) continue;
  const r = cidade[j], g = cidade[j + 1], b = cidade[j + 2], l = 0.3 * r + 0.59 * g + 0.11 * b;
  if (r > b + 20) continue;
  const m = regiao[i] / 255;
  nuvem[i] = sst(14, 70, l) * m;
  ceu[i] = sst(4, 11, l) * m;
}

const caixaDe = (alfa) => {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alfa(x, y) > 0.002) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const m = 2;
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(W - 1, x1 + m); y1 = Math.min(H - 1, y1 + m);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
};
const gravar = async (nome, alfa, caixa, reduzir) => {
  const buf = Buffer.alloc(caixa.w * caixa.h * 4);
  for (let y = 0; y < caixa.h; y++) for (let x = 0; x < caixa.w; x++) {
    const o = (y * caixa.w + x) * 4;
    buf[o] = buf[o + 1] = buf[o + 2] = 255;
    buf[o + 3] = Math.round(255 * Math.min(1, alfa(caixa.x + x, caixa.y + y)));
  }
  let img = sharp(buf, { raw: { width: caixa.w, height: caixa.h, channels: 4 } });
  if (reduzir) img = img.resize(Math.ceil(caixa.w / REDUCAO), Math.ceil(caixa.h / REDUCAO), { kernel: 'lanczos3' });
  await img.png().toFile(path.join(OUT, `${nome}.png`));
};

const regiaoCaixa = caixaDe((x, y) => regiao[y * W + x] / 255);

// The flashes: the cloud's own light × a soft falloff from where the discharge is.
const flashes = [];
for (const [n, [fx, fy, raio]] of T.focos.entries()) {
  const alfa = (x, y) => {
    const d = Math.hypot(x / K - fx, y / K - fy) / raio;
    return nuvem[y * W + x] * Math.max(0, 1 - d * d);
  };
  await gravar(`flash${n}`, alfa, regiaoCaixa, true);
  flashes.push(regiaoCaixa);
}

// The bolts: a jagged line (midpoint displacement) with one branch — the same draws as the mock (window.__rnd(91)) —
// soft wide strokes under sharp ones, cut by the sky mask.
const rr = lcg(T.semente);
const linha = (p, q, nivel) => {
  let pts = [p, q];
  for (let it = 0; it < nivel; it++) {
    const nv = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0), o = (rr() - 0.5) * L * 0.42;
      nv.push([(x0 + x1) / 2 - ((y1 - y0) / L) * o, (y0 + y1) / 2 + ((x1 - x0) / L) * o], pts[i]);
    }
    pts = nv;
  }
  return pts;
};
const raios = [];
for (const [n, [a, b]] of T.raios.entries()) {
  const tronco = linha(a, b, 6);
  const meio = tronco[Math.floor(tronco.length * (0.35 + rr() * 0.25))];
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (rr() < 0.5 ? -1 : 1) * (0.5 + rr() * 0.4);
  const L2 = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.4;
  const galho = linha(meio, [meio[0] + Math.cos(ang) * L2, meio[1] + Math.sin(ang) * L2], 5);
  const traco = (pts, larg, op) =>
    `<polyline points="${pts.map(([x, y]) => `${x * K},${y * K}`).join(' ')}" fill="none" stroke="#fff" stroke-opacity="${op}" stroke-width="${larg * K}" stroke-linejoin="round"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${traco(tronco, 1.6, 0.22)}${traco(galho, 1.1, 0.16)}${traco(tronco, 0.5, 1)}${traco(galho, 0.35, 0.85)}</svg>`;
  const px = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
  const alfa = (x, y) => (px[(y * W + x) * 4 + 3] / 255) * ceu[y * W + x];
  const caixa = caixaDe(alfa);
  await gravar(`raio${n}`, alfa, caixa, false);
  raios.push(caixa);
}

// The rolling cloud's mask: the sky of the region, fading out above the rooftops (y 58–80).
const nuvemAlfa = (x, y) => ceu[y * W + x] * (1 - sst(T.rolar.someDe, T.rolar.someAte, y / K));
const nuvemCaixa = caixaDe(nuvemAlfa);
await gravar('nuvem', nuvemAlfa, nuvemCaixa, true);

fs.writeFileSync(path.join(OUT, 'tempestade.json'), JSON.stringify({ reducao: REDUCAO, flashes, raios, nuvem: nuvemCaixa }, null, 1));
console.log(OUT, `k=${K}`, 'região', regiaoCaixa, 'raios', raios.map((c) => `${c.w}×${c.h}`).join(' '));
