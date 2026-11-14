import type Phaser from 'phaser';

/**
 * SKIPPING A CUTSCENE = running it FAST (14/11, block M1). The cutscenes are chains of timers and tweens that build
 * state as they go (the ship lands, the panel opens, the dock breaks): cutting the chain would leave the scene half
 * built. Speeding its clock up keeps every step, in order, and the scene arrives where it would have arrived.
 *
 * `k` = 1 gives the normal clock back (each cutscene does that when its choice opens: skipping never costs a card).
 */
export const RAPIDO = 12;

export function avancoRapido(scene: Phaser.Scene, k: number): void {
  scene.time.timeScale = k;
  scene.tweens.timeScale = k;
}
