import type Phaser from 'phaser';

/**
 * What the Game scene tells the fight recorder (spec 2026-11-26-medicao-das-lutas §3). DEV only: the scene holds it
 * as `registro: GanchoRegistro | null` (null outside `?registro`) and imports this file with `import type` alone, so
 * nothing of the recorder reaches the player's build.
 */
export interface GanchoRegistro {
  /** A blow that got through `damageShip`: its cause (the call site), whether the cards' hull took it, and who hit. */
  golpe(causa: string, absorvido: boolean, quem?: Phaser.GameObjects.GameObject): void;
}
