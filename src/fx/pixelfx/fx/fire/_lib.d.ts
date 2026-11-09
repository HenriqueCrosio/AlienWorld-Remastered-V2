// The types of the fire helpers the eel's `efeitos.ts` uses (vendored pixelfx, MIT — see ../../LICENSE).
import type { Cor, Painter } from '../../core/index.js';

export function pnoise(x: number, period: number, seed?: number): number;
export function hotFirst(F: readonly Cor[]): Cor[];
export function firePuff(p: Painter, x: number, y: number, k: number, size: number, frac: number, H: readonly Cor[], glowK?: number, tx?: number, ty?: number): void;
export function spark(p: Painter, x: number, y: number, vx: number, vy: number, k: number, cols: readonly Cor[]): void;
export function smokePuff(p: Painter, x: number, y: number, k: number, size: number, col?: Cor, big?: boolean, aMul?: number): void;
