// 07/11 — the eel's path: ONE global polyline, sampled every 1 px of arc (so `s` is an index), built leg by leg with
// a centripetal Catmull-Rom (no loops on uneven waypoints) that keeps the tangent across the joints. The body follows the
// head through it like a snake through a tube, so the whole pose at any time is `ponto(s − d)` — the future is a lookup.

// centripetal Catmull-Rom between p1 and p2 (Barry–Goldman), sampled densely
function segmento(p0, p1, p2, p3, out) {
  const d = (a, b) => Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1]) ** 0.5);
  const t0 = 0, t1 = t0 + d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
  const n = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 3));
  const lerp = (a, b, ta, tb, t) => [((tb - t) * a[0] + (t - ta) * b[0]) / (tb - ta), ((tb - t) * a[1] + (t - ta) * b[1]) / (tb - ta)];
  for (let i = 1; i <= n; i++) {
    const t = t1 + ((t2 - t1) * i) / n;
    const a1 = lerp(p0, p1, t0, t1, t), a2 = lerp(p1, p2, t1, t2, t), a3 = lerp(p2, p3, t2, t3, t);
    const b1 = lerp(a1, a2, t0, t2, t), b2 = lerp(a2, a3, t1, t3, t);
    out.push(lerp(b1, b2, t1, t2, t));
  }
}

// a dense polyline → points every exactly `passo` px of arc (the last point kept)
export function reamostra(pts, passo = 1) {
  const out = [pts[0]];
  let falta = passo, [ax, ay] = pts[0];
  for (let i = 1; i < pts.length; i++) {
    let [bx, by] = pts[i];
    let seg = Math.hypot(bx - ax, by - ay);
    while (seg >= falta) {
      const k = falta / seg;
      ax += (bx - ax) * k; ay += (by - ay) * k;
      out.push([ax, ay]);
      seg -= falta; falta = passo;
    }
    falta -= seg; ax = bx; ay = by;
  }
  if (falta < passo - 1e-6) out.push([ax, ay]);
  return out;
}

// the swimming wave: each point pushed along the path's normal by A·sin(2π·s/λ), faded in/out over `borda` px at the
// ends that touch rest (`calma0`, `calma1`) so the posts stay exact
function ondula(pts, { A, lambda }, calma0, calma1, borda = 70) {
  const L = pts.length - 1;
  return pts.map(([x, y], i) => {
    const a = pts[Math.max(0, i - 2)], b = pts[Math.min(L, i + 2)];
    const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
    let k = 1;
    if (calma0) k = Math.min(k, Math.min(1, i / borda));
    if (calma1) k = Math.min(k, Math.min(1, (L - i) / borda));
    k = k * k * (3 - 2 * k);
    const o = A * Math.sin((2 * Math.PI * i) / lambda) * k;
    return [x - (dy / m) * o, y + (dx / m) * o];
  });
}

export class Caminho {
  constructor(inicio) { this.xs = [inicio[0]]; this.ys = [inicio[1]]; this.dir = null; }
  get L() { return this.xs.length - 1; }
  fim() { return [this.xs[this.L], this.ys[this.L]]; }
  // appends a leg through `pontos` (starting from the current end); returns its [s0, s1]
  junta(pontos, { onda = null, calma0 = false, calma1 = false } = {}) {
    const P = [this.fim(), ...pontos];
    const dir = this.dir ?? [P[1][0] - P[0][0], P[1][1] - P[0][1]];
    const m = Math.hypot(dir[0], dir[1]) || 1;
    const fantasma0 = [P[0][0] - (dir[0] / m) * 20, P[0][1] - (dir[1] / m) * 20];
    const n = P.length - 1;
    const fantasma1 = [2 * P[n][0] - P[n - 1][0], 2 * P[n][1] - P[n - 1][1]];
    const Q = [fantasma0, ...P, fantasma1];
    const denso = [P[0]];
    for (let i = 1; i + 2 < Q.length; i++) segmento(Q[i - 1], Q[i], Q[i + 1], Q[i + 2], denso);
    let pts = reamostra(denso, 1);
    // (the wave fades at BOTH ends of every leg, rest or not: a leg with the wave never jumps against its neighbour)
    if (onda) pts = reamostra(ondula(pts, onda, true, true), 1);
    const s0 = this.L;
    for (let i = 1; i < pts.length; i++) { this.xs.push(pts[i][0]); this.ys.push(pts[i][1]); }
    const L = this.L;
    this.dir = [this.xs[L] - this.xs[L - 2], this.ys[L] - this.ys[L - 2]];
    return [s0, this.L];
  }
  ponto(s) {
    const L = this.L;
    if (s <= 0) return { x: this.xs[0], y: this.ys[0] };
    if (s >= L) return { x: this.xs[L], y: this.ys[L] };
    const i = Math.floor(s), f = s - i;
    return { x: this.xs[i] + (this.xs[i + 1] - this.xs[i]) * f, y: this.ys[i] + (this.ys[i + 1] - this.ys[i]) * f };
  }
  // the unit heading at s (forward = growing s)
  rumo(s, d = 3) {
    const a = this.ponto(s - d), b = this.ponto(s + d);
    let dx = b.x - a.x, dy = b.y - a.y;
    if (Math.hypot(dx, dy) < 1e-6) { const c = this.ponto(s - 2 * d); dx = a.x - c.x; dy = a.y - c.y; }
    const m = Math.hypot(dx, dy) || 1;
    return { x: dx / m, y: dy / m };
  }
}
