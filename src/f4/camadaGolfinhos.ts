import Phaser from 'phaser';
import { CardumeFundo, FOLHA_GOLFINHOS, GOLFINHOS } from './golfinhosFundo';

/**
 * A CASCA PHASER DOS GOLFINHOS AO FUNDO (09/11, bloco H): dois sprites (a dupla) e um punhado de bolhas, postos a cada
 * quadro em px inteiros (`golfinhosFundo.ts` decide tudo). Atrás de toda peça do interior (−95, a pintura é −96): as
 * colunas, a borda e as mesas os escondem, de propósito.
 */
export class CamadaGolfinhos {
  private readonly cardume = new CardumeFundo();
  private readonly nadadores: Phaser.GameObjects.Sprite[] = [];
  private readonly bolhas: Phaser.GameObjects.Image[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    if (!scene.textures.exists(FOLHA_GOLFINHOS.chave)) return;
    for (let i = 0; i < 2; i++) {
      this.nadadores.push(scene.add.sprite(0, 0, FOLHA_GOLFINHOS.chave, 0).setOrigin(0, 0).setDepth(GOLFINHOS.depth).setVisible(false));
    }
  }

  /** `t` = o relógio do duelo (`null` com a câmara seca); `mul` = o nível da água (ela drena na morte dele). */
  update(t: number | null, dt: number, mul: number): void {
    if (!this.nadadores.length) return;
    const poses = this.cardume.passo(mul > 0 ? t : null, dt);
    this.nadadores.forEach((s, i) => {
      const p = poses[i];
      if (!p || mul <= 0) { s.setVisible(false); return; }
      s.setVisible(true).setPosition(p.x, p.y).setFrame(p.quadro).setAlpha(mul);
    });
    const temBolha = this.scene.textures.exists(FOLHA_GOLFINHOS.bolhas);
    const bs = temBolha ? this.cardume.bolhas : [];
    while (this.bolhas.length < bs.length) {
      this.bolhas.push(this.scene.add.image(0, 0, FOLHA_GOLFINHOS.bolhas, 0).setOrigin(0, 0).setDepth(GOLFINHOS.depth + 0.01));
    }
    this.bolhas.forEach((img, i) => {
      const b = bs[i];
      if (!b || mul <= 0) { img.setVisible(false); return; }
      img.setVisible(true).setFrame(b.anel ? 1 : 0).setPosition(Math.round(b.x) - 1, Math.round(b.y) - 1)
        .setAlpha(CardumeFundo.alpha(b) * mul);
    });
  }

  destroy(): void {
    for (const s of this.nadadores) s.destroy();
    for (const b of this.bolhas) b.destroy();
  }
}
