/**
 * THE SONDA (spec 2026-11-20-bloco-f-sonda-design.md §2–3): the numbers he calibrates by GIF and in the `?sandbox`.
 * Distances in game px (384×216), times in s.
 */
export const SONDA = {
  /** px/s to the left (the batedor flies 95: she is a bigger target that shoots, a little slower). */
  vel: 80,
  /** How many per wave (spec §2: 3; the darts came 4–6). */
  porOnda: 3,
  /** A sonda born within this of the wave's first belongs to that wave (the stage spawns them `spacing` apart). */
  janelaOndaS: 1.5,
  /** The band of heights the paths use (under the HUD, over the bottom edge). */
  faixa: [30, 180] as const,
  /**
   * The three paths are drawn per wave in equal thirds (round 2, 20/11): the DIVE, the diagonal CUT, the DISPERSION
   * (him: *"podem ter um comportamento de dispersão"*): the wave enters in line at a height drawn in `alturaY`, and opens
   * in a fan between these x — each one to its side (−1 up / 0 / +1 down) by `abertura` px — then leaves by the left.
   */
  dispersao: { alturaY: [70, 140] as const, abre: [300, 170] as const, abertura: 62 },
  /** The dive curves between these x (from the first to the second), then flies level. */
  curva: [330, 190] as const,
  /** Where she is born (`EnemySystem.spawn`: GAME_WIDTH + 16) and where the diagonal ends (past the left edge). */
  xEntra: 400,
  xSai: -40,
  /**
   * The shot (round 2, him: *"aquele tipo de inimigo que apareceu e já atira uma vez"*, *"podem até atirar mais de uma
   * vez"*): the 1st warning as soon as she is whole on screen (an x drawn in `xPrimeiro`), each warning `avisoS` long,
   * then one every `intervaloS` while she is at least `frente` px in front of the ship, `max` per sonda. The orb at
   * `escala` (him: *"o mesmo formato do tiro grande [...] numa escala bem menor"*: ~5 px on screen, the gunship's ~14).
   */
  tiro: { xPrimeiro: [366, 350] as const, avisoS: 0.3, intervaloS: 1.2, frente: 60, max: 3, vel: 110, escala: 0.3 },
  /**
   * The dodge: the ship aligned (|dy| ≤ `faixaY`, at least `frenteMin` px in front of her) for `demoraS` → one step
   * of `passo` px to the open side, in `idaS`, back to the path in `voltaS`. Once per sonda, and only from `xMax`
   * leftward (20/11: she dodged at the right edge as she came in, spending it where nobody sees it).
   */
  esquiva: { faixaY: 10, frenteMin: 24, demoraS: 0.25, passo: 22, idaS: 0.18, voltaS: 0.6, xMax: 340 },
  /** px/s of vertical speed past which she leans (the up / down clips). 20: the diagonal cut descends ~27 px/s and
   *  must lean too (30 left her level on the most slanted path). */
  inclina: 20,
  /**
   * THE SWAY over the path (round 3, him: *"um pouco travado [...] ele andam em linha reta quando não estão esquivando.
   * Podemos criar um balanço mais leve do que os batedores e drones"*): `amp` px up and down in `periodoS`, and a
   * surge of `ampX` px forward and back in `periodoXS` (another rhythm: it does not read as a machine). Each sonda on
   * her own phase. Light by rule: its vertical speed (amp × 2π / period ≈ 15 px/s) stays under `inclina` — the sway
   * never triggers the lean clips, only the path's curve does. (The batedor's sine: 28 px.)
   */
  balanco: { amp: 4, periodoS: 1.7, ampX: 1.5, periodoXS: 2.6 },
  /** The fixed hitbox (spec §2: ~16×14, 60% × 55% of her 26×25). */
  corpo: { w: 16, h: 14 },
} as const;
