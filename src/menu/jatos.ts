import Phaser from 'phaser';
import type { Particula } from './abertura';

/**
 * Os JATOS do letreiro na tela (spec §6.3): um pool de quadradinhos nítidos na camada do texto (fora do tratamento),
 * desenhados a partir de `particulasDosJatos(t)`. As posições caem no pixel da tela (1/s px de jogo).
 */
export class Jatos {
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private vivos = 0;

  constructor(scene: Phaser.Scene, profundidade: number, max: number) {
    if (!scene.textures.exists('menu-px')) {
      const t = scene.textures.createCanvas('menu-px', 1, 1);
      if (t) {
        t.context.fillStyle = '#fff';
        t.context.fillRect(0, 0, 1, 1);
        t.refresh();
      }
    }
    for (let i = 0; i < max; i++) this.pool.push(scene.add.image(0, 0, 'menu-px').setDepth(profundidade).setVisible(false));
  }

  /** Quantas partículas estão na tela (a sonda lê). */
  get quantos(): number {
    return this.vivos;
  }

  desenhar(ps: readonly Particula[], s: number): void {
    const q = (v: number): number => Math.round(v * s) / s;
    const n = Math.min(ps.length, this.pool.length);
    for (let i = 0; i < n; i++) {
      const p = ps[i];
      this.pool[i].setVisible(true).setPosition(q(p.x), q(p.y)).setScale(Math.max(1 / s, q(p.tam))).setTint(p.cor).setAlpha(p.alfa);
    }
    for (let i = n; i < this.vivos; i++) this.pool[i].setVisible(false);
    this.vivos = n;
  }

  destruir(): void {
    for (const o of this.pool) o.destroy();
    this.pool.length = 0;
    this.vivos = 0;
  }
}
