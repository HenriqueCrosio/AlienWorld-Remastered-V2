// THE SHIP'S DEATH — the numbers. Three styles on the table (26/10, his ask: *"quero que ela se desintegre ... algo mais
// dramático quando morre"*), the same physics under all three. Times are in seconds of GAME time (they stretch with the
// slow motion), speeds in px/s of the native 384×216.

import type { Modelo } from '../../ships';

export type EstiloMorte = 'estilhacos' | 'desintegra' | 'ruptura';
export const ESTILOS_MORTE: EstiloMorte[] = ['estilhacos', 'desintegra', 'ruptura'];
export const NOME_ESTILO: Record<EstiloMorte, string> = {
  estilhacos: 'A — ESTILHAÇOS',
  desintegra: 'B — DESINTEGRAÇÃO',
  ruptura: 'C — RUPTURA',
};

/**
 * EACH SHIP DIES ITS OWN WAY (26/10, his call after the films: *"Como eu gostei de todos os efeitos, quero fazer com que
 * cada tipo de nave tenha uma"*): the X-Aelo breaks up (C), the Terminus shatters (A), the Charybdis comes apart in
 * embers (B). The lost lives in between preview it (`MORTE.golpe`). The registry key `estiloMorte` overrides it (dev
 * and the films).
 */
export const ESTILO_DA_NAVE: Record<Modelo | 'alien', EstiloMorte> = {
  jato: 'ruptura',
  a: 'estilhacos',
  alien: 'desintegra',
};

export function estiloDaNave(shipId: string, modelo: Modelo): EstiloMorte {
  return shipId === 'alienigena' ? ESTILO_DA_NAVE.alien : ESTILO_DA_NAVE[modelo] ?? 'ruptura';
}

export const MORTE = {
  /** The world under the debris. In the atmosphere (F1) they fall and the air brakes them; in the vacuum they drift. */
  mundo: {
    gravidade: 170,
    /** an ember is light: a third of the gravity */
    gravidadeBrasa: 0.35,
    arrasto: { atmosfera: 0.9, vacuo: 0.18 },
    /** the push to the left: the dead ship falls behind the scrolling world */
    deriva: { atmosfera: -40, vacuo: -18 },
    /** how much of the ship's own speed the debris keep */
    herda: 0.4,
  },
  /** THE SLOW MOTION of the death, in raw ms (the boss's curve, shorter): the blow at full speed, a dive, a hold, back. */
  lenta: { impactoMs: 110, desceMs: 140, seguraMs: 700, voltaMs: 520, piso: 0.35 },
  /** after the effect, before the GAME OVER screen (game time) */
  folga: 0.25,
  /**
   * The camera flash, ONCE, at the big moment — short and dim. (A full-strength `flash` paints the whole screen for its
   * first frames: in the 1st film the break-up showed two beige screens.)
   */
  clarao: { ms: 60, cor: [120, 80, 48] as [number, number, number] },
  /** The smoke, drawn in pixels (the `puff` particles read as grey squares next to the pixel debris). */
  fumaca: { vida: [0.55, 1.15], raio: [1.2, 4.6], densidade: 0.62, cada: 0.06 },

  /** A — the hull SHATTERS into big shards, white-hot along the cracks, out of a small fireball. */
  estilhacos: {
    /** few and big: the ship is 40×20 px — a dozen shards were all crack and no hull */
    pedacos: 7,
    distMin: 8,
    torto: 2.5,
    /** the whole hull goes white for this long before it breaks */
    clarao: 0.05,
    vel: [22, 58],
    /** rad/s; small shards spin faster */
    giro: [1, 4.5],
    /** the cracks cool from white to char in this long */
    calor: 0.65,
    /** the inside of each shard chars in this long */
    carvao: 1.6,
    /** smoke trails only from shards this big (px) */
    fumacaMin: 22,
    /** shards go away (pixel by pixel) starting somewhere in this window, over `someEm` */
    somem: [1.4, 1.9],
    someEm: 0.45,
    bola: 0.5,
    abalo: 1.6,
    duracao: 2.4,
  },

  /** B — a burning front crosses the hull from the engine to the nose; every pixel it passes flies off as an ember. */
  desintegra: {
    /** the front crosses the whole hull in this long */
    queima: 1.0,
    /** a pixel glows this long before it lets go (thin: a thick front covered the hull) */
    borda: 0.07,
    torto: 3,
    vel: [10, 34],
    /** the embers drift back (px/s): with the world rolling, the ship's dust is left behind it */
    recuo: 16,
    /** an ember lets go a little below white: a whole cloud of white read as one more fireball */
    calorBrasa: 0.88,
    vida: [0.4, 1.1],
    /** this share of the pixels becomes ASH: dark, slow, lingering */
    cinza: 0.22,
    vidaCinza: [1.3, 2.1],
    abalo: 1.1,
    duracao: 2.3,
  },

  /** C — the ship is hit, tumbles with explosions popping along the hull, and BREAKS in three or four big parts. */
  ruptura: {
    /** the pops along the hull before the break (tail, middle, nose) */
    estalos: [0.06, 0.3, 0.52],
    partirEm: 0.72,
    /** the tumble's top speed before the break, rad/s */
    giroMax: 2.6,
    torto: 3.5,
    vel: [22, 46],
    giro: [0.8, 3.2],
    /** a pixel on the cut becomes a flying chip with this chance */
    lascas: 0.3,
    calor: 0.8,
    somem: [1.95, 2.35],
    someEm: 0.5,
    /** small and BEHIND the pieces: at 1.05 the fireball covered the break-up itself */
    bola: 0.55,
    abalo: 2.2,
    duracao: 2.8,
  },

  /**
   * THE HULL LOSS — every life lost that is not the last (26/10, his ask: *"adicionar esse efeito de perda de casco, para
   * ser um aviso visual também"*). ONE bite off the hull's edge, the SAME on every hit: the life count varies (cards,
   * 1-UPs), so the loss is a fixed amount per hit, never a share of the lives. In the ship's own death style, small.
   * The bite stays on the hull as a scar while the i-frames last (1.4 s), then goes; the last life's smoke is still the
   * "one more and you die" warning.
   */
  golpe: {
    /**
     * the bite: exactly this many hull pixels, grown from a point on the edge (a 40×20 ship has ~450). 16 was lost under
     * the pop in the 1st film: the piece has to read as a piece of the ship.
     */
    pixels: 24,
    torto: 1.2,
    /** where on the hull, 0 = tail, 1 = nose: off the engine flame, off the nose tip */
    faixa: [0.22, 0.72] as [number, number],
    /** the rim around the bite glows this long, then stays charred */
    calor: 0.35,
    /** the scar lasts the i-frames, then goes pixel by pixel in this long */
    cicatriz: 1.4,
    cicatrizSome: 0.3,
    /** the chunk's speed out of the hull (px/s) — fast enough to clear the ship in a few frames — and its spin (rad/s) */
    vel: [48, 72],
    giro: [3, 6],
    somem: [0.75, 1.05],
    someEm: 0.25,
    duracao: 1.75,
    /**
     * The pops are small and BEHIND the ship: in the 1st film the pop in front covered the bite. C (X-Aelo): the chunk
     * tumbles off WHOLE (one piece of the ship you can recognise), chipping, and the bite smokes a moment.
     */
    ruptura: { estouro: 0.36, abalo: 1.0, partes: 1, lascas: 0.25, fumaca: 0.6 },
    /** A (Terminus): the bite flashes white and pops into three shards */
    estilhacos: { clarao: 0.05, estouro: 0.32, abalo: 1.0, partes: 3 },
    /**
     * B (Charybdis): the bite burns away from the edge in, every pixel an ember; the discharge is small (at 0.45 its
     * arcs covered the whole manta), and the wound keeps a cyan rim (dark on her dark teal did not read).
     */
    desintegra: { queima: 0.22, borda: 0.06, estouro: 0.18, abalo: 0.8 },
  },
};
