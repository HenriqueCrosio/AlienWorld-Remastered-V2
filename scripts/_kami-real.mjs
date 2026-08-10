// Compara candidatos do kamikaze contra o atual, TODOS na mesma altura de conteúdo.
//
// ⚠️ A primeira versão disto normalizava pela TELA do PNG (26 vs 45) e mentia: o kamikaze atual
// ocupa só 17 dos 24px da tela dele, e os candidatos preenchem a deles. Comparar tela com tela
// dá massa visual diferente por acidente de moldura.
//
// A ALTURA é o que se segura, e não a largura: a hitbox sai de `height * 0.55` sobre o tamanho
// EXIBIDO (EnemySystem.spawn), e o jogador atira na HORIZONTAL — quem decide "quão difícil é
// acertar" é o perfil vertical. Encaixar pela largura encolheria a hitbox e deixaria o kamikaze
// mais tanque sem ninguém ter pedido (é a mesma conta da canhoneira do cinturão).
//
// uso: node scripts/_kami-real.mjs <saida.png>
import sharp from 'sharp';

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const ALTURA_ALVO = 17; // a altura de CONTEÚDO do kamikaze de hoje
const ZOOM = 7;

const cand = [
  ['ATUAL', null, null],
  ['C[8]', '76f2052a-cbac-44da-92db-0e5fb8f73e39', 8],
  ['C[9]', '76f2052a-cbac-44da-92db-0e5fb8f73e39', 9],
  ['D[2]', '986ff164-c7b9-4423-be2a-20cc30c6de91', 2],
  ['D[3]', '986ff164-c7b9-4423-be2a-20cc30c6de91', 3],
  ['D[9]', '986ff164-c7b9-4423-be2a-20cc30c6de91', 9],
  ['D[11]', '986ff164-c7b9-4423-be2a-20cc30c6de91', 11],
];

/** Caixa de conteúdo por ALFA — `sharp.trim()` devolve a tela inteira nestes PNGs. */
async function recortar(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width;
  let y0 = info.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return sharp(buf)
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .toBuffer();
}

const prontos = [];
for (const [rot, id, i] of cand) {
  const bruto =
    id === null
      ? await sharp('public/sprites/enemy-kamikaze.png').toBuffer()
      : Buffer.from(
          await (
            await fetch(
              `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${id}/rotations/frame_${i}.png`,
            )
          ).arrayBuffer(),
        );

  const corte = await recortar(bruto);
  const m = await sharp(corte).metadata();
  const w = Math.max(1, Math.round((m.width * ALTURA_ALVO) / m.height));
  // nearest nos dois passos: bilinear vira papa em pixel art.
  const jogo = await sharp(corte)
    .resize(w, ALTURA_ALVO, { kernel: 'nearest' })
    .toBuffer();
  const grande = await sharp(jogo)
    .resize(w * ZOOM, ALTURA_ALVO * ZOOM, { kernel: 'nearest' })
    .toBuffer();
  prontos.push({ rot, buf: grande, w: w * ZOOM, h: ALTURA_ALVO * ZOOM, real: w });
}

const larg = Math.max(...prontos.map((p) => p.w)) + 40;
const alt = ALTURA_ALVO * ZOOM + 26;

await sharp({
  create: {
    width: larg,
    height: alt * prontos.length,
    channels: 4,
    // O azul-escuro do jogo: julgar arte quase preta contra branco mente.
    background: { r: 12, g: 16, b: 32, alpha: 1 },
  },
})
  .composite(
    prontos.map((p, i) => ({
      input: p.buf,
      left: 20,
      top: i * alt + 13,
    })),
  )
  .png()
  .toFile(process.argv[2]);

console.log('todos na mesma ALTURA de conteúdo (17px). largura resultante:');
for (const p of prontos) {
  console.log(`  ${p.rot.padEnd(6)} ${String(p.real).padStart(2)}px de largura`);
}
