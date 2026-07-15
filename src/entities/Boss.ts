import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';

/**
 * O que a GameScene precisa saber de um chefão — e nada mais.
 *
 * A cena não conhece a Torre nem a Capitânia: ela conhece ISTO. Acrescentar o chefão de uma
 * fase nova não pode obrigar a mexer na cena que os executa (o mesmo princípio do
 * FlightController: a abstração é o que deixa a campanha crescer sem `if (fase === 2)`).
 */
export interface StageBoss {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly isDead: boolean;
  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void;
  /** @returns true se este dano matou o chefão. */
  damage(amount: number): boolean;
  destroy(): void;
}

/**
 * Torre de Defesa da Colônia — chefão da Fase 1.
 *
 * Duas fases: leque lento → leque rápido + rajada mirada. Simples de propósito:
 * é o primeiro boss do jogo e existe para ENSINAR a ler um padrão, não para punir.
 */
export class Boss implements StageBoss {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  private hp: number;
  private readonly maxHp: number;
  private cooldown = 2;
  private t = 0;
  private entering = true;
  private dead = false;

  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly bar: Phaser.GameObjects.Rectangle;
  /** UM emissor, reaproveitado. Criar um por tiro vaza memória. */
  private readonly muzzleFx: Phaser.GameObjects.Particles.ParticleEmitter;

  /**
   * Altura de repouso e posição de combate.
   * Calibradas para o sprite REAL (97×125): com as constantes do placeholder (64×80) ele
   * transbordava a tela pela direita e pelo rodapé.
   */
  private static readonly BASE_Y = GAME_HEIGHT - 74;
  private static readonly STATION_X = GAME_WIDTH - 56;
  private static readonly ENTRY_SPEED = 45;

  /**
   * Boca do canhão, em px a partir do CENTRO do sprite (97×125).
   * Medido no próprio PNG (primeiro pixel opaco da metade superior), não chutado —
   * antes os tiros nasciam no meio da torre, longe do cano.
   *
   * Recalcular se o enquadramento mudar: as duas animações (flutuar/disparar) compartilham
   * uma caixa única, e o clarão do disparo a alargou para a esquerda — o centro se deslocou.
   */
  private static readonly MUZZLE_X = -31;
  private static readonly MUZZLE_Y = -39;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bullets: Phaser.Physics.Arcade.Group,
    hp = 90,
  ) {
    this.hp = hp;
    this.maxHp = hp;

    this.sprite = scene.physics.add.sprite(GAME_WIDTH + 50, Boss.BASE_Y, 'boss');

    // Propulsores acesos e casco flutuando. Se a animação não existir, fica o sprite parado.
    if (scene.anims.exists('boss-hover')) this.sprite.play('boss-hover');

    this.body.setAllowGravity(false);
    // Derivada da textura: o boss real (128px) entra sem recalibrar a hitbox.
    this.body.setSize(this.sprite.width * 0.7, this.sprite.height * 0.8);
    this.sprite.setData('boss', this);

    // Entra deslizando pela direita, POR VELOCIDADE — nunca por tween de posição.
    //
    // BUG CORRIGIDO: um tween em `sprite.x` não move um corpo Arcade. O tween escreve a
    // posição, o corpo a sobrescreve no mesmo frame, e o sprite fica onde o corpo está.
    // O tween ainda roda até o fim e dispara o onComplete — então o boss "chegava",
    // começava a atirar, mas continuava PARADO FORA DA TELA. Viam-se os tiros, não ele.
    this.body.setVelocityX(-Boss.ENTRY_SPEED);

    this.muzzleFx = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 160,
        speed: { min: 20, max: 90 },
        // Cone apontando para a ESQUERDA: é para onde o cano atira.
        angle: { min: 150, max: 210 },
        scale: { start: 2, end: 0 },
        tint: [COLORS.hotBright, COLORS.hot],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(50);

    this.barBg = scene.add
      .rectangle(GAME_WIDTH / 2, 16, 160, 4, COLORS.enemyDark)
      .setDepth(100);
    this.bar = scene.add
      .rectangle(GAME_WIDTH / 2 - 80, 16, 160, 4, COLORS.enemyBright)
      .setOrigin(0, 0.5)
      .setDepth(101);
  }

  get isDead(): boolean {
    return this.dead;
  }

  /** Fase 2 começa com metade da vida: o padrão acelera e ele passa a mirar. */
  private get enraged(): boolean {
    return this.hp <= this.maxHp / 2;
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    if (this.dead) return;

    // Chegou à posição de combate: freia e a luta começa.
    if (this.entering) {
      if (this.sprite.x > Boss.STATION_X) return;

      this.body.setVelocityX(0);
      this.entering = false;
    }

    this.t += dt;

    // Sobe e desce devagar: um alvo parado não é uma luta.
    //
    // A velocidade PERSEGUE a altura desejada em vez de ser a derivada dela. Integrar a
    // derivada acumularia erro e o boss iria derivando para fora da altura de repouso ao
    // longo da luta. Perseguir o alvo não deriva.
    const targetY = Boss.BASE_Y + Math.sin(this.t * 0.8) * 26;
    this.body.setVelocityY((targetY - this.sprite.y) * 6);

    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    this.cooldown = this.enraged ? 1.1 : 1.9;

    this.playFire();
    this.fan(this.enraged ? 7 : 5);
    if (this.enraged) this.aimed(target);

    // Clarão na boca do cano, além do recuo do sprite.
    const m = this.muzzle;
    this.muzzleFx.explode(6, m.x, m.y);
    this.scene.cameras.main.shake(60, 0.003);
  }

  /** Leque: cobre o espaço e obriga o jogador a se posicionar, não a reagir. */
  private fan(count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.DegToRad(150 + (i / (count - 1)) * 60);
      this.shoot(angle, 80);
    }
  }

  private aimed(target: Phaser.Physics.Arcade.Sprite): void {
    const m = this.muzzle;
    const angle = Phaser.Math.Angle.Between(m.x, m.y, target.x, target.y);
    this.shoot(angle, 130);
  }

  /** Recuo do cano + clarão na boca. Ao terminar, volta a flutuar. */
  private playFire(): void {
    if (!this.scene.anims.exists('boss-fire')) return;

    this.sprite.play('boss-fire');
    this.sprite.once('animationcomplete-boss-fire', () => {
      if (!this.dead && this.scene.anims.exists('boss-hover')) this.sprite.play('boss-hover');
    });
  }

  private get muzzle(): { x: number; y: number } {
    return {
      x: this.sprite.x + Boss.MUZZLE_X,
      y: this.sprite.y + Boss.MUZZLE_Y,
    };
  }

  private shoot(angle: number, speed: number): void {
    const m = this.muzzle;
    const b = this.bullets.get(m.x, m.y) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;

    b.setActive(true).setVisible(true);
    b.body!.enable = true;

    // Bola de fogo com rastro, ardendo. O tiro de um chefão tem que se anunciar como coisa
    // diferente da de um drone, senão o jogador não sabe o que priorizar.
    b.clearTint();

    if (this.scene.anims.exists('comet-burn')) {
      b.play('comet-burn');
      // Fase aleatória: projéteis do mesmo leque ardendo em uníssono parecem um só objeto.
      b.anims.setProgress(Math.random());
    } else {
      b.setTexture('comet');
    }

    b.setScale(1.1);
    b.setFlipX(false);
    // A arte aponta para a DIREITA. Girar pelo ângulo do tiro já a alinha com o movimento —
    // espelhar POR CIMA disso inverteria duas vezes e o rastro sairia na frente da bola.
    b.setRotation(angle);
    b.setData('ox', m.x);
    b.setData('oy', m.y);

    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  /** @returns true se este dano matou o boss. */
  damage(amount: number): boolean {
    // Invulnerável enquanto desliza para dentro da tela. Sem isto dá para matá-lo
    // ANTES DE ELE APARECER, atirando no vazio à direita (constatado no playtest).
    if (this.dead || this.entering) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.bar.width = 160 * (this.hp / this.maxHp);

    // setTint, e NÃO setTintFill.
    //
    // `setTintFill` pinta o sprite inteiro de branco sólido — some com a arte. Num inimigo
    // pequeno isso é um piscar; num chefão de 97×125 apanhando 7 tiros por segundo (o flap
    // atira sozinho), ele passa a maior parte do tempo como um borrão branco.
    // `setTint` multiplica a cor: avermelha sem apagar o desenho.
    this.sprite.setTint(0xffa0a0);
    this.scene.time.delayedCall(60, () => !this.dead && this.sprite.clearTint());

    if (this.hp > 0) return false;

    this.dead = true;
    this.body.setVelocity(0, 0);
    return true;
  }

  destroy(): void {
    this.sprite.destroy();
    this.bar.destroy();
    this.barBg.destroy();
    this.muzzleFx.destroy();
  }
}
