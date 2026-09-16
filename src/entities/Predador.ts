import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { EnemySystem } from '../systems/EnemySystem';
import type { Fx } from '../systems/Fx';
import { GROUND_Y, TETO_Y } from '../systems/TerrainSystem';
import { explosaoSangrenta, sangueNaTela } from './sangue';

/**
 * O PREDADOR — a 2ª forma do chefão final da Fase 4 (B3 da Fatia 7, design dele de 16/09).
 * Spec: `docs/superpowers/specs/2026-09-16-fatia7-b3-predador-design.md`.
 *
 * O guardião morre e o que estava dentro dele SAI: surge grande (0,7) de frente, urra, salta girando
 * para encarar a nave e encolhe para 0,47 no mesmo arco. A luta cobra MOBILIDADE e LEITURA, não a janela:
 *
 *   - o PEITO aceso é o alvo e está SEMPRE aberto; na RECUPERAÇÃO de cada ataque o dano DOBRA;
 *   - fase 1: no chão — investida+slash (o core CARREGA: pulsa devagar e acelera até o bote) e lava em arco;
 *   - fase 2: RONDA — salta entre âncoras de chão e teto, e SAI pela direita para reentrar noutro ponto;
 *   - fase 3: o BREU — a arena apaga; só o core dele revela o corpo, e a lava estoura em estilhaços.
 *
 * O `BossNucleo` continua sendo o `StageBoss` da cena: ele passa o SPRITE e o CORE que a cena já ligou
 * nas colisões (os overlaps são presos aos objetos, não à forma), e delega `update`/`damage` para cá.
 *
 * ─── GEOMETRIA MEDIDA (`scripts/_f4/_medir-predador.mjs`, quadros de 256²) ───
 *  Miolo aceso, offset ao centro do quadro: S +6,−5 · luta −23,−3 · teto −23,+2 (a luta ESPELHADA).
 *  Pés da pose de luta em y=252 (+124 do centro); no teto, espelhados, em y=4 (−124).
 */
export type EstadoPredador =
  | 'surgindo'
  | 'chao'
  | 'teto'
  | 'carga'
  | 'bote'
  | 'slash'
  | 'telegLava'
  | 'recupera'
  | 'salto'
  | 'fora'
  | 'aviso'
  | 'urroBreu'
  | 'morto';

type Pose = 'S' | 'luta' | 'teto';
type Ancora = { x: number; lado: 'chao' | 'teto' };

export class Predador {
  // ─── Knobs ───
  static readonly HP = 180;
  static readonly ESCALA_SURGE = 0.7;
  static readonly ESCALA_LUTA = 0.47;
  /** Onde a BORDA DESENHADA acaba (não a colisão, y=10/206, que fica dentro da faixa). */
  static readonly CHAO_APOIO = 190;
  static readonly TETO_APOIO = 30;
  static readonly MIOLO: Record<Pose, { x: number; y: number }> = {
    S: { x: 6, y: -5 },
    luta: { x: -23, y: -3 },
    teto: { x: -23, y: 2 },
  };
  static readonly ANCORAS: Ancora[] = [
    { x: 300, lado: 'chao' },
    { x: 238, lado: 'chao' },
    { x: 318, lado: 'teto' },
    { x: 252, lado: 'teto' },
  ];

  static readonly URRO_MS = 1200;
  /**
   * O PULO DO SURGIMENTO (rodada 2, 16/09: *"o pulo e a girada para WEST precisa ser ajustada para ficar mais
   * natural"*). O clipe agacha, impulsiona, torce e pousa; o motor SÓ SOBE entre o impulso e o pouso (frações
   * da duração) — antes disso o bicho está carregando o salto no chão, e sair do chão ali mentia.
   */
  static readonly SALTO_SURGE_MS = 1000;
  /**
   * Os quadros do clipe do PixMiniMax (17): 0–9 é o agachar quase parado (encurtado para 4), 10–15 a TORÇÃO no
   * ar, 16 o pouso já de três quartos. O impulso cai no quadro 10 (índice 4 de 11), o pouso no 16 (10 de 11).
   */
  static readonly PULO_QUADROS = [0, 4, 7, 9, 10, 11, 12, 13, 14, 15, 16];
  static readonly PULO_IMPULSO = 0.36;
  static readonly PULO_POUSO = 0.92;
  /** 56 levava o topo dele para trás da barra do HUD no meio da torção (captura r2). */
  static readonly PULO_ALTURA = 30;
  static readonly CARGA = [0, 1.5, 1.3, 1.6];
  static readonly CARGA_MIN = 0.9;
  static readonly BOTE_VEL = 330;
  /**
   * O SLASH EM TRÊS TEMPOS (rodada 2, 16/09: *"ele dá o dash, mas não vejo movimento da garra"*): o clipe é
   * partido no quadro `SLASH_PREP` (a garra no alto). A PREPARAÇÃO toca na carga e SEGURA no bote — ele avança
   * com a garra erguida —, e o GOLPE toca inteiro na chegada, com o rastro do corte desenhado no motor.
   */
  static readonly SLASH_PREP = 8;
  static readonly SLASH_PREP_MS = 700;
  static readonly SLASH_MS = 480;
  /** O clipe do PixMiniMax já traz o arco vermelho do corte (quadros 9–11): o rastro do motor dobraria. */
  static readonly RASTRO_MOTOR = false;
  static readonly RECUP_SLASH = 1.0;
  static readonly TELEG_LAVA = 0.5;
  /** Pendurado, o arremesso sai no quadro ~12 de 16 do clipe do teto (1000ms). */
  static readonly TELEG_LAVA_TETO = 0.72;
  static readonly RECUP_LAVA = 0.6;
  static readonly DANO_RECUP = 2;
  static readonly LAVA_G = 260;
  static readonly LAVA_VOO = 1.1;
  static readonly ESTILHACOS = 6;
  static readonly SALTO_MS = 600;
  static readonly FORA_MIN = 1.0;
  static readonly FORA_MAX = 2.0;
  static readonly AVISO = 0.5;
  static readonly PAUSA: [number, number][] = [[0, 0], [1.2, 2.0], [0.9, 1.6], [1.0, 1.7]];
  /** 0,96 deixava a pintura e a borda aparecendo (16/09: *"a fase pode escurecer mais"*). */
  static readonly BREU_ALPHA = 1;
  static readonly BREU_ENTRA_MS = 600;
  static readonly PULSO_BREU = 2.4;
  static readonly MORTE_MS = 1100;

  hp = Predador.HP;
  estado: EstadoPredador = 'surgindo';
  recuperando = false;
  breu = false;
  armaTravada = true;
  dead = false;

  private pose: Pose = 'S';
  private t = 0;
  private estadoT = 0;
  private ancora: Ancora = Predador.ANCORAS[0];
  private alvoX = 0;
  private alvoY = 0;
  private ultimos: ('slash' | 'lava')[] = [];
  private fasePassada = 1;
  private pulsoFase = 0;
  /** 0..1 — o brilho do core agora (a captura espera o pico e o vale). */
  pulso = 0;
  private lavas: { b: Phaser.Physics.Arcade.Sprite; luz: Phaser.GameObjects.Image; bola: boolean }[] = [];
  private brasas!: Phaser.GameObjects.Particles.ParticleEmitter;
  private tween: Phaser.Tweens.Tween | null = null;

  private readonly luz: Phaser.GameObjects.Image;
  private breuCamada: Phaser.GameObjects.Rectangle | null = null;
  private halo: Phaser.GameObjects.Image | null = null;
  private revela: Phaser.GameObjects.Image | null = null;
  private nave: Phaser.Physics.Arcade.Sprite | null = null;
  private naveDepth = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: EnemySystem,
    private readonly fx: Fx,
    private readonly sprite: Phaser.Physics.Arcade.Sprite,
    private readonly core: Phaser.Physics.Arcade.Sprite,
    private readonly aoMudarVida: () => void,
  ) {
    this.criarAnims();
    this.criarLava();
    if (!scene.textures.exists('luzRadial')) {
      // Uma luz redonda de verdade: degradê radial que chega a ZERO antes da borda do quadro. ⚠️ A 1ª versão
      // (anéis de alpha somados) tinha alpha > 0 na borda — em ADD e ampliada, lia como RETÂNGULO (16/09).
      const tex = scene.textures.createCanvas('luzRadial', 64, 64);
      if (tex) {
        const ctx = tex.getContext();
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
        grad.addColorStop(0.6, 'rgba(255,255,255,0.15)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        tex.refresh();
      }
    }

    // A LUZ DO CORE: existe sempre (às claras é o brilho do peito; na carga é o telégrafo; no breu é
    // a única coisa que mostra onde ele está).
    this.luz = scene.add.image(0, 0, 'luzRadial').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff7a2a).setDepth(7);

    // O surgimento: grande, de frente, sem corpo — a pausa dramática não mata ninguém.
    this.sprite.anims.stop();
    this.sprite.clearTint();
    this.sprite.setAlpha(1).setVisible(true);
    this.setPose('S', 'predadorS');
    this.sprite.setScale(Predador.ESCALA_SURGE);
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.coreBody.enable = false;
    this.coreBody.setSize(26, 24);

    this.surgir();
  }

  // ─── Estrutura ───────────────────────────────────────────────────────────────

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  private get coreBody(): Phaser.Physics.Arcade.Body {
    return this.core.body as Phaser.Physics.Arcade.Body;
  }

  get fase(): number {
    const f = this.hp / Predador.HP;
    return f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
  }

  private criarAnims(): void {
    const anims = this.scene.anims;
    const clipe = (key: string, sheet: string, ms: number, repeat = 0, yoyo = false, escolha?: number[]) => {
      if (!this.scene.textures.exists(sheet) || anims.exists(key)) return;
      const total = this.scene.textures.get(sheet).frameTotal - 1; // o `__BASE` conta
      const lista = escolha?.filter((q) => q < total);
      const n = lista?.length ?? total;
      anims.create({
        key,
        frames: lista ? anims.generateFrameNumbers(sheet, { frames: lista }) : anims.generateFrameNumbers(sheet, { start: 0, end: total - 1 }),
        frameRate: (n * 1000) / ms,
        repeat,
        yoyo,
      });
    };
    clipe('predador-urro', 'predadorUrroSheet', Predador.URRO_MS);
    clipe('predador-pulo', 'predadorPuloSheet', Predador.SALTO_SURGE_MS, 0, false, Predador.PULO_QUADROS);
    clipe('predador-giro', 'predadorGiroSheet', Predador.SALTO_SURGE_MS);
    clipe('predador-idle', 'predadorIdleSheet', 1500, -1, true);
    clipe('predador-lava', 'predadorLavaSheet', 1000);
    clipe('predador-teto-lava', 'predadorTetoLavaSheet', 1000);
    clipe('predador-morte', 'predadorMorteSheet', Predador.MORTE_MS);

    // O slash partido em dois clipes da MESMA folha.
    const sheet = 'predadorSlashSheet';
    if (this.scene.textures.exists(sheet) && !anims.exists('predador-slash-prep')) {
      const n = this.scene.textures.get(sheet).frameTotal - 1;
      const p = Math.min(Predador.SLASH_PREP, n - 2);
      anims.create({
        key: 'predador-slash-prep',
        frames: anims.generateFrameNumbers(sheet, { start: 0, end: p }),
        frameRate: ((p + 1) * 1000) / Predador.SLASH_PREP_MS,
        repeat: 0,
      });
      anims.create({
        key: 'predador-slash-golpe',
        frames: anims.generateFrameNumbers(sheet, { start: p, end: n - 1 }),
        frameRate: ((n - p) * 1000) / Predador.SLASH_MS,
        repeat: 0,
      });
    }
  }

  /** Troca de pose: a textura estática (fallback) E o offset do miolo andam juntos. */
  private setPose(pose: Pose, estatico?: string): void {
    this.pose = pose;
    if (estatico && this.scene.textures.exists(estatico)) {
      this.sprite.anims.stop();
      this.sprite.setTexture(estatico);
    }
  }

  private tocar(key: string, pose: Pose, estatico: string): void {
    this.pose = pose;
    if (this.scene.anims.exists(key)) this.sprite.play(key, true);
    else this.setPose(pose, estatico);
  }

  private idle(): void {
    if (this.ancora.lado === 'teto') {
      this.setPose('teto', 'predadorTeto');
    } else if (this.scene.anims.exists('predador-idle')) {
      this.tocar('predador-idle', 'luta', 'predadorLuta');
    } else {
      this.setPose('luta', 'predadorLuta');
    }
  }

  private yApoio(lado: 'chao' | 'teto'): number {
    const e = Predador.ESCALA_LUTA;
    return lado === 'chao' ? Predador.CHAO_APOIO - 124 * e : Predador.TETO_APOIO + 124 * e;
  }

  /** Corpo = a CASCA dos ombros (absorve a bala, fere por contato) — o pacto do domo do guardião. */
  private corpoCasca(): void {
    this.body.enable = true;
    if (this.pose === 'teto') {
      // A casca da luta (115,20 · 90×80) espelhada na vertical.
      this.body.setSize(90, 80);
      this.body.setOffset(115, 156);
    } else {
      this.body.setSize(90, 80);
      this.body.setOffset(115, 20);
    }
  }

  /** Corpo INTEIRO: bote, slash e salto são todo perigo. */
  private corpoInteiro(): void {
    this.body.enable = true;
    this.body.setSize(170, 220);
    this.body.setOffset(40, 28);
  }

  private posicionarCore(): void {
    const e = this.sprite.scaleX;
    const m = Predador.MIOLO[this.pose];
    const x = this.sprite.x + m.x * e;
    const y = this.sprite.y + m.y * e;
    this.core.setPosition(x, y);
    this.coreBody.reset(x, y);
    this.luz.setPosition(x, y);
  }

  private mudar(estado: EstadoPredador, dur = 0): void {
    this.estado = estado;
    this.estadoT = dur;
  }

  // ─── O surgimento ────────────────────────────────────────────────────────────

  private surgir(): void {
    this.posicionarCore();
    this.luz.setAlpha(0.9).setScale(1.4);
    this.tocar('predador-urro', 'S', 'predadorS');
    // O tranco no PICO do urro (a mandíbula aberta, as garras no alto).
    this.scene.time.delayedCall(Predador.URRO_MS * 0.45, () => {
      if (this.dead) return;
      this.scene.cameras.main.shake(380, 0.01);
    });

    this.scene.time.delayedCall(Predador.URRO_MS, () => {
      if (this.dead) return;
      if (this.scene.anims.exists('predador-pulo')) this.tocar('predador-pulo', 'S', 'predadorLuta');
      else this.tocar('predador-giro', 'S', 'predadorLuta');
      const x0 = this.sprite.x;
      const y0 = this.sprite.y;
      this.ancora = Predador.ANCORAS[0];
      const x1 = this.ancora.x;
      const y1 = this.yApoio('chao');
      const e0 = Predador.ESCALA_SURGE;
      const e1 = Predador.ESCALA_LUTA;
      let impulsionou = false;
      let pousou = false;
      this.tween = this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: Predador.SALTO_SURGE_MS,
        onUpdate: (tw) => {
          const k = tw.getValue() ?? 0;
          // O voo só existe entre o impulso e o pouso; fora dele o clipe agacha/amortece no chão.
          const v = Phaser.Math.Clamp((k - Predador.PULO_IMPULSO) / (Predador.PULO_POUSO - Predador.PULO_IMPULSO), 0, 1);
          if (v >= 1 && !pousou) {
            pousou = true;
            this.scene.cameras.main.shake(160, 0.008);
          }
          if (v > 0 && !impulsionou) {
            impulsionou = true;
            this.scene.cameras.main.shake(90, 0.004);
          }
          const suave = Phaser.Math.Easing.Sine.InOut(v);
          this.pose = k < 0.55 ? 'S' : 'luta';
          this.sprite.setScale(Phaser.Math.Linear(e0, e1, suave));
          this.sprite.setPosition(Phaser.Math.Linear(x0, x1, suave), Phaser.Math.Linear(y0, y1, suave) - Math.sin(Math.PI * v) * Predador.PULO_ALTURA);
        },
        onComplete: () => {
          if (this.dead) return;
          this.tween = null;
          this.sprite.setScale(e1);
          this.sprite.setPosition(x1, y1);
          this.body.reset(x1, y1);
          this.idle();
          this.corpoCasca();
          this.coreBody.enable = true;
          this.armaTravada = false;
          this.mudar('chao', this.pausa());
        },
      });
    });
  }

  // ─── A luta ──────────────────────────────────────────────────────────────────

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    this.nave = target;
    this.t += dt;
    this.estadoT -= dt;
    this.atualizarLavas(dt);
    this.atualizarLuz(dt);
    this.atualizarBreu(target);

    if (this.dead) return;

    // A virada para o breu é um BEAT: só entra quando ele está pousado (nunca no meio de um bote).
    const f = this.fase;
    if (f === 3 && this.fasePassada < 3 && (this.estado === 'chao' || this.estado === 'teto')) {
      this.fasePassada = 3;
      this.entrarNoBreu();
    } else if (f > this.fasePassada && f < 3) {
      this.fasePassada = f;
    }

    switch (this.estado) {
      case 'surgindo':
      case 'salto':
      case 'urroBreu':
        break;

      case 'chao':
      case 'teto':
        if (this.estadoT <= 0) this.escolherAtaque();
        break;

      case 'carga':
        if (this.estadoT <= 0) {
          // A mirada é do FIM da carga — quem sai da linha no último pulso escapa.
          this.alvoX = target.x;
          this.alvoY = target.y;
          this.bote();
        }
        break;

      case 'bote': {
        const chegou = this.sprite.x <= Math.max(56, this.alvoX + 44) || this.estadoT <= 0;
        if (chegou) {
          this.body.setVelocity(0, 0);
          this.golpear();
        }
        break;
      }

      case 'slash':
        if (this.estadoT <= 0) {
          this.recuperando = true;
          this.corpoCasca();
          this.mudar('recupera', Predador.RECUP_SLASH);
        }
        break;

      case 'telegLava':
        if (this.estadoT <= 0) {
          this.arremessar(target);
          this.recuperando = true;
          this.mudar('recupera', Predador.RECUP_LAVA);
        }
        break;

      case 'recupera':
        if (this.estadoT <= 0) {
          this.recuperando = false;
          this.depoisDoAtaque();
        }
        break;

      case 'fora':
        if (this.estadoT <= 0) {
          this.ancora = this.sortearAncora();
          // O aviso: o core acende no ponto de entrada antes de ele aparecer.
          const y = this.yApoio(this.ancora.lado);
          const m = Predador.MIOLO[this.ancora.lado === 'teto' ? 'teto' : 'luta'];
          this.luz.setPosition(this.ancora.x + m.x * Predador.ESCALA_LUTA, y + m.y * Predador.ESCALA_LUTA);
          this.mudar('aviso', Predador.AVISO);
        }
        break;

      case 'aviso':
        if (this.estadoT <= 0) {
          this.sprite.setVisible(true);
          this.coreBody.enable = true;
          this.sprite.setPosition(GAME_WIDTH + 90, this.yApoio(this.ancora.lado));
          this.saltarPara(this.ancora);
        }
        break;
    }

    if (this.estado !== 'fora' && this.estado !== 'aviso') this.posicionarCore();
  }

  private pausa(): number {
    const [a, b] = Predador.PAUSA[this.fase];
    return Phaser.Math.FloatBetween(a, b);
  }

  private escolherAtaque(): void {
    // Pendurado, a garra livre só arremessa — o bote sai do CHÃO.
    if (this.ancora.lado === 'teto') {
      this.telegrafarLava();
      return;
    }
    const repetiu = this.ultimos.length >= 2 && this.ultimos[0] === this.ultimos[1] ? this.ultimos[0] : null;
    let golpe: 'slash' | 'lava' = Math.random() < 0.5 ? 'slash' : 'lava';
    if (golpe === repetiu) golpe = golpe === 'slash' ? 'lava' : 'slash';
    this.ultimos.unshift(golpe);
    this.ultimos.length = Math.min(this.ultimos.length, 2);
    if (golpe === 'slash') this.carregar();
    else this.telegrafarLava();
  }

  private carregar(): void {
    const dur = Math.max(Predador.CARGA_MIN, Predador.CARGA[this.fase]);
    this.pulsoFase = 0;
    // A garra sobe na carga e FICA no alto (o clipe de preparação segura o último quadro).
    if (this.scene.anims.exists('predador-slash-prep')) this.tocar('predador-slash-prep', 'luta', 'predadorLuta');
    this.mudar('carga', dur);
  }

  private bote(): void {
    this.corpoInteiro();
    const dx = Math.max(56, this.alvoX + 44) - this.sprite.x;
    const t = Math.max(0.12, Math.abs(dx) / Predador.BOTE_VEL);
    const alvoCentroY = Phaser.Math.Clamp(this.alvoY - Predador.MIOLO.luta.y * Predador.ESCALA_LUTA, 70, this.yApoio('chao'));
    this.body.setVelocity(dx / t, (alvoCentroY - this.sprite.y) / t);
    this.mudar('bote', t + 0.1);
  }

  /** O GOLPE: a garra desce em arco (o clipe) e o CORTE rasga o ar na frente dele (o motor). */
  private golpear(): void {
    this.mudar('slash', Predador.SLASH_MS / 1000);
    if (this.scene.anims.exists('predador-slash-golpe')) this.tocar('predador-slash-golpe', 'luta', 'predadorLuta');
    this.scene.time.delayedCall(Predador.SLASH_MS * 0.35, () => {
      if (this.dead) return;
      if (Predador.RASTRO_MOTOR) this.rastroDoCorte();
      this.scene.cameras.main.shake(110, 0.007);
    });
  }

  /** Um crescente de 3 riscos, do alto-frente para baixo-frente, que acende e se apaga em ~220ms. */
  private rastroDoCorte(): void {
    const e = this.sprite.scaleX;
    const cx = this.sprite.x - 58 * e;
    const cy = this.sprite.y - 6 * e;
    const g = this.scene.add.graphics().setDepth(42).setBlendMode(Phaser.BlendModes.ADD);
    const riscos: [number, number, number][] = [
      [74, 4, 0xfff2e0],
      [66, 3, 0xff9a70],
      [58, 2, 0xc0302a],
    ];
    for (const [raio, esp, cor] of riscos) {
      g.lineStyle(esp * e * 2.2, cor, 1);
      g.beginPath();
      g.arc(cx + 30 * e, cy, raio * e, Phaser.Math.DegToRad(215), Phaser.Math.DegToRad(145), true);
      g.strokePath();
    }
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 220,
      ease: 'Quad.easeIn',
      onComplete: () => g.destroy(),
    });
  }

  private telegrafarLava(): void {
    if (this.ancora.lado === 'teto') this.tocar('predador-teto-lava', 'teto', 'predadorTeto');
    else this.tocar('predador-lava', 'luta', 'predadorLuta');
    this.mudar('telegLava', this.ancora.lado === 'teto' ? Predador.TELEG_LAVA_TETO : Predador.TELEG_LAVA);
  }

  /** Bolas de lava em arco: tempo de voo fixo, velocidade resolvida para cair onde a nave está. */
  private arremessar(target: Phaser.Physics.Arcade.Sprite): void {
    const n = this.fase === 1 ? Phaser.Math.Between(1, 2) : Phaser.Math.Between(2, 3);
    const e = this.sprite.scaleX;
    const bocaX = this.sprite.x - 70 * e;
    const bocaY = this.ancora.lado === 'teto' ? this.sprite.y + 60 * e : this.sprite.y - 40 * e;
    for (let i = 0; i < n; i++) {
      const T = Predador.LAVA_VOO * (0.85 + i * 0.18);
      const ax = target.x + (i - (n - 1) / 2) * 26;
      const ay = target.y;
      const vx = (ax - bocaX) / T;
      const vy = (ay - bocaY - 0.5 * Predador.LAVA_G * T * T) / T;
      this.lancarLava(bocaX, bocaY, vx, vy, true);
    }
    this.brasas.explode(10, bocaX, bocaY);
    this.scene.cameras.main.shake(70, 0.004);
  }

  /**
   * UMA GOTA DE LAVA — com cor de LAVA (pedido dele, 16/09: *"a lava tem que ter cor de lava"*) e que BRILHA
   * no breu (*"lava é fogo, então brilha no escuro"*): a bola (núcleo branco-amarelo → laranja → vermelho),
   * uma luz ADD que tremula por cima dela e um rastro de brasas. Tudo acima da camada do breu.
   */
  private lancarLava(x: number, y: number, vx: number, vy: number, bola: boolean): void {
    const b = this.enemies.enemyBullets.get(x, y) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    b.setTexture(bola ? 'lavaBola' : 'lavaGota');
    b.clearTint();
    b.setScale(1);
    b.setFlipX(false);
    b.setDepth(41);
    b.setData('ox', x);
    b.setData('oy', y);
    b.setData('lava', true);
    b.setVelocity(vx, vy);
    b.setRotation(Math.atan2(vy, vx));
    const luz = this.scene.add
      .image(x, y, 'luzRadial')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xff6a18)
      .setScale(bola ? 0.62 : 0.34)
      .setDepth(40);
    this.lavas.push({ b, luz, bola });
  }

  /** A gravidade da lava é DAQUI, não do pool (o `enemyBullets` é compartilhado com a fase inteira). */
  private atualizarLavas(dt: number): void {
    this.lavas = this.lavas.filter((l) => {
      if (l.b.active && l.b.getData('lava') === true) return true;
      l.luz.destroy();
      return false;
    });
    for (const l of this.lavas) {
      const { b, luz, bola } = l;
      const body = b.body as Phaser.Physics.Arcade.Body;
      if (bola) body.velocity.y += Predador.LAVA_G * dt;
      b.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
      luz.setPosition(b.x, b.y).setAlpha(0.65 + Math.random() * 0.35);
      if (Math.random() < (bola ? 0.8 : 0.35)) this.brasas.emitParticleAt(b.x, b.y);

      const bateuChao = b.y >= GROUND_Y - 4 && body.velocity.y > 0;
      const bateuTeto = b.y <= TETO_Y + 4 && body.velocity.y < 0;
      if (!bateuChao && !bateuTeto) continue;
      const x = b.x;
      const y = b.y;
      b.setData('lava', false);
      this.enemies.release(b);
      this.brasas.explode(bola ? 14 : 4, x, y);
      if (bola && this.fase === 3) this.estilhacar(x, y, bateuChao ? -1 : 1);
    }
  }

  private estilhacar(x: number, y: number, sentido: number): void {
    for (let i = 0; i < Predador.ESTILHACOS; i++) {
      // Um leque aberto para LONGE da borda (para cima se bateu no chão, para baixo se no teto).
      const k = i / (Predador.ESTILHACOS - 1);
      const ang = Phaser.Math.DegToRad(sentido < 0 ? -170 + k * 160 : 10 + k * 160);
      const v = Phaser.Math.Between(180, 220);
      this.lancarLava(x, y - sentido * 6, Math.cos(ang) * v, Math.sin(ang) * v, false);
    }
  }

  /** As texturas da lava e as brasas — desenhadas no motor, zero geração. */
  private criarLava(): void {
    const bola = (key: string, lado: number) => {
      if (this.scene.textures.exists(key)) return;
      const tex = this.scene.textures.createCanvas(key, lado, lado);
      if (!tex) return;
      const ctx = tex.getContext();
      const r = lado / 2;
      const g = ctx.createRadialGradient(r - 1, r - 1, 0, r, r, r);
      g.addColorStop(0, '#fff8d0');
      g.addColorStop(0.28, '#ffd23a');
      g.addColorStop(0.58, '#ff7a10');
      g.addColorStop(0.85, '#c01e08');
      g.addColorStop(1, 'rgba(90,8,2,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
      tex.refresh();
    };
    bola('lavaBola', 14);
    bola('lavaGota', 8);
    this.brasas = this.scene.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 240, max: 480 },
        speed: { min: 6, max: 34 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xfff0a0, 0xffb030, 0xff6a10, 0xd02a08],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(40);
  }

  private depoisDoAtaque(): void {
    const noLugar = Math.abs(this.sprite.x - this.ancora.x) < 6 && Math.abs(this.sprite.y - this.yApoio(this.ancora.lado)) < 6;
    if (this.fase >= 2) {
      const r = Math.random();
      if (r < 0.25) {
        this.sair();
        return;
      }
      if (r < 0.75 || !noLugar) {
        this.saltarPara(this.sortearAncora());
        return;
      }
    } else if (!noLugar) {
      this.saltarPara(Predador.ANCORAS[Math.random() < 0.5 ? 0 : 1]);
      return;
    }
    this.idle();
    this.corpoCasca();
    this.mudar(this.ancora.lado, this.pausa());
  }

  private sortearAncora(): Ancora {
    const opcoes = Predador.ANCORAS.filter((a) => a !== this.ancora && (this.fase >= 2 || a.lado === 'chao'));
    return Phaser.Utils.Array.GetRandom(opcoes);
  }

  /** O salto entre âncoras — arco, corpo inteiro (o salto é o próprio telégrafo). */
  private saltarPara(ancora: Ancora, aoPousar?: () => void): void {
    this.ancora = ancora;
    this.body.setVelocity(0, 0);
    this.setPose('luta', 'predadorLuta');
    this.corpoInteiro();
    this.mudar('salto');
    const x0 = this.sprite.x;
    const y0 = this.sprite.y;
    const x1 = ancora.x;
    const y1 = this.yApoio(ancora.lado);
    // Chão→chão pula PARA CIMA; qualquer troca de lado já é um arco pela própria distância.
    const altura = Math.abs(y1 - y0) < 20 ? 46 : 18;
    this.tween?.stop();
    this.tween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: Predador.SALTO_MS,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const k = tw.getValue() ?? 0;
        this.sprite.setPosition(Phaser.Math.Linear(x0, x1, k), Phaser.Math.Linear(y0, y1, k) - Math.sin(Math.PI * k) * altura);
        this.body.reset(this.sprite.x, this.sprite.y);
      },
      onComplete: () => {
        this.tween = null;
        if (this.dead) return;
        this.sprite.setPosition(x1, y1);
        this.body.reset(x1, y1);
        this.scene.cameras.main.shake(90, 0.004);
        if (aoPousar) {
          aoPousar();
          return;
        }
        this.idle();
        this.corpoCasca();
        this.mudar(ancora.lado, this.pausa());
      },
    });
  }

  /** A SAÍDA pela direita: não é âncora (não há parede ali — medido no mock de 16/09), é sumir. */
  private sair(): void {
    const fora: Ancora = { x: GAME_WIDTH + 90, lado: this.ancora.lado };
    this.saltarPara(fora, () => {
      this.sprite.setVisible(false);
      this.body.enable = false;
      this.coreBody.enable = false;
      this.mudar('fora', Phaser.Math.FloatBetween(Predador.FORA_MIN, Predador.FORA_MAX));
    });
    // `saltarPara` grava a âncora; a de fora não é real, a próxima sai do sorteio.
  }

  // ─── A luz do core e o breu ──────────────────────────────────────────────────

  private atualizarLuz(dt: number): void {
    let periodo = this.breu ? Predador.PULSO_BREU : 1.6;
    let base = this.breu ? 0 : 0.35;
    let forte = this.breu ? 1 : 0.35;

    if (this.estado === 'carga') {
      // A CARGA (a ideia dele): o pulso começa lento e ACELERA até o bote.
      const dur = Math.max(Predador.CARGA_MIN, Predador.CARGA[this.fase]);
      const k = Phaser.Math.Clamp(1 - this.estadoT / dur, 0, 1);
      periodo = Phaser.Math.Linear(0.55, 0.08, k * k);
      base = this.breu ? 0.1 : 0.3;
      forte = 1;
    } else if (this.estado === 'aviso') {
      // O aviso da reentrada precisa GRITAR: ele vem de fora da tela, e o jogador não o via.
      periodo = 0.2;
      base = 0.7;
      forte = 1;
    } else if (this.recuperando) {
      // O convite: exposto, o peito brilha mais.
      base = this.breu ? 0.35 : 0.6;
      forte = 1;
    }

    this.pulsoFase = (this.pulsoFase + (dt * Math.PI * 2) / periodo) % (Math.PI * 2);
    this.pulso = Math.pow(Math.max(0, Math.sin(this.pulsoFase)), 3);
    const alpha = base + (forte - base) * this.pulso;
    const visivel = this.estado !== 'fora' && this.estado !== 'morto';
    this.luz.setVisible(visivel || this.estado === 'aviso');
    this.luz.setAlpha(alpha);
    this.luz.setScale((this.estado === 'aviso' ? 1.6 : this.breu ? 1.1 : 0.9) + 0.35 * this.pulso);
  }

  private entrarNoBreu(): void {
    this.mudar('urroBreu');
    this.body.setVelocity(0, 0);
    this.scene.cameras.main.shake(420, 0.008);
    this.breu = true;

    this.breuCamada = this.scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(5)
      .setAlpha(0);
    this.scene.tweens.add({ targets: this.breuCamada, alpha: Predador.BREU_ALPHA, duration: Predador.BREU_ENTRA_MS });

    // O halo da nave: JUSTO, só ela — não ilumina nada em volta.
    this.halo = this.scene.add.image(0, 0, 'luzRadial').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9ec4ff).setScale(0.5).setAlpha(0.42).setDepth(5.5);

    // O CORPO REVELADO pela luz do core: uma cópia escura e avermelhada, alpha preso ao pulso.
    this.revela = this.scene.add.image(0, 0, this.sprite.texture.key).setDepth(6.5).setTint(0x7a1c12).setAlpha(0);

    this.scene.time.delayedCall(900, () => {
      if (this.dead) return;
      this.idle();
      this.corpoCasca();
      this.mudar(this.ancora.lado, this.pausa());
    });
  }

  private atualizarBreu(target: Phaser.Physics.Arcade.Sprite): void {
    if (!this.breu) return;
    if (this.nave !== target || !this.halo) return;
    if (target.depth < 6) {
      this.naveDepth = target.depth;
      target.setDepth(6);
    }
    this.halo?.setPosition(target.x, target.y);
    if (this.revela) {
      const vis = this.sprite.visible;
      this.revela
        .setTexture(this.sprite.texture.key, this.sprite.frame.name)
        .setPosition(this.sprite.x, this.sprite.y)
        .setScale(this.sprite.scaleX)
        .setFlip(this.sprite.flipX, this.sprite.flipY)
        .setVisible(vis)
        .setAlpha((this.breuCamada?.alpha ?? 0) * 0.62 * this.pulso);
    }
  }

  private sairDoBreu(ms: number): void {
    if (this.breuCamada) {
      const camada = this.breuCamada;
      this.scene.tweens.add({ targets: camada, alpha: 0, duration: ms, onComplete: () => camada.destroy() });
      this.breuCamada = null;
    }
    this.halo?.destroy();
    this.halo = null;
    this.revela?.destroy();
    this.revela = null;
    if (this.nave) this.nave.setDepth(this.naveDepth);
    this.breu = false;
  }

  // ─── Dano, morte ─────────────────────────────────────────────────────────────

  damage(amount: number): boolean {
    if (this.dead || this.estado === 'surgindo' || this.estado === 'fora' || this.estado === 'aviso') return false;
    const dano = amount * (this.recuperando ? Predador.DANO_RECUP : 1);
    this.hp = Math.max(0, this.hp - dano);
    this.aoMudarVida();

    this.sprite.setTint(this.recuperando ? 0xffe0a0 : 0xffb090);
    this.scene.time.delayedCall(60, () => !this.dead && this.sprite.clearTint());

    if (this.hp > 0) return false;

    this.dead = true;
    this.mudar('morto');
    this.tween?.stop();
    this.body.setVelocity(0, 0);
    this.recuperando = false;
    this.coreBody.enable = false;
    this.tocar('predador-morte', 'luta', 'predadorLuta');
    this.luz.setAlpha(1).setScale(1.8);
    this.scene.tweens.add({ targets: this.luz, alpha: 0, duration: Predador.MORTE_MS });
    // A MORTE COMPOSTA (rodada 2, 16/09: *"a animação da morte não é nada, é quase um idle"*): o clipe + o
    // sangue do mesmo organismo que estourou na troca + estouros pelo corpo enquanto ele cai.
    const e = this.sprite.scaleX;
    explosaoSangrenta(this.scene, this.core.x, this.core.y, 0.7);
    sangueNaTela(this.scene, 5);
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(120 + i * 170, () => {
        this.fx.explode(
          this.sprite.x + Phaser.Math.Between(-70, 70) * e,
          this.sprite.y + Phaser.Math.Between(-90, 90) * e,
          1.1,
          52,
        );
      });
    }
    this.sairDoBreu(800);
    return true;
  }

  destroy(): void {
    this.tween?.stop();
    this.sairDoBreu(0);
    for (const l of this.lavas) {
      if (l.b.active) this.enemies.release(l.b);
      l.luz.destroy();
    }
    this.lavas = [];
    this.brasas.destroy();
    this.luz.destroy();
  }
}
