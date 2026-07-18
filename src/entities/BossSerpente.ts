import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import type { EnemySystem } from '../systems/EnemySystem';
import type { StageBoss } from './Boss';

/**
 * Uma FASE da luta: qual arte veste o corpo, qual cabeça está viva para ser ferida, e onde
 * ela fica DENTRO da arte (offset do centro, em px de ARTE — multiplicado pela escala de
 * exibição na hora de posicionar a hitbox).
 */
interface FaseSerpente {
  arte: string;
  anim: string;
  hp: number;
  /** Offset da cabeça VULNERÁVEL, do centro da arte. MEDIDO por cor (scripts/find-cabecas.mjs). */
  cabeca: { x: number; y: number };
  /** Onde os COTOS fumegam nesta fase (as cabeças que já morreram). */
  cotos: { x: number; y: number }[];
  escala: number;
}

/**
 * SERPENTE DO CASCO — chefão da Fase 3. A luta é por ANATOMIA (design do Henrique).
 *
 * Cada fase tem UMA cabeça vulnerável; as outras (e o corpo) ABSORVEM tiro sem dano —
 * invulnerável é telégrafo, não parede (auditoria). Matar a cabeça TROCA A ARTE: o dano vira
 * anatomia visível, que é a gramática Metal Slug que o Henrique pediu (o Iron Nokana queima e
 * se despedaça; a serpente perde cabeças e fumega pelos cotos).
 *
 *   A  3 cabeças   vulnerável: LARANJA   ela pergunta "saia da linha" (rajada mirada)
 *   B  2 cabeças   vulnerável: CIANO     ela pergunta "onde você vai estar" (INVESTIDA)
 *   C  1 cabeça    vulnerável: VERDE     ela pergunta "leia o metrônomo" (leque acelerando)
 *   F  FUSÃO       a cabeça única        as três perguntas em ciclo, com silêncio curto
 *
 * A FUSÃO é o beat do Henrique ao pé da letra: "depois da terceira, surge um boss maior com
 * uma cabeça só, que é a junção das 3". Ela entra numa CONVULSÃO com explosões em cadeia
 * percorrendo o corpo — o corpo colapsa nas três cabeças e renasce maior.
 *
 * Os três padrões são os VERBOS das três fases do jogo (rajada mirada = canhoneira/Capitânia;
 * investida = kamikaze; leque em metrônomo = a Torre): a serpente não ensina nada novo, ela
 * COBRA a campanha inteira — a mesma regra da Capitânia.
 */
export class BossSerpente implements StageBoss {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  /** A hitbox VIVA (a cabeça vulnerável da fase). É o contrato multi-parte do StageBoss. */
  readonly targets: Phaser.Physics.Arcade.Sprite[] = [];

  private hpFase: number;
  private hpTotal: number;
  private readonly maxHpTotal: number;
  private faseIdx = 0;
  private t = 0;
  private entering = true;
  private dead = false;
  /** Segundos de imunidade durante uma TRANSIÇÃO (a cadeia de explosões não é janela de dps). */
  private imune = 0;

  private readonly cabeca: Phaser.Physics.Arcade.Sprite;

  // ─── Relógios dos padrões ───
  private cdPrincipal = 2.5;
  private cdSecundario = 3.2;
  /** Máquina de estados da INVESTIDA: parada → telegrafando → investindo → voltando. */
  private investida: 'nao' | 'telegrafo' | 'indo' | 'voltando' = 'nao';
  private investidaT = 0;
  /** Passo do ciclo da FÚRIA (leque → rajada → investida → silêncio). */
  private furiaPasso = 0;

  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly bar: Phaser.GameObjects.Rectangle;
  /** UM de cada, criados aqui e reaproveitados a luta inteira (armadilha nº 5). */
  private readonly muzzleFx: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly smokeFx: Phaser.GameObjects.Particles.ParticleEmitter;
  private smokeCd = 0;

  private static readonly STATION_X = GAME_WIDTH - 88;
  private static readonly BASE_Y = 106;
  private static readonly ONDULACAO = 22;

  /**
   * AS FASES. Offsets MEDIDOS por cor no PNG instalado (scripts/find-cabecas.mjs — lição 13:
   * offset de arte se mede, não se chuta):
   *   serpente.png       laranja (62.7,-65.9) · ciano (-63.1,-43.3) · verde (-11.4,-55.5)
   *   serpente-2c.png    ciano  (-62.8,-43.5)
   *   serpente-1c.png    verde  (-10.9,-47.5)
   *   serpente-fusao.png crânio (-30.8,-68.0)
   * Os COTOS fumegam onde a cabeça morta ESTAVA — o mesmo offset, que virou cicatriz.
   */
  private static readonly FASES: FaseSerpente[] = [
    { arte: 'serpente', anim: 'serpente-idle', hp: 50, cabeca: { x: 62.7, y: -65.9 }, cotos: [], escala: 0.55 },
    { arte: 'serpente2c', anim: 'serpente-2c-idle', hp: 50, cabeca: { x: -62.8, y: -43.5 }, cotos: [{ x: 62.7, y: -65.9 }], escala: 0.55 },
    { arte: 'serpente1c', anim: 'serpente-1c-idle', hp: 50, cabeca: { x: -10.9, y: -47.5 }, cotos: [{ x: 62.7, y: -65.9 }, { x: -62.8, y: -43.5 }], escala: 0.55 },
    // A fusão é MAIOR (0.63 vs 0.55 ≈ +15%): "um boss maior com uma cabeça só".
    { arte: 'serpenteFusao', anim: 'serpente-fusao-fury', hp: 60, cabeca: { x: -30.8, y: -68.0 }, cotos: [{ x: 30, y: 30 }, { x: -20, y: 60 }], escala: 0.63 },
  ];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: EnemySystem,
  ) {
    const fases = BossSerpente.FASES;
    this.hpFase = fases[0].hp;
    this.maxHpTotal = fases.reduce((s, f) => s + f.hp, 0);
    this.hpTotal = this.maxHpTotal;

    this.sprite = scene.physics.add.sprite(GAME_WIDTH + 150, BossSerpente.BASE_Y, fases[0].arte);
    this.sprite.setScale(fases[0].escala).setDepth(30);
    if (scene.anims.exists(fases[0].anim)) this.sprite.play(fases[0].anim);

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    // O corpo cobre a serpente para ABSORVER tiro (e ferir por contato). As cabeças têm as
    // suas próprias hitboxes — este corpo nunca recebe dano.
    body.setSize(this.sprite.width * 0.72, this.sprite.height * 0.78);
    body.setVelocityX(-46);
    this.sprite.setData('boss', this);

    // A CABEÇA VULNERÁVEL: hitbox própria + o glow que a marca. O clarão aditivo pulsando é o
    // telégrafo do alvo — numa luta em que quase tudo absorve tiro, o jogador precisa VER onde
    // o dano entra (o mesmo princípio do pavio da mina).
    this.cabeca = scene.physics.add.sprite(this.sprite.x, this.sprite.y, 'flash');
    this.cabeca.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.28).setScale(2.2).setDepth(31);
    (this.cabeca.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.cabeca.body as Phaser.Physics.Arcade.Body).setCircle(15);
    this.cabeca.setData('boss', this);
    this.targets.push(this.cabeca);

    this.muzzleFx = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 200,
        speed: { min: 30, max: 120 },
        scale: { start: 2.2, end: 0 },
        tint: [0xff3a78, 0xffd9a0],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(50);

    // A fumaça dos COTOS ('puff', nunca a 'spark' quadrada): o dano acumulado FICA visível,
    // como o casco fumegando do Iron Nokana. Emitida por posição no update.
    this.smokeFx = scene.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 380, max: 640 },
        speedY: { min: -26, max: -10 },
        speedX: { min: -6, max: 6 },
        scale: { start: 0.5, end: 1.5 },
        alpha: { start: 0.45, end: 0 },
        tint: [0x2a3040, 0x4a5060, 0xff8c1a],
        emitting: false,
      })
      .setDepth(32);

    this.barBg = scene.add.rectangle(GAME_WIDTH / 2, 16, 160, 4, 0x531a30).setDepth(100);
    this.bar = scene.add
      .rectangle(GAME_WIDTH / 2 - 80, 16, 160, 4, 0xff3a78)
      .setOrigin(0, 0.5)
      .setDepth(101);
  }

  get isDead(): boolean {
    return this.dead;
  }

  private get fase(): FaseSerpente {
    return BossSerpente.FASES[this.faseIdx];
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  // ─── O laço ─────────────────────────────────────────────────────────────────

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    if (this.dead) return;

    this.t += dt;
    if (this.imune > 0) this.imune -= dt;

    if (this.entering) {
      if (this.sprite.x <= BossSerpente.STATION_X) {
        this.entering = false;
        this.body.setVelocityX(0);
      }
      this.sincronizarCabeca();
      return;
    }

    this.mover(dt, target);
    this.atacar(dt, target);
    this.fumegar(dt);
    this.sincronizarCabeca();
  }

  /**
   * ONDULAÇÃO por velocidade (nunca tween de posição — armadilha nº 2): a serpente respira
   * verticalmente e volta ao posto quando uma investida a deslocou. Fora da investida o X é
   * puxado de volta ao posto; dentro dela, a máquina de estados manda.
   */
  private mover(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    const alvoY =
      BossSerpente.BASE_Y + Math.sin(this.t * 1.25) * BossSerpente.ONDULACAO;
    this.body.setVelocityY((alvoY - this.sprite.y) * 4);

    switch (this.investida) {
      case 'nao':
        this.body.setVelocityX((BossSerpente.STATION_X - this.sprite.x) * 3);
        break;
      case 'telegrafo':
        // O AVISO: recua e pisca. 0.6s é tempo de sair da linha — sem ele a investida de uma
        // massa de 130px seria um imposto, não uma pergunta.
        this.investidaT -= dt;
        this.body.setVelocityX(34);
        this.sprite.setTint(Math.floor(this.investidaT * 20) % 2 === 0 ? 0xffffff : 0xff9090);
        if (this.investidaT <= 0) {
          this.sprite.clearTint();
          this.investida = 'indo';
          this.body.setVelocityX(-380);
        }
        break;
      case 'indo':
        if (this.sprite.x <= 150) this.investida = 'voltando';
        break;
      case 'voltando':
        this.body.setVelocityX(180);
        if (this.sprite.x >= BossSerpente.STATION_X - 4) {
          this.investida = 'nao';
        }
        break;
    }

    void target;
  }

  private comecarInvestida(): void {
    if (this.investida !== 'nao') return;
    this.investida = 'telegrafo';
    this.investidaT = 0.6;
  }

  /** Os padrões da fase. Relógios simples: legibilidade vem do RITMO, não da variedade. */
  private atacar(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    if (this.imune > 0) return;

    this.cdPrincipal -= dt;
    this.cdSecundario -= dt;

    const boca = this.posCabeca();

    switch (this.faseIdx) {
      case 0:
        // A LARANJA cobra posição: rajada mirada (o verbo da canhoneira/Capitânia).
        if (this.cdPrincipal <= 0) {
          this.cdPrincipal = 2.2;
          this.rajada(boca, target, 3, 170);
        }
        // As outras cabeças atiram esparso — pressão de fundo, nunca competindo com a rajada.
        if (this.cdSecundario <= 0) {
          this.cdSecundario = 1.9;
          const desvio = Phaser.Math.FloatBetween(-0.35, 0.35);
          this.tiro(this.sprite.x - 20, this.sprite.y - 30, this.anguloPara(target) + desvio, 140);
        }
        break;

      case 1:
        // A CIANO cobra futuro: a INVESTIDA (o verbo do kamikaze, no corpo de um titã).
        if (this.cdPrincipal <= 0) {
          this.cdPrincipal = 3.5;
          this.comecarInvestida();
        }
        if (this.cdSecundario <= 0) {
          this.cdSecundario = 2.6;
          this.leque(boca, target, 5, 44, 150);
        }
        break;

      case 2: {
        // A VERDE é a TORRE outra vez: metrônomo de leques — acelerando conforme sangra.
        // O jogador conhece esse verbo desde a Fase 1; o que muda é o relógio apertar.
        const aperto = 1 - this.hpFase / this.fase.hp; // 0 → 1 conforme a cabeça morre
        if (this.cdPrincipal <= 0) {
          this.cdPrincipal = Phaser.Math.Linear(1.7, 1.15, aperto);
          this.leque(boca, target, 5, 52, 160);
        }
        if (this.cdSecundario <= 0) {
          this.cdSecundario = 5;
          this.comecarInvestida();
        }
        break;
      }

      case 3:
        // A FÚRIA: os três verbos em CICLO, com silêncio curto entre eles. O silêncio de 0.8s
        // é estrutura, não generosidade (a regra da Capitânia): sem ele, três padrões viram
        // ruído ilegível — e ilegível não é difícil, é injusto.
        if (this.cdPrincipal <= 0) {
          switch (this.furiaPasso % 4) {
            case 0:
              this.leque(boca, target, 7, 64, 170);
              this.cdPrincipal = 0.9;
              break;
            case 1:
              this.rajada(boca, target, 4, 190);
              this.cdPrincipal = 1.0;
              break;
            case 2:
              this.comecarInvestida();
              this.cdPrincipal = 1.5;
              break;
            case 3:
              // O silêncio.
              this.cdPrincipal = 0.8;
              break;
          }
          this.furiaPasso++;
        }
        break;
    }
  }

  // ─── Tiros (o pool é o do EnemySystem; a família de cor é a MAGENTA do inimigo) ───

  private anguloPara(target: Phaser.Physics.Arcade.Sprite): number {
    return Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, target.x, target.y);
  }

  private tiro(x: number, y: number, angulo: number, speed: number): void {
    const b = this.enemies.enemyBullets.get(x, y) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;

    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    b.anims.stop();
    b.setTexture('bolt2').setScale(0.9).setTint(0xff3a78);
    b.setBlendMode(Phaser.BlendModes.ADD);
    b.setData('ox', x);
    b.setData('oy', y);
    b.setData('flak', false);
    b.setVelocity(Math.cos(angulo) * speed, Math.sin(angulo) * speed);
    b.setRotation(angulo);
  }

  private leque(
    de: { x: number; y: number },
    target: Phaser.Physics.Arcade.Sprite,
    n: number,
    aberturaDeg: number,
    speed: number,
  ): void {
    const centro = Phaser.Math.Angle.Between(de.x, de.y, target.x, target.y);
    const abertura = Phaser.Math.DegToRad(aberturaDeg);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5;
      this.tiro(de.x, de.y, centro + t * abertura, speed);
    }
    this.muzzleFx.explode(6, de.x, de.y);
  }

  /** Rajada de tiros MIRADOS, espaçados — cada um re-mira: quem fica parado come os três. */
  private rajada(
    _de: { x: number; y: number },
    target: Phaser.Physics.Arcade.Sprite,
    n: number,
    speed: number,
  ): void {
    for (let i = 0; i < n; i++) {
      this.scene.time.delayedCall(i * 120, () => {
        if (this.dead || !this.sprite.active) return;
        const boca = this.posCabeca();
        const ang = Phaser.Math.Angle.Between(boca.x, boca.y, target.x, target.y);
        this.tiro(boca.x, boca.y, ang, speed);
        this.muzzleFx.explode(3, boca.x, boca.y);
      });
    }
  }

  // ─── Anatomia ───────────────────────────────────────────────────────────────

  /** A posição da cabeça vulnerável NA TELA (offset de arte × escala de exibição). */
  private posCabeca(): { x: number; y: number } {
    const f = this.fase;
    return {
      x: this.sprite.x + f.cabeca.x * f.escala,
      y: this.sprite.y + f.cabeca.y * f.escala,
    };
  }

  private sincronizarCabeca(): void {
    const p = this.posCabeca();
    this.cabeca.setPosition(p.x, p.y);
    // O glow PULSA — um alvo estático parece decoração; um pulsando parece um ponto fraco.
    this.cabeca.setAlpha(0.2 + 0.14 * Math.sin(this.t * 6));
  }

  /** Os cotos fumegam. O dano ACUMULA visualmente: cada fase carrega as cicatrizes da anterior. */
  private fumegar(dt: number): void {
    this.smokeCd -= dt;
    if (this.smokeCd > 0 || this.fase.cotos.length === 0) return;
    this.smokeCd = 0.09;

    const f = this.fase;
    for (const c of f.cotos) {
      this.smokeFx.emitParticleAt(
        this.sprite.x + c.x * f.escala + Phaser.Math.Between(-3, 3),
        this.sprite.y + c.y * f.escala + Phaser.Math.Between(-3, 3),
      );
    }
  }

  // ─── Dano e fases ───────────────────────────────────────────────────────────

  damage(amount: number): boolean {
    if (this.dead || this.entering || this.imune > 0) return false;

    this.hpFase -= amount;
    this.hpTotal -= amount;
    this.bar.width = 160 * Math.max(0, this.hpTotal / this.maxHpTotal);

    this.sprite.setTint(0xff9090);
    this.scene.time.delayedCall(50, () => {
      if (this.sprite.active && this.investida !== 'telegrafo') this.sprite.clearTint();
    });

    if (this.hpFase > 0) return false;

    // A cabeça morreu. Última fase = a luta acabou; senão, TRANSIÇÃO.
    if (this.faseIdx >= BossSerpente.FASES.length - 1) {
      this.die();
      return true;
    }

    this.transicao();
    return false;
  }

  /**
   * A CABEÇA MORRE EM CADEIA (a referência Metal Slug do Henrique): 5 estouros pequenos
   * varrendo a região da cabeça, um grande no fim, e SÓ ENTÃO a arte troca. A imunidade cobre
   * a cadeia — a transição é um beat, não uma janela de DPS grátis.
   *
   * A troca para a FUSÃO (última transição) é a CONVULSÃO: mais longa, com a cadeia
   * percorrendo o CORPO inteiro — o colapso que precede o "boss maior" surgir.
   */
  private transicao(): void {
    const paraFusao = this.faseIdx === BossSerpente.FASES.length - 2;
    const cabecaMorta = this.posCabeca();
    const duracao = paraFusao ? 1500 : 550;
    const estouros = paraFusao ? 10 : 5;

    this.imune = duracao / 1000 + 0.2;
    this.investida = 'nao';
    this.sprite.clearTint();

    for (let i = 0; i < estouros; i++) {
      this.scene.time.delayedCall(i * (duracao / estouros), () => {
        if (!this.sprite.active) return;
        // Na convulsão os estouros percorrem o CORPO; na morte de cabeça, ficam nela.
        const raio = paraFusao ? 70 : 26;
        const cx = paraFusao ? this.sprite.x : cabecaMorta.x;
        const cy = paraFusao ? this.sprite.y : cabecaMorta.y;
        this.muzzleFx.explode(
          10,
          cx + Phaser.Math.Between(-raio, raio),
          cy + Phaser.Math.Between(-raio, raio),
        );
        this.scene.cameras.main.shake(70, 0.004);
      });
    }

    this.scene.time.delayedCall(duracao, () => {
      if (!this.sprite.active || this.dead) return;

      this.faseIdx++;
      const f = this.fase;
      this.hpFase = f.hp;

      // PARAR A ANIMAÇÃO ANTES DA TEXTURA (armadilha nº 26): sem o stop, o Phaser repõe o
      // quadro da animação velha por cima e a cabeça morta "ressuscita" na tela.
      this.sprite.anims.stop();
      this.sprite.setTexture(f.arte);
      this.sprite.setScale(f.escala);
      if (this.scene.anims.exists(f.anim)) this.sprite.play(f.anim);
      this.body.setSize(this.sprite.width * 0.72, this.sprite.height * 0.78);

      this.muzzleFx.explode(24, this.sprite.x, this.sprite.y);
      this.scene.cameras.main.shake(paraFusao ? 300 : 160, paraFusao ? 0.012 : 0.007);
      this.scene.cameras.main.flash(paraFusao ? 300 : 140, 255, 120, 160);
    });
  }

  private die(): void {
    this.dead = true;
    this.body.setVelocity(0, 0);

    // Os projéteis dela morrem com ela — uma rajada que estoura depois do chefão morto mata o
    // jogador na tela de vitória (a regra da Capitânia).
    for (const obj of [...this.enemies.enemyBullets.getChildren()]) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (b.active) this.enemies.release(b);
    }

    this.cabeca.destroy();
    this.targets.length = 0;
  }

  destroy(): void {
    this.sprite.destroy();
    if (this.cabeca.active) this.cabeca.destroy();
    this.bar.destroy();
    this.barBg.destroy();
    this.muzzleFx.destroy();
    this.smokeFx.destroy();
  }
}
