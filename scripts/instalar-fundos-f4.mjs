// INSTALA os quatro fundos pintados da Fase 4 na resolução NATIVA do jogo.
//
// ⚠️ A LEI: 1px de arte = 1px de jogo. A pintura entra ASSADA em 384×216 e é desenhada em
// escala 1. REDUZIR pode; AUMENTAR, NUNCA — é a grade de pixel casando com a da tela que dá o
// aspecto de PROFUNDIDADE. Pintura esticada em runtime perde a grade e o fundo achata.
//
// ⚠️ E A REDUÇÃO SAI DO ORIGINAL DO GERADOR, num passo só. Reamostrar duas vezes custa
// detalhe (a lição do Zero-G, ver scripts/reduzir-sprite.mjs).
//
// uso: node scripts/instalar-fundos-f4.mjs
import sharp from 'sharp';

const GW = 384;
const GH = 216;
const MAPA = [
  [1, 'a', 'a câmara 1 — o hangar engolido'],
  [2, 'b', 'a câmara 2 — a caixa torácica'],
  [3, 'c', 'o duto'],
  [4, 'd', 'a câmara do núcleo'],
];

for (const [n, letra, oque] of MAPA) {
  const src = `assets/raw/paint-bg-f4-original-${n}.png`;
  const out = `public/sprites/paint-bg-f4-${letra}.png`;

  const meta = await sharp(src).metadata();
  if (meta.width < GW || meta.height < GH) {
    throw new Error(
      `${src} é ${meta.width}×${meta.height} — MENOR que ${GW}×${GH}. Não amplie: gere de novo maior.`,
    );
  }

  await sharp(src).resize(GW, GH, { kernel: 'lanczos3' }).png().toFile(out);

  const dep = await sharp(out).metadata();
  if (dep.width !== GW || dep.height !== GH) {
    throw new Error(`${out} saiu ${dep.width}×${dep.height}, esperado ${GW}×${GH}`);
  }
  console.log(`✔ ${out}  ${meta.width}×${meta.height} → ${GW}×${GH}   (${oque})`);
}
