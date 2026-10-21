// Reduces the F1 horizon painting to candidate in-game scales and cuts the 384x216 frames the player would see at
// the start and at the end of the stage (the far painting scrolls ~230 px over the whole stage at 4% of the world).
// Output: <out>/<name>-inteira.png (the whole reduction), <out>/<name>-inicio.png, <out>/<name>-fim.png, and x4 copies.
// usage: node scripts/_g/_pintura-escalas.mjs <painting.png> <outDir>
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const [src, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const meta = await sharp(src).metadata();

const W = 384;
const H = 216;
const VIAGEM = 230; // px the far painting travels over the stage (68 s x 84 px/s x 0.04, plus the boss)

// The WHOLE painting, reduced to the screen height: his rule (20/10) — every stage background shows the painting's
// full framing, never a crop or a zoom, because the full framing is what gives grandeur and depth.
const ESCALAS = [{ nome: 'inteira-216', altura: 216, topo: 0 }];

for (const e of ESCALAS) {
  const larg = Math.round((meta.width * e.altura) / meta.height);
  const buf = await sharp(src).resize(larg, e.altura, { kernel: 'lanczos3' }).png().toBuffer();
  await sharp(buf).toFile(path.join(out, `${e.nome}-inteira.png`));
  const viagem = Math.min(VIAGEM, larg - W);
  const quadros = { inicio: 0, fim: viagem };
  for (const [q, x] of Object.entries(quadros)) {
    const f = await sharp(buf).extract({ left: x, top: e.topo, width: W, height: H }).png().toBuffer();
    await sharp(f).toFile(path.join(out, `${e.nome}-${q}.png`));
    await sharp(f).resize(W * 4, H * 4, { kernel: 'nearest' }).toFile(path.join(out, `${e.nome}-${q}-x4.png`));
  }
  console.log(e.nome, `${larg}x${e.altura}`, 'viagem possível', larg - W, 'px');
}
