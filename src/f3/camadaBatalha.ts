import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { BatalhaFundo, CAMADA_BATALHA, type RegimeBatalha } from './batalhaFundo';

/**
 * THE BACKGROUND BATTLE'S LAYER (08/11, round 3 — plan `plans/2026-11-08-cenario-casco-rodada3.md`): the Phaser side
 * of `batalhaFundo.ts` — a 384×128 canvas over the sky (y 8–136, depth −93: behind the drifting clouds, in front of
 * the painting), stepped every frame, redrawn at 30 Hz. It does not scroll: the battle is far beyond the hull.
 */
export class CamadaBatalha {
  private readonly tex: Phaser.Textures.CanvasTexture;
  private readonly img: Phaser.GameObjects.Image;
  private readonly dados: ImageData;
  private readonly batalha = new BatalhaFundo(20261108);
  private acumulado = 1;

  constructor(scene: Phaser.Scene) {
    let n = 0;
    while (scene.textures.exists(`camadaBatalha${n}`)) n++;
    this.tex = scene.textures.createCanvas(`camadaBatalha${n}`, GAME_WIDTH, CAMADA_BATALHA.h)!;
    this.dados = this.tex.context.createImageData(GAME_WIDTH, CAMADA_BATALHA.h);
    this.img = scene.add.image(0, CAMADA_BATALHA.y0, this.tex).setOrigin(0, 0).setDepth(CAMADA_BATALHA.depth);
  }

  regime(r: RegimeBatalha, ms?: number): void {
    this.batalha.regime(r, ms);
  }

  update(dt: number, calmo: boolean): void {
    this.batalha.passo(dt, calmo);
    this.acumulado += dt;
    if (this.acumulado < 1 / CAMADA_BATALHA.hz) return;
    this.acumulado = 0;
    // EMPTY STAYS EMPTY: no upload while there is nothing to draw and the last upload was already clear. Measured
    // (08/11, the probe's software GPU): the two layers' full-width uploads at 30 Hz were the bulk of their cost
    // (`texImage2D` 139 ms in 60 frames), and this one is empty almost all the time.
    const vazia = this.batalha.vazia;
    if (vazia && this.limpa) return;
    this.batalha.desenhar(this.dados.data);
    this.tex.context.putImageData(this.dados, 0, 0);
    this.tex.refresh();
    this.limpa = vazia;
  }

  /** the texture on the GPU is fully clear */
  private limpa = false;

  destroy(): void {
    this.img.destroy();
    this.tex.destroy();
  }
}
