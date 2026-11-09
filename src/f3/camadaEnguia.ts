import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { desenharEnguia, type ConceitoEnguia } from './enguiaCilindro';

/**
 * A CASCA PHASER DA ENGUIA EM CILINDRO (09/11, bloco H): uma tela de pixels do tamanho da tela, redesenhada A CADA QUADRO
 * durante a passagem (ela cruza a ~190 px/s: a 30 Hz andaria em saltos de 6 px) e limpa uma vez quando ela sai. Fora da
 * passagem não custa nada: nem desenho, nem subida para a GPU.
 */
export class CamadaEnguia {
  private readonly tex: Phaser.Textures.CanvasTexture;
  private readonly img: Phaser.GameObjects.Image;
  private readonly dados: ImageData;
  private limpa = true;

  constructor(scene: Phaser.Scene, private readonly c: ConceitoEnguia) {
    let n = 0;
    while (scene.textures.exists(`camadaEnguia${n}`)) n++;
    this.tex = scene.textures.createCanvas(`camadaEnguia${n}`, GAME_WIDTH, GAME_HEIGHT)!;
    this.dados = this.tex.context.createImageData(GAME_WIDTH, GAME_HEIGHT);
    this.img = scene.add.image(0, 0, this.tex).setOrigin(0, 0).setDepth(c.depth);
  }

  /** `t` = o relógio da fase, ou `null` quando ela não pode aparecer. */
  update(t: number | null): void {
    const p = this.c.caminho;
    const dentro = t !== null && t >= p.t0 && t <= p.t0 + p.dur;
    if (!dentro && this.limpa) return;
    this.dados.data.fill(0);
    const desenhou = dentro && desenharEnguia(this.dados.data, GAME_WIDTH, GAME_HEIGHT, 0, this.c, t);
    this.tex.context.putImageData(this.dados, 0, 0);
    this.tex.refresh();
    this.limpa = !desenhou;
  }

  destroy(): void {
    this.img.destroy();
    this.tex.destroy();
  }
}
