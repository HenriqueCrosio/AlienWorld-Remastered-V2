import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import { Starfield } from '../Starfield';
import { Parallax } from '../Parallax';
import { resetVariantCache } from '../art';
import { pixelText } from '../ui';
import { Fx } from '../systems/Fx';
import { Music } from '../systems/Music';
import { SHIPS, DEFAULT_SHIP, ROSTER_DOCA } from '../ships';
import { ShipPanel } from '../ui/ShipPanel';
import { STAGES } from '../systems/StageDirector';
import type { HandlingMode } from './GameScene';

/** Uma rocha ancorada: o sprite + o ponto da doca em que o cabo dela prende. */
interface Amarra {
  rocha: Phaser.GameObjects.Image;
  ancoraX: number;
  ancoraY: number;
  /** Fase da oscilação: as rochas não podem balançar em uníssono. */
  t: number;
  baseX: number;
  baseY: number;
}

/**
 * A DOCA DO CINTURÃO — a cutscene entre a Fase 2 e a Fase 3.
 *
 * ─── O QUE ELA FAZ PELA CAMPANHA ───
 *
 * A 1ª interlude era uma PERDA: você pousava na sua frota e ela implodia. Esta é um ACHADO —
 * uma estação de mineração encravada na rocha, viva, com pistas acesas, e **uma nave alienígena
 * encalhada na doca**. É aqui que o jogador põe a mão na tecnologia do inimigo pela primeira vez,
 * e é exatamente o arco de quem está indo caçar o Leviatã.
 *
 * A base explodir depois da decolagem não é repetição da Aurora: **a Aurora implodiu por dano de
 * batalha; esta some porque você tirou dela a única coisa que importava.** A campanha inteira é
 * uma queima de pontes — a cada fase, o lugar de onde você veio deixa de existir.
 *
 * ─── A DOCA É O CHÃO (o mesmo truque da Aurora) ───
 *
 * A estação não "cabe" na tela: ela entra grande, a rocha sangra para fora por baixo, e a PISTA
 * dela vira a superfície. Uma base que cabe inteira na tela parece uma maquete.
 *
 * ⚠️ A linha da pista é MEDIDA no PNG (`PAD_ROW`), nunca chutada — chutar a linha do convés da
 * Aurora já fez a nave pousar 30px abaixo da tela, no vazio (docs/HANDOFF.md, lição 13).
 */
export class Interlude2Scene extends Phaser.Scene {
  private starfield!: Starfield;
  private parallax!: Parallax;
  private fx!: Fx;

  private ship!: Phaser.GameObjects.Image;
  private doca!: Phaser.GameObjects.Image;
  /** A aresta de luz da pista: sem ela, metal escuro contra espaço escuro viram uma massa só. */
  private padRim!: Phaser.GameObjects.Rectangle;
  private cabos!: Phaser.GameObjects.Graphics;
  private banner!: Phaser.GameObjects.Text;

  private amarras: Amarra[] = [];
  /** A cordilheira em que a doca está ENCRAVADA — ela entra, vive e morre junto com a doca. */
  private plataforma: Phaser.GameObjects.Image[] = [];
  private panel: ShipPanel | null = null;

  private score = 0;
  private handling: HandlingMode = 'diegetico';
  private naveId: string = DEFAULT_SHIP;
  private proxima = 3;
  private done = false;
  private t = 0;

  // ─── A GEOMETRIA DA DOCA — medida em `doca.png` (160×160), a arte que o Henrique ESCOLHEU ───
  //
  // Esta arte é DENSA (preenche o quadro quase todo) e a pista não "salta para o vazio" como na
  // versão antiga — ela está EMBUTIDA no centro-direita, e a única forma de achá-la é pela COR: as
  // marcações de pouso são VERMELHAS. `node scripts/find-pad.mjs doca 80` encontra os pixels
  // vermelhos da pista em y=90..96, x=94..144. PAD_ROW é o topo dessa superfície.
  private static readonly ART_W = 160;
  private static readonly ART_H = 160;
  private static readonly PAD_ROW = 90;
  /** Onde a pista marcada começa e termina DENTRO da arte. É o trecho em que dá para pousar. */
  private static readonly PAD_X0 = 94;
  private static readonly PAD_X1 = 144;

  /**
   * ×1.5: a doca entra GRANDE (240px numa tela de 384 — domina e sangra para fora por cima e por
   * baixo), mas deixa céu à esquerda para a nave se aproximar e à direita para as rochas amarradas.
   * ×2 tapava a tela inteira e não sobrava vazio para a aproximação ler.
   */
  private static readonly SCALE = 1.5;

  // ─── AS PROFUNDIDADES, E POR QUE ELAS SÃO ALTAS ───
  //
  // ⚠️ O PRIMEIRO PLANO DO PARALLAX VIVE NO DEPTH 60 e passa **na frente da nave** (é ele que mais
  // vende profundidade numa FASE — ver Parallax.ts). Numa CUTSCENE ele faz o contrário: pedras
  // quase pretas cruzam a tela e **tapam a pista de pouso**, e o pouso é a única coisa que a cena
  // existe para mostrar. Na sonda, duas delas cobriam metade da plataforma.
  //
  // A doca inteira sobe para CIMA dele. As pedras à deriva continuam existindo — só que agora
  // passam ATRÁS da estação, que é onde um detrito distante deveria passar mesmo.
  private static readonly DEPTH_ROCHA = 66;
  private static readonly DEPTH_CABO = 67;
  /** A cordilheira fica ENTRE o foreground do parallax (60) e a doca (70): a doca se apoia nela. */
  private static readonly DEPTH_PLAT_FUNDO = 68;
  private static readonly DEPTH_PLAT_FRENTE = 69;
  private static readonly DEPTH_DOCA = 70;
  private static readonly DEPTH_RIM = 71;
  private static readonly DEPTH_NAVE = 80;

  /** A altura da pista NA TELA. Baixa: a doca é grande e sangra para fora por baixo. */
  private static readonly PAD_Y = 150;
  /** X do centro do sprite. Com SCALE 1.5, põe a pista (centro da arte ~119) em ~x=208 na tela. */
  private static readonly DOCA_X = 150;

  /** Y do centro do sprite que põe a linha da pista exatamente em PAD_Y. */
  private static get docaY(): number {
    const meio = Interlude2Scene.ART_H / 2;
    return Interlude2Scene.PAD_Y + (meio - Interlude2Scene.PAD_ROW) * Interlude2Scene.SCALE;
  }

  /** Converte um X da arte para o X da tela. */
  private static artToScreenX(ax: number): number {
    return Interlude2Scene.DOCA_X + (ax - Interlude2Scene.ART_W / 2) * Interlude2Scene.SCALE;
  }

  constructor() {
    super('Interlude2');
  }

  create(data: { score?: number; handling?: HandlingMode; ship?: string; stage?: number }): void {
    this.score = data.score ?? 0;
    this.handling = data.handling ?? 'diegetico';
    // A nave com que ele CHEGOU. Se ele não trocar nada, é com ela que ele segue — a escolha
    // anterior não pode ser apagada por uma cutscene que ele só assistiu.
    this.naveId = SHIPS[data.ship ?? ''] ? data.ship! : DEFAULT_SHIP;
    this.proxima = data.stage ?? 3;
    this.done = false;
    this.panel = null;
    this.amarras = [];
    this.plataforma = [];
    this.t = 0;

    resetVariantCache();

    this.starfield = new Starfield(this);
    // O MESMO céu da Fase 2: a cutscene é a continuação do voo, não um vídeo à parte.
    this.parallax = new Parallax(this, 'espaco');
    this.fx = new Fx(this);

    // O PLANETA EXPLODINDO — o grande fundo da cena. É a CAUSA do cinturão, vista de perto: o
    // mundo partido cujo núcleo ainda sangra lava, e cuja poeira é a rocha em que a doca minera.
    // Fica no céu ABERTO à direita (a doca preenche o centro), com o núcleo virado PARA a cena
    // (setFlipX) — o brilho quente aponta para dentro, e amarra com a "sobrecarga" do fim.
    // Depth entre as camadas de fundo do parallax e a doca: longe, mas uma presença, não um detalhe.
    if (this.textures.exists('planetShattered')) {
      this.add
        .image(324, 58, 'planetShattered')
        .setDepth(-85)
        .setScale(1.15)
        .setFlipX(true)
        .setTint(0x9aa6c8);
    }

    this.construirPlataforma();

    this.doca = this.add
      .image(Interlude2Scene.DOCA_X, Interlude2Scene.docaY, 'doca')
      .setScale(Interlude2Scene.SCALE)
      .setDepth(Interlude2Scene.DEPTH_DOCA)
      // Tint frio MUITO sutil: a arte da doca é bege/cinza-quente e a cena inteira é azul-profunda.
      // 0xd9deee só encosta a arte na paleta (B quase intacto, R levemente contido) sem apagar as
      // lâmpadas laranja da pista.
      .setTint(0xd9deee);

    // A aresta de luz da PISTA — só no trecho em que ela existe. Uma linha atravessando a tela
    // inteira (como a da Aurora, que era um convés de 384px) mentiria: aqui a superfície começa
    // em x=PAD_X0 e o resto é rocha.
    const x0 = Interlude2Scene.artToScreenX(Interlude2Scene.PAD_X0);
    const x1 = Interlude2Scene.artToScreenX(Interlude2Scene.PAD_X1);

    this.padRim = this.add
      .rectangle(x0, Interlude2Scene.PAD_Y, x1 - x0, 1, 0xff7a4a)
      .setOrigin(0, 0)
      .setDepth(Interlude2Scene.DEPTH_RIM)
      .setAlpha(0.6);

    // OS CABOS. Desenhados em código, e não como sprite, porque eles precisam LIGAR duas coisas:
    // uma ponta na doca, a outra numa rocha que balança. Um sprite de cabo ficaria parado
    // enquanto a rocha se move, e a amarra viraria uma decoração solta no meio do vazio.
    this.cabos = this.add.graphics().setDepth(Interlude2Scene.DEPTH_CABO);
    this.amarrarRochas();

    // A nave que chega é a ESCOLHIDA na Aurora (this.naveId) — a doca não pode desmentir a
    // escolha que o jogador fez uma fase atrás.
    const chegada = SHIPS[this.naveId];
    const chegadaTex = this.textures.exists(chegada.texture) ? chegada.texture : 'ship';
    this.ship = this.add.sprite(-30, 70, chegadaTex).setDepth(Interlude2Scene.DEPTH_NAVE);
    const chegadaAnim = chegadaTex === chegada.texture ? (chegada.anim ?? 'ship-thrust') : 'ship-thrust';
    if (this.anims.exists(chegadaAnim)) (this.ship as Phaser.GameObjects.Sprite).play(chegadaAnim);

    this.banner = pixelText(this, GAME_WIDTH / 2, 26, '', { size: 11, color: COLORS.hotBright })
      .setDepth(100)
      .setAlpha(0);

    this.roteiro();

    // ⚠️ SEM TECLA DE PULAR — a mesma lição que custou a 1ª cutscene inteira (docs/HANDOFF.md).
    // O jogador chega aqui com o dedo no ESPAÇO (é o gatilho da Fase 2), e uma tecla de pular
    // seria consumida no primeiro frame.
  }

  /**
   * A CORDILHEIRA DA BASE — a primeira camada de cenário em que a doca está ENCRAVADA.
   *
   * Sem ela, a doca flutua: abaixo e à direita do sprite é vazio, e a base esfumada dele lê como
   * ilha recortada. A cordilheira atravessa a base INTEIRA da tela (e sobra 150px à direita,
   * porque tudo entra deslizando junto com a doca — ver roteiro()), com topo IRREGULAR: topo reto
   * lê como régua, não como rocha.
   *
   * É SILHUETA, não protagonista: duas camadas de tint azul-escuro (mais escuras que as rochas
   * amarradas, 0x8fa0c0), leitura mínima de forma. Nas laterais baixas ela sobe até y≈120 — o
   * suficiente para emoldurar sem invadir o corredor de aproximação (a nave chega em y=70) nem a
   * pista (y=150, x≈171..246, que fica no MIOLO da doca, acima dela em depth).
   */
  private construirPlataforma(): void {
    // Mais escura que as rochas amarradas: fundo quase silhueta, frente com um passo de leitura.
    const TINT_FUNDO = 0x3a465e;
    const TINT_FRENTE = 0x4d5a78;
    const F = Interlude2Scene.DEPTH_PLAT_FUNDO;
    const P = Interlude2Scene.DEPTH_PLAT_FRENTE;

    // [textura, x, y, escala, ângulo, flipX, depth, tint] — posições FINAIS (pós-deslize).
    // Valores fixos, não aleatórios: a sonda fotografa a cena e o quadro tem que ser reproduzível.
    const pecas: Array<[string, number, number, number, number, boolean, number, number]> = [
      // ── A faixa contínua da base (x=-8..545: cobre a tela e o excedente do deslize) ──
      ['asteroid', -8, 214, 3.2, 0, false, F, TINT_FUNDO],
      ['asteroid2', 36, 220, 3.0, 14, true, F, TINT_FUNDO],
      ['asteroid3', 78, 212, 3.4, -8, false, F, TINT_FUNDO],
      ['asteroid', 122, 222, 3.0, 22, true, F, TINT_FUNDO],
      ['asteroid2', 164, 215, 3.2, -15, false, F, TINT_FUNDO],
      ['asteroid3', 208, 224, 3.4, 6, true, F, TINT_FUNDO],
      ['asteroid', 252, 216, 3.0, -20, false, F, TINT_FUNDO],
      ['asteroid2', 296, 221, 3.2, 11, true, F, TINT_FUNDO],
      ['asteroid3', 338, 213, 3.4, -5, false, F, TINT_FUNDO],
      ['asteroid', 382, 220, 3.0, 17, true, F, TINT_FUNDO],
      ['asteroid2', 426, 214, 3.2, -12, false, F, TINT_FUNDO],
      ['asteroid3', 470, 221, 3.0, 8, true, F, TINT_FUNDO],
      ['asteroid', 514, 215, 3.2, -18, false, F, TINT_FUNDO],
      ['asteroid2', 545, 222, 3.0, 4, true, F, TINT_FUNDO],
      // ── As massas laterais: 1-2 rochas maiores subindo até y≈120 nas beiradas baixas ──
      ['asteroid3', 26, 172, 4.2, 10, false, F, TINT_FUNDO],
      ['asteroid', 64, 188, 2.8, -14, true, P, TINT_FRENTE],
      ['asteroid2', 360, 174, 4.0, -7, true, F, TINT_FUNDO],
      ['asteroid3', 330, 192, 2.6, 12, false, P, TINT_FRENTE],
      ['asteroid', 400, 185, 3.0, -19, false, P, TINT_FRENTE],
      // ── O perfil DENTADO: pedras menores quebrando a linha do topo em alturas irregulares ──
      ['asteroid3', 18, 192, 2.0, 24, true, P, TINT_FRENTE],
      ['asteroid', 58, 199, 1.6, -9, false, P, TINT_FRENTE],
      ['asteroid2', 98, 188, 2.2, 16, false, P, TINT_FRENTE],
      ['asteroid3', 146, 197, 1.7, -22, true, P, TINT_FRENTE],
      ['asteroid', 190, 202, 1.5, 7, false, P, TINT_FRENTE],
      ['asteroid2', 262, 194, 1.9, -13, true, P, TINT_FRENTE],
      ['asteroid', 306, 200, 1.6, 19, false, P, TINT_FRENTE],
      ['asteroid3', 352, 190, 2.1, -6, true, P, TINT_FRENTE],
      ['asteroid2', 398, 198, 1.7, 10, false, P, TINT_FRENTE],
      ['asteroid', 444, 192, 2.0, -16, true, P, TINT_FRENTE],
      ['asteroid3', 492, 199, 1.6, 21, false, P, TINT_FRENTE],
      ['asteroid2', 532, 193, 1.9, -11, true, P, TINT_FRENTE],
      // ── Destroços meio enterrados: a doca minera, e o entulho dela vive na rocha ──
      ['destroco', 120, 208, 1.4, 6, false, P, TINT_FUNDO],
      ['destroco2', 250, 205, 1.6, -8, true, P, TINT_FUNDO],
    ];

    for (const [tex, x, y, escala, angulo, flip, depth, tint] of pecas) {
      if (!this.textures.exists(tex)) continue;

      this.plataforma.push(
        this.add
          .image(x, y, tex)
          .setScale(escala)
          .setAngle(angulo)
          .setFlipX(flip)
          .setDepth(depth)
          .setTint(tint),
      );
    }
  }

  /**
   * AS ROCHAS AMARRADAS — "grandes cabos saem para segurar os asteroides em volta".
   *
   * Elas são a razão de a doca existir: isto é uma MINA. Os cabos dizem, sem uma linha de texto,
   * que aquela gente estava ARRASTANDO pedra — e que parou.
   *
   * ⚠️ AS ROCHAS FICAM NO CÉU ABERTO, não coladas na estrutura. A 1ª versão ancorava e soltava as
   * rochas em coordenadas tiradas da arte, e elas nasceram enterradas dentro do desenho da rocha
   * (invisíveis) ou fora da tela — só UM dos três cabos aparecia. O cabo só conta a história se as
   * DUAS pontas dele forem visíveis: uma na máquina, a outra na pedra, com vácuo no meio.
   *
   * Por isso a âncora sai da ARTE (é uma peça da doca) e a rocha vai para a TELA (o vazio à
   * direita e acima da pista, que é a única região grande sem nada em cima).
   */
  private amarrarRochas(): void {
    // ⚠️ Re-ancorado para a arte NOVA (160×160, densa). As âncoras saem dos guindastes/mastros no
    // alto do outpost (coords da ARTE, x~45-65 y~22-40); as rochas ficam no céu aberto à direita,
    // ONDE não há doca (ela preenche até x~270 na tela). Medir de novo se a arte trocar.
    const pontos = [
      // âncora (coords da ARTE) → rocha (coords da TELA, no vazio à direita/alto)
      { ax: 58, ay: 24, rx: 300, ry: 34, escala: 1.4 },
      { ax: 64, ay: 34, rx: 352, ry: 104, escala: 1.0 },
      { ax: 46, ay: 30, rx: 298, ry: 96, escala: 0.85 },
    ];

    for (const p of pontos) {
      const ancoraX = Interlude2Scene.artToScreenX(p.ax);
      const ancoraY =
        Interlude2Scene.docaY + (p.ay - Interlude2Scene.ART_H / 2) * Interlude2Scene.SCALE;

      const rocha = this.add
        .image(p.rx, p.ry, 'asteroid')
        .setScale(p.escala)
        // Clara o bastante para LER contra o espaço. A tint escura de cenário (0x232c4a) as fazia
        // sumir no fundo — e uma pedra invisível na ponta de um cabo é um cabo que não segura nada.
        .setTint(0x8fa0c0)
        .setDepth(Interlude2Scene.DEPTH_ROCHA);

      this.amarras.push({
        rocha,
        ancoraX,
        ancoraY,
        t: Phaser.Math.FloatBetween(0, Math.PI * 2),
        baseX: rocha.x,
        baseY: rocha.y,
      });
    }
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.t += dt;

    this.starfield.update(dt);
    // Devagar: a nave está em aproximação, não em fuga.
    this.parallax.update(dt, 20);

    // As rochas BALANÇAM na ponta do cabo — e é o balanço que prova que o cabo está sob tensão.
    // Pedra parada pendurada num fio é um adesivo.
    this.cabos.clear();

    for (const a of this.amarras) {
      a.rocha.x = a.baseX + Math.sin(this.t * 0.5 + a.t) * 3;
      a.rocha.y = a.baseY + Math.cos(this.t * 0.4 + a.t) * 2;
      a.rocha.angle += dt * 4;

      this.desenharCabo(a);
    }
  }

  /**
   * UM CABO DE ARRASTO — grosso, com barriga, e com um fio de luz em cima.
   *
   * ⚠️ **NÃO é um sprite, e não pode ser.** Um cabo liga DUAS coisas que se mexem (a doca desliza
   * para dentro da tela; a rocha balança na ponta), e um PNG esticado entre elas seria uma barra
   * rígida — ou pior, um adesivo parado enquanto as pontas andam. O que vende o cabo é ele
   * ACOMPANHAR, e só o desenho por frame faz isso.
   *
   * Três coisas o fazem parecer um cabo de mineração e não um fio:
   *  1. **BARRIGA** (catenária). Uma reta perfeita entre dois pontos lê como viga, não como cabo.
   *     A barriga cai perpendicular ao vão, e ela é o que diz "isto é flexível e está pesado".
   *  2. **ESPESSURA** de 3px com um realce de 1px por cima — a mesma aresta de luz que dá volume
   *     ao pico e ao asteroide (docs/HANDOFF.md: silhueta chapada não tem volume).
   *  3. **SEGMENTOS**: a curva é desenhada em pedaços, então ela dobra.
   */
  private desenharCabo(a: Amarra): void {
    const SEG = 10;
    const dx = a.rocha.x - a.ancoraX;
    const dy = a.rocha.y - a.ancoraY;

    // A barriga é perpendicular ao vão e proporcional a ele: um cabo curto quase não cede.
    const vao = Math.hypot(dx, dy);
    const sag = vao * 0.12;
    const nx = -dy / (vao || 1);
    const ny = dx / (vao || 1);

    const ponto = (i: number) => {
      const t = i / SEG;
      // Parábola: zero nas pontas (o cabo está PRESO nas duas), máxima no meio.
      const barriga = Math.sin(t * Math.PI) * sag;
      return {
        x: a.ancoraX + dx * t + nx * barriga,
        y: a.ancoraY + dy * t + ny * barriga,
      };
    };

    for (const [largura, cor, alpha] of [
      [3, 0x2e2e38, 1],
      [1, 0x9a9aab, 0.7],
    ] as const) {
      this.cabos.lineStyle(largura, cor, alpha);
      this.cabos.beginPath();

      const p0 = ponto(0);
      this.cabos.moveTo(p0.x, p0.y);
      for (let i = 1; i <= SEG; i++) {
        const p = ponto(i);
        this.cabos.lineTo(p.x, p.y);
      }

      this.cabos.strokePath();
    }
  }

  // ─── O roteiro ──────────────────────────────────────────────────────────────

  private roteiro(): void {
    this.placar();

    this.time.delayedCall(2300, () => {
      if (this.done) return;
      this.aviso('PILOTO AUTOMÁTICO · ENGATADO', COLORS.hotBright);
      this.cameras.main.flash(160, 255, 212, 71);
    });

    // A doca ENTRA: ela desliza da direita, grande. O jogador não chega nela — ela chega nele.
    const entrada = 150;
    this.doca.x += entrada;
    this.padRim.x += entrada;
    // A cordilheira entra JUNTO: se ela ficasse parada, a doca deslizaria sobre rocha imóvel e a
    // emenda entre as duas denunciaria que são peças separadas.
    for (const p of this.plataforma) p.x += entrada;
    for (const a of this.amarras) {
      a.baseX += entrada;
      a.ancoraX += entrada;
      a.rocha.x += entrada;
    }

    this.tweens.add({
      targets: [this.doca, this.padRim, ...this.plataforma],
      x: `-=${entrada}`,
      duration: 5000,
      ease: 'Sine.easeOut',
      delay: 2400,
    });

    // As amarras viajam JUNTO — as âncoras são números, não objetos, então elas não seguem o
    // tween sozinhas. Sem isto, os cabos ficariam pendurados a 150px da doca.
    this.tweens.addCounter({
      from: entrada,
      to: 0,
      duration: 5000,
      ease: 'Sine.easeOut',
      delay: 2400,
      onUpdate: (tw) => {
        const d = (tw.getValue() ?? 0) - (this.desloc ?? entrada);
        this.desloc = tw.getValue() ?? 0;

        for (const a of this.amarras) {
          a.ancoraX += d;
          a.baseX += d;
        }
      },
    });

    this.tweens.add({
      targets: this.ship,
      x: 120,
      duration: 3800,
      ease: 'Sine.easeOut',
      delay: 2600,
    });

    this.time.delayedCall(6200, () => this.pouso());
  }

  /** Quanto do deslocamento de entrada as amarras já consumiram (ver o tween acima). */
  private desloc?: number;

  private placar(): void {
    const t = (y: number, v: string, size: number, color: number) =>
      pixelText(this, GAME_WIDTH / 2, y, v, { size, color }).setDepth(100);

    const linhas = [
      t(74, 'FASE 2 · FROTA MORTA', 11, COLORS.playerBright),
      t(92, 'CONCLUÍDA', 8, COLORS.metalLight),
      t(116, String(this.score), 17, COLORS.hotBright),
      t(132, 'PONTOS', 7, COLORS.metalLight),
    ];

    this.tweens.add({
      targets: linhas,
      alpha: 0,
      duration: 900,
      delay: 2400,
      onComplete: () => linhas.forEach((l) => l.destroy()),
    });
  }

  /**
   * O POUSO — na PISTA, e não em qualquer lugar do sprite.
   *
   * X e Y são tweens SEPARADOS, com curvas diferentes: é isso que faz um ARCO em vez de uma
   * diagonal. O X desacelera (ela perde avanço), o Y acelera e assenta.
   */
  private pouso(): void {
    if (this.done) return;

    this.aviso('DOCA KEPLER-9 · MINERAÇÃO', COLORS.hot);

    // O alvo é o MEIO DA PISTA, calculado da arte — não um número escolhido a olho.
    const alvoX =
      (Interlude2Scene.artToScreenX(Interlude2Scene.PAD_X0) +
        Interlude2Scene.artToScreenX(Interlude2Scene.PAD_X1)) /
      2;

    this.tweens.add({ targets: this.ship, x: alvoX, duration: 2200, ease: 'Sine.easeOut' });

    this.tweens.add({
      targets: this.ship,
      y: Interlude2Scene.PAD_Y - 6,
      duration: 2200,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.fx.hit(this.ship.x, this.ship.y + 6);
        this.cameras.main.shake(140, 0.004);
        this.escolha();
      },
    });
  }

  /**
   * A ESCOLHA — agora com QUATRO naves.
   *
   * O painel é o MESMO da 1ª interlude (src/ui/ShipPanel.ts). A diferença é só o róster: aqui
   * entra o ARAUTO, a nave alienígena encalhada nesta doca.
   */
  private escolha(): void {
    if (this.done) return;

    this.aviso('DOCA KEPLER-9 · SELECIONE SUA NAVE', COLORS.playerBright);

    this.panel = new ShipPanel(
      this,
      ROSTER_DOCA,
      (t, c) => this.aviso(t, c),
      (id) => this.escolher(id),
      () => this.sair(),
    );
  }

  private sair(): void {
    if (this.done) return;
    this.done = true;
    this.scene.start('Menu');
  }

  /**
   * TROCA A NAVE NA DOCA — e PARA A ANIMAÇÃO antes, senão a troca não acontece.
   *
   * ⚠️ **A ANIMAÇÃO SOBRESCREVE A TEXTURA A CADA FRAME.** A nave da cutscene é um sprite tocando
   * `ship-thrust` (o motor aceso — é ele que diz que ela está sob potência). Um `setTexture()`
   * solto dura exatamente até o próximo quadro da animação, e aí o Phaser repõe `shipAnim*` por
   * cima. O jogador escolhia o ARAUTO, via o letreiro "ARMADA", e decolava no Interceptor.
   *
   * Era um bug SILENCIOSO: a escolha funcionava (a nave certa ia para a Fase 3), só a IMAGEM
   * mentia — e mentia justamente no instante em que a cutscene existe para mostrar o que ele
   * acabou de armar. Achado pela sonda, que compara a textura DEPOIS da escolha; a olho nu, num
   * sprite de 30px que decola em 1,7s, ninguém pega isso.
   *
   * É a mesma armadilha das variantes de arte (src/art.ts): animação e textura brigam pelo mesmo
   * campo, e quem toca por último ganha.
   */
  private trocarNave(id: string): void {
    const nave = SHIPS[id];
    if (!this.textures.exists(nave.texture)) return;

    const s = this.ship as Phaser.GameObjects.Sprite;
    s.anims?.stop();
    s.setTexture(nave.texture);
  }

  private escolher(id: string): void {
    if (this.done) return;

    this.naveId = id;
    this.panel?.destroy();
    this.panel = null;

    this.trocarNave(id);

    const nave = SHIPS[id];
    this.aviso(`${nave.name} · ARMADA`, COLORS.hotBright);
    this.cameras.main.flash(200, 62, 224, 240);

    this.time.delayedCall(1400, () => this.destruicao());
  }

  /**
   * A DOCA MORRE.
   *
   * A nave DECOLA ANTES do clarão final: quem sai voando de uma explosão é herói, quem sai depois
   * é sobrevivente — e o tempo entre as duas coisas é a única diferença entre as duas leituras.
   *
   * OS CABOS ARREBENTAM, e as rochas que eles seguravam saem à deriva. É o detalhe que fecha a
   * imagem: a doca existia para segurar aquilo, e sem ela o cinturão volta a ser cinturão.
   */
  private destruicao(): void {
    if (this.done) return;

    this.aviso('SOBRECARGA · A DOCA VAI CAIR', COLORS.enemyBright);
    Music.play(this, 'boss', 600);

    this.time.delayedCall(600, () => {
      if (this.done) return;

      // A nave sai para a DIREITA e para CIMA: é para lá que a Fase 3 corre.
      this.tweens.add({ targets: this.ship, x: GAME_WIDTH + 40, duration: 1700, ease: 'Sine.easeIn' });
      this.tweens.add({ targets: this.ship, y: 44, duration: 1700, ease: 'Cubic.easeOut' });
    });

    // A cadeia sobe pela estrutura, da pista para a rocha — agora com CORPO: a cadeia comum
    // racha a estrutura, e a cada 3 estouros um GRANDE (a sheet de 128px) arranca um bloco
    // inteiro. ⚠️ DEPTH NA FRENTE DA DOCA (73 > 70): os emissores do Fx vivem no depth 50, e
    // sem o parâmetro as explosões nasciam ATRÁS da estação que deviam estar destruindo — era
    // metade do motivo de o set-piece ler fraco.
    const N = 12;
    for (let i = 0; i < N; i++) {
      this.time.delayedCall(900 + i * 130, () => {
        if (this.done) return;

        const t = i / (N - 1);
        const x = Phaser.Math.Linear(GAME_WIDTH - 40, 60, t) + Phaser.Math.Between(-16, 16);
        const y =
          Phaser.Math.Linear(Interlude2Scene.PAD_Y, 90, t) + Phaser.Math.Between(-12, 12);
        if (i % 3 === 2) this.fx.explodeBig(x, y - 10, 0.9, Interlude2Scene.DEPTH_DOCA + 3);
        else this.fx.explode(x, y, 1.6, Interlude2Scene.DEPTH_DOCA + 3);
      });
    }

    // OS CABOS ARREBENTAM: as rochas se soltam e derivam para fora.
    this.time.delayedCall(2300, () => {
      if (this.done) return;

      this.amarras.forEach((a, i) => {
        this.fx.explode(a.ancoraX, a.ancoraY, 1.2, Interlude2Scene.DEPTH_DOCA + 3);

        this.tweens.add({
          targets: a.rocha,
          x: a.rocha.x + Phaser.Math.Between(-90, -30),
          y: a.rocha.y + Phaser.Math.Between(-40, 40),
          angle: a.rocha.angle + Phaser.Math.Between(-120, 120),
          duration: 2600,
          ease: 'Sine.easeOut',
          delay: i * 120,
        });
      });

      // Sem doca, não há amarra: os cabos param de ser desenhados.
      this.amarras = [];
      this.cabos.clear();
    });

    this.time.delayedCall(3000, () => {
      if (this.done) return;

      this.cameras.main.flash(800, 255, 170, 90);
      // O estouro FINAL, na barriga da estação: a detonação de 128px em escala grande — é ela
      // que apaga a doca, não mais um clarão genérico de partícula.
      this.fx.explodeBig(
        Interlude2Scene.DOCA_X + 40,
        Interlude2Scene.PAD_Y - 20,
        1.6,
        Interlude2Scene.DEPTH_DOCA + 3,
      );

      this.tweens.add({
        targets: [this.doca, this.padRim],
        y: '+=60',
        alpha: 0,
        duration: 1200,
        ease: 'Quad.easeIn',
      });

      // A cordilheira afunda ATRÁS dela, um instante depois: a doca arrasta o chão junto. Se a
      // rocha ficasse, a doca sumiria e deixaria a plataforma órfã — a ilha recortada de novo,
      // só que invertida.
      this.tweens.add({
        targets: this.plataforma,
        y: '+=60',
        alpha: 0,
        duration: 1200,
        ease: 'Quad.easeIn',
        delay: 150,
      });
    });

    this.time.delayedCall(4400, () => this.avancar());
  }

  private aviso(texto: string, cor: number): void {
    this.banner
      .setText(texto)
      .setColor(Phaser.Display.Color.IntegerToColor(cor).rgba)
      .setAlpha(1)
      .setScale(1);

    this.tweens.add({ targets: this.banner, alpha: 0, duration: 1600, delay: 700 });
  }

  /**
   * ⚠️ A FASE SEGUINTE PODE NÃO EXISTIR AINDA.
   *
   * A `GameScene` cai na Fase 1 quando recebe uma fase desconhecida (`STAGES[x] ?? STAGES[1]`) —
   * é uma rede de segurança boa para um link velho, e seria um DESASTRE silencioso aqui: o jogador
   * terminaria a Fase 2, veria a cutscene inteira, e cairia na Fase 1 sem nenhuma explicação.
   *
   * A Fase 3 EXISTE (2026-07-18): a doca entrega o jogador à SERPENTE. A guarda de STAGES
   * continua — se um dia a `proxima` apontar para uma fase que não existe (a 4, hoje), a
   * campanha termina na vitória em vez de despejar o jogador na Fase 1 pela rede de segurança.
   */
  private avancar(): void {
    if (this.done) return;
    this.done = true;

    if (!STAGES[this.proxima]) {
      this.scene.start('GameOver', {
        score: this.score,
        handling: this.handling,
        victory: true,
        // A fase COMPLETADA — sem ela a tela de vitória cai no título padrão ("FASE 1").
        stage: this.proxima - 1,
      });
      return;
    }

    this.scene.start('Game', {
      stage: this.proxima,
      handling: this.handling,
      score: this.score,
      ship: this.naveId,
    });
  }
}
