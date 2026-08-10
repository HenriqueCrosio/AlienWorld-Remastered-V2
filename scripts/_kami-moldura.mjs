// Devolve ao bloco do kamikaze a MOLDURA que a hitbox precisa.
//
// A hitbox sai da TELA do quadro (`e.body.setSize(e.width * 0.6, e.height * 0.55)`), não da arte
// desenhada dentro dela. O sprite antigo era 26x24 de tela para 25x17 de arte — a folga vertical
// dava uma hitbox de 13.2px num bicho de 17px. O novo veio recortado justo (30x20), e instalado
// assim entregaria 9.35px de hitbox: o mesmo kamikaze, 29% mais difícil de acertar, sem ninguém
// ter pedido.
//
// Com tela 31x28 e `scale` 0.85 as duas coisas batem ao mesmo tempo:
//   tamanho em tela  30*0.85 x 20*0.85 = 25.5 x 17   (hoje: 25 x 17)
//   hitbox           31*0.6*0.85 x 28*0.55*0.85 = 15.8 x 13.1   (hoje: 15.6 x 13.2)
//
// Em BLOCO e com a MESMA caixa: molduras diferentes por quadro fariam o desenho tremer, que é o
// defeito que o centrar-anim.mjs acabou de tirar.
//
// uso: node scripts/_kami-moldura.mjs
import sharp from 'sharp';

const TELA_L = 31;
const TELA_A = 28;

const arquivos = [
  'public/sprites/enemy-kamikaze.png',
  ...Array.from({ length: 9 }, (_, i) => `public/sprites/kamikaze-anim-${i}.png`),
];

for (const f of arquivos) {
  const m = await sharp(f).metadata();
  const esq = Math.floor((TELA_L - m.width) / 2);
  const topo = Math.floor((TELA_A - m.height) / 2);
  if (esq < 0 || topo < 0) throw new Error(`${f}: ${m.width}x${m.height} nao cabe em ${TELA_L}x${TELA_A}`);

  const saida = await sharp({
    create: {
      width: TELA_L,
      height: TELA_A,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: await sharp(f).toBuffer(), left: esq, top: topo }])
    .png()
    .toBuffer();

  await sharp(saida).toFile(f);
  console.log(`${f}: ${m.width}x${m.height} → ${TELA_L}x${TELA_A} (arte em +${esq},+${topo})`);
}
