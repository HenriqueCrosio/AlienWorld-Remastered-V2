// THE DEV SHORTCUTS, the pure rules (24/11, the Beast's step 1 — spec 2026-11-24-besta-refeita §7): the ready hands are
// legal hands, the phase names and the URL, and the frame-by-frame jump to a phase.
//   node --experimental-transform-types scripts/test-dev-atalhos.mjs
import { MAOS, NOMES_MAO, ehNomeMao, maoPorNome } from '../src/dev/maos.ts';
import { FASES_DEV, estagioDaFase, lerAtalhoFase } from '../src/dev/fasesDev.ts';
import { IrParaFase } from '../src/dev/irParaFase.ts';
import { CARTAS } from '../src/data/catalogoCartas.ts';

const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${ok ? '' : ` → ${JSON.stringify(info)}`}`);
  if (!ok) falhas.push(nome);
};

// ── the hands ──
conferir(NOMES_MAO.join(',') === 'nenhuma,mediana,forte,sandbox', 'os 4 nomes de mão, nesta ordem (as teclas 1–4 do painel)', NOMES_MAO);
conferir(MAOS.nenhuma.length === 0, 'a "nenhuma" não tem carta', MAOS.nenhuma);
for (const nome of ['mediana', 'forte']) {
  const m = MAOS[nome];
  const conta = (id) => m.filter((c) => c === id).length;
  conferir(m.every((id) => CARTAS[id]), `${nome}: toda carta existe no catálogo`, m.filter((id) => !CARTAS[id]));
  conferir(m.every((id) => conta(id) <= CARTAS[id].max), `${nome}: nenhuma carta passa do limite (max)`, m.filter((id) => conta(id) > CARTAS[id].max));
  conferir(m.every((id) => !CARTAS[id].requer || m.includes(CARTAS[id].requer)), `${nome}: todo requisito (requer) está na mão`, m.filter((id) => CARTAS[id].requer && !m.includes(CARTAS[id].requer)));
  conferir(m.every((id) => !CARTAS[id].excluiSe || !m.includes(CARTAS[id].excluiSe)), `${nome}: nenhuma carta com a que a exclui (excluiSe)`, null);
}
conferir(MAOS.forte.length > MAOS.mediana.length, 'a forte tem mais cartas que a mediana', [MAOS.mediana.length, MAOS.forte.length]);
conferir(maoPorNome('mediana') !== MAOS.mediana && maoPorNome('mediana').join() === MAOS.mediana.join(), 'maoPorNome devolve uma CÓPIA (o registry não pode segurar a constante)', null);
conferir(maoPorNome('sandbox', { WPN_004: 2, DEF_001: 1 }).sort().join() === ['DEF_001', 'WPN_004', 'WPN_004'].join(), 'a "sandbox" é a mão dos níveis da montagem', maoPorNome('sandbox', { WPN_004: 2, DEF_001: 1 }));
conferir(maoPorNome('sandbox').length === 0, 'a "sandbox" sem montagem é vazia', null);
conferir(ehNomeMao('forte') && !ehNomeMao('Forte') && !ehNomeMao(null), 'ehNomeMao só aceita os 4 nomes exatos', null);

// ── the phases and the URL ──
conferir(FASES_DEV[4].join(',') === 'guardiao1,guardiao2,guardiao3,besta1,besta2,besta3', 'as fases da F4: os 3 degraus do Guardião e as 3 da Besta', FASES_DEV[4]);
conferir(FASES_DEV[1].join() === 'torre1,torre2' && FASES_DEV[2].join() === 'capitania1,capitania2' && FASES_DEV[3].join() === 'serpenteA,serpenteB,serpenteC,enguia', 'as fases da F1–F3', FASES_DEV);
conferir(estagioDaFase('besta3') === 4 && estagioDaFase('torre1') === 1 && estagioDaFase('enguia') === 3, 'cada fase sabe o seu estágio', null);
conferir(estagioDaFase('fusao') === null && estagioDaFase('troca') === null, 'as transições (fusao, troca) não são alvo', null);
const u = (s) => lerAtalhoFase(new URLSearchParams(s));
conferir(JSON.stringify(u('?fase=besta3&mao=mediana')) === JSON.stringify({ stage: 4, fase: 'besta3', mao: 'mediana' }), '?fase=besta3&mao=mediana', u('?fase=besta3&mao=mediana'));
conferir(JSON.stringify(u('?fase=capitania2')) === JSON.stringify({ stage: 2, fase: 'capitania2', mao: null }), 'sem mão: a mão fica a do registry', u('?fase=capitania2'));
conferir(u('?fase=besta3&mao=xx').mao === null, 'mão desconhecida = sem mão', u('?fase=besta3&mao=xx'));
conferir(u('?fase=besta9') === null && u('?mao=forte') === null && u('') === null, 'fase desconhecida ou ausente = nenhum atalho', null);

// ── the jump to a phase ──
{
  // a fake boss: 3 phases; it refuses the jump for 2 frames after each one (a transition)
  const nomes = ['x1', 'x2', 'x3'];
  let i = 0, espera = 0, pedidos = 0;
  const chefe = {
    get devFaseAtual() { return nomes[i]; },
    devProximaFase() { pedidos++; if (espera > 0) { espera--; return null; } if (i >= 2) return null; i++; espera = 2; return nomes[i]; },
  };
  const ir = new IrParaFase('x3');
  let quadros = 0;
  while (!ir.passo(chefe, 1 / 60) && quadros < 100) quadros++;
  conferir(chefe.devFaseAtual === 'x3', 'chega à fase-alvo, esperando as transições', { fase: chefe.devFaseAtual, quadros, pedidos });
  conferir(quadros <= 8, `em poucos quadros (${quadros})`, quadros);
  const pedidosAntes = pedidos;
  conferir(ir.passo(chefe, 1 / 60) === true && pedidos === pedidosAntes, 'na fase-alvo, não pede mais nada', pedidos);
}
{
  const ir = new IrParaFase('x1');
  conferir(ir.passo(null, 1 / 60) === false, 'sem chefão ainda (antes do spawn): espera', null);
  conferir(ir.passo({}, 1 / 60) === false, 'chefão sem fases: espera (até o limite)', null);
  const desiste = new IrParaFase('nunca', 1);
  let fim = false;
  for (let k = 0; k < 70 && !fim; k++) fim = desiste.passo({ devFaseAtual: 'a', devProximaFase: () => null }, 1 / 60);
  conferir(fim, 'uma fase que nunca chega: desiste depois do limite', null);
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
