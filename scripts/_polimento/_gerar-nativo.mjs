// 17/10 — ITEM 7 (polish block C): THE ART THAT THE GAME ENLARGES, REDRAWN AT THE SIZE IT IS SHOWN. The F4 mid-plane
// (`orgao`, `maquinario` at 1.45–1.6, `f4Ponte` at 1.41–1.55) is stretched past 1 in the game, and an enlarged pixel
// reads fat next to everything at scale 1 (the art law: reduce yes, enlarge never). The scale itself is not taste: it
// is a computed FLOOR (the cable ends must sink into the border; the bridge deck must clear the tables — see the
// `Parallax`), so the fix is the same piece drawn natively at that size, starting FROM THE APPROVED ART (his rule: the
// final comes from the approved concept, never a new design).
// The approved art is enlarged SMOOTHLY (lanczos, so the generator gets shapes, not fat pixels) to K× and redrawn:
//   i2p  — /image-to-pixelart (output ≤ 320 px a side): re-pixelates the image at the new size. It answers on an opaque
//          grey ground, so the alpha comes back from the enlarged input's own silhouette;
//   edit — /edit-image (canvas ≤ 400): "the same image, redrawn crisp at this resolution".
// [frame width]: the source is a horizontal SHEET (the organ's 9-frame beat): every frame is redrawn on its own, with
// the SAME seed, and the sheet is put back together — whether that holds still or flickers is what the GIF tells.
//   node scripts/_polimento/_gerar-nativo.mjs <approved png> <K> <i2p|edit> <out dir> <seed> [frame width]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';
import { naPaleta, paletaDe } from '../_f8/_paleta.mjs';

const [SRC, K_S, MODO, OUT, SEED_S, QUADRO_S] = process.argv.slice(2);
const K = Number(K_S), SEED = Number(SEED_S);
fs.mkdirSync(OUT, { recursive: true });
const nome = path.basename(SRC, '.png');
const m = await sharp(SRC).metadata();
const qw = QUADRO_S ? Number(QUADRO_S) : m.width;
const n = Math.round(m.width / qw);
const w = Math.round(qw * K), h = Math.round(m.height * K);

async function redesenha(quadro) {
  const grande = await sharp(quadro).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
  if (MODO === 'edit') {
    const [img] = await gerar('/edit-image', {
      image: b64(grande), image_size: { width: w, height: h }, width: w, height: h, seed: SEED, no_background: true,
      description: 'The exact same image, same composition, same shapes and same colors, redrawn as crisp detailed pixel art at this higher resolution: clean single-pixel outlines, fine detail, no blur, no new elements. Dark sci-fi.',
      color_image: b64(quadro),
    });
    return img;
  }
  // ⚠️ /image-to-pixelart refuses the data-URL prefix (HTTP 500, 'Invalid base64'): raw base64 only.
  const [img] = await gerar('/image-to-pixelart', {
    image: { type: 'base64', base64: grande.toString('base64'), format: 'png' },
    image_size: { width: w, height: h }, output_size: { width: w, height: h }, seed: SEED,
  });
  const alfa = await sharp(grande).ensureAlpha().extractChannel(3).threshold(128).raw().toBuffer();
  const rgb = await sharp(img).resize(w, h, { kernel: 'nearest' }).removeAlpha().raw().toBuffer();
  const px = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) {
    const [r, g, b] = [rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]];
    // The grey ground (~128,127,125) leaks into the outline where the smooth input's silhouette is a pixel wider than
    // the redraw: a grey halo. A near-neutral grey is never this art's colour (bronze, rust, flesh), so it goes.
    const chao = Math.abs(r - 128) < 12 && Math.abs(g - 127) < 12 && Math.abs(b - 125) < 12;
    px[p * 4] = r; px[p * 4 + 1] = g; px[p * 4 + 2] = b; px[p * 4 + 3] = chao ? 0 : alfa[p];
  }
  return sharp(px, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

const quadros = [];
for (let i = 0; i < n; i++) {
  const q = await sharp(SRC).extract({ left: i * qw, top: 0, width: qw, height: m.height }).png().toBuffer();
  quadros.push(await redesenha(q));
}
const arq = path.join(OUT, `${nome}-${MODO}-${SEED}.png`);
await sharp({ create: { width: w * n, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(quadros.map((input, i) => ({ input, left: i * w, top: 0 })))
  .png()
  .toFile(arq);
// ⚠️ BACK ONTO THE APPROVED PALETTE (17/10): the redraw keeps the shapes but drifts the colours — the bridge's amber
// lamp (the reason for its light tint in the `Parallax`) came back white, its magenta roots crimson. Every pixel is
// snapped to the nearest colour of the approved art, so the piece changes resolution and nothing else.
fs.writeFileSync(arq.replace(/\.png$/, '-paleta.png'), await naPaleta(fs.readFileSync(arq), await paletaDe(SRC, 64)));
console.log(`${arq}: ${n} × ${w}×${h} (×${K}), and on the approved palette`);
