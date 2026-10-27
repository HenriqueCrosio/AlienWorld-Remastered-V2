// 27/10 — what a boss bite costs when it is replayed on a frame (the guardian's frame at its drawn size, 179²): the
// bite itself (`lasca`) and what it leaves hanging. Node only.
//   node scripts/_inimigos/_tempo-mordida.mjs
import sharp from 'sharp';
import { lasca, ruido, sorte, reduzir } from '../../src/systems/morte/pedacos.ts';

const { data, info } = await sharp('public/sprites/guardiao-idle-sheet.png').extract({ left: 0, top: 0, width: 256, height: 256 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const fonte = { w: info.width, h: info.height, cor: new Uint32Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.length)) };
const img = reduzir(fonte, 0.7, 0.7, false, false);
const torto = ruido(img.w, img.h, 3, sorte(7));
const perto = { x: img.w * 0.484, y: img.h * 0.17 };
for (let r = 0; r < 3; r++) {
  const t0 = performance.now();
  const l = lasca(img, [0, 1], 240, torto, 1.4, sorte(11), perto);
  console.log(`lasca: ${(performance.now() - t0).toFixed(2)} ms, ${l?.n} px`);
}
