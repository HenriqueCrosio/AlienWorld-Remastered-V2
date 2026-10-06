import Phaser from 'phaser';

type Tiro = Phaser.Physics.Arcade.Sprite;

/**
 * OS PADRÕES DE TIRO DOS INIMIGOS (spec frente B §2.3) — mirado, leque e anel sobre a piscina de tiros inimigos que
 * já existe (`EnemySystem.enemyBullets`). Os elites atiram por aqui; a aranha também (o anel de 6 da aterrissagem).
 * O tempo ENTRE os tiros de uma rajada é de quem atira (no `update` dele): assim a trava do elétrico o pausa.
 */
export class PadroesDeTiro {
  constructor(
    private readonly pool: Phaser.Physics.Arcade.Group,
    private readonly flash: Phaser.GameObjects.Particles.ParticleEmitter,
  ) {}

  /** O tiro padrão do inimigo: o `bolt2` magenta, aditivo — o mesmo de `EnemySystem.fireAt`. */
  static vestirPadrao(b: Tiro): void {
    b.setTexture('bolt2').setScale(0.8).setTint(0xff3a78);
    b.setBlendMode(Phaser.BlendModes.ADD);
  }

  /**
   * Um tiro DESENHADO (06/10, os dos elites): a arte nas cores dela, sem tint nem brilho, e uma hitbox PRÓPRIA centrada
   * no quadro — o `release` devolve a do `bolt2` (13×9), grande e torta para um traço de 7×1.
   */
  static vestirArte(chave: string, corpo: { w: number; h: number }): (b: Tiro) => void {
    return (b) => {
      b.setTexture(chave).setScale(1).clearTint();
      b.setBlendMode(Phaser.BlendModes.NORMAL);
      (b.body as Phaser.Physics.Arcade.Body).setSize(corpo.w, corpo.h, true);
    };
  }

  /** O clarão de boca, sozinho (quem atira de mais de um cano o desenha em cada um). */
  clarao(x: number, y: number, n = 3): void {
    this.flash.explode(n, x, y);
  }

  /** Um tiro. Devolve false se a piscina estiver cheia (o tiro é descartado, como em `fireAt`). */
  disparar(x: number, y: number, angulo: number, vel: number, vestir: (b: Tiro) => void = PadroesDeTiro.vestirPadrao): boolean {
    const b = this.pool.get(x, y) as Tiro | null;
    if (!b) {
      if (import.meta.env.DEV) console.warn('[inimigos] pool cheio, tiro descartado');
      return false;
    }
    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    vestir(b);
    // Origem: a carência contra o relevo (ver GameScene).
    b.setData('ox', x);
    b.setData('oy', y);
    b.setVelocity(Math.cos(angulo) * vel, Math.sin(angulo) * vel);
    b.setRotation(angulo);
    return true;
  }

  mirado(x: number, y: number, alvoX: number, alvoY: number, vel: number, vestir?: (b: Tiro) => void): void {
    this.disparar(x, y, Phaser.Math.Angle.Between(x, y, alvoX, alvoY), vel, vestir);
    this.flash.explode(3, x, y);
  }

  /** `n` tiros espalhados em `aberturaRad` (total), centrados em `angulo`. */
  leque(x: number, y: number, angulo: number, n: number, aberturaRad: number, vel: number, vestir?: (b: Tiro) => void): void {
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? angulo : angulo - aberturaRad / 2 + (aberturaRad * i) / (n - 1);
      if (!this.disparar(x, y, a, vel, vestir)) break;
    }
    this.flash.explode(4, x, y);
  }

  /** `n` tiros radiais; `fase` gira o anel (rad). `clarao = false` quando o dono desenha o clarão noutro ponto. */
  anel(x: number, y: number, n: number, vel: number, fase = 0, vestir?: (b: Tiro) => void, clarao = true): void {
    for (let i = 0; i < n; i++) if (!this.disparar(x, y, (i / n) * Math.PI * 2 + fase, vel, vestir)) break;
    if (clarao) this.flash.explode(8, x, y);
  }
}
