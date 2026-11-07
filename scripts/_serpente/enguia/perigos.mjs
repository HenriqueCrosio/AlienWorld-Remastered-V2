// 07/11 — what hurts at a time, as plain shapes (circles and rectangles), and the signed clearance from the ship's
// 21×9 box to each (negative = inside). The same shapes count the touches and steer the dodging probe, so what the
// probe dodges is exactly what is counted.
import { pose } from './corpo.mjs';
import { bocasDosCanos } from './canos.mjs';

export function folga(nave, hit, f) {
  const x0 = nave.x - hit.w / 2, x1 = nave.x + hit.w / 2, y0 = nave.y - hit.h / 2, y1 = nave.y + hit.h / 2;
  if (f.c) {
    const qx = Math.min(x1, Math.max(x0, f.c.x)), qy = Math.min(y1, Math.max(y0, f.c.y));
    const d = Math.hypot(f.c.x - qx, f.c.y - qy);
    if (d > 0) return d - f.c.r;
    // the centre inside the box: how deep
    return -Math.min(f.c.x - x0, x1 - f.c.x, f.c.y - y0, y1 - f.c.y) - f.c.r;
  }
  const r = f.r, dx = Math.max(r.x0 - x1, x0 - r.x1), dy = Math.max(r.y0 - y1, y0 - r.y1);
  if (dx > 0 && dy > 0) return Math.hypot(dx, dy);
  return Math.max(dx, dy);
}

const naTela = (c, N) => c.x + c.r >= 0 && c.x - c.r < N.tela.W && c.y + c.r >= 0 && c.y - c.r < N.tela.H;

// M: { R, N, med, mord, canos: [Canos], ecos: [Eco], geis: [...] }; `giro` (the head's Echo turn) comes from M.giro(t)
export function perigos(M, t, P = null) {
  const { R, N } = M, out = [];
  const e = R.estado(t), hab = e.trecho.hab;
  const morrendo = ['presa', 'desfaz', 'resto', 'fim'].includes(hab);
  P = P ?? pose(R, N, M.med, t, { mord: M.mord, giro: M.giro ? M.giro(t) : 0 });
  if (!morrendo && hab !== 'fusao') {
    // the tube, every `toque` px (what is drawn is what touches)
    const cada = Math.round(N.tubo.toque / N.tubo.passo);
    for (let i = 0; i < P.tubo.length; i += cada) {
      const a = P.tubo[i], c = { x: a.x, y: a.y, r: a.r };
      if (naTela(c, N)) out.push({ tipo: 'corpo', id: `corpo-${e.trecho.nome}-${e.trecho.ciclo ?? 0}`, forma: { c } });
    }
    for (const c of P.cabeca.circulos) if (naTela(c, N)) out.push({ tipo: 'cabeca', id: `cabeca-${e.trecho.nome}-${e.trecho.ciclo ?? 0}`, forma: { c } });
  }
  // the pipes' fire
  for (const C of M.canos) {
    const q = C.estado(t);
    if (!q || q.fase !== 'fogo' || q.livre == null) continue;
    const bocas = bocasDosCanos(P, N), F = N.canos.faixas;
    for (let f = 0; f < 4; f++) {
      if (f === q.livre) continue;
      const xb = bocas[f].x, xf = xb * (1 - q.frente);
      out.push({ tipo: 'fogo', id: `fogo-${C.t0.toFixed(2)}-${q.i}`, forma: { r: { x0: xf, x1: xb, y0: F[f] + 1, y1: F[f + 1] - 1 } } });
    }
  }
  // the geysers' columns
  const G = N.geiser;
  for (const g of M.geis) if (t >= g.tColuna && t < g.tFim)
    out.push({ tipo: 'geiser', id: `geiser-${g.tAviso.toFixed(2)}`, forma: { r: { x0: g.x - G.largura / 2, x1: g.x + G.largura / 2, y0: G.topo, y1: N.tela.H } } });
  // the Echo's blasts
  for (const E of M.ecos) for (const x of E.estado(t).explosoes) if (x.fere)
    out.push({ tipo: 'eco', id: `eco-${x.x.toFixed(1)}-${x.y.toFixed(1)}`, forma: { c: { x: x.x, y: x.y, r: x.r } } });
  return out;
}
