// Remove o "xadrez de transparência" que o PixelLab às vezes DESENHA dentro do PNG
// (em vez de deixar o alfa vazio). Ele vem como quadrados cinza opacos de 4px.
import sharp from 'sharp';
import fs from 'fs';

const CHECKER = [
  [0x3f, 0x41, 0x48],
  [0x38, 0x3a, 0x41],
];
const TOL = 14;

const perto = (r, g, b) =>
  CHECKER.some(([R, G, B]) => Math.abs(r - R) + Math.abs(g - G) + Math.abs(b - B) <= TOL);

for (const file of process.argv.slice(2)) {
  const { data, info } = await sharp(file).raw().ensureAlpha().toBuffer({ resolveWithObject: true });

  let removidos = 0;
  for (let p = 0; p < data.length; p += 4) {
    if (data[p + 3] > 10 && perto(data[p], data[p + 1], data[p + 2])) {
      data[p + 3] = 0;
      removidos++;
    }
  }

  const buf = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();

  fs.writeFileSync(file, buf);
  console.log(`${file}: ${removidos}px de xadrez removidos`);
}
