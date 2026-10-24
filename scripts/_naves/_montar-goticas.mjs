// 23/10 — THE GOTHIC SHIP, round 1b: the picks of each ladder (T0–T3), cleaned and set in the game's ship canvas
// (44×26, drawing centred), plus the sheet: round 1's gothic row on top (what he saw: "almost no change"), then each
// new ladder in colour AND as a flat silhouette (the tier change has to read without colour).
//   node scripts/_naves/_montar-goticas.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'docs/superpowers/folhas/2026-10-22/naves';
const CRU = path.join(DIR, 'cru/escada');
const OUT = path.join(DIR, 'rodada1b');
const W = 44, H = 26;

// Filled in after opening every candidate enlarged (the triage sheets of `cru/escada`).
const ESCADAS = JSON.parse(fs.readFileSync(path.join(CRU, 'escolhas.json'), 'utf8'));
const RODADA1 = [0, 1, 2, 3].map((t) => path.join(DIR, `rodada1/gotica-t${t}.png`));

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
  let tirados = 0;
  for (let s = 0; s < w * h; s++) if (op(s) && rot[s] !== maior) { px[s * 4 + 3] = 0; tirados++; }
  return tirados;
}

async function montar(arq) {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const tirados = limpar(data, info.width, info.height);
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 40) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const recorte = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: x0, top: y0, width: bw, height: bh }).png().toBuffer();
  const png = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: recorte, left: Math.floor((W - bw) / 2), top: Math.floor((H - bh) / 2) }]).png().toBuffer();
  return { png, bw, bh, tirados };
}

/** The flat silhouette: every opaque pixel in one dark tone (on the sheet's light strip). */
async function silhueta(arq) {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 40) { data[i] = 20; data[i + 1] = 22; data[i + 2] = 29; data[i + 3] = 255; } else data[i + 3] = 0;
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

fs.mkdirSync(OUT, { recursive: true });
const medidas = {};
for (const [nome, tiers] of Object.entries(ESCADAS)) {
  for (const [t, rel] of Object.entries(tiers)) {
    const m = await montar(path.join(CRU, rel + '.png'));
    fs.writeFileSync(path.join(OUT, `${nome}-t${t}.png`), m.png);
    medidas[`${nome}-t${t}`] = `${m.bw}×${m.bh}`;
    console.log(`${nome} T${t}: ${m.bw}×${m.bh}${m.tirados ? ` (${m.tirados} px soltos tirados)` : ''}`);
  }
}
fs.writeFileSync(path.join(OUT, 'medidas.json'), JSON.stringify(medidas, null, 1));

// The sheet: each row = a label, the four tiers in colour on the game's dark, and the same four as silhouettes on a
// light strip underneath.
const Z = 6, CW = W * Z, CH = H * Z, LAB = 22, M = 12, SIL = Math.round(CH * 0.8);
const linhas = [['RODADA 1 (o que você viu)', RODADA1], ...Object.keys(ESCADAS).map((n) => [n.toUpperCase(), [0, 1, 2, 3].map((t) => path.join(OUT, `${n}-t${t}.png`))])];
const ALT = LAB + CH + SIL + M;
const tiles = [];
for (const [r, [nome, arqs]] of linhas.entries()) {
  const top = r * ALT;
  tiles.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${4 * (CW + M)}" height="${LAB}"><text x="4" y="17" font-family="monospace" font-size="16" fill="#d9dde6">${nome}</text></svg>`), left: M, top });
  tiles.push({ input: { create: { width: 4 * (CW + M) - M, height: SIL, channels: 4, background: '#c9ccd3' } }, left: M, top: top + LAB + CH });
  for (const [t, arq] of arqs.entries()) {
    const m = await sharp(arq).metadata();
    const big = (buf) => sharp(buf).resize(m.width * Z, m.height * Z, { kernel: 'nearest' }).png().toBuffer();
    const left = M + t * (CW + M) + Math.round(((W - m.width) * Z) / 2);
    tiles.push({ input: await big(fs.readFileSync(arq)), left, top: top + LAB + Math.round(((H - m.height) * Z) / 2) });
    tiles.push({ input: await big(await silhueta(arq)), left, top: top + LAB + CH + Math.round((SIL - m.height * Z) / 2) });
  }
}
await sharp({ create: { width: M + 4 * (CW + M), height: linhas.length * ALT, channels: 4, background: '#14161d' } })
  .composite(tiles).png().toFile(path.join(OUT, 'escadas.png'));
console.log(path.join(OUT, 'escadas.png'));
