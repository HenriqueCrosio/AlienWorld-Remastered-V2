// 02/11 — his note: *"as novas gerações da cabeça laranja deixaram ela, de novo, com a boca natural de carne e mais
// vermelha, as animações anteriores aprovadas têm a boca mais alaranjada"*. The generator filled the orange's open jaw
// (under the cannon, in the encirclement's and the B gas' new clips) with the plates' own peach and terracotta — a
// tongue of flesh. In the approved clips (`tiroC`, cleaned on 02/11) the open mouth is the lit throat: the BRASA ramp.
// This recolours ONLY the jaw's opening: inside a box per frame, the pixels of the flesh palette (the peach, the
// terracotta, the mauve-brown), by their brightness onto the BRASA ramp (the round-14 cleaning's). The teeth, the
// cannon, the stripes are left. Frames not listed are copied untouched.
// On the B head (bigger: its lens is wider than the disc, its vents and its eye share the peach) the box alone hits
// them too — there, `sementes=` gives one point per listed frame (`x,y;x,y;…`) and ONLY the flesh patch nearest to it
// (8-connected, inside the box) is recoloured: the jaw's own patch, picked on a numbered zoom.
//   node boca-laranja.mjs <in-dir> <out-dir> <x0,y0,x1,y1> <frames: 1,2,3|todos> [sementes=x,y;…] [conferencia=<png>]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [IN, OUT, CX, QS, ...resto] = process.argv.slice(2);
const opc = Object.fromEntries(resto.map((a) => a.split('=')));
const [x0, y0, x1, y1] = CX.split(',').map(Number);
const n = fs.readdirSync(IN).filter((f) => /^\d+\.png$/.test(f)).length;
const quadros = QS === 'todos' ? [...Array(n).keys()] : QS.split(',').map(Number);
// the flesh palette the generator used inside the jaw (measured 02/11 on the new frames)
const CARNE = new Set(['228,152,108', '176,99,69', '108,74,71', '92,69,80', '218,156,118', '176,95,69', '107,72,69']);
const BRASA = [[70, 26, 22], [150, 52, 26], [206, 84, 36], [236, 118, 48], [250, 150, 74]];
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const brasa = (l) => BRASA[l > 150 ? 3 : l > 105 ? 2 : l > 85 ? 1 : 0];
fs.mkdirSync(OUT, { recursive: true });
const paineis = [];
for (let f = 0; f < n; f++) {
  const arq = path.join(IN, `${f}.png`);
  if (!quadros.includes(f)) { if (path.resolve(IN) !== path.resolve(OUT)) fs.copyFileSync(arq, path.join(OUT, `${f}.png`)); continue; }
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, marca = new Uint8Array(W * info.height);
  // the cannon's LENS (its muzzle) shares the peach: found by its pale hot core inside the box (the brightest peach
  // cluster), and a disc of `lente` px around it is left alone
  let lx = 0, ly = 0, ln = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4;
    if (data[i + 3] >= 128 && data[i] > 225 && data[i + 1] > 168 && data[i + 2] < 190) { lx += x; ly += y; ln++; }
  }
  const lente = Number(opc.lente ?? 8), L = ln ? { x: lx / ln, y: ly / ln } : null;
  const ehCarne = (x, y) => { const i = (y * W + x) * 4; return data[i + 3] >= 128 && CARNE.has(`${data[i]},${data[i + 1]},${data[i + 2]}`); };
  // the seed's patch: the 8-connected flesh patch (inside the box) nearest to this frame's seed
  let mancha = null;
  if (opc.sementes) {
    const [sx, sy] = opc.sementes.split(';')[quadros.indexOf(f)].split(',').map(Number);
    const seen = new Uint8Array(W * info.height);
    let melhor = Infinity;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (seen[y * W + x] || !ehCarne(x, y)) continue;
      const pilha = [y * W + x], px = [];
      seen[y * W + x] = 1;
      while (pilha.length) {
        const q = pilha.pop(), qx = q % W, qy = (q / W) | 0;
        px.push(q);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = qx + dx, ny = qy + dy;
          if (nx < x0 || ny < y0 || nx >= x1 || ny >= y1 || seen[ny * W + nx] || !ehCarne(nx, ny)) continue;
          seen[ny * W + nx] = 1;
          pilha.push(ny * W + nx);
        }
      }
      const d = Math.min(...px.map((q) => Math.hypot((q % W) - sx, ((q / W) | 0) - sy)));
      if (d < melhor) { melhor = d; mancha = new Set(px); }
    }
  }
  let k = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = (y * W + x) * 4;
    if (!ehCarne(x, y)) continue;
    if (mancha) { if (!mancha.has(y * W + x)) continue; } else {
      if (L && Math.hypot(x - L.x, y - L.y) <= lente) continue;
      // (the lens's whole left side, rim included: the jaw opens to its right, and the teeth row runs below it)
      if (L && x < L.x + 2 && y < L.y + 7) continue;
    }
    const c = brasa(lum(data[i], data[i + 1], data[i + 2]));
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
    marca[y * W + x] = 1;
    k++;
  }
  await sharp(data, { raw: { width: W, height: info.height, channels: 4 } }).png().toFile(path.join(OUT, `${f}.png`));
  console.log(`quadro ${f}: ${k} px da boca recoloridos`);
  if (opc.conferencia) {
    const a = Buffer.from(data);
    for (let j = 0; j < marca.length; j++) if (marca[j]) { a[j * 4] = 255; a[j * 4 + 1] = 0; a[j * 4 + 2] = 220; }
    const corte = { left: Math.max(0, x0 - 20), top: Math.max(0, y0 - 20), width: Math.min(W, x1 + 20) - Math.max(0, x0 - 20), height: Math.min(info.height, y1 + 20) - Math.max(0, y0 - 20) };
    const antes = await sharp(arq).extract(corte).resize(corte.width * 4, corte.height * 4, { kernel: 'nearest' }).png().toBuffer();
    const depois = await sharp(data, { raw: { width: W, height: info.height, channels: 4 } }).extract(corte).resize(corte.width * 4, corte.height * 4, { kernel: 'nearest' }).png().toBuffer();
    const mascara = await sharp(a, { raw: { width: W, height: info.height, channels: 4 } }).extract(corte).resize(corte.width * 4, corte.height * 4, { kernel: 'nearest' }).png().toBuffer();
    paineis.push({ antes, mascara, depois, w: corte.width * 4, h: corte.height * 4 });
  }
}
if (opc.conferencia && paineis.length) {
  const { w, h } = paineis[0];
  const comp = paineis.flatMap((p, r) => [p.antes, p.mascara, p.depois].map((input, c) => ({ input, left: c * (w + 6), top: r * (h + 6) })));
  await sharp({ create: { width: 3 * (w + 6), height: paineis.length * (h + 6), channels: 4, background: '#05060a' } }).composite(comp).png().toFile(opc.conferencia);
}
