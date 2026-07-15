import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { pickVariant } from '../art';

export type EnemyKind = 'drone' | 'batedor' | 'canhoneira' | 'kamikaze' | 'cargueiro';

interface EnemyDef {
  texture: string;
  /** Animação de voo, se houver. */
  anim?: string;
  hp: number;
  speed: number;
  /** Amplitude da senóide, em px. 0 = voa reto. */
  wave: number;
  /** Segundos entre tiros. 0 = não atira. */
  fireRate: number;
  score: number;
  scale: number;
  tint: number;
  /**
   * Aceleração (px/s²) na direção do jogador. 0 = não persegue.
   * É o que faz o kamikaze CAÇAR em vez de atravessar a tela.
   */
  homing: number;
  /** Cospe este inimigo a cada `spawnRate` segundos. O cargueiro é uma fábrica com casco. */
  spawns?: EnemyKind;
  spawnRate: number;
}

/**
 * CADA INIMIGO TEM A SUA SILHUETA.
 *
 * Antes eram dois sprites para cinco inimigos: o batedor era o drone com outra cor, o kamikaze
 * também, e o cargueiro era a canhoneira ampliada em 1.9×. Em teoria isso era economia elegante
 * (o tint já dizia que o comportamento era outro). **Na prática, não dizia.**
 *
 * Num shmup o jogador não LÊ a tela, ele reconhece formas na periferia enquanto olha para o que
 * está atirando nele. Cor é o segundo canal, não o primeiro — e um kamikaze que MERGULHA em cima
 * de você e um drone que atravessa a tela em linha reta pedem reações opostas. Se os dois têm o
 * mesmo contorno, a decisão só existe depois de o jogador ter comparado as cores, e nesse tempo
 * o kamikaze já bateu.
 *
 * Agora a FORMA é o primeiro canal, e ela anuncia o verbo:
 *
 *   drone       casco de inseto, reto      → atravessa. Ignore, ou limpe.
 *   batedor     asas em flecha, magro      → rápido, em senóide.
 *   kamikaze    ESPETO na proa             → vem em cima de você. Atire NELE.
 *   canhoneira  casco pesado, canhão       → para e mira. Saia da linha.
 *   cargueiro   barriga com HANGAR aberto  → não atira: PARE. Prioridade de alvo.
 *
 * A cor continua reforçando (o kamikaze é quente, o cargueiro é escuro) — só não trabalha mais
 * sozinha.
 */
const DEFS: Record<EnemyKind, EnemyDef> = {
  drone: { texture: 'enemyDrone', anim: 'drone-fly', hp: 2, speed: 70, wave: 0, fireRate: 0, score: 25, scale: 1, tint: 0xffffff, homing: 0, spawnRate: 0 },

  // BATEDOR: sprite PRÓPRIO (asas em flecha). O tint fica só como reforço — a silhueta já
  // separa ele do drone antes de a cor ser lida.
  batedor: { texture: 'enemyScout', anim: 'scout-fly', hp: 2, speed: 95, wave: 28, fireRate: 0, score: 40, scale: 0.85, tint: 0xffc8dc, homing: 0, spawnRate: 0 },

  canhoneira: { texture: 'enemyGunship', anim: 'gunship-fly', hp: 6, speed: 40, wave: 0, fireRate: 1.6, score: 100, scale: 1, tint: 0xffffff, homing: 0, spawnRate: 0 },

  // KAMIKAZE: entra devagar e ACELERA em cima de você. Frágil de propósito — a resposta
  // certa é atirar nele, não fugir, e 2 de vida garante que a arma base dê conta.
  //
  // O sprite dele tem um ESPETO na proa. É a arma dele desenhada no casco: o jogador entende que
  // aquilo vem para bater antes de ele ter começado a acelerar. O tint quente foi ABRANDADO
  // (0xff8c1a → 0xffb066) porque a arte agora carrega a leitura — o laranja chapado apagava o
  // espeto, que é justamente a parte que informa.
  kamikaze: { texture: 'enemyKamikaze', anim: 'kamikaze-fly', hp: 2, speed: 45, wave: 0, fireRate: 0, score: 60, scale: 1, tint: 0xffb066, homing: 150, spawnRate: 0 },

  // CARGUEIRO: lento, gordo e cheio de vida. Não atira — o perigo dele é o que ele CUSPE.
  // Ignorá-lo enche a tela de drones; é a definição de prioridade de alvo (docs/GDD.md §6).
  //
  // Sprite PRÓPRIO, e com o hangar aberto na barriga — de onde os drones saem de verdade. Antes
  // era a canhoneira esticada a 1.9×, o que além de repetir a forma BORRAVA a grade de pixel
  // (escala fracionária em pixel art). Nativo a 60px, ele agora vai a 1.1× e a grade fica de pé.
  cargueiro: { texture: 'enemyCarrier', anim: 'carrier-fly', hp: 24, speed: 20, wave: 0, fireRate: 0, score: 300, scale: 1.1, tint: 0xb9a8d8, homing: 0, spawns: 'drone', spawnRate: 1.5 },
};

export class EnemySystem {
  readonly enemies: Phaser.Physics.Arcade.Group;
  readonly enemyBullets: Phaser.Physics.Arcade.Group;

  constructor(private readonly scene: Phaser.Scene) {
    this.enemies = scene.physics.add.group({ allowGravity: false });
    this.enemyBullets = scene.physics.add.group({
      defaultKey: 'bolt2',
      maxSize: 64,
      allowGravity: false,
    });
  }

  /** `x` só é passado quando um inimigo PARE outro (o cargueiro cospe drones de dentro de si). */
  spawn(kind: EnemyKind, y: number, x = GAME_WIDTH + 16): void {
    const def = DEFS[kind];

    const texture = pickVariant(this.scene, def.texture);
    const e = this.enemies.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;

    // A animação só existe para a variante BASE. Tocá-la numa variante trocaria a textura
    // pelos quadros da base — e a variedade que acabamos de ganhar iria embora.
    if (texture === def.texture && def.anim && this.scene.anims.exists(def.anim)) {
      e.play(def.anim);
    }

    e.setVelocityX(-def.speed);
    e.setScale(def.scale);
    e.setTint(def.tint);

    // Todos os sprites são gerados apontando para a DIREITA. O inimigo vem na sua direção,
    // então normalmente é só espelhar.
    //
    // O PERSEGUIDOR é a exceção: ele aponta para onde VOA, e isso se faz girando o sprite.
    // Girar um sprite já espelhado inverte duas vezes — o nariz do kamikaze apontaria para
    // trás justamente enquanto ele mergulha em cima do jogador.
    e.setFlipX(def.homing === 0);

    if (def.homing > 0) {
      // Teto de velocidade: sem ele a aceleração integra para sempre e o kamikaze vira um
      // projétil impossível de acompanhar depois de duas voltas na tela.
      (e.body as Phaser.Physics.Arcade.Body).setMaxVelocity(190, 190);
    }

    // Hitbox derivada da textura, não fixa: a arte real (32/48px) entra sem recalibrar,
    // e um sprite com muito espaço transparente em volta não vira uma hitbox inflada.
    e.body!.setSize(e.width * 0.6, e.height * 0.55);

    e.setData('kind', kind);
    e.setData('hp', def.hp);
    e.setData('score', def.score);
    // Guardado para restaurar depois do flash branco de dano.
    e.setData('tint', def.tint);
    e.setData('baseY', y);
    e.setData('t', Phaser.Math.FloatBetween(0, Math.PI * 2));
    // Espera antes do PRIMEIRO tiro: uma canhoneira não dispara no frame em que aparece.
    e.setData('cooldown', Phaser.Math.FloatBetween(1.2, 2.0));
    e.setData('charging', 0);
    // Espera antes de cuspir o primeiro drone: um cargueiro não pare no frame em que entra.
    e.setData('spawnCd', def.spawnRate > 0 ? def.spawnRate : 0);
  }

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    // SNAPSHOT do grupo. `getChildren()` devolve o array vivo: o cargueiro ACRESCENTA a ele
    // (cospe drones) e o culling REMOVE dele, os dois no meio da iteração. Percorrer o array
    // vivo enquanto ele muda de tamanho pula elementos — um inimigo perderia um frame de update
    // por causa do vizinho que morreu.
    for (const obj of [...this.enemies.getChildren()]) {
      const e = obj as Phaser.Physics.Arcade.Sprite;
      if (!e.active) continue;

      const def = DEFS[e.getData('kind') as EnemyKind];

      if (def.wave > 0) {
        const t = (e.getData('t') as number) + dt * 3;
        e.setData('t', t);
        e.y = (e.getData('baseY') as number) + Math.sin(t) * def.wave;
      }

      if (def.homing > 0) this.updateChaser(e, def, target);
      if (def.fireRate > 0) this.updateGunner(e, def, dt, target);
      if (def.spawns) this.updateCarrier(e, def, dt);

      // O perseguidor passa RETO pelo jogador e volta — culpa da inércia, e é o que o torna
      // legível. Se ele fosse morto ao cruzar a borda esquerda, um kamikaze que errou sumiria
      // no meio da curva de volta. Ele só morre bem longe da tela.
      const limite = def.homing > 0 ? -120 : -24;
      if (e.x < limite) e.destroy();
    }

    this.cullBullets();
  }

  /**
   * KAMIKAZE: acelera na direção do jogador, todo frame.
   *
   * Por ACELERAÇÃO, não por velocidade direta. Apontar a velocidade para o alvo faria um
   * inimigo grudado nele, impossível de despistar e chato de matar; acelerar dá INÉRCIA —
   * ele mergulha, erra, faz a curva e volta. É a inércia que transforma perseguição em padrão.
   */
  private updateChaser(
    e: Phaser.Physics.Arcade.Sprite,
    def: EnemyDef,
    target: Phaser.Physics.Arcade.Sprite,
  ): void {
    const body = e.body as Phaser.Physics.Arcade.Body;

    const angle = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y);
    body.setAcceleration(Math.cos(angle) * def.homing, Math.sin(angle) * def.homing);

    // O nariz aponta para onde ele VOA (não para o alvo): é o vetor de velocidade que o
    // jogador precisa ler para saber se ainda dá tempo de sair da frente.
    e.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
  }

  /** CARGUEIRO: cospe drones enquanto estiver na tela. Fora dela, seria um spawn invisível. */
  private updateCarrier(e: Phaser.Physics.Arcade.Sprite, def: EnemyDef, dt: number): void {
    if (e.x > GAME_WIDTH) return;

    const cd = (e.getData('spawnCd') as number) - dt;

    if (cd > 0) {
      e.setData('spawnCd', cd);
      return;
    }

    e.setData('spawnCd', def.spawnRate);
    // Nasce NO HANGAR — a boca acesa na BARRIGA do cargueiro, que agora existe na arte. Antes o
    // drone saía do meio do casco (±8px do centro), e parecia atravessar o metal; sair por baixo,
    // de onde a luz vaza, é a diferença entre um inimigo LARGADO e um inimigo teletransportado.
    this.spawn(def.spawns!, e.y + Phaser.Math.Between(4, 14), e.x - 6);
  }

  /**
   * A canhoneira PISCA antes de atirar — mesmo princípio da torre de solo.
   *
   * O problema nunca foi o tiro ser mirado: foi ele ser INVISÍVEL. Mira sem aviso não dá
   * ao jogador nada a que reagir. Com o telégrafo, o tiro mirado vira uma pergunta
   * ("sai da linha agora") em vez de um imposto.
   */
  private updateGunner(
    e: Phaser.Physics.Arcade.Sprite,
    def: EnemyDef,
    dt: number,
    target: Phaser.Physics.Arcade.Sprite,
  ): void {
    const charging = e.getData('charging') as number;

    if (charging > 0) {
      const left = charging - dt;
      e.setData('charging', left);
      // setTint, NÃO setTintFill — ver TerrainSystem: tintFill apaga a arte e o inimigo vira
      // um retângulo branco.
      e.setTint(Math.floor(left * 30) % 2 === 0 ? 0xffd0d0 : 0xff6060);

      if (left <= 0) {
        e.setTint(e.getData('tint') as number);
        this.fireAt(e, target);
      }
      return;
    }

    const cd = (e.getData('cooldown') as number) - dt;

    if (cd <= 0) {
      e.setData('cooldown', def.fireRate);
      e.setData('charging', EnemySystem.TELEGRAPH);
    } else {
      e.setData('cooldown', cd);
    }
  }

  private static readonly TELEGRAPH = 0.45;

  /** Tiro MIRADO: pune quem fica parado, que é a função da canhoneira. */
  private fireAt(e: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite): void {
    const b = this.enemyBullets.get(e.x, e.y) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) {
      if (import.meta.env.DEV) console.warn('[inimigos] pool cheio, tiro descartado');
      return;
    }

    b.setActive(true).setVisible(true);
    b.body!.enable = true;

    // Mesmo sprite do jogador, tingido de MAGENTA. A cor é o que separa "meu tiro" de
    // "tiro que me mata" — a forma não precisa mudar, e assim não custa geração nenhuma.
    b.setTexture('bolt2').setScale(0.8).setTint(0xff3a78);
    // Origem: usada para a carência contra o relevo (ver GameScene).
    b.setData('ox', e.x);
    b.setData('oy', e.y);

    const angle = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y);
    b.setVelocity(Math.cos(angle) * 110, Math.sin(angle) * 110);
    b.setRotation(angle);
  }

  /**
   * Quantos deste tipo estão vivos.
   *
   * Existe para o chefão: uma Capitânia que larga interceptadores a cada ciclo, sem teto,
   * satura a tela em um minuto — e aí o jogador não morre pela luta, morre pelo acúmulo.
   */
  countOf(kind: EnemyKind): number {
    return this.enemies.getChildren().filter((e) => {
      const s = e as Phaser.Physics.Arcade.Sprite;
      return s.active && s.getData('kind') === kind;
    }).length;
  }

  release(b: Phaser.Physics.Arcade.Sprite): void {
    b.setActive(false).setVisible(false);
    b.body!.enable = false;
    b.setVelocity(0, 0);
    // O pool é compartilhado (drones, torres, chefão). Parar a animação evita que um tiro
    // de drone reaproveite o slot e continue tocando a chama do chefão.
    b.anims.stop();
    // E o GIRO: a cápsula de flak da Capitânia roda no ar (setAngularVelocity). Sem zerar aqui,
    // o próximo projétil a herdar este slot sai do cano RODOPIANDO — um traçante que gira não
    // aponta para onde vai, e apontar para onde vai é a única informação que ele carrega.
    (b.body as Phaser.Physics.Arcade.Body).setAngularVelocity(0);
  }

  private cullBullets(): void {
    for (const obj of this.enemyBullets.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (!b.active) continue;
      if (b.x < -8 || b.x > GAME_WIDTH + 8 || b.y < -8 || b.y > GAME_HEIGHT + 8) this.release(b);
    }
  }
}
