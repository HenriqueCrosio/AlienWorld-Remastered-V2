// where does the serpent body bend most? per phase: the worst turn (degrees, between 4 px chords) and where along the
// body it is (px from the head). Tuning aid for the "no corner" rule of step 3.
//   node --experimental-transform-types scripts/_guardiao/_dobra.mjs
import { Serpente, passoSerpentes } from '../../src/entities/guardiao/serpente.ts';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pior = (pts) => {
  const r = [pts[0]];
  const s = [0];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += dist(pts[i], pts[i - 1]);
    if (dist(pts[i], r[r.length - 1]) >= 4) { r.push(pts[i]); s.push(acc); }
  }
  let m = 0, onde = 0;
  for (let i = 2; i < r.length; i++) {
    const a = Math.atan2(r[i - 1].y - r[i - 2].y, r[i - 1].x - r[i - 2].x), b = Math.atan2(r[i].y - r[i - 1].y, r[i].x - r[i - 1].x);
    let d = Math.abs(b - a);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d > m) { m = d; onde = s[i - 1]; }
  }
  return { graus: (m * 180) / Math.PI, onde };
};
for (const [nome, p, nave] of [
  ['cima', { raiz: { x: 303, y: 53 }, c1: { x: 245, y: -2 }, c2: { x: 223, y: 54 }, posto: { x: 183, y: 54 } }, { x: 80, y: 110 }],
  ['baixo', { raiz: { x: 334, y: 136 }, c1: { x: 330, y: 240 }, c2: { x: 218, y: 128 }, posto: { x: 178, y: 128 } }, { x: 80, y: 110 }],
  ['cima-nave-alta', { raiz: { x: 303, y: 53 }, c1: { x: 245, y: -2 }, c2: { x: 223, y: 54 }, posto: { x: 183, y: 54 } }, { x: 60, y: 20 }],
  ['baixo-nave-baixa', { raiz: { x: 334, y: 136 }, c1: { x: 330, y: 240 }, c2: { x: 218, y: 128 }, posto: { x: 178, y: 128 } }, { x: 60, y: 200 }],
]) {
  const s = new Serpente({ ...p, atraso: 0, botes: 2, ensaio: 1.1, fintas: 2 });
  const por = {};
  for (let i = 0; i < 60 * 20 && !s.acabou; i++) {
    passoSerpentes([s], 1 / 60, nave);
    const c = s.corpo();
    if (c.length < 3) continue;
    const r = pior(c);
    if (!por[s.fase] || r.graus > por[s.fase].graus) por[s.fase] = { ...r, i };
  }
  console.log(nome, Object.entries(por).map(([f, r]) => `${f} ${r.graus.toFixed(0)}° a ${r.onde.toFixed(0)} px (q${r.i})`).join(' · '));
}
