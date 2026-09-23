import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { EnemySystem } from '../systems/EnemySystem';
import type { Moldura } from '../systems/Moldura';

/** Para onde o AVISO nada. `sobe`: A no chão e B no teto. `desce`: o contrário. */
export type SentidoGolfinho = 'sobe' | 'desce';

export type EstadoGolfinho =
  | 'aviso'
  | 'espera'
  | 'x1'
  | 'intervalo'
  | 'emergir'
  | 'x2'
  | 'entrada'
  | 'duelo'
  | 'morto';

type EstiloTiro = 'rajada' | 'leque';

/**
 * O GOLFINHO BIOMECÂNICO — o mini-chefão da câmara B da Fase 4 (spec 2026-09-11).
 *
 * Ele é o MOTIVO de a câmara mudar. O Henrique jogou o M1.5 e perguntou por que o fundo troca, e
 * a resposta estava num protótipo que ele mesmo tinha criado no PixelLab sem uso pensado.
 *
 *   AVISO    nada de A até B, em paredes OPOSTAS (sorteio por partida), passa por B e SAI DA TELA
 *            pela borda. Intocável. B marca de onde o ataque vem — *"a marcação do ataque é a
 *            posição B, independente de onde seja"*.
 *   X        1ª passagem: entra de fora da tela pela direita, NA ALTURA DE B, cruza nadando e sai
 *            pela esquerda. Some. Bolhas sobem
 *            da parede de A, e ele IRROMPE dela num x sorteado, cruza o corredor e MERGULHA na
 *            parede oposta. Em cada passagem, UMA cambalhota e o LEQUE de 3. Piso de vida 25.
 *   DUELO    pela direita, de frente, até morrer, flip após flip alternando ESTILO e VELOCIDADE:
 *            rajada lenta → leque rápido → rajada rápida → leque lento.
 *
 * ⚠️ QUEM SEGURA A FASE NÃO É ESTA CLASSE. O teto do relógio é do roteiro (`seguraEm`) e quem o
 * aplica é a `GameScene`; aqui só se diz se o bicho está vivo.
 *
 * ⚠️ POSIÇÃO ESCRITA À MÃO, SEM VELOCIDADE. As trajetórias são segmentos com onda e freio, e
 * integrar velocidade faria a forma do caminho depender do `dt` do quadro.
 */
export class Golfinho {
  static readonly HP = 50;
  /** O X conta, mas o duelo sempre acontece: antes dele a vida não desce daqui (decisão dele). */
  static readonly PISO = 25;
  static readonly SCORE = 500;

  /** A coluna de A e B. */
  private static readonly COLUNA_AB = 320;
  /** O centro do corpo, em px para DENTRO da faixa jogável a partir da superfície da parede. */
  private static readonly DENTRO = 4;
  /**
   * O AVISO: de A, passando por B, até FORA DA TELA (2º teste jogado de 11/09: *"quando chegar em B
   * sair da tela"*). Acelera — sai da parede devagar e dispara para a borda.
   */
  private static readonly AVISO_DUR = 2.4;
  /** Quanto além da borda ele some: meio comprimento do corpo girado (21px) e folga. */
  private static readonly AVISO_ALEM_BORDA = 40;
  /** O tempo FORA DA TELA entre o aviso e a 1ª passagem do X. */
  private static readonly ESPERA_DUR = 0.8;
  private static readonly VEL_X = 190;

  // ─── O NADO DE VERDADE (teste jogado de 11/09: *"ele parece estar flutuando ou à deriva"*) ───
  //
  // ⚠️ AS QUATRO CAUSAS DA DERIVA, e o conserto de cada uma: o caminho era uma RETA (vira onda); o
  // corpo não inclinava (agora aponta para o rumo, onda incluída — o kamikaze já gira livre, e
  // girar venceu o serrilhado); a cauda batia a 10fps (14); e ele PARAVA no ar durante a cambalhota
  // (agora só freia). Parar no meio do nado era o que mais lia como boia.
  /** A onda do nado, perpendicular ao rumo: golfinho furando a água. */
  private static readonly ONDA_AMPLITUDE = 9;
  private static readonly ONDA_HZ = 1.3;
  /** Na cambalhota ele não para: nada a esta fração da velocidade. */
  private static readonly GIRO_FREIO = 0.35;
  /** Quão rápido o corpo alcança o ângulo do rumo (por segundo). Evita estalo de rotação. */
  private static readonly SUAVE_GIRO = 10;

  /**
   * ⚠️ A CAMBALHOTA DA 1ª PASSAGEM COMEÇA AQUI. A animação dura 1,4s e o tiro sai no fim; com o
   * freio de 0,35 ele anda ~72px nesse tempo, e o leque sai em x≈238 — na metade direita.
   */
  private static readonly X_CAMBALHOTA = 310;
  /** Na 2ª passagem, a cambalhota começa a esta fração do caminho de parede a parede. */
  private static readonly X2_CAMBALHOTA_FRACAO = 0.2;
  private static readonly SAIDA_X = -40;

  // ─── A VOLTA PELA PAREDE (decisão dele: *"sempre de dentro da parede"*) ───
  /** O tempo fora da tela entre as passagens — SORTEADO: o susto também é de QUANDO. */
  private static readonly INTERVALO_MIN = 0.8;
  private static readonly INTERVALO_MAX = 1.4;
  /**
   * ⚠️ O AVISO DA VOLTA: bolhas na parede antes de ele irromper. Um bicho que fere e surge do nada
   * é punir o que o jogador não teve como ver — e o GDD proíbe isso.
   */
  private static readonly EMERGIR_DUR = 0.5;
  /** O x em que ele irrompe, sorteado. O piso de 280 mantém o leque na metade direita. */
  private static readonly EMERGE_X_MIN = 280;
  private static readonly EMERGE_X_MAX = 340;
  /** Quanto ele anda para a esquerda cruzando de parede a parede. */
  private static readonly EMERGE_DESLOCA_X = 120;
  /**
   * O fade de sair da parede e o de mergulhar na outra. ⚠️ 20, não 36: com 36 ele passava meio
   * segundo translúcido sobre a decoração e lia como fantasma dentro da costela (captura de 11/09).
   * Irromper é seco — é o susto.
   */
  private static readonly EMERGE_FADE_PX = 20;
  private static readonly MERGULHO_FADE_PX = 30;

  private static readonly ENTRADA_X = GAME_WIDTH + 30;
  private static readonly DUELO_X = 300;
  private static readonly VEL_ENTRADA = 120;
  private static readonly FLIP_PASSO = 36;
  private static readonly MARGEM_DUELO = 22;
  /** Os quadros 1–10 do flip são a rolagem; o deslocamento vertical acontece dentro deles. */
  private static readonly ROLAGEM_DUR = 10 / 12;
  private static readonly PAUSA_FLIP = 0.35;
  /** O quadro em que o vermelho da bala aparecia na animação (medido em 11/09). */
  private static readonly QUADRO_TIRO_FLIP = 11;
  private static readonly QUADRO_TIRO_CAMBALHOTA = 14;
  private static readonly LEQUE_ABERTURA = Phaser.Math.DegToRad(13);
  /** O leque do X. */
  private static readonly VEL_LEQUE_X = 110;
  /**
   * ⚠️ O DUELO ALTERNA ESTILO E VELOCIDADE (teste jogado de 11/09: *"as rajadas são lentas e fáceis
   * de desviar, pode alternar em velocidade: rajadas lentas e leque rápido, rajadas rápidas e leque
   * lento"*). Um flip por passo, em ciclo. A rajada única de 130 virou duas: 115 e 210.
   */
  private static readonly DUELO_SEQUENCIA: ReadonlyArray<{ estilo: EstiloTiro; vel: number }> = [
    { estilo: 'rajada', vel: 115 },
    { estilo: 'leque', vel: 200 },
    { estilo: 'rajada', vel: 210 },
    { estilo: 'leque', vel: 105 },
  ];
  private static readonly RAJADA_TIROS = 3;
  private static readonly RAJADA_INTERVALO = 0.09;
  /** O focinho, a partir do centro do quadro 80×80 (medido: a bala nascia em (28, 41)). */
  private static readonly BOCA_X = -12;
  private static readonly BOCA_Y = 1;
  private static readonly BARRA_W = 100;

  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly yA: number;
  readonly yB: number;
  readonly bar: Phaser.GameObjects.Rectangle;
  private readonly barBg: Phaser.GameObjects.Rectangle;
  /** As bolhas do aviso da volta e do mergulho. */
  readonly bolhas: Phaser.GameObjects.Particles.ParticleEmitter;

  private _estado: EstadoGolfinho = 'aviso';
  private _hp = Golfinho.HP;
  private t = 0;
  private nave: Phaser.Physics.Arcade.Sprite | null = null;

  // A passagem em curso: origem, direção unitária, comprimento, distância andada e fase da onda.
  private deX = 0;
  private deY = 0;
  private ux = 0;
  private uy = 0;
  private comprimento = 0;
  private andado = 0;
  private fase = 0;
  private intervaloDur = 0;
  /** Onde a 2ª passagem irrompe (sorteado ao fim do intervalo). */
  private emergeX = 0;
  private emergeY = 0;

  private cambalhotaFeita = false;
  private girando = false;
  /** O tiro da animação em curso já saiu? Rede para quadro pulado num `dt` grande. */
  private disparou = false;
  private flipSobe = true;
  private flipT = 0;
  private flipY0 = 0;
  private flipY1 = 0;
  private pausa = 0;
  private passoDuelo = 0;
  private rajadaRestante = 0;
  private rajadaT = 0;
  private rajadaVel = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: EnemySystem,
    private readonly moldura: Moldura,
    readonly sentido: SentidoGolfinho,
  ) {
    Golfinho.registrarAnims(scene);

    this.yA = this.naParede('A', Golfinho.COLUNA_AB);
    this.yB = this.naParede('B', Golfinho.COLUNA_AB);

    this.sprite = scene.physics.add.sprite(Golfinho.COLUNA_AB, this.yA, 'golfinhoNado');
    const body = this.body;
    body.setAllowGravity(false);
    // ⚠️ A HITBOX É DO CORPO, NÃO DO QUADRO. O golfinho ocupa ~42×30 de 80×80 (medido na pose de
    // nado: x=20..60, y=27..56). Com a regra padrão do jogo (tamanho da textura) ela mataria 38px
    // de vazio — a armadilha da mesa e da lamina, paga de novo se alguém trocar isto.
    body.setSize(34, 20, false);
    body.setOffset(40 - 17, 41 - 10);
    body.enable = false;

    // A travessia do aviso é VERTICAL: nariz para onde nada. 90° é o único giro que não serrilha.
    this.sprite.setAngle(sentido === 'sobe' ? 90 : -90);
    this.sprite.play('golfinho-nado');

    this.sprite.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) =>
        this.aoTrocarQuadro(anim.key, Number(frame.textureFrame)),
    );
    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) =>
      this.aoCompletar(anim.key),
    );

    // ⚠️ BOLHAS FRIAS, SEM BLEND ADITIVO: bolha não é energia, e a regra da fase é luz só onde há
    // energia. Elas são movimento na borda, onde a visão periférica pega.
    //
    // ⚠️ ELAS SOBEM DA PAREDE PARA DENTRO DO CORREDOR, e são grandes e claras de propósito. A 1ª
    // versão (escala 0,55, cinza, espalhando em volta do ponto) não apareceu na captura de 11/09: um
    // aviso que não se vê não avisa. A parede de A é o chão no sentido `sobe` — bolha sobe; no teto,
    // desce.
    const paraDentro = sentido === 'sobe' ? -1 : 1;
    this.bolhas = scene.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 420, max: 760 },
        speedX: { min: -16, max: 16 },
        speedY: { min: 28 * paraDentro, max: 70 * paraDentro },
        scale: { start: 1.15, end: 0.2 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xd2e0ea, 0xa8bccb],
        frequency: 30,
        quantity: 2,
        emitting: false,
      })
      .setDepth(1)
      .setName('bolhasGolfinho');

    // A barra tem a cara da do chefão, mais curta: a promessa de que esta luta é menor que a final.
    this.barBg = scene.add
      .rectangle(GAME_WIDTH / 2, 16, Golfinho.BARRA_W, 4, COLORS.enemyDark)
      .setDepth(100)
      .setVisible(false);
    this.bar = scene.add
      .rectangle(GAME_WIDTH / 2 - Golfinho.BARRA_W / 2, 16, Golfinho.BARRA_W, 4, COLORS.enemyBright)
      .setOrigin(0, 0.5)
      .setDepth(101)
      .setVisible(false);
  }

  private static registrarAnims(scene: Phaser.Scene): void {
    const a = scene.anims;
    // Vai-e-volta: o nado da PixMiniMax não fecha o ciclo (salto 8→0 de 3,91 contra 2,8 entre
    // vizinhos), e em loop direto daria um tranco. 14fps: a 10 a cauda quase não batia.
    if (!a.exists('golfinho-nado')) {
      a.create({
        key: 'golfinho-nado',
        frames: a.generateFrameNumbers('golfinhoNado', { start: 0, end: 8 }),
        frameRate: 14,
        repeat: -1,
        yoyo: true,
      });
    }
    if (!a.exists('golfinho-flip')) {
      a.create({
        key: 'golfinho-flip',
        frames: a.generateFrameNumbers('golfinhoFlip', { start: 0, end: 16 }),
        frameRate: 12,
        repeat: 0,
      });
    }
    if (!a.exists('golfinho-cambalhota')) {
      a.create({
        key: 'golfinho-cambalhota',
        frames: a.generateFrameNumbers('golfinhoCambalhota', { start: 0, end: 16 }),
        frameRate: 12,
        repeat: 0,
      });
    }
  }

  get estado(): EstadoGolfinho {
    return this._estado;
  }

  get hp(): number {
    return this._hp;
  }

  get vivo(): boolean {
    return this._estado !== 'morto' && this.sprite.active;
  }

  /** Fere e apanha: do X em diante. O aviso, a espera em B e o tempo fora da tela, não. */
  get vulneravel(): boolean {
    return (
      this._estado === 'x1' || this._estado === 'x2' || this._estado === 'entrada' || this._estado === 'duelo'
    );
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  /** A altura do corpo colado na parede de A ou de B, na coluna `x`. */
  private naParede(qual: 'A' | 'B', x: number): number {
    const chao = (qual === 'A') === (this.sentido === 'sobe');
    return chao
      ? this.moldura.superficieChaoEm(x) - Golfinho.DENTRO
      : this.moldura.superficieTetoEm(x) + Golfinho.DENTRO;
  }

  update(dt: number, nave: Phaser.Physics.Arcade.Sprite): void {
    if (!this.vivo) return;
    this.nave = nave;
    this.t += dt;
    this.tickRajada(dt);

    switch (this._estado) {
      case 'aviso': {
        // Ele NÃO para em B: passa por ela e sai pela borda do lado de B. B segue marcando de que
        // lado o ataque vem — é por lá que ele some, e é na altura dela que o X entra.
        const fora =
          this.sentido === 'sobe' ? -Golfinho.AVISO_ALEM_BORDA : GAME_HEIGHT + Golfinho.AVISO_ALEM_BORDA;
        const p = Phaser.Math.Easing.Sine.In(Math.min(1, this.t / Golfinho.AVISO_DUR));
        this.sprite.y = Phaser.Math.Linear(this.yA, fora, p);
        if (this.t >= Golfinho.AVISO_DUR) {
          this.sprite.setVisible(false).setAngle(0);
          this.mudar('espera');
        }
        break;
      }
      case 'espera':
        // Fora da tela. A 1ª passagem entra pela DIREITA, na altura de B.
        if (this.t >= Golfinho.ESPERA_DUR) {
          this.iniciarPassagem('x1', Golfinho.ENTRADA_X, this.yB, Golfinho.SAIDA_X, this.yA);
        }
        break;
      case 'x1':
      case 'x2':
        this.nadar(dt);
        break;
      case 'intervalo':
        if (this.t >= this.intervaloDur) this.prepararVolta();
        break;
      case 'emergir':
        if (this.t >= Golfinho.EMERGIR_DUR) {
          this.bolhas.emitting = false;
          const paraX = this.emergeX - Golfinho.EMERGE_DESLOCA_X;
          this.iniciarPassagem('x2', this.emergeX, this.emergeY, paraX, this.naParede('B', paraX));
        }
        break;
      case 'entrada':
        this.sprite.x = Math.max(Golfinho.DUELO_X, this.sprite.x - Golfinho.VEL_ENTRADA * dt);
        if (this.sprite.x <= Golfinho.DUELO_X) {
          this.pausa = Golfinho.PAUSA_FLIP;
          this.mudar('duelo');
        }
        break;
      case 'duelo':
        this.duelar(dt);
        break;
      case 'morto':
        break;
    }
  }

  /** @returns true se este dano o matou. */
  damage(amount: number): boolean {
    if (!this.vulneravel) return false;

    const piso = this._estado === 'x1' || this._estado === 'x2' ? Golfinho.PISO : 0;
    this._hp = Math.max(piso, this._hp - amount);
    this.bar.width = Golfinho.BARRA_W * (this._hp / Golfinho.HP);

    this.sprite.setTint(0xffb0b0);
    this.scene.time.delayedCall(40, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });

    if (this._hp > 0) return false;
    this._estado = 'morto';
    return true;
  }

  destroy(): void {
    this._estado = 'morto';
    this.sprite.destroy();
    this.bar.destroy();
    this.barBg.destroy();
    this.bolhas.destroy();
  }

  // ─── O X ─────────────────────────────────────────────────────────────────────

  private mudar(estado: EstadoGolfinho): void {
    this._estado = estado;
    this.t = 0;
  }

  private iniciarPassagem(qual: 'x1' | 'x2', deX: number, deY: number, paraX: number, paraY: number): void {
    const dx = paraX - deX;
    const dy = paraY - deY;
    this.comprimento = Math.hypot(dx, dy);
    this.ux = dx / this.comprimento;
    this.uy = dy / this.comprimento;
    this.deX = deX;
    this.deY = deY;
    this.andado = 0;
    this.fase = 0;

    // A 2ª passagem nasce DENTRO da parede: invisível e sem corpo até sair dela (ver `nadar`).
    this.sprite.setPosition(deX, deY).setVisible(true).setAlpha(qual === 'x2' ? 0 : 1);
    this.sprite.setRotation(this.anguloDoRumo(1));
    this.sprite.play('golfinho-nado', true);
    this.cambalhotaFeita = false;
    // ⚠️ Uma cambalhota interrompida pelo fim da passagem não dispara `animationcomplete`: sem esta
    // linha o `girando` ficaria preso, e a passagem seguinte nadaria inteira com o freio puxado.
    this.girando = false;
    this.body.enable = qual === 'x1';
    this.barBg.setVisible(true);
    this.bar.setVisible(true);
    this.mudar(qual);
  }

  private nadar(dt: number): void {
    const vel = this.girando ? Golfinho.VEL_X * Golfinho.GIRO_FREIO : Golfinho.VEL_X;
    this.andado += vel * dt;
    // A onda congela na cambalhota: quem desenha o movimento ali é a própria animação.
    if (!this.girando) this.fase += dt * Math.PI * 2 * Golfinho.ONDA_HZ;

    const onda = Golfinho.ONDA_AMPLITUDE * Math.sin(this.fase);
    this.sprite.setPosition(
      this.deX + this.ux * this.andado - this.uy * onda,
      this.deY + this.uy * this.andado + this.ux * onda,
    );

    // O CORPO APONTA PARA O RUMO, com a onda — suavizado, para a entrada e a saída da cambalhota
    // não estalarem. Na cambalhota ele se endireita: o giro é da animação.
    const alvo = this.girando ? 0 : this.anguloDoRumo(Math.cos(this.fase));
    const passo = Math.min(1, dt * Golfinho.SUAVE_GIRO);
    this.sprite.setRotation(this.sprite.rotation + Phaser.Math.Angle.Wrap(alvo - this.sprite.rotation) * passo);

    if (this._estado === 'x2') {
      // Sai da parede aparecendo, mergulha na outra sumindo — e só fere enquanto está à vista.
      const saindo = Math.min(1, this.andado / Golfinho.EMERGE_FADE_PX);
      const mergulhando = Math.min(1, (this.comprimento - this.andado) / Golfinho.MERGULHO_FADE_PX);
      const alfa = Phaser.Math.Clamp(Math.min(saindo, mergulhando), 0, 1);
      this.sprite.setAlpha(alfa);
      this.body.enable = alfa >= 0.5;
    }

    const hora =
      this._estado === 'x1'
        ? this.sprite.x <= Golfinho.X_CAMBALHOTA
        : this.andado >= this.comprimento * Golfinho.X2_CAMBALHOTA_FRACAO;
    if (!this.cambalhotaFeita && hora) {
      this.cambalhotaFeita = true;
      this.girar('golfinho-cambalhota');
    }

    if (this.andado < this.comprimento) return;

    this.body.enable = false;
    this.sprite.setVisible(false);
    if (this._estado === 'x1') {
      this.intervaloDur = Phaser.Math.FloatBetween(Golfinho.INTERVALO_MIN, Golfinho.INTERVALO_MAX);
      this.mudar('intervalo');
    } else {
      // O MERGULHO: as bolhas de onde ele entrou na parede.
      this.bolhas.explode(10, this.sprite.x, this.sprite.y);
      this.iniciarDuelo();
    }
  }

  /**
   * O ângulo do corpo para o rumo da passagem somado à onda. O sprite nasce virado para a ESQUERDA,
   * então rotação 0 é nariz em (−1, 0): o ângulo que leva o nariz ao vetor (vx, vy) é
   * `atan2(−vy, −vx)`. As passagens sempre andam para a esquerda, e `vx` nunca troca de sinal.
   */
  private anguloDoRumo(cosFase: number): number {
    const w = Golfinho.ONDA_AMPLITUDE * Math.PI * 2 * Golfinho.ONDA_HZ * cosFase;
    const vx = this.ux * Golfinho.VEL_X - this.uy * w;
    const vy = this.uy * Golfinho.VEL_X + this.ux * w;
    return Math.atan2(-vy, -vx);
  }

  /** Fim do tempo fora da tela: sorteia onde ele irrompe, e as bolhas começam a subir dali. */
  private prepararVolta(): void {
    this.emergeX = Phaser.Math.Between(Golfinho.EMERGE_X_MIN, Golfinho.EMERGE_X_MAX);
    this.emergeY = this.naParede('A', this.emergeX);
    this.sprite.setPosition(this.emergeX, this.emergeY);
    this.bolhas.setPosition(this.emergeX, this.emergeY);
    this.bolhas.emitting = true;
    this.mudar('emergir');
  }

  // ─── O DUELO ─────────────────────────────────────────────────────────────────

  private iniciarDuelo(): void {
    const meio =
      (this.moldura.superficieTetoEm(Golfinho.DUELO_X) + this.moldura.superficieChaoEm(Golfinho.DUELO_X)) / 2;
    this.sprite.setPosition(Golfinho.ENTRADA_X, meio).setVisible(true).setAlpha(1).setRotation(0);
    this.sprite.play('golfinho-nado', true);
    // ⚠️ O mesmo buraco do `iniciarPassagem`: com o `girando` preso de uma cambalhota interrompida, o
    // duelo nunca começaria um flip.
    this.girando = false;
    this.body.enable = true;
    this.mudar('entrada');
  }

  private duelar(dt: number): void {
    const teto = this.moldura.superficieTetoEm(Golfinho.DUELO_X) + Golfinho.MARGEM_DUELO;
    const chao = this.moldura.superficieChaoEm(Golfinho.DUELO_X) - Golfinho.MARGEM_DUELO;

    if (this.girando) {
      this.flipT += dt;
      const p = Phaser.Math.Easing.Sine.InOut(Math.min(1, this.flipT / Golfinho.ROLAGEM_DUR));
      this.sprite.y = Phaser.Math.Clamp(Phaser.Math.Linear(this.flipY0, this.flipY1, p), teto, chao);
      return;
    }

    this.sprite.y = Phaser.Math.Clamp(this.sprite.y, teto, chao);
    this.pausa -= dt;
    if (this.pausa > 0) return;

    // Bateu no limite: inverte. Um flip que não sai do lugar lê como engasgo.
    let destino = this.sprite.y + (this.flipSobe ? -1 : 1) * Golfinho.FLIP_PASSO;
    if (destino < teto || destino > chao) {
      this.flipSobe = !this.flipSobe;
      destino = this.sprite.y + (this.flipSobe ? -1 : 1) * Golfinho.FLIP_PASSO;
    }
    this.flipY0 = this.sprite.y;
    this.flipY1 = Phaser.Math.Clamp(destino, teto, chao);
    this.flipT = 0;
    this.girar('golfinho-flip');
  }

  // ─── AS ANIMAÇÕES E OS TIROS ────────────────────────────────────────────────

  private girar(chave: string): void {
    this.girando = true;
    this.disparou = false;
    this.sprite.play(chave);
  }

  private aoTrocarQuadro(chave: string, quadro: number): void {
    if (this.disparou) return;
    if (chave === 'golfinho-cambalhota' && quadro === Golfinho.QUADRO_TIRO_CAMBALHOTA) this.dispararDaAnimacao(chave);
    if (chave === 'golfinho-flip' && quadro === Golfinho.QUADRO_TIRO_FLIP) this.dispararDaAnimacao(chave);
  }

  private aoCompletar(chave: string): void {
    if (chave !== 'golfinho-cambalhota' && chave !== 'golfinho-flip') return;
    if (!this.vivo) return;
    // Rede: se um `dt` grande pulou o quadro do tiro, ele sai no fim — nunca some.
    if (!this.disparou) this.dispararDaAnimacao(chave);
    this.girando = false;
    if (chave === 'golfinho-flip') {
      this.flipSobe = !this.flipSobe;
      this.pausa = Golfinho.PAUSA_FLIP;
      this.passoDuelo = (this.passoDuelo + 1) % Golfinho.DUELO_SEQUENCIA.length;
    }
    this.sprite.play('golfinho-nado');
  }

  private dispararDaAnimacao(chave: string): void {
    this.disparou = true;
    if (chave === 'golfinho-cambalhota') {
      this.leque(Golfinho.VEL_LEQUE_X);
      return;
    }
    const passo = Golfinho.DUELO_SEQUENCIA[this.passoDuelo];
    if (passo.estilo === 'leque') {
      this.leque(passo.vel);
    } else {
      // A RAJADA: *saia da linha*. Três em fila, cada um mirado de novo.
      this.rajadaRestante = Golfinho.RAJADA_TIROS;
      this.rajadaVel = passo.vel;
      this.rajadaT = 0;
    }
  }

  /** O LEQUE: *ache o buraco*. */
  private leque(velocidade: number): void {
    const centro = this.mira();
    for (const d of [-1, 0, 1]) this.atirar(centro + d * Golfinho.LEQUE_ABERTURA, velocidade);
  }

  private tickRajada(dt: number): void {
    if (this.rajadaRestante <= 0) return;
    this.rajadaT -= dt;
    if (this.rajadaT > 0) return;
    this.atirar(this.mira(), this.rajadaVel);
    this.rajadaRestante--;
    this.rajadaT = Golfinho.RAJADA_INTERVALO;
  }

  private mira(): number {
    const bx = this.sprite.x + Golfinho.BOCA_X;
    const by = this.sprite.y + Golfinho.BOCA_Y;
    return this.nave ? Phaser.Math.Angle.Between(bx, by, this.nave.x, this.nave.y) : Math.PI;
  }

  private atirar(angulo: number, velocidade: number): void {
    const bx = this.sprite.x + Golfinho.BOCA_X;
    const by = this.sprite.y + Golfinho.BOCA_Y;
    const b = this.enemies.enemyBullets.get(bx, by) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;

    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    // ⚠️ SEM TINT E BLEND NORMAL: a bala já nasce vermelha, e o slot do pool pode ter herdado o
    // aditivo de outro atirador. A hitbox do slot é o quadro do `bolt2` (13×9) — o mesmo da arte.
    b.setTexture('shotGolfinho').setScale(1).clearTint().setFlipX(false);
    b.setBlendMode(Phaser.BlendModes.NORMAL);
    b.setData('ox', bx);
    b.setData('oy', by);
    b.setVelocity(Math.cos(angulo) * velocidade, Math.sin(angulo) * velocidade);
    b.setRotation(angulo);
  }
}
