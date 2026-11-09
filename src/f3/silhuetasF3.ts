/**
 * THE BACKGROUND BATTLE'S SILHOUETTES (08/11, round 3 — spec 2026-11-08-cenario-casco-arena §4): the last of the fleet
 * and the creatures hunting them, far off in the nebula. Too small for a generator (7–14 px): drawn by hand as
 * character maps ([[pecas-minusculas-em-pixel]]), all facing RIGHT (flipped when they fly left).
 *   `#` the body (almost black)   `^` the thin line of the nebula's light on top   `o` the engine (ships) / the eye
 * Four of each. His pick on round 3 (09/11): ALL of them, a variety — "Ora passam frotas de uma, outra e por ai vai":
 * each pass draws one ship model and one creature model, and the whole fleet flies that pair.
 */
import type { RGB } from './pixel.ts';

export type Opcao = 'A' | 'B' | 'C' | 'D';

export const SILHUETAS_HUMANAS: Record<Opcao, readonly string[]> = {
  // A — the fighter: a long nose, one engine
  A: [
    '   ^^      ',
    'o#####^^^  ',
    ' ##########',
    'o#####     ',
    '   ##      ',
  ],
  // B — the gunship: heavy, a ventral fin
  B: [
    '   ^^^^^     ',
    'o#########^  ',
    '#############',
    'o##########  ',
    '  ##    ##   ',
  ],
  // C — the interceptor: small and quick
  C: [
    '  ^^     ',
    'o####^^  ',
    '#########',
    'o###     ',
  ],
  // D — the frigate: long, a keel
  D: [
    '    ^^^^^^    ',
    'o############^',
    '##############',
    'o###########  ',
    '    ####      ',
  ],
};

export const SILHUETAS_CRIATURAS: Record<Opcao, readonly string[]> = {
  // A — the manta: wide wings, a whip of a tail
  A: [
    '  ^^^^    ',
    ' #######o ',
    '##########',
    ' ######   ',
    '#    #    ',
  ],
  // B — the little squid: tentacles trailing behind
  B: [
    '    ^^^  ',
    '  #####o ',
    '#########',
    '  ###### ',
    ' # # #   ',
    '#  #  #  ',
  ],
  // C — the wasp: a small stinger drone
  C: [
    '  ^^   ',
    ' ####o ',
    '#######',
    ' ###   ',
    '  # #  ',
  ],
  // D — the serpentling: long and low
  D: [
    '      ^^^   ',
    '  ^^ #####o ',
    '############',
    '##  ##      ',
  ],
};

export const OPCOES: readonly Opcao[] = ['A', 'B', 'C', 'D'];

export const COR_SILHUETA = {
  corpo: [14, 15, 24] as RGB,
  luz: [64, 58, 90] as RGB,
  motor: [255, 170, 80] as RGB,
  olho: [110, 220, 170] as RGB,
};

export interface Carimbo {
  w: number;
  h: number;
  /** x, y, kind (0 body, 1 light, 2 engine/eye) per pixel */
  px: Int8Array;
}

/** A map's pixels (the rows padded to the widest). */
export function carimbo(mapa: readonly string[]): Carimbo {
  const w = Math.max(...mapa.map((l) => l.length)), h = mapa.length;
  const px: number[] = [];
  mapa.forEach((l, y) => {
    for (let x = 0; x < l.length; x++) {
      const c = l[x];
      if (c === '#') px.push(x, y, 0);
      else if (c === '^') px.push(x, y, 1);
      else if (c === 'o') px.push(x, y, 2);
    }
  });
  return { w, h, px: Int8Array.from(px) };
}
