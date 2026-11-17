/**
 * THE MIX of the sound effects (block SOUND, 15/11 — spec `specs/2026-11-15-bloco-som-design.md` §3.3). Pure.
 *
 * His rule: GERAL lowers everything, MÚSICA is only the soundtrack, EFEITOS is the action AND the ambience. And the
 * player chooses how to play — soundtrack + effects, or only one of them — so whoever turns the music off still has an
 * atmosphere: the ambience and the ship's engine sit low under the soundtrack and come up when MÚSICA is at 0. That
 * adjustment is invisible (no settings line).
 */
export type Camada = 'acao' | 'interface' | 'ambiente' | 'motor';

/** How much of the ambience/engine is left with the music at full volume (tuned by ear on sheet 8). */
export const PISO_PRESENCA = 0.35;

/**
 * THE SAFETY LIMITER at the end of the effects (17/11): the regulation measured peaks past 0 dB before the output (the
 * Serpente breaking out +2.3, a boss's last blast +2.6) and nothing held them — a chain of big blasts would clip. A
 * LIMITER, not a glue compressor (that one is the mix pass, later): it sleeps under `limiar` and only shaves the peaks
 * over it (ratio 20, 2 ms attack). Chrome's compressor adds its own makeup gain (≈0.6 × the gain it would take off a
 * full-scale signal); `compensacao` takes it back, so what passes under the threshold comes out at unity — measured by
 * `test-som-jogo`. The soundtrack does not pass here (it is his, and Phaser's own).
 */
export const LIMITADOR = { limiar: -3, joelho: 0, razao: 20, ataque: 0.002, soltura: 0.15 } as const;
/** dB: Chrome's automatic makeup for `LIMITADOR` (the gain at 0 dBFS in, × 0.6), undone after the node. */
export const MAKEUP_DO_LIMITADOR = 0.6 * -(LIMITADOR.limiar - LIMITADOR.limiar / LIMITADOR.razao);

const lim = (v: number): number => Math.min(1, Math.max(0, v));

/** The presence of the ambience and of the engine for a MÚSICA level `musica` (0–1): 1 at 0, the floor at 1. */
export const presenca = (musica: number): number => 1 - (1 - PISO_PRESENCA) * lim(musica);

/** The player's volumes, each 0–1 (the settings' 0–10 divided by 10). */
export interface Volumes {
  geral: number;
  efeitos: number;
  musica: number;
}

/**
 * THE BED UNDER THE CHAINS — the LASTRO (15/11, his note on composition: *"se os sons ficam isolados, fica estranho e
 * desconfortável de ouvir"*). Every explosion pours ENERGY into one shared low rumble loop; the energy drains with a
 * time constant, so a chain keeps the rumble rolling under the separate blasts and a lone one barely lifts it. That is
 * the glue: the blasts are the hits, the bed is the space they happen in.
 */
export const LASTRO = {
  /** s — how long the rumble takes to fall to 37% after the last blast. */
  tau: 1.4,
  /** energy at which the loop starts / under which it stops. */
  liga: 0.12,
  desliga: 0.02,
  /** gain of the loop per unit of energy (capped at 1). */
  ganhoPorEnergia: 0.45,
};

/** The energy `dt` seconds later (exponential drain). */
export const energiaDepois = (e: number, dt: number): number => e * Math.exp(-Math.max(0, dt) / LASTRO.tau);

/** The loop's gain for an energy. */
export const ganhoDoLastro = (e: number): number => Math.min(1, Math.max(0, e) * LASTRO.ganhoPorEnergia);

/** The gain of a layer's bus. */
export function ganhoDaCamada(c: Camada, v: Volumes): number {
  const base = lim(v.geral) * lim(v.efeitos);
  return c === 'ambiente' || c === 'motor' ? base * presenca(v.musica) : base;
}
