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
conferir(a.x === 100 && a.y === 86 && a.vx === 40 + BOMBA.soltura && a.vy === -50 && a.pavioMs === null, 'atmosfera: solta da barriga um pouco para a FRENTE (nave + soltura), sem pavio', a);
conferir(a.giro === 0, 'atmosfera: não gira — o nariz segue a queda', a.giro);
const a1 = voar(a, 1);
conferir(a1.y > a.y && a1.vy > 300, 'atmosfera: em 1s ela já desce rápido (gravidade)', a1);
// A PARÁBOLA SE VÊ (03/10, ele: *"quase não vi parábola nela"*): parada, ela anda ≥ 40px para a frente antes de
// cair 120px (o chão fica ~130px abaixo da nave na F1).
const parada = lancamento('atmosfera', 100, 80, 0, 0);
let p = parada;
while (p.y < parada.y + 120) p = passo(p, 1 / 60);
conferir(p.x - parada.x >= 40, 'atmosfera: até cair 120px ela avança ≥ 40px (a parábola aparece)', p.x - parada.x);
const a12 = voar(a, 12);
conferir(Math.abs(a12.vx - BOMBA.freioAlvo) < 1, 'atmosfera: o ar leva o vx até o alvo (fica para trás aos poucos)', a12.vx);

const v = lancamento('vacuo', 100, 80, 20, 10);
conferir(v.x === 110 && v.vx === 20 + BOMBA.arremesso && v.vy === 10 && v.pavioMs === BOMBA.pavioMs, 'vácuo: arremessada à frente, com pavio', v);
conferir(v.giro === BOMBA.giro && v.giro > 0, 'vácuo: sai RODANDO (03/10, ele: "fica um visual melhor")', v.giro);
const v1 = voar(v, 1);
conferir(Math.abs(v1.vx - v.vx) < 1e-9 && Math.abs(v1.vy - v.vy) < 1e-9, 'vácuo: segue reta, sem gravidade nem freio', v1);
conferir(Math.abs(v1.x - (v.x + v.vx)) < 1 && Math.abs(v1.y - (v.y + v.vy)) < 1, 'vácuo: anda a própria velocidade em 1s', v1);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
