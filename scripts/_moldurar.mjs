// Devolve MOLDURA a um bloco de quadros já instalado, para a hitbox continuar a mesma.
//
// A hitbox sai da TELA do quadro (`e.body.setSize(e.width * 0.6, e.height * 0.55)`, com o Arcade
// multiplicando pela escala do sprite), NÃO da arte desenhada dentro dela. O `install-anim.mjs`
// recorta tudo na caixa união — o que é certo para o enquadramento e errado para o corpo: arte
// nova recortada justa, entrando no lugar de arte antiga que tinha folga, ENCOLHE a hitbox em
// silêncio. Ninguém pediu, e nenhuma inspeção do sprite explica.
//
// Escolher a tela é escolher a hitbox. Com a tela igual à do sprite substituído, o `scale` do
// `DEFS` nem precisa mudar.
//
// Em BLOCO e com a MESMA tela: molduras diferentes por quadro fazem o desenho tremer, que é o
// defeito que o `centrar-anim.mjs` acabou de tirar.
//
// uso: node scripts/_moldurar.mjs <largura> <altura> <arquivo.png> [arquivo.png ...]
import sharp from 'sharp';

const [lRaw, aRaw, ...arquivos] = process.argv.slice(2);
const TELA_L = Number(lRaw);
const TELA_A = Number(aRaw);

if (!TELA_L || !TELA_A || arquivos.length === 0) {
  console.error('uso: node scripts/_moldurar.mjs <largura> <altura> <arquivo.png> [...]');
  process.exit(1);
}

for (const f of arquivos) {
  const m = await sharp(f).metadata();
  const esq = Math.floor((TELA_L - m.width) / 2);
  const topo = Math.floor((TELA_A - m.height) / 2);
  if (esq < 0 || topo < 0) {
    throw new Error(`${f}: ${m.width}x${m.height} não cabe em ${TELA_L}x${TELA_A}`);
  }

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
