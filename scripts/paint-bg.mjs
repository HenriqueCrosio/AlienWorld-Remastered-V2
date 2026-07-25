// Reduz uma pintura para a resolução interna do jogo (1 px da arte = 1 px do jogo) — o
// upscale nearest da engine dá o acabamento pixel (mesmo tratamento do paint-bg-f1, b98cce3).
// Crop CENTRAL para a proporção alvo antes do downscale.
//
// uso: node scripts/paint-bg.mjs <in.png> <out.png> <W> <H>
import sharp from 'sharp';

const [inp, out, W, H] = process.argv.slice(2);
if (!inp || !out || !W || !H) {
  console.error('uso: node scripts/paint-bg.mjs <in.png> <out.png> <W> <H>');
  process.exit(1);
}
const w = Number(W);
const h = Number(H);

const img = sharp(inp);
const meta = await img.metadata();
const alvo = w / h;
let cw = meta.width;
let ch = Math.round(meta.width / alvo);
if (ch > meta.height) {
  ch = meta.height;
  cw = Math.round(meta.height * alvo);
}
await img
  .extract({
    left: Math.floor((meta.width - cw) / 2),
    top: Math.floor((meta.height - ch) / 2),
    width: cw,
    height: ch,
  })
  .resize(w, h, { kernel: 'lanczos3' })
  .png()
  .toFile(out);
console.log(`${out}: ${w}x${h} (crop central ${cw}x${ch} de ${meta.width}x${meta.height})`);
