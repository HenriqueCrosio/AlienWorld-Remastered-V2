import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Starfield } from '../Starfield';
import { Parallax } from '../Parallax';
import { resetVariantCache } from '../art';
import { pixelText } from '../ui';
import { Fx } from '../systems/Fx';
import { Music } from '../systems/Music';
import { SHIPS, DEFAULT_SHIP } from '../ships';
import type { HandlingMode } from './GameScene';

/**
 * O AFASTAMENTO — a cutscene FINAL, depois de matar o coração do Leviatã (Fase 4).
 *
 * ─── VITÓRIA AMARGA (decisão FECHADA com o Henrique, 2026-07-20) ───
 *
 * O jogador matou o Leviatã — e não salvou ninguém. A colônia na lua de Kepler já estava
 * MORTA desde antes da decolagem (docs/GDD.md): a campanha inteira foi vingança, não resgate.
 * Por isso o fim não é triunfo: os fragmentos do bicho caem como meteoros sobre a colônia
 * morta, e a última imagem é a nave dele, pequena e sozinha, contra a lua de onde ele saiu.
 *
 * ─── POR QUE SEM PAINEL E SEM TECLA DE PULAR ───
 *
 * As três interludes têm a mesma gramática: chegar → ESCOLHER a nave → o lugar morre. A
 * escolha existe porque havia uma próxima fase para armar. Aqui NÃO HÁ MAIS O QUE ARMAR —
 * repetir o painel seria a cena mentindo sobre haver futuro. E não há tecla de pular pela
 * lição mais cara do projeto (docs/HANDOFF.md): o jogador vem da luta final com o dedo
 * martelando o ESPAÇO, e qualquer tecla de pular comeria a cena no primeiro frame.
 *
 * ─── A CÂMERA RECUA PELA PRIMEIRA VEZ ───
 *
 * A campanha inteira foi uma APROXIMAÇÃO (superfície → espaço → casco → interior), contada
 * por escala: a lua encolhendo, o Leviatã crescendo (`Parallax.setApproach`). Esta cena é
 * esse número rodando ao contrário: o Leviatã morre ENCOLHENDO, e a lua CRESCENDO. E o
 * beat 1 é a única cena da campanha em que a nave voa para a ESQUERDA — sair é desfazer o
 * caminho, e a direção do voo diz isso antes de qualquer banner.
 */
export class Interlude4Scene extends Phaser.Scene {
  private starfield!: Starfield;
  private parallax!: Parallax;
  private fx!: Fx;

  private ship!: Phaser.GameObjects.Sprite;
  private banner!: Phaser.GameObjects.Text;

  // ─── Estado exposto para a sonda (o mínimo, como nas outras cenas) ───
  /** Em que beat a cena está (1..6). */
  private beat = 0;
  /** As peças do entulho que mura o interior atrás da nave (beat 1). */
  private entulho: Phaser.GameObjects.Image[] = [];
  /** O cenário do beat 1 (piso + as duas cópias do hangar) — destruído no corte da ruptura. */
  private cenario: Phaser.GameObjects.GameObject[] = [];
  /** O Leviatã: Image ('leviathanDying') no beat 3; Container com as duas metades após a partição. */
  private leviatan: Phaser.GameObjects.Image | Phaser.GameObjects.Container | null = null;
  private brilhoLeviatan: Phaser.GameObjects.Image | null = null;
  private metadeEsq: Phaser.GameObjects.Image | null = null;
  private metadeDir: Phaser.GameObjects.Image | null = null;
  /** true depois da PARTIÇÃO (o casco rasgou em dois). */
  private partido = false;
  private fissuras: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private lua: Phaser.GameObjects.Image | null = null;
  private luaBrilho: Phaser.GameObjects.Image | null = null;
  /** Meteoros lançados / impactos na lua (beat 5 — a sonda conta os dois). */
  private meteoros = 0;
  private impactos = 0;

  /** O estouro dos meteoros na atmosfera — criado UMA vez (armadilha 5). SEM shake: a chuva
   *  cai em silêncio, e o silêncio é o preço (o `fx.explode` sacode a tela a cada estouro). */
  private impactoFx!: Phaser.GameObjects.Particles.ParticleEmitter;

  private score = 0;
  private handling: HandlingMode = 'diegetico';
  private naveId: string = DEFAULT_SHIP;
  /** A fase COMPLETADA (4) — o GameOver escreve o título com ela. */
  private faseConcluida = 4;
  private practice = false;
  private baseScore = 0;
  private done = false;
  private t = 0;
  /** Velocidade do mundo. NEGATIVA no beat 1: a nave foge para a esquerda e o interior corre
   *  para trás DELA (para a direita) — a única cena da campanha em que ela voa para trás. */
  private scrollSpeed = 0;

  // ─── O relógio da cena (ms). ~42s no total — medido pela sonda. ───
  private static readonly T_BANNER1 = 2600;
  private static readonly T_RUPTURA = 8200;
  private static readonly T_PARTICAO = 16200;
  private static readonly T_RETORNO = 19400;
  private static readonly T_CHUVA = 23400;
  private static readonly T_FRASE = 29800;
  private static readonly T_BEAT6 = 35800;
  private static readonly T_FADE = 40200;
  private static readonly T_FIM = 41800;

  // ─── A geometria do interior do beat 1 — a MESMA régua da Interlude3 (medida em hangar.png).
  // O interior da Fase 4 É o hangar repetido (Parallax.buildInterior), então a cena abre no
  // mesmo lugar em que o jogador pousou — agora desabando. ───
  private static readonly ART_W = 160;
  private static readonly ART_H = 160;
  private static readonly DECK_ROW = 138;
  private static readonly WALL_ROW = 97;
  private static readonly SCALE = 1.5;
  private static readonly HANGAR_X = 264;
  private static readonly DECK_Y = 150;

  // Profundidades: o piso fica atrás da arte; o entulho na frente dela; o Leviatã e a lua na
  // frente do parallax (depths negativos) e atrás da nave; os meteoros passam ATRÁS da nave
  // (ela está entre a câmera e a queda — é o que a mantém protagonista do próprio funeral).
  private static readonly DEPTH_PISO = 64;
  private static readonly DEPTH_HANGAR = 70;
  private static readonly DEPTH_ENTULHO = 72;
  // A lua fica NA FRENTE do primeiro plano do parallax (60): com escala 2.1 ela é protagonista
  // dos beats 4-6, e uma pedra à deriva cruzando o disco cobria o quadro-final (revisão visual).
  private static readonly DEPTH_LUA = 61;
  private static readonly DEPTH_LEVIATAN = 66;
  private static readonly DEPTH_METEORO = 78;
  private static readonly DEPTH_NAVE = 80;

  // ─── A geometria do Leviatã MORRENDO (beat 3) — a âncora do canvas quadrado ───
  //
  // O CENTRO VISUAL da criatura fica em (186, 90): o mesmo lugar do sprite estático da era
  // anterior (`leviathanDying`, 115×47 recortado — o bicho preenche o quadro, o centro do
  // sprite É o centro do bicho). A sheet nova (`leviathanDyingSheet`) tem canvas QUADRADO
  // 116×116 com a criatura CENTRALIZADA dentro: o centro visual dela no quadro é ~(57.5, 61.5)
  // — MEDIDO no PNG (bbox do alfa, média dos quadros), não chutado. Sem compensar, o bicho
  // nasceria ~9px abaixo do lugar. `leviatanPos` devolve onde o CENTRO DO SPRITE tem que ficar
  // para o BICHO cair em (LEVI_X, LEVI_Y).
  private static readonly LEVI_X = 186;
  private static readonly LEVI_Y = 90;
  private static readonly LEVI_SCALE = 2.55;
  private static readonly LEVI_FRAME = 116;
  private static readonly LEVI_VIS_X = 57.5;
  private static readonly LEVI_VIS_Y = 61.5;

  private static get leviatanPos(): { x: number; y: number } {
    const meio = Interlude4Scene.LEVI_FRAME / 2;
    return {
      x: Interlude4Scene.LEVI_X + (meio - Interlude4Scene.LEVI_VIS_X) * Interlude4Scene.LEVI_SCALE,
      y: Interlude4Scene.LEVI_Y + (meio - Interlude4Scene.LEVI_VIS_Y) * Interlude4Scene.LEVI_SCALE,
    };
  }

  private static get hangarY(): number {
    const meio = Interlude4Scene.ART_H / 2;
    return Interlude4Scene.DECK_Y + (meio - Interlude4Scene.DECK_ROW) * Interlude4Scene.SCALE;
  }

  constructor() {
    super('Interlude4');
  }

  create(data: {
    score?: number;
    handling?: HandlingMode;
    ship?: string;
    /** Compatibilidade com as outras interludes: aqui é SEMPRE null (não há fase seguinte). */
    stage?: number | null;
    /** A fase completada — enviada pela GameScene.victory (a Fase 4 tem `next: null`). */
    stageDone?: number;
    practice?: boolean;
    baseScore?: number;
  }): void {
    this.score = data.score ?? 0;
    this.handling = data.handling ?? 'diegetico';
    // A nave que ele escolheu no hangar — é ELA a protagonista do último quadro.
    this.naveId = SHIPS[data.ship ?? ''] ? data.ship! : DEFAULT_SHIP;
    this.faseConcluida = data.stageDone ?? 4;
    this.practice = data.practice ?? false;
    this.baseScore = data.baseScore ?? 0;
    this.done = false;
    this.beat = 1;
    this.t = 0;
    this.scrollSpeed = 0;
    this.entulho = [];
    this.cenario = [];
    this.leviatan = null;
    this.brilhoLeviatan = null;
    this.metadeEsq = null;
    this.metadeDir = null;
    this.partido = false;
    this.fissuras = null;
    this.lua = null;
    this.luaBrilho = null;
    this.meteoros = 0;
    this.impactos = 0;

    resetVariantCache();

    this.starfield = new Starfield(this);
    // O espaço lá fora é o da volta para casa: o cinturão e a Frota Morta da Fase 2 — é por
    // eles que a nave passa no caminho de volta. O modo `nebulosa` NÃO serve aqui: qualquer
    // densidade < 1 acende a banda `casco` no rodapé (uma parede de casco no espaço aberto —
    // revisão visual). A lua e a silhueta do Leviatã do parallax ficam ESCONDIDAS: os dois
    // astros desta cena são protagonistas desenhados pela própria cena.
    this.parallax = new Parallax(this, 'espaco');
    this.parallax.setLeviathanVisible(false);
    this.parallax.setMoonVisible(false);
    this.fx = new Fx(this);

    // O estouro dos meteoros: quente e aditivo, uma vez só (armadilha 5).
    this.impactoFx = this.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 220, max: 420 },
        speed: { min: 26, max: 110 },
        scale: { start: 1.4, end: 0 },
        tint: [COLORS.hotBright, COLORS.hot, 0xffffff],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(Interlude4Scene.DEPTH_NAVE + 4);

    this.construirInterior();

    // A nave foge para a ESQUERDA — a única cena da campanha em que ela voa para trás. Sair
    // é desfazer o caminho; a direção do voo é a declaração de design, não um detalhe.
    const nave = SHIPS[this.naveId];
    const naveTex = this.textures.exists(nave.texture) ? nave.texture : 'ship';
    this.ship = this.add
      .sprite(GAME_WIDTH + 30, 104, naveTex)
      .setFlipX(true)
      .setDepth(Interlude4Scene.DEPTH_NAVE);
    const naveAnim = naveTex === nave.texture ? (nave.anim ?? 'ship-thrust') : 'ship-thrust';
    if (this.anims.exists(naveAnim)) this.ship.play(naveAnim);

    this.banner = pixelText(this, GAME_WIDTH / 2, 26, '', { size: 11, color: COLORS.hotBright })
      .setDepth(100)
      .setAlpha(0);

    this.roteiro();

    // ⚠️ SEM TECLA DE PULAR — a lição mais cara do HANDOFF: o jogador sai da luta final com o
    // dedo martelando o ESPAÇO, e qualquer tecla comeria a cena inteira no primeiro frame.
  }

  /**
   * O INTERIOR DO BEAT 1 — o hangar da Interlude3 outra vez (`[espelhada | arte]`), com um
   * tint mais frio: é o MESMO navio, outra região dele. O piso desenhado fica por trás, como
   * lá. O que muda é o que acontece com o lugar: desta vez ele desaba INTEIRO, e atrás dela.
   */
  private construirInterior(): void {
    const pisoY = Interlude4Scene.DECK_Y +
      (Interlude4Scene.WALL_ROW - Interlude4Scene.DECK_ROW) * Interlude4Scene.SCALE;
    const piso = this.add
      .rectangle(0, pisoY, GAME_WIDTH, GAME_HEIGHT - pisoY, 0x0d1322)
      .setOrigin(0, 0)
      .setDepth(Interlude4Scene.DEPTH_PISO);

    const espelhada = this.add
      .image(
        Interlude4Scene.HANGAR_X - Interlude4Scene.ART_W * Interlude4Scene.SCALE,
        Interlude4Scene.hangarY,
        'hangar',
      )
      .setScale(Interlude4Scene.SCALE)
      .setFlipX(true)
      .setTint(0x8a92ac)
      .setDepth(Interlude4Scene.DEPTH_HANGAR);

    const principal = this.add
      .image(Interlude4Scene.HANGAR_X, Interlude4Scene.hangarY, 'hangar')
      .setScale(Interlude4Scene.SCALE)
      .setTint(0x8a92ac)
      .setDepth(Interlude4Scene.DEPTH_HANGAR);

    this.cenario = [piso, espelhada, principal];
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.t += dt;

    this.starfield.update(dt);
    // Beat 1: scrollSpeed NEGATIVO — o mundo corre para a direita porque a nave foge para a
    // esquerda. Depois da ruptura, quase parado: o espaço exterior não é um corredor.
    this.parallax.update(dt, this.scrollSpeed);

    // O voo em pânico: enquanto foge, ela oscila — não é coreografia de tween, é uma nave
    // saindo no limite de um lugar que está vindo abaixo.
    if (this.beat === 1 && !this.done) {
      this.ship.y = 104 + Math.sin(this.t * 3.2) * 5;
    }
  }

  // ─── O roteiro ──────────────────────────────────────────────────────────────

  private roteiro(): void {
    this.placar();

    // BEAT 1 — DE DENTRO: a fuga para a esquerda, o interior desabando atrás.
    this.scrollSpeed = -18;
    this.tweens.add({
      targets: this.ship,
      x: -60,
      duration: Interlude4Scene.T_RUPTURA + 400,
      ease: 'Sine.easeInOut',
    });

    this.time.delayedCall(Interlude4Scene.T_BANNER1, () => {
      if (this.done) return;
      this.aviso('O INTERIOR ESTÁ DESABANDO', COLORS.enemyBright);
      // A faixa grave fica até a chuva de meteoros — quando ela CALA é que o preço aparece.
      Music.play(this, 'boss', 1200);
    });

    this.desabamento();
    this.time.delayedCall(Interlude4Scene.T_RUPTURA, () => this.ruptura());
  }

  private placar(): void {
    // A MESMA faixa escura das outras cenas: a legibilidade não pode depender da arte atrás.
    const banda = this.add
      .rectangle(0, 64, GAME_WIDTH, 78, COLORS.bgDeep, 0.72)
      .setOrigin(0, 0)
      .setDepth(99);

    const t = (y: number, v: string, size: number, color: number) =>
      pixelText(this, GAME_WIDTH / 2, y, v, { size, color }).setDepth(100);

    const linhas = [
      t(74, 'FASE 4 · O INTERIOR', 11, COLORS.playerBright),
      t(92, 'CONCLUÍDA', 8, COLORS.metalLight),
      t(116, String(this.score), 17, COLORS.hotBright),
      t(132, 'PONTOS', 7, COLORS.metalLight),
    ];

    this.tweens.add({
      targets: [banda, ...linhas],
      alpha: 0,
      duration: 900,
      delay: 2400,
      onComplete: () => {
        banda.destroy();
        linhas.forEach((l) => l.destroy());
      },
    });
  }

  /**
   * O DESABAMENTO — a técnica do `selarBoca` da Interlude3, invertida: lá o entulho murava a
   * entrada (a ponte queimada era a saída); aqui ele empilha ATRÁS da nave, à direita — o
   * interior inteiro vindo abaixo enquanto ela foge. Posições FIXAS (a sonda fotografa a
   * cena), pilha de baixo para cima, tint de silhueta: é parede morrendo, não pedra de cenário.
   */
  private desabamento(): void {
    // A cadeia de explosões corre o lado direito — de onde ela veio, tudo estoura. A cada 4
    // estouros, um GRANDE: o interior não racha uniforme, ele cede aos blocos. ⚠️ Depth NA
    // FRENTE do entulho (72): os emissores do Fx nascem no 50, atrás da parede desabando.
    const N = 12;
    for (let i = 0; i < N; i++) {
      this.time.delayedCall(3000 + i * 420, () => {
        if (this.done || this.beat !== 1) return;
        const x = Phaser.Math.Between(220, 376);
        const y = Phaser.Math.Between(30, 180);
        if (i % 4 === 3) this.fx.explodeBig(x, y, 0.9, Interlude4Scene.DEPTH_ENTULHO + 2);
        else this.fx.explode(x, y, 1.2, Interlude4Scene.DEPTH_ENTULHO + 2);
      });
    }

    // [textura, x, yFinal, escala, ângulo] — 3 fiadas, da base ao topo, só na metade direita.
    const pecas: Array<[string, number, number, number, number]> = [
      ['asteroid', 258, 148, 2.6, 12],
      ['asteroid2', 306, 152, 2.8, -20],
      ['asteroid3', 352, 146, 2.5, 32],
      ['asteroid2', 276, 110, 2.4, -8],
      ['asteroid', 330, 112, 2.7, 24],
      ['asteroid3', 372, 104, 2.2, -28],
      ['asteroid', 292, 70, 2.5, 16],
      ['asteroid2', 348, 64, 2.4, -14],
      ['asteroid3', 316, 28, 2.6, 8],
    ];

    pecas.forEach(([tex, x, yFinal, escala, angulo], i) => {
      if (!this.textures.exists(tex)) return;

      this.time.delayedCall(3200 + i * 260, () => {
        if (this.done || this.beat !== 1) return;

        const peca = this.add
          .image(x, -40, tex)
          .setScale(escala)
          .setAngle(angulo)
          .setTint(0x39415c)
          .setDepth(Interlude4Scene.DEPTH_ENTULHO);
        this.entulho.push(peca);

        this.tweens.add({
          targets: peca,
          y: yFinal,
          duration: 420,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (this.done) return;
            this.fx.hit(x, yFinal + 6);
            this.cameras.main.shake(70, 0.002);
          },
        });
      });
    });
  }

  /**
   * BEAT 2 — A RUPTURA. O casco rompe e a nave atravessa para fora.
   *
   * É o "ATMOSFERA ROMPIDA" da Fase 1 citado pela última vez: o verbo que a campanha inteira
   * adia. Lá, romper a casca da lua era ganhar o céu; aqui, romper a casca do bicho é ganhar
   * a saída. O clarão cobre o CORTE: atrás dele trocamos o interior pelo espaço exterior.
   */
  private ruptura(): void {
    if (this.done) return;
    this.beat = 2;

    this.cameras.main.flash(650, 255, 190, 110);
    this.cameras.main.shake(700, 0.02);
    // O rompimento do casco é a MAIOR detonação da cena: a sheet grande no ponto de saída,
    // na frente de tudo — romper uma casca é ganhar o céu, e tem que DOER na tela.
    this.fx.explodeBig(360, 100, 1.5, Interlude4Scene.DEPTH_NAVE + 2);

    this.time.delayedCall(280, () => {
      if (this.done) return;

      // O CORTE: o interior (arte + entulho) morre atrás do clarão. Lá fora, o mundo para de
      // correr — e a nave passa a apontar para a DIREITA: ela virou para casa. O eixo novo se
      // justifica pelo corte; o voo para trás era o beat 1, e ele acabou aqui.
      this.entulho.forEach((p) => p.destroy());
      this.entulho = [];
      this.cenario.forEach((c) => c.destroy());
      this.cenario = [];

      this.scrollSpeed = 6;
      this.tweens.killTweensOf(this.ship);
      this.ship.setFlipX(false).setAngle(0).setPosition(58, 150);

      this.beat = 3;
      this.afastamento();
    });
  }

  /**
   * BEAT 3 — O AFASTAMENTO: o Leviatã MORRENDO, grande na tela.
   *
   * Ele sempre foi uma silhueta distante; agora está perto e morrendo. A ESTRELA é a ANIMAÇÃO
   * (`leviathan-dying`, 9 quadros da sheet em pingpong: fissuras pulsando e explosões na
   * espinha) — o sprite ESTÁTICO da era anterior vira fallback. Por cima, os efeitos de código
   * que SOMAM: a cópia aditiva respirando (agora animada junto, não congelada sobre arte viva),
   * as fagulhas nascendo do casco, e a cadeia de explosões de VERDADE correndo a espinha — a
   * mesma gramática da morte de todo chefão do jogo, aplicada ao corpo inteiro dele.
   */
  private afastamento(): void {
    if (this.done) return;

    this.aviso('O LEVIATÃ ESTÁ MORRENDO', COLORS.hot);

    const pos = Interlude4Scene.leviatanPos;

    if (this.anims.exists('leviathan-dying')) {
      const lev = this.add
        .sprite(pos.x, pos.y, 'leviathanDyingSheet', 0)
        .setScale(Interlude4Scene.LEVI_SCALE)
        .setDepth(Interlude4Scene.DEPTH_LEVIATAN);
      lev.play('leviathan-dying');
      this.leviatan = lev;

      // A RACHADURA PULSANDO: uma cópia ADITIVA laranja da MESMA animação, respirando. Na era
      // estática o glow era um segundo sprite parado por cima do primeiro; agora ele acompanha
      // os quadros — o fogo interno acende e apaga NO RITMO das fissuras da arte.
      const brilho = this.add
        .sprite(pos.x, pos.y, 'leviathanDyingSheet', 0)
        .setScale(Interlude4Scene.LEVI_SCALE)
        .setTint(0xff7a2a)
        .setAlpha(0.08)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(Interlude4Scene.DEPTH_LEVIATAN + 1);
      brilho.play('leviathan-dying');
      this.brilhoLeviatan = brilho;
      this.tweens.add({
        targets: this.brilhoLeviatan,
        alpha: 0.3,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (this.textures.exists('leviathanDying')) {
      // Fallback da era anterior (arte entra asset por asset): o estático + o glow estático.
      this.leviatan = this.add
        .image(Interlude4Scene.LEVI_X, Interlude4Scene.LEVI_Y, 'leviathanDying')
        .setScale(Interlude4Scene.LEVI_SCALE)
        .setDepth(Interlude4Scene.DEPTH_LEVIATAN);

      this.brilhoLeviatan = this.add
        .image(Interlude4Scene.LEVI_X, Interlude4Scene.LEVI_Y, 'leviathanDying')
        .setScale(Interlude4Scene.LEVI_SCALE)
        .setTint(0xff7a2a)
        .setAlpha(0.1)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(Interlude4Scene.DEPTH_LEVIATAN + 1);
      this.tweens.add({
        targets: this.brilhoLeviatan,
        alpha: 0.45,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Fagulhas nascendo ao longo do casco: as fissuras soltando fogo. A faixa acompanha o corpo
    // inteiro do bicho na tela (na escala 2.55 ele ocupa ~x=39..333, y=30..150).
    this.fissuras = this.add
      .particles(Interlude4Scene.LEVI_X, Interlude4Scene.LEVI_Y, 'spark', {
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(-140, -55, 280, 105),
        } as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig['emitZone'],
        lifespan: { min: 260, max: 620 },
        speed: { min: 8, max: 34 },
        scale: { start: 1.2, end: 0 },
        tint: [COLORS.hotBright, COLORS.hot],
        blendMode: 'ADD',
        frequency: 70,
      })
      .setDepth(Interlude4Scene.DEPTH_LEVIATAN + 2);

    // A CADEIA NA ESPINHA: explosões da SHEET (não mais fagulha solta), varrendo o corpo de
    // ré a proa. A espinha do bicho na tela é a faixa ALTA do corpo (y≈34..84); a cada 5
    // estouros, um GRANDE racha uma vértebra inteira. ⚠️ Depth NA FRENTE do Leviatã: os
    // emissores do Fx nascem no depth 50 — sem o parâmetro a cadeia estourava ATRÁS do corpo
    // que devia estar destruindo (era metade do "visual fraco" deste beat).
    const N = 17;
    for (let i = 0; i < N; i++) {
      this.time.delayedCall(400 + i * 430, () => {
        if (this.done || this.partido) return;
        const x = Interlude4Scene.LEVI_X + Phaser.Math.Between(-125, 125);
        const y = Interlude4Scene.LEVI_Y + Phaser.Math.Between(-56, -6);
        if (i % 5 === 4) this.fx.explodeBig(x, y, 0.85, Interlude4Scene.DEPTH_LEVIATAN + 3);
        else this.fx.explode(x, y, 1.1, Interlude4Scene.DEPTH_LEVIATAN + 3);
      });
    }

    // A nave cruza o primeiro plano devagar — pequena contra o bicho inteiro.
    this.tweens.add({ targets: this.ship, x: 150, y: 138, duration: 7600, ease: 'Sine.easeInOut' });

    this.time.delayedCall(Interlude4Scene.T_PARTICAO - Interlude4Scene.T_RUPTURA, () =>
      this.particao(),
    );
  }

  /**
   * A PARTIÇÃO — o bicho rasga em dois.
   *
   * A arte troca para `leviathanSplit` e as metades viram DOIS recortes do mesmo sprite (crop
   * esquerdo/direito) dentro de um container: elas se afastam com rotação lenta OPOSTA enquanto
   * o conjunto ENCOLHE e recua — o `setApproach` invertido: a campanha inteira o fez crescer;
   * ele morre ficando pequeno.
   */
  private particao(): void {
    if (this.done || this.partido) return;
    this.partido = true;

    this.cameras.main.flash(320, 255, 150, 70);
    this.cameras.main.shake(450, 0.012);
    // O RASGO: a detonação grande no miolo, do ponto onde o corpo parte — o clarão cobre a
    // troca da arte (o bicho inteiro vira as duas metades) e vende a violência do corte.
    this.fx.explodeBig(
      Interlude4Scene.LEVI_X,
      Interlude4Scene.LEVI_Y,
      1.1,
      Interlude4Scene.DEPTH_LEVIATAN + 3,
    );

    this.brilhoLeviatan?.destroy();
    this.brilhoLeviatan = null;
    this.fissuras?.destroy();
    this.fissuras = null;
    this.leviatan?.destroy();

    if (!this.textures.exists('leviathanSplit')) return;

    // ⚠️ O setCrop MASCARA, NÃO REANCORA (armadilha nova, paga na revisão visual): o Phaser
    // corta a região visível mas mantém a origem relativa ao FRAME INTEIRO. Com origem na
    // borda, cada metade nascia deslocada 58px para FORA — a "partição" acontecia com as
    // metades já arremessadas, e a da cabeça ia parar em cima da lua. A correção é ancorar
    // as duas pelo CENTRO do frame: os cortes se encontram na emenda, e o corpo se
    // reconstitui centrado no container (a esquerda cobre −57.5..+0.5, a direita +0.5..+57.5).
    const container = this.add
      .container(Interlude4Scene.LEVI_X, Interlude4Scene.LEVI_Y)
      .setScale(Interlude4Scene.LEVI_SCALE)
      .setDepth(Interlude4Scene.DEPTH_LEVIATAN);
    this.metadeEsq = this.add.image(0, 0, 'leviathanSplit').setCrop(0, 0, 58, 48);
    this.metadeDir = this.add.image(0, 0, 'leviathanSplit').setCrop(58, 0, 57, 48);
    container.add([this.metadeEsq, this.metadeDir]);
    this.leviatan = container;

    // As metades se afastam, girando devagar em sentidos opostos — cadáver, não explosão.
    this.tweens.add({ targets: this.metadeEsq, x: -30, angle: -8, duration: 6000, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.metadeDir, x: 30, angle: 6, duration: 6000, ease: 'Sine.easeInOut' });

    // O AFASTAMENTO em um tween: encolhe e recua para a ESQUERDA BAIXA — a inversão do
    // setApproach. Longe da lua (que cresce à direita): cadáver e destino não se sobrepõem.
    this.tweens.add({
      targets: container,
      scale: 1.2,
      x: 92,
      y: 56,
      duration: 8000,
      ease: 'Sine.easeInOut',
    });

    // Os destroços entre as metades: fragmentos saindo do miolo incandescente — rocha E
    // fagulha (o burst do Fx por trás do rasgo), para o corte não ler como dois sprites
    // deslizando no vazio.
    this.fx.explode(
      Interlude4Scene.LEVI_X,
      Interlude4Scene.LEVI_Y,
      1.6,
      Interlude4Scene.DEPTH_LEVIATAN + 2,
    );
    for (let i = 0; i < 8; i++) {
      if (!this.textures.exists('asteroid')) break;
      const frag = this.add
        .image(Interlude4Scene.LEVI_X, Interlude4Scene.LEVI_Y, 'asteroid')
        .setScale(Phaser.Math.FloatBetween(0.45, 0.85))
        .setTint(0xff9a3c)
        .setDepth(Interlude4Scene.DEPTH_LEVIATAN + 1);
      this.tweens.add({
        targets: frag,
        x: Interlude4Scene.LEVI_X + Phaser.Math.Between(-110, 110),
        y: Interlude4Scene.LEVI_Y + Phaser.Math.Between(-60, 60),
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0.6,
        duration: 3800,
        ease: 'Quad.easeOut',
      });
    }

    this.tweens.add({ targets: this.ship, x: 190, y: 126, duration: 6200, ease: 'Sine.easeInOut' });

    this.time.delayedCall(Interlude4Scene.T_RETORNO - Interlude4Scene.T_PARTICAO, () =>
      this.retorno(),
    );
  }

  /**
   * BEAT 4 — O RETORNO: a lua de Kepler cresce na tela.
   *
   * É de onde o jogador decolou no primeiro segundo do jogo. A campanha foi um mergulho; a
   * lua crescendo é o círculo fechando — e o banner diz o que o jogador já sabe desde a
   * Fase 1: não há ninguém vivo lá embaixo.
   */
  private retorno(): void {
    if (this.done) return;
    this.beat = 4;

    this.aviso('KEPLER · A COLÔNIA MORTA', COLORS.playerBright);

    this.lua = this.add
      .image(316, 106, 'moon')
      .setScale(0.7)
      .setAlpha(0)
      // O placeholder da lua nasce CLARO demais para um plano de fundo (bgFar); o tint frio o
      // assenta na paleta do espaço — o que está longe é escuro, a regra de sempre.
      .setTint(0x9aa4c4)
      .setDepth(Interlude4Scene.DEPTH_LUA);

    // O brilho de entrada na atmosfera: uma cópia aditiva laranja da lua, um pouco maior —
    // acende no beat 5, quando os fragmentos do Leviatã caem sobre ela. Alpha contido:
    // aditivo sobre o disco inteiro CLAREIA a lua em vez de aquecê-la (revisão visual).
    this.luaBrilho = this.add
      .image(316, 106, 'moon')
      .setScale(0.76)
      .setTint(0xff8c1a)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(Interlude4Scene.DEPTH_LUA + 1);

    // A lua CRECE — o mesmo número que encolheu por três fases, voltando. Escala final 2.1:
    // o placeholder é desenhado para 1.25 (o tamanho dele no parallax); acima de ~2.2 os
    // três círculos de cratera denunciam o truque (revisão visual).
    this.tweens.add({
      targets: [this.lua, this.luaBrilho],
      alpha: 0.95,
      duration: 3200,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.lua,
      scale: 2.1,
      duration: 9000,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.luaBrilho,
      scale: 2.27,
      duration: 9000,
      ease: 'Sine.easeInOut',
    });

    this.time.delayedCall(Interlude4Scene.T_CHUVA - Interlude4Scene.T_RETORNO, () =>
      this.chuvaDeMeteoros(),
    );
  }

  /**
   * BEAT 5 — A CHUVA DE METEOROS. O beat mais importante da cena.
   *
   * Os fragmentos do Leviatã (a rocha de sempre, tingida de laranja-fogo, com trilha aditiva)
   * entram na atmosfera da lua — em cima da colônia que já estava morta. A vitória cobrando o
   * preço. O ritmo é a frase: primeiro POUCOS (dá para contar cada um), depois MUITOS (dá
   * para parar de contar). E a música CALA quando a chuva começa — o preço cai em silêncio.
   */
  private chuvaDeMeteoros(): void {
    if (this.done) return;
    this.beat = 5;

    // SILÊNCIO. Música grave até aqui; a chuva cai sem trilha.
    Music.stop(this, 2600);

    // A atmosfera acende com a reentrada — contido: aditivo em excesso clareia o disco.
    if (this.luaBrilho) {
      this.tweens.add({ targets: this.luaBrilho, alpha: 0.28, duration: 2400 });
    }

    // Fase A — os primeiros, contáveis: um a cada 700ms.
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 700, () => this.meteoro());
    }
    // Fase B — a chuva de verdade: um a cada ~210ms por ~8s.
    for (let i = 0; i < 38; i++) {
      this.time.delayedCall(3400 + i * 210, () => this.meteoro());
    }

    // A frase que cobra o preço, no auge da chuva. A lore (GDD) já dizia que a colônia
    // estava morta — a cena só confirma o que isso custa.
    this.time.delayedCall(Interlude4Scene.T_FRASE - Interlude4Scene.T_CHUVA, () => {
      if (this.done) return;
      this.aviso('NÃO HAVIA MAIS NINGUÉM PARA SALVAR', COLORS.hot);
    });

    this.tweens.add({ targets: this.ship, x: 232, y: 116, duration: 9000, ease: 'Sine.easeInOut' });

    this.time.delayedCall(Interlude4Scene.T_BEAT6 - Interlude4Scene.T_CHUVA, () =>
      this.naveContraALua(),
    );
  }

  /**
   * UM meteoro: um fragmento do Leviatã caindo sobre a lua. Rocha comum com tint de fogo +
   * uma trilha aditiva esticada na direção do voo (dois sprites num container girado — sem
   * emissor novo por meteoro: armadilha 5). Nasce perto do cadáver (à esquerda) e morre no
   * limbo da lua, com um estouro pequeno e SEM shake — a chuva cai em silêncio.
   */
  private meteoro(): void {
    if (this.done || this.beat !== 5 || !this.lua) return;

    const texs = ['asteroid', 'asteroid2', 'asteroid3'].filter((k) => this.textures.exists(k));
    if (texs.length === 0) return;

    const x0 = Phaser.Math.Between(90, 190);
    const y0 = Phaser.Math.Between(20, 80);

    // Alvo: um ponto do lado de CÁ da lua (o hemisfério virado para o cadáver).
    const a = Phaser.Math.DegToRad(Phaser.Math.Between(140, 235));
    const r = 44 * this.lua.scaleX;
    const tx = this.lua.x + Math.cos(a) * r;
    const ty = this.lua.y + Math.sin(a) * r;

    const angulo = Math.atan2(ty - y0, tx - x0);
    const corpo = this.add.container(x0, y0).setRotation(angulo).setDepth(Interlude4Scene.DEPTH_METEORO);

    // A ESTELA, EM DUAS CAMADAS: um rastro longo e FOSCO + um núcleo curto e QUENTE colado na
    // rocha. Uma barra única uniforme lia como LASER (revisão visual do beat 5 — trilha boa
    // afunila: brilhante na cabeça, apagando na cauda).
    const rastro = this.add
      .sprite(-10, 0, 'spark')
      .setScale(20, 2)
      .setTint(0xd95f10)
      .setAlpha(0.45)
      .setBlendMode(Phaser.BlendModes.ADD);
    const nucleo = this.add
      .sprite(-4, 0, 'spark')
      .setScale(8, 2)
      .setTint(0xffc36b)
      .setAlpha(0.9)
      .setBlendMode(Phaser.BlendModes.ADD);
    const rocha = this.add
      .sprite(0, 0, Phaser.Math.RND.pick(texs))
      .setScale(0.55)
      .setTint(0xffa54d);
    corpo.add([rastro, nucleo, rocha]);

    this.tweens.add({ targets: rocha, angle: 360, duration: 900, repeat: 3 });
    this.meteoros++;

    const dist = Phaser.Math.Distance.Between(x0, y0, tx, ty);
    this.tweens.add({
      targets: corpo,
      x: tx,
      y: ty,
      duration: (dist / Phaser.Math.Between(115, 155)) * 1000,
      ease: 'Quad.easeIn', // a gravidade acelera: cair não é deslizar.
      onComplete: () => {
        corpo.destroy(true);
        if (this.done) return;
        this.impactoFx.explode(6, tx, ty);
        // O estouro na atmosfera é da SHEET, pequeno e SEM SHAKE (sheetExplosion, não explode):
        // a chuva cai em silêncio — o silêncio é o preço.
        this.fx.sheetExplosion(tx, ty, 0.5, Interlude4Scene.DEPTH_LUA + 2);
        this.impactos++;
      },
    });
  }

  /**
   * BEAT 6 — A NAVE CONTRA A LUA. Sem texto, ou quase.
   *
   * O beat que ocupa o lugar da escolha nas outras interludes: a nave que ELE escolheu,
   * pequena e sozinha, contra a lua de onde saiu. A chuva acabou; o quadro segura. É a única
   * cena da campanha que termina olhando, e não indo — porque não há mais para onde ir.
   */
  private naveContraALua(): void {
    if (this.done) return;
    this.beat = 6;

    // A atmosfera esfria: o incêndio da reentrada apaga devagar.
    if (this.luaBrilho) {
      this.tweens.add({ targets: this.luaBrilho, alpha: 0.12, duration: 3000 });
    }

    this.tweens.add({ targets: this.ship, x: 250, y: 102, duration: 4600, ease: 'Sine.easeInOut' });

    this.time.delayedCall(Interlude4Scene.T_FADE - Interlude4Scene.T_BEAT6, () => {
      if (this.done) return;
      this.cameras.main.fadeOut(1200, 5, 6, 13);
    });

    this.time.delayedCall(Interlude4Scene.T_FIM - Interlude4Scene.T_BEAT6, () => this.terminar());
  }

  private aviso(texto: string, cor: number): void {
    this.banner
      .setText(texto)
      .setColor(Phaser.Display.Color.IntegerToColor(cor).rgba)
      .setAlpha(1)
      .setScale(1);

    this.tweens.add({ targets: this.banner, alpha: 0, duration: 1600, delay: 700 });
  }

  /**
   * O fim da campanha: a tela de vitória da Fase 4 — com o MESMO payload que a GameScene
   * montaria (score em cadeia, a nave, o checkpoint), senão o retry e o título mentem.
   */
  private terminar(): void {
    if (this.done) return;
    this.done = true;

    this.scene.start('GameOver', {
      score: this.score,
      handling: this.handling,
      practice: this.practice,
      victory: true,
      stage: this.faseConcluida,
      ship: this.naveId,
      baseScore: this.baseScore,
    });
  }
}
