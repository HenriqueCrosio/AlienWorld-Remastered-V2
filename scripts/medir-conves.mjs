// Onde está o CONVÉS dentro da arte: varre as linhas de cima para baixo e imprime a largura
// opaca de cada uma. A linha do convés é o 1º SALTO grande de largura (torres → casco) — a
// mesma medição documentada em InterludeScene.ts:60-73. O vão [x0..x1] dessa linha é a
// extensão da aresta de luz (deckRim).
//
// uso: node scripts/medir-conves.mjs public/sprites/carrier-big.png
import sharp from 'sharp';

const inp = process.argv[2];
const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let prev = 0;
for (let y = 0; y < info.height; y++) {
  let x0 = -1;
  let x1 = -1;
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 32) {
      if (x0 < 0) x0 = x;
      x1 = x;
    }
  }
  const w = x0 < 0 ? 0 : x1 - x0 + 1;
  const salto = prev > 0 && w >= prev * 1.8 ? '  ◀ SALTO' : '';
  if (w > 0) console.log(`row ${String(y).padStart(3)}: ${String(w).padStart(3)}px [${x0}..${x1}]${salto}`);
  if (w > 0) prev = w;
}
console.log(`\narte: ${info.width}x${info.height}`);
