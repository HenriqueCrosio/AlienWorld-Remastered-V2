import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { CAMADA_CASCO, MS_REGIME, ehCobre, type RegimeCasco } from './numerosCascoF3';
import { EfeitosCasco, type Mascara, type PecaNaTela, type RomboNaTela } from './efeitosCasco';

/** The breach strip's crest row and its hole's middle (the strip is 318×100, bottom at the screen's bottom). */
const ROMBO = { chave: 'serpenteRombo', crista: 151, meio: 159, h: 100 };
/** The band's textures (the hull pieces and the breach strip, whole and open): their masks are read up front. */
const PECAS_DO_CASCO = [
  'cascoPlaca', 'cascoEscama', 'cascoCostela', 'cascoCostela2', 'cascoDuto', 'cascoDuto2', 'serpenteRomboInteiro', 'serpenteRombo',
];

/**
 * THE LIVING CASCO'S LAYER (08/11, round 2 — plan `plans/2026-11-08-cenario-casco-rodada2.md`): the Phaser side of
 * `efeitosCasco.ts`. Reads the hull pieces on screen (the band's sprites and the breach strip, the same list the
 * arena's living hull copies), builds each texture's mask once (per side: the pieces are mirrored at random), steps the
 * simulation every frame and redraws its 384×116 canvas at 30 Hz, right above the pieces (−74.8).
 */
export class CamadaCasco {
  private readonly tex: Phaser.Textures.CanvasTexture;
  private readonly img: Phaser.GameObjects.Image;
  private readonly dados: ImageData;
  private readonly ef = new EfeitosCasco(20261108);
  private readonly mascaras = new Map<string, Mascara>();
  private readonly ids = new WeakMap<Phaser.GameObjects.Image, number>();
  private readonly xAntes = new Map<number, number>();
  private proximoId = 1;
  private acumulado = 1;
  private buracos = new Map<string, [number, number] | null>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly pecas: () => Phaser.GameObjects.Image[],
  ) {
    let n = 0;
    while (scene.textures.exists(`camadaCasco${n}`)) n++;
    this.tex = scene.textures.createCanvas(`camadaCasco${n}`, GAME_WIDTH, CAMADA_CASCO.h)!;
    this.dados = this.tex.context.createImageData(GAME_WIDTH, CAMADA_CASCO.h);
    this.img = scene.add.image(0, CAMADA_CASCO.y0, this.tex).setOrigin(0, 0).setDepth(CAMADA_CASCO.depth);
    // Every mask read NOW (the layer is born behind the turn's black, or at the practice's start): read lazily, each new
    // piece cost a ~135 ms hitch the first time it scrolled in (the probe, software GPU).
    for (const key of PECAS_DO_CASCO) {
      if (!scene.textures.exists(key)) continue;
      this.mascara(key, false);
      this.mascara(key, true);
    }
    if (scene.textures.exists(ROMBO.chave)) this.buraco(ROMBO.chave);
  }

  regime(r: RegimeCasco, ms = MS_REGIME): void {
    this.ef.regime(r, ms);
  }

  update(dt: number): void {
    const naTela: PecaNaTela[] = [];
    let rombo: RomboNaTela | null = null;
    let soma = 0, quantos = 0;
    for (const p of this.pecas()) {
      if (!p.active || !p.visible || p.alpha < 0.5) continue;
      const w = p.frame.cutWidth, x0 = p.x - p.displayOriginX, y0 = p.y - p.displayOriginY;
      if (x0 > GAME_WIDTH || x0 + w < 0) continue;
      let id = this.ids.get(p);
      if (id === undefined) this.ids.set(p, (id = this.proximoId++));
      const antes = this.xAntes.get(id);
      if (antes !== undefined && dt > 0) { soma += (x0 - antes) / dt; quantos++; }
      this.xAntes.set(id, x0);
      const key = p.texture.key;
      naTela.push({ id, key, x0, y0, mascara: this.mascara(key, p.flipX) });
      if (key === ROMBO.chave) {
        const b = this.buraco(key);
        if (b) rombo = { buraco: [x0 + b[0], x0 + b[1]], crista: ROMBO.crista };
      }
    }
    if (this.xAntes.size > 64) this.xAntes.clear();
    this.ef.passo(dt, naTela, rombo, quantos ? soma / quantos : 0);

    // BETWEEN TWO DRAWS THE LAYER FOLLOWS THE BAND (round 2, him: "ele vibra o treme muito"): drawn at 30 Hz while the
    // pieces scroll every frame, the layer slipped a pixel behind them every other frame. It is moved by exactly what
    // the reference piece moved (in whole pixels, as the pieces are drawn).
    const ref = this.ref ? naTela.find((p) => p.id === this.ref!.id) : undefined;
    if (ref) this.img.x = Math.round(ref.x0) - this.ref!.x;

    this.acumulado += dt;
    if (this.acumulado < 1 / CAMADA_CASCO.hz) return;
    this.acumulado = 0;
    this.ef.desenhar(this.dados.data);
    this.tex.context.putImageData(this.dados, 0, 0);
    this.tex.refresh();
    this.img.x = 0;
    this.ref = naTela.length ? { id: naTela[0].id, x: Math.round(naTela[0].x0) } : null;
  }

  /** the piece the layer was drawn against, and where it was (whole px) */
  private ref: { id: number; x: number } | null = null;

  destroy(): void {
    this.img.destroy();
    this.tex.destroy();
  }

  /** The texture's pixels, its copper and its top contour (mirrored when the piece is). */
  private mascara(key: string, espelho: boolean): Mascara {
    const chave = `${key}|${espelho ? 1 : 0}`;
    const pronta = this.mascaras.get(chave);
    if (pronta) return pronta;
    const src = this.scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const w = src.width, h = src.height;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    if (espelho) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(src, 0, 0);
    const px = ctx.getImageData(0, 0, w, h).data;
    const cobre: number[] = [];
    const topo = new Int16Array(w).fill(-1);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (px[i + 3] < 128) continue;
        if (topo[x] < 0) topo[x] = y;
        if (ehCobre(px[i], px[i + 1], px[i + 2])) cobre.push(x, y, px[i], px[i + 1], px[i + 2]);
      }
    }
    const m: Mascara = { w, h, px, cobre: Int16Array.from(cobre), topo };
    this.mascaras.set(chave, m);
    return m;
  }

  /** The open breach's hole (strip columns): the crest+4 row, from the middle outward while it stays cavity-dark. */
  private buraco(key: string): [number, number] | null {
    if (this.buracos.has(key)) return this.buracos.get(key)!;
    const m = this.mascara(key, false);
    const sy = ROMBO.crista + 4 - (GAME_HEIGHT - ROMBO.h);
    const lum = (x: number): number => {
      const i = (sy * m.w + x) * 4;
      return 0.299 * m.px[i] + 0.587 * m.px[i + 1] + 0.114 * m.px[i + 2];
    };
    let a = -1, b = -1;
    for (let x = ROMBO.meio; x >= 0 && lum(x) < 34; x--) a = x;
    for (let x = ROMBO.meio; x < m.w && lum(x) < 34; x++) b = x;
    const r: [number, number] | null = a >= 0 && b >= 0 ? [a, b] : null;
    this.buracos.set(key, r);
    return r;
  }
}
