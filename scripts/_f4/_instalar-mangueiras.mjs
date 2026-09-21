// AS MANGUEIRAS DA SOLEIRA — baixa os quadros do PixelLab e monta a folha do jogo.
//
// ⚠️ ELA APLICA O MESMO TETO DE BRILHO DO `_assar-garganta-viva.mjs`, e não por precaução: este
// gerador NÃO obedece limite de cor. A lição já foi paga três vezes neste projeto — *"pulsar =
// clarear"* no `_assar-anim`, o núcleo da porta estourando em branco, e a própria garganta (0,8%
// de px claros no estático contra 10,2% na animação). Pedir "não clareie" no prompt não resolve;
// o conserto é aqui.
//
// ⚠️ E O TETO SAI DA PEÇA PARADA, NÃO DE UM LITERAL. O quadro cru da mangueira é a verdade sobre
// quão clara ela pode ser; a animação só pode escurecer a partir dali. É o mesmo princípio do
// `_assar-porta-nucleo`, onde o pico do pulso É o estático.
//
//   node scripts/_f4/_instalar-mangueiras.mjs <url-do-quadro-0> <url-1> ...
import sharp from 'sharp';

const SAIDA = 'public/sprites/f4-mangueiras-sheet.png';

// ⚠️ A PEÇA SAI PELA METADE, E A METADE EXATA É ESCOLHA DE PIXEL ART, não arredondamento. Ele
// pediu *"quase pela metade"* depois de jogar — a 64×88 as mangueiras competiam com a criatura. A
// redução por 2 é a única que mapeia 4 px da fonte em 1 sem inventar cor: qualquer fator
// quebrado (0,55 · 0,6) borra a linha do metal e o pixel deixa de cair na grade.
//
// ⚠️ E REDUZIR PODE, AMPLIAR NUNCA — a lei da resolução, cravada em 06/09. Esta peça nasceu 64×88
// e vive a 32×44; se um dia precisar ser maior, REGERA, não estica.
const DIVISOR = 2;
const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error('uso: node scripts/_f4/_instalar-mangueiras.mjs <url dos quadros, em ordem>');
  process.exit(1);
}

const baixar = async (u) => {
  if (!/^https?:/.test(u)) return sharp(u).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${r.status} em ${u}`);
  return sharp(Buffer.from(await r.arrayBuffer())).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
};

// 1 · O TETO, medido no quadro 0 (o mais próximo da peça parada aprovada).
const base = await baixar(urls[0]);
let tetoLum = 0;
for (let i = 0; i < base.data.length; i += 4) {
  if (base.data[i + 3] < 40) continue;
  const l = (base.data[i] + base.data[i + 1] + base.data[i + 2]) / 3;
  if (l > tetoLum) tetoLum = l;
}
// Uma folga de 6%: o quadro 0 não é sagrado, mas o salto de 40% que o gerador dá, é.
const TETO = tetoLum * 1.06;
console.log(`teto de brilho medido no quadro 0: ${Math.round(tetoLum)} (+6% = ${Math.round(TETO)})`);

const quadros = [];
let W = 0,
  H = 0;
for (const [n, u] of urls.entries()) {
  const { data, info } = await baixar(u);
  W = info.width;
  H = info.height;
  let acima = 0,
    total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 40) continue;
    total++;
    const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (lum <= TETO) continue;
    acima++;
    // Comprime de volta ao teto mantendo a MATIZ — gás e metal não mudam de cor ao esfriar, só
    // de valor. (Na garganta o puxão para o magenta fazia sentido porque a luz era da goela; aqui
    // não há goela: a luz é reflexo, e reflexo não tem cor própria.)
    const k = TETO / lum;
    data[i] = Math.round(data[i] * k);
    data[i + 1] = Math.round(data[i + 1] * k);
    data[i + 2] = Math.round(data[i + 2] * k);
  }
  console.log(`  quadro ${n}: ${((acima / total) * 100).toFixed(1)}% dos px estavam acima do teto`);
  quadros.push(
    await sharp(data, { raw: { width: W, height: H, channels: 4 } })
      .resize({ width: Math.round(W / DIVISOR), height: Math.round(H / DIVISOR), kernel: 'nearest' })
      .png()
      .toBuffer(),
  );
}
W = Math.round(W / DIVISOR);
H = Math.round(H / DIVISOR);

await sharp({
  create: { width: W * quadros.length, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(quadros.map((input, i) => ({ input, left: i * W, top: 0 })))
  .png()
  .toFile(SAIDA);
console.log(`${SAIDA}  ${quadros.length} quadros de ${W}x${H}`);
