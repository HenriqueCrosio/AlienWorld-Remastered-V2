// A BOMBA DE QUEDA (spec 2026-10-03-bomba-de-queda-design.md). Uso, da raiz: node scripts/test-bomba-regras.mjs
import { BOMBA, lancamento, passo } from '../src/bombaRegras.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const voar = (b, s) => {
  for (let t = 0; t < s; t += 1 / 60) b = passo(b, 1 / 60);
  return b;
};

conferir(BOMBA.modo === 'queda', 'a bomba nova é a padrão (a de pânico fica guardada)', BOMBA.modo);

const a = lancamento('atmosfera', 100, 80, 40, -50);
conferir(a.x === 100 && a.y === 86 && a.vx === 40 && a.vy === -50 && a.pavioMs === null, 'atmosfera: solta da barriga com a velocidade da nave, sem pavio', a);
const a1 = voar(a, 1);
conferir(a1.y > a.y && a1.vy > 300, 'atmosfera: em 1s ela já desce rápido (gravidade)', a1);
const a3 = voar(a, 3);
conferir(Math.abs(a3.vx - BOMBA.freioAlvo) < 3, 'atmosfera: o ar leva o vx até o alvo (fica para trás aos poucos)', a3.vx);

const v = lancamento('vacuo', 100, 80, 20, 10);
conferir(v.x === 110 && v.vx === 20 + BOMBA.arremesso && v.vy === 10 && v.pavioMs === BOMBA.pavioMs, 'vácuo: arremessada à frente, com pavio', v);
const v1 = voar(v, 1);
conferir(Math.abs(v1.vx - v.vx) < 1e-9 && Math.abs(v1.vy - v.vy) < 1e-9, 'vácuo: segue reta, sem gravidade nem freio', v1);
conferir(Math.abs(v1.x - (v.x + v.vx)) < 1 && Math.abs(v1.y - (v.y + v.vy)) < 1, 'vácuo: anda a própria velocidade em 1s', v1);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
