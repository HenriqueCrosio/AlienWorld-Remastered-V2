import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCROLL_SPEED } from '../config';
import { pickVariant } from '../art';

/** Linha do solo. Tudo aqui é ANCORADO nela — nada flutua. */
export const GROUND_Y = GAME_HEIGHT - 10;

export type PropKind = 'spire' | 'building' | 'turret' | 'base' | 'silo' | 'radar' | 'wreck';

interface PropDef {
  /** Vida. Infinity = indestrutível (rocha: existe para ser desviada). */
  hp: number;
  score: number;
  /** Atira no jogador? */
  shoots: boolean;
  /**
   * Animação em laço, se houver. Só toca na variante BASE — numa variante, a animação
   * substituiria a textura pelos quadros da base e a variedade sumiria.
   *
   * A colônia é MORTA, mas não apagada: janelas piscando e um radar girando são o que
   * fazem uma ruína parecer uma ruína, e não um cenário de papelão.
   */
  anim?: string;
}

/**
 * A colônia da Fase 1. Rocha, construções, silos, antenas, destroços — e as torres que atiram.
 * Sortear entre eles é o que faz a superfície parecer um LUGAR, e não um corredor de obstáculos.
 */
const PROPS: Record<PropKind, PropDef> = {
  spire: { hp: Infinity, score: 0, shoots: false },
  building: { hp: 8, score: 60, shoots: false, anim: 'building-lights' },
  turret: { hp: 5, score: 150, shoots: true, anim: 'turret-idle' },
  base: { hp: 16, score: 250, shoots: false, anim: 'base-lights' },
  silo: { hp: 6, score: 90, shoots: false },
  radar: { hp: 4, score: 120, shoots: false, anim: 'radar-scan' },
  wreck: { hp: Infinity, score: 0, shoots: false },
};

/**
 * Obstáculos da superfície.
 *
 * Asteroides flutuando sobre um planeta não fazem sentido (constatado no playtest).
 * O que a superfície pede é relevo: picos de rocha, construções da colônia e torres
 * fixas. São os canos do flappy virando terreno — o DNA do v2, agora coerente.
 *
 * - `spire`    rocha. INDESTRUTÍVEL: existe para ser desviada, não abatida.
 * - `building` estrutura da colônia. Destrutível, dá pontos.
 * - `turret`   canhão de solo. Mira em você. Destrutível — e é prioridade de alvo.
 */
export class TerrainSystem {
  readonly props: Phaser.Physics.Arcade.Group;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemyBullets: Phaser.Physics.Arcade.Group,
  ) {
    this.props = scene.physics.add.group({ allowGravity: false, immovable: true });
  }

  spawn(kind: PropKind): void {
    // Sorteia entre as variantes: um relevo com um pico só é um padrão, não uma paisagem.
    const texture = pickVariant(this.scene, kind);
    const p = this.props.create(
      GAME_WIDTH + 30,
      GROUND_Y,
      texture,
    ) as Phaser.Physics.Arcade.Sprite;

    // Origem na BASE: o prop cresce a partir do chão, seja qual for a altura.
    p.setOrigin(0.5, 1);
    p.setData('kind', kind);

    const def = PROPS[kind];

    // Anima só a variante base (ver PropDef).
    if (def.anim && texture === kind && this.scene.anims.exists(def.anim)) {
      p.play(def.anim);
      // Fase aleatória: sem isto, TODAS as janelas da colônia piscam em uníssono — o que
      // não é uma colônia, é um letreiro.
      p.anims.setProgress(Math.random());
    }
    p.setData('hp', def.hp);
    p.setData('score', def.score);

    // Só a rocha varia de altura: é ela que define o corredor, e é a altura variável que dá
    // ritmo ao flap. Construção esticada parece construção derretida.
    if (kind === 'spire') p.setScale(1, Phaser.Math.FloatBetween(0.55, 1.25));

    if (def.shoots) {
      // Primeiro tiro demora: a torre não pode disparar no instante em que entra na tela.
      p.setData('cooldown', Phaser.Math.FloatBetween(1.6, 2.8));
      p.setData('charging', 0);
    }

    const body = p.body as Phaser.Physics.Arcade.Body;

    // O corpo físico precisa acompanhar a escala, senão a hitbox mente.
    body.setSize(p.width * 0.6, p.height);
    body.setOffset(p.width * 0.2, 0);

    // `reset()`, e NÃO `updateFromGameObject()`.
    //
    // O grupo cria o sprite ancorado pelo CENTRO; só depois trocamos a origem para a base.
    // `updateFromGameObject()` reposiciona o corpo mas NÃO atualiza a posição anterior que ele
    // guarda — e no frame seguinte o Arcade lê essa diferença como MOVIMENTO e puxa o sprite
    // para cima. Era isso que fazia picos, torres e prédios FLUTUAREM.
    // `reset()` sincroniza posição e posição-anterior de uma vez.
    body.reset(p.x, p.y);

    // Depois do reset, porque ele zera a velocidade.
    p.setVelocityX(-SCROLL_SPEED);
  }

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    for (const obj of this.props.getChildren()) {
      const p = obj as Phaser.Physics.Arcade.Sprite;
      if (!p.active) continue;

      if (PROPS[p.getData('kind') as PropKind].shoots) this.updateTurret(p, dt, target);
      if (p.x < -40) p.destroy();
    }
  }

  /**
   * A torre PISCA antes de atirar.
   *
   * Tiro mirado sem aviso é injusto por definição: o jogador não pode reagir ao que
   * não vê chegar. O telégrafo é o que separa "difícil" de "sacanagem".
   */
  private updateTurret(
    p: Phaser.Physics.Arcade.Sprite,
    dt: number,
    target: Phaser.Physics.Arcade.Sprite,
  ): void {
    const charging = p.getData('charging') as number;

    if (charging > 0) {
      const left = charging - dt;
      p.setData('charging', left);
      // Pisca durante a carga.
      // setTint, NÃO setTintFill: `tintFill` pinta o sprite inteiro de branco sólido e a torre
      // vira um QUADRADO BRANCO. `setTint` multiplica a cor — a torre esquenta sem sumir.
      p.setTint(Math.floor(left * 30) % 2 === 0 ? 0xffd0d0 : 0xff6060);

      if (left <= 0) {
        p.clearTint();
        this.fireAt(p, target);
      }
      return;
    }

    const cd = (p.getData('cooldown') as number) - dt;

    // Só mira quando está na tela E o jogador ainda está à sua frente: uma torre que
    // já passou não deve atirar pelas costas.
    if (cd <= 0 && p.x < GAME_WIDTH - 10 && p.x > target.x) {
      p.setData('cooldown', TerrainSystem.TURRET_RATE);
      p.setData('charging', TerrainSystem.TELEGRAPH);
    } else {
      p.setData('cooldown', cd);
    }
  }

  private static readonly TURRET_RATE = 2.4;
  private static readonly TELEGRAPH = 0.4;

  private fireAt(p: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite): void {
    // Boca do cano, FORA do corpo da torre — senão o tiro colide com ela mesma.
    const muzzleX = p.x - 14;
    const muzzleY = p.y - p.displayHeight + 4;

    const b = this.enemyBullets.get(muzzleX, muzzleY) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;

    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    b.setTexture('bolt2').setScale(0.8).setTint(0xff3a78);
    b.setData('ox', muzzleX);
    b.setData('oy', muzzleY);

    const angle = Phaser.Math.Angle.Between(muzzleX, muzzleY, target.x, target.y);
    b.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);
    b.setRotation(angle);

    this.scene.cameras.main.shake(30, 0.001);
  }
}
