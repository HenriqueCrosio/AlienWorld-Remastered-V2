// 28/10 — THE VEINS OF THE LIVE HEAD (S1, spec `2026-10-28-serpente-luta-s1-design.md` §5 — him, for the star: *"Algo
// que marque ela de uma forma mais orgânica"*; his pick: the veins lit). For each head form (A three heads, B two, C
// one) and each of its 9 animation frames, two overlays baked in pixels on the art's own grid:
//   - `serpente-veias-<F>-<i>.png`: the LIVE head's accent pixels, in their own colour (the game draws it in ADD, its
//     alpha beating like a heart);
//   - `serpente-sombra-<F>-<i>.png`: the OTHER living heads' accent pixels, ~55% darker (NORMAL): only the live one lit.
// Measured on 28/10: colour alone does not tell the heads apart (the cyan seams run down the body and through the green
// head too; the orange head's orange is darker than `#ff9040`) — so each head's mask is its HUE inside the region of
// its head and neck, drawn per form on the 3× grid (art px, the image's own coordinates).
// And the sheet of the masks (frames 0, 3, 6 of each form, ×2): the art darkened, the veins in their colour, the
// shadowed accents in grey.
//   node scripts/_serpente/_veias.mjs <dir de saída dos PNGs> <folha.png>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [OUT, FOLHA] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });

/** hue (deg), saturation and value floors per accent */
const MATIZ = {
  ciano: { h: [168, 206], s: 0.35, v: 0.45 },
  verde: { h: [88, 166], s: 0.3, v: 0.4 },
  // (+ the warm WHITE of its lit barrels: the 1-head form's head opens into a cluster in frames 3, 5, 7)
  laranja: { h: [8, 50], s: 0.45, v: 0.4, quente: { s: 0.1, v: 0.82 } },
};
/** the heads' regions (head + neck), art px of each form's own frames */
const CABECAS = {
  ciano: [[4, 14], [40, 6], [72, 14], [86, 40], [93, 70], [97, 152], [58, 152], [50, 100], [44, 82], [18, 80], [2, 60]],
  verde: [[88, 2], [152, 2], [154, 60], [142, 82], [130, 110], [124, 152], [97, 152], [95, 100], [88, 62]],
  laranja: [[148, 22], [226, 22], [232, 100], [208, 126], [164, 134], [146, 102]],
  // (the 1-head form's head rises to the frame's top in its idle — frames 3, 5, 7: the region goes up to y 0)
  laranjaC: [[132, 0], [238, 0], [238, 106], [210, 132], [160, 140], [132, 108]],
};
const FORMAS = {
  A: { arq: 'serpente-anim', viva: ['ciano', 'ciano'], outras: [['verde', 'verde'], ['laranja', 'laranja']] },
  B: { arq: 'serpente-2c-anim', viva: ['verde', 'verde'], outras: [['laranja', 'laranja']] },
  C: { arq: 'serpente-1c-anim', viva: ['laranjaC', 'laranja'], outras: [] },
};

const dentro = (x, y, pol) => {
  let c = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i], [xj, yj] = pol[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255];
};
const doMatiz = (r, g, b, m) => {
  const [h, s, v] = hsv(r, g, b);
  return h >= m.h[0] && h <= m.h[1] && ((s >= m.s && v >= m.v) || (m.quente && s >= m.quente.s && v >= m.quente.v));
};

const paineis = [];
const contas = {};
for (const [F, cfg] of Object.entries(FORMAS)) {
  for (let i = 0; i < 9; i++) {
    const { data, info } = await sharp(`public/sprites/${cfg.arq}-${i}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const veias = Buffer.alloc(data.length), sombra = Buffer.alloc(data.length);
    let nv = 0, ns = 0;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const k = (y * info.width + x) * 4;
      if (data[k + 3] < 128) continue;
      const [r, g, b] = [data[k], data[k + 1], data[k + 2]];
      const [regV, matV] = cfg.viva;
      if (dentro(x + 0.5, y + 0.5, CABECAS[regV]) && doMatiz(r, g, b, MATIZ[matV])) {
        veias[k] = r; veias[k + 1] = g; veias[k + 2] = b; veias[k + 3] = 255;
        nv++;
        continue;
      }
      for (const [reg, mat] of cfg.outras) {
        if (dentro(x + 0.5, y + 0.5, CABECAS[reg]) && doMatiz(r, g, b, MATIZ[mat])) {
          sombra[k] = Math.round(r * 0.45); sombra[k + 1] = Math.round(g * 0.45); sombra[k + 2] = Math.round(b * 0.45); sombra[k + 3] = 255;
          ns++;
          break;
        }
      }
    }
    contas[`${F}${i}`] = [nv, ns];
    await sharp(veias, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(path.join(OUT, `serpente-veias-${F}-${i}.png`));
    if (cfg.outras.length) await sharp(sombra, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(path.join(OUT, `serpente-sombra-${F}-${i}.png`));
    // the sheet's panel: the art at 35%, the veins in full colour, the shadowed accents in mid grey
    if (FOLHA && [0, 3, 6].includes(i)) {
      const pin = Buffer.alloc(info.width * info.height * 3);
      for (let q = 0; q < info.width * info.height; q++) {
        const k = q * 4;
        let [r, g, b] = data[k + 3] >= 128 ? [data[k] * 0.35, data[k + 1] * 0.35, data[k + 2] * 0.35] : [11, 13, 20];
        if (veias[k + 3]) [r, g, b] = [veias[k], veias[k + 1], veias[k + 2]];
        else if (sombra[k + 3]) [r, g, b] = [120, 120, 120];
        pin[q * 3] = r; pin[q * 3 + 1] = g; pin[q * 3 + 2] = b;
      }
      paineis.push({ F, i, buf: await sharp(pin, { raw: { width: info.width, height: info.height, channels: 3 } }).resize(info.width * 2, info.height * 2, { kernel: 'nearest' }).png().toBuffer(), w: info.width * 2, h: info.height * 2 });
    }
  }
}
console.log('pixels (veias, sombra) por quadro:', JSON.stringify(contas));
if (FOLHA) {
  const W = Math.max(...paineis.map((p) => p.w)), H = Math.max(...paineis.map((p) => p.h)), G = 6;
  const comp = paineis.map((p, n) => ({ input: p.buf, left: (n % 3) * (W + G), top: Math.floor(n / 3) * (H + G) }));
  await sharp({ create: { width: 3 * W + 2 * G, height: 3 * H + 2 * G, channels: 3, background: '#05060a' } }).composite(comp).png().toFile(FOLHA);
  console.log('folha:', FOLHA);
}
