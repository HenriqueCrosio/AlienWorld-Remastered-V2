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
      .sprite(150, 78, 'leviathanAliveSheet', 0)
      .setDepth(10)
      .setScale(1.6);
    this.leviatan.play('leviathan-alive');

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

  /** Brasas, névoa e a passagem da nave. Preenchido na Task 5. */
  private buildAtmosphere(): void {
    // (Task 5)
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
    // O título repousa um degrau abaixo do branco puro (o pulso da Task 4 vai de 0.82↔1).
    this.uiTargets[0].alpha = 1;

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
    this.leviatan?.setAlpha(1);
    this.settled = true;
  }

  /** A abertura. A coreografia entra na Task 4; por ora, assenta imediatamente. */
  private playIntro(): void {
    // (Task 4 preenche a linha do tempo; ao fim dela, chamar this.settle())
    this.settle();
  }

  /** Pula a abertura: mata os tweens em curso e vai ao repouso. */
  private skipIntro(): void {
    if (this.settled) return;
    for (const tw of this.introTweens) tw.remove();
    this.introTweens = [];
    this.settle();
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
    // O diorama é estático; só o starfield deriva, dando a vida sutil do fundo.
    this.starfield?.update(delta / 1000);
  }

  private t(x: number, y: number, value: string, size: number, color: number): Phaser.GameObjects.Text {
    return pixelText(this, x, y, value, { size, color }).setDepth(20);
  }

  private start(handling: HandlingMode): void {
    this.scene.start('Game', { handling });
  }
}
