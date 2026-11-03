/**
 * THE SERPENT'S SKILLS — the shared types (spec `2026-11-02-serpente-habilidades-instalacao-design.md`). Type-only: the
 * pure modules that Node runs (`scripts/test-serpente-hab.mjs`) import it with `import type`.
 */
export type { Cor } from '../gestoSerpente';

export interface Ponto {
  x: number;
  y: number;
}

/** a colour, 0–255 per channel (the mock's `[r, g, b]` arrays) */
export type RGB = readonly number[];

/** the mock's pixel blend: colour `c` at alpha `a` onto the native 384×216 grid (x, y rounded) */
export type Put = (x: number, y: number, c: RGB, a?: number) => void;

export type NomeHab = 'chuva' | 'raio' | 'gas';
export type FormaHab = 'A' | 'B' | 'C' | 'fusao';
export type Variacao = 'mirado' | 'leque' | 'cerco';
