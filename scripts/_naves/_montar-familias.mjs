// 23/10 — the ship families sheet, generic (round 1c on): each row a family T0–T3, cleaned (only the main body stays),
// set in one canvas (drawing centred), in colour on the game's dark AND as a flat silhouette on a light strip.
//   node scripts/_naves/_montar-familias.mjs <config.json>
// config: { "out": dir, "canvas": [w, h], "linhas": [{ "nome": label, "salvar": prefix|null, "arqs": [4 png paths] }] }
// Rows with "salvar" write <out>/<prefix>-t<n>.png (+ medidas.json); the sheet is <out>/familias.png.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const [W, H] = cfg.canvas;
const OUT = cfg.out;

/** Only what touches the main body stays (the Pro leaves loose bits). */
function limpar(px, w, h) {
  const op = (i) => px[i * 4 + 3] > 40;
  const rot = new Int32Array(w * h).fill(-1);
  const tam = [];
  for (let s = 0; s < w * h; s++) {
    if (!op(s) || rot[s] >= 0) continue;
    const id = tam.length, fila = [s];
    rot[s] = id;
    let n = 0;
    while (fila.length) {
      const c = fila.pop(); n++;
      const cx = c % w, cy = (c / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy, q = ny * w + nx;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && op(q) && rot[q] < 0) { rot[q] = id; fila.push(q); }
      }
    }
    tam.push(n);
  }
  const maior = tam.indexOf(Math.max(...tam));
  for (let s = 0; s < w * h; s++) if (op(s) && rot[s] !== maior) px[s * 4 + 3] = 0;
}

async function montar(arq, limpa) {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (limpa) limpar(data, info.width, info.height);
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 40) {
    n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const recorte = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: x0, top: y0, width: bw, height: bh }).png().toBuffer();
  const png = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: recorte, left: Math.floor((W - bw) / 2), top: Math.floor((H - bh) / 2) }]).png().toBuffer();
  return { png, bw, bh, n };
}

async function silhueta(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 40) { data[i] = 20; data[i + 1] = 22; data[i + 2] = 29; data[i + 3] = 255; } else data[i + 3] = 0;
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

fs.mkdirSync(OUT, { recursive: true });
const medidas = {};
const Z = 6, CW = W * Z, CH = H * Z, LAB = 22, M = 12, SIL = Math.round(CH * 0.75);
const ALT = LAB + CH + SIL + M;
const tiles = [];
for (const [r, linha] of cfg.linhas.entries()) {
  const top = r * ALT;
  tiles.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${4 * (CW + M)}" height="${LAB}"><text x="4" y="17" font-family="monospace" font-size="16" fill="#d9dde6">${linha.nome}</text></svg>`), left: M, top });
  tiles.push({ input: { create: { width: 4 * (CW + M) - M, height: SIL, channels: 4, background: '#c9ccd3' } }, left: M, top: top + LAB + CH });
  for (const [t, arq] of linha.arqs.entries()) {
    const m = await montar(arq, linha.salvar !== null);
    if (linha.salvar) {
      fs.writeFileSync(path.join(OUT, `${linha.salvar}-t${t}.png`), m.png);
      medidas[`${linha.salvar}-t${t}`] = `${m.bw}×${m.bh} (${m.n} px)`;
    } else medidas[`${linha.nome}-t${t}`] = `${m.bw}×${m.bh} (${m.n} px)`;
    const big = (buf) => sharp(buf).resize(W * Z, H * Z, { kernel: 'nearest' }).png().toBuffer();
    const left = M + t * (CW + M);
    tiles.push({ input: await big(m.png), left, top: top + LAB });
    tiles.push({ input: await big(await silhueta(m.png)), left, top: top + LAB + CH + Math.round((SIL - CH) / 2) });
  }
}
fs.writeFileSync(path.join(OUT, 'medidas.json'), JSON.stringify(medidas, null, 1));
await sharp({ create: { width: M + 4 * (CW + M), height: cfg.linhas.length * ALT, channels: 4, background: '#14161d' } })
  .composite(tiles).png().toFile(path.join(OUT, 'familias.png'));
console.log(JSON.stringify(medidas, null, 1));
