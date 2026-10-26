// 25/10 (night) — THE HANGAR LAYERS, cut from HIS painting ("Hangar Futurista com Caças Estacionados") for the
// pre-opening scene where the player picks the ship. He: "utilize bastante fog no cenário atrás, para parecer mais as
// luzes do que detalhes, focar na escolha da nave e não no cenário". So the painting is split in two:
//   - the HANGAR BLOCK (the bay, its pillars, the deck and its underside lights) stays as he painted it;
//   - everything else (the tower above and below, the valley and the cities) goes under a heavy fog: blurred, pulled
//     to the fog colour, and its lights kept as lights (the bright core + a soft bloom) — lights, not details.
// The live fog bands of the scene pass BETWEEN the two (behind the block). Reduced ONCE from the original (lanczos3).
//   node scripts/_hangar/_camadas.mjs <outDir> <k>          (k = 4 for the HD layer, 1 for 384×216)
// Writes: fundo.png (the whole painting, the fog baked outside the block), baia.png (the block, feathered alpha),
// nave-<lado>-<pintura>.png (each parked ship in each paint, cropped to its box), anel-<lado>.png (the orange ring of
// each pad, alone), dados.json (boxes in game px, the light groups).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ORIGINAL, limparNave } from './_limpar-nave.mjs';

const [OUT, K_S = '1'] = process.argv.slice(2);
const K = Number(K_S);
const W = 384 * K, H = 216 * K;
fs.mkdirSync(OUT, { recursive: true });

// 16:9 at full height (887) is 1577 wide: 98 px off each side — the block sits in the middle, as he composed it.
const CORTE = { left: 98, top: 0, width: 1577, height: 887 };
const ESC = (216 * K) / CORTE.height; // layer px per original px

// ─── the original, cleaned ──────────────────────────────────────────────────────────────────────────────────────
const { data: rgb, info } = await sharp(ORIGINAL).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const OW = info.width, OH = info.height;
limparNave(rgb, OW);
const at3 = (x, y) => (y * OW + x) * 3;
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: mx ? d / mx : 0, v: mx / 255 };
};
const deHsv = (h, s, v) => {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((u) => Math.round((u + m) * 255));
};

// ─── 1. The block: a polygon in original px (measured on a 50 px grid of the painting), feathered ────────────────
const BLOCO = [[250, 168], [1492, 168], [1492, 465], [1538, 465], [1538, 575], [1480, 612], [255, 612], [198, 575], [198, 470], [250, 470]];
const dentro = (x, y, P) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const blocoBin = Buffer.alloc(OW * OH);
for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) blocoBin[y * OW + x] = dentro(x + 0.5, y + 0.5, BLOCO) ? 255 : 0;
const PENA = 18; // the feather of the block's edge (original px)
// (sharp hands a blurred 1-channel raw back with 3 channels: take the first.)
const bloco = await sharp(blocoBin, { raw: { width: OW, height: OH, channels: 1 } }).blur(PENA).extractChannel(0).raw().toBuffer();
if (bloco.length !== OW * OH) throw new Error(`block mask has ${bloco.length / (OW * OH)} channels`);

// ─── 2. The fog outside the block ───────────────────────────────────────────────────────────────────────────────
// Lights: the warm strips and windows, the red beacons, the white lamps.
const ehLuz = (r, g, b) => (r >= 140 && r > b + 50) || (r >= 130 && g < 0.42 * r && b < 0.45 * r) || lum(r, g, b) > 200;
const luzes = Buffer.alloc(OW * OH * 3);
for (let s = 0; s < OW * OH; s++) if (ehLuz(rgb[s * 3], rgb[s * 3 + 1], rgb[s * 3 + 2])) rgb.copy(luzes, s * 3, s * 3, s * 3 + 3);
const raw3 = { raw: { width: OW, height: OH, channels: 3 } };
const borrado = await sharp(rgb, raw3).blur(3.5).raw().toBuffer();
const brilho = await sharp(luzes, raw3).blur(9).raw().toBuffer();
// The fog: the painting's dark blue-grey, a bit lifted (the menu's recipe: mid-dark tones ×1.5 + a cold touch).
const NEVOA = [34, 44, 58];
const DENSIDADE = 0.62; // how much of the blurred painting goes to the fog colour
const NUCLEO = 0.7; // the light's own bright core, over the fog
const BLOOM = 1.6;
// The fog THICKENS with the distance from the block (a wide blur of the block as the falloff): the tower right above
// and below it gets a thin veil, the valley the full fog — a hard edge read as a box pasted on the fog.
const RAIO_NEVOA = 70;
const longe = await sharp(blocoBin, { raw: { width: OW, height: OH, channels: 1 } }).blur(RAIO_NEVOA).extractChannel(0).raw().toBuffer();
const fundo = Buffer.alloc(OW * OH * 3);
for (let s = 0; s < OW * OH; s++) {
  const a = bloco[s] / 255; // 1 = inside the block (untouched)
  const ehL = luzes[s * 3] || luzes[s * 3 + 1] || luzes[s * 3 + 2];
  const u = 1 - longe[s] / 255; // 0 at the block, 1 far from it
  const dens = DENSIDADE * (0.45 + 0.55 * u);
  for (let c = 0; c < 3; c++) {
    const i = s * 3 + c;
    let fora = borrado[i] * (1 - dens) + NEVOA[c] * dens;
    if (ehL) fora = fora * (1 - NUCLEO) + rgb[i] * NUCLEO;
    fora = Math.min(255, fora + brilho[i] * BLOOM);
    fundo[i] = Math.round(rgb[i] * a + fora * (1 - a));
  }
}

// ─── 3. The parked ships: masks, and each paint ──────────────────────────────────────────────────────────────────
// Boxes in original px (the ships end at the landing gear, y ≈ 548). The pad rings (ellipses measured on the painting,
// the front arc at y ≈ 511) pass under the ships: their saturated orange is kept out of the hull.
const ANEIS = {
  esq: { cx: 600, cy: 499, rx: 145, ry: 12 },
  dir: { cx: 1180, cy: 499, rx: 155, ry: 12 },
};
const NAVES = [
  // (the jato's upper wing tip reaches y ≈ 385, the "a"'s fins y ≈ 390)
  { lado: 'esq', caixa: { x0: 406, y0: 380, x1: 694, y1: 550 } },
  { lado: 'dir', caixa: { x0: 1056, y0: 380, x1: 1332, y1: 550 } },
];
// Below the belly only the landing gear (dark, neutral) is ship: the warm saturated pixels there are the deck's
// reflections of the lights.
const BARRIGA = 500;
const ehAnel = (x, y, h, s, v, a) => {
  const d = Math.hypot((x - a.cx) / a.rx, (y - a.cy) / a.ry);
  return Math.abs(d - 1) < 0.3 && s > 0.5 && h >= 22 && h <= 55 && v > 0.3;
};
// The ship = everything warm or neutral in its box (the wall and the deck are blue: b > r), minus the ring and the
// specks. The repaint only touches warm coloured pixels, so a bit of deck caught in the mask stays as it was.
function mascaraNave({ x0, y0, x1, y1 }, anel) {
  const bw = x1 - x0, bh = y1 - y0;
  let m = new Uint8Array(bw * bh);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const i = at3(x0 + x, y0 + y), r = rgb[i], g = rgb[i + 1], b = rgb[i + 2];
    const { h, s, v } = hsv(r, g, b);
    const reflexo = y0 + y > BARRIGA && s > 0.35;
    if (r >= b - 2 && lum(r, g, b) > 15 && !reflexo && !ehAnel(x0 + x, y0 + y, h, s, v, anel)) m[y * bw + x] = 1;
  }
  // Specks (< 25 px, 8-connected) go.
  const rot = new Int32Array(bw * bh).fill(-1);
  const tam = [];
  for (let s0 = 0; s0 < bw * bh; s0++) {
    if (!m[s0] || rot[s0] >= 0) continue;
    const fila = [s0]; rot[s0] = tam.length; let c = 0;
    while (fila.length) {
      const q = fila.pop(); c++;
      const qx = q % bw, qy = (q / bw) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = qx + dx, ny = qy + dy;
        if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
        const t = ny * bw + nx;
        if (m[t] && rot[t] < 0) { rot[t] = tam.length; fila.push(t); }
      }
    }
    tam.push(c);
  }
  m = m.map((_, s) => (rot[s] >= 0 && tam[rot[s]] >= 25 ? 1 : 0));
  const fechada = m.slice();
  for (let y = 1; y < bh - 1; y++) for (let x = 1; x < bw - 1; x++) {
    const s = y * bw + x;
    if (m[s]) continue;
    const viz = m[s - 1] + m[s + 1] + m[s - bw] + m[s + bw];
    if (viz >= 3) fechada[s] = 1;
  }
  return { m: fechada, bw, bh };
}
// The paints of the parked ships (his painting: the jato is weathered beige with red stripes — the bone paint; the
// "a" is tan — the orange one). Only the warm, coloured pixels change; the glass, the greys and the dark stay.
const PINTURAS = {
  esq: {
    osso: (h, s, v) => (h >= 18 && h <= 60 ? [h, s * 0.3, v] : [h, s, v]),
    laranja: (h, s, v) => (h >= 18 && h <= 60 ? [27, Math.min(0.75, Math.max(0.6, s * 1.6)), v * 0.97] : [h, s, v]),
  },
  dir: {
    laranja: (h, s, v) => (h >= 12 && h <= 60 ? [24, Math.min(0.72, s * 1.45), v] : [h, s, v]),
    preta: (h, s, v) => (h >= 0 && h <= 70 ? [215, s * 0.12, v * (v > 0.82 ? 0.62 : 0.42)] : [h, s, v]),
  },
};

// ─── 4. Reduce once to the density ──────────────────────────────────────────────────────────────────────────────
const corte3 = (buf) => sharp(buf, raw3).extract(CORTE).resize(W, H, { kernel: 'lanczos3' });
const fundoK = await corte3(fundo).ensureAlpha().raw().toBuffer();
const baiaRGBA = Buffer.alloc(OW * OH * 4);
for (let s = 0; s < OW * OH; s++) { rgb.copy(baiaRGBA, s * 4, s * 3, s * 3 + 3); baiaRGBA[s * 4 + 3] = bloco[s]; }
const baiaK = await sharp(baiaRGBA, { raw: { width: OW, height: OH, channels: 4 } }).extract(CORTE).resize(W, H, { kernel: 'lanczos3' }).raw().toBuffer();
const png = (buf, w, h, f) => sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(OUT, f));
await png(fundoK, W, H, 'fundo.png');
await png(baiaK, W, H, 'baia.png');

const dados = { k: K, w: W, h: H, naves: {}, aneis: {}, luzes: [] };
// A box in original px → its place in game px (the crop moves it left).
const emJogo = (x0, y0, x1, y1) => ({ x: ((x0 - CORTE.left) * ESC) / K, y: ((y0 - CORTE.top) * ESC) / K, w: ((x1 - x0) * ESC) / K, h: ((y1 - y0) * ESC) / K });

for (const { lado, caixa } of NAVES) {
  const { m, bw, bh } = mascaraNave(caixa, ANEIS[lado]);
  const nW = Math.max(1, Math.round(bw * ESC)), nH = Math.max(1, Math.round(bh * ESC));
  for (const [pintura, f] of Object.entries(PINTURAS[lado])) {
    const buf = Buffer.alloc(bw * bh * 4);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const s = y * bw + x;
      if (!m[s]) continue;
      const i = at3(caixa.x0 + x, caixa.y0 + y);
      const { h, s: sa, v } = hsv(rgb[i], rgb[i + 1], rgb[i + 2]);
      const quente = rgb[i] >= rgb[i + 2] && sa > 0.08;
      const [r, g, b] = quente ? deHsv(...f(h, sa, v)) : [rgb[i], rgb[i + 1], rgb[i + 2]];
      buf[s * 4] = r; buf[s * 4 + 1] = g; buf[s * 4 + 2] = b; buf[s * 4 + 3] = 255;
    }
    const red = await sharp(buf, { raw: { width: bw, height: bh, channels: 4 } }).resize(nW, nH, { kernel: 'lanczos3' }).raw().toBuffer();
    // At 384×216 no partial alpha (pixel art); at 4× the edge stays soft, like his painting.
    if (K === 1) for (let i = 3; i < red.length; i += 4) red[i] = red[i] >= 128 ? 255 : 0;
    await png(red, nW, nH, `nave-${lado}-${pintura}.png`);
  }
  dados.naves[lado] = { ...emJogo(caixa.x0, caixa.y0, caixa.x1, caixa.y1), pinturas: Object.keys(PINTURAS[lado]) };
}

// The rings: the saturated orange of each pad's ellipse band, alone (the scene adds it again to light the chosen pad).
for (const [lado, a] of Object.entries(ANEIS)) {
  const x0 = a.cx - a.rx - 8, x1 = a.cx + a.rx + 8, y0 = a.cy - a.ry - 6, y1 = a.cy + a.ry + 6;
  const bw = x1 - x0, bh = y1 - y0;
  const buf = Buffer.alloc(bw * bh * 4);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
    const i = at3(x0 + x, y0 + y);
    const { h, s, v } = hsv(rgb[i], rgb[i + 1], rgb[i + 2]);
    if (!ehAnel(x0 + x, y0 + y, h, s, v, a)) continue;
    const o = (y * bw + x) * 4;
    rgb.copy(buf, o, i, i + 3);
    buf[o + 3] = Math.round(255 * Math.min(1, (v - 0.3) / 0.35));
  }
  const nW = Math.round(bw * ESC), nH = Math.round(bh * ESC);
  const red = await sharp(buf, { raw: { width: bw, height: bh, channels: 4 } }).resize(nW, nH, { kernel: 'lanczos3' }).raw().toBuffer();
  await png(red, nW, nH, `anel-${lado}.png`);
  dados.aneis[lado] = { ...emJogo(x0, y0, x1, y1), cx: ((a.cx - CORTE.left) * ESC) / K, cy: (a.cy * ESC) / K, rx: (a.rx * ESC) / K, ry: (a.ry * ESC) / K };
}

// ─── 5. The light groups (connected lights, original px → game px): for the halos, the beacons, the lamp cones ────
{
  const vis = new Uint8Array(OW * OH);
  for (let y0 = 0; y0 < OH; y0++) for (let x0 = CORTE.left; x0 < CORTE.left + CORTE.width; x0++) {
    const s0 = y0 * OW + x0;
    if (vis[s0] || !(luzes[s0 * 3] || luzes[s0 * 3 + 1] || luzes[s0 * 3 + 2])) continue;
    const fila = [s0]; vis[s0] = 1;
    let n = 0, sx = 0, sy = 0, bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1, sr = 0, sg = 0, sb = 0;
    while (fila.length) {
      const q = fila.pop(); n++;
      const qx = q % OW, qy = (q / OW) | 0;
      sx += qx; sy += qy; bx0 = Math.min(bx0, qx); bx1 = Math.max(bx1, qx); by0 = Math.min(by0, qy); by1 = Math.max(by1, qy);
      sr += rgb[q * 3]; sg += rgb[q * 3 + 1]; sb += rgb[q * 3 + 2];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = qx + dx, ny = qy + dy;
        if (nx < CORTE.left || ny < 0 || nx >= CORTE.left + CORTE.width || ny >= OH) continue;
        const t = ny * OW + nx;
        if (!vis[t] && (luzes[t * 3] || luzes[t * 3 + 1] || luzes[t * 3 + 2])) { vis[t] = 1; fila.push(t); }
      }
    }
    if (n < 6) continue;
    const r = sr / n, g = sg / n, b = sb / n;
    const cx = sx / n, cy = sy / n;
    // A ship's own red stripe or bright hull is not a light of the place.
    if (NAVES.some(({ caixa: c }) => cx >= c.x0 && cx <= c.x1 && cy >= c.y0 && cy <= c.y1)) continue;
    // A beacon is a true red: it keeps some blue (b/r ≈ 0.2); the deep orange of the strips has none (b ≈ 0).
    const tipo = r >= 130 && g < 0.42 * r && b >= 0.15 * r && b < 0.45 * r ? 'farol' : b > r ? 'lampada' : 'quente';
    const noBloco = blocoBin[Math.round(cy) * OW + Math.round(cx)] > 0;
    const caixa = emJogo(bx0, by0, bx1 + 1, by1 + 1);
    dados.luzes.push({
      tipo, noBloco, n,
      x: +(((cx - CORTE.left) * ESC) / K).toFixed(2), y: +((cy * ESC) / K).toFixed(2),
      w: +caixa.w.toFixed(2), h: +caixa.h.toFixed(2),
      cor: [r, g, b].map(Math.round),
    });
  }
  dados.luzes.sort((a, b) => b.n - a.n);
}
fs.writeFileSync(path.join(OUT, 'dados.json'), JSON.stringify(dados, null, 1));
const conta = (t) => dados.luzes.filter((l) => l.tipo === t).length;
console.log(OUT, `k=${K}`, `${W}x${H}`, 'naves', JSON.stringify(Object.fromEntries(Object.entries(dados.naves).map(([k, v]) => [k, [v.x, v.y, v.w, v.h].map((n) => +n.toFixed(1))]))),
  'luzes', dados.luzes.length, `(quentes ${conta('quente')}, faróis ${conta('farol')}, lâmpadas ${conta('lampada')})`);
