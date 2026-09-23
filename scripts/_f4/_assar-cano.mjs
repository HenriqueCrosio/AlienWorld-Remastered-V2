// FATIA 7 · assa o CANO DE DESPEJO da câmara B (objeto bc28cdf2, 12/09).
//
// ⚠️ ELE NASCEU DEITADO E ENTRA DE PÉ. O prompt pediu vista lateral de um cano de parede, e o
// gerador devolveu a boca apontando para a DIREITA — certo para uma parede vertical, errado para o
// que a Fase 4 tem, que é teto e chão. Um giro de 90° põe o flange em cima (preso no teto) e a
// boca embaixo, despejando na direção da água que sobe. ⚠️ Giro de 90° em pixel art é exato: não
// reamostra nada, só troca os eixos.
//
// ⚠️ E ELES SÃO ESCURECIDOS AQUI, ao contrário das peças de parallax. Cano não é camada de
// parallax — quem o desenha é a `Agua`, que não tem `tint` de camada para empurrá-lo para o fundo.
// O alvo é a banda da decoração da fase: ~2,2× a pintura, a mesma da passarela.
import sharp from 'sharp';

const ORIG = 'scripts/_f4/_cano';
const ESCOLHIDOS = { 'c-00': 'f4-cano.png', 'c-08': 'f4-cano2.png', 'c-13': 'f4-cano3.png' };
const ALVO = 16.4 * 2.2; // a luminância média da pintura da câmara × a banda da decoração

const media = async (buf) => {
  const { data } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let s = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    s += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; n++;
  }
  return s / n;
};

for (const [cand, nome] of Object.entries(ESCOLHIDOS)) {
  // 1. de pé, e aparado no retângulo opaco (a âncora do cano é o TOPO: o flange no teto)
  const girado = await sharp(`${ORIG}/${cand}.png`).rotate(90).png().toBuffer();
  const { data, info } = await sharp(girado).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  let x0 = W, x1 = -1, y0 = H, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] < 24) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const aparado = await sharp(girado)
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .png().toBuffer();

  // 2. o valor, com o CONTRASTE preservado (a tarja âmbar é a razão de a peça existir)
  const m = await media(aparado);
  const g = ALVO / m;
  const { data: d2, info: i2 } = await sharp(aparado).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < d2.length; i += 4) {
    for (let c = 0; c < 3; c++) d2[i + c] = Math.max(0, Math.min(255, ALVO + (d2[i + c] * g - ALVO) * 1.25));
  }
  const saida = `public/sprites/${nome}`;
  await sharp(d2, { raw: i2 }).png().toFile(saida);
  console.log(`✔ ${nome}  ${i2.width}x${i2.height}  luminância ${m.toFixed(1)} -> ${(await media(saida)).toFixed(1)}  (alvo ${ALVO.toFixed(1)})`);
}
