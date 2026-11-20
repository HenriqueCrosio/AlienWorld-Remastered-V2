import Phaser from 'phaser';
import { ligarPausa } from '../pausa/abrirPausa';
import { resetVariantCache } from '../art';
import { Fx } from '../systems/Fx';
import { Atmosfera } from '../systems/atmosfera/Atmosfera';
import { SHIPS, DEFAULT_SHIP, naveEscolhida, visualDaNave } from '../ships';
import type { HandlingMode } from './GameScene';
import { T } from './final/tempos';
import { DEPTH, type CenaFinal, type Capitulo, type EstadoFinal } from './final/tipos';
import { montarDentro } from './final/dentro';
import { montarFora } from './final/fora';
import { IMPACTO_MS, PLANO_BAIXO_MS, montarQueda } from './final/queda';
import { RASANTE_ENTRA_MS, RASANTE_SAI_MS, montarSobrevoo, msDoRasanteEm, xDoRasante } from './final/sobrevoo';
import { GAME_WIDTH } from '../config';
import { lugarDaCena } from '../som/acustica';
import { Som, type Laco } from '../som/Som';
import { tocarFundo } from '../som/AmbienteDaFase';
import { Music } from '../systems/Music';
import { daNaveNaCena, naveDoSom, somDaNave, type NaveSom } from '../som/somDaNave';

/** ms after the last chapter (`T.APAGA`): the B of the cooling lava comes in under the end of the A (sheet 7). */
const APAGA_B_DEPOIS_MS = 2200;
/** ms: how long one chapter's bed takes to hand over to the next (the cut is the picture's; the sound crosses). */
const CRUZA_FUNDO_MS = 1800;
/** ms: the closing theme coming in as the ship is sucked out (its own first bars are quiet: a short fade is enough). */
const ENTRA_TRILHA_MS = 1500;
/**
 * THE FIRE BEFORE THE IMPACT and the surface's "A e C" together (20/11): the burning colony (the A) is heard low from the
 * fall's wide shot (ms into the fall), nearer on the low shot, whole at the impact; the dawn's wind (the C) comes in under
 * it at the impact and takes the front as the lava cools, the fire left as embers. Levels are × the bed's own volume.
 */
const FOGO_ENTRA_MS = 800;
const FOGO_SOBE_MS = 2400;
const FOGO_DE_LONGE = 0.3;
const FOGO_PERTO = 0.55;
const VENTO_COM_O_FOGO = 0.55;
const VENTO_ENTRA_MS = 4000;
const FOGO_BRASAS = 0.3;
/**
 * THE FLYOVER LEAVING (19/11, him: *"o flyby da nave termina abruptamente quando ela sai do quadro à esquerda....quero um
 * fade que indica que ela se distanciou"*): the ship takes 7.2 s to cross, and the takes are shorter (the X-AELO's 3.9 s,
 * the Manta's 3.5 s — they ended with her mid-screen) or end hard as she leaves (the TERMINUS's 8.1 s). So: the take's
 * loudest moment is put where she crosses the middle of the screen (`PICO_DO_SOBREVOO`, s into each take, measured), it
 * pans with her, and from 1 s before she leaves it fades out in `SOME_MS`; under it her ENGINE (the one she flies with
 * in cutscenes 1–3) comes in as she enters and goes away the same way — what is left when she is out of the frame.
 */
// (the Manta's take is short and soft at its end: it goes later, so it lasts until she leaves — measured with
// `scripts/_som/_medir-sobrevoo-final.mjs`)
const PICO_DO_SOBREVOO: Record<NaveSom, number> = { xaelo: 2.1, terminus: 4, charybdis: 0.6 };
const SOME_MS = 2600;
/** Her engine under the pass (the Manta's living hum is soft: it needs more to be heard as she goes). */
const MOTOR_DO_RASANTE: Record<NaveSom, number> = { xaelo: 0.55, terminus: 0.55, charybdis: 1 };

/**
 * O AFASTAMENTO — a cutscene FINAL, refeita na Fatia 8 (spec 2026-09-23-fatia8-cutscene-final-design.md).
 *
 * VITÓRIA AMARGA (decisão de 20/07, reafirmada em 23/09): a colônia já estava morta; a campanha foi
 * vingança. Agora ela é VISCERAL (pedido dele): o bicho se abre em volta da nave, jorra no vácuo, cai
 * sobre a colônia e a luz dele se apaga em cima dela.
 *
 * Esta classe é a REGENTE: a linha do tempo (`final/tempos.ts`), a nave, o estado da sonda e o
 * `GameOver`. Os capítulos moram em `src/scenes/final/`, e cada um devolve `limpar()` — o corte.
 *
 * ⚠️ SEM TECLA DE PULAR — o jogador chega da luta martelando o ESPAÇO.
 */
export class Interlude4Scene extends Phaser.Scene {
  private fx!: Fx;
  /** Lido pela sonda (`atm.estado()`). */
  private atm!: Atmosfera;
  private ship!: Phaser.GameObjects.Sprite;
  private cena!: CenaFinal;
  private capitulo: Capitulo | null = null;

  /** Lido pela sonda. */
  private estado!: EstadoFinal;

  private score = 0;
  private handling: HandlingMode = 'diegetico';
  private naveId: string = DEFAULT_SHIP;
  private faseConcluida = 4;
  private practice = false;
  private baseScore = 0;
  private done = false;
  /** The bed of the chapter on screen (19/11): each one crosses into the next. */
  private fundo: Laco | null = null;

  constructor() {
    super('Interlude4');
  }

  create(data: {
    score?: number;
    handling?: HandlingMode;
    ship?: string;
    stage?: number | null;
    stageDone?: number;
    practice?: boolean;
    baseScore?: number;
    /** Onde a nave estava no último quadro da luta (a costura). Pelo menu: o padrão. */
    naveX?: number;
    naveY?: number;
    /** true quando o `GameScene` deixou a fotografia do último quadro em `f8Costura`. */
    costura?: boolean;
  }): void {
    Som.trocarDeCena(lugarDaCena(this.scene.key));
    this.score = data.score ?? 0;
    this.handling = data.handling ?? 'diegetico';
    this.naveId = SHIPS[data.ship ?? ''] ? data.ship! : DEFAULT_SHIP;
    this.faseConcluida = data.stageDone ?? 4;
    this.practice = data.practice ?? false;
    this.baseScore = data.baseScore ?? 0;
    this.done = false;
    // A PAUSA (14/11, bloco M1): pular a cena final vai direto ao resultado.
    ligarPausa(this, {
      tipo: 'cutscene',
      pular: () => this.terminar(),
      sair: () => {
        if (this.done) return;
        this.done = true;
        this.capitulo?.limpar();
        this.scene.start('Menu');
      },
      podeAbrir: () => !this.done,
    });
    this.capitulo = null;
    this.estado = {
      capitulo: 0,
      fundo: null,
      rachadura: -1,
      rasgo: -1,
      musicaCortada: false,
      escalasLua: [],
      carcacaX: null,
      lavaCarcaca: null,
      naveSumiu: false,
      impacto: false,
    };

    resetVariantCache();
    this.fx = new Fx(this);
    // A ATMOSFERA (spec 2026-09-25): o texto fica limpo; a poeira mora logo abaixo da nave.
    this.atm = new Atmosfera(this, { limiteLimpo: DEPTH.TEXTO, profundidadePoeira: DEPTH.NAVE - 1 });

    // A nave da cutscene final é a que voou a F4 (ela abre emendada no último quadro): a humana escolhida no hangar.
    // ⚠️ Sem animação própria, NÃO cai na `ship-thrust`: os quadros dela sobrescreveriam a textura (a armadilha das
    // variantes de arte).
    const nave = visualDaNave(this.naveId, naveEscolhida(this.registry));
    const naveTex = this.textures.exists(nave.texture) ? nave.texture : 'ship';
    this.ship = this.add
      .sprite(Math.round(data.naveX ?? 120), Math.round(data.naveY ?? 110), naveTex)
      .setDepth(DEPTH.NAVE);
    const naveAnim = naveTex === nave.texture ? nave.anim : 'ship-thrust';
    if (naveAnim && this.anims.exists(naveAnim)) this.ship.play(naveAnim);

    this.cena = { scene: this, fx: this.fx, nave: this.ship, estado: this.estado, atm: this.atm };

    const costura = data.costura === true && this.textures.exists('f8Costura');
    this.troca(montarDentro(this.cena, costura ? 'f8Costura' : 'paintBgF4d'));
    // ⚠️ SEM PLACAR (24/09): com a câmara D durando 1,5s, a faixa do placar cobria o núcleo pulsando — o
    // único instante de reconhecer o lugar. A pontuação está na tela de vitória, que vem logo depois.

    // OS CAPÍTULOS, NA LINHA DO TEMPO.
    this.aos(T.FERIDA, () => montarFora(this.cena));
    this.aos(T.QUEDA, () => montarQueda(this.cena));
    // os capítulos 6 e 7 são um plano só (a câmera fica): o 7 mora dentro do sobrevoo
    this.aos(T.SOBREVOO, () => montarSobrevoo(this.cena));

    this.somDoFinal();

    this.time.delayedCall(T.FADE, () => {
      if (!this.done) this.atm.fadeOut(T.FIM - T.FADE);
    });
    this.time.delayedCall(T.FIM, () => this.terminar());
  }

  /**
   * O SOM DO FINAL (bloco SOM, folha 7, 17/11 — a cutscene era muda), no mesmo relógio dos capítulos (`T`): o lugar da
   * acústica anda com a câmera — DENTRO do bicho no rasgo e na descompressão, o VÁCUO da ferida e da queda, a
   * SUPERFÍCIE do sobrevoo. A ferida e o apagar são duas partes cada (ele: *"A e B na sequência"*; *"a B é a
   * ambientação interessante para depois da A"* — a B entra por baixo do fim da A, antes do fade).
   *
   * 19/11 — A LIGAÇÃO (ele: *"as cutscenes finais precisam de uma melhor conexao, preenchimento entre as cenas, de ruidos
   * [...] o que tem hoje em dia são apenas sons esparsos"*): um FUNDO por capítulo, cruzando com o próximo — o interior da
   * F4 (emendado da luta) até a ferida, o vácuo ao lado do bicho rasgado, a reentrada, e a colônia em chamas do impacto até
   * o fim (o mesmo fundo do amanhecer: a tela final abre nele). O IMPACTO no estouro (ele: *"não existe som do impacto
   * quando o leviatã bate no solo"*). E A TRILHA FINAL DELE entra na ferida (*"o jogador é sugado para fora do leviatã e a
   * tela a seguir é dele sendo expulso e o leviatã com um rombo. Acho interessante a música começar ai"*) e segue até os
   * créditos e o menu do amanhecer, sem reiniciar (`Music.play` deixa seguir a mesma faixa).
   *
   * 20/11 — a revisão dele: a trilha ADIANTADA para a descompressão (a nave sugada, 1ª cena); o fogo da colônia antes do
   * impacto, baixo; a superfície "A e C" JUNTAS (o vento por baixo do fogo desde o impacto, à frente quando a lava
   * esfria); a 1ª cena e o impacto um pouco mais baixos (`catalogoSons.ts`).
   */
  private somDoFinal(): void {
    const em = (ms: number, f: () => void): void => {
      this.time.delayedCall(ms, () => !this.done && f());
    };
    const fundo = (nome: string, ms = CRUZA_FUNDO_MS): void => {
      this.fundo?.parar(ms);
      this.fundo = tocarFundo(nome, ms);
    };
    Som.lugar('interior', 0);
    fundo('amb.f4.interior', 300);
    em(T.RASGO, () => Som.tocar('fim.rasgo'));
    em(T.DESCOMPRESSAO, () => {
      Som.tocar('fim.descompressao');
      // 20/11 — the closing theme comes in as the ship is SUCKED OUT (him: *"ela pode até começar antes [...] na primeira
      // cena e não na segunda"*): the fight's track already died at the tear, its first bars are quiet
      Music.play(this, 'final', ENTRA_TRILHA_MS, 'cena');
    });
    em(T.FERIDA, () => {
      Som.lugar('cabine', 400);
      Som.emSequencia(['fim.ferida', 'fim.ferida2'], em);
      fundo('amb.fim.ferida');
    });
    em(T.QUEDA, () => {
      Som.tocar('fim.queda');
      fundo('amb.fim.queda');
    });
    // 20/11 — THE COLONY WAS ALREADY BURNING (him: *"a colonia já está em chamas antes. então o barulho de fogo e crepitar
    // pode já estar antes, num volume mais baixo"*): the fire (the surface A) comes in low under the fall as the colony
    // shows in the wide shot, nearer on the low shot, and whole at the impact
    let fogo: Laco | null = null;
    let vento: Laco | null = null;
    em(T.QUEDA + FOGO_ENTRA_MS, () => {
      fogo = Som.laco('amb.fim.superficie', 0);
      fogo?.volume(FOGO_DE_LONGE, FOGO_SOBE_MS);
    });
    // the low shot is on the surface: the air of the planet
    em(T.QUEDA + PLANO_BAIXO_MS, () => {
      Som.lugar('atmosfera', 600);
      fogo?.volume(FOGO_PERTO, 400);
    });
    em(T.QUEDA + IMPACTO_MS, () => {
      Som.tocar('fim.impacto');
      this.fundo?.parar(2500);
      this.fundo = null;
      fogo?.volume(1, 1200);
      // his "A e C" TOGETHER (20/11: *"em conjunto, um complementando o outro"*): the dawn's wind (the C) comes in under
      // the fire from the impact on
      vento = Som.laco('amb.fim.superficie2', 0);
      vento?.volume(VENTO_COM_O_FOGO, VENTO_ENTRA_MS);
    });
    em(T.SOBREVOO, () => Som.lugar('atmosfera', 1500));
    const nave = naveDoSom(this.naveId, naveEscolhida(this.registry).modelo);
    const passa = daNaveNaCena('fim.sobrevoo', nave);
    const inicio = Math.max(0, msDoRasanteEm(GAME_WIDTH / 2) - PICO_DO_SOBREVOO[nave] * 1000);
    em(T.SOBREVOO + inicio, () => {
      const dur = Som.duracao(passa);
      // the fade starts 1 s before she leaves — or earlier, so a take that ends first still fades for 1.5 s, and the
      // fade reaches silence at the take's end, never cut short
      const emS = Math.max(0, Math.min((RASANTE_SAI_MS - 1000 - inicio) / 1000, dur - 1.5));
      Som.tocar(passa, {
        x: xDoRasante(inicio),
        xFim: xDoRasante(inicio + dur * 1000),
        some: { em: emS, ms: Math.min(SOME_MS, (dur - emS) * 1000) },
      });
    });
    let motor: Laco | null = null;
    em(T.SOBREVOO + RASANTE_ENTRA_MS, () => {
      motor = Som.laco(somDaNave(nave, 'motor'), 0);
      motor?.volume(MOTOR_DO_RASANTE[nave], 1200);
    });
    em(T.SOBREVOO + RASANTE_SAI_MS - 1000, () => motor?.parar(SOME_MS));
    em(T.APAGA, () => {
      Som.tocar('fim.apaga');
      // the lava cools: the fire sinks to embers and the dawn's wind takes the front — the bed the result screen opens on
      fogo?.volume(FOGO_BRASAS, 3000);
      vento?.volume(1, 3000);
    });
    em(T.APAGA + APAGA_B_DEPOIS_MS, () => Som.tocar('fim.apaga2'));
  }

  /** O CORTE: o capítulo que sai limpa a tela dele, e o novo entra. */
  private troca(novo: Capitulo): void {
    this.capitulo?.limpar();
    this.capitulo = novo;
  }

  /** Agenda um capítulo no instante `ms` da cena. */
  private aos(ms: number, montar: () => Capitulo): void {
    this.time.delayedCall(ms, () => {
      if (!this.done) this.troca(montar());
    });
  }

  override update(_time: number, delta: number): void {
    this.capitulo?.update?.(delta / 1000);
    this.atm.update(delta / 1000);
  }

  /** O fim da campanha, com o MESMO payload que a GameScene montaria. */
  private terminar(): void {
    if (this.done) return;
    this.done = true;
    this.capitulo?.limpar();
    // O FIM DA CAMPANHA (13/11, bloco I etapa 3): a tela final é o MENU DO AMANHECER em modo resultado — o Leviatã caído
    // ao amanhecer, o título, o placar e o crédito; na tecla ele vira o menu. O treino segue para o placar de sempre.
    if (!this.practice && this.faseConcluida === 4) {
      this.scene.start('Menu', { resultado: { score: this.score, handling: this.handling } });
      return;
    }
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
