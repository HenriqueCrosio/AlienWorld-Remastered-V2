import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import type { EnemySystem } from '../systems/EnemySystem';
import type { Moldura } from '../systems/Moldura';

/** Para onde o AVISO nada. `sobe`: A no chão e B no teto. `desce`: o contrário. */
export type SentidoGolfinho = 'sobe' | 'desce';

export type EstadoGolfinho =
  | 'aviso'
  | 'espera'
  | 'x1'
  | 'intervalo'
  | 'x2'
  | 'entrada'
  | 'duelo'
  | 'morto';

/**
 * O GOLFINHO BIOMECÂNICO — o mini-chefão da câmara B da Fase 4 (spec 2026-09-11).
 *
 * Ele é o MOTIVO de a câmara mudar. O Henrique jogou o M1.5 e perguntou por que o fundo troca, e
 * a resposta estava num protótipo que ele mesmo tinha criado no PixelLab sem uso pensado.
 *
 *   AVISO    nada de A até B, em paredes OPOSTAS (sorteio por partida). Intocável. B marca de onde
 *            o ataque sai — *"a marcação do ataque é a posição B, independente de onde seja"*.
 *   X        duas diagonais, da direita para a esquerda: a 1ª sai de B, a 2ª de A. Em cada uma,
 *            UMA cambalhota e o LEQUE de 3. A barra aparece; a vida não desce de 25.
 *   DUELO    pela direita, de frente, até morrer: flip subindo + RAJADA de 3, flip descendo +
 *            rajada. Sem piso.
 *
 * ⚠️ QUEM SEGURA A FASE NÃO É ESTA CLASSE. O teto do relógio é do roteiro (`seguraEm`) e quem o
 * aplica é a `GameScene`; aqui só se diz se o bicho está vivo.
 *
 * ⚠️ POSIÇÃO ESCRITA À MÃO, SEM VELOCIDADE. As trajetórias são segmentos com paradas (a cambalhota
 * FREIA, o flip anda 36px e para), e integrar velocidade faria a parada depender do `dt` do quadro.
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
  private static readonly AVISO_DUR = 2;
  private static readonly ESPERA_DUR = 1.5;
  private static readonly INTERVALO_DUR = 0.4;
  private static readonly VEL_X = 190;
  /**
   * ⚠️ A CAMBALHOTA É AQUI, E ELE FREIA NELA. A animação dura 1,4s e o tiro sai no fim; em
   * movimento a 190px/s o leque sairia em x≈100, nas COSTAS de quem joga. Parado em 280, sai na
   * metade direita da tela.
   */
  private static readonly X_CAMBALHOTA = 280;
  private static readonly SAIDA_X = -40;
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
  private static readonly VEL_LEQUE = 110;
  private static readonly VEL_RAJADA = 130;
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

  private _estado: EstadoGolfinho = 'aviso';
  private _hp = Golfinho.HP;
  private t = 0;
  private vy = 0;
  private nave: Phaser.Physics.Arcade.Sprite | null = null;
  private cambalhotaFeita = false;
  private girando = false;
  /** O tiro da animação em curso já saiu? Rede para quadro pulado num `dt` grande. */
  private disparou = false;
  private flipSobe = true;
  private flipT = 0;
  private flipY0 = 0;
  private flipY1 = 0;
  private pausa = 0;
  private rajadaRestante = 0;
  private rajadaT = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: EnemySystem,
    private readonly moldura: Moldura,
    readonly sentido: SentidoGolfinho,
  ) {
    Golfinho.registrarAnims(scene);

    const teto = moldura.superficieTetoEm(Golfinho.COLUNA_AB) + Golfinho.DENTRO;
    const chao = moldura.superficieChaoEm(Golfinho.COLUNA_AB) - Golfinho.DENTRO;
    this.yA = sentido === 'sobe' ? chao : teto;
    this.yB = sentido === 'sobe' ? teto : chao;

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
    // vizinhos), e em loop direto daria um tranco.
    if (!a.exists('golfinho-nado')) {
      a.create({
        key: 'golfinho-nado',
        frames: a.generateFrameNumbers('golfinhoNado', { start: 0, end: 8 }),
        frameRate: 10,
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

  /** Fere e apanha: do X em diante. O aviso, a espera em B e o intervalo fora da tela, não. */
  get vulneravel(): boolean {
    return (
      this._estado === 'x1' || this._estado === 'x2' || this._estado === 'entrada' || this._estado === 'duelo'
    );
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  update(dt: number, nave: Phaser.Physics.Arcade.Sprite): void {
    if (!this.vivo) return;
    this.nave = nave;
    this.t += dt;
    this.tickRajada(dt);

    switch (this._estado) {
      case 'aviso': {
        const p = Phaser.Math.Easing.Sine.InOut(Math.min(1, this.t / Golfinho.AVISO_DUR));
        this.sprite.y = Phaser.Math.Linear(this.yA, this.yB, p);
        if (this.t >= Golfinho.AVISO_DUR) {
          this.sprite.setAngle(0);
          this.mudar('espera');
        }
        break;
      }
      case 'espera':
        if (this.t >= Golfinho.ESPERA_DUR) this.iniciarDiagonal('x1');
        break;
      case 'x1':
      case 'x2':
        this.nadarDiagonal(dt);
        break;
      case 'intervalo':
        if (this.t >= Golfinho.INTERVALO_DUR) this.iniciarDiagonal('x2');
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
  }

  // ─── O X ─────────────────────────────────────────────────────────────────────

  private mudar(estado: EstadoGolfinho): void {
    this._estado = estado;
    this.t = 0;
  }

  /** A 1ª diagonal sai de B e termina na altura de A; a 2ª entra pela direita em A e termina em B. */
  private iniciarDiagonal(qual: 'x1' | 'x2'): void {
    const deX = qual === 'x1' ? Golfinho.COLUNA_AB : Golfinho.ENTRADA_X;
    const deY = qual === 'x1' ? this.yB : this.yA;
    const paraY = qual === 'x1' ? this.yA : this.yB;

    this.sprite.setPosition(deX, deY).setAngle(0).setVisible(true);
    this.vy = (paraY - deY) / ((deX - Golfinho.SAIDA_X) / Golfinho.VEL_X);
    this.cambalhotaFeita = false;
    this.body.enable = true;
    this.barBg.setVisible(true);
    this.bar.setVisible(true);
    this.mudar(qual);
  }

  private nadarDiagonal(dt: number): void {
    if (this.girando) return;

    this.sprite.x -= Golfinho.VEL_X * dt;
    this.sprite.y += this.vy * dt;

    if (!this.cambalhotaFeita && this.sprite.x <= Golfinho.X_CAMBALHOTA) {
      this.cambalhotaFeita = true;
      this.girar('golfinho-cambalhota');
      return;
    }

    if (this.sprite.x > Golfinho.SAIDA_X) return;

    if (this._estado === 'x1') {
      this.body.enable = false;
      this.sprite.setVisible(false);
      this.mudar('intervalo');
    } else {
      this.iniciarDuelo();
    }
  }

  // ─── O DUELO ─────────────────────────────────────────────────────────────────

  private iniciarDuelo(): void {
    const meio =
      (this.moldura.superficieTetoEm(Golfinho.DUELO_X) + this.moldura.superficieChaoEm(Golfinho.DUELO_X)) / 2;
    this.sprite.setPosition(Golfinho.ENTRADA_X, meio).setVisible(true);
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
    }
    this.sprite.play('golfinho-nado');
  }

  private dispararDaAnimacao(chave: string): void {
    this.disparou = true;
    if (chave === 'golfinho-cambalhota') {
      // O LEQUE: *ache o buraco*.
      const centro = this.mira();
      for (const d of [-1, 0, 1]) this.atirar(centro + d * Golfinho.LEQUE_ABERTURA, Golfinho.VEL_LEQUE);
    } else {
      // A RAJADA: *saia da linha*. Três em fila, cada um mirado de novo.
      this.rajadaRestante = Golfinho.RAJADA_TIROS;
      this.rajadaT = 0;
    }
  }

  private tickRajada(dt: number): void {
    if (this.rajadaRestante <= 0) return;
    this.rajadaT -= dt;
    if (this.rajadaT > 0) return;
    this.atirar(this.mira(), Golfinho.VEL_RAJADA);
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
