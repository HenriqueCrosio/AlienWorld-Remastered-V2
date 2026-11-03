/**
 * WHERE THE FUSION IS BITTEN (28/10, him: *"o pedaço da cabeça saindo é ótimo, mas numa luta isso já deixaria qualquer
 * inimigo muito fraco, o que pode sair é outro tipo de pedaço: Queixo, pedaço do pescoço e, ai sim, aquele pedaço da
 * cabeça"*; his order: neck, chin, skull). Art px from the sprite's centre, like the phase's `cabeca` and `boca`. A bite
 * starts on one of the 6 edge pixels nearest its point (`lasca`): the point only picks the edge. Measured on the 9
 * frames of `serpente-fusao-anim` (spec `2026-10-28-serpente-fusao-mordidas-design.md`, §2):
 *   neck   the front of the neck, the right side of the gap under the jaw       (−19…−16, −3…+2)
 *   chin   the jaw's bottom (−53, 0…4); where the mouth opens wider, its front  (−61…−57, −10…−3)
 *   skull  the old point (the phase's `cabeca`): the forehead's top-left         (−74…−66, −95…−88) — the piece he approved
 * Its own file, without Phaser: the Node test reads it (`scripts/test-morte.mjs`).
 */
export const MORDIDAS_FUSAO: readonly { x: number; y: number }[] = [
  { x: -18, y: -2 },
  { x: -54, y: 2 },
  { x: -52, y: -75.6 },
];
