// The H block, round 2 (09/11): the F4 dolphins (from the far right, a fast diagonal to the bottom edge, porpoising,
// bubbles that RISE and die) and the F3 cylinder eel (from the bottom edge to the top-right corner, fast, a wave that
// grows toward the tail, lit from above, Act 1 only), and no warning red nor free-lane white-blue anywhere.
//   node scripts/test-h-silhuetas.mjs
import sharp from 'sharp';
import { CardumeFundo, FOLHA_GOLFINHOS, GOLFINHOS, poseGolfinho } from '../src/f4/golfinhosFundo.ts';
import { ENGUIA, desenharEnguia, espinha } from '../src/f3/enguiaCilindro.ts';
const CONCEITOS_ENGUIA = { B: ENGUIA };

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };
const lum = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const proibida = (c) => (c[0] > 200 && c[1] < 80) || (c[2] > c[0] && lum(c) > 0.8);
const W = 384, H = 216;

// ── the dolphins
const F = FOLHA_GOLFINHOS;
for (const [i, n] of GOLFINHOS.passagens.entries()) {
  const a = poseGolfinho(n, n.t0), b = poseGolfinho(n, n.t0 + n.dur - 1e-6);
  ok(a.cx - F.celula / 2 > W && a.cy < H * 0.4, `dolphin ${i}: enters off the far right, high (${a.cx.toFixed(0)}, ${a.cy.toFixed(0)})`);
  ok(b.cy - F.celula / 2 > H, `dolphin ${i}: leaves under the bottom edge (${b.cx.toFixed(0)}, ${b.cy.toFixed(0)})`);
  ok(n.dur <= 4.5, `dolphin ${i}: fast (${n.dur} s; was 8–9)`);
  let min = 999, max = -999, saltos = 0, ult = null;
  for (let s = 0; s < n.dur; s += 1 / 60) {
    const p = poseGolfinho(n, n.t0 + s);
    min = Math.min(min, p.graus); max = Math.max(max, p.graus);
    if (ult && Math.hypot(p.cx - ult.cx, p.cy - ult.cy) > 3) saltos++;
    ult = p;
  }
  ok(max - min >= 15, `dolphin ${i}: the nose follows the porpoise (${min}°…${max}°)`);
  ok(min > F.angulos[0] - 1 && max < F.angulos[F.angulos.length - 1] + 1, `dolphin ${i}: every heading is baked`);
  ok(saltos === 0, `dolphin ${i}: no jumps between frames`);
  // the right half of chamber B is dark in the game (23–41, measured); the bright is x 70–250, y 25–130
  let claro = 0, total = 0;
  for (let s = 0; s < n.dur; s += 1 / 60) {
    const p = poseGolfinho(n, n.t0 + s);
    total++;
    if (p.cx >= 70 && p.cx <= 250 && p.cy >= 25 && p.cy <= 130) claro++;
  }
  // (entering from the far right and leaving by the bottom, ~15–25% is what the painting allows: `_h/_golfinhos-caminho.mjs`)
  ok(claro / total >= 0.12, `dolphin ${i}: a good part of the pass over the bright tunnel (${Math.round((100 * claro) / total)}%)`);
}
{
  const c = new CardumeFundo();
  let maxB = 0;
  const t0 = GOLFINHOS.passagens[0].t0;
  for (let t = t0; t < t0 + 2; t += 1 / 60) maxB = Math.max(maxB, c.passo(t, 1 / 60) && c.bolhas.length);
  ok(maxB > 10, `bubbles trail behind them (${maxB} at once)`);
  const antes = new Map(c.bolhas.map((b) => [b, b.y]));
  c.passo(null, 0.2);
  const subiram = c.bolhas.length > 0 && c.bolhas.every((b) => b.y < antes.get(b));
  ok(subiram, 'bubbles rise (water)');
  for (let k = 0; k < 120; k++) c.passo(null, 1 / 60);
  ok(c.bolhas.length === 0, 'no water clock → no new bubbles, the old ones die');
}
{
  const { data } = await sharp('public/sprites/golfinho-fundo.png').raw().toBuffer({ resolveWithObject: true });
  let ruins = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] && proibida([data[i], data[i + 1], data[i + 2]])) ruins++;
  ok(ruins === 0, `golfinho-fundo: no forbidden colour (${ruins})`);
}

// ── the eel
for (const [k, c] of Object.entries(CONCEITOS_ENGUIA)) {
  const p = c.caminho;
  ok(p.t0 >= 18 && p.t0 + p.dur < 24, `eel ${k}: Act 1, out before the scouts of t=24 (${p.t0}–${(p.t0 + p.dur).toFixed(1)} s)`);
  const buf0 = new Uint8ClampedArray(W * H * 4);
  const drew0 = desenharEnguia(buf0, W, H, 0, c, p.t0);
  const fim = new Uint8ClampedArray(W * H * 4);
  const drewF = desenharEnguia(fim, W, H, 0, c, p.t0 + p.dur - 1e-6);
  ok(!drew0 && !drewF, `eel ${k}: off-screen at both ends (enters from the bottom, the tail leaves too)`);
  const h0 = espinha(c, p.t0, 0), hF = espinha(c, p.t0 + p.dur - 1e-6, 0);
  ok(h0.y > H && h0.x < W / 2, `eel ${k}: the head starts under the bottom edge (${h0.x.toFixed(0)}, ${h0.y.toFixed(0)})`);
  ok(hF.x > W && hF.y < 0, `eel ${k}: and ends past the top-right corner (${hF.x.toFixed(0)}, ${hF.y.toFixed(0)})`);
  const v = (Math.hypot(p.ate[0] - p.de[0], p.ate[1] - p.de[1]) + c.forma.comprimento) / p.dur;
  ok(v >= 220, `eel ${k}: fast — his round 3, faster than round 2's ~175 (${v.toFixed(0)} px/s)`);
  // the wave: the lateral offset from the straight line, at the tail vs at the head, over the pass
  const dx = p.ate[0] - p.de[0], dy = p.ate[1] - p.de[1], D = Math.hypot(dx, dy);
  const lado = (e) => ((e.x - p.de[0]) * -dy + (e.y - p.de[1]) * dx) / D;
  let cab = 0, cau = 0;
  for (let s = 0; s < p.dur; s += 0.05) {
    cab = Math.max(cab, Math.abs(lado(espinha(c, p.t0 + s, 0))));
    cau = Math.max(cau, Math.abs(lado(espinha(c, p.t0 + s, c.forma.comprimento * 0.9))));
  }
  ok(cau > cab * 1.8, `eel ${k}: the wave grows toward the tail (head ±${cab.toFixed(1)}, tail ±${cau.toFixed(1)} px)`);
  // it swims: the S of the body changes shape over time (not a rigid bend sliding)
  const forma = (t) => [0.2, 0.4, 0.6].map((q) => lado(espinha(c, t, c.forma.comprimento * q)));
  const f1 = forma(p.t0 + p.dur * 0.4), f2 = forma(p.t0 + p.dur * 0.4 + 0.25);
  ok(f1.some((x, i) => Math.abs(x - f2[i]) > 1.5), `eel ${k}: the body's S moves along it`);
  // mid-pass: lit from above (in each column, the topmost hull pixel is brighter than the bottom-most), colours
  const buf = new Uint8ClampedArray(W * H * 4);
  desenharEnguia(buf, W, H, 0, c, p.t0 + p.dur * 0.45);
  let cima = 0, baixo = 0, cols = 0, ruins = 0;
  for (let x = 0; x < W; x++) {
    const ys = [];
    for (let y = 0; y < H; y++) if (buf[(y * W + x) * 4 + 3]) ys.push(y);
    if (ys.length < 8) continue;
    const l = (y) => { const i = (y * W + x) * 4; return lum([buf[i], buf[i + 1], buf[i + 2]]); };
    cima += l(ys[2]); baixo += l(ys[ys.length - 2]); cols++;
  }
  for (let i = 0; i < buf.length; i += 4) if (buf[i + 3] && proibida([buf[i], buf[i + 1], buf[i + 2]])) ruins++;
  ok(cols > 20 && cima > baixo * 1.3, `eel ${k}: lit from above (top ${(cima / cols).toFixed(3)} vs bottom ${(baixo / cols).toFixed(3)})`);
  ok(ruins === 0, `eel ${k}: no forbidden colour (${ruins})`);
  ok(c.depth > -96 && c.depth < 0, `eel ${k}: in front of the painting, behind the game (${c.depth})`);
}
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
