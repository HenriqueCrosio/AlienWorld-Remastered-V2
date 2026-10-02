// As REGRAS da árvore do sandbox (spec 2026-10-02-sandbox-dev-design.md §2) — as do JOGO, não as do WoW.
// Uso, da raiz: node scripts/test-sandbox-arvore.mjs
import { ARVORES, ATALHOS, atalho, gastos, limiteDePontos, mao, podeSomar, podeTirar, semF1Fora, somar, tirar } from '../src/sandbox/arvore.ts';
import { CARTAS } from '../src/data/catalogoCartas.ts';

const falhas = [];
const igual = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — veio ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`}`);
  if (!ok) falhas.push(msg);
};
const ctx = (o = {}) => ({ nave: 'humana', livre: false, fase: 2, ...o });

// o layout cobre as 24, cada uma uma vez, na árvore da sua categoria
const noLayout = ARVORES.flatMap((a) => a.nos.map((n) => n.id));
igual(noLayout.length, 24, 'o layout tem as 24 cartas');
igual(new Set(noLayout).size, 24, 'nenhuma carta repetida');
igual(ARVORES.every((a) => a.nos.every((n) => CARTAS[n.id].categoria === a.categoria)), true, 'cada carta na árvore da sua categoria');

// pontos: o máximo REAL da campanha
igual([limiteDePontos(ctx()), limiteDePontos(ctx({ nave: 'alienigena' })), limiteDePontos(ctx({ livre: true }))], [7, 8, Infinity], 'limite 7 humana · 8 alien · LIVRE sem limite');

// somar: requisito, máximo, limite, Triplo tranca Duplo, semF1
let r = {};
igual(podeSomar('EFF_006', r, ctx()), false, 'Combustão sem Incendiário: não');
r = somar('EFF_004', r, ctx());
igual(podeSomar('EFF_006', r, ctx()), true, 'Combustão com Incendiário: sim');
r = somar('WPN_004', somar('WPN_004', somar('WPN_004', r, ctx()), ctx()), ctx());
igual([r.WPN_004, podeSomar('WPN_004', r, ctx())], [3, false], 'Cadência para em 3/3');
r = somar('WPN_002', r, ctx());
igual(podeSomar('WPN_001', r, ctx()), false, 'com o Triplo, o Duplo tranca');
igual(gastos(r), 5, 'gastos contam os níveis');
r = somar('DEF_001', somar('DEF_003', r, ctx()), ctx());
igual([gastos(r), podeSomar('DEF_005', r, ctx()), podeSomar('DEF_005', r, ctx({ nave: 'alienigena' }))], [7, false, true], 'no limite (7) não soma; a alien ainda tem 1');
igual(podeSomar('DEF_005', r, ctx({ livre: true })), true, 'LIVRE passa do limite');
igual([podeSomar('MOV_003', {}, ctx({ fase: 1 })), podeSomar('MOV_003', {}, ctx({ fase: 2 }))], [false, true], 'Dash não existe na F1');

// tirar: não tira quem segura outro
r = somar('EFF_006', r, ctx({ livre: true }));
igual(podeTirar('EFF_004', r), false, 'não tira o Incendiário enquanto a Combustão depende dele');
igual(podeTirar('EFF_006', r), true, 'a ponta da cadeia sai');
r = tirar('EFF_006', r);
igual([r.EFF_006 ?? 0, podeTirar('EFF_004', r)], [0, true], 'tirada a Combustão, o Incendiário sai');
igual(tirar('WPN_004', { WPN_004: 2 }).WPN_004, 1, 'tirar baixa um nível');

// atalhos: a cadeia inteira, respeitando o limite
igual(Object.keys(ATALHOS).sort(), ['CASCO', 'ELÉTRICA', 'EXPLOSÕES', 'FOGO'], 'os 4 atalhos');
igual(atalho('FOGO', {}, ctx()), { EFF_004: 1, EFF_006: 1, EFF_007: 1 }, 'FOGO = Incendiário → Combustão → Em Cadeia');
igual(gastos(atalho('ELÉTRICA', { WPN_004: 3, WPN_002: 1, DEF_001: 1, DEF_003: 1 }, ctx())), 7, 'o atalho para no limite');

// mao: a lista que vai para o registry, requisitos antes, níveis repetidos
igual(mao({ EFF_006: 1, EFF_004: 1, WPN_004: 2 }), ['WPN_004', 'WPN_004', 'EFF_004', 'EFF_006'], 'a mão sai na ordem da árvore, com repetição');

// semF1Fora: trocar o fundo para a F1 tira Dash e Propulsores
igual(semF1Fora({ MOV_003: 1, MOV_001: 2, WPN_001: 1 }), { WPN_001: 1 }, 'na F1, as de movimento saem');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
