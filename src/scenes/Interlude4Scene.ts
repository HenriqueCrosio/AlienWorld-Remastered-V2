import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import { resetVariantCache } from '../art';
import { pixelText } from '../ui';
import { Fx } from '../systems/Fx';
import { SHIPS, DEFAULT_SHIP } from '../ships';
import type { HandlingMode } from './GameScene';
import { T } from './final/tempos';
import { DEPTH, type CenaFinal, type Capitulo, type EstadoFinal } from './final/tipos';
import { montarDentro } from './final/dentro';

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
    this.score = data.score ?? 0;
    this.handling = data.handling ?? 'diegetico';
    this.naveId = SHIPS[data.ship ?? ''] ? data.ship! : DEFAULT_SHIP;
    this.faseConcluida = data.stageDone ?? 4;
    this.practice = data.practice ?? false;
    this.baseScore = data.baseScore ?? 0;
    this.done = false;
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
    };

    resetVariantCache();
    this.fx = new Fx(this);

    const nave = SHIPS[this.naveId];
    const naveTex = this.textures.exists(nave.texture) ? nave.texture : 'ship';
    this.ship = this.add
      .sprite(Math.round(data.naveX ?? 120), Math.round(data.naveY ?? 110), naveTex)
      .setDepth(DEPTH.NAVE);
    const naveAnim = naveTex === nave.texture ? (nave.anim ?? 'ship-thrust') : 'ship-thrust';
    if (this.anims.exists(naveAnim)) this.ship.play(naveAnim);

    this.cena = { scene: this, fx: this.fx, nave: this.ship, estado: this.estado };

    const costura = data.costura === true && this.textures.exists('f8Costura');
    this.troca(montarDentro(this.cena, costura ? 'f8Costura' : 'paintBgF4d'));
    this.placar();

    this.time.delayedCall(T.FADE, () => {
      if (!this.done) this.cameras.main.fadeOut(T.FIM - T.FADE, 0, 0, 0);
    });
    this.time.delayedCall(T.FIM, () => this.terminar());
  }

  /** O CORTE: o capítulo que sai limpa a tela dele, e o novo entra. */
  private troca(novo: Capitulo): void {
    this.capitulo?.limpar();
    this.capitulo = novo;
  }

  override update(_time: number, delta: number): void {
    this.capitulo?.update?.(delta / 1000);
  }

  private placar(): void {
    const banda = this.add.rectangle(0, 64, GAME_WIDTH, 78, COLORS.bgDeep, 0.72).setOrigin(0, 0).setDepth(DEPTH.TEXTO - 1);
    const t = (y: number, v: string, size: number, color: number) =>
      pixelText(this, GAME_WIDTH / 2, y, v, { size, color }).setDepth(DEPTH.TEXTO);
    const linhas = [
      t(74, 'FASE 4 · O INTERIOR', 11, COLORS.playerBright),
      t(92, 'CONCLUÍDA', 8, COLORS.metalLight),
      t(116, String(this.score), 17, COLORS.hotBright),
      t(132, 'PONTOS', 7, COLORS.metalLight),
    ];
    // Sai ANTES do rasgo: o placar não pode estar na tela quando a parede abre.
    this.tweens.add({
      targets: [banda, ...linhas],
      alpha: 0,
      duration: 700,
      delay: 2200,
      onComplete: () => {
        banda.destroy();
        linhas.forEach((l) => l.destroy());
      },
    });
  }

  /** O fim da campanha, com o MESMO payload que a GameScene montaria. */
  private terminar(): void {
    if (this.done) return;
    this.done = true;
    this.capitulo?.limpar();
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
