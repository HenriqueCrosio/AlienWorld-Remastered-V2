// A animação idle de um sprite (`animate_object` do PixelLab) traz um bob VERTICAL cravado nos
// pixels de cada quadro — não é um parâmetro de código, é conteúdo de imagem. Pedido do Henrique
// pro carrier-big-anim: "diminuir a oscilação, mas deixar um pouco" — não eliminar (senão as
// luzes/propulsores animados perderiam a sensação de vida).
//
// Mede o centro de massa vertical (alpha-weighted) de cada quadro contra o quadro 0 (a baseline)
// e desloca o CONTEÚDO de cada quadro por um número inteiro de pixels na direção da baseline,
// preservando `keep` (0..1) da amplitude original. Desloca em pixel inteiro (não fracionário) —
// pixel art não aceita blur de reamostragem.
//
// uso: node scripts/amortecer-bob.mjs <prefixo-arquivo> <n-quadros> [keep=0.35]
// ex.:  node scripts/amortecer-bob.mjs carrier-big-anim 11 0.35
import sharp from 'sharp';

const [prefix, countRaw, keepRaw] = process.argv.slice(2);
const count = Number(countRaw);
const keep = keepRaw !== undefined ? Number(keepRaw) : 0.35;

if (!prefix || !count) {
  console.error('uso: node scripts/amortecer-bob.mjs <prefixo> <n-quadros> [keep=0.35]');
  process.exit(1);
}

const path = (i) => `public/sprites/${prefix}-${i}.png`;

const centroideY = (data, W, H) => {
  let somaPeso = 0;
  let somaY = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = data[(y * W + x) * 4 + 3];
      if (a > 0) {
        somaPeso += a;
        somaY += a * y;
      }
    }
  }
  return somaPeso > 0 ? somaY / somaPeso : H / 2;
};

const quadros = [];
for (let i = 0; i < count; i++) {
  const { data, info } = await sharp(path(i)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  quadros.push({ i, data, W: info.width, H: info.height, cy: 0 });
}

const baseline = centroideY(quadros[0].data, quadros[0].W, quadros[0].H);

for (const q of quadros) {
  q.cy = centroideY(q.data, q.W, q.H);
}

console.log(`baseline (quadro 0): centro Y = ${baseline.toFixed(2)}`);

for (const q of quadros) {
  const delta = q.cy - baseline;
  // Desloca o conteúdo por S = -(1-keep)*delta: reduz o desvio a `keep` da amplitude original.
  const shift = Math.round(-(1 - keep) * delta);

  if (shift === 0) {
    console.log(`quadro ${q.i}: desvio ${delta.toFixed(2)}px, shift 0 (já perto da baseline)`);
    continue;
  }

  const nova = Buffer.alloc(q.data.length); // transparente por padrão
  for (let y = 0; y < q.H; y++) {
    const yNova = y + shift;
    if (yNova < 0 || yNova >= q.H) continue;
    q.data.copy(nova, (yNova * q.W) * 4, (y * q.W) * 4, (y * q.W + q.W) * 4);
  }

  await sharp(nova, { raw: { width: q.W, height: q.H, channels: 4 } }).png().toFile(path(q.i));
  console.log(`quadro ${q.i}: desvio ${delta.toFixed(2)}px → shift ${shift}px (restam ~${(delta + shift).toFixed(2)}px, ${(keep * 100).toFixed(0)}% da amplitude)`);
}

console.log('\nOK — quadros regravados em public/sprites/.');
