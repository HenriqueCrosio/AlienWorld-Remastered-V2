import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import type { EnemySystem } from '../systems/EnemySystem';
import type { Fx } from '../systems/Fx';
import { GROUND_Y, TETO_Y } from '../systems/TerrainSystem';
import { explosaoSangrenta, sangueNaTela } from './sangue';
import { Som, type Laco } from '../som/Som';
import { somDaExplosao } from '../som/somDaExplosao';
import { Music } from '../systems/Music';
import { QUADROS_BESTA, type Caixa, type QuadrosClipe } from './besta/quadros';
import { SEDE, devolucao, type Bebido } from './besta/sede';
import { VOLTA, fimDoTeto, rotaDaVolta, type Arena, type Trecho } from './besta/volta';
import { OLHOS, luzes, pulsoDa, salto, type ArenaOlhos, type Luz } from './besta/olhos';
import { CORACAO, apagadas, campo } from './besta/coracao';
import { algumDesenhado, mascaraDe } from './besta/mascara';
import { PAREDE, figuraDaParede, nascimento, pecasDaColuna, segura as seguraParede } from './besta/parede';

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
 *
 * ─── 25/11: A ARTE NOVA (E-7-1, the art switch of 24/11, step 4 of `besta-bio`) ───
 * Every new clip shares ONE frame: 256², the side pose 150 px tall with the feet on y=252, drawn at 105/150 = 0.70
 * (so the virtual-frame factor is 1 everywhere: origin (0.5, 0.5), feet +124, the hanging claw on y=3 → −125). The
 * body, the core and the lava mouth are no longer fixed numbers per pose: they are READ PER FRAME from the art
 * (`besta/quadros.ts`, measured by `scripts/_f4/besta_folhas.py`) — the spec 2026-11-24 §6 fixes for the claw that
 * passed through the ship and the core on her back while galloping. The tail is visual only (out of the boxes).
 */
export type EstadoPredador =
  | 'surgindo'
  | 'chao'
  | 'teto'
  | 'carga'
  | 'bote'
  | 'agacha'
  | 'slash'
  | 'telegLava'
  | 'recupera'
  | 'salto'
  | 'fora'
  | 'aviso'
  | 'entrada'
  | 'rasgo'
  | 'urroBreu'
  | 'sede'
  | 'volta'
  | 'olhos'
  | 'coracao'
  | 'morto';

type Pose = 'S' | 'luta' | 'teto';
/** The moves of the fixed order (spec 2026-11-24 §3). */
type Ataque = 'lava' | 'golpe' | 'sede' | 'volta' | 'olhos' | 'coracao';
type Ancora = { x: number; lado: 'chao' | 'teto' };
type Retangulo = { x: number; y: number; w: number; h: number };
/**
 * A bola de lava (arco), a gota do estilhaço (reta) e o metal incandescente do rasgo (arco, não estilhaça). 25/11: the
 * splash of a landed ball (`respingo`, a short column with gravity) and its pool on the floor (`poca`, still, ~0.8 s).
 */
type TipoLava = 'bola' | 'gota' | 'metal' | 'respingo' | 'poca';

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
  /**
   * The new front pose is 148 px of the frame. 1.2 would match the old surge's height (178 px of screen), but the roar
   * lifts the head and spreads the claws: at 1.2 they left the top and the right of the screen (filmed 25/11). 1.0 fits.
   */
  static readonly ESCALA_SURGE = 1.0;
  /** 105/150: the size he approved in step 1 (`besta-bio/passo1.html`). */
  static readonly ESCALA_LUTA = 0.7;
  /** Onde a BORDA DESENHADA acaba (não a colisão, y=10/206, que fica dentro da faixa). */
  static readonly CHAO_APOIO = 190;
  static readonly TETO_APOIO = 30;
  /**
   * 25/11, his note ("a garra está agarrando o vazio… quero que ela agarre o metal de cima"): hanging, the claw tips
   * sit HERE, inside the drawn metal band of the ceiling (y≈14–28, measured in the game; the border is drawn behind
   * her), so the fingers lie over the metal and grip it instead of floating below its edge. Every ceiling clip has its
   * claw at y=3 of the frame, so this one number moves both poses and all the ceiling animations.
   */
  static readonly GARRA_CRAVA = 19;
  /** The claw that holds the ceiling, in virtual px from the centre: y=3 of the hanging poses (teto-1/teto-2). */
  static readonly GARRA_TETO_Y = 3 - 128;
  /**
   * The ceiling anchors are a cycle and a HALF of the ceiling walk apart (25/11): the swap teto-1→teto-2 carries the
   * body 48 px of the frame and teto-2→teto-1 another 64 (`besta/quadros.ts` `passo`), so 48 + 64 + 48 = 160 × 0.7 =
   * 112 px, and walking from one to the other she arrives on the OTHER hand — both hanging poses, both lava throws
   * (his design: the free hand of each pose throws). No slide.
   */
  static readonly ANCORAS: Ancora[] = [
    { x: 300, lado: 'chao' },
    { x: 238, lado: 'chao' },
    { x: 322, lado: 'teto' },
    { x: 322 - 160 * 0.7, lado: 'teto' },
  ];

  /**
   * O FATOR e a POSE de cada clipe e de cada estático. 25/11: the new art has factor 1 everywhere (one frame for all).
   * The pose is what the code still asks ('teto' = hanging); the body and the core come from `besta/quadros.ts`.
   */
  static readonly QUADRO: Record<string, { f: number; pose: Pose }> = {
    'besta:frente': { f: 1, pose: 'S' },
    'besta:lado': { f: 1, pose: 'luta' },
    'besta:quatro-pose': { f: 1, pose: 'luta' },
    'besta:teto1': { f: 1, pose: 'teto' },
    'besta:teto2': { f: 1, pose: 'teto' },
    'besta-urro': { f: 1, pose: 'S' },
    'besta-pulo': { f: 1, pose: 'S' },
    'besta-vira': { f: 1, pose: 'S' },
    'besta-teto-anda-a': { f: 1, pose: 'teto' },
    'besta-teto-anda-b': { f: 1, pose: 'teto' },
    'besta-teto-lava-1': { f: 1, pose: 'teto' },
    'besta-teto-lava-2': { f: 1, pose: 'teto' },
    'besta-sede-abre': { f: 1, pose: 'S' },
    'besta-sede-aberta': { f: 1, pose: 'S' },
    'besta-sede-fecha': { f: 1, pose: 'S' },
    'besta-sede-devolve': { f: 1, pose: 'S' },
    'besta-coracao-aperta': { f: 1, pose: 'S' },
    'besta-coracao-parado': { f: 1, pose: 'S' },
    'besta-coracao-solta': { f: 1, pose: 'S' },
  };

  /**
   * 25/11, THE THIRST (spec §4.1, step 5): both clips face the ship (sede-abre3-a, sede-devolve-b), so she turns to it
   * first (the turn played backwards) and back to her side after. The opening is frames 0–5, the chest held open is
   * 5–12 back and forth (a loop) while the ring is open, the closing 13–16; the jolt of the return is frame 4 of the
   * return clip (the flash he kept: "mesmo que ela dê um clarão").
   */
  static readonly SEDE_ABRE_MS = 400;
  static readonly SEDE_ABERTA_CICLO_MS = 1000;
  static readonly SEDE_FECHA_MS = 250;
  static readonly SEDE_DEVOLVE_MS = 1100;
  static readonly SEDE_TRANCO = 4 / 17;
  /** The core's own colour (and the ring's before it drinks); it turns to the colour of what it drank. */
  static readonly COR_CORE = 0xff7a2a;
  /** The ring takes its full colour from this many drunk shots. */
  static readonly SEDE_COR_CHEIA = 10;
  /** The returned drop, a little smaller than the lava drop (his call, 25/11). */
  static readonly SEDE_GOTA_ESCALA = 0.75;

  static readonly URRO_MS = 1200;
  /** After the jump she lands facing the ship and turns to her side (frente-v3 played backwards, 9 frames). */
  static readonly VIRA_MS = 450;
  /**
   * O PULO DO SURGIMENTO (rodada 2 — *"ficou realmente ótimo"*). O clipe agacha, impulsiona, torce e pousa; o motor
   * SÓ SOBE entre o impulso e o pouso (frações da duração).
   */
  static readonly SALTO_SURGE_MS = 1000;
  /** 25/11: the new jump (pulo-b) is played whole; the LEAP IS PAINTED in the clip (feet off the floor in frames 4–11). */
  static readonly PULO_QUADROS: number[] | undefined = undefined;
  static readonly PULO_IMPULSO = 4 / 17;
  static readonly PULO_POUSO = 12 / 17;
  /** The engine adds no height of its own any more (the clip leaps ~110 px of the frame); it only keeps her under the ceiling. */
  static readonly PULO_ALTURA = 0;

  /**
   * RODADA 3 (16/09) — *"o idle é idle, a fase está em movimento e no idle parece que está deslizando"*: parado no
   * chão ele ANDA no lugar (o laço medido por `_achar-loop.mjs`: quadros 4..12 do `andar-c`).
   */
  static readonly ANDAR_QUADROS: number[] | undefined = undefined;
  /** 25/11 (his): andar5-a, its loop 1..14 (the sheet holds only the loop), at 1400 ms — *"o andar5-a 1400 ficou bom"*. */
  static readonly ANDAR_MS = 1400;
  /** *"correndo como um gorila ou urso"*: cai de quatro no fim da carga e GALOPA no bote. 25/11: quatro-2 "devagar". */
  static readonly QUATRO_MS = 760;
  /** Standing back up from all fours (quatro-2 backwards, faster: it is the recovery, not the warning). */
  static readonly LEVANTA_MS = 400;
  static readonly CORRIDA_QUADROS: number[] | undefined = undefined;
  /** galope-a, the loop 3..12 (10 frames) at the old gallop's frame rate (15 frames in 620 ms). */
  static readonly CORRIDA_MS = 420;
  /** 25/11: golpe-a (*"é o único que ataca com as duas garras"*), whole, with the JUMP to the ship. */
  static readonly SLASH_QUADROS: number[] | undefined = undefined;
  static readonly SLASH_MS = 900;
  /** The stop line of the bote (spec 2026-11-24 §3): her centre never closer than this to the left wall. */
  static readonly PARADA_X = 90;
  static readonly SLASH_SALTO_ATE = 0.45;
  /**
   * 25/11 — THE CROUCH (him: *"quero algo dinâmico, que faça o jogador sentir que desviou por entender a situação"*; his
   * pick "salta onde você está"): at the stop line she stays down on all fours, claws dug in and the core flaring, for
   * `AGACHA_S`; the leap's height is taken when she CROUCHES. The tell and the rise together are the window to leave that
   * height — the ship that waits is hit, the one that reacts to the crouch is not.
   */
  static readonly AGACHA_S = 0.5;
  /** Where the leap puts her core, in screen px BELOW the ship's height at the crouch (0 = the core on the ship). */
  static readonly SLASH_MIRA_DY = 0;
  /**
   * Pendurado: balança (laço 5..15 do `teto-balanco`) e arremessa com a garra LIVRE (rodada 4 — 17/09: *"ele está
   * agarrando com a mesma garra que ele joga a lava"*). ⚠️ RODADA 6 (18/09): o `teto-lava-b` ainda TROCAVA de garra
   * no meio do gesto — *"começa com a de trás e acaba com a da frente"* —, porque o braço que enrolava passava ATRÁS
   * do tronco e sumia. O `teto-lava-f` resolve pela encenação: a garra da FRENTE colhe a bola no core aceso e a solta
   * sem nunca cruzar para trás. A bola deixa a mão entre os quadros 10 e 11, como antes.
   */
  static readonly BALANCO_QUADROS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  static readonly BALANCO_MS = 1300;
  /**
   * 25/11, his idea: on the ceiling she WALKS hand over hand (teto-1 ↔ teto-2, the claw that holds never slides). Each
   * swap clip carries the body inside the frame; at its end the engine moves the sprite by the same step and shows
   * the other hand's still pose. ~480 ms a swap ≈ 80 px/s (the old swing went ~110; he saw it slow on the sheet).
   */
  static readonly TROCA_MAO_MS = 480;
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
  static readonly LAVA_QUADROS: number[] | undefined = undefined;
  /**
   * 25/11: lava2-a (floor) and lava-1-c / lava-2-b (ceiling, by the FREE hand of each hanging pose). The painted ball
   * and its stream were CUT out of the sheets (`besta_folhas.py`), so the engine's ball is the only one (spec §6, the
   * two balls of the ceiling). The telegraph is no longer a hand-tuned number: it is `solta / n × ms` of the clip.
   */
  static readonly LAVA_MS = 700;
  static readonly TETO_LAVA_MS = 900;
  static readonly RECUP_LAVA = 0.6;
  static readonly DANO_RECUP = 2;
  static readonly LAVA_G = 260;
  static readonly LAVA_VOO = 1.1;
  static readonly ESTILHACOS = 6;
  /** salto-tras-a (17 frames, the leap painted in the clip): the engine only carries her to the right. */
  static readonly SALTO_MS = 700;
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
  /**
   * 25/11: rasgoD-a — from the gallop, in profile: the claws stab and burn in the floor (frames 7–12, the warning), the
   * arms rip all the way up over the head with today's painted arc (13–18), and she drops back on all fours. 25 frames
   * at the old clip's rate (65 ms).
   */
  static readonly RASGO_MS = 1625;
  static readonly RASGO_QUADROS: number[] | undefined = undefined;
  /** The arc rises off the floor on frame 13 of 25: the engine's metal leaves there. */
  static readonly RASGO_SOLTA = 13 / 25;
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
  /** The death's bursts, under the howl (they were 0.87, and the howl was not heard — see `damage`). */
  static readonly MORTE_ESTOURO_FORCA = 0.35;
  /** The whispers' swell at her death, ms after the blow (the howl's cry is heard first). */
  static readonly MORTE_SAIDA_MS = 900;
  /** The track opens out of the dark only after the howl, ms after the blow. */
  static readonly MORTE_TRILHA_MS = 1900;
  /** *"o corpo não pode flutuar caído, precisa cair na borda"*: a queda até o chão enquanto a morte toca. */
  static readonly QUEDA_MS = 420;

  hp = Predador.HP;
  estado: EstadoPredador = 'surgindo';
  recuperando = false;
  breu = false;
  armaTravada = true;
  dead = false;

  /** The pose of the frame on screen (`QUADRO`); 25/11 only `teto` still matters (read by `pendurada`). */
  private pose: Pose = 'S';
  get pendurada(): boolean {
    return this.pose === 'teto';
  }
  /** Hanging: which hand holds the ceiling (teto-1 = hand 1). The OTHER one throws the lava. */
  private mao: 1 | 2 = 1;
  /** Which box of the art is the body now (`casca` = torso and head, holds bullets; `inteiro` = all but the tail). */
  private modoCorpo: 'casca' | 'inteiro' | null = null;
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
  /** Where she is in her phase's fixed order (`ORDEM`), and which phase that index belongs to. */
  private ordemI = 0;
  private ordemFase = 0;
  /** The signatures already seen in this fight — the per-phase LOCKS read them (spec §3). */
  private readonly vistas = new Set<Ataque>();
  /** The lava's fixed landing figures alternate (spec §3). */
  private figuraLava = 0;
  /** How many lava throws so far (the aimed one alternates with the floor figure). */
  private lavaN = 0;
  /** THE THIRST: the ring is open (drinking), what it drank so far, since when (scene ms), the ring's image. */
  private sedeAberta = false;
  private bebidos: Bebido[] = [];
  private sedeDesde = 0;
  private anel: Phaser.GameObjects.Image | null = null;
  /** 1 on a gulp, decays: the ring flashes for each shot it drinks. */
  private gole = 0;
  /** THE RETURN: the leg she is on (read by the tests and the film; null outside the return). */
  trechoAtual: Trecho | null = null;
  /** THE EYES IN THE DARK: how many times they came (the figures turn), the lights on screen, the time since they lit,
   *  the beats seen, where the ship was at the last one, and whether she is leaping now. */
  private olhosN = 0;
  private luzesOlhos: { l: Luz; brilho: Phaser.GameObjects.Image; olhos: Phaser.GameObjects.Image; golpes: number; flash: number; morta: boolean }[] = [];
  /** The embers' sparks that fall to the floor and go out in the lava (the shot ember, see `brasaNoTiro`). */
  private faiscas!: Phaser.GameObjects.Particles.ParticleEmitter;
  private brasaSoouEm = 0;
  private olhosT = 0;
  olhosBatidas = 0;
  naveBatida: { x: number; y: number } | null = null;
  olhosSaltando = false;
  private olhosDeslizou = false;
  /** The tell before the leap (the true eyes narrowed and burning). */
  private olhosAvisando = false;
  /** THE HEART STOPS: everything that flies is frozen (hers here, the player's by the scene), since when (scene ms). */
  congelado = false;
  private congeladoDesde = 0;
  private fasePassada = 1;
  private pulsoFase = 0;
  /** 0..1 — o brilho do core agora (a captura espera o pico e o vale). */
  pulso = 0;
  /** `fim` = the scene time a still pool dries (the others end when they touch an edge). */
  /**
   * `id` (26/11): the pool is shared and a released sprite comes straight back on the next `get` — a landing ball frees
   * its sprite and its own splash takes it at once. The entry owns the sprite only while the sprite carries its id; a
   * stale 'bola' entry on a reused sprite was landing every falling drop again as a ball (the endless splash, and a pool
   * so full the slow wall lost columns).
   */
  private lavas: { b: Phaser.Physics.Arcade.Sprite; luz: Phaser.GameObjects.Image; tipo: TipoLava; fim?: number; id: number }[] = [];
  private lavaId = 0;
  private metalSoouEm = 0;
  private brasas!: Phaser.GameObjects.Particles.ParticleEmitter;
  private tween: Phaser.Tweens.Tween | null = null;

  private readonly luz: Phaser.GameObjects.Image;
  private breuCamada: Phaser.GameObjects.Rectangle | null = null;
  private halo: Phaser.GameObjects.Image | null = null;
  private revela: Phaser.GameObjects.Image | null = null;
  private nave: Phaser.Physics.Arcade.Sprite | null = null;
  /** THE SOUND (block SOUND, sheet 5c): the gallop loop while he runs on all fours, and the slash's hit-or-miss — it
   *  starts as the MISS and turns into the HIT at the instant the ship is struck (his: *"o A quando ele acerta a nave e
   *  o B se ele errar"*) */
  private somGalope: Laco | null = null;
  /** 25/11, step 10: the murmurs under the whole dark (a loop), and the track closed with it. */
  private somMurmurio: Laco | null = null;
  /** 25/11, sheet 18c (his): the F whispers layered on the G while the eyes blink, until the tell. */
  private somMurmurioOlhos: Laco | null = null;
  /** How much the dark closes the track (his: "quase completamente"), and more while the heart is stopped. */
  /** (25/11, him: "a trilha fica quase nula e abafada" — the senses sharpened: the track a muffled trace under the dark) */
  static readonly ESCURO_TRILHA = { hz: 220, db: -22 };
  static readonly ESCURO_TRILHA_PARADO = { hz: 180, db: -28 };
  private golpeDesde = 0;
  private golpeAcertou = true;

  private galopar(ligar: boolean): void {
    if (ligar) this.somGalope ??= Som.laco('predador.galope');
    else {
      this.somGalope?.parar(160);
      this.somGalope = null;
    }
  }
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
    this.estatico('besta:frente');
    this.setEscala(Predador.ESCALA_SURGE);
    // 25/11: the new front pose has its feet on y=252 of the frame: she surges standing on the floor line.
    this.sprite.setY(Predador.CHAO_APOIO - 124 * Predador.ESCALA_SURGE);
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
    clipe('besta-urro', 'besta:urro', Predador.URRO_MS);
    clipe('besta-pulo', 'besta:pulo', Predador.SALTO_SURGE_MS, 0, Predador.PULO_QUADROS);
    clipe('besta-vira', 'besta:vira', Predador.VIRA_MS);
    clipe('besta-andar', 'besta:andar', Predador.ANDAR_MS, -1, Predador.ANDAR_QUADROS);
    clipe('besta-quatro', 'besta:quatro', Predador.QUATRO_MS);
    clipe('besta-levanta', 'besta:quatro', Predador.LEVANTA_MS, 0, Array.from({ length: 17 }, (_, i) => 16 - i));
    clipe('besta-galope', 'besta:galope', Predador.CORRIDA_MS, -1, Predador.CORRIDA_QUADROS);
    clipe('besta-golpe', 'besta:golpe', Predador.SLASH_MS, 0, Predador.SLASH_QUADROS);
    clipe('besta-rasgo', 'besta:rasgo', Predador.RASGO_MS, 0, Predador.RASGO_QUADROS);
    clipe('besta-lava', 'besta:lava', Predador.LAVA_MS, 0, Predador.LAVA_QUADROS);
    clipe('besta-salto-tras', 'besta:salto-tras', Predador.SALTO_MS);
    clipe('besta-morte', 'besta:morte', Predador.MORTE_MS);
    clipe('besta-agarra', 'besta:agarra', Predador.SALTO_TETO_MS);
    clipe('besta-teto-anda-a', 'besta:teto-anda-a', Predador.TROCA_MAO_MS);
    clipe('besta-teto-anda-b', 'besta:teto-anda-b', Predador.TROCA_MAO_MS);
    clipe('besta-teto-lava-1', 'besta:teto-lava-1', Predador.TETO_LAVA_MS);
    clipe('besta-teto-lava-2', 'besta:teto-lava-2', Predador.TETO_LAVA_MS);
    clipe('besta-sede-abre', 'besta:sede-abre', Predador.SEDE_ABRE_MS, 0, [0, 1, 2, 3, 4, 5]);
    clipe('besta-sede-aberta', 'besta:sede-abre', Predador.SEDE_ABERTA_CICLO_MS, -1, [5, 6, 7, 8, 9, 10, 11, 12, 11, 10, 9, 8, 7, 6]);
    clipe('besta-sede-fecha', 'besta:sede-abre', Predador.SEDE_FECHA_MS, 0, [13, 14, 15, 16]);
    clipe('besta-sede-devolve', 'besta:sede-devolve', Predador.SEDE_DEVOLVE_MS);
    // step 6, the return along the walls (each leg plays them with its own duration)
    clipe('besta-escalada', 'besta:escalada', VOLTA.ESCALADA_MS, 0, [...VOLTA.ESCALADA_QUADROS]);
    clipe('besta-quina-parede-teto', 'besta:quina-parede-teto', VOLTA.QUINA_TETO_MS);
    clipe('besta-canto', 'besta:canto', VOLTA.CANTO_MS);
    clipe('besta-parede-descola', 'besta:parede-descola', VOLTA.DESCOLA_MS);
    // step 7, the drop from the ceiling: only the LET-GO of the grab (frames 4 → 0: off the ceiling to standing). The
    // whole grab backwards hangs for three quarters of its time and drops at the very end.
    clipe('besta-mergulho', 'besta:agarra', 380, 0, [4, 3, 2, 1, 0]);
    // step 8, the heart (coracao-a, its 16 frames split at the squeeze and the release)
    clipe('besta-coracao-aperta', 'besta:coracao', CORACAO.APERTA_MS, 0, [0, 1, 2, 3]);
    clipe('besta-coracao-parado', 'besta:coracao', CORACAO.PARADO_S * 1000, 0, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    clipe('besta-coracao-solta', 'besta:coracao', CORACAO.SOLTA_MS, 0, [13, 14, 15]);
  }

  /** 25/11: the measures of the frame on screen (`besta/quadros.ts`), by the texture (`besta:<clip>`) and frame. */
  private medidas(): { q: QuadrosClipe; i: number } | null {
    const k = this.sprite.texture.key;
    if (!k.startsWith('besta:')) return null;
    const q = QUADROS_BESTA[k.slice(6)];
    if (!q) return null;
    const i = Phaser.Math.Clamp(Number(this.sprite.frame.name) || 0, 0, q.n - 1);
    return { q, i };
  }

  /** The lava telegraph of a clip: the instant its (cut) painted ball would have left the claws. */
  private telegrafo(clipe: string, ms: number): number {
    const q = QUADROS_BESTA[clipe];
    return q?.solta ? (q.solta / q.n) * (ms / 1000) : 0.5;
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

  /**
   * Parada. On the floor she walks on the spot (andar5-a). Hanging there is no idle clip yet: the still pose of the
   * hand that holds (⚠️ 25/11, to show him — a hanging breath was never generated).
   */
  private idle(): void {
    if (this.ancora.lado === 'teto') this.estatico(this.mao === 1 ? 'besta:teto1' : 'besta:teto2');
    else this.tocar('besta-andar', 'besta:lado');
  }

  private yApoio(lado: 'chao' | 'teto'): number {
    const e = Predador.ESCALA_LUTA;
    return lado === 'chao' ? Predador.CHAO_APOIO - 124 * e : Predador.GARRA_CRAVA - Predador.GARRA_TETO_Y * e;
  }

  private corpo(r: Retangulo | Caixa): void {
    const [x0, y, w, h] = Array.isArray(r) ? r : [r.x, r.y, r.w, r.h];
    // 25/11 (step 6): the mirrored legs of the return — the table is measured facing left, the box mirrors in the frame
    const x = this.sprite.flipX ? 256 - x0 - w : x0;
    this.body.enable = true;
    this.body.setSize(w, h, false);
    this.body.setOffset(x, y);
  }

  /** Corpo = a CASCA: 25/11, the torso and the head of the frame on screen (absorbs the bullet, wounds on contact). */
  private corpoCasca(): void {
    this.modoCorpo = 'casca';
    this.body.enable = true;
    this.aplicarCorpo();
  }

  /** Corpo INTEIRO: bote, slash e salto são todo perigo. 25/11: the whole opaque frame but the tail, claws included. */
  private corpoInteiro(): void {
    this.modoCorpo = 'inteiro';
    this.body.enable = true;
    this.aplicarCorpo();
  }

  /** Every update: the body follows the art of the frame on screen (spec §6 — the claw that passed through the ship). */
  private aplicarCorpo(): void {
    if (!this.modoCorpo || !this.body.enable) return;
    const m = this.medidas();
    if (!m) return;
    this.corpo(this.modoCorpo === 'casca' ? m.q.massa[m.i] : m.q.inteiro[m.i]);
  }

  /**
   * 25/11 — HIT WHERE SHE IS DRAWN (him: *"os tiros estão pegando no ar"*; the slash that hit the empty corner): the
   * arcade body is only the broad phase. A world box (the ship, a shot) touches her where it falls on the DRAWN pixels
   * of the frame on screen, inside the body box of the mode (the shell = torso and head, whole = all but the tail).
   */
  tocaDesenho(x0: number, y0: number, x1: number, y1: number, nave = false): boolean {
    const b = this.body;
    if (!b.enable) return false;
    // 25/11, him: the ship that escaped the slash by passing BEHIND her was then hit by her leap to the ceiling — "um
    // dano gratuito". The trip between anchors (the 'salto' state) is not an attack: it never wounds the ship.
    if (nave && this.estado === 'salto') return false;
    const l = Math.max(x0, b.left), r = Math.min(x1, b.right), t = Math.max(y0, b.top), u = Math.min(y1, b.bottom);
    if (l >= r || t >= u) return false;
    const s = this.sprite;
    const m = mascaraDe(this.scene, s.texture.key, s.frame.name);
    if (!m) return true;
    const sx = Math.abs(s.scaleX) || 1, sy = Math.abs(s.scaleY) || 1;
    const ox = s.displayOriginX, oy = s.displayOriginY;
    // the frame is mirrored about its centre (the engine's convention, see `corpo`)
    const fx = (wx: number) => (s.flipX ? m.w - (ox + (wx - s.x) / sx) : ox + (wx - s.x) / sx);
    const a = fx(l), c = fx(r);
    return algumDesenhado(m, Math.min(a, c), oy + (t - s.y) / sy, Math.max(a, c), oy + (u - s.y) / sy);
  }

  /** The core (and its light) on the core of the frame on screen — on her chest in every pose (spec §6, the gallop). */
  private posicionarCore(): void {
    // the eyes in the dark: the core is the TRUE light (it can be shot — his call, 25/11), wherever it glides
    if (this.estado === 'olhos' && !this.olhosSaltando) {
      const v = this.luzesOlhos.find((o) => o.l.verdadeira);
      if (v) {
        this.core.setPosition(v.brilho.x, v.l.y);
        this.coreBody.reset(v.brilho.x, v.l.y);
        return;
      }
    }
    const m = this.medidas();
    const c = m?.q.core[m.i];
    const s = this.sprite.scaleX;
    const x = c ? this.sprite.x + (c[0] - 128) * s * (this.sprite.flipX ? -1 : 1) : this.sprite.x;
    const y = c ? this.sprite.y + (c[1] - 128) * s : this.sprite.y;
    this.core.setPosition(x, y);
    this.coreBody.reset(x, y);
    this.luz.setPosition(x, y);
  }

  /** The side pose's core, in screen px from the sprite centre (the aim of the slash, the warning light). */
  private get coreLado(): { x: number; y: number } {
    const c = QUADROS_BESTA.lado.core[0] ?? [128, 128];
    return { x: (c[0] - 128) * this.escala, y: (c[1] - 128) * this.escala };
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
    this.tocar('besta-urro', 'besta:frente');
    Som.tocar('predador.urro', { x: this.sprite.x });
    // O tranco no PICO do urro (a mandíbula aberta, as garras no alto).
    this.scene.time.delayedCall(Predador.URRO_MS * 0.45, () => {
      if (this.dead) return;
      this.scene.cameras.main.shake(380, 0.01);
    });

    this.scene.time.delayedCall(Predador.URRO_MS, () => {
      if (this.dead) return;
      this.tocar('besta-pulo', 'besta:frente');
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
            Som.tocar('predador.pouso', { x: this.sprite.x });
            this.scene.cameras.main.shake(160, 0.008);
          }
          if (v > 0 && !impulsionou) {
            impulsionou = true;
            this.scene.cameras.main.shake(90, 0.004);
          }
          const suave = Phaser.Math.Easing.Sine.InOut(v);
          this.setEscala(Phaser.Math.Linear(e0, e1, suave));
          let y = Phaser.Math.Linear(y0, y1, suave) - Math.sin(Math.PI * v) * Predador.PULO_ALTURA;
          // 25/11: the leap is painted in the clip; at the big surge scale its top would leave the screen — the engine
          // holds her under the ceiling line instead (she reaches it, never passes it).
          const m = this.medidas();
          if (m) {
            const topo = y + (m.q.inteiro[m.i][1] - 128) * this.sprite.scaleX;
            if (topo < Predador.TETO_APOIO - 10) y += Predador.TETO_APOIO - 10 - topo;
          }
          this.sprite.setPosition(Phaser.Math.Linear(x0, x1, suave), y);
        },
        () => {
          this.setEscala(e1);
          this.mover(x1, y1);
          // 25/11: she lands facing the ship (the front pose) and turns to her side before the fight starts.
          this.tocar('besta-vira', 'besta:lado');
          this.scene.time.delayedCall(Predador.VIRA_MS, () => {
            if (this.dead) return;
            this.idle();
            this.corpoCasca();
            this.coreBody.enable = true;
            this.armaTravada = false;
            this.mudar('chao', this.pausa());
          });
        },
      );
    });
  }

  // ─── A luta ──────────────────────────────────────────────────────────────────

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    this.nave = target;
    // the slash that hits: the ship was struck while it swung (`damageShip` stamps `golpeEm`)
    if (this.estado === 'slash' && !this.golpeAcertou && Number(target.getData('golpeEm') ?? -1) >= this.golpeDesde) {
      this.golpeAcertou = true;
      Som.calar('predador.golpe.erra');
      Som.tocar('predador.golpe.acerta', { x: this.sprite.x });
    }
    this.t += dt;
    this.estadoT -= dt;
    this.atualizarLavas(dt);
    this.atualizarLuz(dt);
    this.atualizarAnel(dt);
    this.atualizarOlhos(dt);
    this.atualizarBreu(target);
    // the slow wall's track comes back up when she lets go of the wall (or dies, or the return is cut short)
    if (this.musicaLentaAte && (this.dead || this.scene.time.now >= this.musicaLentaAte || this.estado !== 'volta')) {
      this.musicaLentaAte = 0;
      Music.lento(1, 900);
    }

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
      // phase 2: he roars (his E, sheet 5c round 2 — "E e D em outros momentos")
      Som.tocar('predador.urro2', { x: this.sprite.x });
    }

    switch (this.estado) {
      case 'surgindo':
      case 'salto':
      case 'slash':
      case 'entrada':
      case 'rasgo':
      case 'urroBreu':
      case 'volta':
      case 'olhos':
      case 'coracao':
        break;

      case 'chao':
      case 'teto':
        if (this.estadoT <= 0) this.escolherAtaque();
        break;

      case 'carga':
        // No fim da carga ele CAI DE QUATRO — o último aviso antes do galope.
        if (!this.caiuDeQuatro && this.estadoT <= Predador.QUATRO_MS / 1000) {
          this.caiuDeQuatro = true;
          this.tocar('besta-quatro', 'besta:quatro-pose');
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
        if (this.sprite.x <= Math.max(Predador.PARADA_X, this.alvoX + 50) || this.estadoT <= 0) {
          this.body.setVelocity(0, 0);
          this.agachar(target);
        }
        break;

      case 'agacha':
        if (this.estadoT <= 0) this.golpear();
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
          const y = this.yApoio('chao');
          this.luz.setPosition(GAME_WIDTH - 14, y + this.coreLado.y);
          this.mudar('aviso', Predador.AVISO);
          Som.tocar('predador.aviso', { x: GAME_WIDTH - 14 });
        }
        break;

      case 'aviso':
        if (this.estadoT <= 0) this.reentrar();
        break;
    }

    if (this.estado !== 'fora' && this.estado !== 'aviso') {
      this.aplicarCorpo();
      this.posicionarCore();
    }
  }

  private pausa(): number {
    const [a, b] = Predador.PAUSA[this.fase];
    return Phaser.Math.FloatBetween(a, b);
  }

  /**
   * 25/11 — THE FIXED ORDER (spec 2026-11-24 §3, his choice C): no more 50/50 draw. Each phase plays its order and
   * repeats it. The signatures that do not exist yet (the thirst = step 5, the eyes in the dark = step 7, the heart
   * stopping = step 8) are SKIPPED until their step lands — `ASSINATURAS_PRONTAS` says which exist. 'volta' is today's
   * return (out on the right → warning → gallop → rip) until step 6 rebuilds it along the walls.
   */
  static readonly ORDEM: Record<number, readonly Ataque[]> = {
    1: ['lava', 'golpe', 'sede', 'golpe'],
    2: ['golpe', 'lava', 'volta'],
    3: ['olhos', 'golpe', 'lava', 'olhos', 'coracao'],
  };
  static readonly ASSINATURAS_PRONTAS: ReadonlySet<Ataque> = new Set<Ataque>(['lava', 'golpe', 'sede', 'volta', 'olhos', 'coracao']);

  private proximoAtaque(): Ataque {
    const ordem = Predador.ORDEM[this.fase].filter((a) => Predador.ASSINATURAS_PRONTAS.has(a));
    if (this.ordemFase !== this.fase) {
      this.ordemFase = this.fase;
      this.ordemI = 0;
    }
    // the lock holds the life: the order pulls the missing signature next (as the Guardian's rotation does)
    const falta: Ataque | null = this.fase === 1 ? 'sede' : this.fase === 2 ? 'volta' : 'coracao';
    if (this.travada && falta && !this.vistas.has(falta)) return falta;
    const a = ordem[this.ordemI % ordem.length];
    this.ordemI++;
    return a;
  }

  private escolherAtaque(): void {
    const a = this.proximoAtaque();
    if (a === 'volta') {
      this.volta();
      return;
    }
    if (a === 'olhos') {
      this.olhos();
      return;
    }
    if (a === 'coracao') {
      this.coracao();
      return;
    }
    if (a === 'lava') {
      this.telegrafarLava();
      return;
    }
    // the thirst is planted on the floor: hanging, she lets go first and drinks where she lands
    if (a === 'sede') {
      if (this.ancora.lado === 'teto') {
        this.irPara(Predador.ANCORAS[0], () => {
          this.pousar(Predador.ANCORAS[0]);
          this.sede();
        });
      } else this.sede();
      return;
    }
    // the slash is a floor attack: hanging, she lets go first and charges where she lands
    if (this.ancora.lado === 'teto') {
      this.irPara(Predador.ANCORAS[0], () => {
        this.pousar(Predador.ANCORAS[0]);
        this.carregar();
      });
      return;
    }
    this.carregar();
  }

  private carregar(): void {
    const dur = Math.max(Predador.CARGA_MIN, Predador.CARGA[this.fase]);
    this.pulsoFase = 0;
    this.caiuDeQuatro = false;
    this.mudar('carga', dur);
    Som.tocar('predador.carga', { x: this.sprite.x });
  }

  /** O BOTE: galopa de quatro PELO CHÃO até a nave — o salto na altura dela é do golpe. */
  private bote(): void {
    this.tocar('besta-galope', 'besta:quatro-pose');
    this.corpoInteiro();
    const dx = Math.max(Predador.PARADA_X, this.alvoX + 50) - this.sprite.x;
    const t = Math.max(0.12, Math.abs(dx) / Predador.BOTE_VEL);
    this.body.setVelocity(dx / t, 0);
    this.mudar('bote', t + 0.1);
    this.galopar(true);
  }

  /** THE CROUCH: stopped on all fours, the leap's height taken now (see `AGACHA_S`). */
  private agachar(target: Phaser.Types.Math.Vector2Like): void {
    this.galopar(false);
    this.estatico('besta:quatro-pose');
    this.corpoInteiro();
    this.alvoY = target.y ?? this.alvoY;
    this.pulsoFase = 0;
    this.mudar('agacha', Predador.AGACHA_S);
    Som.tocar('besta.garras', { x: this.sprite.x });
  }

  /** O GOLPE: inclina, dois cortes, torce — e SALTA até a altura em que a nave estava, voltando ao chão. */
  private golpear(): void {
    this.mudar('slash');
    this.tocar('besta-golpe', 'besta:lado');
    this.galopar(false);
    this.golpeDesde = this.scene.time.now;
    this.golpeAcertou = false;
    Som.tocar('predador.golpe.erra', { x: this.sprite.x });
    this.corpoInteiro();
    this.scene.cameras.main.shake(110, 0.006);
    const x0 = this.sprite.x;
    const chao = this.yApoio('chao');
    // 25/11 (spec §3/§6): the jump is free up to the ceiling — the old floor of 70 left the top corner untouched.
    const alvo = Phaser.Math.Clamp(this.alvoY + Predador.SLASH_MIRA_DY - this.coreLado.y, Predador.TETO_APOIO, chao);
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

  /** 25/11: on the ceiling the FREE hand throws — the lava clip of the pose she hangs in (his idea, one per pose). */
  private get clipeLava(): string {
    return this.ancora.lado === 'teto' ? `teto-lava-${this.mao}` : 'lava';
  }

  private telegrafarLava(): void {
    const teto = this.ancora.lado === 'teto';
    const ms = teto ? Predador.TETO_LAVA_MS : Predador.LAVA_MS;
    this.tocar(`besta-${this.clipeLava}`, teto ? 'besta:teto1' : 'besta:lado');
    this.mudar('telegLava', this.telegrafo(this.clipeLava, ms));
    Som.tocar('predador.lava.carga', { x: this.sprite.x });
  }

  // ─── A sede (spec §4.1, step 5) ──────────────────────────────────────────────

  /**
   * THE THIRST: planted on the floor she turns to the ship, opens her chest and the core lights a RING. For
   * `SEDE.ABERTA_S` every player shot inside the ring is drunk (`beber`); then the chest closes and, at the jolt, each
   * one comes back along its own line, reversed, in the order it came in (`devolucao`). Then she turns back to her side
   * and recovers (the double-damage window, as after the lava).
   */
  private sede(): void {
    this.mudar('sede');
    this.body.setVelocity(0, 0);
    this.corpoCasca();
    this.bebidos = [];
    const vivo = () => !this.dead && this.estado === 'sede';
    const depois = (ms: number, f: () => void) => this.scene.time.delayedCall(ms, () => vivo() && f());
    this.tocar('besta-vira', 'besta:frente', true);
    depois(Predador.VIRA_MS, () => {
      this.tocar('besta-sede-abre', 'besta:frente');
      Som.tocar('besta.sede.abre', { x: this.sprite.x });
      depois(Predador.SEDE_ABRE_MS, () => {
        this.tocar('besta-sede-aberta', 'besta:frente');
        this.abrirAnel();
        depois(SEDE.ABERTA_S * 1000, () => {
          this.fecharAnel();
          this.tocar('besta-sede-fecha', 'besta:frente');
          depois(Predador.SEDE_FECHA_MS, () => {
            this.tocar('besta-sede-devolve', 'besta:frente');
            depois(Predador.SEDE_DEVOLVE_MS * Predador.SEDE_TRANCO, () => this.tranco());
            depois(Predador.SEDE_DEVOLVE_MS, () => {
              this.tocar('besta-vira', 'besta:lado');
              depois(Predador.VIRA_MS, () => {
                this.recuperando = true;
                this.idle();
                this.corpoCasca();
                this.mudar('recupera', Predador.RECUP_LAVA);
              });
            });
          });
        });
      });
    });
  }

  private abrirAnel(): void {
    this.anel ??= this.scene.add.image(0, 0, 'sedeAnel').setBlendMode(Phaser.BlendModes.ADD).setDepth(7.5);
    this.anel.setPosition(this.core.x, this.core.y).setVisible(true).setAlpha(1).setScale(0.25);
    this.scene.tweens.add({ targets: this.anel, scale: 1, duration: 150, ease: 'Back.Out' });
    this.sedeAberta = true;
    this.sedeDesde = this.scene.time.now;
    this.gole = 0;
  }

  private fecharAnel(): void {
    this.sedeAberta = false;
    const anel = this.anel;
    if (!anel) return;
    this.scene.tweens.killTweensOf(anel);
    this.scene.tweens.add({ targets: anel, scale: 0.3, alpha: 0, duration: 160, onComplete: () => anel.setVisible(false) });
  }

  /**
   * A player shot inside the open ring is DRUNK: it remembers where it entered and its heading (the line it came along)
   * and its colour. `true` = drunk (the scene releases it; no damage, no card effect — the missile included).
   */
  beber(bala: Phaser.Physics.Arcade.Sprite): boolean {
    // (the eyes: a shot on an ember is taken by it — visual only, see `brasaNoTiro`)
    if (this.brasaNoTiro(bala)) return true;
    if (!this.sedeAberta || this.dead) return false;
    // the shot's BOX against the ring (a long HMG shell touches the torso and the core while its centre is still out)
    const corpo = bala.body as Phaser.Physics.Arcade.Body;
    const px = Phaser.Math.Clamp(this.core.x, corpo.left, corpo.right);
    const py = Phaser.Math.Clamp(this.core.y, corpo.top, corpo.bottom);
    const dx = px - this.core.x;
    const dy = py - this.core.y;
    if (dx * dx + dy * dy > SEDE.RAIO * SEDE.RAIO) return false;
    const v = corpo.velocity;
    const n = Math.hypot(v.x, v.y);
    this.bebidos.push({
      x: bala.x,
      y: bala.y,
      dx: n > 1 ? v.x / n : 1,
      dy: n > 1 ? v.y / n : 0,
      t: (this.scene.time.now - this.sedeDesde) / 1000,
      cor: Predador.corDaBala(bala),
      forma: Number(bala.getData('forma') ?? 1),
    });
    this.gole = 1;
    Som.tocar('besta.sede.gole', { x: this.core.x });
    return true;
  }

  /** The colour of a player shot: its tint, or its glow family (warm, cyan, the homing's teal). */
  private static corDaBala(b: Phaser.Physics.Arcade.Sprite): number {
    if (b.isTinted && b.tintTopLeft !== 0xffffff) return b.tintTopLeft;
    const k = b.getData('glowKind') as string | null;
    return k === 'warm' ? 0xffa040 : k === 'cyan' ? 0x5ee8ff : 0x5ef2d8;
  }

  /** The core's colour now: her orange, turning to the mean colour of what the ring drank (full at `SEDE_COR_CHEIA`). */
  private corDoCore(): number {
    const n = this.bebidos.length;
    if (!n) return Predador.COR_CORE;
    let r = 0;
    let g = 0;
    let b = 0;
    for (const d of this.bebidos) {
      r += (d.cor >> 16) & 255;
      g += (d.cor >> 8) & 255;
      b += d.cor & 255;
    }
    const k = Math.min(1, n / Predador.SEDE_COR_CHEIA);
    const de = Phaser.Display.Color.IntegerToColor(Predador.COR_CORE);
    const mix = (a: number, m: number) => Math.round(a + (m / n - a) * k);
    return Phaser.Display.Color.GetColor(mix(de.red, r), mix(de.green, g), mix(de.blue, b));
  }

  /** THE JOLT: everything drunk comes back along its own line, reversed, on the squeezed clock (`devolucao`). */
  private tranco(): void {
    this.vistas.add('sede');
    const lista = devolucao(this.bebidos);
    this.bebidos = [];
    this.scene.cameras.main.shake(160, 0.008);
    Som.tocar('besta.sede.tranco', { x: this.sprite.x });
    for (const d of lista) {
      this.scene.time.delayedCall(d.t * 1000, () => {
        if (!this.dead) this.lancarLava(d.x, d.y, d.vx, d.vy, 'gota', d.cor, d.forma);
      });
    }
  }

  /** Each frame while drinking: the ring sits on the core, breathes, flashes on each gulp and takes the drink's colour. */
  private atualizarAnel(dt: number): void {
    if (!this.anel?.visible) return;
    this.anel.setPosition(this.core.x, this.core.y);
    if (!this.sedeAberta) return;
    this.gole = Math.max(0, this.gole - dt * 6);
    this.anel.setTint(this.corDoCore()).setAlpha(0.75 + 0.25 * Math.max(this.pulso, this.gole));
    if (!this.scene.tweens.isTweening(this.anel)) this.anel.setScale(1 + 0.12 * this.gole);
  }

  /** Bolas de lava em arco: tempo de voo fixo, velocidade resolvida para cair onde a nave está. */
  /**
   * 25/11 — THE LAVA ON FIXED POINTS (spec §3): no longer aimed. Three balls in an arc (the F4 gravity) fall on FIXED
   * floor points, the two figures alternating; each one splashes a column up and leaves a short pool. From the ceiling,
   * the same throw from above. The lava owns the floor and pushes the ship up — where the slash catches it.
   */
  static readonly LAVA_FIGURAS: readonly (readonly number[])[] = [
    [60, 130, 200],
    [95, 165, 235],
  ];
  static readonly POCA_S = 0.8;
  static readonly COLUNA_GOTAS = 4;
  /**
   * 25/11, him: *"antes (na besta antiga) ele jogava a lava em direção da nave, agora ele solta no chão… ele pode
   * intercalar em atirar na direção do jogador, sem respingar no chão"*. Every other throw is AIMED: three balls in
   * arcs that all reach the point where the ship is at the release, one after the other (the flights below, s) — the
   * one who leaves that point in time is spared; on the floor they just go out (no column, no pool).
   */
  static readonly LAVA_MIRADA_VOOS = [0.75, 0.92, 1.09];

  private arremessar(_target: Phaser.Physics.Arcade.Sprite): void {
    const e = this.escala;
    // one throw sound per volley (sheet 5c)
    Som.tocar('predador.lava.arremesso', { x: this.sprite.x });
    // A mão que solta a bola, em px virtuais, medida em cada clipe (`scripts/_f4/_medir-mao.mjs`).
    //  · PENDURADO (`teto-lava-f`, rodada 6): −115,+7. O telégrafo de 0,68s num clipe de 1100ms cai no quadro 10,5,
    //    e a garra ali está um pouco mais acima — este número é o que ele JOGOU e aprovou, com a bola saindo da mão.
    //  · NO CHÃO (`lava-core-c`, rodada 7): −83,+5, o quadro 13. O velho −70,−40 era do clipe v3, que arremessava
    //    por cima do ombro; este sai do PEITO, que é de onde ele agora tira a lava.
    //  · 25/11, the new art: the front claws of the release frame of each clip (`boca` in `besta/quadros.ts`).
    const boca = QUADROS_BESTA[this.clipeLava]?.boca ?? [45, 140];
    const bocaX = this.sprite.x + (boca[0] - 128) * e;
    const bocaY = this.sprite.y + (boca[1] - 128) * e;
    // every other throw: aimed at the ship (see LAVA_MIRADA_VOOS)
    if (this.lavaN++ % 2 === 1 && _target) {
      const ax = _target.x;
      const ay = Math.min(_target.y, Predador.CHAO_APOIO - 8);
      for (const T of Predador.LAVA_MIRADA_VOOS) {
        const vx = (ax - bocaX) / T;
        const vy = (ay - bocaY - 0.5 * Predador.LAVA_G * T * T) / T;
        this.lancarLava(bocaX, bocaY, vx, vy, 'bola');
        this.lavas.at(-1)?.b.setData('seca', true);
      }
      this.brasas.explode(10, bocaX, bocaY);
      this.scene.cameras.main.shake(70, 0.004);
      return;
    }
    const figura = Predador.LAVA_FIGURAS[this.figuraLava++ % Predador.LAVA_FIGURAS.length];
    const ay = Predador.CHAO_APOIO - 2;
    figura.forEach((ax) => {
      // the nearer ball lands first: the flight grows with the distance, so the three read as one sweep
      const T = Predador.LAVA_VOO * (0.7 + (0.35 * Math.abs(ax - bocaX)) / GAME_WIDTH);
      const vx = (ax - bocaX) / T;
      const vy = (ay - bocaY - 0.5 * Predador.LAVA_G * T * T) / T;
      this.lancarLava(bocaX, bocaY, vx, vy, 'bola');
    });
    this.brasas.explode(10, bocaX, bocaY);
    this.scene.cameras.main.shake(70, 0.004);
  }

  /**
   * UMA GOTA DE LAVA — com cor de LAVA (pedido dele, 16/09: *"a lava tem que ter cor de lava"*) e que BRILHA
   * no breu (*"lava é fogo, então brilha no escuro"*): a bola (núcleo branco-amarelo → laranja → vermelho),
   * uma luz ADD que tremula por cima dela e um rastro de brasas. Tudo acima da camada do breu.
   */
  private lancarLava(x: number, y: number, vx: number, vy: number, tipo: TipoLava, cor?: number, forma = 1): void {
    const b = this.enemies.enemyBullets.get(x, y) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;
    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    b.setTexture(tipo === 'bola' ? 'lavaBola' : tipo === 'gota' || tipo === 'respingo' ? 'lavaGota' : tipo === 'poca' ? 'lavaPoca' : 'metalBrasa');
    b.clearTint().setAlpha(1);
    // (25/11, his note on the thirst: the returned drop "pode ser menor um pouco" — 8 px → 6 px)
    b.setScale(cor !== undefined ? Predador.SEDE_GOTA_ESCALA : 1);
    // 25/11 (his idea, "pode ser até visualmente apenas"): the thirst gives back the SHAPE of the shot — one bead for the
    // single shot, a pair for the Duplo, a triangle of three for the Triplo. Visual only: the hit is the same 6 px.
    if (cor !== undefined) {
      if (forma >= 2) b.setTexture(forma >= 3 ? 'sedeGota3' : 'sedeGota2').setScale(1);
      (b.body as Phaser.Physics.Arcade.Body).setSize(6 / b.scaleX, 6 / b.scaleY, true);
    }
    b.setFlipX(false);
    b.setDepth(41);
    b.setData('ox', x);
    b.setData('oy', y);
    b.setData('lava', true);
    b.setData('seca', false);
    b.setData('apagada', false);
    b.setData('celula', null);
    b.setData('parede', false);
    b.setData('gelo', null);
    b.setVelocity(vx, vy);
    b.setRotation(Math.atan2(vy, vx));
    const luz = this.scene.add
      .image(x, y, 'luzRadial')
      .setBlendMode(Phaser.BlendModes.ADD)
      // (the thirst's returned shot keeps the light of the weapon it was drunk from)
      .setTint(cor ?? (tipo === 'metal' ? 0xffb040 : 0xff6a18))
      .setScale(cor !== undefined ? 0.3 : tipo === 'bola' ? 0.62 : tipo === 'metal' ? 0.46 : tipo === 'poca' ? 0.5 : 0.34)
      .setDepth(40);
    if (tipo === 'poca') b.setRotation(0);
    const id = ++this.lavaId;
    b.setData('lavaId', id);
    this.lavas.push({ b, luz, tipo, fim: tipo === 'poca' ? this.scene.time.now + Predador.POCA_S * 1000 : undefined, id });
  }

  /** A gravidade da lava é DAQUI, não do pool (o `enemyBullets` é compartilhado com a fase inteira). */
  private atualizarLavas(dt: number): void {
    this.lavas = this.lavas.filter((l) => {
      if (l.b.active && l.b.getData('lava') === true && l.b.getData('lavaId') === l.id) return true;
      l.luz.destroy();
      return false;
    });
    // THE HEART STOPS: every drop, shard and pool stays where it is (its light too) until the heart beats again
    if (this.congelado) {
      for (const l of this.lavas) {
        const body = l.b.body as Phaser.Physics.Arcade.Body;
        if (!l.b.getData('gelo')) {
          l.b.setData('gelo', { x: body.velocity.x, y: body.velocity.y });
          body.setVelocity(0, 0);
        }
      }
      return;
    }
    for (const l of this.lavas) {
      const { b, luz, tipo } = l;
      // (a sprite released earlier in this same pass may already belong to a newer entry)
      if (!b.active || b.getData('lavaId') !== l.id) continue;
      const bola = tipo === 'bola';
      const body = b.body as Phaser.Physics.Arcade.Body;
      if (tipo === 'poca') {
        // the pool: still on the floor, it flickers and dries (a hazard by contact, like every lava)
        luz.setPosition(b.x, b.y).setAlpha(0.4 + Math.random() * 0.3);
        if (Math.random() < 0.25) this.brasas.emitParticleAt(b.x + Phaser.Math.Between(-7, 7), b.y - 2);
        if (this.scene.time.now >= (l.fim ?? 0)) {
          b.setData('lava', false);
          this.enemies.release(b);
        }
        continue;
      }
      if (b.getData('parede') === true) {
        // step 11, the slow wall: no gravity (her slowed heart holds the slab); every shard pulses with that heart
        const p = Math.pow(Math.max(0, Math.sin((this.scene.time.now / 1000) * ((Math.PI * 2) / PAREDE.PULSO_S))), 3);
        luz.setPosition(b.x, b.y).setAlpha(0.3 + 0.55 * p).setScale(0.34 + 0.14 * p);
        if (Math.random() < 0.06) this.brasas.emitParticleAt(b.x, b.y);
        if (b.x < -12) {
          b.setData('lava', false);
          this.enemies.release(b);
        }
        continue;
      }
      if (tipo !== 'gota') body.velocity.y += Predador.LAVA_G * dt;
      b.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
      luz.setPosition(b.x, b.y).setAlpha(0.65 + Math.random() * 0.35);
      if (Math.random() < (tipo === 'gota' ? 0.35 : 0.8)) this.brasas.emitParticleAt(b.x, b.y);

      // 25/11: the ball and its splash land on the DRAWN floor edge (where the pool lies); the rest keeps the old line
      const linhaChao = bola || tipo === 'respingo' ? Predador.CHAO_APOIO - 2 : GROUND_Y - 4;
      const bateuChao = b.y >= linhaChao && body.velocity.y > 0;
      const bateuTeto = b.y <= TETO_Y + 4 && body.velocity.y < 0;
      if (!bateuChao && !bateuTeto) continue;
      const x = b.x;
      const y = b.y;
      b.setData('lava', false);
      this.enemies.release(b);
      const miudo = tipo === 'gota' || tipo === 'respingo';
      const seca = b.getData('seca') === true;
      this.brasas.explode(miudo ? 4 : tipo === 'metal' ? 8 : seca ? 6 : 14, x, y);
      // the lava landing (sheet 5c). 25/11, him: *"o som dela quicando fica muito alto, quero o som apenas quando ela
      // bate no chão a primeira vez"* — the splash drops land SILENT; the aimed ball (no splash) only hisses out, low.
      // 26/11: the heart's field (30 shards) and the rip's metal land in a burst — one soft knock per 120 ms, not 15
      // full ones in a second
      const agora = this.scene.time.now;
      if (tipo === 'metal' && agora - this.metalSoouEm < 120) {
        /* heard already */
      } else if (tipo !== 'respingo') {
        if (tipo === 'metal') this.metalSoouEm = agora;
        Som.tocar('predador.lava.impacto', { x, forca: miudo ? 0.45 : seca ? 0.35 : tipo === 'metal' && b.getData('celula') ? 0.45 : 1 });
      }
      if (bola && bateuChao && !seca) this.respingar(x, y);
    }
  }

  /**
   * 25/11 (spec §3): a ball that lands SPLASHES a narrow column straight up (drops with gravity, ~70 px) and leaves a
   * short pool where it fell. Every phase (the old phase-3 shatter fan is gone: the fixed points are the figure now).
   */
  private respingar(x: number, y: number): void {
    Som.tocar('predador.lava.estilhaco', { x });
    for (let i = 0; i < Predador.COLUNA_GOTAS; i++) {
      const ang = Phaser.Math.DegToRad(-90 + (i - (Predador.COLUNA_GOTAS - 1) / 2) * 7);
      const v = Phaser.Math.Between(150, 195);
      this.lancarLava(x, y - 6, Math.cos(ang) * v, Math.sin(ang) * v, 'respingo');
    }
    this.lancarLava(x, Predador.CHAO_APOIO - 2, 0, 0, 'poca');
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
    // 25/11, the thirst's returned shot in the shape of the player's: two beads (Duplo) and three in a triangle (Triplo),
    // ~5 px each, across the flight (the sprite turns to its heading, +x forward)
    const contas = (key: string, w: number, h: number, centros: [number, number][], r: number) => {
      if (this.scene.textures.exists(key)) return;
      const tex = this.scene.textures.createCanvas(key, w, h);
      if (!tex) return;
      const ctx = tex.getContext();
      for (const [cx, cy] of centros) {
        const g = ctx.createRadialGradient(cx - 0.6, cy - 0.6, 0, cx, cy, r);
        g.addColorStop(0, '#fff8d0');
        g.addColorStop(0.3, '#ffd23a');
        g.addColorStop(0.62, '#ff7a10');
        g.addColorStop(0.88, '#c01e08');
        g.addColorStop(1, 'rgba(90,8,2,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      tex.refresh();
    };
    contas('sedeGota2', 6, 11, [[3, 2.75], [3, 8.25]], 2.75);
    contas('sedeGota3', 10, 11, [[7.25, 5.5], [2.75, 2.75], [2.75, 8.25]], 2.75);
    // 25/11, THE THIRST: the ring, baked in pixels (radius `SEDE.RAIO`, 2 px, a hot core line and a soft outer one);
    // white, tinted in the engine with the colour of what it drinks
    if (!this.scene.textures.exists('sedeAnel')) {
      const R = SEDE.RAIO;
      const L = 2 * (R + 3) + 1;
      const tex = this.scene.textures.createCanvas('sedeAnel', L, L);
      if (tex) {
        const ctx = tex.getContext();
        const img = ctx.createImageData(L, L);
        const c = R + 3;
        for (let y = 0; y < L; y++)
          for (let x = 0; x < L; x++) {
            const d = Math.abs(Math.hypot(x - c, y - c) - R);
            const a = d < 0.75 ? 255 : d < 1.4 ? 170 : d < 2.2 ? 60 : 0;
            if (!a) continue;
            const i = (y * L + x) * 4;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
            img.data[i + 3] = a;
          }
        ctx.putImageData(img, 0, 0);
        tex.refresh();
      }
    }
    // 25/11, step 7: the eyes in the dark — two hot slits, 2×1 px with a 3 px gap, under each light
    if (!this.scene.textures.exists('olhosBesta')) {
      const tex = this.scene.textures.createCanvas('olhosBesta', 7, 2);
      if (tex) {
        const ctx = tex.getContext();
        // (26/11: white, tinted per light — hers red on her beat, the embers yellow on theirs)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 2, 1);
        ctx.fillRect(5, 0, 2, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillRect(0, 1, 2, 1);
        ctx.fillRect(5, 1, 2, 1);
        tex.refresh();
      }
    }
    // 25/11: the pool a landed ball leaves (flat, the lava colours, soft edges)
    if (!this.scene.textures.exists('lavaPoca')) {
      const tex = this.scene.textures.createCanvas('lavaPoca', 20, 5);
      if (tex) {
        const ctx = tex.getContext();
        const g = ctx.createRadialGradient(10, 3, 0, 10, 3, 10);
        g.addColorStop(0, '#ffe27a');
        g.addColorStop(0.4, '#ff8a18');
        g.addColorStop(0.8, '#b41c06');
        g.addColorStop(1, 'rgba(90,8,2,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(10, 3, 10, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        tex.refresh();
      }
    }
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
    // 26/11 (the shot ember): sparks thrown up, falling under the room's weight (the lava falls here too) and gone where
    // they reach the floor's drawn edge, with a last glint on the lava
    this.faiscas = this.scene.add
      .particles(0, 0, 'puff', {
        lifespan: 3200,
        speed: { min: 25, max: 80 },
        angle: { min: 195, max: 345 },
        gravityY: 260,
        scale: { start: 0.5, end: 0.3 },
        alpha: { start: 1, end: 0.55 },
        tint: [0xfff0a0, 0xffc040, 0xff8a20],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
        deathZone: { type: 'onEnter', source: new Phaser.Geom.Rectangle(-50, Predador.CHAO_APOIO, GAME_WIDTH + 100, 200) },
      })
      .setDepth(40);
    this.faiscas.on(Phaser.GameObjects.Particles.Events.DEATH_ZONE, (_e: unknown, pt: Phaser.GameObjects.Particles.Particle) => {
      if (Math.random() < 0.5) this.brasas.emitParticleAt(pt.x, Predador.CHAO_APOIO);
    });
  }

  // ─── A ronda ─────────────────────────────────────────────────────────────────

  /** After the heart: no trip to another anchor (see `coracao`). */
  private ficaNoLugar = false;

  private depoisDoAtaque(): void {
    if (this.ficaNoLugar) {
      this.ficaNoLugar = false;
      this.pousar(this.ancora);
      return;
    }
    const noLugar = Math.abs(this.sprite.x - this.ancora.x) < 6 && Math.abs(this.sprite.y - this.yApoio(this.ancora.lado)) < 6;
    if (this.fase >= 2) {
      // 25/11: leaving on the right is no longer a draw — it is the 'volta' slot of the fixed order
      const r = Math.random();
      if (r < 0.66 || !noLugar) {
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
      // 25/11: teto-1 (side → hanging by hand 1); the rise is mostly painted in the clip, the engine carries the rest
      this.mao = 1;
      this.tocar('besta-agarra', 'besta:teto1');
      this.corpoInteiro();
      this.animarAte(
        Predador.SALTO_TETO_MS,
        (k) => {
          this.pose = k < 0.6 ? 'luta' : 'teto';
          this.mover(Phaser.Math.Linear(x0, x1, k), Phaser.Math.Linear(y0, y1, k));
        },
        () => {
          this.scene.cameras.main.shake(90, 0.004);
          Som.tocar('predador.agarra', { x: x1 });
          chegar();
        },
        'Sine.easeInOut',
      );
      return;
    }
    if (de === 'teto' && ancora.lado === 'chao') {
      const soltar = () => {
        const sx = this.sprite.x;
        const sy = this.sprite.y;
        this.tocar('besta-agarra', 'besta:lado', true);
        this.corpoInteiro();
        this.animarAte(
          Predador.SALTO_TETO_MS,
          (k) => {
            this.pose = k < 0.4 ? 'teto' : 'luta';
            this.mover(Phaser.Math.Linear(sx, x1, k), Phaser.Math.Linear(sy, y1, k));
          },
          () => {
            this.scene.cameras.main.shake(140, 0.006);
            Som.tocar('predador.pouso', { x: x1 });
            chegar();
          },
          'Quad.easeIn',
        );
      };
      // 25/11: letting go is the grab played backwards, which starts on hand 1 — hanging by hand 2, she first swaps
      // hands once toward where she will land
      if (this.mao === 2) {
        const esquerda = x1 < x0;
        const p = Math.abs(QUADROS_BESTA[esquerda ? 'teto-anda-b' : 'teto-anda-a']?.passo ?? 56) * this.escala;
        this.corpoInteiro();
        this.andarNoTeto(x0 + (esquerda ? -p : p), y0, soltar);
      } else soltar();
      return;
    }
    if (de === 'teto') {
      this.corpoInteiro();
      this.andarNoTeto(x1, y1, chegar);
      return;
    }
    if (x1 < x0) {
      this.tocar('besta-galope', 'besta:quatro-pose');
      this.corpoInteiro();
      this.galopar(true);
      this.animarAte(
        Math.max(260, ((x0 - x1) / Predador.BOTE_VEL) * 1000),
        (k) => this.mover(Phaser.Math.Linear(x0, x1, k), y0 + (y1 - y0) * k),
        () => {
          this.galopar(false);
          chegar();
        },
      );
      return;
    }
    // Para trás (a direita), de frente para a nave: um salto recuando. 25/11: salto-tras-a, the leap painted in the clip
    // (the old pose + sine hop is gone — spec §4, the round that slid).
    this.tocar('besta-salto-tras', 'besta:lado');
    this.corpoInteiro();
    const altura = this.scene.anims.exists('besta-salto-tras') ? 0 : Math.abs(y1 - y0) < 20 ? 46 : 18;
    this.animarAte(
      Predador.SALTO_MS,
      (k) => this.mover(Phaser.Math.Linear(x0, x1, k), Phaser.Math.Linear(y0, y1, k) - Math.sin(Math.PI * k) * altura),
      () => {
        this.scene.cameras.main.shake(90, 0.004);
        Som.tocar('predador.pouso', { x: x1, forca: 0.8 });
        chegar();
      },
      'Sine.easeInOut',
    );
  }

  /**
   * 25/11 — THE CEILING WALK (his idea): hand over hand, teto-1 ↔ teto-2. Each swap clip carries the body `passo` px of
   * the frame (−48 for 1→2, −64 for 2→1) while the claw that holds stays put; at the end of the clip the engine moves
   * the sprite by that step and shows the still pose of the new hand, so nothing slides. To the RIGHT the same swaps
   * play BACKWARDS (the sprite is moved first, then the clip walks back onto the hand). A remainder smaller than half a
   * step is eased in the last swap.
   */
  private andarNoTeto(x1: number, y1: number, chegar: () => void): void {
    const passo = () => {
      if (this.dead) return;
      const dx = x1 - this.sprite.x;
      const esquerda = dx < 0;
      // to the left, the clip of the hand she holds by; to the right, the clip that ENDS on that hand, backwards
      const clipe = esquerda ? (this.mao === 1 ? 'teto-anda-a' : 'teto-anda-b') : this.mao === 1 ? 'teto-anda-b' : 'teto-anda-a';
      const p = Math.abs(QUADROS_BESTA[clipe]?.passo ?? 56) * this.escala;
      if (Math.abs(dx) < p * 0.5) {
        // the rest is less than half a swap: finish on the spot
        this.animarAte(Math.max(80, Math.abs(dx) * 8), (k) => this.mover(this.sprite.x + (x1 - this.sprite.x) * k, Phaser.Math.Linear(this.sprite.y, y1, k)), chegar);
        return;
      }
      const x0 = this.sprite.x;
      const y0 = this.sprite.y;
      const xf = esquerda ? x0 - p : x0 + p;
      if (!esquerda) this.mover(xf, y0);
      this.tocar(`besta-${clipe}`, this.mao === 1 ? 'besta:teto2' : 'besta:teto1', !esquerda);
      this.animarAte(
        Predador.TROCA_MAO_MS,
        (k) => this.mover(esquerda ? x0 : xf, Phaser.Math.Linear(y0, y1, k)),
        () => {
          this.mao = this.mao === 1 ? 2 : 1;
          this.mover(xf, this.sprite.y);
          this.estatico(this.mao === 1 ? 'besta:teto1' : 'besta:teto2');
          passo();
        },
      );
    };
    passo();
  }

  /**
   * 25/11 — THE RETURN (spec §4.2, step 6), half a loop IN FRONT of the ship, legs from `rotaDaVolta`: up onto the
   * ceiling → hand over hand to the right → the top-right corner → down the right wall → off the wall to the floor, a
   * corner strike at CD and BD; it ends in today's rip in the middle. Hanging, she lets go first. (His call, 25/11: the
   * left wall is out — behind the ship, "a nave não vira o nariz para trás".)
   */
  private volta(): void {
    const arena: Arena = {
      escala: this.escala,
      largura: GAME_WIDTH,
      chaoApoio: Predador.CHAO_APOIO,
      garraCrava: Predador.GARRA_CRAVA,
      garraTetoY: Predador.GARRA_TETO_Y,
      rasgoX: Predador.RASGO_X,
      galopeVel: Predador.BOTE_VEL,
      agarraMs: Predador.SALTO_TETO_MS,
      passoA: Math.abs(QUADROS_BESTA['teto-anda-a']?.passo ?? 48),
      passoB: Math.abs(QUADROS_BESTA['teto-anda-b']?.passo ?? 64),
    };
    const teto = this.ancora.lado === 'teto';
    const fimTeto = teto ? fimDoTeto(this.sprite.x, this.mao, arena) : VOLTA.TETO_FIM_X;
    // step 11: she holds on the wall from the end of the strike until the slab's last column has crossed the ship's side
    const espera = Math.max(0, seguraParede() * 1000 - VOLTA.CANTO_MS * (1 - Predador.PAREDE_SOLTA));
    const rota = rotaDaVolta(this.sprite.x, arena, fimTeto, espera);
    this.body.setVelocity(0, 0);
    // already hanging: she walks along the ceiling, whole swaps, to hand 1 nearest the corner anchor (`fimDoTeto`) and
    // joins the route at the corner
    let i = 0;
    if (teto) {
      const canto = rota.findIndex((t) => t.nome === 'quina CD');
      const yTeto = rota[canto - 1].ate.y;
      this.mudar('salto');
      this.corpoInteiro();
      this.andarNoTeto(fimTeto, yTeto, () => {
        if (this.dead) return;
        if (this.mao !== 1) {
          // (off the anchors: let go and start from the floor)
          this.irPara(Predador.ANCORAS[0], () => {
            this.pousar(Predador.ANCORAS[0]);
            this.volta();
          });
          return;
        }
        this.ancora = { x: fimTeto, lado: 'teto' };
        i = canto;
        this.mudar('volta');
        Som.tocar('predador.urro3', { x: this.sprite.x });
        proximo();
      });
    }
    const proximo = (): void => {
      if (this.dead || this.estado !== 'volta') return;
      const t = rota[i++];
      if (!t) {
        this.trechoAtual = null;
        this.sprite.setFlipX(false);
        this.coreBody.enable = true;
        this.ancora = { x: Predador.RASGO_X, lado: 'chao' };
        this.rasgar();
        return;
      }
      this.trecho(t, proximo);
    };
    if (!teto) {
      this.mudar('volta');
      this.corpoInteiro();
      Som.tocar('predador.urro3', { x: this.sprite.x });
      proximo();
    }
  }

  /** One leg of the return: its clip (mirrored / backwards when it asks), the sprite carried from `de` to `ate`. */
  /** The slab leaves her claws at this fraction of the `canto` strike (the swipe's widest frame, 5 of 17). */
  static readonly PAREDE_SOLTA = 5 / 17;
  private paredeN = Phaser.Math.Between(0, 2);
  /** The track's speed while the slab crosses (a tape slowed: 0.6 = a minor sixth-ish lower, clearly dragging). */
  static readonly PAREDE_TRILHA_TAXA = 0.6;
  private musicaLentaAte = 0;
  private musicaLentaGuarda = false;

  /**
   * STEP 11 — THE SLOW WALL: the slab comes out of her, column after column, at X0, and slides left at PAREDE.VEL with
   * the corridor of one of the fixed figures. Her heart slows: a heavy beat every PULSO_S while it crosses.
   */
  private lancarParede(): void {
    const fig = figuraDaParede(this.paredeN++);
    Som.tocar('predador.lava.arremesso', { x: this.sprite.x });
    // 26/11, him: *"quero que aconteça algum evento para indicar que ela está em slow motion, como a música ficar lenta"*
    // — the track slows like a tape (speed and pitch) while the slab crosses, and comes back up as she lets go
    Music.lento(Predador.PAREDE_TRILHA_TAXA, 900);
    this.musicaLentaAte = this.scene.time.now + seguraParede() * 1000;
    if (!this.musicaLentaGuarda) {
      this.musicaLentaGuarda = true;
      this.scene.events.once('shutdown', () => Music.lento(1, 0));
    }
    this.scene.cameras.main.shake(120, 0.005);
    fig.vaos.forEach((vao, i) => {
      this.scene.time.delayedCall(nascimento(i) * 1000, () => {
        if (this.dead) return;
        for (const y of pecasDaColuna(vao)) {
          this.lancarLava(PAREDE.X0, y, -PAREDE.VEL, 0, 'metal');
          const b = this.lavas.at(-1)?.b;
          if (!b) continue;
          b.setData('parede', true);
          (b.body as Phaser.Physics.Arcade.Body).setSize(PAREDE.CAIXA[0], PAREDE.CAIXA[1], true);
          b.setRotation(Math.PI);
        }
        this.brasas.explode(6, PAREDE.X0, vao);
        Som.tocar('predador.lava.carga', { x: PAREDE.X0, forca: 0.5 });
      });
    });
    // the slowed heart, heard
    const batidas = Math.ceil((nascimento(PAREDE.COLUNAS - 1) + (PAREDE.X0 + 12) / PAREDE.VEL) / PAREDE.PULSO_S);
    this.scene.time.addEvent({
      delay: PAREDE.PULSO_S * 1000,
      repeat: batidas - 1,
      callback: () => !this.dead && Som.tocar('besta.coracao.batida', { x: GAME_WIDTH * 0.6, forca: 0.85 }),
    });
  }

  private trecho(t: Trecho, fim: () => void): void {
    this.trechoAtual = t;
    if (t.nome === 'quina CD' || t.nome === 'descida') Som.tocar('besta.garras', { x: this.sprite.x });
    this.sprite.setFlipX(t.espelho);
    this.coreBody.enable = t.exposta;
    this.pose = t.borda === 'teto' && !t.nome.startsWith('quina') ? 'teto' : 'luta';
    const galope = t.clipe === 'galope';
    this.galopar(galope);
    const key = `besta-${t.clipe}`;
    const tocar = () => {
      if (t.parado || !this.scene.anims.exists(key)) {
        this.sprite.anims.stop();
        this.sprite.setTexture(`besta:${t.clipe}`);
      } else if (galope) this.sprite.play(key, true);
      else if (t.reverso) this.sprite.playReverse({ key, duration: t.ms });
      else this.sprite.play({ key, duration: t.ms });
      this.aplicarQuadro(key);
      // the box and the core of the NEW frame at once: the physics steps before the next update, and a leg that jumps
      // the sprite (the frames sit differently in each clip) would wound one step with the old box at the new place
      this.aplicarCorpo();
      this.posicionarCore();
    };
    const andar = () => {
      if (t.mov === 'inicio') this.mover(t.ate.x, t.ate.y);
      this.animarAte(
        t.ms,
        (k) => {
          if (t.mov === 'linear') this.mover(Phaser.Math.Linear(t.de.x, t.ate.x, k), Phaser.Math.Linear(t.de.y, t.ate.y, k));
          else if (t.mov === 'queda') this.mover(Phaser.Math.Linear(t.de.x, t.ate.x, k), Phaser.Math.Linear(t.de.y, t.ate.y, k * k));
        },
        () => {
          this.mover(t.ate.x, t.ate.y);
          if (t.mao) this.mao = t.mao;
          if (t.borda === 'teto' && t.nome.startsWith('troca')) Som.tocar('besta.garras', { x: this.sprite.x });
          if (t.clipe === 'agarra') {
            this.scene.cameras.main.shake(90, 0.004);
            Som.tocar('predador.agarra', { x: this.sprite.x });
          }
          fim();
        },
      );
    };
    this.mover(t.mov === 'inicio' ? t.ate.x : t.de.x, t.mov === 'inicio' ? t.ate.y : t.de.y);
    // step 11: after the slab's strike she HOLDS on the wall (core lit, shootable through the slab) while it crosses
    if (t.espera) {
      const seguir = fim;
      fim = () =>
        this.scene.time.delayedCall(t.espera ?? 0, () => {
          if (!this.dead && this.estado === 'volta') seguir();
        });
    }
    if (t.parede) this.scene.time.delayedCall((t.segura ?? 0) + t.ms * Predador.PAREDE_SOLTA, () => !this.dead && this.estado === 'volta' && this.lancarParede());
    if ((t.canto || t.parede) && t.segura) {
      // the corner: she holds on the wall pose, then strikes into the room (the claws wound frame by frame)
      this.sprite.anims.stop();
      this.sprite.setTexture(`besta:${t.clipe}`, 0);
      this.aplicarQuadro(key);
      this.aplicarCorpo();
      this.posicionarCore();
      this.scene.time.delayedCall(t.segura, () => {
        if (this.dead || this.estado !== 'volta') return;
        Som.tocar('predador.golpe.erra', { x: this.sprite.x });
        tocar();
        andar();
      });
      return;
    }
    tocar();
    andar();
  }

  // (25/11, step 6: today's exit on the right — `sair` → 'fora' → 'aviso' → `reentrar` — gave way to `volta`; the
  //  'fora'/'aviso' states and `reentrar` stay for the eyes in the dark, step 7, which also leaves the screen)

  /**
   * A VOLTA (17/09): galopa da borda direita até o meio da arena, PARA, e rasga o chão de baixo para cima — o metal
   * incandescente sobe em arco até a nave. Aviso (o core na borda) → galope → rasgo → recuperação.
   */
  private reentrar(): void {
    // 25/11 (step 7): after the eyes she comes back galloping from the right edge to her floor anchor (the warning
    // light at the edge came first). The rip belongs to the return now (step 6).
    this.sprite.setVisible(true);
    this.sprite.setFlipX(false);
    this.coreBody.enable = true;
    const y = this.yApoio('chao');
    const x0 = GAME_WIDTH + 90;
    const destino = Predador.ANCORAS[0];
    this.mover(x0, y);
    this.ancora = destino;
    this.mudar('entrada');
    this.tocar('besta-galope', 'besta:quatro-pose');
    this.corpoInteiro();
    this.galopar(true);
    this.animarAte(((x0 - destino.x) / Predador.BOTE_VEL) * 1000, (k) => this.mover(Phaser.Math.Linear(x0, destino.x, k), y), () => {
      this.galopar(false);
      this.pousar(destino);
    });
  }

  // ─── O coração para (spec §4.4, step 8) ──────────────────────────────────────

  /**
   * THE HEART STOPS: planted on the floor she throws the field (the lava clip: 18 shards in 3 arcs, one throw), turns to
   * the ship, drives her claws into her own core — and the heart stops: everything that flies freezes, hers and the
   * player's (the scene's part: `StageBoss.congelado`). Only the ship moves; the room is lit by the frozen embers. After
   * `CORACAO.PARADO_S` the claws let go in a burst and everything resumes together. Then her side pose and the recovery.
   */
  private coracao(): void {
    // always from the far floor anchor (x 300): from the near one (238) her body covered the pocket by the field (step 12)
    if (this.ancora.lado === 'teto' || Math.abs(this.sprite.x - Predador.ANCORAS[0].x) > 6) {
      this.irPara(Predador.ANCORAS[0], () => {
        this.pousar(Predador.ANCORAS[0]);
        this.coracao();
      });
      return;
    }
    this.mudar('coracao');
    this.body.setVelocity(0, 0);
    this.corpoCasca();
    const vivo = () => !this.dead && this.estado === 'coracao';
    const depois = (ms: number, f: () => void) => this.scene.time.delayedCall(ms, () => vivo() && f());
    // the throw: the field leaves at the lava clip's release frame, and reaches its figure at the instant of the squeeze
    const solta = this.telegrafo('lava', Predador.LAVA_MS) * 1000;
    const tf = (Predador.LAVA_MS - solta + Predador.VIRA_MS + CORACAO.APERTA_MS) / 1000;
    this.tocar('besta-lava', 'besta:lado');
    Som.tocar('predador.lava.carga', { x: this.sprite.x });
    depois(solta, () => this.lancarCampo(tf));
    depois(Predador.LAVA_MS, () => {
      this.tocar('besta-vira', 'besta:frente', true);
      depois(Predador.VIRA_MS, () => {
        this.tocar('besta-coracao-aperta', 'besta:frente');
        depois(CORACAO.APERTA_MS, () => {
          this.congelar();
          this.tocar('besta-coracao-parado', 'besta:frente');
          // the heart counts its way back (26/11): three beats with body, louder each, the lit shards flaring with them
          CORACAO.VOLTA_BATIDAS.forEach((antes, i) =>
            depois((CORACAO.PARADO_S - antes) * 1000, () => {
              Som.tocar('besta.coracao.batida', { x: this.core.x, forca: 0.6 + 0.2 * i });
              for (const l of this.lavas) {
                if (!l.b.active || !l.b.getData('celula') || l.b.getData('apagada')) continue;
                this.scene.tweens.add({ targets: l.luz, scale: { from: 0.3 + 0.12 * (i + 1), to: 0.3 }, alpha: { from: 1, to: 0.7 }, duration: 260 });
              }
            }),
          );
          depois(CORACAO.PARADO_S * 1000, () => {
            this.descongelar();
            this.tocar('besta-coracao-solta', 'besta:frente');
            depois(CORACAO.SOLTA_MS, () => {
              this.tocar('besta-vira', 'besta:lado');
              depois(Predador.VIRA_MS, () => {
                this.recuperando = true;
                this.idle();
                this.corpoCasca();
                // step 12: she stays at her anchor after the heart — leaping to the near one landed on the ship in the pocket
                this.ficaNoLugar = true;
                this.mudar('recupera', Predador.RECUP_LAVA);
              });
            });
          });
        });
      });
    });
  }

  /** The field: one throw from the lava clip's front claws, each shard timed to reach its place at the squeeze. */
  /** Step 12: this heart's put-out route (drawn among CORACAO.ROTAS at the throw), as cell keys "row,column". */
  private rotaApagada: Set<string> = new Set();
  /** The put-out shards' colour (dark cooled metal: no energy, no light — the dark sci-fi rule). */
  static readonly COR_APAGADA = 0x5c5f68;

  private lancarCampo(tf: number): void {
    const e = this.escala;
    this.rotaApagada = apagadas(Phaser.Math.Between(0, CORACAO.ROTAS.length - 1));
    const boca = QUADROS_BESTA.lava?.boca ?? [40, 140];
    const x0 = this.sprite.x + (boca[0] - 128) * e;
    const y0 = this.sprite.y + (boca[1] - 128) * e;
    Som.tocar('predador.lava.arremesso', { x: this.sprite.x });
    this.scene.cameras.main.shake(90, 0.005);
    for (const s of campo(x0, y0, tf, Predador.LAVA_G)) {
      this.lancarLava(x0, y0, s.vx, s.vy, 'metal');
      const b = this.lavas.at(-1)?.b;
      if (!b) continue;
      // it wounds by its lit core; and it remembers its place of the figure (the freeze puts it exactly there)
      (b.body as Phaser.Physics.Arcade.Body).setSize(CORACAO.CAIXA[0], CORACAO.CAIXA[1], true);
      // 26/11 (his: "até entender... o jogador já tomou o dano"): the throw only FORMS the field — it wounds from the freeze
      (b.body as Phaser.Physics.Arcade.Body).enable = false;
      b.setData('figura', { x: s.x, y: s.y, vx: s.vx, vy: s.vy + Predador.LAVA_G * tf });
      b.setData('celula', `${s.linha},${s.coluna}`);
    }
    this.brasas.explode(14, x0, y0);
  }

  private congelar(): void {
    // each field shard exactly at its place of the figure (the chained timers drift a frame or two — a few px in the
    // dark), with the velocity its arc has there; then everything freezes
    for (const l of this.lavas) {
      const f = l.b.getData('figura') as { x: number; y: number; vx: number; vy: number } | null;
      if (!f || !l.b.active) continue;
      l.b.setData('gelo', { x: f.vx, y: f.vy });
      l.b.setPosition(f.x, f.y);
      (l.b.body as Phaser.Physics.Arcade.Body).reset(f.x, f.y);
      l.b.setRotation(Math.atan2(f.vy, f.vx));
      l.luz.setPosition(f.x, f.y);
      l.b.setData('figura', null);
      const celula = l.b.getData('celula') as string;
      // STEP 12 (his): the shards of this heart's route go OUT — dark, cold, harmless — in a sweep from the left wall to
      // the pocket (26/11: all at once, the eye did not find the path in time)
      const i = [...this.rotaApagada].indexOf(celula);
      if (i >= 0) {
        l.b.setData('apagada', true);
        this.scene.time.delayedCall(i * CORACAO.APAGA_PASSO_MS, () => {
          if (!l.b.active || l.b.getData('celula') !== celula) return;
          this.apagar(l, f.x, f.y);
          this.limparRastroDaRota();
          Som.tocar('predador.lava.estilhaco', { x: f.x, forca: 0.18 });
        });
        continue;
      }
      // 26/11: never formed ON the ship — a lit shard by its hull goes out too
      const nb = this.nave?.body as Phaser.Physics.Arcade.Body | undefined;
      const m = CORACAO.POUPA_NAVE;
      if (nb && f.x + CORACAO.CAIXA[0] / 2 > nb.left - m && f.x - CORACAO.CAIXA[0] / 2 < nb.right + m && f.y + CORACAO.CAIXA[1] / 2 > nb.top - m && f.y - CORACAO.CAIXA[1] / 2 < nb.bottom + m) {
        this.apagar(l, f.x, f.y);
        continue;
      }
      // the lit ones wound from now on; their glow small and steady (the frozen field must read as it wounds)
      (l.b.body as Phaser.Physics.Arcade.Body).enable = true;
      l.luz.setScale(0.3).setAlpha(0.7);
    }
    // the frozen ember trails of the whole field go (they drew the field far bigger than it wounds)
    this.limparRastroDoCampo();
    this.congelado = true;
    this.congeladoDesde = this.scene.time.now;
    this.brasas.pause();
    this.scene.cameras.main.shake(140, 0.006);
    // step 10: the squeeze and the last beat, the frozen ring under it, the track and the murmurs all but gone
    Som.tocar('besta.coracao.aperta', { x: this.core.x });
    Som.tocar('besta.coracao.parado', { x: this.core.x });
    Music.escuro(Predador.ESCURO_TRILHA_PARADO, 250);
    this.somMurmurio?.volume(0.15, 250);
  }

  /** A field shard goes out: no body (it never wounds), no light, dark cooled metal. */
  private apagar(l: { b: Phaser.Physics.Arcade.Sprite; luz: Phaser.GameObjects.Image }, x: number, y: number): void {
    l.b.setData('apagada', true);
    (l.b.body as Phaser.Physics.Arcade.Body).enable = false;
    l.b.setTint(Predador.COR_APAGADA).setAlpha(0.75);
    l.luz.setVisible(false);
    this.brasas.emitParticleAt(x, y);
  }

  /** Every frozen ember trail by a field shard goes (26/11: the trails drew the lit shards as a closed wall). */
  private limparRastroDoCampo(): void {
    const pts = this.lavas.filter((l) => l.b.active && l.b.getData('celula')).map((l) => ({ x: l.b.x, y: l.b.y }));
    if (!pts.length) return;
    this.brasas.forEachAlive((p: Phaser.GameObjects.Particles.Particle) => {
      if (pts.some((q) => Math.abs(p.x - q.x) < 26 && Math.abs(p.y - q.y) < 18)) {
        p.alpha = 0;
        p.lifeCurrent = 0;
      }
    }, this);
  }

  /** The frozen ember trails along the route go too (the trails of the lit ones made it look closed — his photo, 25/11). */
  private limparRastroDaRota(): void {
    const pts = this.lavas.filter((l) => l.b.getData('apagada') === true).map((l) => ({ x: l.b.x, y: l.b.y }));
    if (!pts.length) return;
    this.brasas.forEachAlive((p: Phaser.GameObjects.Particles.Particle) => {
      if (pts.some((q) => Math.abs(p.x - q.x) < 20 && Math.abs(p.y - q.y) < 14)) {
        p.alpha = 0;
        p.lifeCurrent = 0;
      }
    }, this);
  }

  /** The heart beats again: every frozen thing of hers resumes its own velocity; the pools get the stopped time back. */
  private descongelar(): void {
    if (!this.congelado) return;
    const parado = this.scene.time.now - this.congeladoDesde;
    this.congelado = false;
    this.brasas.resume();
    for (const l of this.lavas) {
      const v = l.b.getData('gelo') as { x: number; y: number } | null;
      l.b.setData('gelo', null);
      if (l.b.getData('apagada') === true) {
        // the put-out ones do not fly on: they crumble where they hung
        l.b.setData('apagada', false);
        l.b.clearTint();
        l.b.setData('lava', false);
        this.enemies.release(l.b);
        continue;
      }
      if (v) (l.b.body as Phaser.Physics.Arcade.Body).setVelocity(v.x, v.y);
      if (l.fim !== undefined) l.fim += parado;
    }
    this.vistas.add('coracao');
    this.scene.cameras.main.shake(220, 0.01);
    Som.tocar('besta.coracao.volta', { x: this.core.x });
    Music.escuro(this.breu ? Predador.ESCURO_TRILHA : null, 600);
    this.somMurmurio?.volume(1, 600);
  }

  /** The bomb in the freeze (his "a"): her frozen field is cleared. */
  limparCampo(): void {
    for (const l of this.lavas) {
      if (!l.b.active) continue;
      this.brasas.emitParticleAt(l.b.x, l.b.y);
      l.b.setData('lava', false);
      this.enemies.release(l.b);
    }
  }

  // ─── Os olhos no escuro (spec §4.3, step 7) ─────────────────────────────────

  private get arenaOlhos(): ArenaOlhos {
    const core = (k: string, d: [number, number]) => (QUADROS_BESTA[k]?.core[0] ?? d) as [number, number];
    return {
      escala: this.escala,
      largura: GAME_WIDTH,
      chaoApoio: Predador.CHAO_APOIO,
      garraCrava: Predador.GARRA_CRAVA,
      garraTetoY: Predador.GARRA_TETO_Y,
      coreParede: core('parede-descola', [196, 160]),
      coreTeto: core('teto1', [102, 114]),
      coreVoo: core('voo', [110, 137]),
      coreLado: core('lado', [117, 170]),
    };
  }

  /**
   * THE EYES IN THE DARK (his "A", 25/11): she leaps out by the right edge, and three lights come on IN FRONT of the
   * ship (the right wall, the ceiling). She is the one that pulses with the heart; after two beats she leaps from it,
   * straight through where the ship was at the last beat. The embers burst in place.
   */
  private olhos(): void {
    if (this.ancora.lado === 'teto') {
      this.irPara(Predador.ANCORAS[0], () => {
        this.pousar(Predador.ANCORAS[0]);
        this.olhos();
      });
      return;
    }
    // she vanishes laughing (step 10) — 26/11: the laugh goes before the lights' beats (it covered the first three)
    Som.tocar('besta.risada', { x: this.sprite.x, some: { em: 1.1, ms: 900 } });
    this.olhosBatidas = 0;
    this.naveBatida = null;
    this.irPara({ x: GAME_WIDTH + 90, lado: 'chao' }, () => {
      this.sprite.setVisible(false);
      this.body.enable = false;
      this.coreBody.enable = false;
      this.acenderOlhos();
    });
  }

  private acenderOlhos(): void {
    this.apagarOlhos();
    const L = luzes(this.olhosN++, this.arenaOlhos);
    this.luzesOlhos = L.map((l) => ({
      l,
      golpes: 0,
      flash: 0,
      morta: false,
      brilho: this.scene.add.image(l.x, l.y, 'luzRadial').setBlendMode(Phaser.BlendModes.ADD).setTint(OLHOS.COR_REPOUSO).setScale(0.55).setAlpha(0).setDepth(7),
      olhos: this.scene.add.image(l.x, l.y - 2, 'olhosBesta').setBlendMode(Phaser.BlendModes.ADD).setTint(OLHOS.COR_REPOUSO).setAlpha(0).setDepth(7.2),
    }));
    this.olhosT = 0;
    this.olhosBatidas = 0;
    this.naveBatida = null;
    this.olhosSaltando = false;
    this.olhosDeslizou = false;
    this.olhosAvisando = false;
    this.pulsoFase = 0;
    this.mudar('olhos');
    this.coreBody.enable = true;
    this.posicionarCore();
    Som.tocar('besta.olhos.acende', { x: L.find((l) => l.verdadeira)?.x ?? GAME_WIDTH });
    this.somMurmurioOlhos?.parar(0);
    this.somMurmurioOlhos = Som.laco('besta.murmurio.olhos', 0);
    // 26/11, him: *"eu mal escuto o coração nessa parte"* — measured, her beat stood 0 dB over the rest of the mix (the
    // whispers covered it). While the lights look for her, the senses narrow onto the heart: the whispers go down under
    // it, the track closes as in the stopped heart, and the beat is the loudest thing in the room.
    this.somMurmurioOlhos?.volume(Predador.OLHOS_MURMURIO, 700);
    this.somMurmurio?.volume(Predador.OLHOS_MURMURIO_BREU, 700);
    Music.escuro(Predador.ESCURO_TRILHA_PARADO, 700);
  }

  /** While the lights look for her: the eyes' whispers and the dark's murmur, as fractions of their level. */
  static readonly OLHOS_MURMURIO = 0.3;
  static readonly OLHOS_MURMURIO_BREU = 0.2;

  /** The senses open again after the eyes (the murmur and the track back to the dark's level). */
  private reabrirSentidos(): void {
    if (!this.breu || this.congelado) return;
    this.somMurmurio?.volume(1, 900);
    Music.escuro(Predador.ESCURO_TRILHA, 900);
  }

  /** a → b by k (0..1), per channel. */
  private static misturar(a: number, b: number, k: number): number {
    const c = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k);
    return (c(16) << 16) | (c(8) << 8) | c(0);
  }

  /** Each frame while the lights are on: the true one with the heart (`pulso`), the embers on their own rhythms. */
  private atualizarOlhos(dt: number): void {
    if (!this.luzesOlhos.length) return;
    this.olhosT += dt;
    for (const o of this.luzesOlhos) {
      if (o.morta) continue;
      if (o.l.verdadeira && this.olhosAvisando) {
        o.brilho.setAlpha(1).setScale(0.85).setTint(OLHOS.COR_VERDADEIRA);
        o.olhos.setAlpha(1).setScale(1.15, 0.5).setTint(OLHOS.COR_VERDADEIRA);
        continue;
      }
      const p = o.l.verdadeira ? this.pulso : pulsoDa(o.l, this.olhosT);
      // the same dim amber at rest; on its own peak each one shows its colour (hers red, the embers yellow)
      const cor = Predador.misturar(OLHOS.COR_REPOUSO, o.l.verdadeira ? OLHOS.COR_VERDADEIRA : OLHOS.COR_BRASA, p);
      o.brilho.setAlpha(0.12 + 0.88 * p).setScale(0.45 + 0.25 * p).setTint(cor);
      o.olhos.setAlpha(0.3 + 0.7 * p).setTint(cor);
      // the shot ember flickers hot (white-yellow) and dies down
      if (o.flash > 0) {
        const k = o.flash;
        o.brilho.setAlpha(Math.max(o.brilho.alpha, k)).setScale(o.brilho.scaleX + 0.2 * k).setTint(Predador.misturar(cor, Predador.BRASA_FLASH, k));
        o.olhos.setAlpha(Math.max(o.olhos.alpha, k)).setTint(Predador.misturar(cor, Predador.BRASA_FLASH, k));
        o.flash = Math.max(0, o.flash - dt * 7);
      }
    }
  }

  /**
   * 26/11, his idea: *"quem atirar nos olhos de lava (os falsos) vai destrui-los, e vai cair faíscas do lugar"* — an ember
   * takes the shot: it flickers and spits a spark at each hit and, at `BRASA_TIROS`, bursts, its sparks falling to the
   * floor. Purely visual, his "B": no life, no bonus — *"o castigo é o tempo perdido"*. The same box as the true light's
   * core (26×24), so neither one is easier to hit. Called through `beber` (every live shot, every frame).
   */
  static readonly BRASA_TIROS = 3;
  static readonly BRASA_CAIXA = { w: 26, h: 24 };
  static readonly BRASA_FLASH = 0xfff2c0;
  private brasaNoTiro(bala: Phaser.Physics.Arcade.Sprite): boolean {
    if (this.dead || this.estado !== 'olhos' || this.olhosSaltando || !this.luzesOlhos.length) return false;
    const c = bala.body as Phaser.Physics.Arcade.Body;
    const { w, h } = Predador.BRASA_CAIXA;
    for (const o of this.luzesOlhos) {
      if (o.l.verdadeira || o.morta) continue;
      const x = o.brilho.x, y = o.l.y;
      if (c.right < x - w / 2 || c.left > x + w / 2 || c.bottom < y - h / 2 || c.top > y + h / 2) continue;
      o.golpes++;
      o.flash = 1;
      this.brasas.explode(3, x, y);
      if (o.golpes >= Predador.BRASA_TIROS) this.estourarBrasa(o);
      else if (this.scene.time.now - this.brasaSoouEm > 90) {
        this.brasaSoouEm = this.scene.time.now;
        Som.tocar('predador.lava.impacto', { x, forca: 0.25 });
      }
      return true;
    }
    return false;
  }

  private estourarBrasa(o: (typeof this.luzesOlhos)[number]): void {
    o.morta = true;
    const x = o.brilho.x, y = o.l.y;
    this.faiscas.explode(18, x, y);
    this.brasas.explode(12, x, y);
    Som.tocar('predador.lava.estilhaco', { x, forca: 0.6 });
    this.scene.tweens.add({ targets: [o.brilho, o.olhos], alpha: 0, scale: '+=0.4', duration: 160, onComplete: () => { o.brilho.setVisible(false); o.olhos.setVisible(false); } });
  }

  /** The eyes' whispers go (at the tell; or with the lights). */
  private calarMurmurioOlhos(ms: number): void {
    this.somMurmurioOlhos?.parar(ms);
    this.somMurmurioOlhos = null;
  }

  private apagarOlhos(): void {
    this.calarMurmurioOlhos(300);
    for (const o of this.luzesOlhos) {
      o.brilho.destroy();
      o.olhos.destroy();
    }
    this.luzesOlhos = [];
  }

  /** The leap of the true one; the embers burst in place (sparks only: no long projectile). */
  private saltarOlhos(): void {
    if (this.dead || this.estado !== 'olhos' || this.olhosSaltando) return;
    const v = this.luzesOlhos.find((o) => o.l.verdadeira);
    if (!v) return;
    for (const o of this.luzesOlhos) {
      if (o.l.verdadeira || o.morta) continue;
      this.brasas.explode(16, o.l.x, o.l.y);
      Som.tocar('predador.lava.estilhaco', { x: o.l.x, forca: 0.6 });
    }
    const nave = this.naveBatida ?? (this.nave ? { x: this.nave.x, y: this.nave.y } : { x: 80, y: 108 });
    const s = salto(v.l, nave, this.arenaOlhos);
    // from the ceiling: the eyes glide along it to the ship's column first (her body still in the dark), then the drop
    if (s.deslize && s.deslize.ms > 16 && !this.olhosDeslizou) {
      this.olhosDeslizou = true;
      const alvo = v;
      this.scene.tweens.add({
        targets: [alvo.brilho, alvo.olhos],
        x: s.deslize.ate,
        duration: s.deslize.ms,
        ease: 'Sine.InOut',
        onComplete: () => this.saltarOlhos(),
      });
      return;
    }
    this.olhosDeslizou = false;
    this.olhosAvisando = false;
    this.apagarOlhos();
    this.reabrirSentidos();
    this.olhosSaltando = true;
    this.sprite.setVisible(true).setFlipX(false);
    this.coreBody.enable = true;
    this.mover(s.inicio.x, s.inicio.y);
    this.corpoInteiro();
    Som.tocar('besta.olhos.salto', { x: s.de.x });
    const fim = () => {
      this.olhosSaltando = false;
      this.vistas.add('olhos');
    };
    if (s.pose === 'parede') {
      // off the wall (descola-a: the mirrored wall pose → the leap), then the leap carried straight, out on the left
      this.tocar('besta-parede-descola', 'besta:voo');
      this.aplicarCorpo();
      this.posicionarCore();
      this.scene.time.delayedCall(VOLTA.DESCOLA_MS, () => {
        if (this.dead) return;
        this.estatico('besta:voo');
        this.animarAte(
          s.ms,
          (k) => this.mover(Phaser.Math.Linear(s.inicio.x, s.fim.x, k), Phaser.Math.Linear(s.inicio.y, s.fim.y, k)),
          () => {
            fim();
            this.sprite.setVisible(false);
            this.body.enable = false;
            this.coreBody.enable = false;
            // she comes back from the right (the warning at the edge, then the gallop to her anchor)
            this.mudar('fora', 0.5);
          },
        );
      });
      return;
    }
    // from the ceiling: at the ship's column, she lets go straight down onto it
    this.sprite.play({ key: 'besta-mergulho', duration: s.ms });
    this.aplicarQuadro('besta-mergulho');
    this.aplicarCorpo();
    this.posicionarCore();
    this.animarAte(
      s.ms,
      (k) => this.mover(Phaser.Math.Linear(s.inicio.x, s.fim.x, k), Phaser.Math.Linear(s.inicio.y, s.fim.y, k)),
      () => {
        this.scene.cameras.main.shake(160, 0.008);
        Som.tocar('predador.pouso', { x: this.sprite.x });
        fim();
        this.ancora = { x: this.sprite.x, lado: 'chao' };
        this.irPara(Predador.ANCORAS[0]);
      },
      'Quad.easeIn',
    );
  }

  private rasgar(): void {
    this.sprite.setFlipX(false);
    this.mudar('rasgo');
    this.tocar('besta-rasgo', 'besta:quatro-pose');
    this.corpoInteiro();
    this.galopar(false);
    Som.tocar('predador.rasgo', { x: this.sprite.x });
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
        // the return ends here: phase 2's lock opens (spec §3, "uma volta inteira")
        this.vistas.add('volta');
        this.recuperando = true;
        this.corpoCasca();
        this.mudar('recupera', Predador.RECUP_RASGO);
        // 25/11: the rip ends on all fours — she stands back up (quatro-2 backwards) before walking on the spot
        this.levantar();
      },
    );
  }

  /** From all fours to her side pose (quatro-2 backwards), then the idle — unless something else took over. */
  private levantar(): void {
    this.tocar('besta-levanta', 'besta:lado');
    this.scene.time.delayedCall(Predador.LEVANTA_MS, () => {
      if (!this.dead && this.sprite.anims.currentAnim?.key === 'besta-levanta') this.idle();
    });
  }

  /** O METAL INCANDESCENTE: sai do chão à frente das garras, num leque de arcos que caem onde a nave estava. */
  private lancarMetal(ax: number, ay: number): void {
    const n = Predador.METAL_N[this.fase];
    // 25/11: from the front claws of the frame where the painted arc leaves the floor
    const garras = QUADROS_BESTA.rasgo?.inteiro[Math.round(Predador.RASGO_SOLTA * 25)];
    const x0 = this.sprite.x + ((garras ? garras[0] + 14 : 68) - 128) * this.escala;
    Som.tocar('predador.metal', { x: x0 });
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
    if (this.congelado) {
      // the heart is stopped: no beat, the core burns steady (she is open to the shots)
      this.luz.setVisible(true).setAlpha(0.95).setScale(1.1);
      return;
    }
    let periodo = this.breu ? Predador.PULSO_BREU : 1.6;
    if (this.estado === 'olhos' && !this.olhosSaltando) periodo = OLHOS.PULSO_S;
    let base = this.breu ? 0 : 0.35;
    let forte = this.breu ? 1 : 0.35;

    if (this.estado === 'agacha') {
      // the crouch: the core flares — "now she takes your height"
      periodo = 0.07;
      base = 0.9;
      forte = 1;
    } else if (this.estado === 'carga') {
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
    } else if (this.estado === 'sede' && this.sedeAberta) {
      // the thirst: the ring is open, the core burns and breathes fast
      periodo = 0.5;
      base = 0.6;
      forte = 1;
    } else if (this.recuperando) {
      // O convite: exposto, o peito brilha mais.
      base = this.breu ? 0.35 : 0.6;
      forte = 1;
    } else if (this.breu && (this.estado === 'bote' || this.estado === 'slash' || this.estado === 'telegLava' || this.estado === 'rasgo' || this.estado === 'salto' || this.estado === 'volta' || this.olhosSaltando)) {
      // 25/11 (spec §6, "o golpe invisível no breu"): in the dark, every attack keeps the core at the WARNING level —
      // the gallop and the slash used to fall back to the slow pulse with base 0 and pass unseen.
      periodo = 0.2;
      base = 0.7;
      forte = 1;
    }

    const antes = this.pulsoFase;
    this.pulsoFase = (this.pulsoFase + (dt * Math.PI * 2) / periodo) % (Math.PI * 2);
    // THE HEARTBEAT IN THE DARK (sheet 5c): one beat on each peak of the core's own slow pulse — only that one (the charge,
    // the warning and the entry have their own sounds); his two takes drawn in turn (*"dá para fazer uma variação"*)
    const bateu = antes < Math.PI / 2 && this.pulsoFase >= Math.PI / 2;
    if (this.breu && periodo === Predador.PULSO_BREU && bateu && this.estado !== 'fora' && this.estado !== 'morto') {
      // (26/11: the beat with body — his takes were 95–98 % under 80 Hz, unheard on a laptop or most headphones)
      Som.tocar('besta.coracao.batida', { x: this.core.x, forca: 0.8 });
    }
    // THE EYES: the heart beats at the true light (heard and seen); each beat marks where the ship is
    if (this.estado === 'olhos' && !this.olhosSaltando && bateu) {
      const v = this.luzesOlhos.find((o) => o.l.verdadeira);
      Som.tocar('besta.coracao.batida', { x: v?.l.x ?? GAME_WIDTH, forca: 1 });
    }
    // (25/11: only the first BATIDAS beats aim and count — a 5th falls in the ceiling glide, and re-aiming there made the
    // drop follow the ship that had already dodged)
    if (this.estado === 'olhos' && !this.olhosSaltando && bateu && this.olhosBatidas < OLHOS.BATIDAS) {
      if (this.nave) this.naveBatida = { x: this.nave.x, y: this.nave.y };
      this.olhosBatidas++;
      if (this.olhosBatidas === OLHOS.BATIDAS) {
        // THE TELL (25/11): the true eyes narrow and flare, a low growl — then she leaps
        this.olhosAvisando = true;
        this.calarMurmurioOlhos(400);
        Som.tocar('predador.urro3', { x: this.luzesOlhos.find((o) => o.l.verdadeira)?.l.x ?? GAME_WIDTH, forca: 0.55 });
        this.scene.time.delayedCall(OLHOS.ATRASO_S * 1000, () => this.saltarOlhos());
      }
    }
    this.pulso = Math.pow(Math.max(0, Math.sin(this.pulsoFase)), 3);
    const alpha = base + (forte - base) * this.pulso;
    const visivel = this.estado !== 'fora' && this.estado !== 'morto' && !(this.estado === 'olhos' && !this.olhosSaltando);
    this.luz.setVisible(visivel || this.estado === 'aviso');
    this.luz.setAlpha(alpha);
    this.luz.setTint(this.corDoCore());
    this.luz.setScale((this.estado === 'aviso' ? 1.6 : this.breu ? 1.1 : 0.9) + 0.35 * this.pulso);
  }

  private entrarNoBreu(): void {
    this.mudar('urroBreu');
    this.body.setVelocity(0, 0);
    this.scene.cameras.main.shake(420, 0.008);
    Som.tocar('predador.breu', { x: this.sprite.x });
    this.breu = true;
    // step 10 (his idea): the laugh from somewhere in the dark, the murmurs under it, and the track almost shut
    this.scene.time.delayedCall(700, () => !this.dead && Som.tocar('besta.risada', { x: GAME_WIDTH * 0.7 }));
    this.somMurmurio ??= Som.laco('besta.murmurio', 0);
    this.somMurmurio?.volume(1, 2500);
    Music.escuro(Predador.ESCURO_TRILHA, 2500);

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

  /** `somMs`: how fast the whispers' loop goes (default the light's `ms`); `trilhaEmMs`: when the track opens again. */
  private sairDoBreu(ms: number, somMs = ms, trilhaEmMs = 0): void {
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
    this.somMurmurio?.parar(Math.max(120, somMs));
    this.somMurmurio = null;
    if (trilhaEmMs <= 0) Music.escuro(null, Math.max(300, ms));
    else this.scene.time.delayedCall(trilhaEmMs, () => Music.escuro(null, Math.max(300, ms)));
  }

  // ─── Dano, morte ─────────────────────────────────────────────────────────────

  /** DEV (spec 2026-11-24 §7): 'besta1'…'besta3', by life (the same `fase` the fight reads). */
  get devFaseAtual(): string {
    return `besta${this.fase}`;
  }

  /**
   * DEV: to just below the next phase's threshold; her own beats run in `update` (the roar at phase 2, the dark at
   * phase 3 once she is grounded). ⚠️ When the per-phase LOCKS arrive (the Beast's step 3), this is where the current
   * phase's signature is marked as seen.
   */
  devProximaFase(): string | null {
    if (this.dead || this.estado === 'surgindo' || this.estado === 'fora' || this.estado === 'aviso' || this.estado === 'olhos' || this.estado === 'coracao') return null;
    const f = this.fase;
    if (f >= 3) return null;
    // the phase being skipped counts as done (spec §7): its lock opens
    if (f === 1) this.vistas.add('sede');
    if (f === 2) this.vistas.add('volta');
    // (floor − 1: 180 × 0.66 in floating point is 118.80000000000001, a hair ABOVE the threshold)
    this.hp = Math.min(this.hp, Math.floor(Predador.HP * (f === 1 ? 0.66 : 0.33)) - 1);
    this.aoMudarVida();
    return `besta${f + 1}`;
  }

  /**
   * 25/11 — THE LOCKS (spec §3, the Guardian's grammar): the life does not leave a phase before its signature showed.
   * Phase 2 waits for one whole return (it ends in the rip). The thirst (phase 1) and the heart (phase 3) lock when
   * their steps land. A hit bigger than the whole life (only dev scripts) goes through.
   */
  static readonly PISO_33 = 0.331;
  /** Phase 1 waits for one thirst with its return (step 5). Just above 0.66 so the life stays inside phase 1. */
  static readonly PISO_66 = 0.661;
  /** Phase 3 holds at 1 hp until the heart stopped once (spec §3: "não morre antes do coração parar"). */
  static readonly PISO_CORACAO = 1;
  private get piso(): number {
    if (this.fase === 1 && !this.vistas.has('sede')) return Predador.HP * Predador.PISO_66;
    // phase 3: she does not die before her heart has stopped once (step 8)
    if (this.fase === 3 && !this.vistas.has('coracao')) return Predador.PISO_CORACAO;
    if (this.fase === 2 && !this.vistas.has('volta')) return Predador.HP * Predador.PISO_33;
    return 0;
  }

  private get travada(): boolean {
    const p = this.piso;
    return p > 0 && this.hp <= p + 1e-6;
  }

  damage(amount: number): boolean {
    if (this.dead || this.estado === 'surgindo' || this.estado === 'fora' || this.estado === 'aviso') return false;
    // the eyes: only the true light is hit (the core sits on it, see `posicionarCore`), at OLHOS.DANO_LUZ
    const naLuz = this.estado === 'olhos' && !this.olhosSaltando;
    if (naLuz && !this.coreBody.enable) return false;
    const dano = amount * (this.recuperando ? Predador.DANO_RECUP : 1) * (naLuz ? OLHOS.DANO_LUZ : 1);
    const piso = amount >= Predador.HP ? 0 : Math.min(this.hp, this.piso);
    if (piso > 0 && this.hp - dano < piso) {
      this.hp = piso;
      this.aoMudarVida();
      // the bone holds: the COLD glint, short (not the warm one of damage) — as on the Guardian
      this.sprite.setTint(0x7a8290);
      this.scene.time.delayedCall(60, () => !this.dead && this.sprite.clearTint());
      return false;
    }
    this.hp = Math.max(0, this.hp - dano);
    this.aoMudarVida();

    this.sprite.setTint(this.recuperando ? 0xffe0a0 : 0xffb090);
    this.scene.time.delayedCall(60, () => !this.dead && this.sprite.clearTint());

    if (this.hp > 0) return false;

    this.dead = true;
    if (this.congelado) this.descongelar();
    this.apagarOlhos();
    this.fecharAnel();
    this.bebidos = [];
    this.mudar('morto');
    this.tween?.stop();
    this.tween = null;
    this.body.setVelocity(0, 0);
    this.recuperando = false;
    this.coreBody.enable = false;
    this.modoCorpo = null;
    this.tocar('besta-morte', 'besta:lado');
    this.galopar(false);
    Som.tocar('predador.morte', { x: this.sprite.x });
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
    // 26/11, him: *"na morte do boss não escutei algum urro de morte"* — measured in the game (`_medir-besta-morte.mjs`):
    // the five bursts at full force (0.87) sat right on the howl's opening and it added 0–2 dB there; it only came out in
    // its tail. The howl leads now: the bursts' sound goes under it (`MORTE_ESTOURO_FORCA`), the picture stays the same.
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(120 + i * 170, () => {
        const x = this.sprite.x + Phaser.Math.Between(-70, 70) * e;
        this.fx.explode(x, this.sprite.y + Phaser.Math.Between(-90, 90) * e, 1.1, 52, 'carne', false);
        Som.tocar(somDaExplosao('carne', 1.1), { x, forca: Predador.MORTE_ESTOURO_FORCA });
      });
    }
    // sheet 18c (his E): as the dark lifts at her death, the crowd of whispers swells and goes. 26/11 (the howl not
    // heard): the howl opens alone — the whispers' loop hushes at the blow, the swell comes in as the howl is held
    // (`MORTE_SAIDA_MS`) and the track opens only once it is over (`MORTE_TRILHA_MS`); the light lifts as before.
    if (this.breu) {
      const x = this.core.x;
      this.scene.time.delayedCall(Predador.MORTE_SAIDA_MS, () => Som.tocar('besta.murmurio.saida', { x, some: { em: 1.6, ms: 1800 } }));
    }
    this.sairDoBreu(800, 150, Predador.MORTE_TRILHA_MS);
    return true;
  }

  destroy(): void {
    this.tween?.stop();
    this.galopar(false);
    this.sairDoBreu(0);
    this.somMurmurio?.parar(0);
    this.somMurmurio = null;
    for (const l of this.lavas) {
      if (l.b.active) this.enemies.release(l.b);
      l.luz.destroy();
    }
    this.lavas = [];
    this.brasas.destroy();
    this.faiscas.destroy();
    this.luz.destroy();
    this.anel?.destroy();
    this.anel = null;
    this.sedeAberta = false;
    this.apagarOlhos();
  }
}
