/**
 * OS CABOS DA COLEIRA no jogo (spec 2026-11-22-guardiao-coleira-design.md §4 e §9): uma corda por toco que o recorte
 * deixou no casco, presa no teto acima da estação, desenhada numa CanvasTexture na resolução da tela com a textura do
 * cabo pintado. A camada fica atrás do corpo (a raiz some atrás do toco pintado) e À FRENTE das placas da moldura
 * (−0,6), como os cabos pintados ficavam: atrás delas (a 1ª tentativa, −0,61) a corda sumia na faixa do teto, e no
 * tranco de uma investida alta ela corria quase inteira dentro da faixa — a coleira invisível na hora em que importa.
 * A ponta da âncora some sob o HUD.
 *
 * A COLEIRA É RETRÁTIL: o teto solta e recolhe cabo. Na estação a corda tem uma folga (as curvas do desenho); na
 * investida ela vai saindo quase reta (o cachorro puxando) até o MÁXIMO dela — e aí é o tranco. Os máximos são medidos
 * numa parada de referência (`xParada` na altura da base): na base todas esticam juntas; mais alto ou mais baixo,
 * estica primeiro a que estiver mais longe.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { FAIXAS_CABO, RAIZES_CABO, RAIZES_TRAS } from '../../data/cordaGuardiao';
import { Corda, type Ponto } from './corda';
import { desenharCorda, type FaixaCabo } from './desenharCorda';

interface Cabo {
  corda: Corda;
  raiz: Ponto; // px do PNG, a partir do centro
  ancora: Ponto; // na tela
  max: number;
  /** só os de trás: o y da raiz em cada quadro da respiração (px do PNG) */
  raizQ?: number[];
  /** a folga da estação, em px — a mesma em qualquer vão */
  folga: number;
  faixa: FaixaCabo;
  /** a escala da faixa nesta corda (a grossura dela) */
  escala: number;
  s0: number;
}

export class CamadaCabos {
  /** a gravidade da F4 nos cabos (a da lava é 260; o cabo é mais leve no ar) */
  private static readonly GRAVIDADE = 160;
  /** a folga na estação: 15 % a mais que a distância reta — as curvas frouxas do desenho */
  private static readonly FOLGA = 1.15;
  /** a folga saindo na investida: quase reta */
  private static readonly FOLGA_TENSA = 1.02;
  /** quanto o teto recolhe/solta de cabo por segundo (px/s) — mais rápido que a investida, ou ela arrastaria a corda */
  private static readonly SOLTA_VEL = 520;
  /** a âncora acima do topo da tela (atrás da faixa do teto) */
  private static readonly ANCORA_Y = -8;
  /** o leque das âncoras: quanto cada uma se afasta para o lado da raiz dela (fração do x da raiz no PNG) */
  private static readonly LEQUE = 0.35;
  /** a raiz entra um pouco no toco pintado: a emenda some atrás dele */
  private static readonly RAIZ_ENTRA = 3;
  /** o cabo sai do toco para CIMA por estes px (o eixo do toco) antes de seguir para a âncora */
  private static readonly SAIDA = 5;
  /** os cabos de trás se prendem no hospedeiro a estes px além da borda direita da tela */
  private static readonly TRAS_X = 24;
  private static readonly APAGA_MS = 800;

  private readonly tex: Phaser.Textures.CanvasTexture;
  private readonly img: Phaser.GameObjects.Image;
  private readonly dado: ImageData;
  private readonly buf: Uint32Array;
  private readonly cabos: Cabo[] = [];
  private tensa = false;
  private solta = false;
  /**
   * O PULSO (23/11, o teto que sangra): ele BOMBEIA pelos cabos — uma luz vermelha sobe de cada raiz até a âncora no teto.
   * 0..1 ao longo da corda (0 = no corpo dele), ou null.
   */
  private pulsoK: number | null = null;
  /**
   * ABGR: o miolo aceso do pulso (rgb 255,120,90), o vermelho do sangue em volta (o do pulso que corre a borda,
   * `TETO.LUZ_PULSO`) e o halo escuro. Com 3 px ele sumia no quadro parado (23/11): agora 7, com 3 anéis.
   */
  private static readonly PULSO = 0xff5a78ff;
  private static readonly PULSO_MEIO = 0xff2a3ad8;
  private static readonly PULSO_HALO = 0xff1a1f8a;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly escala: number,
    estacao: Ponto,
    parada: Ponto,
  ) {
    if (scene.textures.exists('guardiaoCabos')) scene.textures.remove('guardiaoCabos');
    this.tex = scene.textures.createCanvas('guardiaoCabos', GAME_WIDTH, GAME_HEIGHT)!;
    this.img = scene.add.image(0, 0, 'guardiaoCabos').setOrigin(0, 0).setDepth(-0.4).setScrollFactor(0);
    this.dado = this.tex.context.createImageData(GAME_WIDTH, GAME_HEIGHT);
    this.buf = new Uint32Array(this.dado.data.buffer);

    const novo = (raiz: Ponto, ancora: Ponto, faixa: FaixaCabo, escalaCorda: number, dir: Ponto, raizQ?: number[]): void => {
      const naEstacao = this.naTela(estacao, raiz);
      const naParada = this.naTela(parada, raiz);
      const max = Math.hypot(naParada.x - ancora.x, naParada.y - ancora.y);
      const reta = Math.hypot(naEstacao.x - ancora.x, naEstacao.y - ancora.y);
      const folga = reta * (CamadaCabos.FOLGA - 1);
      const corda = new Corda(ancora, naEstacao, reta + folga);
      corda.saida = { x: dir.x * CamadaCabos.SAIDA, y: dir.y * CamadaCabos.SAIDA };
      const s0 = (this.cabos.length * 7) % 23;
      this.cabos.push({ corda, raiz, raizQ, ancora, max, folga, faixa, escala: escalaCorda, s0 });
    };

    // os tocos largos são VÁRIOS cabos lado a lado: um a cada ~9 px do PNG
    for (const r of RAIZES_CABO) {
      const partes = Math.max(1, Math.round(r.largura / 9));
      for (let k = 0; k < partes; k++) {
        const x = r.x - r.largura / 2 + ((k + 0.5) * r.largura) / partes;
        const raiz = { x, y: r.y + CamadaCabos.RAIZ_ENTRA };
        const ancora = { x: this.naTela(estacao, raiz).x + x * CamadaCabos.LEQUE, y: CamadaCabos.ANCORA_Y };
        const faixa = partes > 1 || r.largura >= 9 ? FAIXAS_CABO.musgo : FAIXAS_CABO.ruivo;
        novo(raiz, ancora, faixa, escala, { x: 0, y: -1 });
      }
    }

    // OS CABOS DE TRÁS (22/11): os que a arte arrasta para a DIREITA acabam na borda do quadro — na estação, fora da
    // tela; na parada da coleira, à vista e presos em nada. Cada ponta vira corda, na direção em que o cabo pintado sai,
    // até o hospedeiro: fora da tela à direita, ou o teto, o que vier primeiro. A raiz segue o quadro da respiração.
    for (const r of RAIZES_TRAS) {
      // a coluna corta o cabo inclinado: a espessura de verdade é a corrida × |dir.x|. Nunca abaixo de 3 px na tela: com
      // 2 a corda é só contorno, um fio preto
      const grossura = r.largura * Math.abs(r.dir.x);
      const faixa = grossura >= 7 ? FAIXAS_CABO.musgo : FAIXAS_CABO.ruivo;
      const escalaCorda = escala * Phaser.Math.Clamp(grossura / faixa.largura, 0.75, 1.2);
      const entra = (y: number): Ponto => ({ x: r.x - r.dir.x * CamadaCabos.RAIZ_ENTRA, y: y - r.dir.y * CamadaCabos.RAIZ_ENTRA });
      const raiz = entra(r.y[0]);
      const naEstacao = this.naTela(estacao, raiz);
      const tX = (GAME_WIDTH + CamadaCabos.TRAS_X - naEstacao.x) / r.dir.x;
      const tY = r.dir.y < 0 ? (CamadaCabos.ANCORA_Y - naEstacao.y) / r.dir.y : Infinity;
      const t = Math.min(tX, tY);
      const ancora = { x: naEstacao.x + r.dir.x * t, y: naEstacao.y + r.dir.y * t };
      novo(raiz, ancora, faixa, escalaCorda, r.dir, r.y.map((y) => entra(y).y));
    }
  }

  private naTela(corpo: Ponto, raiz: Ponto): Ponto {
    return { x: corpo.x + raiz.x * this.escala, y: corpo.y + raiz.y * this.escala };
  }

  /** o x do corpo em que a PRIMEIRA corda chega ao máximo, na altura `y` (a que estica primeiro manda) */
  xParada(y: number, xDaParada: (a: Ponto, r: Ponto, L: number, y: number) => number): number {
    let x = -Infinity;
    for (const c of this.cabos) {
      const r = { x: c.raiz.x * this.escala, y: c.raiz.y * this.escala };
      x = Math.max(x, xDaParada(c.ancora, r, c.max, y));
    }
    return x;
  }

  /** alguma corda chegou ao máximo com o corpo em `corpo`? */
  noLimite(corpo: Ponto): boolean {
    return this.cabos.some((c) => {
      const b = this.naTela(corpo, c.raiz);
      return Math.hypot(b.x - c.ancora.x, b.y - c.ancora.y) >= c.max - 0.5;
    });
  }

  /** na investida: o cabo sai quase reto (tensa); fora dela, com a folga das curvas */
  setTensa(v: boolean): void {
    this.tensa = v;
  }

  get esticada(): boolean {
    return this.cabos.some((c) => c.corda.esticada(c.ancora, c.corda.pontos()[c.corda.nos - 1]));
  }

  /** o pulso subindo pelos cabos (0..1, do corpo à âncora), ou null para apagar */
  pulso(k: number | null): void {
    this.pulsoK = k;
  }

  golpe(forca: number): void {
    for (const c of this.cabos) c.corda.golpe(forca * (0.7 + Math.random() * 0.6));
  }

  /** a morte: as âncoras soltam, as cordas chicoteiam penduradas no casco e apagam */
  arrebentar(): void {
    if (this.solta) return;
    this.solta = true;
    for (const c of this.cabos) c.corda.golpe(18);
    this.scene.tweens.add({ targets: this.img, alpha: 0, delay: 300, duration: CamadaCabos.APAGA_MS });
  }

  atualizar(dt: number, corpo: Ponto & { texture?: { key: string }; frame?: { name: string | number } }): void {
    if (this.solta && this.img.alpha <= 0) return;
    this.buf.fill(0);
    const folga = CamadaCabos.FOLGA_TENSA;
    // o quadro da respiração (as pontas dos cabos de trás sobem e descem com ele)
    const q = corpo.texture?.key === 'guardiaoIdleSheet' ? Number(corpo.frame?.name) || 0 : 0;
    for (const c of this.cabos) {
      const b = this.naTela(corpo, c.raizQ ? { x: c.raiz.x, y: c.raizQ[q] ?? c.raiz.y } : c.raiz);
      if (this.solta) c.corda.passoSolta(dt, b, CamadaCabos.GRAVIDADE * 2);
      else {
        // o teto recolhe ou solta cabo: retrátil, mas não instantâneo. O MÁXIMO só segura na investida (a coleira puxa
        // para trás); fora dela o teto solta o que precisar — na ENTRADA o corpo vem da direita, além do alcance, e a
        // corda presa no máximo chegava reta e deitada na raiz, com a ponta cortada saindo do toco (22/11, o glitch)
        // A folga é em PIXELS (a da estação), não proporcional: com o vão longo da entrada, 15 % pendurava laços abaixo
        // do casco.
        const reta = Math.hypot(b.x - c.ancora.x, b.y - c.ancora.y);
        const dist = this.tensa ? reta * folga : reta + c.folga;
        const alvo = this.tensa ? Math.min(c.max, dist) : dist;
        const L = c.corda.comprimento;
        const passo = CamadaCabos.SOLTA_VEL * dt;
        c.corda.comprimento = Math.max(8, L + Phaser.Math.Clamp(alvo - L, -passo, passo));
        c.corda.passo(dt, c.ancora, b, CamadaCabos.GRAVIDADE);
      }
      // a âncora afina um pouco: o cabo entra no teto
      desenharCorda(this.buf, GAME_WIDTH, GAME_HEIGHT, c.corda.pontos(), c.faixa, c.escala, c.s0, 0.25);
      if (this.pulsoK !== null && !this.solta) this.pintarPulso(c.corda.pontos(), this.pulsoK);
    }
    this.tex.context.putImageData(this.dado, 0, 0);
    this.tex.refresh();
  }

  /** uma conta de luz de 3 px (com halo) na corda, a `k` do caminho do corpo (o último ponto) até a âncora (o 1º) */
  private pintarPulso(pts: readonly Ponto[], k: number): void {
    const n = pts.length;
    if (n < 2) return;
    const f = (1 - k) * (n - 1);
    const i = Math.min(n - 2, Math.floor(f));
    const u = f - i;
    const x = Math.round(pts[i].x + (pts[i + 1].x - pts[i].x) * u);
    const y = Math.round(pts[i].y + (pts[i + 1].y - pts[i].y) * u);
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const px = x + dx, py = y + dy;
        if (px < 0 || py < 0 || px >= GAME_WIDTH || py >= GAME_HEIGHT) continue;
        const d = Math.hypot(dx, dy);
        const i = py * GAME_WIDTH + px;
        if (d <= 1.2) this.buf[i] = CamadaCabos.PULSO;
        else if (d <= 2.3) this.buf[i] = CamadaCabos.PULSO_MEIO;
        else if (d <= 3.2 && this.buf[i] >>> 24) this.buf[i] = CamadaCabos.PULSO_HALO;
      }
  }

  destroy(): void {
    this.img.destroy();
    if (this.scene.textures.exists('guardiaoCabos')) this.scene.textures.remove('guardiaoCabos');
  }
}
