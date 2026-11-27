// THE PIXEL MASK, pure (27/11, the rebalance, step 2 — `src/systems/colisao/mascaraPixel.ts`).
//   node --experimental-transform-types scripts/test-mascara-pixel.mjs
import { ALFA_MIN, desenhado, erodir, intersecao, montarMascaraPx, paraQuadro, tocam } from '../src/systems/colisao/mascaraPixel.ts';

const falhas = [];
const igual = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — veio ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`}`);
  if (!ok) falhas.push(msg);
};

/** A w×h RGBA buffer, every pixel `cor`, then the given pixels painted. */
const quadro = (w, h, pinta = () => [0, 0, 0, 0]) => {
  const b = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) b.set(pinta(x, y), (y * w + x) * 4);
  return b;
};
const linhas = (m) => Array.from({ length: m.h }, (_, y) => Array.from({ length: m.w }, (_, x) => (m.px[y * m.w + x] ? '#' : '.')).join(''));

// montar: the alpha threshold, and the ADD rule (black is no body)
const meio = montarMascaraPx(quadro(3, 1, (x) => [255, 255, 255, [ALFA_MIN - 1, ALFA_MIN, 255][x]]), 3, 1);
igual(linhas(meio), ['.##'], 'alfa abaixo do mínimo não é desenho');
const add = montarMascaraPx(quadro(3, 1, (x) => [[0, 40, 255][x], 0, 0, 255]), 3, 1, true);
igual(linhas(add), ['..#'], 'no ADD, o preto e o escuro não são corpo; a luz é');

// intersecao: what every frame shares (the hull, the fire off)
const a = montarMascaraPx(quadro(4, 1, (x) => [9, 9, 9, x < 3 ? 255 : 0]), 4, 1);
const b = montarMascaraPx(quadro(4, 1, (x) => [9, 9, 9, x > 0 ? 255 : 0]), 4, 1);
igual(linhas(intersecao([a, b])), ['.##.'], 'a interseção fica com o que os quadros dividem');

// erodir: 1 px of forgiveness all around
const bloco = montarMascaraPx(quadro(5, 4, () => [9, 9, 9, 255]), 5, 4);
igual(linhas(erodir(bloco)), ['.....', '.###.', '.###.', '.....'], 'erodir tira 1 px da borda');
const fio = montarMascaraPx(quadro(5, 3, (_x, y) => [9, 9, 9, y === 1 ? 255 : 0]), 5, 3);
igual(linhas(erodir(fio)), ['.....', '.....', '.....'], 'um fio de 1 px some (o raspão)');

// paraQuadro: position, origin, scale, mirror, rotation
const m10 = { w: 10, h: 6, px: new Uint8Array(60) };
const pose = { x: 100, y: 50, rotacao: 0, escalaX: 1, escalaY: 1, origemX: 5, origemY: 3, espelhoX: false, espelhoY: false };
igual(paraQuadro(pose, m10, 100, 50), { x: 5, y: 3 }, 'o centro do sprite cai na origem');
igual(paraQuadro({ ...pose, escalaX: 2, escalaY: 2 }, m10, 104, 52), { x: 7, y: 4 }, 'a escala divide');
igual(paraQuadro({ ...pose, espelhoX: true }, m10, 102, 50), { x: 3, y: 3 }, 'o espelho reflete no centro do quadro');
const r = paraQuadro({ ...pose, rotacao: Math.PI / 2 }, m10, 100, 52);
igual([Math.round(r.x * 1000) / 1000, Math.round(r.y * 1000) / 1000], [7, 3], 'girado 90°: o ponto de baixo vira o da frente');

// tocam: two 2×2 blocks that overlap in one px, and that do not
const q2 = montarMascaraPx(quadro(2, 2, () => [9, 9, 9, 255]), 2, 2);
const p = (x, y) => ({ x, y, rotacao: 0, escalaX: 1, escalaY: 1, origemX: 1, origemY: 1, espelhoX: false, espelhoY: false });
igual(tocam(p(10, 10), q2, p(11, 11), q2, 10, 10, 11, 11), true, 'desenhos que se cruzam tocam');
igual(tocam(p(10, 10), q2, p(12, 10), q2, 11, 9, 11, 11), false, 'lado a lado sem cruzar não tocam');
igual(desenhado(q2, -0.5, 0), false, 'fora do quadro não é desenho');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
