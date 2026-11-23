/**
 * OS CABOS-SERPENTE no jogo (spec 2026-11-22-guardiao-coleira-design.md §6 e §9): a MESMA corda da coleira (o
 * rasterizador `desenharCorda` com a textura amostrada da pintura), cada serpente seguindo o caminho da cabeça
 * (`serpente.ts`). Uma CanvasTexture na resolução da tela, atrás do corpo do Guardião (a raiz some atrás do casco) e À
 * FRENTE das cordas da coleira e da moldura; atrás da nave.
 *
 * O QUE FERE (a spec): só a cabeça e o trecho esticado do bote. O corpo encostado na borda NÃO — e por isso vai MAIS
 * ESCURO, como o cabo da serra; a parte que fere vai no tom da faixa. O que fere são círculos invisíveis no grupo
 * `perigos` do chefão (o que fere sem ser alvo: o tiro atravessa, como na serra).
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { FAIXAS_CABO } from '../../data/cordaGuardiao';
import { desenharCorda, escurecerFaixa } from './desenharCorda';
import type { Ponto } from './padroes';
import { Serpente, passoSerpentes, prefixo, type ParamSerpente } from './serpente';

const comprimento = (p: readonly Ponto[]): number => {
  let L = 0;
  for (let i = 1; i < p.length; i++) L += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
  return L;
};

export class CamadaSerpentes {
  /**
   * o tom do corpo encostado na borda. ⚠️ 0,55 (a 1ª captura, 23/11) sumia contra as placas e a pintura quase pretas —
   * a lição do cabo da serra ("um cabo que não se vê não liga a serra a ninguém"): mais escuro, mas legível
   */
  private static readonly ESCURO = 0.75;
  /** a ponta afila até 45 % da largura nos primeiros 14 px: a cabeça (a arte própria dela é a pergunta da folha) */
  private static readonly AFINA = 0.55;
  private static readonly PONTA_PX = 14;
  /** quanto da ponta vai claro além do trecho do bote (px) */
  private static readonly CABECA_PX = 16;
  /**
   * a grossura: a faixa `musgo` (10 px no PNG) na escala do Guardião dava 7 px na tela; ⚠️ 23/11, ele: *"um pouco mais
   * finas"* — 72 % disso, 5 px (a coleira segue com a dela)
   */
  private static readonly FINA = 0.72;
  /** os círculos que ferem: a cabeça, o trecho do bote a cada `PASSO_FERE` px, e quantos existem */
  private static readonly RAIO_CABECA = 4;
  private static readonly RAIO_TRECHO = 2.5;
  private static readonly PASSO_FERE = 6;
  private static readonly N_FERE = 48;
  private static readonly APAGA_MS = 500;
  /** atrás do corpo (0) e da nave (1), à frente das cordas da coleira (−0,4) e da moldura (−0,6) */
  private static readonly DEPTH = -0.39;

  private readonly tex: Phaser.Textures.CanvasTexture;
  private readonly img: Phaser.GameObjects.Image;
  private readonly dado: ImageData;
  private readonly buf: Uint32Array;
  private readonly claro = FAIXAS_CABO.musgo;
  private readonly escuro = escurecerFaixa(FAIXAS_CABO.musgo, CamadaSerpentes.ESCURO);
  private readonly fere: Phaser.Physics.Arcade.Sprite[] = [];
  private serpentes: Serpente[] = [];
  /** há algo desenhado no canvas (para limpar uma vez quando acabar) */
  private sujo = false;

  constructor(
    private readonly scene: Phaser.Scene,
    perigos: Phaser.Physics.Arcade.Group,
    private readonly escala: number,
  ) {
    if (scene.textures.exists('guardiaoSerpentes')) scene.textures.remove('guardiaoSerpentes');
    this.tex = scene.textures.createCanvas('guardiaoSerpentes', GAME_WIDTH, GAME_HEIGHT)!;
    this.img = scene.add
      .image(0, 0, 'guardiaoSerpentes')
      .setOrigin(0, 0)
      .setDepth(CamadaSerpentes.DEPTH)
      .setScrollFactor(0);
    this.dado = this.tex.context.createImageData(GAME_WIDTH, GAME_HEIGHT);
    this.buf = new Uint32Array(this.dado.data.buffer);
    for (let i = 0; i < CamadaSerpentes.N_FERE; i++) {
      const s = perigos.create(-50, -50, 'spark') as Phaser.Physics.Arcade.Sprite;
      s.setVisible(false).setData('serpente', true);
      const b = s.body as Phaser.Physics.Arcade.Body;
      b.setAllowGravity(false);
      b.enable = false;
      this.fere.push(s);
    }
  }

  /** as serpentes desta ação */
  soltar(params: readonly ParamSerpente[]): void {
    this.serpentes = params.map((p) => new Serpente(p));
    this.scene.tweens.killTweensOf(this.img);
    this.img.setAlpha(1);
  }

  /** lida pelos testes e pelo filme */
  get lista(): readonly Serpente[] {
    return this.serpentes;
  }

  /** todas voltaram para dentro do corpo (ou nenhuma saiu) */
  get terminou(): boolean {
    return this.serpentes.every((s) => s.acabou);
  }

  /** `desvio`: quanto o corpo dele andou desde `soltar` (as raízes vão junto: `Serpente.desvio`) */
  atualizar(dt: number, nave: Ponto, desvio: Ponto = { x: 0, y: 0 }): void {
    for (const s of this.serpentes) s.desvio = { x: desvio.x, y: desvio.y };
    if (this.serpentes.length) passoSerpentes(this.serpentes, dt, { x: nave.x, y: nave.y });
    this.desenhar();
    this.posicionarFeridas();
  }

  private desenhar(): void {
    const vivas = this.serpentes.filter((s) => !s.acabou);
    if (!vivas.length && !this.sujo) return;
    this.buf.fill(0);
    this.sujo = false;
    const W = GAME_WIDTH, H = GAME_HEIGHT, C = CamadaSerpentes;
    const e = this.escala * C.FINA;
    this.serpentes.forEach((s, i) => {
      const pts = s.corpo();
      if (pts.length < 2) return;
      this.sujo = true;
      const s0 = (i * 11) % 23;
      desenharCorda(this.buf, W, H, pts, this.escuro, e, s0, C.AFINA, C.PONTA_PX);
      // a cabeça e o trecho esticado do bote — o que fere — no tom da faixa, por cima
      const f = s.trechoQueFere();
      desenharCorda(this.buf, W, H, prefixo(pts, C.CABECA_PX + comprimento(f)), this.claro, e, s0, C.AFINA, C.PONTA_PX);
    });
    this.tex.context.putImageData(this.dado, 0, 0);
    this.tex.refresh();
  }

  private colocar(k: number, p: Ponto, r: number): number {
    if (k >= this.fere.length) return k;
    const s = this.fere[k];
    const b = s.body as Phaser.Physics.Arcade.Body;
    b.enable = true;
    // a textura `spark` tem 2×2: o círculo centrado no sprite
    b.setCircle(r, 1 - r, 1 - r);
    b.reset(p.x, p.y);
    return k + 1;
  }

  private posicionarFeridas(): void {
    const C = CamadaSerpentes;
    let k = 0;
    for (const s of this.serpentes) {
      // da cabeça para trás: a cabeça e, no bote, círculos a cada `PASSO_FERE` px ao longo do corpo que avançou
      const f = s.trechoQueFere();
      if (!f.length) continue;
      k = this.colocar(k, f[0], C.RAIO_CABECA);
      let falta = C.PASSO_FERE;
      for (let i = 1; i < f.length; i++) {
        const a = f[i - 1], b = f[i];
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        let u = falta;
        for (; u <= d; u += C.PASSO_FERE) k = this.colocar(k, { x: a.x + ((b.x - a.x) * u) / d, y: a.y + ((b.y - a.y) * u) / d }, C.RAIO_TRECHO);
        falta = u - d;
      }
    }
    for (; k < this.fere.length; k++) (this.fere[k].body as Phaser.Physics.Arcade.Body).enable = false;
  }

  /** a morte do Guardião: as serpentes param de ferir e a camada apaga */
  arrebentar(): void {
    this.serpentes = [];
    // o último quadro desenhado fica no canvas e apaga com a imagem (sem isto o próximo `desenhar` o limparia)
    this.sujo = false;
    for (const s of this.fere) (s.body as Phaser.Physics.Arcade.Body).enable = false;
    this.scene.tweens.add({ targets: this.img, alpha: 0, duration: CamadaSerpentes.APAGA_MS });
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.img);
    this.img.destroy();
    for (const s of this.fere) s.destroy();
    if (this.scene.textures.exists('guardiaoSerpentes')) this.scene.textures.remove('guardiaoSerpentes');
  }
}
