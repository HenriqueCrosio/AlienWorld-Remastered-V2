// Mede a CAIXA REAL (alfa a alfa) de candidatos do PixelLab e o que eles dariam EM TELA.
//
// `sharp.trim()` devolve a tela inteira nestes PNGs — contar pixel opaco não erra.
// A ALTURA é o que se segura: a hitbox sai de `height * 0.55` sobre o tamanho EXIBIDO, e o
// jogador atira na horizontal.
//
// uso: node scripts/_kami-medir.mjs <object-id> [<object-id> ...]
import sharp from 'sharp';

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const ALVO_A = 17; // altura de conteúdo do kamikaze de hoje
const ALVO_L = 25; // largura de conteúdo do kamikaze de hoje

async function caixa(buf) {
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
  return { w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const atual = await caixa(await sharp('public/sprites/enemy-kamikaze.png').toBuffer());
console.log(`ATUAL: ${atual.w}x${atual.h}, aspecto ${(atual.w / atual.h).toFixed(2)}\n`);
console.log('cand | conteudo | aspecto | largura em tela a 17px de altura | vs 25px');

for (const id of process.argv.slice(2)) {
  console.log(`\n--- ${id} ---`);
  for (let i = 0; i < 16; i++) {
    const r = await fetch(
      `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${id}/rotations/frame_${i}.png`,
    );
    if (!r.ok) continue;
    const c = await caixa(Buffer.from(await r.arrayBuffer()));
    const larg = Math.round((c.w * ALVO_A) / c.h);
    const delta = (((larg - ALVO_L) / ALVO_L) * 100).toFixed(0);
    console.log(
      `[${String(i).padStart(2)}] | ${String(c.w).padStart(2)}x${String(c.h).padStart(2)} | ${(c.w / c.h).toFixed(2)} | ${String(larg).padStart(2)}px | ${delta > 0 ? '+' : ''}${delta}%`,
    );
  }
}
