// Art treatment for the F2 elite picks (05/10):
//   escurecer <in> <out> [fator]  → darkens the STONE (everything that is not the orange crystal), keeps the crystal.
//   reduzir   <in> <out> <escala> → pixel-art downscale: lanczos, then every pixel snapped back to the ORIGINAL palette
//                                    and alpha cut at 50% (no new colours, no soft edges).
//   cratera   <in>                → prints the centroid and box of the orange crystal (where the drone goes).
import sharp from 'sharp';

const [cmd, ...a] = process.argv.slice(2);

const ler = async (f) => {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};
const gravar = (img, f) => sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } }).png().toFile(f);

/** HSV of an rgb pixel: h in degrees, s and v in 0..1. */
const hsv = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max / 255 };
};
const cristal = (r, g, b) => {
  const c = hsv(r, g, b);
  return c.h >= 8 && c.h <= 55 && c.s > 0.35 && c.v > 0.18;
};

if (cmd === 'escurecer') {
  const [inp, out, fatorArg = '0.6'] = a;
  const fator = Number(fatorArg);
  const img = await ler(inp);
  for (let i = 0; i < img.data.length; i += 4) {
    if (!img.data[i + 3]) continue;
    const [r, g, b] = [img.data[i], img.data[i + 1], img.data[i + 2]];
    if (cristal(r, g, b)) continue;
    // Darker and a little less saturated: the F2 stones sit in a dark, desaturated painting.
    const m = (r + g + b) / 3;
    img.data[i] = Math.round((r * 0.85 + m * 0.15) * fator);
    img.data[i + 1] = Math.round((g * 0.85 + m * 0.15) * fator);
    img.data[i + 2] = Math.round((b * 0.85 + m * 0.15) * fator);
  }
  await gravar(img, out);
  console.log(out);
} else if (cmd === 'reduzir') {
  const [inp, out, escalaArg] = a;
  const orig = await ler(inp);
  const paleta = [];
  const vistas = new Set();
  for (let i = 0; i < orig.data.length; i += 4) {
    if (orig.data[i + 3] < 128) continue;
    const k = (orig.data[i] << 16) | (orig.data[i + 1] << 8) | orig.data[i + 2];
    if (!vistas.has(k)) {
      vistas.add(k);
      paleta.push([orig.data[i], orig.data[i + 1], orig.data[i + 2]]);
    }
  }
  const w = Math.round(orig.w * Number(escalaArg));
  const h = Math.round(orig.h * Number(escalaArg));
  const { data } = await sharp(inp).ensureAlpha().resize(w, h, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) {
      data[i + 3] = 0;
      continue;
    }
    data[i + 3] = 255;
    let melhor = paleta[0];
    let dMin = Infinity;
    for (const p of paleta) {
      const d = (p[0] - data[i]) ** 2 + (p[1] - data[i + 1]) ** 2 + (p[2] - data[i + 2]) ** 2;
      if (d < dMin) {
        dMin = d;
        melhor = p;
      }
    }
    [data[i], data[i + 1], data[i + 2]] = melhor;
  }
  await gravar({ data, w, h }, out);
  console.log(out, `${w}x${h}`, `${paleta.length} cores`);
} else if (cmd === 'cratera') {
  const img = await ler(a[0]);
  let sx = 0;
  let sy = 0;
  let n = 0;
  let x0 = img.w;
  let y0 = img.h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 4;
      if (img.data[i + 3] && cristal(img.data[i], img.data[i + 1], img.data[i + 2])) {
        sx += x;
        sy += y;
        n++;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
  console.log(JSON.stringify({ w: img.w, h: img.h, centro: [Math.round(sx / n), Math.round(sy / n)], caixa: [x0, y0, x1, y1] }));
} else {
  console.error('uso: escurecer <in> <out> [fator] | reduzir <in> <out> <escala> | cratera <in>');
  process.exit(1);
}
