/**
 * THE PIXEL LAYER in Phaser (spec §5.1): the two canvases of `Lona` as CanvasTextures — over her (depth 36, above the
 * breach lip's 35) and under the ship (0.9) — and HER BODY's mask on screen each frame, read from her frame's own alpha
 * as `pixelArt` + `roundPixels` draws her (nearest). Also her left edge per row (the gas: a player shot that reaches it
 * hit her). ⚠️ The debris engine may swap her texture for a holed copy: the alpha cache is keyed by texture and frame,
 * so the copy's holes enter the mask, which is right.
 */
import Phaser from 'phaser';
import { HAB } from './numerosHab';
import { H, Lona, W, type Mascara } from './pixels';
import type { Put } from './tipos';

export class CamadaPixels {
  private readonly lona = new Lona();
  private readonly tex: { cima: Phaser.Textures.CanvasTexture; baixo: Phaser.Textures.CanvasTexture };
  private readonly img: Phaser.GameObjects.Image[] = [];
  private readonly dado: { cima: ImageData; baixo: ImageData };
  /** each texture frame's alpha (≥ 128), read once */
  private readonly alfas = new Map<string, Uint8Array>();
  private readonly esq = new Int16Array(H).fill(W);
  private sujouAntes = false;
  private caixa = { x0: 0, y0: 0, x1: 0, y1: 0 };
  readonly put: Put;

  constructor(private readonly scene: Phaser.Scene) {
    const nova = (k: string): Phaser.Textures.CanvasTexture => {
      if (scene.textures.exists(k)) scene.textures.remove(k);
      return scene.textures.createCanvas(k, W, H)!;
    };
    this.tex = { cima: nova('serpenteHabCima'), baixo: nova('serpenteHabBaixo') };
    this.dado = { cima: this.tex.cima.context.createImageData(W, H), baixo: this.tex.baixo.context.createImageData(W, H) };
    for (const [k, d] of [['serpenteHabCima', HAB.profundidade.cima], ['serpenteHabBaixo', HAB.profundidade.baixo]] as const)
      this.img.push(scene.add.image(0, 0, k).setOrigin(0, 0).setDepth(d).setScrollFactor(0));
    this.put = this.lona.put;
  }

  /** a new frame: clears both canvases (only when something was drawn last frame) */
  inicio(): void {
    if (this.lona.sujou || this.sujouAntes) this.lona.limpar();
  }

  /** her opaque pixels on screen, plus the extras' (the breach lip in front of her coils) */
  marcarCorpo(ela: Phaser.GameObjects.Sprite, extras: readonly Phaser.GameObjects.Image[]): void {
    const { corpo } = this.lona, c = this.caixa;
    for (let y = c.y0; y < c.y1; y++) corpo.fill(0, y * W + c.x0, y * W + c.x1);
    this.esq.fill(W);
    c.x0 = W;
    c.y0 = H;
    c.x1 = 0;
    c.y1 = 0;
    const marca = (o: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, borda: boolean): void => {
      if (!o.visible || !o.active) return;
      const f = o.frame, a = this.alfa(f), sx = o.scaleX, sy = o.scaleY;
      const x0 = Math.round(o.x - o.displayOriginX * sx), y0 = Math.round(o.y - o.displayOriginY * sy);
      const w = Math.round(f.cutWidth * sx), h = Math.round(f.cutHeight * sy);
      for (let Y = Math.max(0, y0); Y < Math.min(H, y0 + h); Y++) {
        const fy = Math.min(f.cutHeight - 1, Math.floor((Y + 0.5 - y0) / sy));
        for (let X = Math.max(0, x0); X < Math.min(W, x0 + w); X++) {
          if (!a[fy * f.cutWidth + Math.min(f.cutWidth - 1, Math.floor((X + 0.5 - x0) / sx))]) continue;
          corpo[Y * W + X] = 1;
          if (borda && X < this.esq[Y]) this.esq[Y] = X;
        }
      }
      c.x0 = Math.min(c.x0, Math.max(0, x0));
      c.y0 = Math.min(c.y0, Math.max(0, y0));
      c.x1 = Math.max(c.x1, Math.min(W, x0 + w));
      c.y1 = Math.max(c.y1, Math.min(H, y0 + h));
    };
    marca(ela, true);
    for (const e of extras) marca(e, false);
  }

  /** an object's frame as it sits in the world (its alpha, top-left, scale): for `acertoNoCorpo` (null when not shown) */
  mascara(o: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite): Mascara | null {
    if (!o.visible || !o.active) return null;
    const f = o.frame;
    return {
      a: this.alfa(f),
      w: f.cutWidth,
      h: f.cutHeight,
      x0: Math.round(o.x - o.displayOriginX * o.scaleX),
      y0: Math.round(o.y - o.displayOriginY * o.scaleY),
      sx: o.scaleX,
      sy: o.scaleY,
    };
  }

  /** her left edge on screen row y (W when she is not on it) */
  bordaEsq(y: number): number {
    return this.esq[Math.max(0, Math.min(H - 1, Math.round(y)))];
  }

  /** uploads the canvases (when something was drawn this frame or the last one) */
  fim(): void {
    const sujou = this.lona.sujou;
    if (sujou || this.sujouAntes) {
      for (const k of ['cima', 'baixo'] as const) {
        this.dado[k].data.set(this.lona[k]);
        this.tex[k].context.putImageData(this.dado[k], 0, 0);
        this.tex[k].refresh();
      }
    }
    this.sujouAntes = sujou;
  }

  /** empties both canvases now (her death: nothing of her skills stays on screen) */
  limpar(): void {
    this.lona.limpar();
    this.sujouAntes = true;
    this.fim();
  }

  /** anything drawn this frame (the probes read it) */
  get desenhou(): boolean {
    return this.lona.sujou;
  }

  /** another texture's frame laid exactly where `o` draws its own (same size, same origin: her sets' light masks) */
  mascaraDe(chave: string, quadro: number, o: Phaser.GameObjects.Sprite): Mascara | null {
    if (!o.visible || !o.active || !this.scene.textures.exists(chave)) return null;
    const f = this.scene.textures.getFrame(chave, quadro);
    if (!f) return null;
    return {
      a: this.alfa(f),
      w: f.cutWidth,
      h: f.cutHeight,
      x0: Math.round(o.x - o.displayOriginX * o.scaleX),
      y0: Math.round(o.y - o.displayOriginY * o.scaleY),
      sx: o.scaleX,
      sy: o.scaleY,
    };
  }

  private alfa(f: Phaser.Textures.Frame): Uint8Array {
    const chave = `${f.texture.key}:${f.name}`;
    let a = this.alfas.get(chave);
    if (a) return a;
    const cv = document.createElement('canvas');
    cv.width = f.cutWidth;
    cv.height = f.cutHeight;
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
    const d = ctx.getImageData(0, 0, f.cutWidth, f.cutHeight).data;
    a = new Uint8Array(f.cutWidth * f.cutHeight);
    for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
    this.alfas.set(chave, a);
    return a;
  }

  destroy(): void {
    for (const i of this.img) i.destroy();
    this.scene.textures.remove('serpenteHabCima');
    this.scene.textures.remove('serpenteHabBaixo');
  }
}
