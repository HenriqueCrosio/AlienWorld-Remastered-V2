// Reduz os quatro fundos do Henrique para a resolucao EXATA do jogo (384x216) e mede o que
// eles fazem com a leitura. A lei: 1px de arte = 1px de jogo — o tamanho se assa no arquivo.
import sharp from 'sharp';

const GW = 384, GH = 216;

for (const n of [1, 2, 3, 4]) {
  const src = `assets/raw/paint-bg-f4-original-${n}.png`;
  const out = `scripts/_f4/_bg${n}-384.png`;
  await sharp(src).resize(GW, GH, { kernel: 'lanczos3' }).png().toFile(out);

  // Quanto do quadro compete com o que e jogavel? Luminancia alta = disputa atencao.
  const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
  let claro = 0, quente = 0, somaL = 0;
  const px = data.length / 3;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    somaL += L;
    if (L > 90) claro++;
    // "quente" = vermelho/rosa dominante e acima do fundo — a faixa dos tiros inimigos (337 graus)
    if (r > 90 && r > g * 1.6 && r > b * 1.35) quente++;
  }
  console.log(
    `bg${n}  L media ${(somaL / px).toFixed(1).padStart(5)}` +
      `   claro(L>90) ${((claro / px) * 100).toFixed(1).padStart(5)}%` +
      `   quente/vermelho ${((quente / px) * 100).toFixed(1).padStart(5)}%`,
  );
}
