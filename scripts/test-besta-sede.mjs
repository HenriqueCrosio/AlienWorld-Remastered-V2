// THE THIRST, the pure rules (25/11, the Beast's step 5 — spec 2026-11-24 §4.1): every drunk shot comes back along its
// own line, reversed, in the order it came in, squeezed into ~0.6 s; returns on the same line closer than 4 px merge;
// at most 24 come back.
//   node --experimental-transform-types scripts/test-besta-sede.mjs
import { SEDE, devolucao } from '../src/entities/besta/sede.ts';

const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${ok ? '' : ` → ${JSON.stringify(info)}`}`);
  if (!ok) falhas.push(nome);
};
const tiro = (x, y, angGraus, t, cor = 0xffa040) => {
  const a = (angGraus * Math.PI) / 180;
  return { x, y, dx: Math.cos(a), dy: Math.sin(a), t, cor };
};
const quase = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// ── nothing, one ──
conferir(devolucao([]).length === 0, 'a lista vazia não devolve nada', null);
{
  const r = devolucao([tiro(280, 100, 0, 0.7)]);
  conferir(r.length === 1 && r[0].t === 0, 'um tiro só volta em t = 0', r);
  conferir(r.length === 1 && quase(r[0].vx, -SEDE.V) && quase(r[0].vy, 0) && r[0].x === 280 && r[0].y === 100, 'a linha volta ao contrário, do ponto onde entrou', r);
}
// ── a diagonal line reverses exactly ──
{
  const r = devolucao([tiro(280, 100, 20, 0)]);
  const a = (20 * Math.PI) / 180;
  conferir(quase(r[0].vx, -Math.cos(a) * SEDE.V) && quase(r[0].vy, -Math.sin(a) * SEDE.V), 'a diagonal volta pela mesma reta', r);
}
// ── order and the squeezed time ──
{
  const entrada = [tiro(280, 60, 0, 0.1, 1), tiro(280, 120, 0, 0.9, 2), tiro(280, 160, 0, 1.9, 3)];
  const r = devolucao([entrada[2], entrada[0], entrada[1]]);
  conferir(r.map((d) => d.cor).join() === '1,2,3', 'a ordem de entrada se mantém', r.map((d) => d.cor));
  conferir(quase(r[0].t, 0) && quase(r[2].t, SEDE.DEVOLVE_S) && quase(r[1].t, (SEDE.DEVOLVE_S * 0.8) / 1.8), 'o tempo comprimido vai de 0 a 0,6 s, proporcional', r.map((d) => d.t));
}
// ── the stationary HMG: a wall at that height ──
{
  const hmg = Array.from({ length: 36 }, (_, i) => tiro(281 + (i % 3), 108, 0, 0.02 + i / 18));
  const r = devolucao(hmg);
  const mesmaAltura = r.every((d) => d.y === 108 && quase(d.vy, 0));
  let menor = Infinity;
  for (let i = 1; i < r.length; i++) menor = Math.min(menor, (r[i].t - r[i - 1].t) * SEDE.V);
  conferir(r.length > 1 && r.length <= SEDE.TETO, `a HMG parada vira uma parede de ≤ ${SEDE.TETO}`, r.length);
  conferir(mesmaAltura, 'a parede fica na altura da nave', null);
  conferir(menor >= SEDE.JUNTA_PX - 1e-6, 'os tiros da parede a ≥ 4 px um do outro', menor);
  conferir(quase(r[0].t, 0) && quase(r.at(-1).t, SEDE.DEVOLVE_S), 'o teto guarda o primeiro e o último', [r[0].t, r.at(-1).t]);
}
// ── the spreader: a fan comes back as a fan ──
{
  const leque = [];
  for (let k = 0; k < 4; k++) for (const ang of [-11, 0, 11]) leque.push(tiro(280, 108 + Math.tan((ang * Math.PI) / 180) * 220, ang, k * 0.33));
  const r = devolucao(leque);
  const rumos = new Set(r.map((d) => Math.round((Math.atan2(d.vy, d.vx) * 180) / Math.PI)));
  conferir(rumos.size === 3, 'o dispersor volta como 3 linhas', [...rumos]);
}
// ── merging across lines: parallel lines 3 px apart are one line, 5 px apart are two ──
{
  const par = (dy) => [0, 0.5, 1, 1.5, 2].flatMap((t) => [tiro(280, 100, 0, t), tiro(280, 100 + dy, 0, t + 0.001)]);
  const a = devolucao(par(3));
  const b = devolucao(par(5));
  conferir(new Set(a.map((d) => d.y)).size === 1, 'duas linhas paralelas a 3 px viram uma', a.map((d) => d.y));
  conferir(new Set(b.map((d) => d.y)).size === 2, 'a 5 px ficam duas', b.map((d) => d.y));
}
// ── the Duplo: its two lines (4 px apart) come back as one line of paired beads ──
{
  const duplo = [0, 0.4, 0.8, 1.2].flatMap((t) => [{ ...tiro(280, 98, 0, t), forma: 2 }, { ...tiro(280, 102, 0, t + 0.001), forma: 2 }]);
  const r = devolucao(duplo);
  conferir(new Set(r.map((d) => d.y)).size === 1 && r.length === 4 && r.every((d) => d.forma === 2), 'o Duplo volta como UMA linha de pares', r.map((d) => [d.y, d.forma]));
}
// ── the cap with many lines ──
{
  const muitas = Array.from({ length: 40 }, (_, i) => tiro(280, 30 + i * 4, 0, i * 0.05));
  const r = devolucao(muitas);
  conferir(r.length === SEDE.TETO, `40 linhas viram ${SEDE.TETO}`, r.length);
  conferir(r[0].y === 30 && r.at(-1).y === 30 + 39 * 4, 'e guardam a primeira e a última', [r[0].y, r.at(-1).y]);
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\ntudo certo');
process.exit(falhas.length ? 1 : 0);
