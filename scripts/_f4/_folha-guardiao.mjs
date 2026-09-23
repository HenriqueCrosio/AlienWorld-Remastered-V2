// O GUARDIÃO NOVO contra o antigo — folha de contato para o B1.
// Linha 1: estático antigo, quadro 0 da sheet antiga, estático novo, destruído.
// Linha 2: idle 0..8 · Linha 3: morte 0..8 · Linha 4: explode 0..8.
//
//   node scripts/_f4/_folha-guardiao.mjs [saida.png]
import sharp from 'sharp';

const saida = process.argv[2] ?? 'scripts/_f4/_folha-guardiao.png';
const RAW = 'assets/raw/anim-guardiao-novo';
const Q = 256, PAD = 6, COLS = 9;
const fundo = { r: 34, g: 22, b: 30, alpha: 1 };

const velhoQuadro0 = await sharp('public/sprites/guardiao-idle-sheet.png')
  .extract({ left: 0, top: 0, width: 256, height: 256 })
  .png()
  .toBuffer();

const linhas = [
  ['public/sprites/guardiao.png', velhoQuadro0, `${RAW}/estatico.png`, `${RAW}/destruido.png`],
  Array.from({ length: 9 }, (_, i) => `${RAW}/idle-${i}.png`),
  Array.from({ length: 9 }, (_, i) => `${RAW}/morte-${i}.png`),
  Array.from({ length: 9 }, (_, i) => `${RAW}/explode-${i}.png`),
];

const comp = [];
for (const [l, linha] of linhas.entries()) {
  for (const [c, src] of linha.entries()) {
    comp.push({ input: await sharp(src).png().toBuffer(), left: PAD + c * (Q + PAD), top: PAD + l * (Q + PAD) });
  }
}
await sharp({
  create: { width: PAD + COLS * (Q + PAD), height: PAD + linhas.length * (Q + PAD), channels: 4, background: fundo },
})
  .composite(comp)
  .png()
  .toFile(saida);
console.log(saida);
