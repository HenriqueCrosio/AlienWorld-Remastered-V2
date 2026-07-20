import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCROLL_SPEED } from '../config';
import { pickVariant } from '../art';

/** Linha do solo. Tudo aqui é ANCORADO nela — nada flutua. */
export const GROUND_Y = GAME_HEIGHT - 10;

/**
 * Linha do TETO (Fase 4, o interior). O espelho de GROUND_Y: o interior do Leviatã é a
 * primeira fase FECHADA POR CIMA, e um obstáculo pode nascer pendurado nela.
 */
export const TETO_Y = 10;

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

  /**
   * A fumaça de exaustão dos mísseis das torres. UM emissor para o sistema inteiro, criado no
   * construtor e reaproveitado por todos os mísseis — nunca um por tiro (armadilha nº 5).
   * Serve também de sopro de lançamento (explode na boca do cano).
   */
  private readonly smokeFx: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemyBullets: Phaser.Physics.Arcade.Group,
  ) {
    this.props = scene.physics.add.group({ allowGravity: false, immovable: true });

    // Fumaça que NASCE pequena e clara e MORRE grande e sumida — é o que o olho conhece de
    // exaustão. Uma pitada de brasa (hot) no meio dos cinzas vende o motor queimando.
    // 'puff' (sopro redondo), NUNCA 'spark': o quadrado 2×2 escalado com blend normal aparecia
    // como CAIXAS soltas na boca do cano a cada disparo (bug visual apontado pelo Henrique).
    this.smokeFx = scene.add.particles(0, 0, 'puff', {
      lifespan: { min: 240, max: 420 },
      speed: { min: 3, max: 14 },
      scale: { start: 0.5, end: 1.3 },
      alpha: { start: 0.5, end: 0 },
      tint: [0xcfd6dd, 0x8b939c, 0xff8c1a],
      emitting: false,
    });
  }

  /**
   * `anchor: 'teto'` pendura o prop na linha do teto, de cabeça para baixo (Fase 4 — o
   * interior é fechado por cima). ⚠️ Só props que NÃO atiram: a boca do cano da torre é
   * calculada para ela estar de pé (`updateTurret`/`fireAt` medem para CIMA).
   *
   * `alturaPx` crava a altura visível do prop (em px de tela) — é o que permite ao roteiro
   * montar um CORREDOR com vão garantido: duas alturas sorteadas de forma independente podem
   * somar uma parede impassável.
   *
   * `tint` veste o prop para o LUGAR (F4: a rocha branco-gelo da lua dentro do Leviatã escuro
   * gritava fora da paleta). ⚠️ Vale só para prop INDESTRUTÍVEL: o flash de dano dá clearTint
   * e devolveria a cor crua.
   */
  spawn(
    kind: PropKind,
    opts?: { anchor?: 'chao' | 'teto'; alturaPx?: number; tint?: number },
  ): void {
    const teto = opts?.anchor === 'teto';

    // Sorteia entre as variantes: um relevo com um pico só é um padrão, não uma paisagem.
    const texture = pickVariant(this.scene, kind);
    const p = this.props.create(
      GAME_WIDTH + 30,
      teto ? TETO_Y : GROUND_Y,
      texture,
    ) as Phaser.Physics.Arcade.Sprite;

    // Origem na BASE: o prop cresce a partir do chão — ou, no teto, a partir dele para baixo
    // (origem no topo + flipY: uma estalactite é um pico de cabeça para baixo).
    p.setOrigin(0.5, teto ? 0 : 1);
    p.setFlipY(teto);
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

    // Altura CRAVADA pelo roteiro (corredores da F4): sobrepõe o sorteio acima.
    if (opts?.alturaPx !== undefined) p.setScale(1, opts.alturaPx / p.height);
    if (opts?.tint !== undefined) p.setTint(opts.tint);

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

      // `!p.flipY`: prop de TETO não atira — a boca do cano é medida para a torre DE PÉ
      // (fireAt mira para cima). Guarda dura: um roteiro que pendurar uma torre por engano
      // ganha uma torre muda, não um tiro nascendo do lugar errado.
      if (PROPS[p.getData('kind') as PropKind].shoots && !p.flipY) this.updateTurret(p, dt, target);
      if (p.x < -40) p.destroy();
    }

    this.tickMissileTrails();
  }

  /**
   * A fumaça sai da CAUDA de cada míssil vivo, uma partícula por frame — recuada 8px pelo
   * ângulo do sprite, senão o rastro nasce em cima do nariz e o míssil voa "dentro" dele.
   * Um emissor só para todos (ver construtor); a marca `missile` é apagada pelo
   * EnemySystem.release() quando o slot volta ao pool.
   */
  private tickMissileTrails(): void {
    for (const obj of this.enemyBullets.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (!b.active || b.getData('missile') !== true) continue;

      this.smokeFx.emitParticleAt(
        b.x - Math.cos(b.rotation) * 8,
        b.y - Math.sin(b.rotation) * 8,
      );
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

    // MÍSSIL — mas só na LEITURA. Os números de balanceamento são os MESMOS do traçante que
    // ele substitui (fechados pelo Henrique): mesma velocidade (100), mesma mira reta no
    // jogador (NÃO teleguiado), mesma cadência (TURRET_RATE) e o mesmo dano por contato (o
    // pool e o overlap são os mesmos). O que mudou: sprite alongado girado na direção do voo
    // ('missile' — placeholder do BootScene; a arte do PixelLab entra com esta chave) e a
    // fumaça de exaustão emitida no update().
    // Escala 0.8: o Henrique achou o foguete GRANDE demais saindo de uma torre pequena — a arte
    // nova (30×11) a 0.8 vira ~24×9 na tela, proporcional à boca que o lança.
    b.setTexture('missile').setScale(0.8).clearTint();
    b.setData('missile', true);

    // A HITBOX também é a de antes, em px de MUNDO: 10×7. O setSize é em px LOCAIS e o corpo
    // escala junto com o sprite — com a escala visual 0.8, compensa-se dividindo por ela.
    // O release() do pool desfaz isto ao reciclar o slot.
    b.body!.setSize(10 / 0.8, 7 / 0.8);

    b.setData('ox', muzzleX);
    b.setData('oy', muzzleY);

    const angle = Phaser.Math.Angle.Between(muzzleX, muzzleY, target.x, target.y);
    b.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);
    b.setRotation(angle);

    // Sopro de lançamento na boca do cano — o arco estético ficou de fora de propósito:
    // curvar a trajetória mudaria o tempo-até-o-jogador, e esse número está fechado.
    this.smokeFx.explode(6, muzzleX, muzzleY);

    this.scene.cameras.main.shake(30, 0.001);
  }
}
