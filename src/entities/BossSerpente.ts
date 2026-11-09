import Phaser from 'phaser';
import { BARRA_CHEFAO_Y, GAME_HEIGHT, GAME_WIDTH, SCROLL_SPEED } from '../config';
import type { EnemySystem } from '../systems/EnemySystem';
import type { Fx } from '../systems/Fx';
import type { StageBoss } from './Boss';
import { CascoVivo } from './cascoVivo';
import { ERGUER, type Cor } from './gestoSerpente';
import { MORDIDAS_FUSAO } from './serpenteFusao';
import type { DevSerpente } from './serpente/atalho';
import { CamadaPixels } from './serpente/camadaPixels';
import { aditivoPuro } from './serpente/aditivo';
import { EnguiaEmJogo } from './serpente/enguia/emJogo';
import { VidaEnguia } from './serpente/enguia/vida';
import { CONJUNTOS, IDLE_HAB } from './serpente/gestosHab';
import type { CorpoSerpente, Habilidade } from './serpente/habilidade';
import { Luzes } from './serpente/luzes';
import { HAB, cruza, rodizio } from './serpente/numerosHab';
import { acertoNoCorpo as ondeCai, naCabeca, opaco } from './serpente/pixels';
import { GOTA, Tiros } from './serpente/tiros';
import { Chuva } from './serpente/chuva';
import { Raio } from './serpente/raio';
import { Gas } from './serpente/gas';
import { Tocador } from './serpente/tocador';
import type { NomeHab, Ponto } from './serpente/tipos';
import { FORMAS, LUTA, escondidaRombo, freadaDe, golpeMax, pulso, romboY, type FormaLuta } from './numerosSerpente';

/**
 * Uma FASE da luta: qual arte veste o corpo, qual cabeça está viva para ser ferida, e onde
 * ela fica DENTRO da arte (offset do centro, em px de ARTE — multiplicado pela escala de
 * exibição na hora de posicionar a hitbox).
 */
interface FaseSerpente {
  arte: string;
  anim: string;
  hp: number;
  /**
   * Offset da cabeça VULNERÁVEL (o CRÂNIO), do centro da arte. ⚠️ 29/10 (S1b): medido na grade — os de julho
   * (`find-cabecas`, o centro da COR da cabeça) caíam no PESCOÇO da ciano e da verde, 25–35 px de arte abaixo do crânio.
   */
  cabeca: { x: number; y: number };
  /** De onde os PROJÉTEIS da fusão saem (a boca aberta fica abaixo do crânio). As cabeças usam as bocas medidas. */
  boca?: { x: number; y: number };
  /** Onde os COTOS fumegam nesta fase (as cabeças que já morreram). */
  cotos: { x: number; y: number }[];
  escala: number;
  /** Onde os DESTROÇOS mordem esta forma, em ordem (px de arte, como a `cabeca`). Ausente = a cabeça viva. */
  mordidas?: readonly { x: number; y: number }[];
  /** A forma na luta (`numerosSerpente.FORMAS`). */
  luta: 'A' | 'B' | 'C' | 'fusao';
  /** As cabeças VIVAS (cada uma cospe na sua cor — 29/10, ele: *"Cada cabeça atira de uma cor"*). */
  cores: Cor[];
}

/** O que a cena empresta à arena: as peças da faixa do casco e o motor de destroços (os estouros nos próprios pixels). */
export interface ArenaSerpente {
  pecas: () => Phaser.GameObjects.Image[];
  estourar: (s: Phaser.GameObjects.Sprite, de: { x: number; y: number }, material: 'biomec' | 'rocha') => void;
  /** as balas ativas do jogador (o gás: as que o atravessam o aquecem — spec das habilidades §5.4) */
  balas: () => readonly Phaser.Physics.Arcade.Sprite[];
  /** INCENDIÁRIO na mão (o gás acende no primeiro tiro que o toca) */
  incendiario: () => boolean;
}

type Corpo = 'nada' | 'repouso';

// O ADITIVO PURO das veias (o (ONE, ONE) — ver `serpente/aditivo.ts`, de onde a luz da enguia também o tira; o das
// VEIAS tem o tamanho do quadro dela, e o `ADD` do Phaser escurecia um retângulo em volta dela sobre nuvem clara).

/**
 * SERPENTE DO CASCO — chefão da Fase 3. A luta é por ANATOMIA (design do Henrique).
 *
 * Cada fase tem UMA cabeça que cai quando a vida da forma acaba, e a queda TROCA A ARTE: o dano vira anatomia visível
 * (a gramática Metal Slug que o Henrique pediu). A cabeça que cai LEVA A HABILIDADE DELA (02/11). Desde 03/11 O CORPO
 * INTEIRO LEVA DANO (ele: *"basta acertar o corpo e as cabeças vão caindo conforme a vida desce, assim fica mais justo"*):
 * qualquer pixel visível dela (`acertoNoCorpo`), e a cabeça que vai cair vale `LUTA.cabecaVale` (mais, não o dobro).
 *
 *   A  3 cabeças   vulnerável: CIANO     chuva de casulos → raio → gás + faísca, com tiros comuns nas pausas
 *   B  2 cabeças   vulnerável: VERDE     chuva (2 ondas) → gás + faísca (os gestos feridos e furiosos)
 *   C  1 cabeça    vulnerável: LARANJA   "saia da linha" (rajada mirada) + o leque, com a brasa
 *   F  FUSÃO       a cabeça única        o leque e a rajada em ciclo, com silêncio curto
 *
 * ⚠️ A ORDEM É ESQUERDA → DIREITA, E ISSO É ESTRUTURAL (playtest do Henrique, 2026-07-18): a cabeça vulnerável tem que
 * ser sempre a mais ALCANÇÁVEL — ciano (a da frente), depois a verde, por último a laranja.
 *
 * ⚠️ 29/10 — S1b, ELA VIVE NO CASCO (spec `2026-10-29-serpente-luta-s1b-design.md`): a chegada para o casco INTEIRO, ele
 * treme e estoura de dentro para fora, ela sobe pelo rombo; a morte da de 3 cabeças afunda no rombo, as três luzes
 * convergem lá dentro, e a maior irrompe dele (`fusao`).
 *
 * ⚠️ 02/11 — AS HABILIDADES (spec `2026-11-02-serpente-habilidades-instalacao-design.md`): a INVESTIDA SAIU de todas as
 * formas (a escolha dele). Nas formas A e B, o CICLO: uma pausa com dois tiros comuns, e a próxima habilidade da forma no
 * posto (o das maquetes; desde 03/11 o ÚNICO: ela não sobe nem desce na luta, só as animações a mexem). Cada
 * habilidade é um módulo em `serpente/`, portado da maquete aprovada, e fala com ela pela fachada `corpoHab`; tudo o que ela solta é desenhado na camada de pixels (`CamadaPixels`), e os gestos são os
 * conjuntos do PixelLab (`Tocador`).
 */
export class BossSerpente implements StageBoss {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  /** A hitbox VIVA (a cabeça vulnerável da fase). É o contrato multi-parte do StageBoss. */
  readonly targets: Phaser.Physics.Arcade.Sprite[] = [];

  private hpFase: number;
  private hpTotal: number;
  private readonly maxHpTotal: number;
  private faseIdx = 0;
  /** Durante a cena da FUSÃO (ver `fusao`): a máquina da luta para e a cena manda. */
  private colapso = false;
  private t = 0;
  private entering = true;
  private dead = false;
  /** Segundos de imunidade durante uma TRANSIÇÃO (a cadeia de explosões não é janela de dps). */
  private imune = 0;

  private readonly cabeca: Phaser.Physics.Arcade.Sprite;

  // ─── Relógios dos padrões (a C e a fusão) ───
  private cdPrincipal = 1.5;
  private cdSecundario = 3.2;
  /** o passo do ciclo da fusão (o leque, a rajada, o silêncio) */
  private furiaPasso = 0;

  /** O CICLO (spec §2): uma pausa com tiros comuns, depois a próxima habilidade da forma (começa no laço do idle). */
  private ciclo: { estado: 'pausa' | 'espera' | 'hab'; t: number; passo: number; hab: NomeHab | null } = { estado: 'pausa', t: 0, passo: 0, hab: null };
  private readonly habs: Partial<Record<NomeHab, Habilidade>> = {};
  /** uma habilidade cuja cabeça morreu, se desfazendo (`HAB.aborta`): ainda atualizada e desenhada até sumir */
  private abortando: Habilidade | null = null;
  /** uma habilidade que acabou mas ainda tem algo na tela se apagando (o casco cortado pelo raio esfriando): ainda
   * atualizada e desenhada, sem o ciclo esperar por ela (`Habilidade.restos`) */
  private rescaldo: Habilidade | null = null;
  /** a camada de pixels, o tocador dos conjuntos, as luzes, e a fachada que as habilidades usam */
  private readonly camada: CamadaPixels;
  private readonly tocador: Tocador;
  private readonly luzes: Luzes;
  private readonly corpoHab: CorpoSerpente;
  /** os tiros comuns (as pausas da A e da B, a C com a brasa) */
  private readonly tiros: Tiros;
  /** a nave (a fachada lê o centro da caixa dela) */
  private alvo: Phaser.Physics.Arcade.Sprite | null = null;
  /** o tranco de tela deste quadro (px inteiros), as luzes e o clarão quente deste quadro */
  private readonly chute = { x: 0, y: 0 };
  private niveisLuz: Partial<Record<Cor, number>> = {};
  private tinta = 0;

  private corpo: Corpo = 'nada';

  /** O ROMBO: a faixa do casco que entra INTEIRA e estoura na chegada (S1b); o LÁBIO nasce no estouro. */
  private romboLabio: Phaser.GameObjects.Image | null = null;
  /** A CHEGADA: o rombo entra com o casco (`chegando`), o mundo freia (`freando`), o casco treme (`tremendo`) e estoura,
   * e ela sobe (`subindo`). `velMundo` é a velocidade do mundo que ela deixa (px/s) — a cena a lê em `mundo`. */
  private entrada: 'chegando' | 'freando' | 'tremendo' | 'subindo' | null = 'chegando';
  private entradaT = 0;
  private velMundo = SCROLL_SPEED;
  private tremorCd = 0;
  /** O CASCO VIVO da arena (nasce quando o mundo para). */
  private casco: CascoVivo | null = null;
  /** A cena da fusão: o passo e o relógio. */
  private fusaoPasso: 'afundando' | 'silencio' | 'luzes' | 'implosao' | 'surgindo' | null = null;
  private fusaoT = 0;
  private fusaoObjs: Phaser.GameObjects.GameObject[] = [];
  /**
   * A ENGUIA COLOSSAL (08/11, a S2 — spec `2026-11-03-serpente-grande-enguia-design.md`): a fase 4 da luta, no lugar da
   * fusão de hoje. Ela roda num worker (`serpente/enguia/`), portada da maquete aprovada; aqui ficam a vida dela, a barra
   * e o contrato com a cena. `emEnguia`: ela já irrompeu (o resto da máquina de formas para).
   */
  private enguia: EnguiaEmJogo | null = null;
  private vidaEnguia: VidaEnguia | null = null;
  private emEnguia = false;

  /** AS VEIAS (28/10, S1 — no lugar da estrela) e a SOMBRA que apaga as das outras cabeças. */
  private readonly veias: Phaser.GameObjects.Image;
  private readonly sombra: Phaser.GameObjects.Image;

  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly bar: Phaser.GameObjects.Rectangle;
  /** UM de cada, criados aqui e reaproveitados a luta inteira (armadilha nº 5). */
  private readonly muzzleFx: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly smokeFx: Phaser.GameObjects.Particles.ParticleEmitter;
  /** o pó do casco (o tremor, o estouro) */
  private readonly poeiraFx: Phaser.GameObjects.Particles.ParticleEmitter;
  /** o cascalho: os pixels das placas que saltam da boca do rombo na fusão (por trás dela) */
  private readonly cascalhoFx: Phaser.GameObjects.Particles.ParticleEmitter;
  private smokeCd = 0;
  private poeiraCd = 0;

  private static readonly FASES: FaseSerpente[] = [
    { arte: 'serpente', anim: 'serpente-idle', hp: LUTA.vida.A, cabeca: FORMAS.A.cabeca, cotos: [], escala: 0.55, luta: 'A', cores: ['ciano', 'verde', 'laranja'] },
    { arte: 'serpente2c', anim: 'serpente-2c-idle', hp: LUTA.vida.B, cabeca: FORMAS.B.cabeca, cotos: [{ x: -63.1, y: -43.3 }], escala: 0.55, luta: 'B', cores: ['verde', 'laranja'] },
    { arte: 'serpente1c', anim: 'serpente-1c-idle', hp: LUTA.vida.C, cabeca: FORMAS.C.cabeca, cotos: [{ x: -60, y: -25 }, { x: -10, y: -50 }], escala: 0.55, luta: 'C', cores: ['laranja'] },
    // A fusão é MAIOR (0.63 vs 0.55 ≈ +15%): "um boss maior com uma cabeça só". Os offsets são da arte de 2026-09-01
    // (o crânio virado para oeste), medidos: cabeça -52.0,-75.6 (o osso do crânio), boca -58.0,-30.0 (a goela).
    // ⚠️ AS MORDIDAS (28/10): os destroços mordem pescoço → queixo → crânio.
    { arte: 'serpenteFusao', anim: 'serpente-fusao-fury', hp: LUTA.vida.fusao, cabeca: FORMAS.fusao.cabeca, boca: { x: -58.0, y: -30.0 }, cotos: [{ x: 30, y: 30 }, { x: -20, y: 60 }], escala: 0.63, mordidas: MORDIDAS_FUSAO, luta: 'fusao', cores: [] },
  ];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: EnemySystem,
    private readonly fx: Fx,
    /** a faixa do casco com o rombo, INTEIRA na chegada (`Parallax.inserirNoCasco`); sem ela, nasce no posto */
    private readonly rombo: Phaser.GameObjects.Image | null = null,
    private readonly arena: ArenaSerpente | null = null,
    /** o atalho de dev (`?serpente=A&hab=raio`): a forma já na chegada, a habilidade forçada no ciclo */
    private readonly dev: DevSerpente | null = null,
  ) {
    const fases = BossSerpente.FASES;
    this.hpFase = fases[0].hp;
    this.maxHpTotal = fases.reduce((s, f) => s + f.hp, 0);
    this.hpTotal = this.maxHpTotal;

    // Ela nasce ESCONDIDA no casco, no x do rombo (que entra com o casco); só sobe dele depois do estouro.
    const f = FORMAS.A;
    this.sprite = scene.physics.add.sprite(rombo?.x ?? LUTA.rombo.x, rombo ? escondidaRombo(f) : romboY(), fases[0].arte);
    this.sprite.setScale(fases[0].escala).setDepth(30);
    if (scene.anims.exists(fases[0].anim)) this.sprite.play(fases[0].anim);
    if (!rombo) {
      this.entrada = null;
      this.entering = false;
      this.velMundo = 0;
    } else this.sprite.setVisible(false);
    // o gesto acaba na pose do idle: de volta a ele (e à origem do quadro do idle)
    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (a: Phaser.Animations.Animation) => {
      if (a.key.startsWith('serpente-erguer')) this.tocarIdle();
    });
    // a habilidade começa quando o idle volta ao quadro 0 (a maquete: todo conjunto parte do quadro aprovado)
    this.sprite.on(Phaser.Animations.Events.ANIMATION_REPEAT, () => {
      if (this.ciclo.estado === 'espera') this.comecarHab();
    });

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.sprite.setData('boss', this);

    // A CABEÇA VULNERÁVEL: a hitbox própria, invisível (sem a estrela desde a S1 — quem marca a cabeça viva são as VEIAS
    // e o acerto que sangra). O círculo é o da cabeça desenhada (`cravarCirculo`).
    this.cabeca = scene.physics.add.sprite(this.sprite.x, this.sprite.y, 'flash');
    this.cabeca.setScale(2.2).setDepth(31).setVisible(false);
    (this.cabeca.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.cabeca.setData('boss', this);
    this.targets.push(this.cabeca);
    this.cravarCirculo();

    // (sem a arte da faixa inteira — o treino velho, um rombo já aberto —, o lábio nasce já)
    if (rombo && rombo.texture.key === 'serpenteRombo') this.criarLabio();

    this.veias = scene.add.image(this.sprite.x, this.sprite.y, '__DEFAULT').setBlendMode(aditivoPuro(scene)).setVisible(false);
    this.sombra = scene.add.image(this.sprite.x, this.sprite.y, '__DEFAULT').setVisible(false);

    this.muzzleFx = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 200,
        speed: { min: 30, max: 120 },
        scale: { start: 2.2, end: 0 },
        tint: [0xff3a78, 0xffd9a0],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(50);

    // A fumaça dos COTOS ('puff', nunca a 'spark' quadrada): o dano acumulado FICA visível.
    this.smokeFx = scene.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 380, max: 640 },
        speedY: { min: -26, max: -10 },
        speedX: { min: -6, max: 6 },
        scale: { start: 0.5, end: 1.5 },
        alpha: { start: 0.45, end: 0 },
        tint: [0x2a3040, 0x4a5060, 0xff8c1a],
        emitting: false,
      })
      .setDepth(32);

    // O PÓ DO CASCO: o tom de pó azul-cinza da pedra/metal (o `FUMO` metal dos destroços), saindo da crista.
    this.poeiraFx = scene.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 380, max: 700 },
        speedY: { min: -24, max: -6 },
        speedX: { min: -10, max: 10 },
        scale: { start: 0.25, end: 0.7 },
        alpha: { start: 0.55, end: 0 },
        tint: [0x626a7e, 0x444b5e],
        emitting: false,
      })
      .setDepth(-0.3);

    this.cascalhoFx = scene.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 450, max: 850 },
        speed: { min: 70, max: 210 },
        angle: { min: 205, max: 335 },
        gravityY: 300,
        alpha: { start: 1, end: 0, ease: 'Quad.easeIn' },
        emitting: false,
      })
      .setDepth(29);

    this.barBg = scene.add.rectangle(GAME_WIDTH / 2, BARRA_CHEFAO_Y, 160, 4, 0x531a30).setDepth(100);
    this.bar = scene.add
      .rectangle(GAME_WIDTH / 2 - 80, BARRA_CHEFAO_Y, 160, 4, 0xff3a78)
      .setOrigin(0, 0.5)
      .setDepth(101);

    // AS HABILIDADES (02/11): a camada de pixels, o tocador dos conjuntos, as luzes, e a fachada
    this.camada = new CamadaPixels(scene);
    this.tocador = new Tocador(this.sprite, () => this.fase.anim);
    this.luzes = new Luzes(scene);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.corpoHab = {
      scene,
      enemies,
      tocador: this.tocador,
      get forma() {
        return self.fase.luta;
      },
      get cores() {
        return self.fase.cores;
      },
      boca: (cor) => this.posBoca(cor),
      labios: () => {
        const b = this.posBoca('verde');
        return { x: b.x - 3, y: b.y + 1.5 };
      },
      ponto: (chave, i, tipo) => {
        const c = CONJUNTOS[chave], p = tipo === 'olho' ? c.olho?.[i] : Object.values(c.bocas)[0]?.[i];
        return p ? this.naTela(p) : null;
      },
      nave: () => {
        const b = this.alvo?.body as Phaser.Physics.Arcade.Body | undefined;
        return b ? { x: b.center.x, y: b.center.y } : { x: 60, y: 108 };
      },
      bordaEsq: (y) => this.camada.bordaEsq(y),
      treme: (x, y) => {
        this.chute.x = x;
        this.chute.y = y;
      },
      balas: () => this.arena?.balas() ?? [],
      incendiario: () => this.arena?.incendiario() ?? false,
      contra: () => {
        this.damage(this.fase.hp * HAB.contra);
      },
      gesto: (acao) => this.comGesto(acao),
      luz: (niveis, tinta = 0) => {
        this.niveisLuz = niveis;
        this.tinta = tinta;
      },
    };
    this.tiros = new Tiros(this.corpoHab);
    this.habs.chuva = new Chuva(this.corpoHab);
    // (the B's cycle has no beam: `HAB.ciclo`)
    this.habs.raio = new Raio(this.corpoHab);
    this.habs.gas = new Gas(this.corpoHab);

    this.definirCorpo(rombo ? 'nada' : 'repouso');

    // A ENGUIA: o worker monta a arte dela já agora (≈1 s, fora da linha do jogo), muito antes da fusão
    if (scene.textures.exists('enguiaF1') && typeof Worker !== 'undefined')
      this.enguia = new EnguiaEmJogo(scene, { maquete: this.dev?.roteiro === 'maquete', taxa: this.dev?.taxa ?? 30 });
  }

  /** A MORTE ENCENADA (a enguia, `StageBoss.morteAcabou`): ela já tocou a própria morte no rombo; a cena só fecha. */
  get morteAcabou(): boolean {
    return this.emEnguia && !!this.enguia?.estado?.acabou;
  }

  get isDead(): boolean {
    return this.dead;
  }

  /**
   * Os DESTROÇOS (27/10): a vida é a da luta inteira, e a morte é a ruptura nos próprios pixels (D1). As mordidas (28/10)
   * são três, todas na fusão, cada uma no seu ponto: pescoço, queixo, crânio; nas outras formas a mira é a cabeça viva.
   */
  get destrocos():
    | {
        quem: string;
        vida: number;
        forma: number;
        mira?: { x: number; y: number } | { x: number; y: number }[];
        zona?: { x: number; y: number; r: number };
      }
    | undefined {
    // (a enguia se desfaz pelas próprias mordidas e pela morte no rombo: o motor de destroços não morde um sprite escondido)
    if (this.emEnguia) return undefined;
    const viva = this.cabeca.active ? { x: this.cabeca.x, y: this.cabeca.y } : undefined;
    const f = this.fase;
    return {
      quem: 'serpente',
      vida: Math.max(0, this.hpTotal / this.maxHpTotal),
      forma: this.faseIdx,
      mira: f.mordidas ? f.mordidas.map((p) => ({ x: this.sprite.x + p.x * f.escala, y: this.sprite.y + p.y * f.escala })) : viva,
      // ⚠️ AS MARCAS DOS TIROS NA CABEÇA (27/10): a zona é a cabeça desenhada — para o tiro que entrou pelo círculo dela.
      // O que fere o corpo (03/11) marca onde tocou (a cena solta a zona).
      zona: viva && { ...viva, r: BossSerpente.RAIO_CABECA * this.fase.escala },
    };
  }

  /** Meia cabeça, em px da arte (medida na grade, 27/10). */
  private static readonly RAIO_CABECA = 30;
  /** a cápsula da cabeça desenhada (crânio → boca) é este tanto maior que o círculo (03/11: a ponta do focinho) */
  private static readonly FOLGA_CABECA = 1.25;
  /** nos gestos, a luz da cabeça até este tanto do raio da cápsula a partir da boca é cabeça (a boca aberta e acesa) */
  private static readonly BOCA_ACESA = 1.2;
  /** nos gestos, o corte reto da cápsula fica este tanto (px de tela) além da boca */
  private static readonly ALEM_GESTO = 10;

  private get fase(): FaseSerpente {
    return BossSerpente.FASES[this.faseIdx];
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  /** A forma na luta. */
  private get forma(): FormaLuta {
    return FORMAS[this.fase.luta];
  }

  /** A letra do gesto (o erguer existe para as formas de cabeças; a fusão não tem). */
  private get letra(): 'A' | 'B' | 'C' | null {
    const l = this.fase.luta;
    return l === 'fusao' ? null : l;
  }

  /** O centro do rombo agora (ele rola com o mundo até parar). */
  private romboX(): number {
    return this.rombo?.x ?? LUTA.rombo.x;
  }

  /** A fração da velocidade do mundo que ela deixa (`StageBoss.mundo`): 1 até o rombo chegar, 0 com ele parado. */
  get mundo(): number {
    return this.velMundo / SCROLL_SPEED;
  }

  /**
   * UM MOMENTO CALMO DA LUTA (`StageBoss.momentoCalmo`; 08/11, o cenário do casco — a batalha ao fundo só passa nele).
   * Só LEITURA, nada da luta muda. A enguia: os trechos em que ela mergulha ou afunda (fora dos canos, do Eco, dos
   * gêiseres e de todo aviso); as 3 cabeças: a pausa entre as habilidades, depois da entrada.
   */
  get momentoCalmo(): boolean {
    const e = this.enguia;
    if (e?.ativa) return BossSerpente.TRECHOS_CALMOS.has(e.estado?.trecho ?? '');
    return !this.entering && this.ciclo.estado === 'pausa';
  }
  private static readonly TRECHOS_CALMOS = new Set(['mergulho', 'mergulho-cauda', 'volta-escondida', 'afunda']);

  /**
   * O CÍRCULO DO ACERTO DO TAMANHO DA CABEÇA (28/10, S1): `RAIO_CABECA × escala` em px de tela (16,5 nas cabeças,
   * 18,9 na fusão), no corpo do `flash` (escala 2,2), centrado nele. Recravado a cada forma.
   */
  private cravarCirculo(): void {
    const raio = (BossSerpente.RAIO_CABECA * this.fase.escala) / this.cabeca.scaleX;
    const b = this.cabeca.body as Phaser.Physics.Arcade.Body;
    b.setCircle(raio, this.cabeca.frame.width / 2 - raio, this.cabeca.frame.height / 2 - raio);
  }

  // ─── O laço ─────────────────────────────────────────────────────────────────

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    if (this.dead) return;

    this.t += dt;
    if (this.imune > 0) this.imune -= dt;
    this.alvo = target;

    // a enguia: a arte dela lida aos poucos (uns PNGs por quadro, até mandar ao worker); depois, o relógio dela anda
    // desde as luzes da fusão (a resposta do worker chega num quadro seguinte)
    this.enguia?.carrega();
    if (this.enguia?.ativa) {
      const b = target.body as Phaser.Physics.Arcade.Body;
      this.enguia.update(dt, { x: b.center.x, y: b.center.y });
    }
    if (this.entering) this.chegar(dt);
    else if (this.colapso) this.colapsar(dt);
    else if (!this.emEnguia) {
      this.mover();
      this.atacar(dt, target);
      this.fumegar(dt);
    }
    // os gestos e as habilidades (antes de a cabeça e as veias se ajustarem ao quadro mostrado)
    this.tocador.update(dt);
    this.tiros.update(dt);
    const h = this.habViva();
    h?.update(dt);
    this.abortando?.update(dt);
    if (this.abortando && !this.abortando.viva) this.abortando = null;
    this.rescaldo?.update(dt);
    if (this.rescaldo && !this.rescaldo.restos) this.rescaldo = null;
    if (this.emEnguia) this.sincronizarEnguia();
    else this.sincronizarCabeca();
    this.casco?.update(dt);
    // a camada: o que elas soltam, sobre o corpo dela ou sob a nave
    this.camada.inicio();
    this.camada.marcarCorpo(this.sprite, this.romboLabio ? [this.romboLabio] : []);
    h?.desenhar(this.camada.put);
    this.abortando?.desenhar(this.camada.put);
    this.rescaldo?.desenhar(this.camada.put);
    this.tiros.desenhar(this.camada.put);
    this.camada.fim();
    this.luzes.atualizar(this.sprite, this.folhaDeLuz(), this.quadroDeLuz(), this.niveisLuz, this.tinta);
    this.niveisLuz = {};
    this.tinta = 0;
    // o tranco de tela (o raio 2 px, a bicada 1 px, o contra): só neste quadro
    this.scene.cameras.main.setScroll(-this.chute.x, -this.chute.y);
    this.chute.x = this.chute.y = 0;
  }

  /** A habilidade rodando agora, se alguma. */
  private habViva(): Habilidade | undefined {
    return this.ciclo.estado === 'hab' && this.ciclo.hab ? this.habs[this.ciclo.hab] : undefined;
  }

  /**
   * O CORPO INTEIRO LEVA DANO (03/11 — ele: *"basta acertar o corpo e as cabeças vão caindo conforme a vida desce, assim
   * fica mais justo"*): onde a caixa de um tiro do jogador cai no DESENHO dela, como ele está na tela (o quadro mostrado,
   * a cópia furada dos destroços inclusive) — `StageBoss.acertoNoCorpo`. A CABEÇA que vai cair é o desenho dela do
   * crânio até um pouco depois da boca (`naCabeca`), com `FOLGA_CABECA` × o raio do círculo de largura: o focinho da
   * verde e o canhão da laranja saem do círculo do crânio, e a ponta do focinho da verde da B fica a 18 px da linha
   * crânio → boca (o tiro no focinho é tiro na cabeça); depois da boca o corte é RETO, senão a ponta redonda pegava o
   * pescoço da azul morta ao lado da boca da verde (o mapa do acerto da sonda `corpo --mapa`). Escondida no casco, nada.
   *
   * A BOCA ABERTA CONTA COMO CABEÇA (03/11 — ele: *"pode fazer contar como cabeça"*): nos gestos, a boca escancarada
   * passa do corte (no gás da B a "boca" medida é a garganta acesa, colada ao crânio, e as mandíbulas abertas ficavam
   * corpo — de frente, só 1 linha de cabeça). Num quadro de conjunto, o que a máscara de LUZ dessa cabeça acende perto
   * da boca (a garganta e a língua acesas) também é cabeça: o toco morto e as outras cabeças não têm essa luz, então o
   * corte reto continua valendo para eles (`sonda-hab mapa-gestos`).
   */
  acertoNoCorpo(x0: number, y0: number, x1: number, y1: number): 'cabeca' | 'corpo' | 'casco' | null {
    // (a enguia: o que ela pintou no último quadro — a cabeça, o corpo, ou o lábio na frente dela)
    if (this.emEnguia) return this.dead || !this.enguia ? null : this.enguia.acerto(x0, y0, x1, y1);
    if (this.dead || this.corpo === 'nada') return null;
    const ela = this.camada.mascara(this.sprite);
    if (!ela) return null;
    const cranio = this.posCabeca(), cor = this.fase.cores[0];
    const boca = cor ? this.posBoca(cor) : this.posBocaFusao();
    const r = BossSerpente.RAIO_CABECA * this.fase.escala * BossSerpente.FOLGA_CABECA;
    const q = this.tocador.atual, luz = q && cor && CONJUNTOS[q.chave].luzes.includes(cor) ? this.camada.mascaraDe(`serpenteHabLuz_${cor}_${q.chave}`, q.i, this.sprite) : null;
    const rb2 = (r * BossSerpente.BOCA_ACESA) ** 2;
    // in a set's frame the jaws gape past the mouth point: the straight cut moves `ALEM_GESTO` px past it
    const L = Math.hypot(boca.x - cranio.x, boca.y - cranio.y), alem = q && L > 1 ? Math.max(0.2, BossSerpente.ALEM_GESTO / L) : 0.2;
    const cabeca = (X: number, Y: number): boolean =>
      naCabeca(X + 0.5, Y + 0.5, cranio, boca, r, alem) || (!!luz && opaco(luz, X, Y) && (X + 0.5 - boca.x) ** 2 + (Y + 0.5 - boca.y) ** 2 <= rb2);
    return ondeCai(ela, this.romboLabio ? this.camada.mascara(this.romboLabio) : null, x0, y0, x1, y1, cabeca);
  }

  /** A cabeça que vai cair vale mais, não o dobro (03/11 — ele: *"Ele recompensa, mas não facilita o dobro"*). */
  readonly valeAlvo = LUTA.cabecaVale;

  /** O que a habilidade fere por medição (o raio, a geleia de fogo): `StageBoss.morde`. */
  morde(esq: number, dir: number, topo: number, base: number): boolean {
    // (a enguia: o corpo e a cabeça dela, o fogo dos canos, os gêiseres e as explosões do Eco — os perigos da maquete)
    if (this.emEnguia) return !!this.enguia && !this.dead && this.enguia.morde(esq, dir, topo, base);
    const h = this.habViva();
    return !!h && h.viva && !!h.morde && h.morde(esq, dir, topo, base);
  }

  /**
   * A CHEGADA (S1 + S1b): o rombo entra com o casco (`chegando`); a `freadaDe` px do posto o mundo FREIA e para com ele
   * no lugar; o casco nasce vivo e TREME sobre ela (`tremendo`: a lombada larga pulsando, o pó, a câmera) e ESTOURA de
   * dentro para fora (`estourarChegada`); ela SOBE pelo rombo (`subindo`) até o posto (03/11: o único, onde ela fica a
   * luta inteira) — só então a luta começa (`entering` falso: até lá ela não leva dano).
   */
  private chegar(dt: number): void {
    const f = this.forma;
    if (this.entrada === 'chegando' && this.romboX() <= LUTA.rombo.x + freadaDe(SCROLL_SPEED)) this.entrada = 'freando';
    if (this.entrada === 'freando') {
      this.velMundo = Math.max(0, this.velMundo - LUTA.freada * dt);
      if (this.velMundo === 0) {
        this.entrada = 'tremendo';
        this.entradaT = LUTA.tremor;
        this.criarCasco();
      }
    }
    if (this.entrada === 'chegando' || this.entrada === 'freando') {
      this.sprite.setPosition(this.romboX(), escondidaRombo(f));
      this.body.setVelocity(0, 0);
      return;
    }
    if (this.entrada === 'tremendo') {
      this.entradaT -= dt;
      // as placas sobem e descem 1–2 px sobre ela, o pó sai da crista, a câmera dá tremores curtos
      if (this.casco) this.casco.lombada = { x: this.romboX(), amp: 1 + (Math.sin(this.t * 34) > 0 ? 1 : 0), larg: 38 };
      this.empoeirar(this.romboX() + Phaser.Math.Between(-60, 60), dt, 0.04);
      this.tremorCd -= dt;
      if (this.tremorCd <= 0) {
        this.tremorCd = 0.38;
        this.scene.cameras.main.shake(110, 0.003);
      }
      if (this.entradaT <= 0) {
        this.estourarChegada();
        this.entrada = 'subindo';
        this.mostrar();
      }
      return;
    }
    // subindo
    this.sprite.x = this.romboX();
    this.body.setVelocity(0, -LUTA.subida);
    if (this.sprite.y <= romboY()) {
      this.sprite.y = romboY();
      this.body.setVelocity(0, 0);
      this.entering = false;
      this.entrada = null;
      this.definirCorpo('repouso');
      // O ATALHO DE DEV (spec das habilidades §5.6): a forma pedida já na chegada (a fusão: a cena da fusão já aqui, e a
      // enguia irrompe dela)
      if (this.dev?.forma === 'fusao') this.fusao();
      else if (this.dev && this.dev.forma !== 'A') this.vestirFase({ A: 0, B: 1, C: 2 }[this.dev.forma]);
    }
  }

  /** O casco vivo da arena (o mundo parou: a faixa não mexe mais). */
  private criarCasco(): void {
    if (this.casco || !this.arena) return;
    this.casco = new CascoVivo(this.scene, this.arena.pecas, () => this.rombo);
    this.casco.copiar();
  }

  private criarLabio(): void {
    if (this.romboLabio || !this.rombo || !this.scene.textures.exists('serpenteRomboLabio')) return;
    this.romboLabio = this.scene.add.image(this.rombo.x, this.rombo.y, 'serpenteRomboLabio').setOrigin(0.5, 1).setDepth(35);
  }

  /** O CASCO EXPLODE E O BURACO SE ABRE (ele): os pixels da faixa inteira onde o rombo vai ser voam, e ela vira o rombo. */
  private estourarChegada(): void {
    const r = this.rombo;
    if (!r) return;
    if (this.casco) {
      this.casco.lombada = null;
      const s = this.casco.estouroDoRombo(r);
      if (s) this.estourar(s, r.x, -80);
    }
    if (this.scene.textures.exists('serpenteRombo')) r.setTexture('serpenteRombo');
    this.criarLabio();
    this.casco?.copiar();
    this.muzzleFx.explode(18, r.x, LUTA.crista + 10);
    for (let i = 0; i < 14; i++) this.poeiraFx.emitParticleAt(r.x + Phaser.Math.Between(-70, 70), LUTA.crista - Phaser.Math.Between(0, 6));
    this.scene.cameras.main.shake(260, 0.011);
  }

  /**
   * OS PIXELS DO CASCO QUE SAEM, quebrados pelo motor de destroços, de baixo para cima. `vy` é a velocidade que o sprite
   * temporário entrega aos pedaços (o motor herda ~45% dela): na chegada, um empurrão leve deixa a quebra lenta que ele
   * vê de longe.
   */
  private estourar(s: Phaser.GameObjects.Sprite, x: number, vy: number, vx = 0, material: 'biomec' | 'rocha' = 'biomec'): void {
    this.scene.physics.add.existing(s);
    const b = s.body as Phaser.Physics.Arcade.Body;
    b.setAllowGravity(false);
    b.setVelocity(vx, vy);
    this.arena?.estourar(s, { x, y: GAME_HEIGHT + 60 }, material);
    this.casco?.descartar(s);
  }

  // ─── O movimento: só a máquina de estados (nunca tween de posição — armadilha nº 2) ───

  /**
   * ELA FICA NO POSTO (03/11 — ele: *"A serpente sobe e desce no buraco, com um movimento muito irreal"*): o das maquetes
   * (onde as esquivas foram medidas), a luta inteira, em todas as formas. Nada desliza o desenho: só as animações dela
   * (o idle, os gestos) a mexem. (Antes: três alturas trocadas nas pausas e uma "respiração" que subia e descia o sprite.)
   */
  private mover(): void {
    this.sprite.setPosition(this.romboX(), romboY());
    this.body.setVelocity(0, 0);
  }

  /** O pó da crista, de tempos em tempos (`cada` s). */
  private empoeirar(x: number, dt: number, cada: number): void {
    this.poeiraCd -= dt;
    if (this.poeiraCd > 0) return;
    this.poeiraCd = cada;
    this.poeiraFx.emitParticleAt(x + Phaser.Math.Between(-6, 6), LUTA.crista - Phaser.Math.Between(0, 3));
  }

  // ─── O ciclo e os padrões ───────────────────────────────────────────────────

  private atacar(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    if (this.imune > 0) return;
    const l = this.fase.luta;
    if (l === 'C') return this.atacarC(dt);
    if (l === 'fusao') return this.atacarFusao(dt, target);
    // A e B: O CICLO (spec §2.1–2.2). O atalho de dev força uma habilidade (ou só as pausas: `tiros`)
    const ciclo = HAB.ciclo[l];
    const lista = this.dev?.hab === 'tiros' ? [] : this.dev?.hab ? ciclo.filter((n) => n === this.dev?.hab) : ciclo;
    const c = this.ciclo;
    c.t += dt;
    switch (c.estado) {
      case 'pausa': {
        if (HAB.pausa.tiros.some((tt) => cruza(c.t - dt, c.t, tt))) this.tiros.comum();
        if (c.t < HAB.pausa.dur) return;
        c.t = 0;
        const nome = lista.length ? rodizio(lista, c.passo) : null;
        c.passo++;
        // (sem o módulo dela ainda — ou nenhuma: outra pausa)
        if (!nome || !this.habs[nome]) return;
        c.hab = nome;
        c.estado = 'espera';
        return;
      }
      case 'espera':
        // o `ANIMATION_REPEAT` do idle a começa (no construtor); por garantia, um ciclo do idle no máximo
        if (c.t > 1.5) this.comecarHab();
        return;
      case 'hab': {
        const h = c.hab ? this.habs[c.hab] : undefined;
        if (!h || !h.viva) {
          if (h?.restos) this.rescaldo = h;
          c.estado = 'pausa';
          c.t = 0;
          c.hab = null;
        }
        return;
      }
    }
  }

  private comecarHab(): void {
    const c = this.ciclo;
    const h = c.hab ? this.habs[c.hab] : undefined;
    if (!h) {
      c.estado = 'pausa';
      c.t = 0;
      return;
    }
    // (the same instance starting again stops drawing its old leftovers: `comecar` resets them)
    if (this.rescaldo === h) this.rescaldo = null;
    h.comecar();
    c.estado = 'hab';
    c.t = 0;
  }

  /** A C (a de hoje, sem a investida): a rajada mirada e o leque, cada um no seu relógio, com a brasa. */
  private atacarC(dt: number): void {
    this.cdPrincipal -= dt;
    this.cdSecundario -= dt;
    const C = HAB.tiros.C;
    if (this.cdPrincipal <= 0) {
      this.cdPrincipal = C.rajada.cada;
      this.comGesto(() => this.tiros.rajadaC());
    }
    if (this.cdSecundario <= 0) {
      this.cdSecundario = C.leque.cada;
      this.comGesto(() => this.tiros.lequeC());
    }
  }

  /** A FÚRIA (a fusão, sem a investida): o leque, a rajada e o silêncio, em ciclo (a regra da Capitânia). */
  private atacarFusao(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    this.cdPrincipal -= dt;
    if (this.cdPrincipal > 0) return;
    switch (this.furiaPasso++ % 3) {
      case 0:
        this.leque(null, target, 7, 64, 170);
        this.cdPrincipal = 0.9;
        break;
      case 1:
        this.rajada(null, target, 4, 190);
        this.cdPrincipal = 1.0;
        break;
      default:
        this.cdPrincipal = 0.8;
    }
  }

  /**
   * O ERGUER COMO GESTO DE ATAQUE NO ROMBO (29/10 à noite — ele: *"A animação nova que escolhemos pode ser uma animação
   * no set de animações dela, quando ela está na posição inicial e atirando contra o player"*): ela se ergue e o tiro sai
   * quando as bocas abrem (o quadro 3, ~0,25 s), da boca de quem atira. Já erguida, atira na hora.
   */
  private comGesto(acao: () => void): void {
    const tocando = !!this.sprite.anims.currentAnim?.key.startsWith('serpente-erguer') && this.sprite.anims.isPlaying;
    if (!this.letra || tocando || !this.sprite.visible || this.tocador.atual) {
      acao();
      return;
    }
    this.tocarGesto();
    this.scene.time.delayedCall(250, () => {
      if (!this.dead && !this.colapso) acao();
    });
  }

  // ─── Tiros (o pool é o do EnemySystem) ───

  private tiro(x: number, y: number, angulo: number, speed: number, cor: Cor | null = 'verde'): void {
    const b = this.enemies.enemyBullets.get(x, y) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;

    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    // ⚠️ O CORPO DA VAGA REAPROVEITADA GUARDA A POSIÇÃO VELHA (29/10, a chuva tripla): o `get(x, y)` move o sprite, não o
    // corpo, e no passo seguinte a física devolve o sprite para onde o corpo estava — a gota do cuspe que acabou de
    // sair pelo alto levava a onda da chuva junto, e o descarte a soltava no mesmo quadro (9 de 10 sumiam). `reset`
    // ressincroniza (e zera a velocidade: vem antes dela).
    (b.body as Phaser.Physics.Arcade.Body).reset(x, y);
    b.anims.stop();
    // A GOTA na cor da cabeça que cospe (29/10). ⚠️ SEM TINT E SEM BLEND ADITIVO, e o MESMO quadro 13×9 do `bolt2` nas
    // três (ver `BootScene.makeShotsChefes`): a caixa de colisão é a de sempre, provadamente.
    b.setTexture(GOTA[cor ?? 'verde']).setScale(0.9).clearTint();
    b.setBlendMode(Phaser.BlendModes.NORMAL);
    b.setData('ox', x);
    b.setData('oy', y);
    b.setData('flak', false);
    b.setVelocity(Math.cos(angulo) * speed, Math.sin(angulo) * speed);
    b.setRotation(angulo);
  }

  private leque(cor: Cor | null, target: Phaser.Physics.Arcade.Sprite, n: number, aberturaDeg: number, speed: number): void {
    const de = cor ? this.posBoca(cor) : this.posBocaFusao();
    const centro = Phaser.Math.Angle.Between(de.x, de.y, target.x, target.y);
    const abertura = Phaser.Math.DegToRad(aberturaDeg);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5;
      this.tiro(de.x, de.y, centro + t * abertura, speed, cor ?? 'verde');
    }
    this.muzzleFx.explode(6, de.x, de.y);
  }

  /** Rajada de tiros MIRADOS, espaçados — cada um re-mira: quem fica parado come os três. */
  private rajada(cor: Cor | null, target: Phaser.Physics.Arcade.Sprite, n: number, speed: number): void {
    for (let i = 0; i < n; i++) {
      this.scene.time.delayedCall(i * 120, () => {
        if (this.dead || !this.sprite.active) return;
        // (a boca é lida A CADA tiro: ela se move entre um e outro)
        const boca = cor ? this.posBoca(cor) : this.posBocaFusao();
        const ang = Phaser.Math.Angle.Between(boca.x, boca.y, target.x, target.y);
        this.tiro(boca.x, boca.y, ang, speed, cor ?? 'laranja');
        this.muzzleFx.explode(3, boca.x, boca.y);
      });
    }
  }

  // ─── Anatomia ───────────────────────────────────────────────────────────────

  /** O quadro do gesto do erguer agora (o índice no ERGUER), ou null fora dele. */
  private quadroDoGesto(): number | null {
    if (!this.sprite.anims.isPlaying) return null;
    const k = this.sprite.anims.currentFrame?.textureKey ?? '';
    const m = /^serpenteErguer[ABC](\d+)$/.exec(k);
    return m ? Number(m[1]) : null;
  }

  /** O quadro do idle agora (0–8; o Phaser numera os quadros a partir de 1). */
  private quadroDoIdle(): number {
    const a = this.sprite.anims;
    return a.isPlaying && a.currentAnim?.key === this.fase.anim && a.currentFrame ? a.currentFrame.index - 1 : 0;
  }

  /** De arte (do centro) para a tela. */
  private naTela(o: { x: number; y: number }): Ponto {
    const e = this.fase.escala;
    return { x: this.sprite.x + o.x * e, y: this.sprite.y + o.y * e };
  }

  /** A cabeça vulnerável NA TELA: o crânio — num conjunto das habilidades ou no erguer, o do quadro mostrado. */
  private posCabeca(): Ponto {
    const q = this.tocador.atual;
    if (q) return this.naTela(CONJUNTOS[q.chave].cranio[q.i]);
    const l = this.letra, g = this.quadroDoGesto();
    if (l && g != null) return this.naTela(ERGUER[l].cabeca[g]);
    return this.naTela(this.fase.cabeca);
  }

  /** A BOCA de uma cabeça (cada uma cospe da sua — 29/10): a do quadro mostrado (conjunto, erguer ou idle). */
  private posBoca(cor: Cor): Ponto {
    const l = this.letra;
    if (!l) return this.posBocaFusao();
    const q = this.tocador.atual;
    if (q) {
      const p = CONJUNTOS[q.chave].bocas[cor]?.[q.i];
      if (p) return this.naTela(p);
    }
    const g = ERGUER[l], qg = this.quadroDoGesto(), quadros = g.bocas[cor];
    if (qg != null && quadros) return this.naTela(quadros[qg]);
    // no idle: a boca medida, com o deslocamento do quadro (a A medida quadro a quadro; a B, a do quadro 0)
    if (l === 'A' || l === 'B') {
      const I = IDLE_HAB[l], b = I.bocas[cor];
      if (b) {
        const d = I.desvio[cor]?.[this.quadroDoIdle()] ?? { x: 0, y: 0 };
        return this.naTela({ x: b.x + d.x, y: b.y + d.y });
      }
    }
    const p = g.inicio.bocas[cor]?.[0];
    return p ? this.naTela({ x: p[0], y: p[1] }) : this.posCabeca();
  }

  private posBocaFusao(): Ponto {
    return this.naTela(this.fase.boca ?? this.fase.cabeca);
  }

  /** O ERGUER: o gesto da forma, com a origem do sprite no centro da arte dentro do quadro de 256². */
  private tocarGesto(): void {
    const l = this.letra;
    if (!l || !this.scene.anims.exists(`serpente-erguer-${l}`)) return;
    this.tocador.soltar();
    this.sprite.play(`serpente-erguer-${l}`);
    this.sprite.setOrigin(ERGUER[l].origem.x, ERGUER[l].origem.y);
  }

  private tocarIdle(): void {
    const f = this.fase;
    if (this.sprite.anims.currentAnim?.key === f.anim && this.sprite.anims.isPlaying) return;
    this.sprite.setOrigin(0.5, 0.5);
    if (this.scene.anims.exists(f.anim)) this.sprite.play(f.anim);
  }

  private mostrar(): void {
    this.sprite.setVisible(true);
  }

  /** A folha das máscaras de luz do quadro mostrado: o conjunto, ou o idle da A ou da B. */
  private folhaDeLuz(): string | null {
    const q = this.tocador.atual;
    if (q) return q.chave;
    const l = this.letra;
    return (l === 'A' || l === 'B') && this.sprite.anims.currentAnim?.key === this.fase.anim ? `idle${l}` : null;
  }

  private quadroDeLuz(): number {
    return this.tocador.atual?.i ?? this.quadroDoIdle();
  }

  /**
   * O CORPO POR MODO (S1b): a caixa de arcade dela.
   *   nada     escondida no casco: nem o corpo nem a cabeça;
   *   repouso  no rombo: do pescoço visível (abaixo da linha da cabeça viva) até o pé.
   * Desde 03/11 a caixa é só o TOQUE na nave e o alcance da bomba: os tiros a ferem pelo desenho (`acertoNoCorpo`).
   */
  private definirCorpo(m: Corpo): void {
    this.corpo = m;
    // ⚠️ `checkCollision.none`, NUNCA `enable = false`: ela se move pela VELOCIDADE do corpo, e um corpo desligado não
    // move o sprite (a 1ª sonda: ela ficou parada sob o rombo, escondida, com a chegada travada para sempre).
    const nada = m === 'nada';
    this.body.checkCollision.none = nada;
    (this.cabeca.body as Phaser.Physics.Arcade.Body).checkCollision.none = nada;
  }

  private aplicarCorpo(): void {
    if (this.corpo === 'nada') return;
    const h = this.posCabeca();
    const r = BossSerpente.RAIO_CABECA * this.fase.escala;
    const meia = this.sprite.width * this.fase.escala * 0.31;
    const pe = Math.min(GAME_HEIGHT, this.sprite.y + (this.sprite.height * this.fase.escala) / 2);
    const x0 = this.sprite.x - meia, x1 = this.sprite.x + meia;
    let y0 = h.y + r;
    const y1 = pe;
    if (y1 - y0 < 4) y0 = y1 - 4;
    const s = this.sprite.scaleX;
    this.body.setSize(Math.max(1, (x1 - x0) / s), Math.max(1, (y1 - y0) / s), false);
    this.body.setOffset((x0 - this.sprite.x) / s + this.sprite.displayOriginX, (y0 - this.sprite.y) / s + this.sprite.displayOriginY);
  }

  private sincronizarCabeca(): void {
    const p = this.posCabeca();
    this.cabeca.setPosition(p.x, p.y);
    if (this.romboLabio && this.rombo) this.romboLabio.setPosition(this.rombo.x, this.rombo.y);
    this.sprite.setDepth(30);
    this.aplicarCorpo();
    this.sincronizarVeias();
    // (no rombo ela aparece inteira: o casco não desenha nada na frente dela)
    this.casco?.frente(1, 0);
  }

  /**
   * AS VEIAS NO QUADRO DELA (S1; o gesto, S1b; os conjuntos das habilidades, 02/11). A animação é uma textura por quadro
   * (`serpenteAnim3`, `serpenteErguerA7`…) e um conjunto é uma folha (`serpenteHab_raioAberta`, quadro i); as veias e a
   * sombra são assadas por quadro com o mesmo índice. ⚠️ O quadro se lê da ANIMAÇÃO ou do TOCADOR (os destroços trocam
   * a textura por uma cópia furada). A fusão não tem veias.
   */
  private sincronizarVeias(): void {
    let veias: string | null = null, sombra: string | null = null, quadro: number | undefined;
    const q = this.tocador.atual;
    if (q) {
      veias = `serpenteHabVeias_${q.chave}`;
      sombra = CONJUNTOS[q.chave].sombra ? `serpenteHabSombra_${q.chave}` : null;
      quadro = q.i;
    } else {
      const k = this.sprite.anims.currentFrame?.textureKey ?? this.sprite.texture.key;
      const ig = /^serpente(2c|1c)?Anim(\d+)$/.exec(k);
      const eg = /^serpenteErguer([ABC])(\d+)$/.exec(k);
      if (ig) {
        const forma = ig[1] === '2c' ? 'B' : ig[1] === '1c' ? 'C' : 'A';
        veias = `serpenteVeias${forma}${ig[2]}`;
        sombra = `serpenteSombra${forma}${ig[2]}`;
      } else if (eg) {
        veias = `serpenteVeiasErguer${eg[1]}${eg[2]}`;
        sombra = `serpenteSombraErguer${eg[1]}${eg[2]}`;
      }
    }
    const pares: [Phaser.GameObjects.Image, string | null][] = [
      [this.veias, veias],
      [this.sombra, sombra],
    ];
    for (const [img, k] of pares) {
      if (this.dead || !this.sprite.visible || !k || !this.scene.textures.exists(k)) {
        img.setVisible(false);
        continue;
      }
      if (quadro !== undefined) img.setTexture(k, quadro);
      else if (img.texture.key !== k) img.setTexture(k);
      img
        .setPosition(this.sprite.x, this.sprite.y)
        .setOrigin(this.sprite.originX, this.sprite.originY)
        .setScale(this.sprite.scaleX, this.sprite.scaleY)
        .setFlipX(this.sprite.flipX)
        .setVisible(true);
    }
    const d = this.sprite.depth;
    this.sombra.setDepth(d + 0.05);
    this.veias.setDepth(d + 0.1);
    // o coração: calmo nas pausas; numa habilidade, acelera
    const alerta = this.ciclo.estado === 'hab';
    this.veias.setAlpha(0.15 + 0.85 * pulso(this.t, alerta ? LUTA.coracao.alerta : LUTA.coracao.calmo));
  }

  /** Os cotos fumegam. O dano ACUMULA visualmente: cada fase carrega as cicatrizes da anterior. */
  private fumegar(dt: number): void {
    this.smokeCd -= dt;
    if (this.smokeCd > 0 || this.fase.cotos.length === 0 || !this.sprite.visible) return;
    this.smokeCd = 0.09;
    const corte = LUTA.crista;
    for (const c of this.fase.cotos) {
      const p = this.naTela(c);
      if (p.y > corte) continue;
      this.smokeFx.emitParticleAt(p.x + Phaser.Math.Between(-3, 3), p.y + Phaser.Math.Between(-3, 3));
    }
  }

  // ─── Dano e fases ───────────────────────────────────────────────────────────

  damage(amount: number, onde?: 'alvo' | 'corpo'): boolean {
    if (this.emEnguia) return this.danoEnguia(amount);
    if (this.dead || this.entering || this.imune > 0 || this.corpo === 'nada') return false;

    // O TETO POR GOLPE (30/10, `golpeMax`): nenhum acerto tira mais de 1/3 da vida da forma (a bomba tira 12).
    amount = Math.min(amount, golpeMax(this.fase.hp));
    this.hpFase -= amount;
    this.hpTotal -= amount;
    this.bar.width = 160 * Math.max(0, this.hpTotal / this.maxHpTotal);

    // O clarão de dano só no acerto da CABEÇA (03/11): com o corpo inteiro levando dano, piscar a cada tiro no corpo
    // virava um pisca-pisca rosa a luta toda (medido no filme da sonda `corpo`: 1 quadro em 3). No corpo, a fagulha e a
    // marca bastam — e o clarão passa a dizer, junto com o respingo, que a cabeça vale mais.
    if (onde !== 'corpo') {
      this.sprite.setTint(0xff9090);
      this.scene.time.delayedCall(50, () => {
        if (this.sprite.active) this.sprite.clearTint();
      });
    }

    if (this.hpFase > 0) return false;

    // A cabeça morreu. Última fase = a luta acabou; senão, TRANSIÇÃO.
    if (this.faseIdx >= BossSerpente.FASES.length - 1) {
      this.die();
      return true;
    }

    this.transicao();
    return false;
  }

  /**
   * O DANO NA ENGUIA (spec §6.1–6.4, `VidaEnguia`): o teto por golpe de sempre; as mordidas a 22 / 13 / 5 % da vida
   * DELA viram pedidos à luta (a cauda espera aparecer; o crânio liga a reta final); fora da pausa do Eco da reta final
   * a vida não passa de 1, e ali ela chega a 0 e a morte começa. Nunca devolve true: a morte é encenada, e a cena fecha
   * pelo `morteAcabou`.
   */
  private danoEnguia(amount: number): boolean {
    const e = this.enguia?.estado, v = this.vidaEnguia;
    if (this.dead || !e || !v || !this.enguia) return false;
    const antes = v.hp;
    const r = v.fere(Math.min(amount, golpeMax(LUTA.vida.fusao)), { podeMorrer: e.podeMorrer, imune: e.imune });
    this.hpTotal -= antes - v.hp;
    this.bar.width = 160 * Math.max(0, this.hpTotal / this.maxHpTotal);
    if (this.dev?.roteiro !== 'maquete') {
      for (const pct of r.mordidas) this.enguia.mordida(pct);
      if (r.morreu) this.enguia.mata();
    }
    return false;
  }

  /** A cabeça-alvo e o casco seguem a enguia (o último quadro pronto do worker). */
  private sincronizarEnguia(): void {
    const e = this.enguia?.estado;
    if (this.romboLabio && this.rombo) this.romboLabio.setPosition(this.rombo.x, this.rombo.y);
    this.veias.setVisible(false);
    this.sombra.setVisible(false);
    if (!e) return;
    this.cabeca.setPosition(e.cabeca.x, e.cabeca.y);
    this.sprite.setPosition(e.cabeca.x, e.cabeca.y);
    if (this.casco) {
      this.casco.lombada = e.lombada;
      // (the crack behind her, as the mock draws it: the living hull paints it, healing from the breach's end)
      this.casco.fissuras.length = 0;
      for (const f of e.fissuras) this.casco.fissuras.push({ de: f.de, ate: f.ate, origem: f.ate, cura: f.cura > 0 ? f.cura : null });
      this.casco.frente(1, 0);
    }
  }

  /**
   * A HABILIDADE MORRE COM A CABEÇA (02/11, spec §2.5): ela se desfaz em `HAB.aborta` s (ainda desenhada, sem ferir), o
   * gesto volta ao idle e o ciclo recomeça por uma pausa (a mesma instância nunca é recomeçada enquanto se desfaz).
   */
  private abortarHab(): void {
    const h = this.habViva();
    if (h) {
      h.abortar();
      this.abortando = h;
    }
    if (this.tocador.atual || this.tocador.tocando) this.tocador.idle();
    this.ciclo = { estado: 'pausa', t: 0, passo: 0, hab: null };
  }

  /**
   * A CABEÇA MORRE EM CADEIA (a referência Metal Slug do Henrique): 5 estouros pequenos varrendo a região da cabeça, um
   * grande no fim, e SÓ ENTÃO a arte troca. A imunidade cobre a cadeia. A troca para a FUSÃO tem cena própria.
   */
  private transicao(): void {
    if (this.faseIdx === BossSerpente.FASES.length - 2) {
      this.fusao();
      return;
    }

    const cabecaMorta = this.posCabeca();
    const duracao = 550;
    const estouros = 5;

    this.imune = duracao / 1000 + 0.2;
    this.abortarHab();
    this.sprite.clearTint();

    for (let i = 0; i < estouros; i++) {
      this.scene.time.delayedCall(i * (duracao / estouros), () => {
        if (!this.sprite.active) return;
        this.muzzleFx.explode(10, cabecaMorta.x + Phaser.Math.Between(-26, 26), cabecaMorta.y + Phaser.Math.Between(-26, 26));
        this.scene.cameras.main.shake(70, 0.004);
      });
    }

    this.scene.time.delayedCall(duracao, () => {
      if (!this.sprite.active || this.dead) return;
      this.vestirFase(this.faseIdx + 1);
      this.muzzleFx.explode(24, cabecaMorta.x, cabecaMorta.y);
      this.scene.cameras.main.shake(160, 0.007);
      // (sem o flash ROSA de tela cheia: na revisão de 29/10 era um quadro inteiro cor-de-dano — a cadeia e o tremor bastam)
    });
  }

  /** Troca a arte, a escala, a animacao e a hitbox para a fase `i`. */
  private vestirFase(i: number): void {
    this.faseIdx = i;
    const f = this.fase;
    this.hpFase = f.hp;
    this.tocador.soltar();
    this.ciclo = { estado: 'pausa', t: 0, passo: 0, hab: null };
    // PARAR A ANIMACAO ANTES DA TEXTURA (armadilha 26): sem o stop, o Phaser repoe o quadro da animacao velha por cima
    // e a cabeca morta "ressuscita" na tela.
    this.sprite.anims.stop();
    this.sprite.setTexture(f.arte);
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setScale(f.escala);
    if (this.scene.anims.exists(f.anim)) this.sprite.play(f.anim);
    this.cravarCirculo();
  }

  /** As cores das TRES cabecas, na ordem em que elas morrem. Ver `fusao`. */
  private static readonly CORES_CABECAS = [0x48e8f0, 0x60f088, 0xff9040] as const;

  /** Os tempos da cena da fusão no rombo (s). */
  private static readonly FUSAO = { afunda: 120, silencio: 0.25, convergencia: 0.9, implosao: 0.3 } as const;

  /**
   * A FUSÃO NO ROMBO (29/10, S1b — ele: *"quando a serpente de 3 cabeças morre, o interessante é ela voltar para o buraco
   * e depois a serpente maior surge dele"*). A cena de 2026-09-01 (as três cicatrizes acendendo nas cores das cabeças, os
   * fios convergindo para o núcleo, a implosão, a detonação branca) desce para DENTRO DO ROMBO:
   *   1. a cadeia de estouros na cabeça que caiu; ela cede e AFUNDA no rombo, devagar;
   *   2. o silêncio: o rombo escuro e quieto;
   *   3. as três luzes (ciano, verde, laranja) brilham pelas frestas do lábio e convergem para o centro do buraco;
   *   4. o clarão implode lá dentro;
   *   5. o cascalho e o pó saltam da boca do rombo e a maior irrompe dele, de boca aberta.
   * SEM VÉU PRETO: o casco esconde a troca. Os tiros em voo somem no começo (a regra da `die()`).
   */
  private fusao(): void {
    this.imune = 99;
    this.colapso = true;
    this.abortarHab();
    this.tiros.limpar();
    this.sprite.clearTint();
    for (const obj of [...this.enemies.enemyBullets.getChildren()]) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (b.active) this.enemies.release(b);
    }
    const morta = this.posCabeca();
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 110, () => {
        if (!this.sprite.active || this.dead) return;
        this.muzzleFx.explode(10, morta.x + Phaser.Math.Between(-26, 26), morta.y + Phaser.Math.Between(-26, 26));
        this.scene.cameras.main.shake(70, 0.004);
      });
    }
    if (this.casco) {
      this.casco.ponta = null;
      this.casco.lombada = null;
    }
    this.fusaoPasso = 'afundando';
    this.definirCorpo('nada');
    this.tocarIdle();
  }

  private colapsar(dt: number): void {
    const F = BossSerpente.FUSAO;
    this.fusaoT -= dt;
    switch (this.fusaoPasso) {
      case 'afundando': {
        this.body.setVelocity(0, F.afunda);
        const fundo = escondidaRombo(this.forma);
        if (this.sprite.y >= fundo) {
          this.sprite.y = fundo;
          this.body.setVelocity(0, 0);
          this.sprite.setVisible(false);
          this.fusaoPasso = 'silencio';
          this.fusaoT = F.silencio;
        }
        break;
      }
      case 'silencio':
        // (a enguia: o silêncio espera o worker ter a arte pronta — ele começou no início da luta)
        if (this.fusaoT <= 0 && (!this.enguia || this.enguia.pronta || this.enguia.erro)) this.acenderLuzes();
        break;
      case 'luzes':
        // a enguia: o estalo da implosão do pixelfx (1,02 s no relógio dela) é a detonação
        if (this.enguia?.ativa) {
          if (this.enguia.t >= 1.02) this.detonar();
          break;
        }
        if (this.fusaoT <= 0) {
          const cx = this.romboX(), cy = LUTA.crista + 14;
          this.fx.implodeBig(cx, cy, 1.2, 28);
          this.fusaoPasso = 'implosao';
          this.fusaoT = F.implosao;
        }
        break;
      case 'implosao':
        if (this.fusaoT <= 0) this.detonar();
        break;
      case 'surgindo': {
        this.sprite.x = this.romboX();
        this.body.setVelocity(0, -LUTA.surge);
        if (this.sprite.y <= romboY()) {
          this.sprite.y = romboY();
          this.body.setVelocity(0, 0);
          this.fusaoPasso = null;
          this.colapso = false;
          this.imune = 0.4;
          this.definirCorpo('repouso');
        }
        break;
      }
    }
  }

  /** As três luzes, nas cores das cabeças, pelas frestas do lábio — convergindo para o centro do buraco. */
  private acenderLuzes(): void {
    const F = BossSerpente.FUSAO;
    const cx = this.romboX(), cy = LUTA.crista + 14;
    const origens = [
      { x: cx - 52, y: LUTA.crista + 6 },
      { x: cx, y: LUTA.crista + 2 },
      { x: cx + 52, y: LUTA.crista + 6 },
    ];
    // A ENGUIA (decisão 9 do plano): as luzes chegam aos 0,8 s, e a implosão do pixelfx (desenhada por ela) toma o lugar
    // do núcleo e do `implodeBig`; o relógio dela começa aqui
    const comEnguia = !!this.enguia?.pronta && !this.enguia.erro;
    const conv = comEnguia ? 0.8 : F.convergencia;
    if (comEnguia) this.enguia?.comeca();
    const nucleo = comEnguia ? null : this.scene.add.image(cx, cy, 'fusaoNucleo').setDepth(34).setScale(0).setAlpha(0).setName('nucleoDaFusao');
    if (nucleo) this.fusaoObjs.push(nucleo);
    origens.forEach((o, i) => {
      const fio = this.scene.add
        .image(o.x, o.y, 'spark')
        .setTint(BossSerpente.CORES_CABECAS[i])
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(34)
        .setScale(0)
        .setAlpha(0)
        .setName('fioDaFusao');
      this.fusaoObjs.push(fio);
      // acende NO LUGAR, espera, e só então viaja (acender e viajar ao mesmo tempo esconderia de onde ele saiu)
      // (no filme da 1ª versão, a 2,4, eram quadradinhos no fundo do buraco: maiores, e com o halo do `flash`)
      this.scene.tweens.add({ targets: fio, scale: 3.6, alpha: 1, duration: 200, ease: 'Quad.easeOut' });
      // (o halo é o `puff`, redondo — o `flash` é a ESTRELA que ele tirou do jogo na S1, e voltava aqui dentro do rombo)
      const halo = this.scene.add.image(o.x, o.y, 'puff').setTint(BossSerpente.CORES_CABECAS[i]).setBlendMode(Phaser.BlendModes.ADD).setDepth(34).setScale(0).setAlpha(0.6);
      this.fusaoObjs.push(halo);
      this.scene.tweens.add({ targets: halo, scale: 0.9, duration: 200, ease: 'Quad.easeOut' });
      this.scene.tweens.add({ targets: halo, x: cx, y: cy, delay: 300, duration: conv * 1000 - 200, ease: 'Quad.easeIn', onComplete: () => halo.destroy() });
      this.scene.tweens.add({ targets: fio, x: cx, y: cy, delay: 300, duration: conv * 1000 - 200, ease: 'Quad.easeIn', onComplete: () => fio.destroy() });
    });
    if (nucleo) this.scene.tweens.add({ targets: nucleo, scale: 1.0, alpha: 1, delay: 300, duration: conv * 1000 - 200, ease: 'Quad.easeIn' });
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(300 + i * 140, () => {
        if (this.dead) return;
        this.fx.estalo(cx + Phaser.Math.Between(-50, 50), LUTA.crista + Phaser.Math.Between(0, 16), Phaser.Math.Between(12, 22));
      });
    }
    this.fusaoPasso = 'luzes';
    this.fusaoT = F.convergencia;
  }

  /** A DETONAÇÃO: o cascalho e o pó saltam da boca do rombo, e a maior irrompe dele. */
  private detonar(): void {
    const cx = this.romboX();
    for (const o of this.fusaoObjs) o.destroy();
    this.fusaoObjs = [];
    // (o lábio NÃO estoura mais no motor de destroços: os blocos saíam vermelho-lava. O cascalho e o pó do próprio casco
    // saltam da boca do rombo, por trás dela)
    if (this.casco) {
      for (const p of this.casco.cascalhoDoRasgo({ cx, meia: LUTA.rombo.meio, fundo: 30, abre: null, cura: null }, 90)) {
        this.cascalhoFx.setParticleTint(p.cor);
        this.cascalhoFx.emitParticleAt(p.x, p.y);
      }
    }
    for (let i = 0; i < 18; i++) this.poeiraFx.emitParticleAt(cx + Phaser.Math.Between(-70, 70), LUTA.crista - Phaser.Math.Between(0, 8));
    this.fx.choque(cx, LUTA.crista, 2.2);
    this.scene.cameras.main.shake(360, 0.014);
    // BRANCO, não rosa — rosa é dano, branco é nascimento
    this.scene.cameras.main.flash(220, 255, 255, 255);
    if (this.enguia?.ativa) {
      // A ENGUIA IRROMPE (a pausa `fusao` dela segue até 1,6 s; depois o arco): a máquina das formas para, o sprite some
      // (ela é as lonas do worker), a vida dela começa (`?vida=` no atalho de dev a começa mais baixa)
      this.faseIdx = BossSerpente.FASES.length - 1;
      this.hpFase = LUTA.vida.fusao;
      const inicio = this.dev?.vida != null ? Math.max(0.01, Math.min(1, this.dev.vida / 100)) : 1;
      this.vidaEnguia = new VidaEnguia(LUTA.vida.fusao, inicio);
      this.hpTotal -= LUTA.vida.fusao * (1 - inicio);
      this.bar.width = 160 * Math.max(0, this.hpTotal / this.maxHpTotal);
      this.sprite.anims.stop();
      this.sprite.setVisible(false);
      this.definirCorpo('nada');
      this.tocador.soltar();
      this.emEnguia = true;
      this.colapso = false;
      this.fusaoPasso = null;
      this.imune = 0;
      return;
    }
    this.vestirFase(this.faseIdx + 1);
    this.sprite.setPosition(cx, escondidaRombo(this.forma));
    this.mostrar();
    this.fusaoPasso = 'surgindo';
  }

  private die(): void {
    this.dead = true;
    this.body.setVelocity(0, 0);

    // Os projéteis dela morrem com ela — uma rajada que estoura depois do chefão morto mata o
    // jogador na tela de vitória (a regra da Capitânia).
    for (const obj of [...this.enemies.enemyBullets.getChildren()]) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (b.active) this.enemies.release(b);
    }
    // e o que as habilidades desenhavam some junto (o `update` não roda mais: a camada ficaria no último quadro)
    this.tiros.limpar();
    this.abortando = null;
    this.rescaldo = null;
    this.camada.limpar();
    this.luzes.esconder();
    this.scene.cameras.main.setScroll(0, 0);

    this.cabeca.destroy();
    this.targets.length = 0;
    this.veias.setVisible(false);
    this.sombra.setVisible(false);
    this.casco?.frente(1, 0);
  }

  destroy(): void {
    this.sprite.destroy();
    if (this.cabeca.active) this.cabeca.destroy();
    this.romboLabio?.destroy();
    this.veias.destroy();
    this.sombra.destroy();
    this.bar.destroy();
    this.barBg.destroy();
    this.muzzleFx.destroy();
    this.smokeFx.destroy();
    this.poeiraFx.destroy();
    this.cascalhoFx.destroy();
    for (const o of this.fusaoObjs) o.destroy();
    this.casco?.destroy();
    this.camada.destroy();
    this.luzes.destroy();
    this.enguia?.destroy();
    this.enguia = null;
  }
}
