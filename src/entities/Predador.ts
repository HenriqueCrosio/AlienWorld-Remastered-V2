import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { EnemySystem } from '../systems/EnemySystem';
import type { Fx } from '../systems/Fx';
import { GROUND_Y, TETO_Y } from '../systems/TerrainSystem';
import { explosaoSangrenta, sangueNaTela } from './sangue';

/**
 * O PREDADOR — a 2ª forma do chefão final da Fase 4 (B3 da Fatia 7, design dele de 16/09).
 * Spec: `docs/superpowers/specs/2026-09-16-fatia7-b3-predador-design.md`.
 *
 * O guardião morre e o que estava dentro dele SAI: surge grande (0,7) de frente, urra, salta girando
 * para encarar a nave e encolhe para 0,47 no mesmo arco. A luta cobra MOBILIDADE e LEITURA, não a janela:
 *
 *   - o PEITO aceso é o alvo e está SEMPRE aberto; na RECUPERAÇÃO de cada ataque o dano DOBRA;
 *   - fase 1: no chão — investida CORRENDO de quatro + slash com salto (o core CARREGA antes) e lava em arco;
 *   - fase 2: RONDA — corre pelo chão, pula e AGARRA o teto por uma garra, e SAI pela direita. A VOLTA é um ataque
 *     (17/09): entra galopando, para no meio da arena e RASGA o chão de baixo para cima, lançando METAL
 *     INCANDESCENTE em arco até a nave;
 *   - fase 3: o BREU — a arena apaga; só o core dele revela o corpo, e a lava estoura em estilhaços.
 *
 * O `BossNucleo` continua sendo o `StageBoss` da cena: ele passa o SPRITE e o CORE que a cena já ligou
 * nas colisões (os overlaps são presos aos objetos, não à forma), e delega `update`/`damage` para cá.
 *
 * ─── O QUADRO VIRTUAL (rodada 3, 16/09) ───
 * Galopando de quatro ou pendurado por um braço, ele NÃO CABE no quadro de 256² na escala da pose de luta. Esses
 * clipes foram gerados a partir da pose de luta REDUZIDA dentro do quadro (0,85 no chão, 0,75 no teto), presa
 * pela base. Então todo clipe tem um FATOR `f`, e o motor raciocina num quadro VIRTUAL de 256² na escala da luta:
 *   - `P` (a posição do sprite) é o centro do quadro virtual; `escala` é a da luta (0,47 na briga);
 *   - o clipe de fator `f` é desenhado em `escala / f`, com a origem em `(0,5 ; 1 − f/2)` — o ponto do clipe que
 *     corresponde ao centro virtual. Assim a pose de partida de todos os clipes cai no MESMO lugar da tela;
 *   - miolo, pés e garras são medidos em px VIRTUAIS (a partir do centro); só a hitbox vive em px do clipe.
 *
 * ─── GEOMETRIA MEDIDA (`scripts/_f4/_medir-predador.mjs`) ───
 *  Miolo, offset ao centro virtual: S +6,−5 · luta −23,−3 · pendurado −25,−24 (medido 109,142 no clipe de 0,75).
 *  Pés da luta em y=252 (+124). Pendurado: a ponta da garra no TOPO do clipe (y=0 → virtual −85, −213 do centro).
 */
export type EstadoPredador =
  | 'surgindo'
  | 'chao'
  | 'teto'
  | 'carga'
  | 'bote'
  | 'slash'
  | 'telegLava'
  | 'recupera'
  | 'salto'
  | 'fora'
  | 'aviso'
  | 'entrada'
  | 'rasgo'
  | 'urroBreu'
  | 'morto';

type Pose = 'S' | 'luta' | 'teto';
type Ancora = { x: number; lado: 'chao' | 'teto' };
type Retangulo = { x: number; y: number; w: number; h: number };
/** A bola de lava (arco), a gota do estilhaço (reta) e o metal incandescente do rasgo (arco, não estilhaça). */
type TipoLava = 'bola' | 'gota' | 'metal';

/**
 * A LUZ REDONDA de verdade: degradê radial que chega a ZERO antes da borda do quadro. ⚠️ A 1ª versão (anéis de
 * alpha somados) tinha alpha > 0 na borda — em ADD e ampliada, lia como RETÂNGULO (16/09). Exportada porque a
 * cutscene final (a queda) usa a mesma luz sem haver predador na cena (pelo atalho F do menu, ela não existiria).
 */
export function garantirLuzRadial(scene: Phaser.Scene): void {
  if (scene.textures.exists('luzRadial')) return;
  const tex = scene.textures.createCanvas('luzRadial', 64, 64);
  if (!tex) return;
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.15)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  tex.refresh();
}

export class Predador {
  // ─── Knobs ───
  static readonly HP = 180;
  static readonly ESCALA_SURGE = 0.7;
  static readonly ESCALA_LUTA = 0.47;
  /** Onde a BORDA DESENHADA acaba (não a colisão, y=10/206, que fica dentro da faixa). */
  static readonly CHAO_APOIO = 190;
  static readonly TETO_APOIO = 30;
  static readonly MIOLO: Record<Pose, { x: number; y: number }> = {
    S: { x: 6, y: -5 },
    luta: { x: -23, y: -3 },
    teto: { x: -25, y: -24 },
  };
  /** A ponta da garra que segura o teto, em px virtuais a partir do centro (o topo do clipe de 0,75). */
  static readonly GARRA_TETO_Y = 256 - 256 / 0.75 - 128;
  static readonly ANCORAS: Ancora[] = [
    { x: 300, lado: 'chao' },
    { x: 238, lado: 'chao' },
    { x: 322, lado: 'teto' },
    { x: 262, lado: 'teto' },
  ];

  /**
   * O FATOR e a POSE de cada clipe e de cada estático. Clipe fora da tabela é da luta, fator 1.
   * ⚠️ Trocar a arte de um clipe por outra gerada de outra base OBRIGA a trocar o fator aqui.
   */
  static readonly QUADRO: Record<string, { f: number; pose: Pose }> = {
    predadorS: { f: 1, pose: 'S' },
    predadorLuta: { f: 1, pose: 'luta' },
    predadorTeto: { f: 0.75, pose: 'teto' },
    'predador-urro': { f: 1, pose: 'S' },
    'predador-pulo': { f: 1, pose: 'S' },
    'predador-giro': { f: 1, pose: 'S' },
    'predador-andar': { f: 0.85, pose: 'luta' },
    'predador-quatro': { f: 0.85, pose: 'luta' },
    'predador-corrida': { f: 0.85, pose: 'luta' },
    'predador-slash': { f: 0.85, pose: 'luta' },
    'predador-rasgo': { f: 0.85, pose: 'luta' },
    'predador-lava': { f: 1, pose: 'luta' },
    'predador-morte': { f: 1, pose: 'luta' },
    'predador-agarra': { f: 0.75, pose: 'luta' },
    'predador-teto-balanco': { f: 0.75, pose: 'teto' },
    'predador-teto-lava': { f: 0.75, pose: 'teto' },
  };
  /** A casca dos ombros e o corpo inteiro, em px VIRTUAIS (a luta). O teto tem os seus, em px do clipe de 0,75. */
  static readonly CASCA: Retangulo = { x: 115, y: 20, w: 90, h: 80 };
  static readonly INTEIRO: Retangulo = { x: 40, y: 28, w: 170, h: 220 };
  static readonly CASCA_TETO: Retangulo = { x: 110, y: 40, w: 76, h: 70 };
  static readonly INTEIRO_TETO: Retangulo = { x: 63, y: 0, w: 132, h: 216 };

  static readonly URRO_MS = 1200;
  /**
   * O PULO DO SURGIMENTO (rodada 2 — *"ficou realmente ótimo"*). O clipe agacha, impulsiona, torce e pousa; o motor
   * SÓ SOBE entre o impulso e o pouso (frações da duração).
   */
  static readonly SALTO_SURGE_MS = 1000;
  static readonly PULO_QUADROS = [0, 4, 7, 9, 10, 11, 12, 13, 14, 15, 16];
  static readonly PULO_IMPULSO = 0.36;
  static readonly PULO_POUSO = 0.92;
  static readonly PULO_ALTURA = 30;

  /**
   * RODADA 3 (16/09) — *"o idle é idle, a fase está em movimento e no idle parece que está deslizando"*: parado no
   * chão ele ANDA no lugar (o laço medido por `_achar-loop.mjs`: quadros 4..12 do `andar-c`).
   */
  static readonly ANDAR_QUADROS = [4, 5, 6, 7, 8, 9, 10, 11, 12];
  static readonly ANDAR_MS = 900;
  /** *"correndo como um gorila ou urso"*: cai de quatro no fim da carga e GALOPA no bote (laço 1..15 do `corrida-c`). */
  static readonly QUATRO_MS = 380;
  static readonly CORRIDA_QUADROS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  static readonly CORRIDA_MS = 620;
  /** *"queria ele se inclinando e mexendo mais no slash"*: o `slash-a` (inclina, dois golpes, torce), com SALTO até a nave. */
  static readonly SLASH_QUADROS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  static readonly SLASH_MS = 900;
  static readonly SLASH_SALTO_ATE = 0.45;
  /**
   * Pendurado: balança (laço 5..15 do `teto-balanco`) e arremessa com a garra LIVRE (rodada 4 — 17/09: *"ele está
   * agarrando com a mesma garra que ele joga a lava"*). ⚠️ RODADA 6 (18/09): o `teto-lava-b` ainda TROCAVA de garra
   * no meio do gesto — *"começa com a de trás e acaba com a da frente"* —, porque o braço que enrolava passava ATRÁS
   * do tronco e sumia. O `teto-lava-f` resolve pela encenação: a garra da FRENTE colhe a bola no core aceso e a solta
   * sem nunca cruzar para trás. A bola deixa a mão entre os quadros 10 e 11, como antes.
   */
  static readonly BALANCO_QUADROS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  static readonly BALANCO_MS = 1300;
  static readonly SALTO_TETO_MS = 850;

  static readonly CARGA = [0, 1.5, 1.3, 1.6];
  static readonly CARGA_MIN = 0.9;
  static readonly BOTE_VEL = 300;
  static readonly RECUP_SLASH = 1.0;
  /**
   * ⚠️ OS DOIS TELEGRAFOS SÃO EM SEGUNDOS, não em fração do clipe (`mudar(estado, dur)` grava `estadoT`). Cada um
   * tem de cair no quadro em que a bola larga a garra da SUA arte — trocar o clipe sem refazer esta conta põe a
   * bola nascendo no vazio. Medir com `scripts/_f4/_medir-mao.mjs`.
   *
   * No chão (rodada 7, `lava-core-c`): a bola aparece no quadro 13. Com o clipe cortado em 15 quadros e `LAVA_MS`
   * 580, 0,5s cai justamente aí — o mesmo aviso de sempre, que ele aprovou. Alongar daria mais tempo de desviar, e
   * isso é decisão de luta, não de arte.
   */
  /**
   * ⚠️ O CLIPE É CORTADO NO 14 (19/09, ele jogando: *"existe um artefato (bola de lava) da própria animação que vai
   * para baixo no movimento"*). A bola PINTADA continua na garra nos quadros 14–16 do `lava-core-c` e desce junto
   * com o braço — então, depois que o motor lança a bola de verdade, havia DUAS na tela. Cortando em 14 sobra um só
   * quadro de acompanhamento depois da soltura (~39ms) e a pintada nunca chega a descer.
   */
  static readonly LAVA_QUADROS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  /** 13 de 15 quadros × 580ms = 0,502s: o telégrafo cai EXATAMENTE no quadro em que a bola deixa a garra. */
  static readonly LAVA_MS = 580;
  static readonly TELEG_LAVA = 0.5;
  static readonly TETO_LAVA_MS = 1100;
  static readonly TELEG_LAVA_TETO = 0.68;
  static readonly RECUP_LAVA = 0.6;
  static readonly DANO_RECUP = 2;
  static readonly LAVA_G = 260;
  static readonly LAVA_VOO = 1.1;
  static readonly ESTILHACOS = 6;
  static readonly SALTO_MS = 600;
  static readonly FORA_MIN = 1.0;
  static readonly FORA_MAX = 2.0;
  static readonly AVISO = 0.5;
  /**
   * A VOLTA QUE ATACA (17/09, pedido dele: *"antes a saída e reentrada tinha mais efeito visual e não de mecânica"*):
   * galopa da borda direita até `RASGO_X`, para, e rasga o chão de baixo para cima. O metal sai do CHÃO à frente
   * dele na fração `RASGO_SOLTA` do golpe, em arco com a gravidade da lava, mirado onde a nave estava quando ele
   * parou. Depois do golpe, a recuperação (dano dobrado).
   */
  static readonly RASGO_X = GAME_WIDTH / 2;
  static readonly RASGO_MS = 1100;
  static readonly RASGO_QUADROS: number[] | undefined = undefined;
  /** O arco do `upper-b` sobe do chão no quadro 12 de 17 (as garras cravam de 4 a 11 — é o aviso). */
  static readonly RASGO_SOLTA = 0.7;
  static readonly RECUP_RASGO = 0.9;
  /** Peças de metal por fase (a volta só existe da fase 2 em diante). */
  static readonly METAL_N = [0, 3, 4, 5];
  /**
   * O TEMPO DE VOO das lascas — e, por tabela, a ALTURA do arco, porque a velocidade é resolvida para cair
   * onde a nave estava: voo mais longo = arco mais alto para o mesmo alvo. Não existe knob de "altura".
   *
   * 19/09, jogando: *"quero que seja mais alto, para forçar a nave a desviar mais, hoje em dia está muito
   * baixo, pode subir o dobro ou menos um pouco"*. Com 0,95 o ápice caía EXATAMENTE na altura da nave
   * (medido: 92px acima do chão, com a nave em y=110) — o arco nunca passava por cima dela, e por isso
   * parecia raso. ⚠️ O dobro literal (184px) NÃO CABE: do chão ao teto há 156px. Com 1,5 a lasca mais alta
   * sobe 152px (y=34), 1,65× — o máximo que a arena comporta, que é o *"menos um pouco"* dele.
   * Medir de novo ao mexer: `node scripts/_f4/_medir-metal.mjs`.
   */
  static readonly METAL_VOO = 1.5;
  static readonly METAL_ABRE = 30;
  static readonly PAUSA: [number, number][] = [[0, 0], [1.2, 2.0], [0.9, 1.6], [1.0, 1.7]];
  /** 0,96 deixava a pintura e a borda aparecendo (16/09: *"a fase pode escurecer mais"*). */
  static readonly BREU_ALPHA = 1;
  static readonly BREU_ENTRA_MS = 600;
  static readonly PULSO_BREU = 2.4;
  static readonly MORTE_MS = 1100;
  /** *"o corpo não pode flutuar caído, precisa cair na borda"*: a queda até o chão enquanto a morte toca. */
  static readonly QUEDA_MS = 420;

  hp = Predador.HP;
  estado: EstadoPredador = 'surgindo';
  recuperando = false;
  breu = false;
  armaTravada = true;
  dead = false;

  private pose: Pose = 'S';
  /** O fator do quadro que está na tela (ver "O QUADRO VIRTUAL"). */
  private f = 1;
  /** A escala da LUTA (virtual) — o sprite é desenhado em `escala / f`. */
  private escala = Predador.ESCALA_SURGE;
  private t = 0;
  private estadoT = 0;
  private ancora: Ancora = Predador.ANCORAS[0];
  private alvoX = 0;
  private alvoY = 0;
  private caiuDeQuatro = false;
  private ultimos: ('slash' | 'lava')[] = [];
  private fasePassada = 1;
  private pulsoFase = 0;
  /** 0..1 — o brilho do core agora (a captura espera o pico e o vale). */
  pulso = 0;
  private lavas: { b: Phaser.Physics.Arcade.Sprite; luz: Phaser.GameObjects.Image; tipo: TipoLava }[] = [];
  private brasas!: Phaser.GameObjects.Particles.ParticleEmitter;
  private tween: Phaser.Tweens.Tween | null = null;

  private readonly luz: Phaser.GameObjects.Image;
  private breuCamada: Phaser.GameObjects.Rectangle | null = null;
  private halo: Phaser.GameObjects.Image | null = null;
  private revela: Phaser.GameObjects.Image | null = null;
  private nave: Phaser.Physics.Arcade.Sprite | null = null;
  private naveDepth = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: EnemySystem,
    private readonly fx: Fx,
    private readonly sprite: Phaser.Physics.Arcade.Sprite,
    private readonly core: Phaser.Physics.Arcade.Sprite,
    private readonly aoMudarVida: () => void,
  ) {
    this.criarAnims();
    this.criarLava();
    garantirLuzRadial(scene);

    // A LUZ DO CORE: existe sempre (às claras é o brilho do peito; na carga é o telégrafo; no breu é
    // a única coisa que mostra onde ele está).
    this.luz = scene.add.image(0, 0, 'luzRadial').setBlendMode(Phaser.BlendModes.ADD).setTint(0xff7a2a).setDepth(7);

    // O surgimento: grande, de frente, sem corpo — a pausa dramática não mata ninguém.
    this.sprite.anims.stop();
    this.sprite.clearTint();
    this.sprite.setAlpha(1).setVisible(true);
    this.estatico('predadorS');
    this.setEscala(Predador.ESCALA_SURGE);
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.coreBody.enable = false;
    this.coreBody.setSize(26, 24);

    this.surgir();
  }

  // ─── Estrutura ───────────────────────────────────────────────────────────────

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  private get coreBody(): Phaser.Physics.Arcade.Body {
    return this.core.body as Phaser.Physics.Arcade.Body;
  }

  get fase(): number {
    const f = this.hp / Predador.HP;
    return f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
  }

  private criarAnims(): void {
    const anims = this.scene.anims;
    const clipe = (key: string, sheet: string, ms: number, repeat = 0, escolha?: number[]) => {
      if (!this.scene.textures.exists(sheet) || anims.exists(key)) return;
      const total = this.scene.textures.get(sheet).frameTotal - 1; // o `__BASE` conta
      const lista = escolha?.filter((q) => q < total);
      const n = lista?.length ?? total;
      anims.create({
        key,
        frames: lista ? anims.generateFrameNumbers(sheet, { frames: lista }) : anims.generateFrameNumbers(sheet, { start: 0, end: total - 1 }),
        frameRate: (n * 1000) / ms,
        repeat,
      });
    };
    clipe('predador-urro', 'predadorUrroSheet', Predador.URRO_MS);
    clipe('predador-pulo', 'predadorPuloSheet', Predador.SALTO_SURGE_MS, 0, Predador.PULO_QUADROS);
    clipe('predador-giro', 'predadorGiroSheet', Predador.SALTO_SURGE_MS);
    clipe('predador-andar', 'predadorAndarSheet', Predador.ANDAR_MS, -1, Predador.ANDAR_QUADROS);
    clipe('predador-quatro', 'predadorQuatroSheet', Predador.QUATRO_MS);
    clipe('predador-corrida', 'predadorCorridaSheet', Predador.CORRIDA_MS, -1, Predador.CORRIDA_QUADROS);
    clipe('predador-slash', 'predadorSlashSheet', Predador.SLASH_MS, 0, Predador.SLASH_QUADROS);
    clipe('predador-rasgo', 'predadorRasgoSheet', Predador.RASGO_MS, 0, Predador.RASGO_QUADROS);
    clipe('predador-lava', 'predadorLavaSheet', Predador.LAVA_MS, 0, Predador.LAVA_QUADROS);
    clipe('predador-morte', 'predadorMorteSheet', Predador.MORTE_MS);
    clipe('predador-agarra', 'predadorAgarraSheet', Predador.SALTO_TETO_MS);
    clipe('predador-teto-balanco', 'predadorTetoBalancoSheet', Predador.BALANCO_MS, -1, Predador.BALANCO_QUADROS);
    clipe('predador-teto-lava', 'predadorTetoLavaSheet', Predador.TETO_LAVA_MS);
  }

  /** O quadro na tela: fator, origem, escala desenhada. */
  private aplicarQuadro(chave: string): void {
    const q = Predador.QUADRO[chave] ?? { f: 1, pose: 'luta' as Pose };
    this.f = q.f;
    this.pose = q.pose;
    this.sprite.setOrigin(0.5, 1 - q.f / 2);
    this.sprite.setScale(this.escala / q.f);
  }

  private setEscala(e: number): void {
    this.escala = e;
    this.sprite.setScale(e / this.f);
  }

  private estatico(textura: string): void {
    if (!this.scene.textures.exists(textura)) return;
    this.sprite.anims.stop();
    this.sprite.setTexture(textura);
    this.aplicarQuadro(textura);
  }

  /** Toca um clipe (com o fator dele); sem a folha, cai no estático. */
  private tocar(key: string, estatico: string, reverso = false): void {
    if (this.scene.anims.exists(key)) {
      if (reverso) this.sprite.playReverse(key, true);
      else this.sprite.play(key, true);
      this.aplicarQuadro(key);
    } else {
      this.estatico(estatico);
    }
  }

  private idle(): void {
    if (this.ancora.lado === 'teto') this.tocar('predador-teto-balanco', 'predadorTeto');
    else this.tocar('predador-andar', 'predadorLuta');
  }

  private yApoio(lado: 'chao' | 'teto'): number {
    const e = Predador.ESCALA_LUTA;
    return lado === 'chao' ? Predador.CHAO_APOIO - 124 * e : Predador.TETO_APOIO - Predador.GARRA_TETO_Y * e;
  }

  /** Um retângulo VIRTUAL levado para px do clipe de fator `f` (preso pela base). */
  private noClipe(r: Retangulo): Retangulo {
    const f = this.f;
    return { x: 128 + (r.x - 128) * f, y: 256 - (256 - r.y) * f, w: r.w * f, h: r.h * f };
  }

  private corpo(r: Retangulo): void {
    this.body.enable = true;
    this.body.setSize(r.w, r.h);
    this.body.setOffset(r.x, r.y);
  }

  /** Corpo = a CASCA dos ombros (absorve a bala, fere por contato) — o pacto do domo do guardião. */
  private corpoCasca(): void {
    this.corpo(this.pose === 'teto' ? Predador.CASCA_TETO : this.noClipe(Predador.CASCA));
  }

  /** Corpo INTEIRO: bote, slash e salto são todo perigo. */
  private corpoInteiro(): void {
    this.corpo(this.pose === 'teto' ? Predador.INTEIRO_TETO : this.noClipe(Predador.INTEIRO));
  }

  private posicionarCore(): void {
    const e = this.escala;
    const m = Predador.MIOLO[this.pose];
    const x = this.sprite.x + m.x * e;
    const y = this.sprite.y + m.y * e;
    this.core.setPosition(x, y);
    this.coreBody.reset(x, y);
    this.luz.setPosition(x, y);
  }

  private mudar(estado: EstadoPredador, dur = 0): void {
    this.estado = estado;
    this.estadoT = dur;
  }

  /** Um tween de 0→1 com `onUpdate(k)` e `onComplete` — o motor de todo deslocamento dele. */
  private animarAte(ms: number, passo: (k: number) => void, fim: () => void, ease = 'Linear'): void {
    this.tween?.stop();
    this.tween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: ms,
      ease,
      onUpdate: (tw) => passo(tw.getValue() ?? 0),
      onComplete: () => {
        this.tween = null;
        if (!this.dead) fim();
      },
    });
  }

  private mover(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.body.reset(x, y);
  }

  // ─── O surgimento ────────────────────────────────────────────────────────────

  private surgir(): void {
    this.posicionarCore();
    this.luz.setAlpha(0.9).setScale(1.4);
    this.tocar('predador-urro', 'predadorS');
    // O tranco no PICO do urro (a mandíbula aberta, as garras no alto).
    this.scene.time.delayedCall(Predador.URRO_MS * 0.45, () => {
      if (this.dead) return;
      this.scene.cameras.main.shake(380, 0.01);
    });

    this.scene.time.delayedCall(Predador.URRO_MS, () => {
      if (this.dead) return;
      if (this.scene.anims.exists('predador-pulo')) this.tocar('predador-pulo', 'predadorLuta');
      else this.tocar('predador-giro', 'predadorLuta');
      const x0 = this.sprite.x;
      const y0 = this.sprite.y;
      this.ancora = Predador.ANCORAS[0];
      const x1 = this.ancora.x;
      const y1 = this.yApoio('chao');
      const e0 = Predador.ESCALA_SURGE;
      const e1 = Predador.ESCALA_LUTA;
      let impulsionou = false;
      let pousou = false;
      this.animarAte(
        Predador.SALTO_SURGE_MS,
        (k) => {
          // O voo só existe entre o impulso e o pouso; fora dele o clipe agacha/amortece no chão.
          const v = Phaser.Math.Clamp((k - Predador.PULO_IMPULSO) / (Predador.PULO_POUSO - Predador.PULO_IMPULSO), 0, 1);
          if (v >= 1 && !pousou) {
            pousou = true;
            this.scene.cameras.main.shake(160, 0.008);
          }
          if (v > 0 && !impulsionou) {
            impulsionou = true;
            this.scene.cameras.main.shake(90, 0.004);
          }
          const suave = Phaser.Math.Easing.Sine.InOut(v);
          this.pose = k < 0.55 ? 'S' : 'luta';
          this.setEscala(Phaser.Math.Linear(e0, e1, suave));
          this.sprite.setPosition(Phaser.Math.Linear(x0, x1, suave), Phaser.Math.Linear(y0, y1, suave) - Math.sin(Math.PI * v) * Predador.PULO_ALTURA);
        },
        () => {
          this.setEscala(e1);
          this.mover(x1, y1);
          this.idle();
          this.corpoCasca();
          this.coreBody.enable = true;
          this.armaTravada = false;
          this.mudar('chao', this.pausa());
        },
      );
    });
  }

  // ─── A luta ──────────────────────────────────────────────────────────────────

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    this.nave = target;
    this.t += dt;
    this.estadoT -= dt;
    this.atualizarLavas(dt);
    this.atualizarLuz(dt);
    this.atualizarBreu(target);

    if (this.dead) {
      this.posicionarCore();
      return;
    }

    // A virada para o breu é um BEAT: só entra quando ele está pousado (nunca no meio de um bote).
    const f = this.fase;
    if (f === 3 && this.fasePassada < 3 && (this.estado === 'chao' || this.estado === 'teto')) {
      this.fasePassada = 3;
      this.entrarNoBreu();
    } else if (f > this.fasePassada && f < 3) {
      this.fasePassada = f;
    }

    switch (this.estado) {
      case 'surgindo':
      case 'salto':
      case 'slash':
      case 'entrada':
      case 'rasgo':
      case 'urroBreu':
        break;

      case 'chao':
      case 'teto':
        if (this.estadoT <= 0) this.escolherAtaque();
        break;

      case 'carga':
        // No fim da carga ele CAI DE QUATRO — o último aviso antes do galope.
        if (!this.caiuDeQuatro && this.estadoT <= Predador.QUATRO_MS / 1000) {
          this.caiuDeQuatro = true;
          this.tocar('predador-quatro', 'predadorLuta');
          // De quatro a casca dos ombros desce: a caixa em pé ficaria flutuando acima dele (captura r3).
          this.corpoInteiro();
        }
        if (this.estadoT <= 0) {
          // A mirada é do FIM da carga — quem sai da linha no último pulso escapa.
          this.alvoX = target.x;
          this.alvoY = target.y;
          this.bote();
        }
        break;

      case 'bote':
        if (this.sprite.x <= Math.max(56, this.alvoX + 50) || this.estadoT <= 0) {
          this.body.setVelocity(0, 0);
          this.golpear();
        }
        break;

      case 'telegLava':
        if (this.estadoT <= 0) {
          this.arremessar(target);
          this.recuperando = true;
          this.mudar('recupera', Predador.RECUP_LAVA);
        }
        break;

      case 'recupera':
        if (this.estadoT <= 0) {
          this.recuperando = false;
          this.depoisDoAtaque();
        }
        break;

      case 'fora':
        if (this.estadoT <= 0) {
          // A volta é SEMPRE pelo chão (é dali que o rasgo sai). O aviso: o core acende na borda direita, na
          // altura em que ele vai entrar galopando.
          const m = Predador.MIOLO.luta;
          const y = this.yApoio('chao');
          this.luz.setPosition(GAME_WIDTH - 14, y + m.y * this.escala);
          this.mudar('aviso', Predador.AVISO);
        }
        break;

      case 'aviso':
        if (this.estadoT <= 0) this.reentrar();
        break;
    }

    if (this.estado !== 'fora' && this.estado !== 'aviso') this.posicionarCore();
  }

  private pausa(): number {
    const [a, b] = Predador.PAUSA[this.fase];
    return Phaser.Math.FloatBetween(a, b);
  }

  private escolherAtaque(): void {
    // Pendurado, a garra livre só arremessa — o bote sai do CHÃO.
    if (this.ancora.lado === 'teto') {
      this.telegrafarLava();
      return;
    }
    const repetiu = this.ultimos.length >= 2 && this.ultimos[0] === this.ultimos[1] ? this.ultimos[0] : null;
    let golpe: 'slash' | 'lava' = Math.random() < 0.5 ? 'slash' : 'lava';
    if (golpe === repetiu) golpe = golpe === 'slash' ? 'lava' : 'slash';
    this.ultimos.unshift(golpe);
    this.ultimos.length = Math.min(this.ultimos.length, 2);
    if (golpe === 'slash') this.carregar();
    else this.telegrafarLava();
  }

  private carregar(): void {
    const dur = Math.max(Predador.CARGA_MIN, Predador.CARGA[this.fase]);
    this.pulsoFase = 0;
    this.caiuDeQuatro = false;
    this.mudar('carga', dur);
  }

  /** O BOTE: galopa de quatro PELO CHÃO até a nave — o salto na altura dela é do golpe. */
  private bote(): void {
    this.tocar('predador-corrida', 'predadorLuta');
    this.corpoInteiro();
    const dx = Math.max(56, this.alvoX + 50) - this.sprite.x;
    const t = Math.max(0.12, Math.abs(dx) / Predador.BOTE_VEL);
    this.body.setVelocity(dx / t, 0);
    this.mudar('bote', t + 0.1);
  }

  /** O GOLPE: inclina, dois cortes, torce — e SALTA até a altura em que a nave estava, voltando ao chão. */
  private golpear(): void {
    this.mudar('slash');
    this.tocar('predador-slash', 'predadorLuta');
    this.corpoInteiro();
    this.scene.cameras.main.shake(110, 0.006);
    const x0 = this.sprite.x;
    const chao = this.yApoio('chao');
    const alvo = Phaser.Math.Clamp(this.alvoY - Predador.MIOLO.luta.y * this.escala, 70, chao);
    this.animarAte(
      Predador.SLASH_MS,
      (k) => {
        const s = Predador.SLASH_SALTO_ATE;
        // Sobe até a altura da nave na 1ª parte do golpe e desce até o chão no resto.
        const y = k < s ? Phaser.Math.Linear(chao, alvo, Phaser.Math.Easing.Sine.Out(k / s)) : Phaser.Math.Linear(alvo, chao, Phaser.Math.Easing.Quadratic.In((k - s) / (1 - s)));
        this.mover(x0 - 18 * Math.sin(Math.PI * Math.min(1, k / s) * 0.5), y);
      },
      () => {
        this.scene.cameras.main.shake(90, 0.005);
        this.recuperando = true;
        this.idle();
        this.corpoCasca();
        this.mudar('recupera', Predador.RECUP_SLASH);
      },
    );
  }

  private telegrafarLava(): void {
    if (this.ancora.lado === 'teto') this.tocar('predador-teto-lava', 'predadorTeto');
    else this.tocar('predador-lava', 'predadorLuta');
    this.mudar('telegLava', this.ancora.lado === 'teto' ? Predador.TELEG_LAVA_TETO : Predador.TELEG_LAVA);
  }

  /** Bolas de lava em arco: tempo de voo fixo, velocidade resolvida para cair onde a nave está. */
  private arremessar(target: Phaser.Physics.Arcade.Sprite): void {
    const n = this.fase === 1 ? Phaser.Math.Between(1, 2) : Phaser.Math.Between(2, 3);
    const e = this.escala;
    // A mão que solta a bola, em px virtuais, medida em cada clipe (`scripts/_f4/_medir-mao.mjs`).
    //  · PENDURADO (`teto-lava-f`, rodada 6): −115,+7. O telégrafo de 0,68s num clipe de 1100ms cai no quadro 10,5,
    //    e a garra ali está um pouco mais acima — este número é o que ele JOGOU e aprovou, com a bola saindo da mão.
    //  · NO CHÃO (`lava-core-c`, rodada 7): −83,+5, o quadro 13. O velho −70,−40 era do clipe v3, que arremessava
    //    por cima do ombro; este sai do PEITO, que é de onde ele agora tira a lava.
    const teto = this.ancora.lado === 'teto';
    const bocaX = this.sprite.x - (teto ? 115 : 83) * e;
    const bocaY = this.sprite.y + (teto ? 7 : 5) * e;
    for (let i = 0; i < n; i++) {
      const T = Predador.LAVA_VOO * (0.85 + i * 0.18);
      const ax = target.x + (i - (n - 1) / 2) * 26;
      const ay = target.y;
      const vx = (ax - bocaX) / T;
      const vy = (ay - bocaY - 0.5 * Predador.LAVA_G * T * T) / T;
      this.lancarLava(bocaX, bocaY, vx, vy, 'bola');
    }
    this.brasas.explode(10, bocaX, bocaY);
    this.scene.cameras.main.shake(70, 0.004);
  }

  /**
   * UMA GOTA DE LAVA — com cor de LAVA (pedido dele, 16/09: *"a lava tem que ter cor de lava"*) e que BRILHA
   * no breu (*"lava é fogo, então brilha no escuro"*): a bola (núcleo branco-amarelo → laranja → vermelho),
   * uma luz ADD que tremula por cima dela e um rastro de brasas. Tudo acima da camada do breu.
   */
  private lancarLava(x: number, y: number, vx: number, vy: number, tipo: TipoLava): void {
    const b = this.enemies.enemyBullets.get(x, y) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    b.setTexture(tipo === 'bola' ? 'lavaBola' : tipo === 'gota' ? 'lavaGota' : 'metalBrasa');
    b.clearTint();
    b.setScale(1);
    b.setFlipX(false);
    b.setDepth(41);
    b.setData('ox', x);
    b.setData('oy', y);
    b.setData('lava', true);
    b.setVelocity(vx, vy);
    b.setRotation(Math.atan2(vy, vx));
    const luz = this.scene.add
      .image(x, y, 'luzRadial')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(tipo === 'metal' ? 0xffb040 : 0xff6a18)
      .setScale(tipo === 'bola' ? 0.62 : tipo === 'metal' ? 0.46 : 0.34)
      .setDepth(40);
    this.lavas.push({ b, luz, tipo });
  }

  /** A gravidade da lava é DAQUI, não do pool (o `enemyBullets` é compartilhado com a fase inteira). */
  private atualizarLavas(dt: number): void {
    this.lavas = this.lavas.filter((l) => {
      if (l.b.active && l.b.getData('lava') === true) return true;
      l.luz.destroy();
      return false;
    });
    for (const l of this.lavas) {
      const { b, luz, tipo } = l;
      const bola = tipo === 'bola';
      const body = b.body as Phaser.Physics.Arcade.Body;
      if (tipo !== 'gota') body.velocity.y += Predador.LAVA_G * dt;
      b.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
      luz.setPosition(b.x, b.y).setAlpha(0.65 + Math.random() * 0.35);
      if (Math.random() < (tipo === 'gota' ? 0.35 : 0.8)) this.brasas.emitParticleAt(b.x, b.y);

      const bateuChao = b.y >= GROUND_Y - 4 && body.velocity.y > 0;
      const bateuTeto = b.y <= TETO_Y + 4 && body.velocity.y < 0;
      if (!bateuChao && !bateuTeto) continue;
      const x = b.x;
      const y = b.y;
      b.setData('lava', false);
      this.enemies.release(b);
      this.brasas.explode(tipo === 'gota' ? 4 : tipo === 'metal' ? 8 : 14, x, y);
      if (bola && this.fase === 3) this.estilhacar(x, y, bateuChao ? -1 : 1);
    }
  }

  private estilhacar(x: number, y: number, sentido: number): void {
    for (let i = 0; i < Predador.ESTILHACOS; i++) {
      // Um leque aberto para LONGE da borda (para cima se bateu no chão, para baixo se no teto).
      const k = i / (Predador.ESTILHACOS - 1);
      const ang = Phaser.Math.DegToRad(sentido < 0 ? -170 + k * 160 : 10 + k * 160);
      const v = Phaser.Math.Between(180, 220);
      this.lancarLava(x, y - sentido * 6, Math.cos(ang) * v, Math.sin(ang) * v, 'gota');
    }
  }

  /** As texturas da lava e as brasas — desenhadas no motor, zero geração. */
  private criarLava(): void {
    const bola = (key: string, lado: number) => {
      if (this.scene.textures.exists(key)) return;
      const tex = this.scene.textures.createCanvas(key, lado, lado);
      if (!tex) return;
      const ctx = tex.getContext();
      const r = lado / 2;
      const g = ctx.createRadialGradient(r - 1, r - 1, 0, r, r, r);
      g.addColorStop(0, '#fff8d0');
      g.addColorStop(0.28, '#ffd23a');
      g.addColorStop(0.58, '#ff7a10');
      g.addColorStop(0.85, '#c01e08');
      g.addColorStop(1, 'rgba(90,8,2,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r, r, r, 0, Math.PI * 2);
      ctx.fill();
      tex.refresh();
    };
    bola('lavaBola', 14);
    bola('lavaGota', 8);
    // O METAL INCANDESCENTE: uma lasca comprida e irregular (gira com a velocidade), branco-amarelo no miolo e
    // laranja-vermelho nas pontas — lê como metal em brasa, não como gota.
    if (!this.scene.textures.exists('metalBrasa')) {
      const tex = this.scene.textures.createCanvas('metalBrasa', 16, 8);
      if (tex) {
        const ctx = tex.getContext();
        const g = ctx.createLinearGradient(0, 0, 16, 0);
        g.addColorStop(0, '#8a1604');
        g.addColorStop(0.3, '#ff7a10');
        g.addColorStop(0.62, '#fff4c0');
        g.addColorStop(0.85, '#ffd23a');
        g.addColorStop(1, '#c83008');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.lineTo(4, 1);
        ctx.lineTo(11, 2);
        ctx.lineTo(16, 4);
        ctx.lineTo(12, 6);
        ctx.lineTo(5, 7);
        ctx.closePath();
        ctx.fill();
        tex.refresh();
      }
    }
    this.brasas = this.scene.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 240, max: 480 },
        speed: { min: 6, max: 34 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xfff0a0, 0xffb030, 0xff6a10, 0xd02a08],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(40);
  }

  // ─── A ronda ─────────────────────────────────────────────────────────────────

  private depoisDoAtaque(): void {
    const noLugar = Math.abs(this.sprite.x - this.ancora.x) < 6 && Math.abs(this.sprite.y - this.yApoio(this.ancora.lado)) < 6;
    if (this.fase >= 2) {
      const r = Math.random();
      if (r < 0.25) {
        this.sair();
        return;
      }
      if (r < 0.75 || !noLugar) {
        this.irPara(this.sortearAncora());
        return;
      }
    } else if (!noLugar) {
      this.irPara(Predador.ANCORAS[Math.random() < 0.5 ? 0 : 1]);
      return;
    }
    this.pousar(this.ancora);
  }

  private pousar(ancora: Ancora): void {
    this.ancora = ancora;
    this.idle();
    this.corpoCasca();
    this.mudar(ancora.lado, this.pausa());
  }

  private sortearAncora(): Ancora {
    const opcoes = Predador.ANCORAS.filter((a) => a !== this.ancora && (this.fase >= 2 || a.lado === 'chao'));
    return Phaser.Utils.Array.GetRandom(opcoes);
  }

  /**
   * Ir de onde está para uma âncora, com o gesto certo para cada trecho (rodada 3):
   *   chão → chão para a ESQUERDA: galopa · para a direita: salta para trás;
   *   chão → teto: pula e AGARRA o teto com uma garra (o clipe inteiro no voo);
   *   teto → chão: SOLTA (o mesmo clipe ao contrário);
   *   teto → teto: vai balançando de garra em garra.
   */
  private irPara(ancora: Ancora, aoChegar?: () => void): void {
    const de = this.ancora.lado;
    this.ancora = ancora;
    this.body.setVelocity(0, 0);
    this.mudar('salto');
    this.corpoInteiro();
    const x0 = this.sprite.x;
    const y0 = this.sprite.y;
    const x1 = ancora.x;
    const y1 = this.yApoio(ancora.lado);
    const chegar = () => {
      this.mover(x1, y1);
      if (aoChegar) aoChegar();
      else this.pousar(ancora);
    };

    if (de === 'chao' && ancora.lado === 'teto') {
      this.tocar('predador-agarra', 'predadorTeto');
      this.corpoInteiro();
      this.animarAte(
        Predador.SALTO_TETO_MS,
        (k) => {
          this.pose = k < 0.6 ? 'luta' : 'teto';
          this.mover(Phaser.Math.Linear(x0, x1, k), Phaser.Math.Linear(y0, y1, k));
        },
        () => {
          this.scene.cameras.main.shake(90, 0.004);
          chegar();
        },
        'Sine.easeInOut',
      );
      return;
    }
    if (de === 'teto' && ancora.lado === 'chao') {
      this.tocar('predador-agarra', 'predadorLuta', true);
      this.corpoInteiro();
      this.animarAte(
        Predador.SALTO_TETO_MS,
        (k) => {
          this.pose = k < 0.4 ? 'teto' : 'luta';
          this.mover(Phaser.Math.Linear(x0, x1, k), Phaser.Math.Linear(y0, y1, k));
        },
        () => {
          this.scene.cameras.main.shake(140, 0.006);
          chegar();
        },
        'Quad.easeIn',
      );
      return;
    }
    if (de === 'teto') {
      this.tocar('predador-teto-balanco', 'predadorTeto');
      this.corpoInteiro();
      this.animarAte(
        Math.max(500, Math.abs(x1 - x0) * 9),
        (k) => this.mover(Phaser.Math.Linear(x0, x1, k), Phaser.Math.Linear(y0, y1, k) + Math.sin(Math.PI * k) * 10),
        chegar,
        'Sine.easeInOut',
      );
      return;
    }
    if (x1 < x0) {
      this.tocar('predador-corrida', 'predadorLuta');
      this.corpoInteiro();
      this.animarAte(Math.max(260, ((x0 - x1) / Predador.BOTE_VEL) * 1000), (k) => this.mover(Phaser.Math.Linear(x0, x1, k), y0 + (y1 - y0) * k), chegar);
      return;
    }
    // Para trás (a direita), de frente para a nave: um salto recuando.
    this.estatico('predadorLuta');
    this.corpoInteiro();
    const altura = Math.abs(y1 - y0) < 20 ? 46 : 18;
    this.animarAte(
      Predador.SALTO_MS,
      (k) => this.mover(Phaser.Math.Linear(x0, x1, k), Phaser.Math.Linear(y0, y1, k) - Math.sin(Math.PI * k) * altura),
      () => {
        this.scene.cameras.main.shake(90, 0.004);
        chegar();
      },
      'Sine.easeInOut',
    );
  }

  /** A SAÍDA pela direita: não é âncora (não há parede ali — medido no mock de 16/09), é sumir. */
  private sair(): void {
    const fora: Ancora = { x: GAME_WIDTH + 90, lado: this.ancora.lado };
    this.irPara(fora, () => {
      this.sprite.setVisible(false);
      this.body.enable = false;
      this.coreBody.enable = false;
      this.mudar('fora', Phaser.Math.FloatBetween(Predador.FORA_MIN, Predador.FORA_MAX));
    });
  }

  /**
   * A VOLTA (17/09): galopa da borda direita até o meio da arena, PARA, e rasga o chão de baixo para cima — o metal
   * incandescente sobe em arco até a nave. Aviso (o core na borda) → galope → rasgo → recuperação.
   */
  private reentrar(): void {
    this.sprite.setVisible(true);
    this.coreBody.enable = true;
    const y = this.yApoio('chao');
    const x0 = GAME_WIDTH + 90;
    const x1 = Predador.RASGO_X;
    this.mover(x0, y);
    this.ancora = { x: x1, lado: 'chao' };
    this.mudar('entrada');
    this.tocar('predador-corrida', 'predadorLuta');
    this.corpoInteiro();
    this.animarAte(((x0 - x1) / Predador.BOTE_VEL) * 1000, (k) => this.mover(Phaser.Math.Linear(x0, x1, k), y), () => this.rasgar());
  }

  private rasgar(): void {
    this.mudar('rasgo');
    this.tocar('predador-rasgo', 'predadorLuta');
    this.corpoInteiro();
    this.scene.cameras.main.shake(80, 0.004);
    // A mira é de quando ele PARA: quem se move durante o golpe escapa.
    const ax = this.nave?.x ?? 90;
    const ay = this.nave?.y ?? 100;
    let soltou = false;
    this.animarAte(
      Predador.RASGO_MS,
      (k) => {
        if (soltou || k < Predador.RASGO_SOLTA) return;
        soltou = true;
        this.lancarMetal(ax, ay);
      },
      () => {
        if (!soltou) this.lancarMetal(ax, ay);
        this.recuperando = true;
        this.idle();
        this.corpoCasca();
        this.mudar('recupera', Predador.RECUP_RASGO);
      },
    );
  }

  /** O METAL INCANDESCENTE: sai do chão à frente das garras, num leque de arcos que caem onde a nave estava. */
  private lancarMetal(ax: number, ay: number): void {
    const n = Predador.METAL_N[this.fase];
    const x0 = this.sprite.x - 60 * this.escala;
    const y0 = Predador.CHAO_APOIO - 4;
    for (let i = 0; i < n; i++) {
      const T = Predador.METAL_VOO * (0.8 + i * 0.14);
      const tx = ax + (i - (n - 1) / 2) * Predador.METAL_ABRE;
      const vx = (tx - x0) / T;
      const vy = (ay - y0 - 0.5 * Predador.LAVA_G * T * T) / T;
      this.lancarLava(x0 + Phaser.Math.Between(-6, 6), y0, vx, vy, 'metal');
    }
    // O chão rasgado: um jorro de fagulhas e o tranco.
    for (let i = 0; i < 26; i++) this.brasas.emitParticleAt(x0 + Phaser.Math.Between(-16, 16), y0 - Phaser.Math.Between(0, 10));
    this.brasas.explode(18, x0, y0);
    this.scene.cameras.main.shake(160, 0.009);
  }

  // ─── A luz do core e o breu ──────────────────────────────────────────────────

  private atualizarLuz(dt: number): void {
    let periodo = this.breu ? Predador.PULSO_BREU : 1.6;
    let base = this.breu ? 0 : 0.35;
    let forte = this.breu ? 1 : 0.35;

    if (this.estado === 'carga') {
      // A CARGA (a ideia dele): o pulso começa lento e ACELERA até o bote.
      const dur = Math.max(Predador.CARGA_MIN, Predador.CARGA[this.fase]);
      const k = Phaser.Math.Clamp(1 - this.estadoT / dur, 0, 1);
      periodo = Phaser.Math.Linear(0.55, 0.08, k * k);
      base = this.breu ? 0.1 : 0.3;
      forte = 1;
    } else if (this.estado === 'entrada') {
      // Galopando para o rasgo: o core no ritmo mais rápido da carga — o golpe vem quando ele parar.
      periodo = 0.1;
      base = this.breu ? 0.2 : 0.4;
      forte = 1;
    } else if (this.estado === 'aviso') {
      // O aviso da reentrada precisa GRITAR: ele vem de fora da tela, e o jogador não o via.
      periodo = 0.2;
      base = 0.7;
      forte = 1;
    } else if (this.recuperando) {
      // O convite: exposto, o peito brilha mais.
      base = this.breu ? 0.35 : 0.6;
      forte = 1;
    }

    this.pulsoFase = (this.pulsoFase + (dt * Math.PI * 2) / periodo) % (Math.PI * 2);
    this.pulso = Math.pow(Math.max(0, Math.sin(this.pulsoFase)), 3);
    const alpha = base + (forte - base) * this.pulso;
    const visivel = this.estado !== 'fora' && this.estado !== 'morto';
    this.luz.setVisible(visivel || this.estado === 'aviso');
    this.luz.setAlpha(alpha);
    this.luz.setScale((this.estado === 'aviso' ? 1.6 : this.breu ? 1.1 : 0.9) + 0.35 * this.pulso);
  }

  private entrarNoBreu(): void {
    this.mudar('urroBreu');
    this.body.setVelocity(0, 0);
    this.scene.cameras.main.shake(420, 0.008);
    this.breu = true;

    this.breuCamada = this.scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(5)
      .setAlpha(0);
    this.scene.tweens.add({ targets: this.breuCamada, alpha: Predador.BREU_ALPHA, duration: Predador.BREU_ENTRA_MS });

    // O halo da nave: JUSTO, só ela — não ilumina nada em volta.
    this.halo = this.scene.add.image(0, 0, 'luzRadial').setBlendMode(Phaser.BlendModes.ADD).setTint(0x9ec4ff).setScale(0.5).setAlpha(0.42).setDepth(5.5);

    // O CORPO REVELADO pela luz do core: uma cópia escura e avermelhada, alpha preso ao pulso.
    this.revela = this.scene.add.image(0, 0, this.sprite.texture.key).setDepth(6.5).setTint(0x7a1c12).setAlpha(0);

    this.scene.time.delayedCall(900, () => {
      if (this.dead) return;
      this.pousar(this.ancora);
    });
  }

  private atualizarBreu(target: Phaser.Physics.Arcade.Sprite): void {
    if (!this.breu) return;
    if (this.nave !== target || !this.halo) return;
    if (target.depth < 6) {
      this.naveDepth = target.depth;
      target.setDepth(6);
    }
    this.halo?.setPosition(target.x, target.y);
    if (this.revela) {
      this.revela
        .setTexture(this.sprite.texture.key, this.sprite.frame.name)
        .setOrigin(this.sprite.originX, this.sprite.originY)
        .setPosition(this.sprite.x, this.sprite.y)
        .setScale(this.sprite.scaleX)
        .setFlip(this.sprite.flipX, this.sprite.flipY)
        .setVisible(this.sprite.visible)
        .setAlpha((this.breuCamada?.alpha ?? 0) * 0.62 * this.pulso);
    }
  }

  private sairDoBreu(ms: number): void {
    if (this.breuCamada) {
      const camada = this.breuCamada;
      this.scene.tweens.add({ targets: camada, alpha: 0, duration: ms, onComplete: () => camada.destroy() });
      this.breuCamada = null;
    }
    this.halo?.destroy();
    this.halo = null;
    this.revela?.destroy();
    this.revela = null;
    if (this.nave) this.nave.setDepth(this.naveDepth);
    this.breu = false;
  }

  // ─── Dano, morte ─────────────────────────────────────────────────────────────

  damage(amount: number): boolean {
    if (this.dead || this.estado === 'surgindo' || this.estado === 'fora' || this.estado === 'aviso') return false;
    const dano = amount * (this.recuperando ? Predador.DANO_RECUP : 1);
    this.hp = Math.max(0, this.hp - dano);
    this.aoMudarVida();

    this.sprite.setTint(this.recuperando ? 0xffe0a0 : 0xffb090);
    this.scene.time.delayedCall(60, () => !this.dead && this.sprite.clearTint());

    if (this.hp > 0) return false;

    this.dead = true;
    this.mudar('morto');
    this.tween?.stop();
    this.tween = null;
    this.body.setVelocity(0, 0);
    this.recuperando = false;
    this.coreBody.enable = false;
    this.tocar('predador-morte', 'predadorLuta');
    this.luz.setAlpha(1).setScale(1.8);
    this.scene.tweens.add({ targets: this.luz, alpha: 0, duration: Predador.MORTE_MS });

    // A QUEDA (*"o corpo não pode flutuar caído, precisa cair na borda"*): morto no teto, no salto ou no golpe,
    // ele despenca até o chão enquanto desaba — o clipe termina estendido na linha dos pés.
    const x = Phaser.Math.Clamp(this.sprite.x, 50, GAME_WIDTH - 50);
    const chao = this.yApoio('chao');
    if (Math.abs(this.sprite.y - chao) > 2 || x !== this.sprite.x) {
      this.scene.tweens.add({
        targets: this.sprite,
        x,
        y: chao,
        duration: Predador.QUEDA_MS,
        ease: 'Quad.easeIn',
        onComplete: () => this.scene.cameras.main.shake(160, 0.008),
      });
    }

    // A MORTE COMPOSTA: o clipe + o sangue do mesmo organismo que estourou na troca + estouros pelo corpo.
    const e = this.escala;
    explosaoSangrenta(this.scene, this.core.x, this.core.y, 0.7);
    sangueNaTela(this.scene, 5);
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(120 + i * 170, () => {
        this.fx.explode(this.sprite.x + Phaser.Math.Between(-70, 70) * e, this.sprite.y + Phaser.Math.Between(-90, 90) * e, 1.1, 52);
      });
    }
    this.sairDoBreu(800);
    return true;
  }

  destroy(): void {
    this.tween?.stop();
    this.sairDoBreu(0);
    for (const l of this.lavas) {
      if (l.b.active) this.enemies.release(l.b);
      l.luz.destroy();
    }
    this.lavas = [];
    this.brasas.destroy();
    this.luz.destroy();
  }
}
