import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCROLL_SPEED } from '../config';
import { Starfield } from '../Starfield';
import { Parallax } from '../Parallax';
import { resetVariantCache } from '../art';
import { pixelText } from '../ui';
import { Music } from '../systems/Music';
import type { HandlingMode } from './GameScene';

export class MenuScene extends Phaser.Scene {
  private starfield!: Starfield;
  private parallax!: Parallax;

  constructor() {
    super('Menu');
  }

  create(): void {
    resetVariantCache();

    // O mesmo parallax da fase, rolando devagar atrás do menu: a tela de título vira uma
    // janela para o jogo, em vez de um fundo preto com texto por cima.
    this.starfield = new Starfield(this);
    this.parallax = new Parallax(this);

    // Véu escuro sobre o parallax. Sem ele, o fundo bonito COMPETE com o texto e vence —
    // o menu precisa que o cenário seja atmosfera, não protagonista.
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bgDeep, 0.55)
      .setOrigin(0, 0)
      .setDepth(5);

    if (this.textures.exists('emblem')) {
      const emblem = this.add.image(GAME_WIDTH / 2, 32, 'emblem').setDepth(10);
      // Respiração lenta: sinaliza "vivo" sem custar um quadro de animação.
      this.tweens.add({
        targets: emblem,
        scale: 1.06,
        duration: 2200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.t(GAME_WIDTH / 2, 70, 'ALIEN WORLD', 17, COLORS.playerBright);
    this.t(GAME_WIDTH / 2, 84, 'R E M A S T E R E D', 8, COLORS.player);

    this.t(GAME_WIDTH / 2, 104, '— CONDUÇÃO —', 8, COLORS.metalMid);

    this.option(122, '[1]  DIEGÉTICA', 'a gravidade decide · recomendado', COLORS.playerBright);
    this.option(150, '[2]  LEGACY', 'flap sempre · score ×1.25', COLORS.hot);
    this.option(178, '[3]  LIVRE', 'voo livre sempre · acessível', COLORS.player);

    // A MESMA faixa da fase. Ao entrar no jogo, `Music.play` vê que já está tocando e não
    // reinicia — a música atravessa a transição de cena sem corte.
    Music.play(this, 'stage1');

    const kb = this.input.keyboard!;
    kb.on('keydown-ONE', () => this.start('diegetico'));
    kb.on('keydown-TWO', () => this.start('flap'));
    kb.on('keydown-THREE', () => this.start('free'));

    // Só em dev. Balancear uma luta sem jogar a fase inteira antes, e — desde que a Fase 2
    // existe — ENTRAR nela sem ter que vencer a Fase 1 toda vez.
    if (import.meta.env.DEV) {
      this.t(GAME_WIDTH / 2, 200, '[B] chefão 1   [C] capitânia   [V] fase 2', 7, COLORS.metalMid);
      this.t(GAME_WIDTH / 2, 209, '[I] cutscene (pouso · escolha de nave)', 7, COLORS.metalMid);

      kb.on('keydown-B', () => this.scene.start('Game', { handling: 'diegetico', practice: true }));
      kb.on('keydown-V', () => this.scene.start('Game', { stage: 2, handling: 'diegetico' }));
      kb.on('keydown-C', () =>
        this.scene.start('Game', { stage: 2, handling: 'diegetico', practice: true }),
      );

      // CORTA-CAMINHO — remover quando o balanceamento fechar (docs/HANDOFF.md).
      // Entra direto na interlude. Sem isto, ver a cutscene exige vencer o chefão da Fase 1:
      // ~30s de luta no mínimo, toda vez que se mexe num tween.
      kb.on('keydown-I', () =>
        this.scene.start('Interlude', { score: 4820, handling: 'diegetico' }),
      );

      // A 2ª cutscene: a DOCA no cinturão (pouso + a nave ALIENÍGENA + a doca explodindo).
      kb.on('keydown-O', () =>
        this.scene.start('Interlude2', {
          score: 9140,
          handling: 'diegetico',
          ship: 'cinza',
          stage: 3,
        }),
      );
    }
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.starfield.update(dt);
    // Metade da velocidade do jogo: o menu respira, não corre.
    this.parallax.update(dt, SCROLL_SPEED * 0.5);
  }

  /**
   * Uma opção: título forte + descrição legível.
   * A descrição usa `metalLight`, não `metalMid`: em 8px, o cinza-médio da paleta não tem
   * contraste suficiente contra o fundo — contorno não salva cor apagada.
   */
  private option(y: number, title: string, sub: string, color: number): void {
    this.t(GAME_WIDTH / 2, y, title, 12, color);
    this.t(GAME_WIDTH / 2, y + 13, sub, 8, COLORS.metalLight);
  }

  private t(x: number, y: number, value: string, size: number, color: number): void {
    pixelText(this, x, y, value, { size, color }).setDepth(10);
  }

  private start(handling: HandlingMode): void {
    this.scene.start('Game', { handling });
  }
}
