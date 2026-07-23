// Sintetiza um loop de IDLE a partir de UM quadro, pulsando só o que brilha.
//
// Por que existe: o v3 do PixelLab não entrega idle sutil num sprite grande e detalhado. Nas
// duas tentativas de "hover" da fortaleza da Fase 1 ele oscilou entre lavar a estrutura inteira
// de branco (luminância média 88 contra 45 do quadro base) e APAGAR o olho magenta (0 pixels
// magenta em vários quadros) — a 10fps, um estroboscópio que ainda por cima pisca fora a
// assinatura da facção.
//
// A saída aqui é determinística: a arte não é reamostrada nem redesenhada. Cada pixel é
// modulado pela própria "magentice" (R−G), então pedra cinza (R≈G) fica INTACTA e só o olho e
// as veias de energia respiram. Quadro 0 = o original, byte a byte — é ele que o PNG estático
// usa, e assim o sprite não salta quando a animação começa.
//
// uso: node scripts/pulsar-brilho.mjs <quadro-base.png> <prefixo-saida> <n> [amplitude]
import sharp from 'sharp';

const [base, prefixo, nRaw, ampRaw] = process.argv.slice(2);
if (!base || !prefixo || !nRaw) {
  console.error('uso: node scripts/pulsar-brilho.mjs <base.png> <prefixo-saida> <n> [amplitude]');
  process.exit(1);
}

const n = Number(nRaw);
const amp = Number(ampRaw ?? 0.38);

const { data, info } = await sharp(base).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

let tocados = 0;

for (let i = 0; i < n; i++) {
  const saida = Buffer.from(data);
  // Seno sobre o índice: a volta fecha sozinha, sem emenda visível no fim do loop.
  const fase = Math.sin((i / n) * Math.PI * 2);

  for (let p = 0; p < W * H; p++) {
    if (saida[p * 4 + 3] < 10) continue;

    const R = saida[p * 4];
    const G = saida[p * 4 + 1];

    // "Quanto este pixel é magenta". Cinza e pedra dão ~0 e passam sem toque; o olho e as
    // veias dão alto e recebem a pulsação inteira. A transição é contínua, então não aparece
    // uma borda dura entre o que pulsa e o que não pulsa.
    const brilho = Math.max(0, (R - G) / 255);
    if (brilho <= 0.01) continue;
    if (i === 1) tocados++;

    const k = 1 + amp * fase * brilho;
    for (let c = 0; c < 3; c++) {
      saida[p * 4 + c] = Math.max(0, Math.min(255, Math.round(saida[p * 4 + c] * k)));
    }
  }

  await sharp(saida, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toFile(`${prefixo}-${i}.png`);
}

console.log(
  `${prefixo}: ${n} quadros ${W}x${H} · amplitude ${amp} · ${tocados}px de brilho modulados ` +
    `(o resto da arte é idêntico ao original)`,
);
