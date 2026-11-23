import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import type { Moldura } from '../../systems/Moldura';
import { APERTO, Aperto, deslocamentos } from './aperto';

/** os pixels de uma textura, lidos uma vez (ABGR, como o `Uint32Array` de um `ImageData`) */
interface Fonte {
  w: number;
  h: number;
  px: Uint32Array;
}

/** uma peça da faixa neste quadro, já em px de tela */
interface Peca {
  esq: number;
  topo: number;
  w: number;
  h: number;
  sx: number;
  sy: number;
  flipX: boolean;
  flipY: boolean;
  fonte: Fonte;
  /** o tint da peça (0xRRGGBB); branco = a arte crua */
  tint: number;
}

/**
 * O APERTO NA TELA (23/11, o passo 4): a faixa da moldura redesenhada COLUNA A COLUNA, cada uma deslocada um número
 * inteiro de pixels para dentro — o teto desce e o chão sobe no mesmo ponto, o anel correndo da direita para a esquerda
 * (`aperto.ts`). Nada estica nem se redesenha: é a própria pintura da peça (e a saia, a continuação dela além da tela),
 * lida pixel a pixel da textura. Enquanto ele aperta, as peças originais ficam apagadas por alpha (a `Moldura` nunca
 * mexe no alpha delas) e esta camada as substitui no mesmo lugar, inclusive nas colunas paradas — assim nada da peça
 * original aparece por trás da deslocada. Depth −0,58: logo à frente da faixa (−0,6), atrás dos cabos e do corpo dele.
 */
export class CamadaAperto {
  private static readonly DEPTH = -0.58;

  private readonly tex: Phaser.Textures.CanvasTexture;
  readonly img: Phaser.GameObjects.Image;
  private readonly dado: ImageData;
  private readonly buf: Uint32Array;
  private readonly fontes = new Map<string, Fonte>();
  private aperto: Aperto | null = null;
  /** o estremecer do aviso: um deslocamento por bloco de colunas, teto e chão */
  private readonly tremeT = new Int8Array(Math.ceil(GAME_WIDTH / APERTO.TREME_BLOCO) + 1);
  private readonly tremeC = new Int8Array(Math.ceil(GAME_WIDTH / APERTO.TREME_BLOCO) + 1);
  private tremeRelogio = 0;
  /** os deslocamentos de agora, por coluna (lidos pelo empurrão e pelos testes) */
  readonly dTeto = new Int16Array(GAME_WIDTH);
  readonly dChao = new Int16Array(GAME_WIDTH);
  /** só a parte do ANEL (sem o estremecer): onde ela é > 0 a borda está TORCIDA — leva o fio e morde */
  readonly anelTeto = new Int16Array(GAME_WIDTH);
  readonly anelChao = new Int16Array(GAME_WIDTH);
  /**
   * O FIO da borda torcida: a mesma luz da parede que morde no duto (`Moldura.FIO`, 0xffb478, 2 px) — o hitbox que a
   * borda convencional não tem (ele, 23/11). ABGR, como o buffer.
   */
  private static readonly FIO = 0xff78b4ff;
  private static readonly FIO_PX = 2;
  private apagadas: { setAlpha(a: number): unknown }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly moldura: Moldura | null,
  ) {
    if (scene.textures.exists('guardiaoAperto')) scene.textures.remove('guardiaoAperto');
    this.tex = scene.textures.createCanvas('guardiaoAperto', GAME_WIDTH, GAME_HEIGHT)!;
    this.img = scene.add
      .image(0, 0, 'guardiaoAperto')
      .setOrigin(0, 0)
      .setDepth(CamadaAperto.DEPTH)
      .setScrollFactor(0)
      .setVisible(false);
    this.dado = this.tex.context.createImageData(GAME_WIDTH, GAME_HEIGHT);
    this.buf = new Uint32Array(this.dado.data.buffer);
  }

  /** o aperto em curso (lido pelos testes e pelo filme) */
  get atual(): Aperto | null {
    return this.aperto;
  }

  get terminou(): boolean {
    return !this.aperto || this.aperto.acabou;
  }

  /** começa um aperto com o vão centrado em `vaoY` */
  soltar(vaoY: number): Aperto {
    this.aperto = new Aperto(vaoY);
    this.tremeRelogio = Infinity;
    this.apagar(true);
    return this.aperto;
  }

  /** a borda está torcida (o anel passando) na coluna `x`, em cima ou embaixo? — é onde ela morde */
  torcidaEm(x: number, teto: boolean): boolean {
    const c = Math.max(0, Math.min(GAME_WIDTH - 1, Math.round(x)));
    return (teto ? this.anelTeto[c] : this.anelChao[c]) > 0;
  }

  /** a superfície DEFORMADA do teto e do chão na coluna `x` (a nave encosta nestas) */
  tetoEm(x: number): number {
    const c = Math.max(0, Math.min(GAME_WIDTH - 1, Math.round(x)));
    return this.superficie(c, true) + this.dTeto[c];
  }

  chaoEm(x: number): number {
    const c = Math.max(0, Math.min(GAME_WIDTH - 1, Math.round(x)));
    return this.superficie(c, false) - this.dChao[c];
  }

  atualizar(dt: number): void {
    const a = this.aperto;
    if (!a) return;
    a.passo(dt);
    this.medir(dt);
    this.desenhar();
    if (a.acabou) this.encerrar();
  }

  /** a morte dele (ou o fim da luta): a borda volta inteira no mesmo quadro */
  cancelar(): void {
    if (this.aperto) this.encerrar();
  }

  destroy(): void {
    this.cancelar();
    this.img.destroy();
    if (this.scene.textures.exists('guardiaoAperto')) this.scene.textures.remove('guardiaoAperto');
  }

  private encerrar(): void {
    this.aperto = null;
    this.dTeto.fill(0);
    this.dChao.fill(0);
    this.anelTeto.fill(0);
    this.anelChao.fill(0);
    this.apagar(false);
  }

  private superficie(x: number, teto: boolean): number {
    if (!this.moldura) return teto ? 30 : 185;
    return teto ? this.moldura.superficieTetoEm(x) : this.moldura.superficieChaoEm(x);
  }

  /** as peças originais somem (alpha) e esta camada aparece — ou o contrário */
  private apagar(sim: boolean): void {
    if (sim) {
      const p = this.moldura?.pecasDaFaixa();
      this.apagadas = p ? [...p.teto, ...p.chao, ...p.tracos] : [];
      for (const o of this.apagadas) o.setAlpha(0);
      this.img.setVisible(this.apagadas.length > 0);
    } else {
      for (const o of this.apagadas) o.setAlpha(1);
      this.apagadas = [];
      this.img.setVisible(false);
      this.buf.fill(0);
      this.tex.context.putImageData(this.dado, 0, 0);
      this.tex.refresh();
    }
  }

  /** os deslocamentos de cada coluna neste quadro: o anel e, no aviso, o estremecer */
  private medir(dt: number): void {
    const a = this.aperto!;
    if (a.fase === 'aviso') {
      this.tremeRelogio += dt;
      if (this.tremeRelogio >= APERTO.TREME_S) {
        this.tremeRelogio = 0;
        const r = () => Math.round((Math.random() * 2 - 1) * APERTO.TREME);
        for (let i = 0; i < this.tremeT.length; i++) {
          this.tremeT[i] = r();
          this.tremeC[i] = r();
        }
      }
    }
    const treme = a.fase === 'aviso';
    for (let x = 0; x < GAME_WIDTH; x++) {
      const d = deslocamentos(x, this.superficie(x, true), this.superficie(x, false), a.xc, a.amp, a.vaoY);
      const b = Math.floor(x / APERTO.TREME_BLOCO);
      this.anelTeto[x] = d.teto;
      this.anelChao[x] = d.chao;
      this.dTeto[x] = d.teto + (treme ? this.tremeT[b] : 0);
      this.dChao[x] = d.chao + (treme ? this.tremeC[b] : 0);
    }
  }

  private fonte(key: string): Fonte | null {
    const f = this.fontes.get(key);
    if (f) return f;
    const src = this.scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    if (!src || !src.width) return null;
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    const nova = { w: c.width, h: c.height, px: new Uint32Array(ctx.getImageData(0, 0, c.width, c.height).data.buffer) };
    this.fontes.set(key, nova);
    return nova;
  }

  private pecas(lista: Phaser.GameObjects.Image[]): Peca[] {
    const out: Peca[] = [];
    for (const o of lista) {
      const fonte = this.fonte(o.texture.key);
      if (!fonte) continue;
      const w = o.displayWidth, h = o.displayHeight;
      out.push({
        esq: Math.round(o.x - o.originX * w),
        topo: Math.round(o.y - o.originY * h),
        w: Math.round(w),
        h: Math.round(h),
        sx: Math.abs(o.scaleX) || 1,
        sy: Math.abs(o.scaleY) || 1,
        flipX: o.flipX,
        flipY: o.flipY,
        fonte,
        tint: o.isTinted ? o.tintTopLeft : 0xffffff,
      });
    }
    return out;
  }

  private desenhar(): void {
    const p = this.moldura?.pecasDaFaixa();
    if (!p || !p.teto.length) return;
    this.buf.fill(0);
    const W = GAME_WIDTH, H = GAME_HEIGHT;
    // de trás para a frente: a da frente que cobrir o pixel ganha (a peça é opaca)
    const teto = this.pecas(p.teto).reverse();
    const chao = this.pecas(p.chao).reverse();
    const amostra = (lista: Peca[], x: number, y: number): number => {
      for (const q of lista) {
        if (x < q.esq || x >= q.esq + q.w || y < q.topo || y >= q.topo + q.h) continue;
        let u = Math.floor((x - q.esq) / q.sx), v = Math.floor((y - q.topo) / q.sy);
        if (q.flipX) u = q.fonte.w - 1 - u;
        if (q.flipY) v = q.fonte.h - 1 - v;
        const c = q.fonte.px[v * q.fonte.w + u];
        if (!(c >>> 24)) continue;
        if (q.tint === 0xffffff) return c;
        const r = ((c & 0xff) * ((q.tint >> 16) & 0xff)) / 255;
        const g = (((c >> 8) & 0xff) * ((q.tint >> 8) & 0xff)) / 255;
        const b = (((c >> 16) & 0xff) * (q.tint & 0xff)) / 255;
        return (c & 0xff000000) | (b << 16) | (g << 8) | r;
      }
      return 0;
    };
    for (let x = 0; x < W; x++) {
      const dT = this.dTeto[x], dC = this.dChao[x];
      // o teto: a coluna desce dT (o pixel da tela y vem de y − dT); vai até a superfície deslocada
      const fimT = Math.min(H, this.superficie(x, true) + dT + 2);
      for (let y = 0; y < fimT; y++) {
        const c = amostra(teto, x, y - dT);
        if (c) this.buf[y * W + x] = c;
      }
      // o chão: a coluna sobe dC
      const iniC = Math.max(0, this.superficie(x, false) - dC - 2);
      for (let y = iniC; y < H; y++) {
        const c = amostra(chao, x, y + dC);
        if (c) this.buf[y * W + x] = c;
      }
      // o FIO na superfície torcida (dentro da parede, colado na face): onde ele acende, ela morde
      const F = CamadaAperto.FIO_PX;
      if (this.anelTeto[x] > 0) {
        const s = this.superficie(x, true) + dT;
        for (let y = Math.max(0, s - F); y < Math.min(H, s); y++) this.buf[y * W + x] = CamadaAperto.FIO;
      }
      if (this.anelChao[x] > 0) {
        const s = this.superficie(x, false) - dC;
        for (let y = Math.max(0, s); y < Math.min(H, s + F); y++) this.buf[y * W + x] = CamadaAperto.FIO;
      }
    }
    this.tex.context.putImageData(this.dado, 0, 0);
    this.tex.refresh();
  }
}
