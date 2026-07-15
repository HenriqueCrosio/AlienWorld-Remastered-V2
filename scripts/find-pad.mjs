// Acha a PISTA pela cor: as marcações de pouso são VERMELHAS (alto R, baixo G/B). Reporta a caixa
// dos pixels vermelhos = a plataforma. Também amplia a região para conferência.
import sharp from 'sharp';

const nome = process.argv[2] ?? 'doca-new';
const { data, info } = await sharp(`public/sprites/${nome}.png`)
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

const yMin = Number(process.argv[3] ?? 80); // isola a mancha da pista
let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, n = 0;
const rows = {}, xsByRow = {};
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a > 60 && r > 90 && r - g > 40 && r - b > 40 && y >= yMin) {
      n++; rows[y] = (rows[y] ?? 0) + 1;
      (xsByRow[y] ??= []).push(x);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
}
console.log(`vermelho (y>=${yMin}): ${n}px  caixa x=${minX}..${maxX} y=${minY}..${maxY}`);
for (const y of Object.keys(rows)) {
  const xs = xsByRow[y];
  console.log(`  y=${y}: ${rows[y]}px  x=${Math.min(...xs)}..${Math.max(...xs)}`);
}

const pad = 12;
const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad);
const w = Math.min(W - left, maxX - minX + 2 * pad), h = Math.min(H - top, maxY - minY + 2 * pad);
await sharp(`public/sprites/${nome}.png`)
  .extract({ left, top, width: w, height: h })
  .resize(w * 8, h * 8, { kernel: 'nearest' })
  .png().toFile(`scripts/_${nome}-pad.png`);
console.log(`\nregião da pista ampliada -> scripts/_${nome}-pad.png`);
