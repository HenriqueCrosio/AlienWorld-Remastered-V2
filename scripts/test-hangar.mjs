// 25/10 (night) — the pure logic of the hangar choice (`src/hangar/escolha.ts`), in Node, no browser: where the arrow
// starts, the two sides, the paints wrapping around, the veil, the take-off happening once and freezing the choice.
//   node scripts/test-hangar.mjs
import { novoEstado, mudarLado, mudarPintura, confirmar, escolhaDoEstado, alfaVeu, acabou, andamentoSeta, saidaDoHangar } from '../src/hangar/escolha.ts';
import { TEMPO } from '../src/hangar/numerosHangar.ts';

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

// A SAÍDA MEDIDA PELA DECOLAGEM (18/11): o som termina no último instante da tela preta
for (const dur of [3.16, 3.92]) {
  const s = saidaDoHangar(dur);
  ok(Math.abs(s.fim - (TEMPO.somEntra + dur)) < 1e-9, `${dur} s de som: a cena acaba quando ele acaba`);
  const x = novoEstado({ modelo: 'a', pintura: 'preta' });
  x.t = 5; confirmar(x); x.saida = s;
  x.t = 5 + s.fim - TEMPO.pretoSegura;
  ok(alfaVeu(x) > 0.99, `${dur} s de som: ${TEMPO.pretoSegura} s antes do fim a tela já está preta`);
  x.t = 5 + s.veuFecha - 0.01;
  ok(alfaVeu(x) === 0, `${dur} s de som: até ali o hangar segue à vista`);
  x.t = 5 + s.fim - 0.01;
  ok(!acabou(x), `${dur} s de som: a fase não começa antes de ele acabar`);
}
ok(saidaDoHangar(0).fim === TEMPO.fim, 'sem som (áudio travado): o tempo de sempre');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
