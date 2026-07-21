import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCROLL_SPEED } from '../config';
import { Starfield } from '../Starfield';
import { Parallax } from '../Parallax';
import { resetVariantCache } from '../art';
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
 * Cada asset é OPCIONAL e passa pela guarda `textures.exists`: sem a placa `menuBg`, o fundo cai
 * no parallax da fase (o layout antigo); sem a sheet do Leviatã vivo, o menu simplesmente não
 * mostra a criatura. O jogo nunca abre em tela preta.
 */
export class MenuScene extends Phaser.Scene {
  // Públicos: a sonda lê estes campos.
  parallax: Parallax | null = null;
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

  /** O fundo: a placa nova sem criatura, OU o parallax da fase como fallback. */
  private buildBackground(): void {
    if (this.textures.exists('menuBg')) {
      this.add.image(0, 0, 'menuBg').setOrigin(0, 0).setDepth(0).setName('menuBgPlate');
      // Estrelas de cintilação sobre a placa (a placa é um quadro parado; elas devolvem o vivo).
      this.twinkleStars();
      return;
    }

    // FALLBACK: o parallax da fase rolando atrás de um véu escuro — nunca uma tela preta.
    this.starfield = new Starfield(this);
    this.parallax = new Parallax(this);
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bgDeep, 0.55)
      .setOrigin(0, 0)
      .setDepth(5);
  }

  /** O Leviatã VIVO. Preenchido na Task 3; sem a sheet, não há criatura. */
  private buildLeviathan(): void {
    // (Task 3)
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
    const plate = this.children.getByName('menuBgPlate') as Phaser.GameObjects.Image | null;
    plate?.setAlpha(1);
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
   * Estrelas que CINTILAM sobre a placa. Posições a dedo no céu livre (a mesma lógica do menu
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
    if (!this.starfield || !this.parallax) return;
    const dt = delta / 1000;
    this.starfield.update(dt);
    this.parallax.update(dt, SCROLL_SPEED * 0.5);
  }

  private t(x: number, y: number, value: string, size: number, color: number): Phaser.GameObjects.Text {
    return pixelText(this, x, y, value, { size, color }).setDepth(20);
  }

  private start(handling: HandlingMode): void {
    this.scene.start('Game', { handling });
  }
}
