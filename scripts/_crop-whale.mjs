// Recorta a baleia-Leviatã da menu-keyart.png e limpa o fundo (estrelas/céu),
// produzindo uma referência de estilo para o PixelLab.
import sharp from 'sharp';

const SRC = 'public/sprites/menu-keyart.png';
const OUT = 'scripts/_whale-ref.png';

// Região da baleia medida na key art 384x216 (olhando a imagem ampliada).
const BOX = { left: 36, top: 20, width: 175, height: 95 };

const img = sharp(SRC).extract(BOX).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

// Fundo = céu escuro (#0b0f1e..#1e2a4a) e estrelas (pontos claros isolados).
// A baleia é cinza-azulada CLARA (luminância alta, corpo contínuo).
// 1) tudo muito escuro vira transparente; 2) despeckle: pixel claro isolado (estrela) também.
const px = (x, y) => (y * info.width + x) * 4;
const lum = (i) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

const LIM = 30; // abaixo disso é céu
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = px(x, y);
    if (lum(i) < LIM) data[i + 3] = 0;
  }
}
// despeckle: pixel opaco com menos de 2 vizinhos opacos = estrela
const opaco = (x, y) =>
  x >= 0 && y >= 0 && x < info.width && y < info.height && data[px(x, y) + 3] > 0 ? 1 : 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = px(x, y);
    if (data[i + 3] === 0) continue;
    const v =
      opaco(x - 1, y) + opaco(x + 1, y) + opaco(x, y - 1) + opaco(x, y + 1) +
      opaco(x - 1, y - 1) + opaco(x + 1, y - 1) + opaco(x - 1, y + 1) + opaco(x + 1, y + 1);
    if (v < 2) data[i + 3] = 0;
  }
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim() // corta a sobra transparente
  .png()
  .toFile(OUT);
const m = await sharp(OUT).metadata();
console.log(`${OUT}: ${m.width}x${m.height}`);
