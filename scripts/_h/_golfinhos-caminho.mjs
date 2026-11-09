// BLOCO H (09/11) — searches the dolphins' curve: the share of the pass over chamber B's bright tunnel (x 70–250,
// y 25–130, measured in the game), for control points and ends around the current ones. Prints the best few.
//   node scripts/_h/_golfinhos-caminho.mjs
import { poseGolfinho } from '../../src/f4/golfinhosFundo.ts';
const res = [];
for (let mx = 120; mx <= 260; mx += 20) for (let my = 20; my <= 120; my += 10) for (const ax of [60, 90, 120, 150]) {
  const n = { t0: 0, dur: 3.8, de: [414, 18], meio: [mx, my], ate: [ax, 250], largura: 1, onda: [7, 118, 0] };
  const m = { ...n, de: [424, 34], meio: [mx + 12, my + 18], ate: [ax + 16, 266], largura: 0, onda: [6, 104, 1.7] };
  const frac = (q) => { let c = 0, t = 0; for (let s = 0; s < q.dur; s += 1 / 60) { const p = poseGolfinho(q, s); t++; if (p.cx >= 70 && p.cx <= 250 && p.cy >= 25 && p.cy <= 130) c++; } return c / t; };
  res.push({ mx, my, ax, a: frac(n), b: frac(m) });
}
res.sort((p, q) => Math.min(q.a, q.b) - Math.min(p.a, p.b));
for (const r of res.slice(0, 6)) console.log(r.mx, r.my, r.ax, (100 * r.a).toFixed(0) + '%', (100 * r.b).toFixed(0) + '%');
