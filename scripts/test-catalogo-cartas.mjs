// O CATÁLOGO bate com a spec (2026-10-01-catalogo-cartas-design.md §2, §3, §4.4, §5.1d). Uso, da raiz:
// node scripts/test-catalogo-cartas.mjs
import fs from 'fs';
import { CARTAS, ICONES_CARTAS } from '../src/data/catalogoCartas.ts';

const falhas = [];
const igual = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — veio ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`}`);
  if (!ok) falhas.push(msg);
};

const ids = Object.keys(CARTAS);
const por = (r) => ids.filter((id) => CARTAS[id].raridade === r).length;
igual(ids.length, 24, '24 cartas');
igual([por('comum'), por('incomum'), por('rara'), por('epica')], [5, 8, 7, 4], 'distribuição 5·8·7·4');
igual(ids.filter((id) => CARTAS[id].id !== id), [], 'a chave é o id da carta');
igual(ids.filter((id) => CARTAS[id].nome.length > 14), [], 'nenhum nome passa de 14 letras');
igual(ids.filter((id) => CARTAS[id].requer && !CARTAS[CARTAS[id].requer]), [], 'todo requisito existe');
const CORTADAS = ['WPN_003', 'WPN_005', 'WPN_006', 'EFF_005', 'EFF_008', 'EFF_009', 'MOV_002', 'MOV_004'];
igual(ids.filter((id) => CORTADAS.includes(id)), [], 'nenhuma carta cortada volta (§2)');
igual(CARTAS.DEF_002.max, 1, 'Recarga máx. 1 (§4.4)');
igual(CARTAS.EFF_003.nome, 'FRAGMENTADO', 'o nome sem Ç (§5.1d)');
igual([CARTAS.MOV_001.semF1, CARTAS.MOV_003.semF1], [true, true], 'movimento fora da F1');
igual(
  [CARTAS.EFF_002.requer, CARTAS.EFF_003.requer, CARTAS.EFF_007.requer, CARTAS.EFF_012.requer, CARTAS.EFF_013.requer],
  ['EFF_001', 'EFF_001', 'EFF_006', 'EFF_011', 'EFF_012'],
  'as cadeias: explosões, fogo e elétrica',
);
igual([CARTAS.WPN_009.max, CARTAS.DEF_005.max], [2, 2], 'Míssil e Bomba Extra: máx. 2');
igual(ICONES_CARTAS.length, 24, 'as 24 têm ícone');
igual(ICONES_CARTAS.filter((id) => !fs.existsSync(`public/sprites/cartas/icone-${id}.png`)), [], 'todo ícone está em public/sprites/cartas');

// A DESCRIÇÃO do ARQUIVO (spec 2026-10-04 §4.1): toda carta tem, sem número (os números vêm de `numerosCartas`), e
// cabe em 3 linhas de 34 caracteres (a largura da ficha na voz do piloto).
const linhasDe = (t, w = 34) =>
  t.split(' ').reduce((ls, p) => {
    const u = ls[ls.length - 1];
    if (u && `${u} ${p}`.length <= w) ls[ls.length - 1] = `${u} ${p}`;
    else ls.push(p);
    return ls;
  }, []);
igual(ids.filter((id) => !CARTAS[id].descricao), [], 'toda carta tem descricao');
igual(ids.filter((id) => /\d/.test(CARTAS[id].descricao ?? '')), [], 'a descricao não tem número');
igual(ids.filter((id) => linhasDe(CARTAS[id].descricao ?? '').length > 3), [], 'a descricao cabe em 3 linhas');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
