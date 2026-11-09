/**
 * THE LIVING CASCO, IN NUMBERS (08/11, round 2 — spec 2026-11-08-cenario-casco-arena §3, §6; plan
 * `plans/2026-11-08-cenario-casco-rodada2.md`). Pure: the tests and the probes read it.
 *
 * His hull art is final and stays untouched: everything here is drawn OVER the pieces, in a pixel layer of its own,
 * from the pieces' own pixels (the copper traces, the top contour). Two regimes: the casco (Act 2) full, the arena (the
 * final fight) cleaner — "manter o apelo visual mas sem poluir demais".
 */
export type RGB = readonly [number, number, number];
export type RegimeCasco = 'casco' | 'arena';

/** The layer: 384 × h from y0 (the vapour rises ~45 px over the crest at y≈150), right above the pieces (−75) and under
 *  the arena's living hull (−74.5, which paints only what it deforms). Redrawn at `hz`. */
export const CAMADA_CASCO = { y0: 100, h: 116, depth: -74.8, hz: 30 } as const;

/** THE PULSE: a wave of light running along the copper traces toward the head (rightward), `v` px/s ON THE HULL (not on
 *  the screen: measured on the screen, the Act 2 scroll made it cross the traces at ~139 px/s — part of the trembling he
 *  saw on round 2), one crest every `lambda` px, `pico` its strength (0–1 mix toward the lit copper), `k` how narrow. */
export const PULSO: Record<RegimeCasco, { v: number; lambda: number; pico: number; k: number }> = {
  casco: { v: 55, lambda: 240, pico: 0.8, k: 3 },
  arena: { v: 30, lambda: 240, pico: 0.4, k: 3 },
};
/** The copper lit by the pulse (energy: the only strong light of the hull) and its 1 px glow on the plate around it.
 *  (1st try: [255, 190, 105] — the copper itself is ~[200, 140, 80], so mixing toward it changed almost nothing.) */
export const COR_PULSO: RGB = [255, 228, 150];
export const COR_BRILHO: RGB = [255, 160, 70];

export function intensidadePulso(x: number, t: number, p: { v: number; lambda: number; pico: number; k: number }): number {
  const c = Math.cos((2 * Math.PI * (x - p.v * t)) / p.lambda);
  return c <= 0 ? 0 : p.pico * c ** p.k;
}

/** A copper pixel of the hull art (the traces, the pipes, the machinery's bands). Measured on the pieces. */
export function ehCobre(r: number, g: number, b: number): boolean {
  return r > 110 && r - b > 45 && g > b && r > g;
}

// (THE RIM — the crest pulled toward the nebula's violet — was shown on round 2 and taken out: "Não quero o aro, pode
// retirar de tudo".)

/** THE VENTS: where each piece breathes (piece px; y = 0 is the crest). The duct's slat grille (x 19–58) and its far
 *  end; the plate's joints at both edges; the machinery's top. The scales and the ribs (the organic zones) do not. */
export const RESPIROS: Record<string, readonly { x: number; y: number }[]> = {
  cascoDuto: [{ x: 38, y: 0 }, { x: 96, y: 0 }],
  cascoDuto2: [{ x: 38, y: 0 }, { x: 96, y: 0 }],
  cascoPlaca: [{ x: 8, y: 0 }, { x: 106, y: 0 }],
  cascoCostela2: [{ x: 57, y: 0 }],
};

/** Per vent: the rest between puffs (s), a puff's length (s), particles per second while it blows. The ARENA has none
 *  (round 2, him: "pode sumir na luta final"): the puffs thin out to nothing over the silence's 4 s. */
export const VAPOR: Record<RegimeCasco, { espera: [number, number]; sopro: [number, number]; porSeg: number }> = {
  casco: { espera: [1.6, 4.5], sopro: [0.45, 0.8], porSeg: 70 },
  arena: { espera: [6, 12], sopro: [0.35, 0.6], porSeg: 0 },
};
/** A vapour particle: out of the nozzle at `vel` px/s within `abre` rad of straight up, slowed by `arrasto` (1/s), alive
 *  `vida` s; the ramp from the young stream (lighter) to the spent gas (the hull's dark grey). */
export const VAPOR_PARTICULA = {
  vel: [22, 36] as [number, number],
  abre: 0.35,
  arrasto: 1.6,
  vida: [0.8, 1.5] as [number, number],
  /** the bank's radius: `raio[0]` young, + `raio[1]` × age (px) */
  raio: [0.8, 3.6] as [number, number],
  rampa: [[150, 158, 170], [112, 120, 134], [84, 92, 106], [60, 66, 78]] as RGB[],
};

/** THE SPARKS (the arena only, at the open breach's torn rim): a burst every `espera` s, `n` streaks flying straight out
 *  at `vel` px/s, alive `vida` s, cooling down the ramp; a one-frame flash at the site. */
export const FAISCAS = {
  espera: [0.7, 2.2] as [number, number],
  n: [3, 6] as [number, number],
  vel: [55, 120] as [number, number],
  vida: [0.16, 0.34] as [number, number],
  rampa: [[255, 236, 170], [255, 184, 80], [214, 104, 40], [120, 52, 28]] as RGB[],
  flash: [255, 232, 170] as RGB,
};

/** How long the switch between regimes takes by default (the silence before the Serpent). */
export const MS_REGIME = 4000;
