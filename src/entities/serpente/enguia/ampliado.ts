/**
 * THE ROTSPRITE MAP WITHOUT THE 8× IMAGE (plan `2026-11-08-enguia-instalacao.md`, decision 3). The mock's `amplia8`
 * blows the art up 8× with Scale2x three times — it rounds the diagonals and keeps every line one colour, never
 * inventing one — and keeps, for every 8× pixel, the index of the source pixel it copies (−1 = transparent): 64 Int32
 * per source pixel, 376 MB for the eel's art. This keeps the 4× (passes 1–2, verbatim) and applies the third pass only
 * at the asked point — the same rule on the same neighbours — so `fonte(ax, ay)` is the mock's
 * `fonte8(amplia8(...), ax, ay)` for every position (the oracle checks every 8× pixel).
 */
const LRU = new Map<object, Ampliado>();
const LRU_MAX = 64;

export class Ampliado {
  /** the 8× size, as the mock's map reports it */
  readonly w: number;
  readonly h: number;
  private readonly idx4: Int32Array;
  private readonly w4: number;
  private readonly h4: number;
  private readonly rgba: ArrayLike<number>;

  constructor(rgba: ArrayLike<number>, w: number, h: number) {
    this.rgba = rgba;
    let idx = new Int32Array(w * h), W = w, H = h;
    for (let p = 0; p < w * h; p++) idx[p] = rgba[p * 4 + 3] > 128 ? p : -1;
    for (let k = 0; k < 2; k++) {
      const out = new Int32Array(W * 2 * H * 2), W2 = W * 2, src = idx, Wc = W, Hc = H;
      const at = (x: number, y: number): number => src[Math.min(Hc - 1, Math.max(0, y)) * Wc + Math.min(Wc - 1, Math.max(0, x))];
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
          let e0 = P, e1 = P, e2 = P, e3 = P;
          if (!this.igual(C, B) && !this.igual(A, D)) {
            if (this.igual(C, A)) e0 = A;
            if (this.igual(A, B)) e1 = B;
            if (this.igual(D, C)) e2 = C;
            if (this.igual(B, D)) e3 = D;
          }
          const o = y * 2 * W2 + x * 2;
          out[o] = e0;
          out[o + 1] = e1;
          out[o + W2] = e2;
          out[o + W2 + 1] = e3;
        }
      idx = out;
      W *= 2;
      H *= 2;
    }
    this.idx4 = idx;
    this.w4 = W;
    this.h4 = H;
    this.w = W * 2;
    this.h = H * 2;
  }

  /** the mock's `fonte8`: the source pixel under an art position (float art px), −1 transparent */
  fonte(ax: number, ay: number): number {
    const X = Math.floor(ax * 8), Y = Math.floor(ay * 8);
    if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) return -1;
    const x = X >> 1, y = Y >> 1, W = this.w4, Hm = this.h4 - 1, Wm = W - 1, I = this.idx4;
    const yc = y < 0 ? 0 : y > Hm ? Hm : y;
    const P = I[yc * W + x];
    const A = I[(y - 1 < 0 ? 0 : y - 1) * W + x];
    const B = I[yc * W + (x + 1 > Wm ? Wm : x + 1)];
    const C = I[yc * W + (x - 1 < 0 ? 0 : x - 1)];
    const D = I[(y + 1 > Hm ? Hm : y + 1) * W + x];
    if (this.igual(C, B) || this.igual(A, D)) return P;
    const q = ((Y & 1) << 1) | (X & 1); // e0 e1 / e2 e3
    if (q === 0) return this.igual(C, A) ? A : P;
    if (q === 1) return this.igual(A, B) ? B : P;
    if (q === 2) return this.igual(D, C) ? C : P;
    return this.igual(B, D) ? D : P;
  }

  /** a lazily built map behind an LRU of `LRU_MAX` (the head's ~180 frames and views would hold ~70 MB of 4× maps) */
  static preguicoso(rgba: ArrayLike<number>, w: number, h: number): { readonly m8: Ampliado } {
    const chave = {};
    return {
      get m8(): Ampliado {
        let a = LRU.get(chave);
        if (a) {
          LRU.delete(chave);
          LRU.set(chave, a);
          return a;
        }
        a = new Ampliado(rgba, w, h);
        LRU.set(chave, a);
        if (LRU.size > LRU_MAX) LRU.delete(LRU.keys().next().value as object);
        return a;
      },
    };
  }

  private igual(a: number, b: number): boolean {
    if (a === b) return true;
    if (a < 0 || b < 0) return false;
    const r = this.rgba;
    return r[a * 4] === r[b * 4] && r[a * 4 + 1] === r[b * 4 + 1] && r[a * 4 + 2] === r[b * 4 + 2];
  }
}
