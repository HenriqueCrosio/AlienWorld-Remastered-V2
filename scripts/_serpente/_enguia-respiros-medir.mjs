// 08/11 — Part B, step 3 (the body's effects): MEASURE before drawing. Where the jets belong (the bends, the starts
// from rest) and where the piece and its motion are weakest (what an effect should cover), frame by frame on the
// approved fight:
//   - the bends: the body's curvature along the tube (rad per px), in sight, out of the den — the tightest per frame;
//   - the starts: the legs that leave rest (`para0`), their ramp; the speed's jumps (accel) along the whole fight;
//   - the roll in sight: how fast φ turns on the rings in sight (the twist running down her body);
//   - the head: how fast its angle turns (the snap at a turn-over);
//   - the straight runs: long stretches of body in sight with no bend (the strip's repeat shows there);
//   - the bottom edge: where her body crosses y 216 outside the breach (spec §8: "vindo de baixo da tela").
//   node scripts/_serpente/_enguia-respiros-medir.mjs [out.json]
import fs from 'node:fs';
import { N } from './enguia/numeros.mjs';
import { montaRoteiro } from './enguia/roteiro.mjs';
import { medidas } from './enguia/medidas.mjs';
import { pose, mordidas } from './enguia/corpo.mjs';

const OUT = process.argv[2] ?? 'docs/superpowers/folhas/2026-11-08/enguia-respiros/medidas.json';
const med = await medidas(N);
const R = montaRoteiro(N, med, {});
const mord = mordidas(R, N, med);
const dt = 1 / N.tela.fps, W = N.tela.W, H = N.tela.H;
const naTela = (p, m = 0) => p.x >= -m && p.x < W + m && p.y >= -m && p.y < H + m;

const quadros = [];
let antes = null;
for (let f = 0; f * dt <= R.T; f++) {
  const t = f * dt, P = pose(R, N, med, t, { mord }), tr = P.e.trecho;
  const tubo = P.tubo;
  // curvature: the heading's turn over 10 px of arc, per px, on samples in sight and out of the den
  let kMax = 0, kU = null, kX = null, kY = null;
  const curvas = [];
  for (let i = 5; i < tubo.length - 5; i++) {
    const a = tubo[i - 5], b = tubo[i + 5], c = tubo[i];
    if (!naTela(c, -4) || c.toca) continue;
    const da = Math.atan2(a.dy, a.dx), db = Math.atan2(b.dy, b.dx);
    const k = Math.abs(Math.atan2(Math.sin(db - da), Math.cos(db - da))) / (b.u - a.u);
    if (k > kMax) { kMax = k; kU = c.u; kX = c.x; kY = c.y; }
    curvas.push(k);
  }
  // the longest straight run in sight (k < 0.004 rad/px ≈ under 6° per 26 px ring)
  let reta = 0, run = 0;
  for (let i = 5; i < tubo.length - 5; i++) {
    const a = tubo[i - 5], b = tubo[i + 5], c = tubo[i];
    const da = Math.atan2(a.dy, a.dx), db = Math.atan2(b.dy, b.dx);
    const k = Math.abs(Math.atan2(Math.sin(db - da), Math.cos(db - da))) / (b.u - a.u);
    if (naTela(c, -4) && !c.toca && k < 0.004) { run += N.tubo.passo; reta = Math.max(reta, run); } else run = 0;
  }
  // the bottom edge, outside the breach's columns
  const borda = tubo.filter((q) => q.y > H - 3 && q.y < H + q.r && q.x > 0 && q.x < W && (q.x < N.rombo.x0 || q.x > N.rombo.x1)).length;
  // the roll in sight: φ's speed on the samples in sight
  let rolar = 0;
  if (antes) for (let i = 0; i < Math.min(tubo.length, antes.tubo.length); i++) {
    const c = tubo[i];
    if (!naTela(c, -4) || c.toca) continue;
    rolar = Math.max(rolar, Math.abs(c.fi - antes.tubo[i].fi) / dt);
  }
  // the head: the chord's turn speed and the view's (roll) speed, when it is in sight
  const C = P.cabeca, cabVis = naTela(C.focinho, -2);
  const giroCab = antes && cabVis ? Math.abs(Math.atan2(Math.sin(C.ang - antes.cabeca.ang), Math.cos(C.ang - antes.cabeca.ang))) / dt : 0;
  const rolarCab = antes && cabVis ? Math.abs(C.fi - antes.cabeca.fi) / dt : 0;
  const v = antes ? (P.e.s - antes.e.s) / dt : 0;
  quadros.push({ t: +t.toFixed(3), tr: tr.nome, cap: tr.cap, tipo: tr.tipo, v: +v.toFixed(1), kMax: +kMax.toFixed(4), kX: kX && +kX.toFixed(0), kY: kY && +kY.toFixed(0), kU, reta, borda, rolar: +rolar.toFixed(2), giroCab: +giroCab.toFixed(2), rolarCab: +rolarCab.toFixed(2), cabVis });
  antes = P;
}
// acceleration (the starts and the brakes): the speed's change per second, smoothed over 3 frames
for (let i = 2; i < quadros.length - 2; i++) quadros[i].acel = +(((quadros[i + 2].v - quadros[i - 2].v) / (4 * dt))).toFixed(0);

// the summary: the moments over a threshold, grouped into spans
const trechos = (teste, nome) => {
  const out = [];
  let a = null;
  for (const q of quadros) {
    if (teste(q)) { if (!a) a = { de: q.t, ate: q.t, pico: q, tr: q.tr }; a.ate = q.t; if ((q[nome] ?? 0) > (a.pico[nome] ?? 0)) a.pico = q; }
    else if (a) { out.push(a); a = null; }
  }
  if (a) out.push(a);
  return out.map((s) => ({ de: s.de, ate: s.ate, dur: +(s.ate - s.de).toFixed(2), tr: s.tr, pico: s.pico[nome], em: s.pico.t, x: s.pico.kX, y: s.pico.kY }));
};
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor((s.length - 1) * p)]; };
const ks = quadros.map((q) => q.kMax).filter((k) => k > 0);
const resumo = {
  T: +R.T.toFixed(2),
  curvatura: { p50: pct(ks, 0.5), p90: pct(ks, 0.9), p99: pct(ks, 0.99), max: Math.max(...ks) },
  // a ring of 26 px turning more than ~40° (0.027 rad/px): the skin's inside folds — the jets' bends and a weak point
  curvasFortes: trechos((q) => q.kMax > 0.027, 'kMax'),
  arrancadas: R.trechos.filter((q) => q.tipo === 'move' && q.pos && R.trechos.indexOf(q) > 0 && (q.para0 ?? null) !== false).map((q) => ({ nome: q.nome, t0: +q.t0.toFixed(2), cap: q.cap })),
  acelFortes: trechos((q) => Math.abs(q.acel ?? 0) > 250, 'acel'),
  rolarNaVista: trechos((q) => q.rolar > 3, 'rolar'),
  viradaCabeca: trechos((q) => q.giroCab > 2.5, 'giroCab'),
  rolarCabeca: trechos((q) => q.rolarCab > 3, 'rolarCab'),
  retasLongas: trechos((q) => q.reta >= 160, 'reta'),
  bordaDeBaixo: trechos((q) => q.borda > 0, 'borda'),
};
fs.mkdirSync(OUT.replace(/[^/]+$/, ''), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ resumo, quadros }, null, 0));
const linha = (nome, l) => console.log(`${nome} (${l.length}): ${l.map((s) => `${s.de}–${s.ate} ${s.tr} pico ${s.pico}${s.x != null ? ` @${s.x},${s.y}` : ''}`).join(' · ')}`);
console.log('T', resumo.T, 'curvatura', JSON.stringify(resumo.curvatura));
linha('curvas fortes', resumo.curvasFortes);
linha('acel fortes', resumo.acelFortes);
linha('rolar à vista', resumo.rolarNaVista);
linha('virada da cabeça', resumo.viradaCabeca);
linha('rolar da cabeça', resumo.rolarCabeca);
linha('retas longas', resumo.retasLongas);
linha('borda de baixo', resumo.bordaDeBaixo);
