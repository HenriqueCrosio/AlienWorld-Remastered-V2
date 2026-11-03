// 03/11 — his answer at the 3rd pause: *"A boca vermelha de carne destoa do restante das animações"*. The ERGUER (the
// rise gesture, 29/10, still played by the B — the common shots, the rain — and by the C — the burst and the fan) opens
// the orange's jaw onto RED FLESH: a dark red throat and a tongue. Every other clip shows that open mouth as the lit
// throat of the approved shot (`tiroC`): the BRASA ramp, the one `boca-laranja.mjs` used on the encirclements.
// This recolours ONLY the jaw: inside a box, the red flesh (hue 338°–12°, saturation ≥ 0.55 — the head's own orange
// lights sit at 23°–34° and stay) of the jaw's patches (the rule is where `comps` is sorted below),
// by its BRIGHTNESS (the max channel: red flesh has almost no green, so the luminance the peach used would sink it all
// into the darkest step) onto the ramp, with a deeper step for the throat's near-black red. The teeth, the plates, the
// neck's red stripe (outside the box) are left. Frames not listed are copied untouched.
//   node boca-erguer.mjs <in-dir> <out-dir> <x0,y0,x1,y1> <frames: 1,2,3> [minimo=25] [incluir=f:x,y/x,y;…]
//     [excluir=f:x,y;…] [conferencia=<png>]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const [IN, OUT, CX, QS, ...resto] = process.argv.slice(2);
const opc = Object.fromEntries(resto.map((a) => a.split('=')));
const [x0, y0, x1, y1] = CX.split(',').map(Number);
const quadros = QS.split(',').map(Number), minimo = Number(opc.minimo ?? 25);
const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255];
};
const carne = (r, g, b) => { const [h, s, v] = hsv(r, g, b); return (h >= 338 || h <= 12) && s >= 0.55 && v >= 0.1; };
// the round-14 BRASA ramp (the approved shot's lit throat), with a deeper first step for the throat's near-black red
const RAMPA = [[40, 14, 12], [70, 26, 22], [150, 52, 26], [206, 84, 36], [236, 118, 48], [250, 150, 74]];
const brasa = (v) => RAMPA[v < 0.2 ? 0 : v < 0.35 ? 1 : v < 0.55 ? 2 : v < 0.75 ? 3 : v < 0.9 ? 4 : 5];
fs.mkdirSync(OUT, { recursive: true });
const n = fs.readdirSync(IN).filter((f) => /^\d+\.png$/.test(f)).length;
const paineis = [];
for (let f = 0; f < n; f++) {
  const arq = path.join(IN, `${f}.png`);
  if (!quadros.includes(f)) { if (path.resolve(IN) !== path.resolve(OUT)) fs.copyFileSync(arq, path.join(OUT, `${f}.png`)); continue; }
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, marca = new Uint8Array(W * H);
  const eh = (x, y) => { const i = (y * W + x) * 4; return data[i + 3] >= 128 && carne(data[i], data[i + 1], data[i + 2]); };
  // the flesh patches inside the box (8-connected); the small ones are not the jaw
  const visto = new Uint8Array(W * H);
  const alvo = [], comps = [];
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (visto[y * W + x] || !eh(x, y)) continue;
    const pilha = [y * W + x], px = [];
    visto[y * W + x] = 1;
    while (pilha.length) {
      const q = pilha.pop(), qx = q % W, qy = (q / W) | 0;
      px.push(q);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = qx + dx, ny = qy + dy;
        if (nx < x0 || ny < y0 || nx >= x1 || ny >= y1 || visto[ny * W + nx] || !eh(nx, ny)) continue;
        visto[ny * W + nx] = 1;
        pilha.push(ny * W + nx);
      }
    }
    comps.push(px);
  }
  // the jaw: the big patches (the throat, the tongue: ≥ `minimo` px), and the small bits sitting in the mouth with them
  // (within 2 px of a big patch, inside the big patches' box) — the eye's red slit, the snout's copper edge, the cheek
  // vents are small and outside; `incluir=`/`excluir=` (per frame: `f:x,y/x,y;f:…`) settle the rest by a point on them
  const pontos = (k) => Object.fromEntries((opc[k] ?? '').split(';').filter(Boolean).map((s) => { const [q, ps] = s.split(':'); return [Number(q), ps.split('/').map((p) => p.split(',').map(Number))]; }));
  const inc = pontos('incluir')[f] ?? [], exc = pontos('excluir')[f] ?? [];
  const tem = (px, lista) => lista.some(([x, y]) => px.includes(y * W + x));
  const grandes = comps.filter((px) => px.length >= minimo);
  const caixa = grandes.flat().reduce((c, q) => { const x = q % W, y = (q / W) | 0; return [Math.min(c[0], x), Math.min(c[1], y), Math.max(c[2], x), Math.max(c[3], y)]; }, [W, H, -1, -1]);
  const gr = new Uint8Array(W * H);
  for (const q of grandes.flat()) gr[q] = 1;
  const perto = (q) => { const x = q % W, y = (q / W) | 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (gr[(y + dy) * W + x + dx]) return true; return false; };
  const dentro = (q) => { const x = q % W, y = (q / W) | 0; return x >= caixa[0] && x <= caixa[2] && y >= caixa[1] && y <= caixa[3]; };
  for (const px of comps) {
    const sim = tem(px, inc) || (!tem(px, exc) && (px.length >= minimo || (px.every(dentro) && px.some(perto))));
    if (sim) alvo.push(...px);
  }
  for (const q of alvo) {
    const i = q * 4, c = brasa(hsv(data[i], data[i + 1], data[i + 2])[2]);
    data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
    marca[q] = 1;
  }
  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(path.join(OUT, `${f}.png`));
  console.log(`quadro ${f}: ${alvo.length} px da boca recoloridos`);
  if (opc.conferencia) {
    const a = Buffer.from(data);
    for (let j = 0; j < marca.length; j++) if (marca[j]) { a[j * 4] = 255; a[j * 4 + 1] = 0; a[j * 4 + 2] = 220; }
    const corte = { left: Math.max(0, x0 - 12), top: Math.max(0, y0 - 12), width: Math.min(W, x1 + 12) - Math.max(0, x0 - 12), height: Math.min(H, y1 + 12) - Math.max(0, y0 - 12) };
    const z = (buf) => sharp(buf, { raw: { width: W, height: H, channels: 4 } }).extract(corte).resize(corte.width * 3, corte.height * 3, { kernel: 'nearest' }).png().toBuffer();
    paineis.push({ antes: await sharp(arq).extract(corte).resize(corte.width * 3, corte.height * 3, { kernel: 'nearest' }).png().toBuffer(), mascara: await z(a), depois: await z(data), w: corte.width * 3, h: corte.height * 3 });
  }
}
if (opc.conferencia && paineis.length) {
  const { w, h } = paineis[0];
  const comp = paineis.flatMap((p, r) => [p.antes, p.mascara, p.depois].map((input, c) => ({ input, left: c * (w + 6), top: r * (h + 6) })));
  await sharp({ create: { width: 3 * (w + 6), height: paineis.length * (h + 6), channels: 4, background: '#05060a' } }).composite(comp).png().toFile(opc.conferencia);
}
