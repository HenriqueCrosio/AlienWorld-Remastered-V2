/**
 * THE F3 CASCO SKY, IN NUMBERS (spec 2026-11-08-cenario-casco-arena §2, §7). Pure: the probes and tests read it.
 *
 * From the black of the turn on, his Act 1 painting stays (a darker bake, `ceu.png` — the level he chose on 08/11) and
 * two thin cloud layers cut from it drift on their own wind (they keep moving when the world stops for the fight).
 * Everything at scale 1. The painting itself stands still in the F3 (see `Parallax.update`): its two copies do not
 * match at the edge, and scrolling brought that seam onto the screen.
 */
export type RegimeCeuF3 = 'ato1' | 'casco' | 'arena';

/** The darker bake of the painting, swapped in behind the black. */
export const CHAVE_CEU_F3 = 'f3Ceu';

/** The depths already taken between the painting (−96) and the casco band (−75): moon, ruins, silhouette, masks. */
export const PROFUNDIDADES_OCUPADAS_F3: readonly number[] = [-95.5, -95, -94, -93.5];

/**
 * Far layer first. `deriva` px/s of its own wind; `fator` × the world's speed (the Act 2 scroll); `x0` its start.
 * (08/11, round 1: "talvez a velocidade mais lenta um pouco" — the wind went from −2 / −4.5 to −1.4 / −3.2, ×0.7.)
 */
export const NUVENS_F3 = [
  // (x0 = 0 laid the far clouds — the painting MIRRORED — right on the painting the instant the sky switched on: the
  // whole sky symmetric. Seen on the round 3 concept sheet; it starts 137 px off.)
  { chave: 'f3NuvemLonge', depth: -92, deriva: -1.4, fator: 0.03, x0: 137 },
  { chave: 'f3NuvemPerto', depth: -91, deriva: -3.2, fator: 0.06, x0: 211 },
] as const;

export function chavePinturaF3(r: RegimeCeuF3): 'paintBgF3' | 'paintBgF3Casco' | 'paintBgF3Arena' {
  return r === 'ato1' ? 'paintBgF3' : r === 'casco' ? 'paintBgF3Casco' : 'paintBgF3Arena';
}
