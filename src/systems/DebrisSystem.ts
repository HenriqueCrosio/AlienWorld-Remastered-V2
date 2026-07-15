import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCROLL_SPEED } from '../config';
import { pickVariant } from '../art';

export type HazardKind = 'asteroid' | 'destroco' | 'mina' | 'sensor';

/**
 * O SENSOR DE PROXIMIDADE — o que faltava na Fase 2.
 *
 * A Fase 2 ficou mais FÁCIL que a Fase 1, e a razão é estrutural: o espaço dela é ABERTO. Sem
 * chão, o corredor não aperta, e todo perigo dela é um perigo que VEM até você (drone, kamikaze,
 * cargueiro) — coisas que se resolvem apontando para a frente e atirando.
 *
 * Faltava um perigo que PUNISSE O CAMINHO. Esta mina não persegue nem atira: ela fica parada e
 * cobra pedágio do espaço em volta dela. Ao passar perto, ela ACORDA, telegrafa e estilhaça em
 * leque — e o leque acerta quem não a matou antes.
 *
 * **A resposta certa é atirar ANTES, e é isso que a torna a peça que faltava.** Ela obriga o
 * jogador a limpar o caminho à frente em vez de só reagir ao que entra na tela, e transforma o
 * espaço aberto — que era a fraqueza da fase — no próprio problema a resolver. É o que o chão
 * fazia na Fase 1, sem chão nenhum.
 */
interface SensorDef {
  /** Raio (px) em que ela ACORDA. */
  radius: number;
  /** Segundos entre acordar e estourar. É o telégrafo — e é a janela para matá-la. */
  fuse: number;
  /** Quantos estilhaços saem do estouro. */
  shards: number;
  /** Velocidade dos estilhaços (px/s). */
  shardSpeed: number;
}

interface HazardDef {
  /** Textura base. As variantes (`asteroid2`, `asteroid3`…) entram sozinhas — ver src/art.ts. */
  texture: string;
  /**
   * Animação de repouso, se houver.
   *
   * A ROCHA NÃO TEM, e isso é uma decisão, não um esquecimento (a mesma do BootScene): pedra não
   * se mexe. Quem pisca aqui são as MÁQUINAS — a mina e o sensor —, e é justamente por serem as
   * únicas coisas piscando no cinturão que elas puxam o olho. Animar a rocha junto apagaria esse
   * contraste e o campo minado viraria ruído uniforme.
   */
  anim?: string;
  /** Vida. Infinity = indestrutível (massa morta: existe para ser contornada). */
  hp: number;
  score: number;
  scale: [number, number];
  /** Giro, em graus/s. O que separa uma pedra à deriva de um sprite colado na tela. */
  spin: [number, number];
  /** Deriva vertical, em px/s. 0 = anda reto. */
  drift: number;
  /** Explode em raio ao morrer, ferindo quem estiver perto? */
  explodes?: boolean;
  /** Sensor de proximidade: acorda e estilhaça sozinha. */
  sensor?: SensorDef;
}

/**
 * O cinturão da Fase 2.
 *
 * - `asteroid` rocha à deriva. DESTRUTÍVEL — e é essa a diferença com a Fase 1.
 *              Na superfície o obstáculo se DESVIA (o pico é indestrutível); no vácuo ele
 *              se ABATE. O mesmo verbo do run'n'gun, agora aplicado ao cenário.
 * - `destroco` os restos da SUA frota. Indestrutível: metal morto, grande demais para abater.
 *              É o cemitério — ele não é um alvo, é um lugar.
 * - `mina`     estática e frágil. Explode em RAIO ao morrer: matar de perto te mata junto.
 *              Num campo aberto é o que devolve a tensão que o chão dava na Fase 1 —
 *              puro controle de espaço (docs/GDD.md §6).
 */
const HAZARDS: Record<HazardKind, HazardDef> = {
  asteroid: { texture: 'asteroid', hp: 3, score: 15, scale: [0.7, 1.9], spin: [-40, 40], drift: 10 },

  // O destroço usa a arte `destroco` — casco RASGADO à deriva, sem base nenhuma.
  //
  // Antes ele reaproveitava a `wreck` da Fase 1, e isso estava errado de um jeito que se vê
  // na hora: aquela é uma nave CAÍDA, desenhada assentada no chão da lua (fundo achatado, meio
  // enterrada na rocha). No vácuo ela ficava boiando com uma base reta embaixo, como se houvesse
  // um chão invisível — o único objeto da fase que denunciava que não estava no lugar dele.
  destroco: { texture: 'destroco', hp: Infinity, score: 0, scale: [0.9, 1.6], spin: [-12, 12], drift: 5 },

  mina: { texture: 'mina', anim: 'mina-pulse', hp: 1, score: 30, scale: [1, 1], spin: [-90, 90], drift: 0, explodes: true },

  // A MINA SENSORA. Gira devagar (é uma máquina paciente, não um detrito), e o giro lento é o
  // que a separa da `mina` comum num relance — junto com a antena e o olho de escaneamento.
  //
  // 3 de vida: mais que a mina comum de propósito. Ela precisa custar UM COMPROMISSO — atirar
  // nela é parar de atirar em outra coisa. Com 1 de vida, matá-la de raspão seria acidente, e
  // um perigo que se resolve por acidente não ensina nada.
  sensor: {
    texture: 'sensorMine',
    anim: 'sensor-idle',
    hp: 3,
    score: 75,
    scale: [1, 1],
    spin: [-22, 22],
    drift: 3,
    sensor: { radius: 46, fuse: 0.7, shards: 8, shardSpeed: 105 },
  },
};

/** Raio (px) em que a mina fere ao explodir. Generoso o bastante para ENSINAR, não para punir. */
export const MINE_BLAST_RADIUS = 30;

/**
 * Obstáculos que FLUTUAM.
 *
 * O TerrainSystem é ancorado no chão por construção (origem na base, y = GROUND_Y). No vácuo
 * não há chão: o destroço nasce em qualquer altura, gira e deriva. São dois sistemas porque
 * são duas físicas — tentar generalizar um no outro só produziria um `if (temChão)` em cada
 * método.
 */
export class DebrisSystem {
  readonly hazards: Phaser.Physics.Arcade.Group;

  /**
   * O pool de projéteis INIMIGO — é dele que saem os estilhaços da mina sensora.
   *
   * Compartilhar o pool não é economia: é o que faz o estilhaço ser, para o resto do jogo,
   * exatamente um tiro inimigo. Ele acerta o jogador pelo mesmo overlap, e MORRE NA ROCHA pelo
   * mesmo overlap — então um destroço entre você e a mina te protege dos estilhaços dela, de
   * graça e sem uma linha de código a mais. O cenário é cobertura (docs/HANDOFF.md).
   */
  private readonly bullets: Phaser.Physics.Arcade.Group;

  /**
   * O clarão do estouro. É uma CALLBACK, e não um evento da cena, de propósito.
   *
   * `scene.events` sobrevive ao restart da cena: um `.on()` dentro do `create()` empilharia mais
   * um ouvinte a cada morte do jogador, e na terceira partida a mesma explosão seria desenhada
   * três vezes. A callback morre junto com o sistema, que é exatamente o tempo de vida certo.
   */
  private readonly onBlast: (x: number, y: number) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    bullets: Phaser.Physics.Arcade.Group,
    onBlast: (x: number, y: number) => void,
  ) {
    this.hazards = scene.physics.add.group({ allowGravity: false });
    this.bullets = bullets;
    this.onBlast = onBlast;
  }

  spawn(kind: HazardKind): void {
    const def = HAZARDS[kind];

    // Nasce em qualquer altura: é o vácuo, não há linha do chão a respeitar.
    // A faixa evita o HUD no topo e a borda de baixo.
    const y = Phaser.Math.Between(30, GAME_HEIGHT - 24);

    const texture = pickVariant(this.scene, def.texture);
    const h = this.hazards.create(GAME_WIDTH + 40, y, texture) as Phaser.Physics.Arcade.Sprite;

    // A animação SÓ toca na variante BASE. Numa variante ela trocaria a textura pelos quadros da
    // base — e a segunda mina sensora viraria a primeira no primeiro frame (é a mesma armadilha
    // das variantes de inimigo: ver src/art.ts).
    if (texture === def.texture && def.anim && this.scene.anims.exists(def.anim)) {
      h.play(def.anim);
      // Fase sorteada: um campo minado inteiro piscando em UNÍSSONO parece um objeto só piscando,
      // e a ilusão de que cada mina é uma máquina independente morre na hora.
      h.anims.setProgress(Math.random());
    }

    h.setData('kind', kind);
    h.setData('hp', def.hp);
    h.setData('score', def.score);

    h.setScale(Phaser.Math.FloatBetween(...def.scale));
    // Espelhar metade dobra a variedade de graça.
    h.setFlipX(Math.random() < 0.5);

    const body = h.body as Phaser.Physics.Arcade.Body;
    // Hitbox derivada da arte e um pouco justa: no vácuo o jogador passa RENTE aos destroços,
    // e uma caixa inflada num sprite com transparência de sobra mata sem encostar.
    body.setSize(h.width * 0.7, h.height * 0.7);
    body.setAllowGravity(false);

    // `reset()` sincroniza posição E posição-anterior. Sem ele o Arcade lê a diferença como
    // movimento no primeiro frame — foi o que fazia os props da Fase 1 flutuarem.
    body.reset(h.x, h.y);

    // Depois do reset, porque ele zera a velocidade.
    h.setVelocityX(-SCROLL_SPEED);
    if (def.drift > 0) h.setVelocityY(Phaser.Math.FloatBetween(-def.drift, def.drift));

    // Giro pelo CORPO, não por tween: um tween em `angle` briga com o Arcade no mesmo frame.
    body.setAngularVelocity(Phaser.Math.FloatBetween(...def.spin));

    // -1 = adormecida. O pavio só passa a contar quando o jogador chega perto.
    if (def.sensor) h.setData('fuse', -1);
  }

  /** A mina explode ao morrer — quem estiver perto leva junto. */
  explodesOnDeath(h: Phaser.Physics.Arcade.Sprite): boolean {
    return HAZARDS[h.getData('kind') as HazardKind].explodes === true;
  }

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    // Snapshot: `destroy()` no meio da iteração encurta o array vivo e pula o vizinho.
    for (const obj of [...this.hazards.getChildren()]) {
      const h = obj as Phaser.Physics.Arcade.Sprite;
      if (!h.active) continue;

      const def = HAZARDS[h.getData('kind') as HazardKind];
      if (def.sensor) this.updateSensor(h, def.sensor, dt, target);

      // Sai por qualquer borda: com deriva vertical, o destroço também escapa por cima e
      // por baixo, e um sprite girando fora da tela para sempre é um vazamento.
      if (h.x < -50 || h.y < -60 || h.y > GAME_HEIGHT + 60) h.destroy();
    }
  }

  /**
   * A mina ACORDA, conta e estoura.
   *
   * O pavio é a mecânica inteira, e ele é curto (0.7s) de propósito: é tempo de MATAR a mina —
   * não de fugir dela. Fugir de um leque que nasce em volta de você é impossível quando você já
   * está dentro do raio; a saída é o gatilho. Um pavio longo daria a saída errada (recuar) e a
   * mina viraria um estorvo que se contorna, que é exatamente o que a fase já tem demais.
   *
   * ⚠️ **Ela NÃO estilhaça quando é ABATIDA** (ver `GameScene.killHazard`) — só quando o pavio
   * chega ao fim. Se atirar nela também cuspisse o leque, atirar e não atirar dariam no mesmo, e
   * a única decisão que a peça oferece deixaria de existir.
   */
  private updateSensor(
    h: Phaser.Physics.Arcade.Sprite,
    def: SensorDef,
    dt: number,
    target: Phaser.Physics.Arcade.Sprite,
  ): void {
    const fuse = h.getData('fuse') as number;

    // Adormecida: só o raio a acorda.
    if (fuse < 0) {
      const dist = Phaser.Math.Distance.Between(h.x, h.y, target.x, target.y);
      if (dist > def.radius) return;

      h.setData('fuse', def.fuse);
      // O sacudir da câmera é o aviso periférico: o jogador está olhando para a frente da nave,
      // não para a mina que entrou no raio dela por baixo.
      this.scene.cameras.main.shake(60, 0.002);
      return;
    }

    const left = fuse - dt;
    h.setData('fuse', left);

    // PISCA — a mesma gramática de telégrafo da torre, da canhoneira e do flak. setTint, e nunca
    // setTintFill: o branco sólido apagaria a arte e a mina viraria um disco branco.
    h.setTint(Math.floor(left * 24) % 2 === 0 ? 0xffffff : COLORS.enemyBright);

    if (left <= 0) this.detonate(h, def);
  }

  /** O ESTOURO: um anel de estilhaços. Eles são tiros inimigos — inclusive para o cenário. */
  private detonate(h: Phaser.Physics.Arcade.Sprite, def: SensorDef): void {
    const { x, y } = h;

    // O ângulo inicial é sorteado: um anel sempre alinhado do mesmo jeito vira um padrão
    // decorado, e o jogador passaria a saber de cor onde ficam os buracos dele.
    const offset = Phaser.Math.FloatBetween(0, Math.PI * 2);

    for (let i = 0; i < def.shards; i++) {
      const angle = offset + (i / def.shards) * Math.PI * 2;

      const s = this.bullets.get(x, y) as Phaser.Physics.Arcade.Sprite | null;
      if (!s) break;

      s.setActive(true).setVisible(true);
      s.body!.enable = true;
      // O pool é compartilhado: um slot que já foi bola de fogo do chefão continuaria ardendo.
      s.anims.stop();

      s.setTexture('bolt2').setScale(0.9).setTint(COLORS.hotBright);
      s.setRotation(angle);
      // A CARÊNCIA de 16px contra o cenário mede a distância desde AQUI. Sem `ox`/`oy`, a conta
      // vira NaN e o estilhaço atravessa a rocha que devia tê-lo parado (docs/HANDOFF.md).
      s.setData('ox', x);
      s.setData('oy', y);
      s.setData('flak', false);

      s.setVelocity(Math.cos(angle) * def.shardSpeed, Math.sin(angle) * def.shardSpeed);
    }

    // O clarão é da CENA (é ela que tem o Fx). O sistema avisa que estourou e não sabe — nem
    // precisa saber — quem desenha o quê.
    this.onBlast(x, y);
    this.scene.cameras.main.shake(140, 0.006);

    h.destroy();
  }
}
