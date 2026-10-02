import type Phaser from 'phaser';
import { contornoDoAlfa } from '../../cartasRegras';
import type { Contexto } from './contexto';

const COR = [0x3e, 0xe0, 0xf0];
const PULSO_MS = 1600;

/**
 * A AURA DO CASCO (§4.3b) — volta, de outro jeito. Em 28/09 o desenho em volta da nave saiu: era uma ELIPSE de 30px
 * que, nas naves de 44px, sumia atrás do casco e lia como "feixe de luz". Agora é o CONTORNO de 1px da SILHUETA da
 * própria nave (tirado do alfa do quadro atual, em cada tier e nas duas linhagens), ciano, pulsando devagar — sem forma
 * própria para "virar feixe". O "CASCO" continua na HUD: *"o jogador precisa saber que tem só de olhar a aura"* (ele).
 *
 * O contorno de cada quadro é calculado UMA vez e guardado como textura (`aura|<textura>|<quadro>`).
 * Provisório: o estouro ao quebrar (o contorno cresce e some); o efeito do PixelLab entra depois.
 */
export class AuraDoCasco {
  readonly img: Phaser.GameObjects.Image;
  private ligada = false;

  constructor(private readonly c: Contexto) {
    this.img = c.h.scene.add.image(0, 0, '__WHITE').setVisible(false);
  }

  get visivel(): boolean {
    return this.ligada;
  }

  mostrar(): void {
    this.ligada = true;
  }

  quebrar(): void {
    this.ligada = false;
    if (!this.img.visible) return;
    const s = this.c.h.scene;
    const eco = s.add
      .image(this.img.x, this.img.y, this.img.texture.key)
      .setAngle(this.img.angle)
      .setFlip(this.img.flipX, this.img.flipY)
      .setScale(this.img.scaleX, this.img.scaleY)
      .setDepth(this.img.depth);
    s.tweens.add({
      targets: eco,
      scaleX: eco.scaleX * 1.3,
      scaleY: eco.scaleY * 1.3,
      alpha: 0,
      duration: 220,
      onComplete: () => eco.destroy(),
    });
    this.img.setVisible(false);
  }

  tick(time: number): void {
    const n = this.c.h.nave();
    if (!this.ligada || !n.active) {
      this.img.setVisible(false);
      return;
    }
    this.img
      .setTexture(this.textura(n))
      .setPosition(n.x, n.y)
      .setAngle(n.angle)
      .setFlip(n.flipX, n.flipY)
      .setScale(n.scaleX, n.scaleY)
      .setDepth(n.depth + 1)
      // Pisca junto com a nave nos i-frames: a aura não pode ficar acesa no lugar de uma nave apagada.
      .setVisible(n.visible)
      .setAlpha(0.55 + 0.25 * Math.sin((time / PULSO_MS) * Math.PI * 2));
  }

  private textura(n: Phaser.GameObjects.Sprite): string {
    const chave = `aura|${n.texture.key}|${n.frame.name}`;
    const s = this.c.h.scene;
    if (s.textures.exists(chave)) return chave;
    const f = n.frame;
    const w = f.cutWidth;
    const h = f.cutHeight;
    const tela = document.createElement('canvas');
    tela.width = w;
    tela.height = h;
    const ctx = tela.getContext('2d')!;
    ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, w, h, 0, 0, w, h);
    const rgba = ctx.getImageData(0, 0, w, h).data;
    const alfa = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) alfa[i] = rgba[i * 4 + 3];
    const borda = contornoDoAlfa(alfa, w, h);
    const t = s.textures.createCanvas(chave, w + 2, h + 2)!;
    const img = t.context.createImageData(w + 2, h + 2);
    borda.forEach((b, i) => {
      if (!b) return;
      img.data[i * 4] = COR[0];
      img.data[i * 4 + 1] = COR[1];
      img.data[i * 4 + 2] = COR[2];
      img.data[i * 4 + 3] = 255;
    });
    t.context.putImageData(img, 0, 0);
    t.refresh();
    return chave;
  }
}
