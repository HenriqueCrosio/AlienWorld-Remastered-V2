import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Starfield } from '../Starfield';
import { resetVariantCache, pickVariant } from '../art';
import { pixelText } from '../ui';
import { Music } from '../systems/Music';
import type { HandlingMode } from './GameScene';

/**
 * A TELA-TÍTULO — "O DESPERTAR".
 *
 * Não é mais um quadro parado: é um DIORAMA que compõe camadas (fundo sem criatura + o Leviatã
 * canônico animado por cima + atmosfera em engine + UI) e ACORDA numa cinemática curta que
 * assenta num loop de repouso. Qualquer tecla pula a abertura; `prefers-reduced-motion` vai
 * direto ao repouso.
 *
 * O fundo é um DIORAMA composto em CAMADAS com a arte do próprio jogo (estrelas, nebulosa, a lua
 * morta e bandas de montanha) — nada de placa pintada. Cada sprite passa pela guarda
 * `textures.exists`, e o starfield é procedural: o jogo nunca abre numa tela preta.
 */
export class MenuScene extends Phaser.Scene {
  // Público: a sonda lê `settled`.
  settled = false;

  // Posição e escala de REPOUSO do Leviatã. `settle()` precisa do X para reancorar a criatura
  // quando a abertura é PULADA no meio do deslize de entrada — sem isto ela fica presa fora do
  // lugar (até 40px à esquerda).
  private static readonly LEVI_X = 150;
  private static readonly LEVI_Y = 78;
  private static readonly LEVI_SCALE = 1.6;

  private starfield: Starfield | null = null;
  private leviatan: Phaser.GameObjects.Sprite | null = null;
  private reducedMotion = false;
  private introTweens: Phaser.Tweens.Tween[] = [];
  /** Tudo que a abertura faz surgir (fade de 0→alvo). O `settle` os fixa no alvo. */
  private uiTargets: { obj: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Alpha; alpha: number }[] = [];

  constructor() {
    super('Menu');
  }

  create(): void {
    resetVariantCache();
    this.registerLeviathanAlive();
    this.settled = false;
    this.introTweens = [];
    this.uiTargets = [];
    this.reducedMotion =
      typeof window !== 'undefined' &&
      !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.buildBackground();
    this.buildLeviathan();
    this.buildAtmosphere();
    this.buildUI();

    // A faixa atravessa a transição de cena sem corte (Music.play não reinicia se já toca).
    Music.play(this, 'stage1');

    this.bindKeys();

    if (this.reducedMotion) this.settle();
    else this.playIntro();
  }

  // ─── Camadas ────────────────────────────────────────────────────────────────

  /**
   * O fundo do menu: um DIORAMA composto em CAMADAS com a própria arte do jogo — estrelas à
   * deriva, nebulosa, a lua morta e duas bandas de montanha em profundidade (perspectiva aérea:
   * o que está longe é mais escuro). Sem placa pintada: as camadas casam com o estilo do resto
   * do jogo e dão profundidade de verdade. Cada sprite passa pela guarda `textures.exists`; o
   * starfield é procedural e sempre existe — o menu nunca abre numa tela preta.
   */
  private buildBackground(): void {
    this.starfield = new Starfield(this);
    // No reduced-motion o campo é DESENHADO uma vez (estático) — `update()` não o deriva.
    if (this.reducedMotion) this.starfield.update(0);

    // Nebulosa: manchas grandes e dim no céu, dando cor ao vazio (violeta e petróleo, os tons
    // da nebulosa do jogo — nada que brigue com o ciano do jogador).
    this.addBg('nebula', 306, 44, 1.8, 0x5e4a8c, 0.5, 0);
    this.addBg('nebula2', 64, 30, 2.0, 0x3d6a80, 0.42, 0);
    this.addBg('nebula', 176, 22, 1.5, 0x4a5a8c, 0.3, 0);

    // A LUA MORTA: o foco do céu, no alto à direita — deixa o céu à esquerda livre para o
    // Leviatã. `menuMoon` (arte dedicada) quando existir; senão a lua procedural do Boot.
    const moonKey = this.textures.exists('menuMoon') ? 'menuMoon' : 'moon';
    this.add
      .image(322, 48, moonKey)
      .setName('menuMoon')
      .setDepth(2)
      // Recuada de leve (escala menor, alpha < 1, tint frio): ela é o cenário, o Leviatã é o
      // herói. Uma lua branca-clara demais rouba o olho da criatura.
      .setScale(moonKey === 'menuMoon' ? 0.72 : 1.05)
      .setAlpha(moonKey === 'menuMoon' ? 0.88 : 1)
      .setTint(moonKey === 'menuMoon' ? 0xaab6d4 : 0xffffff);

    // O HORIZONTE em duas bandas de montanha. A profundidade é o TINT: a distante é quase o
    // fundo, a média um degrau mais clara (a mesma perspectiva aérea da Fase 1).
    this.scatterRidge('mtnFar', 156, 0x1a2440, 3, [0.8, 1.15], [42, 74]);
    this.scatterRidge('mtnMid', 176, 0x33456e, 4, [0.7, 1.0], [58, 92]);

    // O TERRENO ESCURO do terço de baixo: a cama onde o texto pousa. Sem ele, os 3 modos de
    // condução competem com a montanha e perdem. Faixa da paleta, translúcida.
    this.add
      .rectangle(0, 150, GAME_WIDTH, GAME_HEIGHT - 150, COLORS.bgDeep, 0.55)
      .setOrigin(0, 0)
      .setDepth(6);

    this.twinkleStars();
  }

  /** Uma mancha de fundo (nebulosa), com guarda de textura. */
  private addBg(key: string, x: number, y: number, scale: number, tint: number, alpha: number, depth: number): void {
    if (!this.textures.exists(key)) return;
    this.add.image(x, y, key).setDepth(depth).setScale(scale).setTint(tint).setAlpha(alpha);
  }

  /**
   * Uma banda de montanha espalhada na horizontal (origem na base, sobre a linha `baseY`).
   * Sprites repetidos com escala/espelho variados e as variantes da arte — um horizonte sem
   * costura. O tint dá a distância. Com guarda: sem a arte, a banda simplesmente não entra.
   */
  private scatterRidge(
    key: string,
    baseY: number,
    tint: number,
    depth: number,
    scale: [number, number],
    gap: [number, number],
  ): void {
    if (!this.textures.exists(key)) return;
    let x = -12;
    while (x < GAME_WIDTH + 24) {
      this.add
        .image(x, baseY, pickVariant(this, key))
        .setOrigin(0.5, 1)
        .setDepth(depth)
        .setTint(tint)
        .setScale(Phaser.Math.FloatBetween(...scale))
        .setFlipX(Math.random() < 0.5);
      x += Phaser.Math.Between(...gap);
    }
  }

  /**
   * O Leviatã VIVO: a estrela do diorama. Sprite animado (`leviathan-alive`) pairando no céu,
   * a lava pulsando. Sem a sheet, o método é um no-op — o menu roda sem a criatura.
   */
  private buildLeviathan(): void {
    if (!this.anims.exists('leviathan-alive')) return;

    // Posto no céu livre, acima do horizonte, à esquerda da lua. Escala calibrada para ele ler
    // IMPONENTE sem cobrir o título (que mora em y≈122).
    this.leviatan = this.add
      .sprite(MenuScene.LEVI_X, MenuScene.LEVI_Y, 'leviathanAliveSheet', 0)
      .setDepth(10)
      .setScale(MenuScene.LEVI_SCALE);
    // No reduced-motion o Leviatã fica no quadro 0 (a lava não pulsa): a anima é a MAIOR motion
    // da cena, e movimento reduzido tem que amansá-la também, não só as partículas.
    if (!this.reducedMotion) this.leviatan.play('leviathan-alive');

    // Um bob vertical lentíssimo — "pairando", não voando. Desligado no reduced-motion.
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: this.leviatan,
        y: '+=4',
        duration: 3200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /**
   * A atmosfera do diorama: brasas subindo (o Leviatã sangra luz), uma névoa baixa no horizonte,
   * e a nave-jogador cruzando ao longe de vez em quando. Puro engine — nada de PixelLab. No
   * reduced-motion, NADA disto entra: a cena fica um quadro parado e legível.
   */
  private buildAtmosphere(): void {
    if (this.reducedMotion) return;

    // Brasas/esporos: fagulhas quentes subindo devagar da faixa baixa, aditivas (viram brilho).
    // Brilham ao nascer e SOMEM ao subir (alpha 0.7→0) — brasa que esfria enquanto flutua.
    this.add
      .particles(0, 0, 'spark', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 150, max: GAME_HEIGHT },
        lifespan: 4200,
        speedY: { min: -14, max: -5 },
        speedX: { min: -4, max: 4 },
        scale: { min: 0.5, max: 1.4 },
        alpha: { start: 0.7, end: 0 },
        tint: [COLORS.hot, COLORS.hotBright, COLORS.player],
        frequency: 320,
        blendMode: 'ADD',
      })
      .setDepth(12);

    // Névoa baixa: uma faixa translúcida bem sutil no horizonte, respirando de leve.
    const nevoa = this.add
      .rectangle(0, 138, GAME_WIDTH, 24, COLORS.bgFar, 0.1)
      .setOrigin(0, 0)
      .setDepth(7);
    this.tweens.add({
      targets: nevoa, alpha: 0.2, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // A nave: primeira passagem depois da abertura, e daí em loop espaçado.
    this.time.delayedCall(4500, () => this.shipPass());
  }

  /**
   * Uma travessia da nave-jogador: entra pela esquerda, cruza o céu ao LONGE (pequena, atrás do
   * Leviatã, com o rastro azul) e sai pela direita. Reagenda a próxima em intervalo amplo —
   * evento pontual, não tráfego.
   */
  private shipPass(): void {
    if (!this.scene.isActive()) return;

    const y = Phaser.Math.Between(52, 72);
    // A `ship` estática (com o rastro azul já desenhado) basta ao longe. Depth 3: atrás do
    // Leviatã (10), à frente das montanhas — uma silhueta minúscula cruzando o céu.
    const nave = this.add.image(-16, y, 'ship').setDepth(3).setScale(0.5).setAlpha(0.8);

    this.tweens.add({
      targets: nave,
      x: GAME_WIDTH + 16,
      duration: Phaser.Math.Between(8000, 11000),
      ease: 'Linear',
      onComplete: () => nave.destroy(),
    });

    this.time.delayedCall(Phaser.Math.Between(12000, 20000), () => this.shipPass());
  }

  /**
   * Título, subtítulo, CTA e conduções — criados JÁ na posição final, com alpha 0. A abertura
   * (ou o `settle`) é quem os revela. Registrados em `uiTargets` com o alpha de repouso de cada um.
   */
  private buildUI(): void {
    const titulo = this.t(GAME_WIDTH / 2, 122, 'ALIEN WORLD', 20, COLORS.playerGlow);
    const sub = this.t(GAME_WIDTH / 2, 139, 'R E M A S T E R E D', 8, COLORS.player);
    const cta = this.t(GAME_WIDTH / 2, 157, 'ENTER · COMEÇAR', 8, COLORS.playerGlow);
    const rot = this.t(GAME_WIDTH / 2, 170, '— CONDUÇÃO —', 7, COLORS.metalLight);
    const c1 = this.t(GAME_WIDTH / 2, 182, '[1]  DIEGÉTICA · a gravidade decide · recomendado', 8, COLORS.playerBright);
    const c2 = this.t(GAME_WIDTH / 2, 194, '[2]  LEGACY · flap sempre · score ×1.25', 8, COLORS.hot);
    const c3 = this.t(GAME_WIDTH / 2, 206, '[3]  LIVRE · voo livre sempre · acessível', 8, COLORS.player);

    for (const obj of [titulo, sub, cta, rot, c1, c2, c3]) {
      obj.setAlpha(0);
      this.uiTargets.push({ obj, alpha: 1 });
    }

    if (import.meta.env.DEV) {
      const d1 = this.t(GAME_WIDTH / 2, 8, '[B] chefão 1  [C] capitânia  [N] serpente  [V] f2  [M] f3', 7, COLORS.metalMid);
      const d2 = this.t(GAME_WIDTH / 2, 16, '[I][O][P][F] cutscenes  [L] f4  [K] núcleo', 7, COLORS.metalMid);
      for (const obj of [d1, d2]) {
        obj.setAlpha(0);
        this.uiTargets.push({ obj, alpha: 1 });
      }
    }
  }

  // ─── Estados: repouso e abertura ─────────────────────────────────────────────

  /** Fixa tudo no estado de repouso, sem animar. É o destino da abertura e do reduced-motion. */
  private settle(): void {
    for (const { obj, alpha } of this.uiTargets) obj.setAlpha(alpha);
    // O título pode ter parado no meio do "baque" (escala > 1) se a abertura foi pulada.
    (this.uiTargets[0]?.obj as Phaser.GameObjects.Text | undefined)?.setScale(1);
    // Idem o Leviatã, que pode ter parado no meio do deslize de entrada — reancora no X de repouso.
    this.leviatan?.setAlpha(1);
    this.leviatan?.setX(MenuScene.LEVI_X);
    this.settled = true;
  }

  /**
   * A ABERTURA — "O DESPERTAR". O diorama já está montado; um VÉU PRETO por cima o REVELA
   * (fade-out ~1s), o Leviatã desliza entrando, o título BATE e a UI surge. Cada tween entra em
   * `introTweens` para o skip poder matá-los; o fecho chama `settle()` + os pulsos de repouso.
   */
  private playIntro(): void {
    // O véu que esconde o diorama montado e some para revelá-lo. Depth 15: acima do fundo e do
    // Leviatã (≤10), abaixo da UI (20) — o texto surge por conta própria, não sob o véu.
    const veu = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bgDeep, 1)
      .setOrigin(0, 0)
      .setDepth(15)
      .setName('introVeu');
    this.introTweens.push(
      this.tweens.add({
        targets: veu,
        alpha: 0,
        duration: 1000,
        ease: 'Cubic.easeOut',
        onComplete: () => veu.destroy(),
      }),
    );

    // O Leviatã desliza entrando e pousa (o bob contínuo já roda por baixo).
    if (this.leviatan) {
      const alvoX = this.leviatan.x;
      this.leviatan.setAlpha(0).setX(alvoX - 40);
      this.introTweens.push(
        this.tweens.add({ targets: this.leviatan, alpha: 1, duration: 900, delay: 900, ease: 'Cubic.easeOut' }),
      );
      this.introTweens.push(
        this.tweens.add({ targets: this.leviatan, x: alvoX, duration: 1500, delay: 900, ease: 'Cubic.easeOut' }),
      );
    }

    // O título BATE (surge com leve overshoot de escala) e o resto da UI surge atrás.
    const titulo = this.uiTargets[0]?.obj as Phaser.GameObjects.Text | undefined;
    if (titulo) {
      titulo.setScale(1.14);
      this.introTweens.push(
        this.tweens.add({ targets: titulo, alpha: 1, duration: 500, delay: 2100, ease: 'Cubic.easeOut' }),
      );
      this.introTweens.push(
        this.tweens.add({ targets: titulo, scale: 1, duration: 600, delay: 2100, ease: 'Back.easeOut' }),
      );
    }
    for (let i = 1; i < this.uiTargets.length; i++) {
      const { obj, alpha } = this.uiTargets[i];
      this.introTweens.push(
        this.tweens.add({ targets: obj, alpha, duration: 500, delay: 2500 + i * 40, ease: 'Cubic.easeOut' }),
      );
    }

    // Fecho: aos ~3.3s o estado montado é oficial (e liga os pulsos de repouso).
    this.time.delayedCall(3300, () => {
      if (!this.settled) {
        this.settle();
        this.startRestPulses();
      }
    });
  }

  /** Os pulsos do estado de repouso: o brilho vivo do título e o pisca-pisca do CTA. */
  private startRestPulses(): void {
    if (this.reducedMotion) return;
    const titulo = this.uiTargets[0]?.obj as Phaser.GameObjects.Text | undefined;
    const cta = this.uiTargets[2]?.obj as Phaser.GameObjects.Text | undefined;
    if (titulo) {
      this.tweens.add({
        targets: titulo, alpha: 0.82, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    if (cta) {
      this.tweens.add({
        targets: cta, alpha: 0.4, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  /** Pula a abertura: mata os tweens em curso, tira o véu e vai ao repouso (com os pulsos). */
  private skipIntro(): void {
    if (this.settled) return;
    for (const tw of this.introTweens) tw.remove();
    this.introTweens = [];
    this.children.getByName('introVeu')?.destroy();
    this.settle();
    this.startRestPulses();
  }

  /**
   * Estrelas que CINTILAM sobre o diorama. Posições a dedo no céu livre (a mesma lógica do menu
   * antigo). Sem custo de animação de pintura — só uma dúzia de pontos piscando.
   */
  private twinkleStars(): void {
    const PONTOS: [number, number][] = [
      [18, 30], [58, 12], [95, 55], [115, 20], [255, 18], [280, 48],
      [310, 14], [370, 22], [375, 105], [250, 100], [70, 85], [30, 110],
    ];
    for (const [x, y] of PONTOS) {
      const estrela = this.add
        .rectangle(x, y, 1, 1, Math.random() < 0.5 ? COLORS.starBright : COLORS.starMid)
        .setDepth(1)
        .setAlpha(0.15);
      if (this.reducedMotion) {
        estrela.setAlpha(0.7);
        continue;
      }
      this.tweens.add({
        targets: estrela,
        alpha: Phaser.Math.FloatBetween(0.6, 1),
        duration: Phaser.Math.Between(900, 2300),
        delay: Phaser.Math.Between(0, 2000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /**
   * Registra a animação do Leviatã vivo UMA vez (a cena recria a cada entrada; `anims.exists`
   * evita o grito de chave repetida). Yoyo: a respiração da lava tem que ser um loop sem salto.
   */
  private registerLeviathanAlive(): void {
    if (this.textures.exists('leviathanAliveSheet') && !this.anims.exists('leviathan-alive')) {
      this.anims.create({
        key: 'leviathan-alive',
        frames: this.anims.generateFrameNumbers('leviathanAliveSheet', { start: 0, end: 8 }),
        frameRate: 6,
        repeat: -1,
        yoyo: true,
      });
    }
  }

  // ─── Teclas ─────────────────────────────────────────────────────────────────

  private bindKeys(): void {
    const kb = this.input.keyboard!;

    // Qualquer tecla durante a abertura pula direto ao menu montado.
    kb.on('keydown', () => {
      if (!this.settled) this.skipIntro();
    });

    kb.on('keydown-ENTER', () => this.start('diegetico'));
    kb.on('keydown-SPACE', () => this.start('diegetico'));
    kb.on('keydown-ONE', () => this.start('diegetico'));
    kb.on('keydown-TWO', () => this.start('flap'));
    kb.on('keydown-THREE', () => this.start('free'));

    if (import.meta.env.DEV) {
      kb.on('keydown-B', () => this.scene.start('Game', { handling: 'diegetico', practice: true }));
      kb.on('keydown-V', () => this.scene.start('Game', { stage: 2, handling: 'diegetico' }));
      kb.on('keydown-C', () =>
        this.scene.start('Game', { stage: 2, handling: 'diegetico', practice: true }),
      );
      kb.on('keydown-M', () => this.scene.start('Game', { stage: 3, handling: 'diegetico' }));
      kb.on('keydown-N', () =>
        this.scene.start('Game', { stage: 3, handling: 'diegetico', practice: true }),
      );
      kb.on('keydown-I', () =>
        this.scene.start('Interlude', { score: 4820, handling: 'diegetico' }),
      );
      kb.on('keydown-O', () =>
        this.scene.start('Interlude2', {
          score: 9140,
          handling: 'diegetico',
          ship: 'cinza',
          stage: 3,
        }),
      );
      kb.on('keydown-L', () =>
        this.scene.start('Game', { stage: 4, handling: 'diegetico', ship: 'alien' }),
      );
      kb.on('keydown-K', () =>
        this.scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }),
      );
      kb.on('keydown-P', () =>
        this.scene.start('Interlude3', {
          score: 15200,
          handling: 'diegetico',
          ship: 'alien',
          stage: 4,
        }),
      );
      kb.on('keydown-F', () =>
        this.scene.start('Interlude4', {
          score: 21000,
          handling: 'diegetico',
          ship: 'alien',
          stage: null,
          stageDone: 4,
          practice: false,
          baseScore: 15200,
        }),
      );
    }
  }

  override update(_time: number, delta: number): void {
    // O diorama é estático; só o starfield deriva, dando a vida sutil do fundo. No reduced-motion
    // ele já foi desenhado estático em `buildBackground` — nada se move aqui.
    if (this.reducedMotion) return;
    this.starfield?.update(delta / 1000);
  }

  private t(x: number, y: number, value: string, size: number, color: number): Phaser.GameObjects.Text {
    return pixelText(this, x, y, value, { size, color }).setDepth(20);
  }

  private start(handling: HandlingMode): void {
    this.scene.start('Game', { handling });
  }
}
