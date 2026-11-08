/**
 * THE EEL'S CANVASES in Phaser (plan `2026-11-08-enguia-instalacao.md`, decision 4): `cima` (her, the lip, what lies on
 * them — over the ship), `luz` (the pixelfx light that falls on nothing, ADDED with (ONE, ONE) — over `baixo`, under the
 * ship and under her) and `baixo` (the rest, under the ship). Each step only the box the worker drew (and cleared) is
 * put back into the canvases.
 */
import Phaser from 'phaser';
import { aditivoPuro } from '../aditivo';
import { HAB } from '../numerosHab';

const W = 384, H = 216;
/** the light between `baixo` (0.9) and the ship (1) */
const PROF_LUZ = 0.95;

export class CamadaEnguia {
  private readonly scene: Phaser.Scene;
  private readonly tex: Phaser.Textures.CanvasTexture[] = [];
  private readonly img: Phaser.GameObjects.Image[] = [];
  private static readonly CHAVES = ['enguiaCima', 'enguiaLuz', 'enguiaBaixo'] as const;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const prof = [HAB.profundidade.cima, PROF_LUZ, HAB.profundidade.baixo];
    CamadaEnguia.CHAVES.forEach((k, i) => {
      if (scene.textures.exists(k)) scene.textures.remove(k);
      const t = scene.textures.createCanvas(k, W, H) as Phaser.Textures.CanvasTexture;
      this.tex.push(t);
      const im = scene.add.image(0, 0, k).setOrigin(0, 0).setDepth(prof[i]).setScrollFactor(0);
      if (k === 'enguiaLuz') im.setBlendMode(aditivoPuro(scene));
      this.img.push(im);
    });
  }

  /** the drawn box of each canvas (cropped RGBA, straight alpha) */
  recebe(caixa: { x0: number; y0: number; x1: number; y1: number }, cima: Uint8ClampedArray, luz: Uint8ClampedArray, baixo: Uint8ClampedArray): void {
    if (caixa.x1 < caixa.x0) return;
    const w = caixa.x1 - caixa.x0 + 1, h = caixa.y1 - caixa.y0 + 1;
    [cima, luz, baixo].forEach((buf, i) => {
      if (buf.length !== w * h * 4) return;
      const t = this.tex[i];
      t.context.putImageData(new ImageData(buf as Uint8ClampedArray<ArrayBuffer>, w, h), caixa.x0, caixa.y0);
      t.refresh();
    });
  }

  mostra(v: boolean): void {
    for (const i of this.img) i.setVisible(v);
  }

  destroy(): void {
    for (const i of this.img) i.destroy();
    for (const k of CamadaEnguia.CHAVES) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}
