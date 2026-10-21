// BLOCO G · his paintings come with a PAINTED checkerboard for a sky (no alpha channel): the keying and the reduction to
// the game, shared (first written for the Paisagem in `_camadas-chao-f1.mjs`, 20/10).
//   chaveXadrez(src) → { buf, w, h }  RGBA, the checker flooded from the edges that touch it (alpha 0), the edge pixels
//                                      partial by darkness and DECONTAMINATED (the colour of the nearest opaque pixel);
//   reduzir({ buf, w, h }, W, H) → raw RGBA W×H, alpha binary at 200.
import sharp from 'sharp';
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export async function chaveXadrez(src, bordas = ['topo']) {
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const L = new Float32Array(w * h);
  // the checker is NEUTRAL grey/white; a bright ember core is saturated and must never seed or carry the flood
  const neutro = (i) => Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) - Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) < 18;
  for (let i = 0; i < w * h; i++) L[i] = lum(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  const ceu = new Uint8Array(w * h);
  const fila = [];
  const semear = (i) => { if (L[i] > 150 && neutro(i) && !ceu[i]) { ceu[i] = 1; fila.push(i); } };
  // seed the flood from the light neutral pixels ON THE IMAGE'S BORDER only: in every painting of his the checker reaches
  // an edge (the cave frames' openings touch the left edge). ⚠️ Seeding anywhere (the first version, 21/10) also took the
  // white-hot core of an ember INSIDE the rock — neutral and light like the checker — and punched holes in the rock.
  for (let x = 0; x < w; x++) { semear(x); semear((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { semear(y * w); semear(y * w + w - 1); }
  while (fila.length) {
    const i = fila.pop(); const x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx; if (ceu[j] || L[j] <= 150 || !neutro(j)) continue; ceu[j] = 1; fila.push(j);
    }
  }
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    let a = 255;
    if (ceu[i]) a = 0;
    else {
      const x = i % w, y = (i / w) | 0;
      let borda = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && ceu[ny * w + nx]) borda = true; }
      if (borda) a = Math.max(0, Math.min(255, Math.round(((235 - L[i]) / (235 - 40)) * 255)));
    }
    rgba[i * 4] = data[i * 3]; rgba[i * 4 + 1] = data[i * 3 + 1]; rgba[i * 4 + 2] = data[i * 3 + 2]; rgba[i * 4 + 3] = a;
  }
  const cor = Buffer.from(rgba);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; const a = rgba[i * 4 + 3]; if (a === 255 || a === 0) continue;
    let melhor = -1, dm = 1e9;
    for (let r = 1; r <= 6 && melhor < 0; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx; if (rgba[j * 4 + 3] !== 255) continue; const d = dx * dx + dy * dy; if (d < dm) { dm = d; melhor = j; }
    }
    if (melhor >= 0) for (let c = 0; c < 3; c++) cor[i * 4 + c] = rgba[melhor * 4 + c];
  }
  return { buf: cor, w, h };
}

export async function reduzir({ buf, w, h }, W, H) {
  const red = await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).resize(W, H, { kernel: 'lanczos3', premultiplied: true }).raw().toBuffer();
  for (let i = 0; i < W * H; i++) red[i * 4 + 3] = red[i * 4 + 3] >= 200 ? 255 : 0;
  return red;
}
