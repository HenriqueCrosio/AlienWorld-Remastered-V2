// INSTALA O GUARDIÃO NOVO (B1 da Fatia 7) — a arte DELE, PixelLab 9436240c, já baixada em
// `assets/raw/anim-guardiao-novo/`. Zero geração: só monta as folhas.
//
//   guardiao.png                ← estatico.png           (256×256)
//   guardiao-idle-sheet.png     ← idle-0..8              (9 × 256², a respiração)
//   guardiao-morte-sheet.png    ← morte-0..8             (9 × 256², a que termina OCA)
//   guardiao-destruido.png      ← destruido.png          (256×256, o único quadro em que a silhueta quebra)
//
// ⚠️ ESCALA 1, SEM RECORTE. Os quatro saem no MESMO quadro de 256², e é isso que deixa o alvo, o bico e
// o corpo valerem para todos eles com um offset só (a arte antiga tinha o estático em 256×227 e a sheet
// em 256², e o miolo ficava 14px fora do lugar enquanto ela tocava).
//
//   node scripts/_f4/_instalar-guardiao.mjs
import sharp from 'sharp';

const RAW = 'assets/raw/anim-guardiao-novo';
const OUT = 'public/sprites';
const Q = 256;

async function folha(prefixo, saida) {
  const comp = [];
  for (let i = 0; i < 9; i++) {
    const src = `${RAW}/${prefixo}-${i}.png`;
    const m = await sharp(src).metadata();
    if (m.width !== Q || m.height !== Q) throw new Error(`${src} é ${m.width}x${m.height}, esperado ${Q}²`);
    comp.push({ input: src, left: i * Q, top: 0 });
  }
  await sharp({ create: { width: 9 * Q, height: Q, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comp)
    .png()
    .toFile(`${OUT}/${saida}`);
  console.log(`${OUT}/${saida}  (9 × ${Q}²)`);
}

await sharp(`${RAW}/estatico.png`).png().toFile(`${OUT}/guardiao.png`);
console.log(`${OUT}/guardiao.png`);
await folha('idle', 'guardiao-idle-sheet.png');
await folha('morte', 'guardiao-morte-sheet.png');
await sharp(`${RAW}/destruido.png`).png().toFile(`${OUT}/guardiao-destruido.png`);
console.log(`${OUT}/guardiao-destruido.png`);
