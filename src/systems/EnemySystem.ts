import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { pickVariant } from '../art';

export type EnemyKind = 'drone' | 'batedor' | 'canhoneira' | 'kamikaze' | 'cargueiro' | 'aranha';

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

  // A ARANHA — o MINI-BOSS do Ato 2 da Fase 3 (roteirizada: evento 'miniboss', uma por fase).
  // Um ANDADOR: entra pisando no casco do Leviatã (o y dela é cravado na linha do casco pelo
  // spawn), ESTACIONA no terço direito e cospe leques de 3 mirados. 50 HP (auditoria): grande
  // o bastante para pesar, curta o bastante para não roubar o clímax da serpente.
  aranha: { texture: 'aranha', anim: 'aranha-walk', hp: 50, speed: 30, wave: 0, fireRate: 2.6, score: 500, scale: 0.62, tint: 0xffffff, homing: 0, spawnRate: 0 },
};

export class EnemySystem {
  readonly enemies: Phaser.Physics.Arcade.Group;
  readonly enemyBullets: Phaser.Physics.Arcade.Group;

  /**
   * Flash de boca dos atiradores COMUNS (canhoneira/drone) — a versão menor do tratamento da
   * Capitânia. UM emissor para o SISTEMA inteiro, criado aqui (armadilha nº 5: nunca um por
   * tiro), na família magenta do inimigo. SEM trail, de propósito: o rastro é assinatura de
   * chefão, e um tiro comum que arrasta cauda rouba essa leitura.
   */
  private readonly muzzleFlash: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly scene: Phaser.Scene) {
    this.enemies = scene.physics.add.group({ allowGravity: false });
    this.enemyBullets = scene.physics.add.group({
      defaultKey: 'bolt2',
      // 128, não 64: a fúria do NÚCLEO (leque de 5 + mirado a cada 1.1s + paredes + 2 drones)
      // somada aos estilhaços de uma mina sensora acordada estourava o teto — e o tiro
      // descartado em silêncio é uma luta mais fácil do que a desenhada.
      maxSize: 128,
      allowGravity: false,
    });

    // O rosa claro é o mesmo do flash de dano do jogador (0xff7aa8) — a família de cor já
    // existe no jogo (é a mesma dupla do tracerFlash da Capitânia, só que mais contida).
    this.muzzleFlash = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 130,
        speed: { min: 20, max: 80 },
        scale: { start: 1.4, end: 0 },
        tint: [0xff7aa8, COLORS.enemyBright],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(40);
  }

  /** `x` só é passado quando um inimigo PARE outro (o cargueiro cospe drones de dentro de si). */
  spawn(kind: EnemyKind, y: number, x = GAME_WIDTH + 16): void {
    const def = DEFS[kind];

    // A aranha ANDA — o y dela não é do roteiro, é da FÍSICA: os pés na linha do casco
    // (a banda `casco` do Parallax tem o topo em ~190; o centro dela assenta em cima).
    if (kind === 'aranha') y = 170;

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

      if (e.getData('kind') === 'aranha') this.updateAranha(e, dt, target);

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

  /** A linha do casco onde a aranha pisa (os pés dela; ver spawn). */
  private static readonly ARANHA_Y = 170;

  /**
   * A ARANHA: anda, estaciona, atira — e PULA (pedido do Henrique: um combo que justifique o
   * corpo dela). O ciclo: entra andando → estaciona no terço direito → leques de 3 (o gunner
   * comum cuida disso) → a cada ~7s, TELEGRAFA (agacha piscando 0.5s), SALTA num arco na
   * direção do jogador (anim 'aranha-jump') e ATERRISSA com um anel radial de 6 tiros + shake.
   * O pulo é a resposta dela a quem acampa na esquerda achando que ela é um canhão fixo.
   */
  private updateAranha(
    e: Phaser.Physics.Arcade.Sprite,
    dt: number,
    target: Phaser.Physics.Arcade.Sprite,
  ): void {
    const body = e.body as Phaser.Physics.Arcade.Body;
    const estado = (e.getData('aranhaEstado') as string) ?? 'chao';

    if (estado === 'chao') {
      // Estaciona ao chegar no terço direito (um mini-boss que atravessa e some seria uma
      // canhoneira gorda; parada, ela nega o lado direito — prioridade de alvo, GDD §6).
      if (e.x <= 306 && body.velocity.x < 0) e.setVelocityX(0);

      const cd = ((e.getData('puloCd') as number) ?? 6) - dt;
      e.setData('puloCd', cd);
      if (cd <= 0 && body.velocity.x === 0) {
        e.setData('aranhaEstado', 'telegrafo');
        e.setData('aranhaT', 0.5);
      }
      return;
    }

    if (estado === 'telegrafo') {
      const t = (e.getData('aranhaT') as number) - dt;
      e.setData('aranhaT', t);
      e.setTint(Math.floor(t * 20) % 2 === 0 ? 0xffd0d0 : 0xff6060);
      if (t <= 0) {
        e.setTint(e.getData('tint') as number);
        e.setData('aranhaEstado', 'ar');
        // O salto MIRA o lado do jogador, mas com teto de alcance — pular para fora da tela
        // (ou para cima do rodapé esquerdo, encurralando) não é ataque, é sumiço.
        const alvoX = Phaser.Math.Clamp(target.x + 40, 150, 300);
        const vx = (alvoX - e.x) / 1.1; // ~1.1s de voo
        e.setVelocity(vx, -190);
        body.setAccelerationY(360); // a "gravidade" do salto — só existe no ar
        if (this.scene.anims.exists('aranha-jump')) e.play('aranha-jump');
      }
      return;
    }

    // No AR: cai de volta na linha do casco e ATERRISSA.
    if (e.y >= EnemySystem.ARANHA_Y && body.velocity.y > 0) {
      e.setY(EnemySystem.ARANHA_Y);
      e.setVelocity(0, 0);
      body.setAccelerationY(0);
      e.setData('aranhaEstado', 'chao');
      e.setData('puloCd', Phaser.Math.FloatBetween(6, 8));
      if (this.scene.anims.exists('aranha-walk')) e.play('aranha-walk');

      // O ANEL da aterrissagem: 6 tiros radiais. É o novo combo — o pulo não é fuga, é área.
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + Math.PI / 12;
        const b = this.enemyBullets.get(e.x, e.y - 6) as Phaser.Physics.Arcade.Sprite | null;
        if (!b) break;
        b.setActive(true).setVisible(true);
        b.body!.enable = true;
        b.setTexture('bolt2').setScale(0.8).setTint(0xff3a78);
        b.setBlendMode(Phaser.BlendModes.ADD);
        b.setData('ox', e.x);
        b.setData('oy', e.y);
        b.setVelocity(Math.cos(ang) * 105, Math.sin(ang) * 105);
        b.setRotation(ang);
      }
      this.muzzleFlash.explode(8, e.x, e.y + 16);
      this.scene.cameras.main.shake(110, 0.005);
    }
  }

  /**
   * Tiro MIRADO: pune quem fica parado, que é a função da canhoneira.
   * A ARANHA cospe um LEQUE de 3 (±13°) — mini-boss cobra área, não linha.
   */
  private fireAt(e: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite): void {
    const centro = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y);
    const angulos =
      e.getData('kind') === 'aranha'
        ? [centro - Phaser.Math.DegToRad(13), centro, centro + Phaser.Math.DegToRad(13)]
        : [centro];

    for (const angle of angulos) {
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
      // Leve GLOW aditivo: energia, não palito rosa chapado. Só o blend — sem trail e sem
      // escala anisotrópica, que são o figurino do traçante da Capitânia. O release() abaixo
      // devolve o blend NORMAL ao reciclar o slot.
      b.setBlendMode(Phaser.BlendModes.ADD);
      // Origem: usada para a carência contra o relevo (ver GameScene).
      b.setData('ox', e.x);
      b.setData('oy', e.y);

      b.setVelocity(Math.cos(angle) * 110, Math.sin(angle) * 110);
      b.setRotation(angle);
    }

    // Pequeno clarão na BOCA, na cor do dono: o disparo vira um evento legível — o telégrafo
    // piscou, e AQUI está a prova de que o tiro saiu (e de onde).
    this.muzzleFlash.explode(3, e.x, e.y);
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
    const body = b.body as Phaser.Physics.Arcade.Body;
    body.setAngularVelocity(0);

    // E o CORPO: o cometa da Torre usa um círculo (só a bola fere, não a cauda), o míssil da
    // torre de solo e o traçante da Capitânia usam retângulos próprios. Devolve o retângulo
    // padrão do pool (o quadro do `bolt2`, como o slot nasce) — senão um tiro de drone herda a
    // hitbox de quem usou o slot antes.
    const frame = this.scene.textures.getFrame('bolt2');
    body.setSize(frame.realWidth, frame.realHeight, false);
    body.setOffset(0, 0);

    // E o RESTO do figurino: o blend aditivo do traçante e as marcas de trilha. Sem apagar,
    // um tiro comum sairia brilhando — e os emissores de trilha (Capitânia/Terrain) seguiriam
    // um slot reciclado.
    b.setBlendMode(Phaser.BlendModes.NORMAL);
    b.setData('tracer', false);
    b.setData('missile', false);
  }

  private cullBullets(): void {
    for (const obj of this.enemyBullets.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (!b.active) continue;
      if (b.x < -8 || b.x > GAME_WIDTH + 8 || b.y < -8 || b.y > GAME_HEIGHT + 8) this.release(b);
    }
  }
}
