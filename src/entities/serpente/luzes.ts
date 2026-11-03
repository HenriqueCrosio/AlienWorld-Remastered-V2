/**
 * HER LIGHTS POWERING UP and the HOT FLASH (spec §4.4; the mock's `quadro`: `acende` and `tom`). The mock pulls her light
 * pixels toward a target colour by k·level; here a white mask per frame (baked by `_hab-instalar.mjs` with the mock's
 * own colour tests) is drawn over her, tint-filled with the target, at alpha k·level — the same blend. The hot flash is
 * her own frame, tint-filled warm, at alpha 0.32·tinta.
 */
import Phaser from 'phaser';
import type { Cor } from './tipos';

/** the mock's targets and weights: the cyan (215,245,255)·0.6, the green (214,255,226)·0.7, the orange (255,236,196)·0.8 */
const ALVO: Record<Cor, { cor: number; k: number }> = {
  ciano: { cor: 0xd7f5ff, k: 0.6 },
  verde: { cor: 0xd6ffe2, k: 0.7 },
  laranja: { cor: 0xffecc4, k: 0.8 },
};
const CORES: Cor[] = ['ciano', 'verde', 'laranja'];

export class Luzes {
  private readonly sprites: Record<Cor, Phaser.GameObjects.Image>;
  /** the hot flash (255,226,190), her own frame tint-filled */
  private readonly quente: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    const novo = (): Phaser.GameObjects.Image => scene.add.image(0, 0, '__DEFAULT').setVisible(false);
    this.sprites = { ciano: novo(), verde: novo(), laranja: novo() };
    for (const c of CORES) this.sprites[c].setTintFill(ALVO[c].cor);
    this.quente = novo().setTintFill(0xffe2be);
  }

  /** `folha`: the set's key (`raioAberta`…) or the idle's (`idleA`); null = no masks for this frame */
  atualizar(ela: Phaser.GameObjects.Sprite, folha: string | null, i: number, niveis: Partial<Record<Cor, number>>, tinta: number): void {
    const tex = ela.scene.textures;
    for (const c of CORES) {
      const s = this.sprites[c], v = niveis[c] ?? 0, k = folha && `serpenteHabLuz_${c}_${folha}`;
      if (!ela.visible || v < 0.01 || !k || !tex.exists(k)) {
        s.setVisible(false);
        continue;
      }
      this.copiar(s, ela).setTexture(k, i).setAlpha(ALVO[c].k * Math.min(1, v)).setDepth(ela.depth + 0.15).setVisible(true);
    }
    if (!ela.visible || tinta < 0.01) this.quente.setVisible(false);
    else this.copiar(this.quente, ela).setTexture(ela.texture.key, ela.frame.name).setAlpha(0.32 * Math.min(1, tinta)).setDepth(ela.depth + 0.2).setVisible(true);
  }

  private copiar(s: Phaser.GameObjects.Image, ela: Phaser.GameObjects.Sprite): Phaser.GameObjects.Image {
    return s.setPosition(ela.x, ela.y).setOrigin(ela.originX, ela.originY).setScale(ela.scaleX, ela.scaleY).setFlipX(ela.flipX);
  }

  esconder(): void {
    for (const c of CORES) this.sprites[c].setVisible(false);
    this.quente.setVisible(false);
  }

  destroy(): void {
    for (const c of CORES) this.sprites[c].destroy();
    this.quente.destroy();
  }
}
