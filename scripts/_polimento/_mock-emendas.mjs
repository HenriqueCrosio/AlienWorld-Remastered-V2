// 14/10 — MOCK-UPS of seam fixes, made OFF the game (nothing installed): (1) the duct border `f4-faixa-c` made to TILE
// (the left-to-right light gradient flattened, then the ends wrapped onto each other) and (2) the ribs `f4-faixa-b`
// likewise, each as three tiles in a row, before × after; (3) the dense rock belt `belt-2` with its straight ends
// dissolved, tinted and scaled as Parallax draws it over the F3 painting; (4) the F4 chamber painting entering with a
// soft edge instead of a straight one. Magnified with nearest. These are previews of a direction, not the final art.
//   node scripts/_polimento/_mock-emendas.mjs <out dir>
import fs from 'node:fs';
import sharp from 'sharp';

const [OUT = 'mock'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const S = 'public/sprites';
const raw = async (arq) => {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width, h: info.height };
};
const png = (im) => sharp(im.d, { raw: { width: im.w, height: im.h, channels: 4 } }).png().toBuffer();
const lum = (d, i) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];

/** Removes the left→right light trend (a linear fit of each column's mean luminance), keeping the overall mean. */
function aplainar(im) {
  const { d, w, h } = im, m = [];
  for (let x = 0; x < w; x++) { let s = 0; for (let y = 0; y < h; y++) s += lum(d, (y * w + x) * 4); m.push(s / h); }
  const mx = (w - 1) / 2, my = m.reduce((a, b) => a + b) / w;
  let num = 0, den = 0;
  m.forEach((v, x) => { num += (x - mx) * (v - my); den += (x - mx) ** 2; });
  const k = num / den, o = Buffer.from(d);
  for (let x = 0; x < w; x++) {
    const f = my / Math.max(1, my + k * (x - mx));
    for (let y = 0; y < h; y++) { const i = (y * w + x) * 4; for (let c = 0; c < 3; c++) o[i + c] = Math.min(255, Math.round(d[i + c] * f)); }
  }
  return { d: o, w, h };
}
/** Wraps the ends onto each other over `b` columns: column 0 continues column W−1 (offset-and-blend). */
function emendar(im, b) {
  const { d, w, h } = im, o = Buffer.from(d), meio = w / 2;
  for (let x = 0; x < w; x++) {
    const borda = Math.min(x, w - 1 - x);
    if (borda >= b) continue;
    const a = 0.5 * (1 - borda / b); // 0.5 at the very edge, 0 at b columns in
    const xo = (x + meio) % w;
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4, j = (y * w + xo) * 4;
      for (let c = 0; c < 4; c++) o[i + c] = Math.round(d[i + c] * (1 - a) + d[j + c] * a);
    }
  }
  // Make the two edge columns identical halves of each other: the wrap now reads as one continuous wall.
  return { d: o, w, h };
}
async function fileira(buf, n, z) {
  const m = await sharp(buf).metadata();
  const comp = Array.from({ length: n }, (_, i) => ({ input: buf, left: i * m.width, top: 0 }));
  const lin = await sharp({ create: { width: n * m.width, height: m.height, channels: 4, background: '#000' } }).composite(comp).png().toBuffer();
  return sharp(lin).resize(n * m.width * z, m.height * z, { kernel: 'nearest' }).png().toBuffer();
}
async function parAntesDepois(antes, depois, arq) {
  const a = await sharp(antes).metadata(), b = await sharp(depois).metadata();
  await sharp({ create: { width: Math.max(a.width, b.width), height: a.height + b.height + 8, channels: 4, background: '#ff00ff' } })
    .composite([{ input: antes, left: 0, top: 0 }, { input: depois, left: 0, top: a.height + 8 }]).png().toFile(arq);
  console.log(arq);
}

// (1)(2) The borders.
for (const [nome, b] of [['f4-faixa-c', 20], ['f4-faixa-b', 16]]) {
  const im = await raw(`${S}/${nome}.png`);
  const depois = await png(emendar(aplainar(im), b));
  await parAntesDepois(await fileira(await png(im), 3, 3), await fileira(depois, 3, 3), `${OUT}/${nome}-ladrilho.png`);
}

// (3) The belt: straight ends → dissolved ends (a smooth alpha ramp over 34px: it is a painted, tinted silhouette).
{
  const im = await raw(`${S}/belt-2.png`);
  const o = Buffer.from(im.d), R = 34;
  for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) {
    const borda = Math.min(x, im.w - 1 - x);
    if (borda >= R) continue;
    const i = (y * im.w + x) * 4;
    o[i + 3] = Math.round(o[i + 3] * (borda / R) ** 1.5);
  }
  // As Phaser's tint does it: RGB multiplied by 0x2a3352, alpha untouched; scale 1.2 like the layer.
  const tingir = async (buf) => {
    const { data, info } = await sharp(buf).resize(Math.round(im.w * 1.2), Math.round(im.h * 1.2), { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
    const T = [0x2a, 0x33, 0x52];
    for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) data[i + c] = Math.round((data[i + c] * T[c]) / 255);
    return sharp(data, { raw: info }).png().toBuffer();
  };
  const pinta = fs.existsSync('public/sprites/paint-bg-f3.png') ? 'public/sprites/paint-bg-f3.png' : null;
  const base = pinta
    ? await sharp(pinta).extract({ left: 120, top: 60, width: 200, height: 130 }).png().toBuffer()
    : await sharp({ create: { width: 200, height: 130, channels: 4, background: '#2a3a5a' } }).png().toBuffer();
  const cena = async (belt) => sharp(base).composite([{ input: await tingir(belt), left: 23, top: 15, blend: 'over' }]).resize(600, 390, { kernel: 'nearest' }).png().toBuffer();
  await parAntesDepois(await cena(await png(im)), await cena(await png({ d: o, w: im.w, h: im.h })), `${OUT}/belt-2-pontas.png`);
}

// (4) The F4 chamber painting entering over the previous one: straight edge × a 48px cross-fade (both are paintings).
{
  const c = await raw(`${S}/paint-bg-f4-c.png`).catch(() => null);
  const dd = await raw(`${S}/paint-bg-f4-d.png`).catch(() => null);
  if (c && dd) {
    const X = 196, R = 48;
    const junta = (suave) => {
      const o = Buffer.from(c.d);
      for (let y = 0; y < c.h; y++) for (let x = X; x < c.w; x++) {
        const k = x - X;
        const a = suave && k < R ? (k / R) * (k / R) * (3 - 2 * (k / R)) : 1;
        const i = (y * c.w + x) * 4, j = (y * dd.w + k) * 4;
        for (let ch = 0; ch < 4; ch++) o[i + ch] = Math.round(c.d[i + ch] * (1 - a) + dd.d[j + ch] * a);
      }
      return png({ d: o, w: c.w, h: c.h });
    };
    const recorte = async (buf) => sharp(buf).extract({ left: 120, top: 40, width: 160, height: 140 }).resize(480, 420, { kernel: 'nearest' }).png().toBuffer();
    await parAntesDepois(await recorte(await junta(false)), await recorte(await junta(true)), `${OUT}/pintura-f4-emenda.png`);
  } else console.log('(sem paint-bg-f4c/d em public/sprites — pulei o 4)');
}
