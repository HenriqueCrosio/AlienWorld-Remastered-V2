// 07/11 — Part B, step 1: writes the eel's straight body strip (`enguia/arte.mjs`) for the normal map and the sheet.
//   node scripts/_serpente/_enguia-faixa.mjs [out-dir=docs/superpowers/folhas/2026-11-07/enguia-aneis]
// → faixa.png (native), faixa-x4.png (zoomed, with the pieces' joints marked in a strip below), faixa.json
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { N } from './enguia/numeros.mjs';
import { faixaCorpo } from './enguia/arte.mjs';

const OUT = process.argv[2] ?? 'docs/superpowers/folhas/2026-11-07/enguia-aneis';
fs.mkdirSync(OUT, { recursive: true });
const F = await faixaCorpo(N);
await sharp(F.data, { raw: { width: F.w, height: F.h, channels: 4 } }).png().toFile(path.join(OUT, 'faixa.png'));
// the zoomed view: the strip ×4 on a dark ground, and under it a ruler — the drawn parts grey, each repeated piece in
// alternating blue tones
const K = 4, RG = 6;
const ver = Buffer.alloc(F.w * K * (F.h + RG) * K * 4);
const W4 = F.w * K;
for (let y = 0; y < (F.h + RG) * K; y++) for (let x = 0; x < W4; x++) {
  const u = Math.floor(x / K), r = Math.floor(y / K), o = (y * W4 + x) * 4;
  let c = [13, 15, 21, 255];
  if (r < F.h) { const i = (r * F.w + u) * 4; if (F.data[i + 3] > 128) c = [F.data[i], F.data[i + 1], F.data[i + 2], 255]; }
  else if (r > F.h + 1) { const p = F.cols[u].peca; c = p < 0 ? [70, 74, 86, 255] : p % 2 ? [60, 130, 200, 255] : [40, 90, 150, 255]; }
  ver.set(c, o);
}
await sharp(ver, { raw: { width: W4, height: (F.h + RG) * K, channels: 4 } }).png().toFile(path.join(OUT, 'faixa-x4.png'));
fs.writeFileSync(path.join(OUT, 'faixa.json'), JSON.stringify({ w: F.w, h: F.h, alvo: F.alvo, pecas: F.pecas, pool: F.pool.map((p) => ({ a: p.a, erro: +p.e.toFixed(1) })), colunas: F.cols.map((c) => c.x) }));
console.log(`faixa ${F.w}×${F.h} (alvo ${F.alvo}), ${F.pecas} peças de 18 px de ${F.pool.map((p) => `x${p.a} (${p.e.toFixed(0)})`).join(', ')}`);
