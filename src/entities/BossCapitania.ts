import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { EnemySystem } from '../systems/EnemySystem';
import type { StageBoss } from './Boss';

/** Uma bateria do casco: de onde sai o tiro, medido a partir do CENTRO do sprite. */
interface Battery {
  x: number;
  y: number;
  /** Direção central do disparo, em graus. 180 = para a esquerda (o jogador). */
  angle: number;
}

/** Um tempo do ciclo: o que ela faz, e em que segundo do compasso. */
interface Beat {
  at: number;
  run: (target: Phaser.Physics.Arcade.Sprite) => void;
}

/** Uma granada no ar, contando para estourar. */
interface Flak {
  shell: Phaser.Physics.Arcade.Sprite;
  fuse: number;
}

/**
 * CANHONEIRA-CAPITÂNIA — chefão da Fase 2 (Frota Morta).
 *
 * ELA NÃO ENSINA NADA NOVO: ela COBRA o que a fase ensinou.
 *
 * Os interceptadores kamikaze que perseguiram o jogador a fase inteira **saem de dentro dela** —
 * é o hangar deles. Isso dá origem ao inimigo (ele deixa de ser "um bicho do nível 2" e passa a
 * ter uma procedência) e transforma o faseamento numa preparação para a luta.
 *
 * ─── O RITMO É A IDENTIDADE ───
 *
 * A Torre da Fase 1 é um METRÔNOMO: um leque a cada 1.9s, sempre igual. Você lê o padrão e se
 * posiciona. Copiar essa gramática aqui daria dois chefões com o mesmo verbo — só que um é maior.
 *
 * A Capitânia é um NAVIO: **salva e silêncio**. Uma bordada rolante varre o casco de proa a
 * ponte, e depois vem uma pausa longa de recarga.
 *
 * O silêncio não é generosidade — é ESTRUTURA. É nele que o jogador caça os kamikazes que ela
 * acabou de largar. Sem pausa, largar interceptadores no meio de um fogo contínuo seria ruído
 * injusto, e a mecânica inteira morreria.
 *
 * ─── DUAS FASES, DOIS SKILL SETS ───
 *
 *  inteira (100–50%)  salva rolante + 2 kamikazes. A luta se ENSINA.
 *  fúria    (<50%)    onda mais rápida + 3 kamikazes + BARRAGEM DE FLAK + rajada mirada.
 *
 * O flak só aparece na fúria de propósito. Ele pergunta "onde você VAI estar" (a granada estoura
 * num ponto, não te acerta em movimento) — uma pergunta diferente da onda, e cara demais para
 * cobrar antes de o jogador saber ler a onda. Chefão com dois padrões competindo por atenção
 * desde o primeiro segundo não é difícil, é ilegível.
 */
export class BossCapitania implements StageBoss {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  private hp: number;
  private readonly maxHp: number;
  private t = 0;
  private entering = true;
  private dead = false;

  /** Relógio do COMPASSO (não da luta): volta a zero a cada ciclo. */
  private cycleT = 0;
  private beatIdx = 0;
  private wasEnraged = false;

  /** Granadas no ar. Precisam ser cronometradas — o pool de projéteis não sabe estourar. */
  private flak: Flak[] = [];

  private readonly bullets: Phaser.Physics.Arcade.Group;
  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly bar: Phaser.GameObjects.Rectangle;
  /** UM emissor, reaproveitado. Criar um por tiro vaza memória (já custou caro duas vezes). */
  private readonly muzzleFx: Phaser.GameObjects.Particles.ParticleEmitter;

  private static readonly BASE_Y = GAME_HEIGHT / 2 - 6;
  private static readonly STATION_X = GAME_WIDTH - 62;
  private static readonly ENTRY_SPEED = 40;

  /** Teto de interceptadores vivos. Sem ele, o acúmulo mata o jogador — não a luta. */
  private static readonly MAX_KAMIKAZES = 5;

  /**
   * As três baterias, a partir do CENTRO do sprite (112×64).
   *
   * Espalhadas pelo CASCO de propósito: é a distância entre elas que transforma três rajadas
   * pequenas numa ONDA rolando. Juntas no mesmo ponto, seriam um leque só — a Torre outra vez.
   */
  private static readonly BATTERIES: Battery[] = [
    { x: -46, y: -2, angle: 180 }, // proa — aponta reto em você
    { x: -22, y: 14, angle: 200 }, // ventral — corta o caminho de baixo
    { x: 2, y: -24, angle: 160 }, // ponte — corta o de cima
  ];

  /** Hangar: de onde os interceptadores saem. Atrás da proa, na barriga do casco. */
  private static readonly HANGAR = { x: -30, y: 20 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: EnemySystem,
    hp = 150,
  ) {
    this.hp = hp;
    this.maxHp = hp;
    this.bullets = enemies.enemyBullets;

    this.sprite = scene.physics.add.sprite(GAME_WIDTH + 90, BossCapitania.BASE_Y, 'capitania');

    // ELA RESPIRA. Um chefão parado é um adesivo, e um adesivo de 112px no meio da tela denuncia
    // que aquilo é uma imagem, não um navio. As luzes das baterias piscando e os motores pulsando
    // são o que dizem que ela está VIVA e com energia — e é contra uma coisa viva que se luta.
    if (scene.anims.exists('capitania-idle')) this.sprite.play('capitania-idle');

    this.body.setAllowGravity(false);
    this.body.setSize(this.sprite.width * 0.8, this.sprite.height * 0.7);
    this.sprite.setData('boss', this);

    // Entra deslizando POR VELOCIDADE — nunca por tween de posição. Um tween em `sprite.x` não
    // move um corpo Arcade: o corpo reescreve a posição no mesmo frame, e o chefão fica PARADO
    // FORA DA TELA atirando (foi exatamente o bug da Torre — docs/HANDOFF.md).
    this.body.setVelocityX(-BossCapitania.ENTRY_SPEED);

    this.muzzleFx = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 180,
        speed: { min: 20, max: 100 },
        scale: { start: 2.2, end: 0 },
        tint: [COLORS.hotBright, COLORS.hot],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(50);

    this.barBg = scene.add.rectangle(GAME_WIDTH / 2, 16, 160, 4, COLORS.enemyDark).setDepth(100);
    this.bar = scene.add
      .rectangle(GAME_WIDTH / 2 - 80, 16, 160, 4, COLORS.enemyBright)
      .setOrigin(0, 0.5)
      .setDepth(101);
  }

  get isDead(): boolean {
    return this.dead;
  }

  private get enraged(): boolean {
    return this.hp <= this.maxHp / 2;
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  // ─── O COMPASSO ─────────────────────────────────────────────────────────────

  /** Duração do ciclo. O que sobra depois do último tempo é o SILÊNCIO — e ele é a mecânica. */
  private get cycleLength(): number {
    return this.enraged ? 3.4 : 4.2;
  }

  /**
   * A partitura do ciclo.
   *
   * INTEIRA (4.2s): larga 2 kamikazes → a onda varre o casco (0.8s…1.4s) → **2.8s de silêncio**.
   * FÚRIA   (3.4s): larga 3 → onda mais apertada → BARRAGEM DE FLAK → rajada mirada → 1.3s.
   *
   * A pausa encolhe na fúria mas NUNCA some: sem ela o jogador não tem quando matar os
   * interceptadores, e a luta deixa de ser uma luta e vira uma maré.
   */
  private get beats(): Beat[] {
    const [b0, b1, b2] = BossCapitania.BATTERIES;

    if (!this.enraged) {
      return [
        { at: 0.0, run: () => this.launch(2) },
        // A ONDA: proa → ventral → ponte, 0.3s entre elas. Rolando pelo casco, ela varre um
        // lado por vez — então SEMPRE existe um lado seguro, se você chegar nele a tempo.
        { at: 0.8, run: () => this.burst(b0, 3, 26) },
        { at: 1.1, run: () => this.burst(b1, 3, 26) },
        { at: 1.4, run: () => this.burst(b2, 3, 26) },
      ];
    }

    return [
      { at: 0.0, run: () => this.launch(3) },
      { at: 0.5, run: () => this.burst(b0, 4, 34) },
      { at: 0.7, run: () => this.burst(b1, 4, 34) },
      { at: 0.9, run: () => this.burst(b2, 4, 34) },
      // O flak entra DEPOIS da onda, não junto: dois padrões no mesmo instante não se leem.
      { at: 1.5, run: (target) => this.flakVolley(target) },
      { at: 2.1, run: (target) => this.aimed(target) },
    ];
  }

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    if (this.dead) return;

    // Chegou à posição de combate: freia e a luta começa.
    if (this.entering) {
      if (this.sprite.x > BossCapitania.STATION_X) return;

      this.body.setVelocityX(0);
      this.entering = false;
    }

    this.t += dt;
    this.tickFlak(dt);

    // Deriva vertical LENTA e larga: ela é pesada. Um navio capital que balança rápido parece
    // um drone grande. A velocidade PERSEGUE a altura desejada em vez de ser a derivada dela —
    // integrar a derivada acumula erro e o chefão deriva para fora da altura de repouso.
    const targetY = BossCapitania.BASE_Y + Math.sin(this.t * 0.5) * 34;
    this.body.setVelocityY((targetY - this.sprite.y) * 4);

    // Virar a fúria REINICIA o compasso. Sem isto, a partitura nova é lida a partir do tempo
    // em que a antiga estava — e os primeiros tempos dela (o lançamento!) seriam pulados.
    if (this.enraged !== this.wasEnraged) {
      this.wasEnraged = this.enraged;
      this.cycleT = 0;
      this.beatIdx = 0;
      this.scene.cameras.main.flash(180, 232, 48, 107);
    }

    this.cycleT += dt;

    const partitura = this.beats;
    while (this.beatIdx < partitura.length && partitura[this.beatIdx].at <= this.cycleT) {
      partitura[this.beatIdx].run(target);
      this.beatIdx++;
    }

    if (this.cycleT >= this.cycleLength) {
      this.cycleT = 0;
      this.beatIdx = 0;
    }
  }

  // ─── Os ataques ─────────────────────────────────────────────────────────────

  /**
   * O HANGAR ABRE: interceptadores saem de dentro dela.
   *
   * É o mesmo kamikaze da fase — o jogador já sabe que a resposta é ATIRAR, não fugir. O chefão
   * não introduz a mecânica, ele a cobra num momento em que a sua atenção já está comprada.
   */
  private launch(count: number): void {
    const vivos = this.enemies.countOf('kamikaze');
    const cabe = Math.min(count, BossCapitania.MAX_KAMIKAZES - vivos);
    if (cabe <= 0) return;

    const hx = this.sprite.x + BossCapitania.HANGAR.x;
    const hy = this.sprite.y + BossCapitania.HANGAR.y;

    // Clarão no hangar: o lançamento tem que ser TELEGRAFADO. Um kamikaze que aparece do nada
    // atrás de você é injusto; um que você viu sair da barriga dela é uma escolha sua.
    this.muzzleFx.explode(10, hx, hy);
    this.scene.cameras.main.shake(90, 0.003);

    for (let i = 0; i < cabe; i++) {
      this.scene.time.delayedCall(i * 180, () => {
        if (this.dead) return;
        this.enemies.spawn('kamikaze', hy + Phaser.Math.Between(-10, 10), hx);
      });
    }
  }

  /**
   * RAJADA de uma bateria: 3–4 traçantes em sequência rápida, não um leque instantâneo.
   *
   * A sequência é o que soa NAVAL. Um leque que nasce inteiro no mesmo frame é uma parede;
   * uma rajada que sai tiro a tiro é uma arma sendo disparada — e dá ao olho o tempo de ver
   * DE ONDE ela veio, que é a informação de que o jogador precisa para circular o casco.
   */
  private burst(battery: Battery, count: number, spread: number): void {
    const base = Phaser.Math.DegToRad(battery.angle);

    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(i * 90, () => {
        if (this.dead) return;

        const m = this.muzzleOf(battery);
        const t = count === 1 ? 0 : i / (count - 1) - 0.5;
        this.tracer(m.x, m.y, base + Phaser.Math.DegToRad(t * spread));
        this.muzzleFx.explode(4, m.x, m.y);
      });
    }

    this.scene.cameras.main.shake(60, 0.003);
  }

  /**
   * TRAÇANTE: um traço magenta, rápido. NÃO é a bola de fogo da Torre.
   *
   * O projétil é metade da identidade de um chefão. Reaproveitar o `comet-burn` fazia a
   * Capitânia atirar exatamente o que a Torre atirava — e dois chefões que cospem a mesma coisa
   * são o mesmo chefão com outro casco.
   */
  private tracer(x: number, y: number, angle: number): void {
    const b = this.bullets.get(x, y) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;

    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    // O pool é compartilhado: um slot que já tocou o `comet-burn` continuaria em chamas.
    b.anims.stop();

    b.setTexture('bolt2').setScale(1.5).setTint(COLORS.enemyBright);
    b.setFlipX(false);
    b.setRotation(angle);
    b.setData('ox', x);
    b.setData('oy', y);
    b.setData('flak', false);

    b.setVelocity(Math.cos(angle) * 145, Math.sin(angle) * 145);
  }

  /**
   * BARRAGEM DE FLAK — só na fúria.
   *
   * ─── A CÁPSULA É PROJETADA NUM PONTO, NÃO NUMA DIREÇÃO ───
   *
   * A primeira versão cuspia quatro granadas num leque fixo a partir da proa: um ângulo, uma
   * velocidade, e pronto. Isso tinha um defeito fatal para um ataque de área — **era um padrão
   * decorável**. As granadas saíam sempre nos mesmos quatro ângulos, então depois de dois ciclos
   * o jogador sabia de cor onde ficavam os corredores vazios, e "desviar do futuro" virava
   * "lembrar do passado". Um leque fixo não nega espaço nenhum: ele desenha o mesmo mapa toda vez.
   *
   * Agora a Capitânia **escolhe um PONTO da tela** e ARREMESSA a cápsula até lá. A velocidade é
   * calculada a partir do destino (`(alvo − boca) / tempo`), e não o contrário. O ponto é
   * sorteado a cada tiro — então a barragem cai num lugar diferente toda vez, e a única leitura
   * possível é a que a gente QUER que o jogador faça: **olhar para onde a cápsula está indo.**
   *
   * O sorteio é ENVIESADO para a metade em que o jogador está (`bias`), e isso é a diferença
   * entre uma ameaça e um enfeite: pontos puramente aleatórios cairiam no vazio quase sempre, o
   * jogador aprenderia a ignorar a barragem inteira, e o ataque custaria uma animação por nada.
   * O viés é PARCIAL, nunca mira: uma cápsula que persegue não se desvia, ela se sofre.
   *
   * O tempo de voo é o telégrafo, e a cápsula ainda PISCA antes de estourar. É o estouro que
   * mata — a cápsula em si é só o aviso viajando.
   */
  private flakVolley(target: Phaser.Physics.Arcade.Sprite): void {
    const m = this.muzzleOf(BossCapitania.BATTERIES[0]);

    // TRÊS cápsulas, não quatro. Cada uma agora nega uma ÁREA (o estouro tem raio), e três áreas
    // sorteadas cobrem mais tela do que quatro linhas paralelas — sem virar uma parede sólida,
    // que seria injusto num ataque que o jogador não pode abater.
    for (let i = 0; i < 3; i++) {
      const shell = this.bullets.get(m.x, m.y) as Phaser.Physics.Arcade.Sprite | null;
      if (!shell) return;

      // O PONTO. Sorteado na tela toda, mas puxado para perto da altura do jogador.
      const bias = Phaser.Math.FloatBetween(0.35, 0.7);
      const alvoY = Phaser.Math.Linear(
        Phaser.Math.Between(24, GAME_HEIGHT - 16),
        target.y,
        bias,
      );
      // Nunca à direita do casco dela: uma cápsula arremessada para trás de si mesma sairia da
      // tela sem nunca chegar ao ponto, e o jogador veria a Capitânia atirando para o nada.
      const alvoX = Phaser.Math.Between(40, Math.min(GAME_WIDTH - 70, this.sprite.x - 40));

      // Tempo de voo FIXO: é ele que o jogador aprende a ler. Com tempo variável, a mesma
      // distância daria pressas diferentes e não haveria o que aprender.
      const voo = Phaser.Math.FloatBetween(1.1, 1.35);

      shell.setActive(true).setVisible(true);
      shell.body!.enable = true;
      shell.anims.stop();

      // A cápsula com a LUZ DO PAVIO piscando. Sem a animação (arte ainda não instalada), ela cai
      // na granada redonda desenhada em runtime — o jogo nunca quebra por falta de asset.
      if (this.scene.anims.exists('flak-arm')) {
        shell.play('flak-arm');
        shell.anims.setProgress(Math.random());
      } else {
        shell.setTexture(this.scene.textures.exists('flakShell') ? 'flakShell' : 'flak');
      }

      shell.setScale(1).clearTint();
      shell.setRotation(0);
      shell.setData('ox', m.x);
      shell.setData('oy', m.y);
      shell.setData('flak', true);

      // A VELOCIDADE SAI DO DESTINO. É isto que faz dela uma cápsula PROJETADA num ponto, e não
      // um tiro numa direção: ela chega onde foi mandada, no segundo em que o pavio termina.
      shell.setVelocity((alvoX - m.x) / voo, (alvoY - m.y) / voo);

      // Ela GIRA no ar. Um cilindro que viaja sem rodar parece um adesivo — e o giro também
      // separa a cápsula (que estoura) do traçante (que só passa) num relance.
      (shell.body as Phaser.Physics.Arcade.Body).setAngularVelocity(
        Phaser.Math.Between(-220, 220),
      );

      this.flak.push({ shell, fuse: voo });
    }

    this.muzzleFx.explode(8, m.x, m.y);
  }

  /**
   * Conta os pavios e estoura o que chegou a zero.
   *
   * A granada some da lista se alguém a matou antes (o cenário absorve tiro inimigo, e o
   * destroço é cobertura no vácuo) — daí o filtro por `active`: sem ele, um estilhaço nasceria
   * de um projétil que já voltou para o pool e foi reciclado por outro tiro.
   */
  private tickFlak(dt: number): void {
    if (this.flak.length === 0) return;

    const vivos: Flak[] = [];

    for (const f of this.flak) {
      if (!f.shell.active || f.shell.getData('flak') !== true) continue;

      f.fuse -= dt;

      // Pisca antes de estourar — a mesma gramática de telégrafo da torre e da canhoneira.
      if (f.fuse <= 0.35) {
        f.shell.setTint(Math.floor(f.fuse * 30) % 2 === 0 ? 0xffffff : COLORS.hotBright);
      }

      if (f.fuse > 0) {
        vivos.push(f);
        continue;
      }

      this.detonate(f.shell);
    }

    this.flak = vivos;
  }

  /**
   * O ESTOURO — e é DELE que saem os estilhaços.
   *
   * A cápsula não fere ninguém: ela é o telégrafo viajando. Quem mata é o anel que nasce no ponto
   * onde ela morreu. É por isso que o ataque pergunta "onde você VAI estar" — o perigo aparece
   * DEPOIS, e no lugar que a cápsula passou 1,2s anunciando.
   *
   * O anel é rodado por um ângulo SORTEADO. Alinhado sempre igual, oito estilhaços deixam oito
   * corredores nos mesmos lugares — e um ataque de negação de área com buracos decorados não nega
   * área nenhuma.
   */
  private detonate(shell: Phaser.Physics.Arcade.Sprite): void {
    const { x, y } = shell;

    this.enemies.release(shell);

    // O clarão vem ANTES dos estilhaços saírem, e é grande: o olho tem que ser puxado para o
    // ponto do estouro no frame em que ele acontece, senão o anel parece ter vindo do nada.
    this.muzzleFx.explode(22, x, y);
    this.scene.cameras.main.shake(110, 0.005);

    const shards = 8;
    const offset = Phaser.Math.FloatBetween(0, Math.PI * 2);

    for (let i = 0; i < shards; i++) {
      const angle = offset + (i / shards) * Math.PI * 2;

      const s = this.bullets.get(x, y) as Phaser.Physics.Arcade.Sprite | null;
      if (!s) return;

      s.setActive(true).setVisible(true);
      s.body!.enable = true;
      s.anims.stop();

      s.setTexture('bolt2').setScale(0.9).setTint(COLORS.hotBright);
      s.setRotation(angle);
      s.setData('ox', x);
      s.setData('oy', y);
      s.setData('flak', false);

      // Estilhaço é RÁPIDO (a cápsula é que era lenta). O perigo do flak é o instante do estouro:
      // um anel arrastado seria só mais uma nuvem para contornar, e o ataque perderia o susto.
      s.setVelocity(Math.cos(angle) * 96, Math.sin(angle) * 96);
    }
  }

  /** Tiro mirado: pune quem fica parado. Só na fúria — antes disso, ela é só padrão. */
  private aimed(target: Phaser.Physics.Arcade.Sprite): void {
    const m = this.muzzleOf(BossCapitania.BATTERIES[0]);
    const angle = Phaser.Math.Angle.Between(m.x, m.y, target.x, target.y);

    // Rajada de 3 levemente abertas: uma bala mirada só se esquiva andando de lado; três abrem
    // a pergunta "para que lado".
    for (const d of [-7, 0, 7]) this.tracer(m.x, m.y, angle + Phaser.Math.DegToRad(d));

    this.muzzleFx.explode(6, m.x, m.y);
  }

  private muzzleOf(b: Battery): { x: number; y: number } {
    return { x: this.sprite.x + b.x, y: this.sprite.y + b.y };
  }

  // ─── Dano ───────────────────────────────────────────────────────────────────

  /** @returns true se este dano matou o chefão. */
  damage(amount: number): boolean {
    // Invulnerável enquanto desliza para dentro da tela — senão dá para matá-la ANTES DE ELA
    // APARECER, atirando no vazio à direita (constatado no playtest da Torre).
    if (this.dead || this.entering) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.bar.width = 160 * (this.hp / this.maxHp);

    // setTint, e NÃO setTintFill: `tintFill` pinta o sprite de branco sólido e apaga a arte.
    // Num casco de 112px apanhando vários tiros por segundo, ela viraria um borrão branco.
    this.sprite.setTint(0xffa0a0);
    this.scene.time.delayedCall(60, () => !this.dead && this.sprite.clearTint());

    if (this.hp > 0) return false;

    this.dead = true;
    this.body.setVelocity(0, 0);

    // As granadas no ar morrem com ela. Uma barragem que estoura DEPOIS do chefão morto mata o
    // jogador na tela de vitória — e não há nada mais barato de evitar.
    for (const f of this.flak) {
      if (f.shell.active) this.enemies.release(f.shell);
    }
    this.flak = [];

    return true;
  }

  destroy(): void {
    this.sprite.destroy();
    this.bar.destroy();
    this.barBg.destroy();
    this.muzzleFx.destroy();
  }
}
