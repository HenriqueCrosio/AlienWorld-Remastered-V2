// Mede a linha da PISTA num sprite de doca já instalado.
//
// Para cada linha (y) reporta: quantos pixels opacos, e a faixa [minX..maxX] deles. A pista é
// onde a arte de repente fica LARGA e FLAT (a plataforma se estende para o lado). Também amplia
// o PNG ×4 para inspeção visual.
import sharp from 'sharp';

const nome = process.argv[2] ?? 'doca-new';
const ampliar = process.argv.includes('--zoom');

const { data, info } = await sharp(`public/sprites/${nome}.png`)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: W, height: H } = info;
const A = (x, y) => data[(y * W + x) * 4 + 3];

console.log(`${nome}.png ${W}x${H}\n`);
console.log('  y | opac | minX..maxX | largura | barra');
console.log('----+------+------------+---------+' + '-'.repeat(40));

for (let y = 0; y < H; y++) {
  let n = 0, min = 1e9, max = -1;
  for (let x = 0; x < W; x++) {
    if (A(x, y) > 40) {
      n++;
      if (x < min) min = x;
      if (x > max) max = x;
    }
  }
  const larg = max < 0 ? 0 : max - min + 1;
  const barra = '#'.repeat(Math.round(n / 4));
  const faixa = max < 0 ? '    -     ' : `${String(min).padStart(3)}..${String(max).padStart(3)}`;
  console.log(
    `${String(y).padStart(3)} | ${String(n).padStart(4)} | ${faixa} | ${String(larg).padStart(5)}   | ${barra}`,
  );
}

if (ampliar) {
  await sharp(`public/sprites/${nome}.png`)
    .resize(W * 4, H * 4, { kernel: 'nearest' })
    .png()
    .toFile(`scripts/_${nome}-zoom.png`);
  console.log(`\nampliado -> scripts/_${nome}-zoom.png`);
}
