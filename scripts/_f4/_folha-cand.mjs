// FATIA 7 · a folha de contato das 64 candidaturas, em 4× sobre o fundo da câmara.
// ⚠️ SOBRE O FUNDO DA CÂMARA, e não sobre xadrez: o que se julga é se a peça LÊ contra a pintura
// escura da fase. Candidatura bonita em fundo claro é a armadilha que reprovou as 4 faixas.
import fs from 'fs';
import sharp from 'sharp';

const Z = 4;
const CEL = 72 * Z;
const ROT = 22;

for (const letra of ['A', 'B', 'C', 'D']) {
  const arquivos = fs.readdirSync('scripts/_f4/_cand')
    .filter((n) => n.startsWith(`${letra}-`)).sort();

  const linhas = 4, colunas = 4;
  const W = colunas * CEL;
  const H = linhas * (CEL + ROT);

  const camadas = [];
  for (let i = 0; i < arquivos.length; i++) {
    const cx = (i % colunas) * CEL;
    const cy = Math.floor(i / colunas) * (CEL + ROT);
    camadas.push({
      input: await sharp(`scripts/_f4/_cand/${arquivos[i]}`)
        .resize(CEL, CEL, { kernel: 'nearest' }).png().toBuffer(),
      left: cx, top: cy + ROT,
    });
    camadas.push({
      input: Buffer.from(
        `<svg width="${CEL}" height="${ROT}"><text x="6" y="16" font-family="monospace" font-size="15" fill="#8fe">${arquivos[i].replace('.png', '')}</text></svg>`,
      ),
      left: cx, top: cy,
    });
  }

  // O fundo: a própria pintura da câmara, esticada — é contra ela que a peça vai viver.
  const fundo = await sharp('public/sprites/paint-bg-f4-a.png')
    .resize(W, H, { fit: 'cover' }).blur(2).toBuffer()
    .catch(() => sharp({ create: { width: W, height: H, channels: 3, background: { r: 12, g: 14, b: 22 } } }).png().toBuffer());

  await sharp(fundo).composite(camadas).png().toFile(`scripts/_f4/_folha-cand-${letra}.png`);
  console.log(`✔ scripts/_f4/_folha-cand-${letra}.png`);
}
