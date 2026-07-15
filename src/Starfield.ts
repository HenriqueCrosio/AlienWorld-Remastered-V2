import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';

interface Star {
  x: number;
  y: number;
  speed: number;
  color: number;
}

/**
 * Campo de estrelas procedural em 3 camadas de parallax.
 * Não é asset gerado de propósito (ver docs/ASSETS.md): é infinito, não pesa no
 * bundle e não custa nada no PixelLab.
 */
export class Starfield {
  private readonly stars: Star[] = [];
  private readonly gfx: Phaser.GameObjects.Graphics;

  private static readonly LAYERS = [
    { count: 40, speed: 8, color: COLORS.starDim },
    { count: 24, speed: 18, color: COLORS.starMid },
    { count: 12, speed: 34, color: COLORS.starBright },
  ];

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(-100);

    for (const layer of Starfield.LAYERS) {
      for (let i = 0; i < layer.count; i++) {
        this.stars.push({
          x: Phaser.Math.Between(0, GAME_WIDTH),
          y: Phaser.Math.Between(0, GAME_HEIGHT),
          speed: layer.speed,
          color: layer.color,
        });
      }
    }
  }

  update(dt: number): void {
    this.gfx.clear();

    for (const s of this.stars) {
      s.x -= s.speed * dt;
      if (s.x < 0) {
        s.x += GAME_WIDTH;
        s.y = Phaser.Math.Between(0, GAME_HEIGHT);
      }
      // Math.floor: estrela em posição sub-pixel tremeluz e quebra a estética.
      this.gfx.fillStyle(s.color, 1);
      this.gfx.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
    }
  }
}
