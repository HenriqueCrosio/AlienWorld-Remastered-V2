// 22/10 — THE NEW HUMAN SHIPS, round 1: the picks of each direction (T0–T3), cleaned and set in the game's ship
// canvas, plus the family sheet. The picks were made by opening every candidate enlarged (`cru/familia`, `cru/ancora`).
//   node scripts/_naves/_montar-rodada1.mjs
// Writes `folhas/2026-10-22/naves/rodada1/<direction>-t<n>.png` (44×26, the drawing centred: the 21×9 hitbox, centred
// in the canvas, lands on the hull) and `familias.png` (the three families at 6×, with today's ships on top).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'docs/superpowers/folhas/2026-10-22/naves';
const CRU = path.join(DIR, 'cru');
const OUT = path.join(DIR, 'rodada1');
const W = 44, H = 26;

const ESCOLHAS = {
  // (22/10: the lance T0 came from a 2nd batch — the 1st was blurry and bigger than the T1; the armor T3 is the twin-engine
  // candidate of the anchor batch — its T3 batch came out as T2 copies.)
  lanca: { 0: 'familia-t0b/lanca-t0-12-53', 1: 'familia/lanca-t1-111-42', 2: 'ancora/lanca-t2-101-13', 3: 'familia/lanca-t3-111-41' },
  couraca: { 0: 'familia/couraca-t0-11-26', 1: 'familia/couraca-t1-222-43', 2: 'ancora/couraca-t2-202-5', 3: 'ancora/couraca-t2-202-7' },
  gotica: { 0: 'familia/gotica-t0-11-22', 1: 'familia/gotica-t1-444-21', 2: 'ancora/gotica-t2-404-20', 3: 'familia/gotica-t3-444-57' },
};
const HOJE = ['public/sprites/naves/humana-t0.png', 'public/sprites/ship-jato.png', 'public/sprites/naves/humana-t2.png', 'public/sprites/naves/humana-t3.png'];

/** Only what touches the main body stays (the Pro leaves loose bits: a dash left of the flame, stray pixels). */
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

fs.mkdirSync(OUT, { recursive: true });
const medidas = {};
for (const [dir, tiers] of Object.entries(ESCOLHAS)) {
  for (const [t, rel] of Object.entries(tiers)) {
    const m = await montar(path.join(CRU, rel + '.png'));
    fs.writeFileSync(path.join(OUT, `${dir}-t${t}.png`), m.png);
    medidas[`${dir}-t${t}`] = `${m.bw}×${m.bh}`;
    console.log(`${dir} T${t}: ${m.bw}×${m.bh}${m.tirados ? ` (${m.tirados} px soltos tirados)` : ''}`);
  }
}
fs.writeFileSync(path.join(OUT, 'medidas.json'), JSON.stringify(medidas, null, 1));

// The family sheet: today's row, then the three directions, T0 → T3, at 6×, on the game's dark.
const Z = 6, CW = W * Z, CH = H * Z, LAB = 22, M = 12;
const linhas = [['hoje', HOJE], ...Object.keys(ESCOLHAS).map((d) => [d, [0, 1, 2, 3].map((t) => path.join(OUT, `${d}-t${t}.png`))])];
const NOMES = { hoje: 'HOJE', lanca: 'A · LANÇA', couraca: 'B · COURAÇA', gotica: 'C · GÓTICA' };
const tiles = [];
for (const [r, [nome, arqs]] of linhas.entries()) {
  const top = r * (CH + LAB + M);
  tiles.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${4 * (CW + M)}" height="${LAB}"><text x="4" y="17" font-family="monospace" font-size="16" fill="#d9dde6">${NOMES[nome]}</text></svg>`), left: M, top });
  for (const [t, arq] of arqs.entries()) {
    const m = await sharp(arq).metadata();
    const img = await sharp(arq).resize(m.width * Z, m.height * Z, { kernel: 'nearest' }).png().toBuffer();
    tiles.push({ input: img, left: M + t * (CW + M) + Math.round(((W - m.width) * Z) / 2), top: top + LAB + Math.round(((H - m.height) * Z) / 2) });
  }
}
await sharp({ create: { width: M + 4 * (CW + M), height: linhas.length * (CH + LAB + M), channels: 4, background: '#14161d' } })
  .composite(tiles).png().toFile(path.join(OUT, 'familias.png'));
console.log(path.join(OUT, 'familias.png'));
