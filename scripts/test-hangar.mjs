// 25/10 (night) — the pure logic of the hangar choice (`src/hangar/escolha.ts`), in Node, no browser: where the arrow
// starts, the two sides, the paints wrapping around, the veil, the take-off happening once and freezing the choice.
//   node scripts/test-hangar.mjs
import { novoEstado, mudarLado, mudarPintura, confirmar, escolhaDoEstado, alfaVeu, acabou, andamentoSeta } from '../src/hangar/escolha.ts';

let falhas = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FALHA', m); if (!c) falhas++; };

let e = novoEstado({ modelo: 'a', pintura: 'preta' });
ok(e.lado === 'dir' && e.pinturas.dir === 1, 'entra na "a" preta (a do registry)');
e = novoEstado({ modelo: 'jato', pintura: 'osso' });
ok(e.lado === 'esq' && e.pinturas.esq === 0, 'entra no jato de osso');
e.t = 2;
ok(!mudarLado(e, -1), '← na ponta esquerda não muda');
ok(mudarLado(e, 1) && e.lado === 'dir' && e.ladoAntes === 'esq', '→ leva a seta para a "a"');
ok(andamentoSeta(e) === 0, 'a seta começa a deslizar');
e.t = 2.5;
ok(andamentoSeta(e) === 1, '... e chega');
mudarPintura(e, 1);
ok(escolhaDoEstado(e).pintura === 'preta', '↓ pinta de preta');
mudarPintura(e, 1);
ok(escolhaDoEstado(e).pintura === 'laranja', '↓ dá a volta');
e.t = 0;
ok(alfaVeu(e) === 1, 'o véu começa fechado');
e.t = 3;
ok(alfaVeu(e) === 0, '... e abre');
ok(confirmar(e) && !confirmar(e), 'confirma uma vez só');
ok(!mudarLado(e, -1) && !mudarPintura(e, 1), 'depois de confirmar, nada muda');
e.t = 3 + 1.36;
ok(acabou(e) && alfaVeu(e) > 0.99, 'acaba com o véu fechado');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
