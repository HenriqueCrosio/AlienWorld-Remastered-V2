// The hull sentinel's IMAGE TREATMENT, shared by the demo (`_sentinela-demo.mjs`) and the installer
// (`_instalar-sentinela.mjs`): the spine glow pulled down to maroon, and the RotSprite tilt.
import { girar, novo } from './_pixel-lib.mjs';

/**
 * His note (10/10): the spine glow was too hot (r up to 254 over ~1600px, against ~140 over 81px in the base pose).
 * Every red-dominant pixel is pulled down toward the base's dark maroon, faded in by how red it is.
 */
export function apagar(q, brilho) {
  for (let i = 0; i < q.d.length; i += 4) {
    const [r, g, b] = [q.d[i], q.d[i + 1], q.d[i + 2]];
    const w = Math.max(0, Math.min(1, (r - Math.max(g, b) - 20) / 60));
    if (!w) continue;
    const k = 1 - w * (1 - brilho);
    // Darker AND less saturated: green/blue climb toward the base glow's ratio (~0.3 of red), so it reads maroon.
    // (All three channels dim together, or the hot pinkish cores — 247,188,174 — turn teal.)
    const [r2, g2, b2] = [r * k, g * k, b * k];
    q.d[i] = Math.round(r2); q.d[i + 1] = Math.round(g2 + (Math.max(g2, r2 * 0.3) - g2) * w); q.d[i + 2] = Math.round(b2 + (Math.max(b2, r2 * 0.3) - b2) * w);
  }
  return q;
}

export function scale2x(q) {
  const W = q.w * 2, out = novo(W, q.h * 2);
  const at = (x, y) => (Math.min(q.h - 1, Math.max(0, y)) * q.w + Math.min(q.w - 1, Math.max(0, x))) * 4;
  const eq = (a, b) => q.d.readUInt32LE(a) === q.d.readUInt32LE(b);
  for (let y = 0; y < q.h; y++)
    for (let x = 0; x < q.w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), Dd = at(x, y + 1);
      const ok = !eq(C, B) && !eq(A, Dd);
      const src = [ok && eq(C, A) ? A : P, ok && eq(A, B) ? B : P, ok && eq(Dd, C) ? C : P, ok && eq(B, Dd) ? B : P];
      for (const [k, [dx, dy]] of [[0, 0], [1, 0], [0, 1], [1, 1]].entries()) q.d.copy(out.d, ((y * 2 + dy) * W + x * 2 + dx) * 4, src[k], src[k] + 4);
    }
  return out;
}

/**
 * The tilt as a RotSprite (Scale2x ×3 → nearest rotate → pick each 8×8 block's centre): pixel art rotated without the
 * jagged smear. `f` turns a `lado`² frame by `giro` rad (clockwise) into an M² one; `onde` says where a point of the
 * original lands in it (girar keeps the canvas centre at the output centre).
 */
export function rotSprite(giro, lado = 256) {
  if (!giro) return { f: (q) => q, onde: (x, y) => ({ x, y }) };
  const W = Math.ceil(Math.abs(lado * 8 * Math.cos(giro)) + Math.abs(lado * 8 * Math.sin(giro))) + 2, M = Math.floor(W / 8);
  const c = Math.cos(giro), sn = Math.sin(giro);
  const f = (q) => {
    const g = girar(scale2x(scale2x(scale2x(q))), giro), out = novo(M, M);
    for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) g.d.copy(out.d, (y * M + x) * 4, ((y * 8 + 4) * g.w + x * 8 + 4) * 4, ((y * 8 + 4) * g.w + x * 8 + 4) * 4 + 4);
    return out;
  };
  const onde = (x, y) => ({ x: W / 16 + c * (x - lado / 2) - sn * (y - lado / 2), y: W / 16 + sn * (x - lado / 2) + c * (y - lado / 2) });
  return { f, onde };
}
