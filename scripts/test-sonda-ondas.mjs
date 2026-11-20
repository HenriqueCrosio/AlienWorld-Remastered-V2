// THE SONDA's WAVES (spec 2026-11-20 §2). From the root: node --experimental-transform-types scripts/test-sonda-ondas.mjs
import { STAGE_1, STAGE_2, STAGE_3 } from '../src/systems/StageDirector.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const ondas = (st, k) => st.filter((e) => e.type === 'wave' && e.kind === k);

conferir(ondas(STAGE_2, 'batedor').length === 0, 'F2: nenhum batedor (ele só existia como dardo)', ondas(STAGE_2, 'batedor'));
const s2 = ondas(STAGE_2, 'sonda');
conferir(JSON.stringify(s2.map((w) => w.t)) === JSON.stringify([9, 24, 33, 48, 58, 84]), 'F2: as sondas nos tempos dos dardos', s2.map((w) => w.t));
conferir(s2.every((w) => w.count === 3), 'F2: 3 por onda', s2.map((w) => w.count));
const s3 = ondas(STAGE_3, 'sonda');
conferir(s3.length === 3 && s3.every((w) => w.count === 3), 'F3: 3 ondas de 3', s3);
conferir(s3.every((w) => (w.t < 44.5 - 6 || w.t >= 57) && w.t < 91), 'F3: fora da passagem do rabo (o quadro vazio) e antes da arena', s3.map((w) => w.t));
conferir(ondas(STAGE_3, 'batedor').length === 5, 'F3: os 5 batedores roxos ficam', ondas(STAGE_3, 'batedor').length);
conferir(ondas(STAGE_1, 'sonda').length === 0 && ondas(STAGE_1, 'batedor').length === 7, 'F1: sem sonda, os batedores de sempre', ondas(STAGE_1, 'batedor').length);

console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\ntudo certo');
process.exitCode = falhas.length ? 1 : 0;
