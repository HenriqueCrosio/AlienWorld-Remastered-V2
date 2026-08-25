// ALARGA uma pintura QUADRADA para 16:9, sem cortar nada dela.
//
// ⚠️ POR QUE ISTO EXISTE. As pinturas do Henrique vêm quadradas e a tela do jogo é 16:9. Só há
// três saídas, e duas são ruins: CORTAR (o `paint-bg.mjs` sozinho faz recorte central, e numa
// pintura 1254×1254 isso joga fora 44% da altura — na cutscene 2, a lua e os topos das torres),
// ESPREMER (distorce, fora de cogitação), ou ALARGAR. Esta é a terceira.
//
// ⚠️ ISTO NÃO É OUTPAINTING DE VERDADE. Outpainting pinta conteúdo novo nas laterais; isto
// espelha a faixa da borda, borra forte e escurece, e deixa a emenda morrer numa vinheta. Num
// quadro dark sci-fi as laterais leem como profundidade — mas leem como MANCHA, não como arte.
// O caminho bom continua sendo a pintura já nascer em 16:9, ou um outpaint pago
// (`outpaint_image` do Higgsfield: 2 créditos, e em 2026-08-24 a conta tinha 1,9 no plano free).
//
// Decisão do Henrique em 2026-08-24: mostrar a pintura INTEIRA vale a mancha nas laterais.
//
// uso: node scripts/alargar-16x9.mjs <in.png> <out.png>
import sharp from 'sharp';

const [inp, out] = process.argv.slice(2);
if (!inp || !out) {
  console.error('uso: node scripts/alargar-16x9.mjs <in.png> <out.png>');
  process.exit(1);
}

/** Largura da faixa da borda que é espelhada para gerar a extensão. */
const FAIXA = 260;
/** Desfoque da extensão. Alto de propósito: forma reconhecível ali denunciaria o espelho. */
const BORRAO = 28;
/** A extensão entra mais ESCURA que a arte — perspectiva aérea, e some contra o vazio. */
const ESCURECER = 0.62;

const img = sharp(inp);
const meta = await img.metadata();
const H = meta.height;
const W16 = Math.round((H * 16) / 9);

if (W16 <= meta.width) {
  console.error(`nada a fazer: ${meta.width}x${H} já é 16:9 ou mais largo`);
  process.exit(1);
}

const lado = Math.round((W16 - meta.width) / 2);

const borda = (left, flop) =>
  sharp(inp)
    .extract({ left, top: 0, width: FAIXA, height: H })
    [flop ? 'flop' : 'clone']()
    .resize(lado, H, { fit: 'fill' })
    .blur(BORRAO)
    .modulate({ brightness: ESCURECER })
    .toBuffer();

const [esq, dir] = await Promise.all([borda(0, true), borda(meta.width - FAIXA, true)]);

// A vinheta faz a emenda morrer no escuro em vez de terminar numa linha.
const veu = Buffer.from(
  `<svg width="${W16}" height="${H}"><defs><linearGradient id="g" x1="0" x2="1">` +
    `<stop offset="0" stop-color="black" stop-opacity="0.75"/>` +
    `<stop offset="0.22" stop-color="black" stop-opacity="0"/>` +
    `<stop offset="0.78" stop-color="black" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="black" stop-opacity="0.75"/>` +
    `</linearGradient></defs><rect width="${W16}" height="${H}" fill="url(#g)"/></svg>`,
);

await sharp({
  create: { width: W16, height: H, channels: 4, background: { r: 5, g: 6, b: 13, alpha: 1 } },
})
  .composite([
    { input: esq, top: 0, left: 0 },
    { input: dir, top: 0, left: W16 - lado },
    { input: await sharp(inp).toBuffer(), top: 0, left: lado },
    { input: veu, top: 0, left: 0 },
  ])
  .png()
  .toFile(out);

console.log(`${out}: ${W16}x${H} (a pintura ${meta.width}x${H} inteira, + ${lado}px por lado)`);
