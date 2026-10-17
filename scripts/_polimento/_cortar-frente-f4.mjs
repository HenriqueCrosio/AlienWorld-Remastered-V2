// 17/10 — CUTS THE F4 FOREGROUND CONCEPT STRIPS INTO PIECES (see `_gerar-frente-f4.mjs`). A piece is a set of
// 8-connected alpha components whose x ranges overlap (a split strand stays one piece). A piece must be ROOTED (touch
// the bottom edge: it grows from the screen edge) and COMPLETE (no pixel on the top or side edges: a straight cut there
// would show on screen); the rest is dropped. Each kept piece is written at full size and REDUCED BY 2 exactly
// (nearest — reducing is allowed, enlarging never), so the 26-px bands of the chambers get pieces too.
// `--solto` (17/10): FLOATING fragments — a piece must touch NO edge, and it is cut by its own box (no root).
//   node scripts/_polimento/_cortar-frente-f4.mjs [--solto] <out dir> <strip.png...>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ARGS = process.argv.slice(2);
const SOLTO = ARGS[0] === '--solto';
const [OUT, ...TIRAS] = SOLTO ? ARGS.slice(1) : ARGS;
fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const tira of TIRAS) {
  const { data, info } = await sharp(tira).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const on = (x, y) => data[(y * W + x) * 4 + 3] > 24;
  const comp = new Int32Array(W * H).fill(-1);
  const caixas = [];
  for (let p = 0; p < W * H; p++) {
    if (comp[p] >= 0 || !on(p % W, (p / W) | 0)) continue;
    const id = caixas.length, b = { x0: W, x1: -1, y0: H, y1: -1, n: 0 };
    const pilha = [p]; comp[p] = id;
    while (pilha.length) {
      const c = pilha.pop(), cx = c % W, cy = (c / W) | 0;
      b.n++; b.x0 = Math.min(b.x0, cx); b.x1 = Math.max(b.x1, cx); b.y0 = Math.min(b.y0, cy); b.y1 = Math.max(b.y1, cy);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (comp[q] < 0 && on(nx, ny)) { comp[q] = id; pilha.push(q); }
      }
    }
    caixas.push(b);
  }
  // Merge the components whose x ranges overlap (specks under 6 px join their neighbour or vanish).
  const grupos = [];
  for (const [id, b] of caixas.entries()) {
    if (b.n < 6) continue;
    // Floating fragments share x ranges at different heights: there the boxes must overlap in y too.
    const g = grupos.find((g) => b.x0 <= g.x1 + 1 && b.x1 >= g.x0 - 1 && (!SOLTO || (b.y0 <= g.y1 + 1 && b.y1 >= g.y0 - 1)));
    if (g) { g.ids.push(id); g.x0 = Math.min(g.x0, b.x0); g.x1 = Math.max(g.x1, b.x1); g.y0 = Math.min(g.y0, b.y0); g.y1 = Math.max(g.y1, b.y1); }
    else grupos.push({ ids: [id], ...b });
  }
  for (const g of grupos) {
    const motivo = SOLTO
      ? (g.y1 === H - 1 || g.y0 === 0 || g.x0 === 0 || g.x1 === W - 1 ? 'touches an edge' : g.x1 - g.x0 < 5 && g.y1 - g.y0 < 5 ? 'too small' : null)
      : g.y1 < H - 1 ? 'not rooted' : g.y0 === 0 ? 'cut at the top' : g.x0 === 0 || g.x1 === W - 1 ? 'cut at a side' : g.y1 - g.y0 < 5 ? 'too small' : null;
    if (motivo) { console.log(`${path.basename(tira)} x${g.x0}-${g.x1}: dropped (${motivo})`); continue; }
    const yFim = SOLTO ? g.y1 + 1 : H;
    const w = g.x1 - g.x0 + 1, h = yFim - g.y0;
    const buf = Buffer.alloc(w * h * 4);
    const ids = new Set(g.ids);
    for (let y = g.y0; y < yFim; y++) for (let x = g.x0; x <= g.x1; x++) {
      const p = y * W + x;
      if (!ids.has(comp[p])) continue;
      data.copy(buf, ((y - g.y0) * w + (x - g.x0)) * 4, p * 4, p * 4 + 4);
    }
    const nome = `p-${String(n++).padStart(2, '0')}`;
    const img = sharp(buf, { raw: { width: w, height: h, channels: 4 } });
    await img.clone().png().toFile(path.join(OUT, `${nome}.png`));
    await img.clone().resize({ width: Math.max(1, Math.round(w / 2)), height: Math.max(1, Math.round(h / 2)), kernel: 'nearest' }).png().toFile(path.join(OUT, `${nome}-meia.png`));
    console.log(`${path.basename(tira)} x${g.x0}-${g.x1}: ${nome} ${w}×${h}`);
  }
}
