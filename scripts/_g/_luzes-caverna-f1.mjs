// BLOCO G · the CAVE HALL alive (21/10, he: "aplique os efeitos de iluminação, brumas, névoa etc no cenário interior")
// — the lights of the hall's three paintings, by the menu's rules (`scripts/_cenario/luzes.mjs`, as the ground of
// `_luzes-chao-f1.mjs`): each warm light is found, LIFTED out by diffusion (the rock behind it) and the lifted pixels
// split into 3 overlays per piece (`cav-<peça>-brasa-<0..2>.png`, same size as the piece): in the game each overlay's
// alpha is how DIM that third is right now — they flicker by thirds, never in unison. Also measured, into
// `caverna.json` → `luzes`:
//   - the strongest embers of the backdrop (their breathing halos);
//   - the cold OPENING of the backdrop (the light source: the centroid of its cold bright pixels) — its halo and the
//     cold shafts come from there.
// ⚠️ Run AFTER `_caverna-f1.mjs` (it rewrites `caverna.json`).
//   node scripts/_g/_luzes-caverna-f1.mjs [dir=public/sprites/f1] [sheetDir=docs/superpowers/folhas/2026-10-21/caverna/vida]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { detectarLuzes, marcarMuda, apagarPorDifusao, lum } from '../_cenario/luzes.mjs';

const [DIR = 'public/sprites/f1', FOLHA = 'docs/superpowers/folhas/2026-10-21/caverna/vida'] = process.argv.slice(2);
fs.mkdirSync(FOLHA, { recursive: true });
const dados = JSON.parse(fs.readFileSync(path.join(DIR, 'caverna.json'), 'utf8'));
const GRUPOS = 3, FORTES = 6;
// the teto and the chão tile sideways: a cluster across their seam is one cluster
const PECAS = { interior: { arq: 'cav-interior.png', envolve: false }, teto: { arq: 'cav-teto.png', envolve: true }, chao: { arq: 'cav-chao.png', envolve: true } };
const luzes = {};

for (const [nome, P] of Object.entries(PECAS)) {
  const { data: img, info } = await sharp(path.join(DIR, P.arq)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const tipo = detectarLuzes(img, W, H, 1);
  for (let s = 0; s < W * H; s++) if (tipo[s] === 2) tipo[s] = 1; // no beacons in a cave: every light is an ember
  const muda = marcarMuda(img, W, H, 1, tipo);
  const apagadas = apagarPorDifusao(img, W, H, muda);
  const rotulo = new Int32Array(W * H).fill(-1);
  const grupos = [];
  for (let s = 0; s < W * H; s++) {
    if (!tipo[s] || rotulo[s] >= 0) continue;
    const id = grupos.length, fila = [s];
    rotulo[s] = id;
    let n = 0, sx = 0, sy = 0;
    while (fila.length) {
      const c = fila.pop(); n++;
      const cx = c % W, cy = (c / W) | 0;
      sx += cx; sy += cy;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        let nx = cx + dx; const ny = cy + dy;
        if (P.envolve) nx = (nx + W) % W; else if (nx < 0 || nx >= W) continue;
        if (ny < 0 || ny >= H) continue;
        const q = ny * W + nx;
        if (tipo[q] && rotulo[q] < 0) { rotulo[q] = id; fila.push(q); }
      }
    }
    grupos.push({ n, x: sx / n, y: sy / n });
  }
  // thirds by order along x: neighbours flicker apart
  const ordem = grupos.map((g, i) => i).sort((a, b) => grupos[a].x - grupos[b].x);
  const terco = new Int32Array(grupos.length);
  ordem.forEach((g, k) => { terco[g] = k % GRUPOS; });
  const dono = (s) => {
    if (rotulo[s] >= 0) return terco[rotulo[s]];
    const x = s % W, y = (s / W) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      let nx = x + dx; const ny = y + dy;
      if (P.envolve) nx = (nx + W) % W; else if (nx < 0 || nx >= W) continue;
      if (ny < 0 || ny >= H) continue;
      const q = ny * W + nx;
      if (rotulo[q] >= 0) return terco[rotulo[q]];
    }
    return 0;
  };
  const camadas = Array.from({ length: GRUPOS }, () => Buffer.alloc(W * H * 4));
  let pixels = 0;
  for (let s = 0; s < W * H; s++) {
    if (!muda[s] || apagadas[s * 4 + 3] === 0) continue;
    apagadas.copy(camadas[dono(s)], s * 4, s * 4, s * 4 + 4);
    pixels++;
  }
  for (let g = 0; g < GRUPOS; g++) await sharp(camadas[g], { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(DIR, `cav-${nome}-brasa-${g}.png`));
  luzes[nome] = { brasas: GRUPOS, chave: `f1-cav-${nome}-brasa` };
  if (nome === 'interior') {
    // the strongest embers, away from the edges (their halos), at least 24 px apart
    const fortes = [];
    for (const g of grupos.filter((g) => g.x > 12 && g.x < W - 12 && g.y > 12 && g.y < H - 12).sort((a, b) => b.n - a.n)) {
      if (fortes.length >= FORTES) break;
      if (fortes.some((f) => Math.hypot(f.x - g.x, f.y - g.y) < 24)) continue;
      fortes.push({ x: Math.round(g.x), y: Math.round(g.y), n: g.n });
    }
    luzes.interior.fortes = fortes;
    // the cold OPENING: the brightest cold pixels (blue above red) — the whole misty right side is cold too, and all of
    // it pulled the centre down onto the valley (first try) — their centroid and spread
    // (the upper part only: the water and the bright mist below are cold and bright too)
    const frios = [];
    for (let y = 0; y < Math.round(H * 0.45); y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, r = img[i], gg = img[i + 1], b = img[i + 2];
      if (b >= r + 6) frios.push([x, y, lum(r, gg, b)]);
    }
    // (almost the whole painting is cold-dark: the brightest 1% of the cold pixels is the opening)
    const corte = frios.map((f) => f[2]).sort((a, b) => a - b)[Math.floor(frios.length * 0.99)];
    const claros = frios.filter((f) => f[2] >= corte);
    const cx = claros.reduce((a, f) => a + f[0], 0) / claros.length, cy = claros.reduce((a, f) => a + f[1], 0) / claros.length;
    const raio = Math.sqrt(claros.reduce((a, [x, y]) => a + (x - cx) ** 2 + (y - cy) ** 2, 0) / claros.length);
    luzes.interior.abertura = { x: Math.round(cx), y: Math.round(cy), raio: Math.round(raio), pixels: claros.length };
  }
  console.log(nome, `${grupos.length} brasas (${pixels} px tirados)`, nome === 'interior' ? JSON.stringify(luzes.interior) : '');
}
dados.luzes = luzes;
fs.writeFileSync(path.join(DIR, 'caverna.json'), JSON.stringify(dados));

// The sheet: each piece lit, and with every ember dimmed (the three overlays on), ×2; the opening and the strong embers
// marked on the backdrop.
for (const [nome, P] of Object.entries(PECAS)) {
  const aceso = await sharp(path.join(DIR, P.arq)).png().toBuffer();
  const { width: W, height: H } = await sharp(aceso).metadata();
  const apagado = await sharp(aceso).composite([0, 1, 2].map((g) => ({ input: path.join(DIR, `cav-${nome}-brasa-${g}.png`) }))).png().toBuffer();
  const par = await sharp({ create: { width: W, height: H * 2 + 2, channels: 4, background: { r: 13, g: 15, b: 21, alpha: 1 } } })
    .composite([{ input: aceso, left: 0, top: 0 }, { input: apagado, left: 0, top: H + 2 }]).png().toBuffer();
  await sharp(par).resize(W * 2, (H * 2 + 2) * 2, { kernel: 'nearest' }).toFile(path.join(FOLHA, `brasas-${nome}.png`));
}
{
  const L = luzes.interior, Z = 2;
  const marcas = [
    `<circle cx="${L.abertura.x * Z}" cy="${L.abertura.y * Z}" r="${L.abertura.raio * Z}" fill="none" stroke="#7fd0ff" stroke-width="2"/>`,
    ...L.fortes.map((f) => `<circle cx="${f.x * Z}" cy="${f.y * Z}" r="12" fill="none" stroke="#ffb347" stroke-width="2"/>`),
  ];
  const fundo = await sharp(path.join(DIR, 'cav-interior.png')).resize(429 * Z, 216 * Z, { kernel: 'nearest' }).png().toBuffer();
  const svg = Buffer.from(`<svg width="${429 * Z}" height="${216 * Z}" xmlns="http://www.w3.org/2000/svg">${marcas.join('')}</svg>`);
  await sharp(fundo).composite([{ input: svg }]).png().toFile(path.join(FOLHA, 'medidas-interior.png'));
}
