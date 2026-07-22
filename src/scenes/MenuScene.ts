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

  // A TRAVESSIA do Leviatã. Ele nasce fora da tela à esquerda (START_X), nada pelo alto do céu
  // (Y — dentro do disco da lua, para ela poder ocluí-lo) e SOME atrás da lua (END_X = o centro
  // dela). Escala menor que a antiga (1.6): ele lê DISTANTE, imponente ao longe. No reduced-motion
  // ele fica ESTÁTICO em REST_X — o usuário de movimento reduzido ainda vê a cara do jogo.
  private static readonly LEVI_Y = 56;
  private static readonly LEVI_SCALE = 0.6;
  /** Tint frio e escuro no Leviatã: ele lê como uma SILHUETA na bruma, não um herói iluminado. */
  private static readonly LEVI_TINT = 0x8c9bb6;
  private static readonly LEVI_START_X = -60;
  private static readonly LEVI_END_X = 322;
  private static readonly LEVI_REST_X = 96;
  // Depth 1.5: ATRÁS da lua (2, opaca) — é ela quem o oclui ao sumir. Fica também atrás das
  // bandas de montanha (3/4), mas ele nada ALTO, acima dos picos, então não há sobreposição.
  private static readonly LEVI_DEPTH = 1.5;

  // O EMBLEMA que surge DEPOIS que o Leviatã some atrás da lua — o brasão do jogo, no céu livre
  // acima do título. Aparece no fim da travessia (ou no skip / no reduced-motion, já montado).
  private static readonly LOGO_X = 192;
  private static readonly LOGO_Y = 64;
  private static readonly LOGO_SCALE = 1.15;

  private starfield: Starfield | null = null;
  private leviatan: Phaser.GameObjects.Sprite | null = null;
  private logo: Phaser.GameObjects.Sprite | null = null;
  private reducedMotion = false;
  private introTweens: Phaser.Tweens.Tween[] = [];
  /** Tudo que a abertura faz surgir (fade de 0→alvo). O `settle` os fixa no alvo. */
  private uiTargets: { obj: Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Alpha; alpha: number }[] = [];

  constructor() {
    super('Menu');
  }

  create(): void {
    resetVariantCache();
    this.registerLeviathanSwim();
    this.registerLogo();
    this.settled = false;
    this.introTweens = [];
    this.uiTargets = [];
    this.reducedMotion =
      typeof window !== 'undefined' &&
      !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.buildBackground();
    this.buildLeviathan();
    this.buildLogo();
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

    // A LUA MORTA: o foco do céu, no alto à direita — a arte NOVA, cinza-escura com anel de
    // asteroides (`menuMoon`); senão a lua procedural do Boot. Depth 2: ATRÁS das bandas de
    // montanha (3/4) — o horizonte próximo passa À FRENTE dela. OPACA (alpha 1): o Leviatã
    // (depth 1.5) passa ATRÁS e ela tem que ESCONDÊ-LO de verdade — com alpha < 1 a criatura
    // vazava pela lua. O ar recuado/escuro vem do TINT frio, não da transparência. (`x=322` é o
    // destino da travessia, LEVI_END_X.)
    const moonKey = this.textures.exists('menuMoon') ? 'menuMoon' : 'moon';
    this.add
      .image(322, 52, moonKey)
      .setName('menuMoon')
      .setDepth(2)
      .setScale(moonKey === 'menuMoon' ? 0.6 : 1.05)
      .setAlpha(1)
      .setTint(moonKey === 'menuMoon' ? 0x9aa6c4 : 0xffffff);

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
   * O Leviatã: a estrela do diorama. Uma criatura colossal que NADA pelo céu (anim de ondulação),
   * atravessando UMA vez — da esquerda até SUMIR atrás da lua. Aqui ele só NASCE (fora da tela à
   * esquerda); a travessia em si é a tween de `playIntro`. Sem a sheet, o método é um no-op — o
   * menu roda sem a criatura.
   */
  private buildLeviathan(): void {
    if (!this.anims.exists('leviathan-swim')) return;

    // SEM flip: o sprite do PixelLab já aponta para a DIREITA (ver install-sprite.mjs) — nadando
    // para a direita, a cabeça lidera naturalmente. O tint escuro o afunda na bruma (mais dark).
    if (this.reducedMotion) {
      // Movimento reduzido: sem travessia. O Leviatã fica ESTÁTICO e pequeno à esquerda (quadro 0),
      // para o usuário de movimento reduzido ainda ver a cara do jogo.
      this.leviatan = this.add
        .sprite(MenuScene.LEVI_REST_X, MenuScene.LEVI_Y, 'leviathanSwimSheet', 0)
        .setDepth(MenuScene.LEVI_DEPTH)
        .setScale(MenuScene.LEVI_SCALE)
        .setTint(MenuScene.LEVI_TINT);
      return;
    }

    this.leviatan = this.add
      .sprite(MenuScene.LEVI_START_X, MenuScene.LEVI_Y, 'leviathanSwimSheet', 0)
      .setDepth(MenuScene.LEVI_DEPTH)
      .setScale(MenuScene.LEVI_SCALE)
      .setTint(MenuScene.LEVI_TINT);
    this.leviatan.play('leviathan-swim');
  }

  /**
   * A atmosfera do diorama: BRUMA em camadas. Nada de partículas (as fagulhas `spark` viravam
   * quadradinhos por toda a tela) — a bruma é feita de manchas de nebulosa translúcidas derivando
   * devagar À FRENTE do Leviatã, para ele ser visto POR ENTRE a névoa: um leviatã distante e
   * meio-escondido, não um herói iluminado. No reduced-motion nada disto se move: fica um quadro
   * parado e legível.
   */
  private buildAtmosphere(): void {
    if (this.reducedMotion) return;

    // VÉU escuro sobre o céu: escurece a cena e afunda o Leviatã na penumbra (pedido: mais dark).
    // Depth 2.4 — à FRENTE do Leviatã (1.5) e da lua (2), atrás da bruma e da UI.
    this.add
      .rectangle(0, 0, GAME_WIDTH, 150, COLORS.bgDeep, 0.24)
      .setOrigin(0, 0)
      .setDepth(2.4);

    // A BRUMA: manchas de nebulosa grandes, escuras e translúcidas cobrindo a faixa do céu por
    // onde o Leviatã passa. Depth 2.6 — À FRENTE dele: a criatura é vista ATRAVÉS da névoa. Cada
    // mancha deriva de leve na horizontal e respira no alpha — fog vivo, sem costura de partícula.
    if (this.textures.exists('nebula')) {
      const bruma: [number, number, number, number][] = [
        // x, y, escala, alpha-base
        [70, 58, 3.2, 0.20],
        [180, 68, 3.6, 0.24],
        [300, 54, 3.0, 0.18],
        [130, 46, 2.6, 0.16],
        [250, 72, 3.2, 0.22],
      ];
      for (const [x, y, escala, alpha] of bruma) {
        const mancha = this.add
          .image(x, y, 'nebula')
          .setDepth(2.6)
          .setScale(escala)
          .setAlpha(alpha)
          .setTint(0x1b2338)
          .setFlipX(Math.random() < 0.5);
        this.tweens.add({
          targets: mancha,
          x: x + Phaser.Math.Between(18, 34),
          alpha: alpha + 0.06,
          duration: Phaser.Math.Between(7000, 11000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }

    // Névoa baixa: duas faixas translúcidas no horizonte, respirando de leve.
    for (const [y, h, a] of [[128, 34, 0.12], [150, 30, 0.16]] as const) {
      const nevoa = this.add
        .rectangle(0, y, GAME_WIDTH, h, COLORS.bgFar, a)
        .setOrigin(0, 0)
        .setDepth(7);
      this.tweens.add({
        targets: nevoa, alpha: a + 0.1, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  /**
   * O EMBLEMA do jogo: um brasão circular que SURGE depois que o Leviatã some atrás da lua (o
   * beat de recompensa). Aqui ele só nasce (invisível, faíscando em loop); `revealLogo` o traz.
   * No reduced-motion já entra montado. Sem a sheet, é um no-op.
   */
  private buildLogo(): void {
    if (!this.anims.exists('menu-logo')) return;

    this.logo = this.add
      .sprite(MenuScene.LOGO_X, MenuScene.LOGO_Y, 'menuLogoSheet', 0)
      .setDepth(11)
      .setScale(MenuScene.LOGO_SCALE);

    if (this.reducedMotion) {
      // Movimento reduzido: sem reveal nem faísca — o emblema já está montado, no quadro 0.
      this.logo.setAlpha(1);
      return;
    }
    this.logo.setAlpha(0).play('menu-logo');
  }

  /** Traz o emblema (fade-in). Idempotente: só age na primeira chamada (fim da travessia OU skip). */
  private revealLogo(): void {
    if (!this.logo || this.logo.alpha > 0) return;
    this.tweens.add({ targets: this.logo, alpha: 1, duration: 900, ease: 'Cubic.easeOut' });
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
    // O Leviatã NÃO é tocado aqui: no fluxo natural ele SEGUE nadando (a travessia dura ~10s, bem
    // além do assentamento da UI) e se destrói sozinho ao sumir atrás da lua. Só o SKIP — que rompe
    // a travessia no meio — precisa removê-lo, e faz isso em `skipIntro`.
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

    // A TRAVESSIA do Leviatã: surge da esquerda e NADA pelo céu até SUMIR atrás da lua (~16s —
    // BEM lento, para vender distância e imponência). Ao se esconder, se DESTRÓI: o repouso é só o
    // diorama + o emblema (a criatura passa UMA vez). A tween entra em `introTweens` p/ o skip cortá-la.
    if (this.leviatan) {
      this.leviatan.setAlpha(0);
      this.introTweens.push(
        this.tweens.add({ targets: this.leviatan, alpha: 1, duration: 1600, ease: 'Cubic.easeOut' }),
      );
      this.introTweens.push(
        this.tweens.add({
          targets: this.leviatan,
          x: MenuScene.LEVI_END_X,
          duration: 16000,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.leviatan?.destroy();
            this.leviatan = null;
            // O Leviatã sumiu atrás da lua — é o momento do EMBLEMA surgir (o beat de recompensa).
            this.revealLogo();
          },
        }),
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
    // Pular rompe a travessia no meio; o repouso é SEM criatura, então o Leviatã é removido — e o
    // emblema (que só surgiria no fim da travessia) aparece agora, já que vamos direto ao repouso.
    this.leviatan?.destroy();
    this.leviatan = null;
    this.revealLogo();
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
   * Registra a animação de NADO do Leviatã UMA vez (a cena recria a cada entrada; `anims.exists`
   * evita o grito de chave repetida). 17 quadros de um ciclo desenhado para fechar sem salto —
   * loop direto, SEM yoyo (a ondulação viaja, não vai-e-volta).
   */
  private registerLeviathanSwim(): void {
    if (this.textures.exists('leviathanSwimSheet') && !this.anims.exists('leviathan-swim')) {
      this.anims.create({
        key: 'leviathan-swim',
        frames: this.anims.generateFrameNumbers('leviathanSwimSheet', { start: 0, end: 16 }),
        frameRate: 10,
        repeat: -1,
      });
    }
  }

  /** Registra a animação de FAÍSCA do emblema UMA vez (loop; 9 quadros de 64×64). */
  private registerLogo(): void {
    if (this.textures.exists('menuLogoSheet') && !this.anims.exists('menu-logo')) {
      this.anims.create({
        key: 'menu-logo',
        frames: this.anims.generateFrameNumbers('menuLogoSheet', { start: 0, end: 8 }),
        frameRate: 8,
        repeat: -1,
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
