// As REGRAS PURAS das cartas novas (spec 2026-10-01-catalogo-cartas-design.md §4). Uso, da raiz:
// node scripts/test-cartas-regras.mjs
import {
  DuploToque, angulosDoLeque, contornoDoAlfa, pixelsDoRaio, raioDaExplosao, saltosDoArco,
} from '../src/cartasRegras.ts';

const falhas = [];
const igual = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — veio ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`}`);
  if (!ok) falhas.push(msg);
};

// raioDaExplosao — Explosão Maior ×1,5, arredondado
igual(raioDaExplosao(18, false), 18, 'sem Explosão Maior o raio é o base');
igual(raioDaExplosao(18, true), 27, 'com Explosão Maior: 18 → 27');

// angulosDoLeque — com rumo: leque de 120° para a frente; sem rumo: o círculo
igual(angulosDoLeque(5, 0), [-60, -30, 0, 30, 60], 'leque de 5 para a frente do tiro');
igual(angulosDoLeque(4, null), [0, 90, 180, 270], 'sem rumo, 4 fecham o círculo');
igual(angulosDoLeque(1, 45), [45], 'um só sai no rumo');

// saltosDoArco — o mais próximo ainda não atingido, até max, dentro do raio, sem voltar
const fila = [1, 2, 3, 4, 5].map((i) => ({ id: i, x: i * 20, y: 0 }));
igual(saltosDoArco({ id: 0, x: 0, y: 0 }, fila, 3, 50), [1, 2, 3], 'salta em fila, para em 3');
igual(saltosDoArco({ id: 0, x: 0, y: 0 }, [{ id: 9, x: 80, y: 0 }], 3, 50), [], 'longe demais: nenhum salto');
igual(saltosDoArco({ id: 0, x: 0, y: 0 }, [{ id: 0, x: 5, y: 0 }, { id: 7, x: 10, y: 0 }], 3, 50), [7], 'a origem não leva o próprio arco');
igual(saltosDoArco({ id: 0, x: 0, y: 0 }, [{ id: 1, x: 40, y: 0 }, { id: 2, x: 30, y: 0 }], 3, 50), [2, 1], 'sempre o mais próximo de onde o raio está');

// pixelsDoRaio — inteiros, das pontas exatas, 8-conexos; com 0,5 é uma reta
const reta = pixelsDoRaio({ x: 0, y: 0 }, { x: 12, y: 0 }, () => 0.5);
igual(reta.length, 13, 'sem desvio: 13 pixels de 0 a 12');
igual(reta.every((p) => p.y === 0), true, 'sem desvio: tudo na mesma linha');
let semente = 7;
const lcg = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);
const zigue = pixelsDoRaio({ x: 3.4, y: 10 }, { x: 41, y: 27.6 }, lcg);
igual([zigue[0], zigue[zigue.length - 1]], [{ x: 3, y: 10 }, { x: 41, y: 28 }], 'as pontas são exatas (arredondadas)');
igual(zigue.every((p, i) => i === 0 || (Math.abs(p.x - zigue[i - 1].x) <= 1 && Math.abs(p.y - zigue[i - 1].y) <= 1)), true, 'cada pixel encosta no anterior (8-conexo)');
igual(zigue.every((p) => Number.isInteger(p.x) && Number.isInteger(p.y)), true, 'só pixels inteiros');

// contornoDoAlfa — 1px por fora, 4-vizinhança, máscara com 1px de moldura
igual([...contornoDoAlfa([255], 1, 1)], [0, 1, 0, 1, 0, 1, 0, 1, 0], 'um pixel: a cruz em volta, sem os cantos');
igual([...contornoDoAlfa([255, 255], 2, 1)], [0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0], 'dois pixels: o contorno não cobre a silhueta');
igual([...contornoDoAlfa([0], 1, 1)], [0, 0, 0, 0, 0, 0, 0, 0, 0], 'tudo transparente: sem contorno');

// DuploToque — dois toques na MESMA direção dentro da janela
const dt = new DuploToque(220);
igual(dt.apertou('direita', 1000), null, '1º toque: nada');
igual(dt.apertou('direita', 1150), 'direita', '2º toque a 150ms: dash para a direita');
igual(dt.apertou('direita', 1200), null, 'depois do dash, o próximo toque começa de novo');
igual(dt.apertou('direita', 1500), null, 'fora da janela (300ms): nada');
igual(dt.apertou('cima', 1600), null, 'direção diferente reinicia');
igual(dt.apertou('esquerda', 1650), null, '... e de novo diferente: nada');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
