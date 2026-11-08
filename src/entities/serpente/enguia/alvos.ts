/**
 * WHERE THE EEL'S FRAME IS DRAWN (plan `2026-11-08-enguia-instalacao.md`, decision 4). The renderer (`desenho.ts`, the
 * mock's `quadro`) writes every pixel through an `Alvo`:
 *   - `AlvoQuadro` — the mock's own opaque frame over the arena's photo, its `put` verbatim: the oracle (the md5 of every
 *     frame against the mock's);
 *   - `AlvoLonas` — the game's two transparent canvases. A pixel of HERS (skin, skull, the seal's fill) or of the breach
 *     lip is SOLID and lives in `cima` (over the ship); an effect over a solid pixel is blended there exactly as the mock
 *     blends it (`sobre` over an opaque pixel is the mock's `put`); an effect over nothing goes to `baixo`, under the
 *     ship, by straight-alpha "over". The mock's order is kept: what it paints later covers what it painted before.
 * Both keep `bicho` (the mock's: her pixels, for the joint's seal) and the hit `mascara` (1 body, 2 head, 3 hers under
 * the lip — the hull absorbs the shot there).
 */
import { composite } from './pixelfx/core/index.js';

export const PARTE_NADA = 0, PARTE_CORPO = 1, PARTE_CABECA = 2, PARTE_COBERTA = 3;

export interface QuadroFx {
  w: number;
  h: number;
  ox: number;
  oy: number;
  color: Uint32Array;
  light: Uint32Array;
}

export interface Alvo {
  readonly W: number;
  readonly H: number;
  /** the mock's blend at (round x, round y); `parte` > 0 = a pixel of hers (1 body, 2 head) */
  put(x: number, y: number, r: number, g: number, b: number, a: number, parte: number): void;
  /** the breach lip's pixel i, restored over whatever is there (the mock copies the photo) */
  labio(i: number): void;
  /** the joint's seal: pixel i takes pixel j's colour, as hers */
  copia(i: number, j: number): void;
  /** r + g + b of pixel i (the seal picks the darker neighbour) */
  lum(i: number): number;
  /** is pixel i hers this frame (the mock's `bicho`) */
  dela(i: number): boolean;
  /** a pixelfx frame laid over (colour + additive light) */
  compoeFx(f: QuadroFx): void;
  /** a new frame */
  limpa(): void;
  /** the mock's `disco` (every pixel whose centre is within r, row by row) — not hers */
  disco(cx: number, cy: number, r: number, R: number, G: number, B: number, a: number): void;
  /** rows y0…y1−1, the whole width, at alpha a (the lanes' tint) — not hers */
  faixa(y0: number, y1: number, R: number, G: number, B: number, a: number): void;
}

/** the screen columns of row y inside the mock's disc test (x + 0.5 − cx)² + (y + 0.5 − cy)² ≤ r², clipped */
function discoLinhas(cx: number, cy: number, r: number, W: number, H: number, cada: (x0: number, x1: number, y: number) => void): void {
  const ya = Math.floor(cy - r), xa = Math.floor(cx - r), r2 = r * r;
  for (let y = ya; y <= cy + r; y++) {
    if (y < 0 || y >= H) continue;
    const dy2 = (y + 0.5 - cy) ** 2;
    let primeiro = NaN, ultimo = NaN;
    for (let x = xa; x <= cx + r; x++)
      if ((x + 0.5 - cx) ** 2 + dy2 <= r2) {
        if (primeiro !== primeiro) primeiro = x;
        ultimo = x;
      }
    if (primeiro !== primeiro) continue;
    const x0 = Math.max(0, primeiro), x1 = Math.min(W - 1, ultimo);
    if (x0 <= x1) cada(x0, x1, y);
  }
}

/** THE ORACLE'S TARGET: the mock's frame, bit for bit */
export class AlvoQuadro implements Alvo {
  readonly W: number;
  readonly H: number;
  readonly out: Uint8Array;
  readonly bicho: Uint8Array;
  readonly mascara: Uint8Array;
  private readonly fundo: Uint8Array;
  private readonly bg: Uint32Array;
  constructor(fundo: Uint8Array, W = 384, H = 216) {
    this.W = W;
    this.H = H;
    this.fundo = fundo;
    this.out = Uint8Array.from(fundo);
    this.bicho = new Uint8Array(W * H);
    this.mascara = new Uint8Array(W * H);
    this.bg = new Uint32Array(W * H);
  }
  put(x: number, y: number, r: number, g: number, b: number, a: number, parte: number): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.W || y < 0 || y >= this.H || a <= 0) return;
    const o = this.out, j = y * this.W + x, i = j * 4;
    if (a >= 1) {
      o[i] = Math.round(r);
      o[i + 1] = Math.round(g);
      o[i + 2] = Math.round(b);
      if (parte) {
        this.bicho[j] = 1;
        this.mascara[j] = parte;
      }
    } else {
      o[i] = Math.round(o[i] + (r - o[i]) * a);
      o[i + 1] = Math.round(o[i + 1] + (g - o[i + 1]) * a);
      o[i + 2] = Math.round(o[i + 2] + (b - o[i + 2]) * a);
    }
  }
  labio(i: number): void {
    const j = i * 4;
    this.out[j] = this.fundo[j];
    this.out[j + 1] = this.fundo[j + 1];
    this.out[j + 2] = this.fundo[j + 2];
    if (this.mascara[i]) this.mascara[i] = PARTE_COBERTA;
  }
  copia(i: number, j: number): void {
    const o = this.out;
    o[i * 4] = o[j * 4];
    o[i * 4 + 1] = o[j * 4 + 1];
    o[i * 4 + 2] = o[j * 4 + 2];
    this.bicho[i] = 1;
    this.mascara[i] = this.mascara[j];
  }
  lum(i: number): number {
    return this.out[i * 4] + this.out[i * 4 + 1] + this.out[i * 4 + 2];
  }
  dela(i: number): boolean {
    return this.bicho[i] === 1;
  }
  compoeFx(f: QuadroFx): void {
    const out = this.out;
    for (let i = 0, j = 0; i < this.bg.length; i++, j += 4) this.bg[i] = (255 << 24) | (out[j + 2] << 16) | (out[j + 1] << 8) | out[j];
    composite(f, out, this.bg);
  }
  limpa(): void {
    this.out.set(this.fundo);
    this.bicho.fill(0);
    this.mascara.fill(0);
  }
  private misturaPx(i: number, r: number, g: number, b: number, a: number): void {
    const o = this.out;
    if (a >= 1) {
      o[i] = Math.round(r); o[i + 1] = Math.round(g); o[i + 2] = Math.round(b);
    } else {
      o[i] = Math.round(o[i] + (r - o[i]) * a); o[i + 1] = Math.round(o[i + 1] + (g - o[i + 1]) * a); o[i + 2] = Math.round(o[i + 2] + (b - o[i + 2]) * a);
    }
  }
  disco(cx: number, cy: number, r: number, R: number, G: number, B: number, a: number): void {
    if (a <= 0) return;
    const W = this.W;
    discoLinhas(cx, cy, r, W, this.H, (x0, x1, y) => { for (let x = x0; x <= x1; x++) this.misturaPx((y * W + x) * 4, R, G, B, a); });
  }
  faixa(y0: number, y1: number, R: number, G: number, B: number, a: number): void {
    if (a <= 0) return;
    for (let y = Math.max(0, y0); y < Math.min(this.H, y1); y++) for (let x = 0; x < this.W; x++) this.misturaPx((y * this.W + x) * 4, R, G, B, a);
  }
}

/** THE GAME'S TARGET: `cima` (her, the lip, what lies on them) over the ship; `baixo` (the rest) under it */
export class AlvoLonas implements Alvo {
  readonly W: number;
  readonly H: number;
  readonly cima: Uint8ClampedArray;
  readonly baixo: Uint8ClampedArray;
  /** the pixelfx light that falls on nothing, to be ADDED over `baixo` (under the ship and under `cima`) */
  readonly luz: Uint8ClampedArray;
  temLuz = false;
  readonly bicho: Uint8Array;
  readonly mascara: Uint8Array;
  /** solid this frame: hers or the lip's (routes the effects to `cima`) */
  readonly solida: Uint8Array;
  /** the lip's colours on screen (RGBA, W × H) */
  private labioTela: Uint8Array | null = null;
  /** what was touched since the last clear (the caller uploads only this box) */
  caixa = { x0: 0, y0: 0, x1: -1, y1: -1 };
  private sujo = { x0: 384, y0: 216, x1: -1, y1: -1 };
  constructor(W = 384, H = 216) {
    this.W = W;
    this.H = H;
    this.cima = new Uint8ClampedArray(W * H * 4);
    this.baixo = new Uint8ClampedArray(W * H * 4);
    this.luz = new Uint8ClampedArray(W * H * 4);
    this.bicho = new Uint8Array(W * H);
    this.mascara = new Uint8Array(W * H);
    this.solida = new Uint8Array(W * H);
  }
  /** the breach lip's pixels as they lie on screen (from its texture) */
  defineLabio(labioTela: Uint8Array): void {
    this.labioTela = labioTela;
  }
  private marca(x: number, y: number): void {
    const s = this.sujo;
    if (x < s.x0) s.x0 = x;
    if (x > s.x1) s.x1 = x;
    if (y < s.y0) s.y0 = y;
    if (y > s.y1) s.y1 = y;
  }
  put(x: number, y: number, r: number, g: number, b: number, a: number, parte: number): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.W || y < 0 || y >= this.H || a <= 0) return;
    const j = y * this.W + x, i = j * 4;
    this.marca(x, y);
    if (a >= 1 && parte) {
      const o = this.cima;
      o[i] = Math.round(r);
      o[i + 1] = Math.round(g);
      o[i + 2] = Math.round(b);
      o[i + 3] = 255;
      this.solida[j] = 1;
      this.bicho[j] = 1;
      this.mascara[j] = parte;
      return;
    }
    if (this.solida[j]) { // over hers or the lip: the mock's blend on an opaque pixel
      const o = this.cima;
      if (a >= 1) {
        o[i] = Math.round(r);
        o[i + 1] = Math.round(g);
        o[i + 2] = Math.round(b);
      } else {
        o[i] = Math.round(o[i] + (r - o[i]) * a);
        o[i + 1] = Math.round(o[i + 1] + (g - o[i + 1]) * a);
        o[i + 2] = Math.round(o[i + 2] + (b - o[i + 2]) * a);
      }
      return;
    }
    // over nothing: straight-alpha "over" (`pixels.ts` `sobre`); the light added there before fades under it as the mock's
    // (bg + light)·(1 − a) + c·a
    if (this.temLuz) this.cobreLuz(i, a);
    const o = this.baixo;
    if (a >= 1) {
      o[i] = Math.round(r);
      o[i + 1] = Math.round(g);
      o[i + 2] = Math.round(b);
      o[i + 3] = 255;
      return;
    }
    const da = o[i + 3] / 255, oa = a + da * (1 - a);
    o[i] = Math.round((r * a + o[i] * da * (1 - a)) / oa);
    o[i + 1] = Math.round((g * a + o[i + 1] * da * (1 - a)) / oa);
    o[i + 2] = Math.round((b * a + o[i + 2] * da * (1 - a)) / oa);
    o[i + 3] = Math.round(oa * 255);
  }
  /** paint of alpha `a` laid over pixel i (byte index) dims the light added there before */
  private cobreLuz(i: number, a: number): void {
    const q = this.luz;
    if (!q[i + 3]) return;
    if (a >= 1) {
      q[i] = q[i + 1] = q[i + 2] = q[i + 3] = 0;
      return;
    }
    q[i] = q[i] * (1 - a);
    q[i + 1] = q[i + 1] * (1 - a);
    q[i + 2] = q[i + 2] * (1 - a);
  }
  labio(i: number): void {
    const L = this.labioTela;
    if (!L) return;
    const j = i * 4, o = this.cima;
    o[j] = L[j];
    o[j + 1] = L[j + 1];
    o[j + 2] = L[j + 2];
    o[j + 3] = 255;
    this.solida[i] = 1;
    if (this.mascara[i]) this.mascara[i] = PARTE_COBERTA;
    this.marca(i % this.W, Math.floor(i / this.W));
  }
  copia(i: number, j: number): void {
    const o = this.cima;
    o[i * 4] = o[j * 4];
    o[i * 4 + 1] = o[j * 4 + 1];
    o[i * 4 + 2] = o[j * 4 + 2];
    o[i * 4 + 3] = 255;
    this.solida[i] = 1;
    this.bicho[i] = 1;
    this.mascara[i] = this.mascara[j];
    this.marca(i % this.W, Math.floor(i / this.W));
  }
  lum(i: number): number {
    return this.cima[i * 4] + this.cima[i * 4 + 1] + this.cima[i * 4 + 2];
  }
  dela(i: number): boolean {
    return this.bicho[i] === 1;
  }
  compoeFx(f: QuadroFx): void {
    const C = f.color, L = f.light, n = this.W * this.H;
    for (let p = 0; p < n; p++) {
      const c = C[p], l = L[p] & 0xffffff;
      if (!c && !l) continue;
      const ca = c >>> 24, i = p * 4;
      this.marca(p % this.W, Math.floor(p / this.W));
      if (this.solida[p]) { // the mock's composite over the colour under it (`bg` = cima)
        const o = this.cima;
        let r: number, g: number, b: number;
        if (ca === 255) {
          r = c & 255; g = (c >>> 8) & 255; b = (c >>> 16) & 255;
        } else {
          const k = ca / 255;
          r = (c & 255) * k + o[i] * (1 - k); g = ((c >>> 8) & 255) * k + o[i + 1] * (1 - k); b = ((c >>> 16) & 255) * k + o[i + 2] * (1 - k);
        }
        if (l) { r = Math.min(255, r + (l & 255)); g = Math.min(255, g + ((l >>> 8) & 255)); b = Math.min(255, b + ((l >>> 16) & 255)); }
        // (the mock's frame is a Uint8Array: a float stored there is truncated)
        o[i] = r | 0; o[i + 1] = g | 0; o[i + 2] = b | 0;
        continue;
      }
      // over nothing: the colour "over" into `baixo`, the light ADDED in `luz` (a canvas drawn with (ONE, ONE) between
      // `baixo` and the ship: the mock's bg + light, exactly; her skin drawn later covers it, as in the mock)
      if (ca && this.temLuz) this.cobreLuz(i, ca / 255);
      if (ca === 255) { // (an opaque colour: the mock's result is known without the background — colour + light, clamped)
        const o = this.baixo;
        o[i] = Math.min(255, (c & 255) + (l & 255)) | 0;
        o[i + 1] = Math.min(255, ((c >>> 8) & 255) + ((l >>> 8) & 255)) | 0;
        o[i + 2] = Math.min(255, ((c >>> 16) & 255) + ((l >>> 16) & 255)) | 0;
        o[i + 3] = 255;
        continue;
      }
      if (l) {
        const q = this.luz;
        q[i] = Math.min(255, q[i] + (l & 255));
        q[i + 1] = Math.min(255, q[i + 1] + ((l >>> 8) & 255));
        q[i + 2] = Math.min(255, q[i + 2] + ((l >>> 16) & 255));
        q[i + 3] = 255;
        this.temLuz = true;
      }
      const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255, a = ca;
      if (a <= 0) continue;
      const o = this.baixo, ka = a / 255;
      if (ka >= 1) { o[i] = r; o[i + 1] = g; o[i + 2] = b; o[i + 3] = 255; continue; }
      const da = o[i + 3] / 255, oa = ka + da * (1 - ka);
      o[i] = Math.round((r * ka + o[i] * da * (1 - ka)) / oa);
      o[i + 1] = Math.round((g * ka + o[i + 1] * da * (1 - ka)) / oa);
      o[i + 2] = Math.round((b * ka + o[i + 2] * da * (1 - ka)) / oa);
      o[i + 3] = Math.round(oa * 255);
    }
  }
  limpa(): void {
    const s = this.sujo, W = this.W;
    if (s.x1 >= 0) {
      for (let y = s.y0; y <= s.y1; y++) {
        const a = y * W + s.x0, b = y * W + s.x1 + 1;
        this.cima.fill(0, a * 4, b * 4);
        this.baixo.fill(0, a * 4, b * 4);
        this.luz.fill(0, a * 4, b * 4);
        this.solida.fill(0, a, b);
        this.bicho.fill(0, a, b);
        this.mascara.fill(0, a, b);
      }
    }
    this.caixa = { ...s };
    this.sujo = { x0: W, y0: this.H, x1: -1, y1: -1 };
    this.temLuz = false;
  }
  /** a pixel not hers at index j (on screen): the routing of `put` without its rounding and its bounds */
  private misturaPx(j: number, r: number, g: number, b: number, a: number): void {
    const i = j * 4;
    if (this.solida[j]) {
      const o = this.cima;
      if (a >= 1) { o[i] = Math.round(r); o[i + 1] = Math.round(g); o[i + 2] = Math.round(b); }
      else { o[i] = Math.round(o[i] + (r - o[i]) * a); o[i + 1] = Math.round(o[i + 1] + (g - o[i + 1]) * a); o[i + 2] = Math.round(o[i + 2] + (b - o[i + 2]) * a); }
      return;
    }
    if (this.temLuz) this.cobreLuz(i, a);
    const o = this.baixo;
    if (a >= 1) { o[i] = Math.round(r); o[i + 1] = Math.round(g); o[i + 2] = Math.round(b); o[i + 3] = 255; return; }
    const da = o[i + 3] / 255, oa = a + da * (1 - a), k = da * (1 - a);
    o[i] = Math.round((r * a + o[i] * k) / oa);
    o[i + 1] = Math.round((g * a + o[i + 1] * k) / oa);
    o[i + 2] = Math.round((b * a + o[i + 2] * k) / oa);
    o[i + 3] = Math.round(oa * 255);
  }
  disco(cx: number, cy: number, r: number, R: number, G: number, B: number, a: number): void {
    if (a <= 0) return;
    const W = this.W;
    discoLinhas(cx, cy, r, W, this.H, (x0, x1, y) => {
      this.marca(x0, y);
      this.marca(x1, y);
      for (let x = x0; x <= x1; x++) this.misturaPx(y * W + x, R, G, B, a);
    });
  }
  faixa(y0: number, y1: number, R: number, G: number, B: number, a: number): void {
    if (a <= 0) return;
    const ya = Math.max(0, y0), yb = Math.min(this.H, y1);
    if (ya >= yb) return;
    this.marca(0, ya);
    this.marca(this.W - 1, yb - 1);
    for (let y = ya; y < yb; y++) for (let x = 0; x < this.W; x++) this.misturaPx(y * this.W + x, R, G, B, a);
  }
  /** the box touched this frame (call before `limpa`): the union with last frame's is what must be uploaded */
  get sujoAgora(): { x0: number; y0: number; x1: number; y1: number } {
    return this.sujo;
  }
}
