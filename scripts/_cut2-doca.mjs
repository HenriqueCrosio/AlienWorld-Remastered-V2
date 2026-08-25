// A DOCA DO CINTURÃO — corrige o tom da arte nova, usa a arte INTEIRA (sem recorte de tira),
// MEDE a linha da pista e esfuma as QUATRO bordas.
//
// ⚠️ A arte chega ESMAGADA NO PRETO: 99,4% dos pixels opacos abaixo de 0,1 de luminância, e o
// mais claro da imagem inteira é 0,534. `normalise()` NÃO resolve — uns poucos pixels a 0,53
// travam o alongamento. O que resolve é ganho linear.
//
// ⚠️ Borda reta é veneno: a tira antiga (214×63) cortava só uma FAIXA da arte, e a borda de CIMA
// (reta, nunca esfumada) denunciava o retângulo colado contra a pintura. Agora usamos a arte
// PixelLab INTEIRA (256×190) — não há mais corte de faixa, mas as quatro bordas do PNG ainda são
// retas por definição, então o feather nas quatro é obrigatório, não enfeite.
//
// uso: node scripts/_cut2-doca.mjs [ganho]     (padrão: 2.2)
import sharp from 'sharp';

const GANHO = Number(process.argv[2] ?? 2.2);
const SRC = 'scripts/_cut2/novo-base.png';
const OUT = 'public/sprites/doca-cinturao.png';
const FADE = 10; // largura da rampa de alpha, em px, nas QUATRO bordas

// 1. Corrigir o tom sobre o conteúdo opaco inteiro (y 36..226 → 256x190).
const corrigida = await sharp(SRC)
  .extract({ left: 0, top: 36, width: 256, height: 190 })
  .linear(GANHO, 0)
  .png()
  .toBuffer();

// 2. MEDIR a laje: a linha com mais pixels de tom médio é o convés.
const { data: d0, info: i0 } = await sharp(corrigida)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const lum = (b, i) => (b[i] * 0.299 + b[i + 1] * 0.587 + b[i + 2] * 0.114) / 255;
let melhor = { y: -1, n: -1, x0: 0, x1: 0 };
for (let y = 0; y < i0.height; y++) {
  let n = 0, x0 = i0.width, x1 = 0;
  for (let x = 0; x < i0.width; x++) {
    const i = (y * i0.width + x) * 4;
    if (d0[i + 3] > 8 && lum(d0, i) > 0.17) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; }
  }
  if (n > melhor.n) melhor = { y, n, x0, x1 };
}
console.log(`LAJE medida: y=${melhor.y} (${melhor.n} px claros) x ${melhor.x0}..${melhor.x1}`);

// 3. A arte INTEIRA é o sprite agora — sem recorte de faixa. PAD_ROW é medido direto na arte
// corrigida (não há mais TOP/LEFT de recorte a subtrair).
const { data, info } = { data: d0, info: i0 };
const PAD_ROW = melhor.y;

// 4. FEATHER nas QUATRO bordas (a reta de cima é a que mais denunciava o corte na tira antiga —
// aqui não há mais corte de faixa, mas o PNG ainda termina em retângulo, então as quatro ficam).
const idx = (x, y) => (y * info.width + x) * 4 + 3;
for (let x = 0; x < info.width; x++) {
  for (let k = 0; k < FADE; k++) {
    const f = (k + 1) / (FADE + 1);
    const top = idx(x, k);
    data[top] = Math.round(data[top] * f);
    const bot = idx(x, info.height - 1 - k);
    data[bot] = Math.round(data[bot] * f);
  }
}
for (let y = 0; y < info.height; y++) {
  for (let k = 0; k < FADE; k++) {
    const f = (k + 1) / (FADE + 1);
    const left = idx(k, y);
    data[left] = Math.round(data[left] * f);
    const right = idx(info.width - 1 - k, y);
    data[right] = Math.round(data[right] * f);
  }
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .toFile(OUT);

console.log(`${OUT}: ${info.width}x${info.height}`);
console.log(`>>> CONSTANTES para Interlude2Scene:`);
console.log(`    ART_W = ${info.width}`);
console.log(`    ART_H = ${info.height}`);
console.log(`    PAD_ROW = ${PAD_ROW}`);
console.log(`    PAD_X0 = ${melhor.x0}`);
console.log(`    PAD_X1 = ${melhor.x1}`);
