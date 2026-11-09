import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { NUVENS_F3 } from './numerosCeuF3';

/**
 * THE DRIFTING CLOUDS OF THE CASCO SKY (spec 2026-11-08-cenario-casco-arena §2): two thin layers cut from his painting
 * (`scripts/_cenario/_f3-ceu-assar.mjs`), each a full-screen TileSprite at scale 1, moving on their own wind plus a
 * share of the world's speed. Whole pixels only: a fractional tilePosition shimmers the art.
 */
export class CeuDoCasco {
  private readonly nuvens: { ts: Phaser.GameObjects.TileSprite; deriva: number; fator: number; x: number }[] = [];

  constructor(scene: Phaser.Scene) {
    for (const n of NUVENS_F3) {
      if (!scene.textures.exists(n.chave)) continue;
      const ts = scene.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, n.chave).setOrigin(0, 0).setDepth(n.depth);
      ts.tilePositionX = n.x0;
      this.nuvens.push({ ts, deriva: n.deriva, fator: n.fator, x: n.x0 });
    }
  }

  /** `deriva` < 0 moves the clouds left on screen, so the tile position GROWS; the world pushes left too, so it adds. */
  atualizar(dt: number, worldSpeed: number): void {
    for (const n of this.nuvens) {
      n.x -= (n.deriva - worldSpeed * n.fator) * dt;
      n.ts.tilePositionX = Math.round(n.x);
    }
  }

  destroy(): void {
    for (const n of this.nuvens) n.ts.destroy();
    this.nuvens.length = 0;
  }
}
