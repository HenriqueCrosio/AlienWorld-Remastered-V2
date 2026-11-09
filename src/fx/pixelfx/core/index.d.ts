// The types of what the eel's `efeitos.ts` uses from the vendored pixelfx (MIT, see ../LICENSE). The `.js` files are
// the mock's copy untouched; this file only tells TypeScript their shape (the tsconfig has no `allowJs`).

/** a colour: 0xAABBGGRR packed, as pixelfx keeps it */
export type Cor = number;

export interface Frame {
  w: number;
  h: number;
  ox: number;
  oy: number;
  color: Uint32Array;
  light: Uint32Array;
}

export interface Painter {
  fade: number;
  lightK: number;
  layer: string;
  reset(): Painter;
  place(x: number, y: number, flip?: boolean, angle?: number): void;
  px(x: number, y: number, c: Cor, a?: number): void;
  circle(cx: number, cy: number, r: number, c: Cor, a?: number): void;
  disc(cx: number, cy: number, r: number, c: Cor, a?: number): void;
  glow(x: number, y: number, r: number, c: Cor, k?: number): void;
  line(x0: number, y0: number, x1: number, y1: number, c: Cor, a?: number): void;
}

export interface Rng {
  next(): number;
  range(a: number, b: number): number;
  sign(): number;
}

export interface Fx {
  readonly t: number;
  update(dt: number): void;
  draw(frame: Frame, layer?: string): void;
  stop(): void;
  done(): boolean;
}

export interface FxModule {
  meta?: object;
  create?(o: object): object;
}

export function createFrame(w: number, h: number, ox?: number, oy?: number): Frame;
export function clearFrame(f: Frame): Frame;
export function painterFor(frame: Frame): Painter;
export function composite(f: Frame, out: Uint8Array | Uint8ClampedArray, bg?: Uint32Array | number | null, lightK?: number): Uint8Array | Uint8ClampedArray;
export function createFx(mod: FxModule, o?: object): Fx;
export function fit(r: readonly (string | number)[], n: number): Cor[];
export function hex(h: string): Cor;
export function mix(a: Cor, b: Cor, t: number): Cor;
export const WHITE: Cor;
export const TAU: number;
export function rng(...ns: number[]): Rng;
export function loopNoise(phase: number, radius?: number, seed?: number): number;
export function clamp(x: number, a?: number, b?: number): number;
export function noise2(x: number, y: number, seed?: number): number;
