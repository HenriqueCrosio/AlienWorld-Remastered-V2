import type { Lugar } from './acustica.ts';

/**
 * THE DEPTH OF THE WORLD (block SOUND, sheet 8, 18/11 — him: *"precisamos muito dar profundidade para eles. O laser e
 * batidas do cinturao ficam muito distantes, algumas outras coisas mais perto, as naves da F1 descendo na colonia ficam
 * distantes"*). A sound far away is not only quieter: it loses its highs, it arrives mostly as its own reflection (less
 * direct, more tail, the tail a little late) and it narrows to one point of the stereo field. Each step here moves all
 * four together. No `distancia` = right here, untouched. Pure (tested in Node); `Som.voz` applies it.
 *
 * In the VACUUM nothing travels through the void: what reaches the cabin comes through the hull, so the far sounds are
 * darker and their tail shorter than in the air.
 */
export type Distancia = 'medio' | 'longe' | 'muitoLonge';
export type Meio = 'ar' | 'vacuo';

export interface PerfilDistancia {
  /** Hz: what is left of the highs. */
  passaBaixa: number;
  /** × on the direct sound. */
  volume: number;
  /** How much of it goes into the tail (0–1). */
  eco: number;
  /** × on the stereo width: the farther, the more it is one point. */
  pan: number;
  /** s: how late the tail arrives after the direct sound. */
  atrasoEco: number;
}

// ⚠️ FAR IS A COLOUR, NOT A LOW LEVEL (18/11, him after the first try: *"eu nao consegui ouvir a maior parte dos novos
// efeitos"*). Measured against the soundtrack, band by band: 22 of 26 sat under it. The first table cut the far sounds to
// 460–850 Hz, exactly where the music is strongest (−21 dB at 63 Hz, −30 at 1 kHz), and took 10 dB off them on top. The
// cuts stay high enough to keep a body above 500 Hz, and the level of each sound is set against the music
// (`scripts/_som/_medir-ambiente.mjs`): the distance is heard in the tail, the darkness and the narrow stereo.
export const DISTANCIAS: Record<Meio, Record<Distancia, PerfilDistancia>> = {
  ar: {
    medio: { passaBaixa: 4200, volume: 0.8, eco: 0.2, pan: 0.75, atrasoEco: 0.03 },
    longe: { passaBaixa: 2400, volume: 0.62, eco: 0.42, pan: 0.45, atrasoEco: 0.09 },
    muitoLonge: { passaBaixa: 1300, volume: 0.46, eco: 0.62, pan: 0.22, atrasoEco: 0.18 },
  },
  vacuo: {
    medio: { passaBaixa: 3000, volume: 0.82, eco: 0.1, pan: 0.75, atrasoEco: 0.02 },
    longe: { passaBaixa: 1400, volume: 0.64, eco: 0.2, pan: 0.42, atrasoEco: 0.06 },
    muitoLonge: { passaBaixa: 900, volume: 0.48, eco: 0.32, pan: 0.18, atrasoEco: 0.12 },
  },
};

/** The tail each medium gives the far sounds: open and long in the air, short and closed through a hull. */
export const CAUDA_DISTANCIA: Record<Meio, { seg: number; decai: number }> = {
  ar: { seg: 3, decai: 2.4 },
  vacuo: { seg: 1.4, decai: 3.2 },
};

export const meioDoLugar = (l: Lugar): Meio => (l === 'cabine' ? 'vacuo' : 'ar');
export const perfilDaDistancia = (d: Distancia, l: Lugar): PerfilDistancia => DISTANCIAS[meioDoLugar(l)][d];
