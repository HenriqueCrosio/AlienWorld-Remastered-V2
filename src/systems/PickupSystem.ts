import Phaser from 'phaser';
import { COLORS, SCROLL_SPEED } from '../config';
import { pixelText } from '../ui';

/** Armas que podem dropar. A base (`pulse`) nunca dropa — ela é o piso. */
const DROPPABLE = ['hmg', 'shotgun'] as const;

/**
 * Cada arma tem sua própria CÁPSULA e sua própria cor. A letra continua por cima, no estilo
 * Metal Slug — cor sozinha não basta: 8% dos homens não distinguem vermelho de verde, e num
 * shmup o jogador decide se vale o risco de pegar o item em uma fração de segundo.
 */
const CAPSULE: Record<string, { texture: string; letter: string; tint: number }> = {
  hmg: { texture: 'capsule', letter: 'H', tint: 0x9fe8ff },
  shotgun: { texture: 'capsule2', letter: 'S', tint: 0xffc08a },
};

export class PickupSystem {
  readonly pickups: Phaser.Physics.Arcade.Group;

  constructor(private readonly scene: Phaser.Scene) {
    this.pickups = scene.physics.add.group({ allowGravity: false });
  }

  /** Chance de drop ao matar um inimigo. */
  maybeDrop(x: number, y: number, chance: number): void {
    if (Math.random() > chance) return;

    const id = Phaser.Utils.Array.GetRandom([...DROPPABLE]);
    const cap = CAPSULE[id];

    const key = this.scene.textures.exists(cap.texture) ? cap.texture : 'pickup';
    const p = this.pickups.create(x, y, key) as Phaser.Physics.Arcade.Sprite;

    p.setVelocityX(-SCROLL_SPEED * 0.5);
    p.setTint(cap.tint);
    p.setData('weapon', id);

    const label = pixelText(this.scene, x, y - 1, cap.letter, {
      size: 8,
      color: COLORS.hotBright,
      stroke: 2,
    }).setDepth(11);

    p.setData('label', label);

    // Pulso: chama atenção sem custar frame de animação.
    this.scene.tweens.add({
      targets: p,
      scale: 1.15,
      duration: 400,
      yoyo: true,
      repeat: -1,
    });
  }

  update(): void {
    for (const obj of this.pickups.getChildren()) {
      const p = obj as Phaser.Physics.Arcade.Sprite;
      if (!p.active) continue;

      (p.getData('label') as Phaser.GameObjects.Text).setPosition(Math.floor(p.x), Math.floor(p.y));
      if (p.x < -16) this.destroy(p);
    }
  }

  destroy(p: Phaser.Physics.Arcade.Sprite): void {
    (p.getData('label') as Phaser.GameObjects.Text).destroy();
    p.destroy();
  }
}
