// As funções PURAS do texto no encaixe (spec 2026-09-30 §3.2), com uma fonte de mentira: cada letra tem 3/5·px de
// largura, a tinta sobe 7/10·px e não desce (frações escritas como divisão: 0.6 não é exato em ponto flutuante e
// faria 100·0.6 passar de 60). Uso: node scripts/test-texto-encaixe.mjs
import { alturaDoBloco, posicionar, quebrar, tamanhoUnico } from '../src/textoNoEncaixe.ts';

const falhas = [];
const igual = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — veio ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`}`);
  if (!ok) falhas.push(msg);
};
const medir = (t, px) => ({ x0: 0, x1: (t.length * px * 3) / 5, asc: (px * 7) / 10, desc: 0 });

// quebrar
igual(quebrar('2 PROJÉTEIS', 10, medir, 70, 2), ['2 PROJÉTEIS'], 'cabe numa linha → uma linha');
igual(quebrar('EXPLODE AO ACERTAR', 10, medir, 60, 2), ['EXPLODE AO', 'ACERTAR'], 'duas linhas, a quebra mais equilibrada (empate → 1ª linha mais longa)');
igual(quebrar('EXPLODE AO ACERTAR', 10, medir, 60, 1), null, 'só uma linha permitida e não cabe → null');
igual(quebrar('ATRAVESSAINIMIGOS', 10, medir, 60, 2), null, 'palavra que sozinha não cabe → null (nunca parte a palavra)');

// alturaDoBloco: 1 linha = asc+desc; 2 linhas = asc + passo + desc (passo = ceil(1.25·px))
igual(alturaDoBloco(['A'], 10, medir), 7, 'altura de uma linha');
igual(alturaDoBloco(['A', 'B'], 10, medir), 7 + 13, 'altura de duas linhas');

// tamanhoUnico: o MAIOR px (de ¼ em ¼) em que todos cabem com a folga
igual(tamanhoUnico(['AB', 'ABCDEFGHIJ'], { w: 40, h: 20 }, 1, medir, 10, 2), 6, 'tamanho único limitado pelo mais longo');
let lancou = false;
try { tamanhoUnico(['ABCDEFGHIJKLMNOPQRSTUVWXYZ'], { w: 20, h: 20 }, 1, medir, 10, 2); } catch { lancou = true; }
igual(lancou, true, 'nenhum tamanho cabe → lança erro (melhor quebrar o teste que vazar)');

// posicionar: a TINTA centrada; topo/pé a `folga` da borda (arredondando PARA DENTRO)
igual(posicionar(['ABCD'], 10, medir, { x: 0, y: 0, w: 40, h: 21 }, 'centro', 2), [{ x: 8, base: 14 }], 'centro: tinta 24×7 no meio de 40×21');
igual(posicionar(['ABCD'], 10, medir, { x: 0, y: 0, w: 40, h: 67 }, 'topo', 2.5), [{ x: 8, base: 10 }], 'topo: tinta começa em ≥2.5');
igual(posicionar(['ABCD'], 10, medir, { x: 0, y: 0, w: 40, h: 67 }, 'pe', 2.5), [{ x: 8, base: 64 }], 'pé: tinta acaba em ≤64.5');
igual(posicionar(['ABCD', 'AB'], 10, medir, { x: 0, y: 0, w: 40, h: 40 }, 'centro', 2), [{ x: 8, base: 17 }, { x: 14, base: 30 }], 'duas linhas: bloco centrado, cada linha centrada');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
