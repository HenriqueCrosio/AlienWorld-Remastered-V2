import Phaser from 'phaser';
import { COLORS } from '../config';

/**
 * Explosões e impactos em partículas, com blend aditivo.
 *
 * Não é economia de PixelLab: em movimento, ninguém vê o pixel da explosão — vê o
 * clarão. Partícula aditiva vende melhor o impacto do que sprite gerado, e é infinita.
 */
export class Fx {
  private readonly burst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly hitSpark: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly scene: Phaser.Scene) {
    this.burst = scene.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 180, max: 420 },
        speed: { min: 30, max: 130 },
        scale: { start: 1.5, end: 0 },
        tint: [COLORS.hotBright, COLORS.hot, COLORS.enemyBright],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(50);

    this.hitSpark = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 140,
        speed: { min: 20, max: 70 },
        scale: { start: 1, end: 0 },
        tint: [COLORS.playerGlow, COLORS.playerBright],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(50);
  }

  explode(x: number, y: number, size = 1): void {
    this.burst.explode(Math.floor(10 * size), x, y);
    this.scene.cameras.main.shake(90 * size, 0.004 * size);
  }

  hit(x: number, y: number): void {
    this.hitSpark.explode(3, x, y);
  }
}
