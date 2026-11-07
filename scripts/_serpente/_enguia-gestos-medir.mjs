// 07/11 — stage 3 (the head's animations): where each gesture of the mock falls — the head's roll φ, its screen angle,
// mirrored or not, visible or not — so each animated clip knows if it plays on the profile art (φ = 0 or π) or mid-turn.
//   node scripts/_serpente/_enguia-gestos-medir.mjs
import { N } from './enguia/numeros.mjs';
import { montaRoteiro } from './enguia/roteiro.mjs';
import { medidas } from './enguia/medidas.mjs';
import { pose, mordidas } from './enguia/corpo.mjs';
import { Eco } from './enguia/eco.mjs';

const med = await medidas(N);
const R = montaRoteiro(N, med, {});
const mord = mordidas(R, N, med);
const graus = (r) => Math.round((r * 180) / Math.PI);
const amostra = (t) => {
  const P = pose(R, N, med, t, { mord }), C = P.cabeca;
  const vis = C.focinho.y > -10 && C.focinho.y < N.tela.H && C.focinho.x > -10 && C.focinho.x < N.tela.W + 10;
  return { t: +t.toFixed(2), fi: graus(C.fi), ang: graus(C.ang), espelho: C.espelho, vis };
};
const faixa = (rot, t0, t1) => {
  const a = [];
  for (let t = t0; t <= t1 + 1e-9; t += 0.1) a.push(amostra(t));
  const fis = a.map((q) => q.fi), angs = a.map((q) => q.ang);
  console.log(`${rot.padEnd(34)} t ${t0.toFixed(2)}–${t1.toFixed(2)}  φ ${Math.min(...fis)}..${Math.max(...fis)}°  ang ${Math.min(...angs)}..${Math.max(...angs)}°  espelho ${[...new Set(a.map((q) => q.espelho))].join('/')}  visível ${a.filter((q) => q.vis).length}/${a.length}`);
};

for (const tr of R.trechos) {
  if (tr.hab === 'eco') {
    const E = new Eco(tr.t0, N, tr.final);
    for (const r of E.rodadas) {
      faixa(`eco c${tr.ciclo ?? '-'}${tr.final ? ' final' : ''} · leitura`, r.ini, r.cospe);
      faixa(`eco c${tr.ciclo ?? '-'}${tr.final ? ' final' : ''} · cuspe (0,35 s)`, r.cospe, r.cospe + 0.35);
      faixa(`eco c${tr.ciclo ?? '-'}${tr.final ? ' final' : ''} · depois`, r.cospe + 0.35, tr.t1);
    }
  } else if (tr.hab === 'canos') faixa(`canos c${tr.ciclo ?? '-'}`, tr.t0, tr.t1);
  else if (tr.prepara) faixa(`prepara ${tr.cap} c${tr.ciclo ?? '-'}`, tr.t0, tr.t1);
  else if (['presa', 'desfaz'].includes(tr.hab)) faixa(tr.hab, tr.t0, tr.t1);
}
console.log(`\ncrânio mordido em t ${mord.find((m) => m.cranio).t.toFixed(2)}:`, amostra(mord.find((m) => m.cranio).t));
// the idle: every moving stretch, how much of it sits off the profile (φ not near 0/180)
let total = 0, rolando = 0;
for (let t = 0; t < R.T; t += 0.1) {
  const q = amostra(t), tr = R.estado(t).trecho;
  if (tr.hab || tr.prepara || !q.vis) continue;
  total++; if (q.fi > 5 && q.fi < 175) rolando++;
}
console.log(`nadar (visível, em movimento): ${(total / 10).toFixed(1)} s, dos quais ${(rolando / 10).toFixed(1)} s fora do perfil`);
