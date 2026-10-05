// THE SENTINEL'S SHIELD, drawn pixel by pixel (spec frente B §3.6: a vector arc reads "generated"). An energy arc,
// convex side to the LEFT (towards the ship), in the red of the sentinel's eyes: dark rim → red body → hot core on
// the middle third only (the energy is densest where the shots land).
//   node scripts/_elites/_escudo.mjs <out.png>
import sharp from 'sharp';

const out = process.argv[2];
const W = 12;
const H = 38;
const R = 24; // arc radius; the centre sits to the RIGHT of the image
const CX = R + 2;
const CY = (H - 1) / 2;
const px = Buffer.alloc(W * H * 4);
const cor = {
  borda: [74, 12, 14, 200],
  corpo: [214, 44, 40, 235],
  quente: [255, 136, 112, 255],
  nucleo: [255, 214, 196, 255],
};
const pintar = (x, y, [r, g, b, a]) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  if (px[i + 3] >= a) return;
  px[i] = r;
  px[i + 1] = g;
  px[i + 2] = b;
  px[i + 3] = a;
};
for (let y = 0; y < H; y++) {
  const dy = y - CY;
  if (Math.abs(dy) > R - 1) continue;
  const x = Math.round(CX - Math.sqrt(R * R - dy * dy));
  const t = Math.abs(dy) / (H / 2); // 0 in the middle, 1 at the tips
  // The tips thin out: 2px in the middle, 1px at the ends.
  pintar(x - 1, y, cor.borda);
  pintar(x, y, t < 0.85 ? cor.corpo : cor.borda);
  if (t < 0.7) pintar(x + 1, y, cor.corpo);
  if (t < 0.4) pintar(x, y, cor.quente);
  if (t < 0.15) pintar(x, y, cor.nucleo);
  if (t < 0.7) pintar(x + 2, y, cor.borda);
}
await sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out);
console.log(out, `${W}x${H}`);
