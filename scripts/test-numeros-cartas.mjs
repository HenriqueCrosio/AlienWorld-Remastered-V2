// OS NÚMEROS DAS CARTAS num endereço só (spec 2026-10-04-arquivo-de-cartas §4.2). Uso: node scripts/test-numeros-cartas.mjs
import { NUMEROS, numerosDaCarta } from '../src/data/numerosCartas.ts';
import { CARTAS } from '../src/data/catalogoCartas.ts';

const falhas = [];
const igual = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — veio ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`}`);
  if (!ok) falhas.push(msg);
};

// Os valores de hoje (04/10) — a troca de endereço não muda nenhum.
igual(NUMEROS.missil.recargaMs, [8000, 5000], 'míssil: recarga 8s / 5s');
igual(NUMEROS.eletrico.chance, 0.2, 'elétrico: 20%');
igual(NUMEROS.tranco.px, 8, 'tranco: 8px');
igual(NUMEROS.casco.recargaS, [8, 5.5], 'casco: 8s / 5,5s com Recarga');

// A linha da ficha sai do módulo.
igual(numerosDaCarta('WPN_009'), 'recarga 8s (×2: 5s) · dano 2 · explosão raio 20', 'linha do míssil');
igual(numerosDaCarta('EFF_011'), '20% por acerto · trava 0,4s', 'linha do elétrico');
igual(numerosDaCarta('WPN_007'), 'dano 100% → 90% → 60% → 30%', 'linha do Perfurante (a queda por inimigo)');
igual(numerosDaCarta('WPN_001'), '', 'o Tiro Duplo não tem número');
// Mexer no módulo muda a ficha (o que a calibragem vai fazer).
NUMEROS.missil.recargaMs[0] = 9000;
igual(numerosDaCarta('WPN_009').startsWith('recarga 9s'), true, 'a ficha acompanha o módulo');
NUMEROS.missil.recargaMs[0] = 8000;
// Toda carta do catálogo passa pela função sem erro.
igual(Object.keys(CARTAS).filter((id) => typeof numerosDaCarta(id) !== 'string'), [], 'as 24 têm linha (ou vazia)');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
