// BLOCO G · round 5 (exploration) — his two ground paintings (20/10, 1768×890, the painting's own frame) keyed and
// reduced to the game (429×216), composed over the painting in both orders. Out: <dir>/compo-*.png at ×3.
//   node scripts/_g/_chao-compor.mjs <outDir>
import sharp from 'sharp';
const R = 'assets/raw/';
const V = R + 'Valle Industrial Devastado sob Céu Transparente.png';
const P = R + 'Paisagem Montanhosa Sombria com Brasas.png';
const OUT = process.argv[2];
const W = 429, H = 216;
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// The Paisagem has a PAINTED checkerboard for a sky (no alpha). Key: flood the sky from the top edge through light
// pixels (L > 150); the pixels the flood reaches are sky (alpha 0); their dark-ish neighbours on the edge get a partial
// alpha by luminance; colours of partial pixels are replaced by the nearest opaque interior colour (no light halo).
async function chaveXadrez(src) {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = lum(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  const ceu = new Uint8Array(w * h);
  const fila = [];
  for (let x = 0; x < w; x++) if (L[x] > 150) { ceu[x] = 1; fila.push(x); }
  while (fila.length) {
    const i = fila.pop(); const x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx; if (ceu[j] || L[j] <= 150) continue; ceu[j] = 1; fila.push(j);
    }
  }
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    let a = 255;
    if (ceu[i]) a = 0;
    else {
      // an edge pixel (touching the sky): alpha from how dark it is against the checker (~232..254)
      const x = i % w, y = (i / w) | 0;
      let borda = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && ceu[ny * w + nx]) borda = true; }
      if (borda) a = Math.max(0, Math.min(255, Math.round(((235 - L[i]) / (235 - 40)) * 255)));
    }
    rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = a;
  }
  // decontaminate: any pixel with alpha < 255 takes the colour of the nearest fully opaque pixel (search up to 6 px)
  const cor = Buffer.from(rgba);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (rgba[i * 4 + 3] === 255 || rgba[i * 4 + 3] === 0) continue;
    let melhor = -1, dm = 1e9;
    for (let r = 1; r <= 6 && melhor < 0; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx; if (rgba[j * 4 + 3] !== 255) continue; const d = dx * dx + dy * dy; if (d < dm) { dm = d; melhor = j; }
    }
    if (melhor >= 0) for (let c = 0; c < 3; c++) cor[i * 4 + c] = rgba[melhor * 4 + c];
  }
  return { buf: cor, w, h };
}

// Reduce like the painting (lanczos3 to 429×216), premultiplied, then the alpha binarised at 50% (pixel art).
async function reduzir(rgba, w, h) {
  const red = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).resize(W, H, { kernel: 'lanczos3', premultiplied: true }).raw().toBuffer();
  for (let i = 0; i < W * H; i++) red[i * 4 + 3] = red[i * 4 + 3] >= 128 ? 255 : 0;
  return red;
}
const pais = await chaveXadrez(P);
const paisR = await reduzir(pais.buf, pais.w, pais.h);
const vale = await sharp(V).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// the Valle's smoke is semi-transparent: keep its alpha (no binarising) for the look test; the solid ground is binary
const valeR = await sharp(vale.data, { raw: { width: vale.info.width, height: vale.info.height, channels: 4 } }).resize(W, H, { kernel: 'lanczos3', premultiplied: true }).raw().toBuffer();
await sharp(paisR, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${OUT}/paisagem-429.png`);
await sharp(valeR, { raw: { width: W, height: H, channels: 4 } }).png().toFile(`${OUT}/vale-429.png`);
// top of the opaque content per column (game px), to read the skylines
for (const [n, b] of [['paisagem', paisR], ['vale', valeR]]) {
  const topo = [];
  for (let x = 0; x < W; x += 1) { let y = 0; while (y < H && b[(y * W + x) * 4 + 3] < 200) y++; topo.push(y); }
  const amostra = topo.filter((_, i) => i % 26 === 0);
  console.log(n, 'topo min', Math.min(...topo), 'max', Math.max(...topo), 'amostra', amostra.join(' '));
}
const pint = 'public/sprites/f1/pintura.png';
const comp = async (ordem, nome) => {
  const camadas = ordem.map((b) => ({ input: b, raw: { width: W, height: H, channels: 4 }, left: 0, top: 0 }));
  const cheia = await sharp(pint).composite(camadas).png().toBuffer();
  const img = await sharp(cheia).extract({ left: 22, top: 0, width: 384, height: H }).png().toBuffer();
  await sharp(img).resize(384 * 3, H * 3, { kernel: 'nearest' }).toFile(`${OUT}/compo-${nome}.png`);
};
await comp([paisR, valeR], 'paisagem-atras');
await comp([valeR, paisR], 'vale-atras');
await comp([paisR], 'so-paisagem');
await comp([valeR], 'so-vale');
