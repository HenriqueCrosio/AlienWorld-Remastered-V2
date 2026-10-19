// BLOCO D — the MENU Leviathan from the NEW one (18/10, him: "você tem que se basear no novo leviatã para fazer a do
// menu ... Ele não herdou caracteristicas do antigo"). The menu shows him alive and strong, side view, swimming right —
// which IS the approved base (`aprovado/leviata-base.png`, 363×160). So no redesign: only the trip down to menu size.
//   reducao   — local: area reduction straight from the base, alpha snapped, colours snapped to the base palette;
//   resize    — PixelLab /resize (pixel-art aware) from a 200px local step down to 112px, palette forced to the base;
//   gera      — /generate-image-v2 at 128×64 with the base as reference AND style: the same creature drawn natively small.
// Outputs `<outDir>/cru/<nome>.png` (the menu-size art) and, for the in-game captures (`_capturar-corpo.mjs`),
// `<outDir>/red/<nome>-70.png` and `-133.png`, plus `<nome>-grande.png` (×3).
//   node scripts/_leviata/_menu-da-base.mjs <reducao|resize|gera> <outDir> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const [modo, outDir, ...seeds] = process.argv.slice(2);
const BASE = 'docs/superpowers/folhas/2026-10-18/leviata/aprovado/leviata-base.png';
for (const d of ['cru', 'red']) fs.mkdirSync(path.join(outDir, d), { recursive: true });

const DESC = 'A colossal armored space leviathan swimming to the right, side view: an armored shark body of overlapping ' +
  'near-black blue-grey hull plates with thin orange lava cracks, an armored head with plated mandibles and fangs, ' +
  'gill slits, one tall swept-back dorsal shark fin, pectoral fins, a crescent shark tail. Alive and strong. Dark ' +
  'sci-fi pixel art, transparent background.';

// The base palette (opaque pixels), for the snap.
const { data: bd, info: bi } = await sharp(BASE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const PAL = [...new Set(Array.from({ length: bi.width * bi.height }, (_, p) => p * 4).filter((i) => bd[i + 3] > 200)
  .map((i) => (bd[i] << 16) | (bd[i + 1] << 8) | bd[i + 2]))].map((c) => [c >> 16, (c >> 8) & 255, c & 255]);

async function ajustar(buf, { largura, paleta = true }) {
  let img = sharp(buf).trim();
  if (largura) img = sharp(await img.png().toBuffer()).resize({ width: largura, kernel: 'mitchell' });
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = data[i + 3] >= 110 ? 255 : 0;
    if (!paleta || !data[i + 3]) continue;
    let melhor = PAL[0], d0 = Infinity;
    for (const c of PAL) {
      const d = (c[0] - data[i]) ** 2 + (c[1] - data[i + 1]) ** 2 + (c[2] - data[i + 2]) ** 2;
      if (d < d0) { d0 = d; melhor = c; }
    }
    [data[i], data[i + 1], data[i + 2]] = melhor;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}
// /resize wants the bare base64 (the data: prefix breaks its decoder).
const cru64 = (buf) => ({ type: 'base64', base64: buf.toString('base64'), format: 'png' });
const ampliar = async (buf, k) => {
  const m = await sharp(buf).metadata();
  return sharp(buf).resize(m.width * k, m.height * k, { kernel: 'nearest' }).png().toBuffer();
};
async function salvar(nome, arte) {
  fs.writeFileSync(path.join(outDir, 'cru', `${nome}.png`), arte);
  fs.writeFileSync(path.join(outDir, `${nome}-grande.png`), await ampliar(arte, 3));
  fs.writeFileSync(path.join(outDir, 'red', `${nome}-70.png`), await ajustar(arte, { largura: 70, paleta: false }));
  fs.writeFileSync(path.join(outDir, 'red', `${nome}-133.png`), await ajustar(BASE_133, { paleta: false }));
  console.log(nome);
}
// The far silhouette (F2) is the same for every route here: the base itself reduced to 133 (it is never seen bigger).
const BASE_133 = await ajustar(fs.readFileSync(BASE), { largura: 133 });

if (modo === 'reducao') {
  await salvar('base-reducao', await ajustar(fs.readFileSync(BASE), { largura: 112 }));
} else if (modo === 'resize') {
  const passo = await ajustar(fs.readFileSync(BASE), { largura: 200 });
  const t = await tamanho(passo);
  const alvo = { width: 112, height: Math.round((112 * t.height) / t.width) };
  for (const seed of seeds.map(Number)) {
    const [img] = await gerar('/resize', {
      description: DESC,
      reference_image: cru64(passo),
      reference_image_size: t,
      target_size: alvo,
      view: 'side',
      direction: 'east',
      no_background: true,
      color_image: cru64(fs.readFileSync(BASE)),
      seed,
    });
    await salvar(`base-resize-${seed}`, await ajustar(img, { paleta: true }));
  }
} else if (modo === 'gera') {
  for (const seed of seeds.map(Number)) {
    const imgs = await gerar('/generate-image-v2', {
      description: DESC,
      image_size: { width: 128, height: 64 },
      no_background: true,
      seed,
      reference_images: [{ image: b64(BASE), size: await tamanho(BASE), usage_description: 'the exact creature to draw: same design, fins, head and plates' }],
      style_image: { image: b64(BASE), size: await tamanho(BASE) },
      style_options: { color_palette: true, outline: true, detail: true, shading: true },
    });
    for (const [i, img] of imgs.entries()) await salvar(`base-gera-${seed}-${i}`, await ajustar(img, { paleta: true }));
  }
} else throw new Error('modo? reducao | resize | gera');
