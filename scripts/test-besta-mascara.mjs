// 25/11 — the Beast's drawn-pixel mask (src/entities/besta/mascara.ts): a box hits only where alpha is drawn.
//   node --experimental-transform-types scripts/test-besta-mascara.mjs
import { montarMascara, algumDesenhado } from '../src/entities/besta/mascara.ts';

const falhas = [];
const ok = (c, n) => { console.log(`${c ? 'OK  ' : 'FALHOU'} ${n}`); if (!c) falhas.push(n); };
// 16×16 frame: a 4×4 drawn square at (8..12, 4..8), a faint pixel at (1,1) below the alpha threshold
const w = 16, h = 16, rgba = new Uint8ClampedArray(w * h * 4);
for (let y = 4; y < 8; y++) for (let x = 8; x < 12; x++) rgba[(y * w + x) * 4 + 3] = 255;
rgba[(1 * w + 1) * 4 + 3] = 40;
const m = montarMascara(rgba, w, h, 2, 96);
ok(algumDesenhado(m, 9, 5, 10, 6, 2), 'a box on the square hits');
ok(!algumDesenhado(m, 0, 10, 16, 16, 2), 'a box below the square misses (the "air")');
ok(!algumDesenhado(m, 0, 0, 4, 4, 2), 'a faint pixel under the alpha threshold does not count');
ok(algumDesenhado(m, -50, -50, 100, 100, 2), 'a box bigger than the frame is clipped and hits');
ok(!algumDesenhado(m, 12, 4, 16, 8, 2), 'the box right after the square misses');
ok(algumDesenhado(m, 11, 7, 11.5, 7.5, 2), 'a sub-pixel box inside a drawn cell hits');
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
process.exit(falhas.length ? 1 : 0);
