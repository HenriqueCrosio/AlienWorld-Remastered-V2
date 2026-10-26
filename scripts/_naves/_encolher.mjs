// 23/10 — SHRINK today's ship without redrawing it. He keeps today's human ship ("a nave humana que temos é melhor")
// but finds the T2/T3 too big: "não podemos diminuir um pouco apenas as dimensões, ao ponto de não ficar estranho?".
// Scaling pixel art blurs or doubles pixels, so this removes SEAMS instead: one pixel per row (or per column), chosen
// where the pixel only repeats its neighbour (a run gets one shorter) and where the cut opens no new step in an edge
// (forward energy). Every pixel that stays keeps its exact colour.
// All frames of one tier (the still, the 8 thrust frames, the 8 blue ones) are carved with the SAME seams, computed
// on their sum, so the animation stays aligned. The first file is the still: its bbox drives the target size and the
// output keeps its bbox centre where it was (so the fixed hitbox and the shot origin stay on the ship).
//   node scripts/_naves/_encolher.mjs <outDir> <W>x<H> <still.png> [<frame.png> ...] [--proteger=x0-x1,x0-x1]
// 25/10: --proteger keeps COLUMN seams out of those x ranges (canvas coordinates): the cut ladder of the "a" lost its
// needle nose, the identity of the ship, because a grey run is the cheapest place to cut. Row seams ignore it.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ARGS = process.argv.slice(2);
const PROTEGER = (ARGS.find((a) => a.startsWith('--proteger='))?.slice(11) ?? '')
  .split(',').filter(Boolean).map((r) => r.split('-').map(Number));
const [OUT, ALVO, ...ARQS] = ARGS.filter((a) => !a.startsWith('--'));
const [TW, TH] = ALVO.split('x').map(Number);

const ler = async (f) => {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = [];
  for (let y = 0; y < info.height; y++) {
    const row = [];
    for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * 4; row.push(data[i + 3] > 40 ? [data[i], data[i + 1], data[i + 2], 255] : null); }
    px.push(row);
  }
  return { w: info.width, h: info.height, px };
};
const frames = await Promise.all(ARQS.map(ler));
const CW = frames[0].w, CH = frames[0].h;
if (frames.some((f) => f.w !== CW || f.h !== CH)) throw new Error('all frames must share the canvas size');

const bbox = (px) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  px.forEach((row, y) => row.forEach((p, x) => { if (p) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }));
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
};

// Crop every frame to the union bbox, so a seam can't run free through the empty margin.
const u = frames.map((f) => bbox(f.px)).reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }));
let stack = frames.map((f) => f.px.slice(u.y0, u.y1 + 1).map((row) => row.slice(u.x0, u.x1 + 1)));
const b0 = bbox(frames[0].px);
const centro = { x: (b0.x0 + b0.x1) / 2, y: (b0.y0 + b0.y1) / 2 };

const TRANSP = 300;
const d = (a, b) => (!a && !b ? 0 : !a || !b ? TRANSP : Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
const transpor = (img) => img[0].map((_, x) => img.map((row) => row[x]));

// The canvas x of every pixel still in the stack (a seam removes a different x per row, so it is per pixel).
let origX = stack[0].map((row) => row.map((_, x) => u.x0 + x));
const protegido = (x) => PROTEGER.some(([a, b]) => x >= a && x <= b);

// The cheapest vertical seam of the stack (one x per row) and its cost. `prot`: per-pixel "never cut here".
function costura(stk, prot = null) {
  const h = stk[0].length, w = stk[0][0].length;
  const at = (img, y, x) => (x < 0 || x >= w ? null : img[y][x]);
  const M = [], P = [];
  for (let y = 0; y < h; y++) {
    M.push(new Array(w)); P.push(new Array(w));
    for (let x = 0; x < w; x++) {
      let cU = 0, cL = 0, cR = 0, perda = 0;
      for (const img of stk) {
        const l = at(img, y, x - 1), c = img[y][x], r = at(img, y, x + 1);
        perda += Math.min(d(c, l), d(c, r)); // a pixel that differs from both neighbours is a detail: losing it costs
        cU += d(l, r);
        if (y > 0) { cL += d(img[y - 1][x], l); cR += d(img[y - 1][x], r); }
      }
      const base = perda + cU + (prot && prot[y][x] ? 1e7 : 0);
      if (y === 0) { M[y][x] = base; continue; }
      let best = M[y - 1][x] + base, p = x;
      if (x > 0 && M[y - 1][x - 1] + base + cL < best) { best = M[y - 1][x - 1] + base + cL; p = x - 1; }
      if (x < w - 1 && M[y - 1][x + 1] + base + cR < best) { best = M[y - 1][x + 1] + base + cR; p = x + 1; }
      M[y][x] = best; P[y][x] = p;
    }
  }
  let x = 0;
  for (let i = 1; i < w; i++) if (M[h - 1][i] < M[h - 1][x]) x = i;
  const custo = M[h - 1][x], seam = [];
  for (let y = h - 1; y >= 0; y--) { seam[y] = x; if (y > 0) x = P[y][x]; }
  return { seam, custo };
}
const tirar = (stk, seam) => stk.map((img) => img.map((row, y) => row.filter((_, x) => x !== seam[y])));

const log = [];
for (;;) {
  const b = bbox(stack[0]);
  const querW = b.w > TW, querH = b.h > TH;
  if (!querW && !querH) break;
  const v = querW ? costura(stack, PROTEGER.length ? origX.map((row) => row.map(protegido)) : null) : null;
  const hz = querH ? costura(stack.map(transpor)) : null;
  // Per pixel removed, so a long horizontal seam isn't unfairly dearer than a short vertical one.
  const porV = v ? v.custo / stack[0].length : Infinity, porH = hz ? hz.custo / stack[0][0].length : Infinity;
  if (porV <= porH) {
    stack = tirar(stack, v.seam);
    [origX] = tirar([origX], v.seam);
    log.push({ eixo: 'coluna', custo: Math.round(v.custo), seam: v.seam });
  } else {
    stack = tirar(stack.map(transpor), hz.seam).map(transpor);
    [origX] = tirar([transpor(origX)], hz.seam).map(transpor);
    log.push({ eixo: 'linha', custo: Math.round(hz.custo), seam: hz.seam });
  }
}

// Back onto the original canvas, the still's bbox centre where it was.
const bf = bbox(stack[0]);
const ox = Math.round(centro.x - (bf.x0 + bf.x1) / 2), oy = Math.round(centro.y - (bf.y0 + bf.y1) / 2);
fs.mkdirSync(OUT, { recursive: true });
for (let i = 0; i < stack.length; i++) {
  const img = stack[i], buf = Buffer.alloc(CW * CH * 4);
  img.forEach((row, y) => row.forEach((p, x) => {
    const X = x + ox, Y = y + oy;
    if (!p || X < 0 || Y < 0 || X >= CW || Y >= CH) return;
    buf.set(p, (Y * CW + X) * 4);
  }));
  await sharp(buf, { raw: { width: CW, height: CH, channels: 4 } }).png().toFile(path.join(OUT, path.basename(ARQS[i])));
}
fs.writeFileSync(path.join(OUT, `costuras-${path.basename(ARQS[0], '.png')}.json`), JSON.stringify({ alvo: ALVO, antes: `${b0.w}x${b0.h}`, depois: `${bf.w}x${bf.h}`, costuras: log }, null, 1));
console.log(`${path.basename(ARQS[0])}: ${b0.w}x${b0.h} -> ${bf.w}x${bf.h} (${log.map((l) => `${l.eixo[0]}${l.custo}`).join(' ')}) · ${ARQS.length} frames`);
