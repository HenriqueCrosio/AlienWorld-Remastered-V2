import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCROLL_SPEED } from '../config';
import { Starfield } from '../Starfield';
import { Parallax } from '../Parallax';
import { resetVariantCache } from '../art';
import { pixelText } from '../ui';
import { Music } from '../systems/Music';
import type { HandlingMode } from './GameScene';

/**
 * A TELA-TÍTULO.
 *
 * Dois fundos possíveis, decididos pela arte em disco:
 *
 * **KEY ART** (`menu-keyart.png`, 384×216 = a resolução exata do jogo): o Leviatã-baleia
 * sobre a lua morta com a nave solitária de rastro azul. A arte JÁ conta a história do jogo,
 * então o menu não a cobre com painéis: o título pousa no céu livre entre a nave e o
 * horizonte, e as opções ficam no terço de baixo (o terreno escuro) sobre uma faixa
 * translúcida DISCRETA — a legibilidade não pode depender da arte atrás, mas a faixa não
 * pode assassiná-la (alpha 0.45, a mesma régua do véu antigo).
 *
 * **FALLBACK** (sem a arte): o parallax da fase rolando devagar atrás de um véu escuro —
 * o layout original. O jogo nunca abre numa tela preta por causa de um PNG faltando.
 */
export class MenuScene extends Phaser.Scene {
  private starfield: Starfield | null = null;
  private parallax: Parallax | null = null;

  constructor() {
    super('Menu');
  }

  create(): void {
    resetVariantCache();

    const keyart = this.textures.exists('menuKeyart')
      ? this.add.image(0, 0, 'menuKeyart').setOrigin(0, 0).setDepth(0)
      : null;

    if (keyart) this.layoutKeyart(keyart);
    else this.layoutFallback();

    // A MESMA faixa da fase. Ao entrar no jogo, `Music.play` vê que já está tocando e não
    // reinicia — a música atravessa a transição de cena sem corte.
    Music.play(this, 'stage1');

    this.bindKeys();
  }

  // ─── O layout sobre a KEY ART ───────────────────────────────────────────────

  private layoutKeyart(art: Phaser.GameObjects.Image): void {
    // A arte ACORDA: fade-in de ~1s na abertura. É o único movimento dela — ela é um
    // quadro, e quadro bom não se remexe.
    art.setAlpha(0);
    this.tweens.add({ targets: art, alpha: 1, duration: 1000, ease: 'Cubic.easeOut' });

    this.twinkleStars();

    // A faixa das opções: o terreno lá embaixo já é escuro, então um véu FINO basta.
    this.add
      .rectangle(0, 148, GAME_WIDTH, GAME_HEIGHT - 148, COLORS.bgDeep, 0.45)
      .setOrigin(0, 0)
      .setDepth(5);

    // O título mora no céu livre entre a nave e o horizonte — o único terreno vazio da
    // arte. Gelo brilhante (playerGlow) com contorno pesado: legível sobre qualquer estrela.
    const titulo = this.t(GAME_WIDTH / 2, 122, 'ALIEN WORLD', 20, COLORS.playerGlow);
    const sub = this.t(GAME_WIDTH / 2, 139, 'R E M A S T E R E D', 8, COLORS.player);

    // Entrada atrasada: a arte respira primeiro, o nome chega depois. E um brilho
    // SUTIL pulsando — sinal de "vivo" sem custar um quadro de animação.
    for (const [alvo, delay] of [[titulo, 300], [sub, 450]] as const) {
      alvo.setAlpha(0);
      this.tweens.add({ targets: alvo, alpha: 1, duration: 600, delay, ease: 'Cubic.easeOut' });
    }
    this.tweens.add({
      targets: titulo,
      alpha: 0.82,
      duration: 2600,
      delay: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // O CTA é o que pulsa de verdade: é ele quem ensina o que fazer.
    const cta = this.t(GAME_WIDTH / 2, 157, 'ENTER · COMEÇAR', 8, COLORS.playerGlow);
    cta.setAlpha(0);
    this.tweens.add({ targets: cta, alpha: 1, duration: 400, delay: 800 });
    this.tweens.add({
      targets: cta,
      alpha: 0.4,
      duration: 1100,
      delay: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // As conduções, UMA LINHA cada: três linhas cabem no terço de baixo sem apertar, e a
    // cor da opção carrega o título e a descrição juntos (em 8px, um texto por linha lê
    // melhor que título+sub empilhados).
    this.t(GAME_WIDTH / 2, 170, '— CONDUÇÃO —', 7, COLORS.metalLight);
    this.t(GAME_WIDTH / 2, 182, '[1]  DIEGÉTICA · a gravidade decide · recomendado', 8, COLORS.playerBright);
    this.t(GAME_WIDTH / 2, 194, '[2]  LEGACY · flap sempre · score ×1.25', 8, COLORS.hot);
    this.t(GAME_WIDTH / 2, 206, '[3]  LIVRE · voo livre sempre · acessível', 8, COLORS.player);

    // Os hints de DEV sobem para o topo: o miolo da tela agora é da arte. É texto de
    // desenvolvedor — discreto por definição.
    if (import.meta.env.DEV) {
      this.t(GAME_WIDTH / 2, 8, '[B] chefão 1  [C] capitânia  [N] serpente  [V] f2  [M] f3', 7, COLORS.metalMid);
      this.t(GAME_WIDTH / 2, 16, '[I][O][P][F] cutscenes  [L] f4  [K] núcleo', 7, COLORS.metalMid);
    }
  }

  /**
   * Estrelas que CINTILAM sobre o céu da key art. A arte já vem estrelada, mas é um
   * quadro parado — uma dúzia de pontos piscando em fases aleatórias devolve o "vivo"
   * sem animar nada da pintura (o Leviatã e a lua não se mexem, e não devem).
   *
   * Posições escolhidas A DEDO no céu livre: fora do corpo do Leviatã (x<245, y<115),
   * fora da lua (x 300-370, y 30-85) e fora da nave (x 125-165, y 95-125).
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

  // ─── O fallback: o menu original, sem a arte ────────────────────────────────

  private layoutFallback(): void {
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

    if (import.meta.env.DEV) {
      this.t(GAME_WIDTH / 2, 200, '[B] chefão 1  [C] capitânia  [N] serpente  [V] f2  [M] f3', 7, COLORS.metalMid);
      this.t(GAME_WIDTH / 2, 209, '[I][O][P][F] cutscenes  [L] f4  [K] núcleo', 7, COLORS.metalMid);
    }
  }

  // ─── Teclas ─────────────────────────────────────────────────────────────────

  private bindKeys(): void {
    const kb = this.input.keyboard!;

    // O CTA da tela: ENTER (ou ESPAÇO) começa na condução RECOMENDADA. As teclas 1-3
    // continuam sendo o caminho explícito para quem quer escolher.
    kb.on('keydown-ENTER', () => this.start('diegetico'));
    kb.on('keydown-SPACE', () => this.start('diegetico'));
    kb.on('keydown-ONE', () => this.start('diegetico'));
    kb.on('keydown-TWO', () => this.start('flap'));
    kb.on('keydown-THREE', () => this.start('free'));

    // Só em dev. Balancear uma luta sem jogar a fase inteira antes, e — desde que a Fase 2
    // existe — ENTRAR nela sem ter que vencer a Fase 1 toda vez.
    if (import.meta.env.DEV) {
      kb.on('keydown-B', () => this.scene.start('Game', { handling: 'diegetico', practice: true }));
      kb.on('keydown-V', () => this.scene.start('Game', { stage: 2, handling: 'diegetico' }));
      kb.on('keydown-C', () =>
        this.scene.start('Game', { stage: 2, handling: 'diegetico', practice: true }),
      );
      // Fase 3: [M] joga a fase inteira (nebulosa → casco → serpente); [N] treina a SERPENTE.
      kb.on('keydown-M', () => this.scene.start('Game', { stage: 3, handling: 'diegetico' }));
      kb.on('keydown-N', () =>
        this.scene.start('Game', { stage: 3, handling: 'diegetico', practice: true }),
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

      // Fase 4: [L] entra direto no INTERIOR (corredores chão+teto); [K] treina o NÚCLEO.
      kb.on('keydown-L', () =>
        this.scene.start('Game', { stage: 4, handling: 'diegetico', ship: 'alien' }),
      );
      kb.on('keydown-K', () =>
        this.scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }),
      );

      // A 3ª cutscene: o HANGAR DO LEVIATÃ (queda da nave danificada + róster completo + colapso).
      kb.on('keydown-P', () =>
        this.scene.start('Interlude3', {
          score: 15200,
          handling: 'diegetico',
          ship: 'alien',
          stage: 4,
        }),
      );

      // A CUTSCENE FINAL (O AFASTAMENTO): [F] de "final" — a última tecla livre mnemônica
      // (usadas: B C N V M I O P L K G 1-4). O payload é o de uma campanha completa plausível:
      // o Arauto escolhido no hangar, score acumulado das 4 fases, a Fase 4 recém-vencida.
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
    // Metade da velocidade do jogo: o menu respira, não corre.
    this.parallax.update(dt, SCROLL_SPEED * 0.5);
  }

  /**
   * Uma opção do fallback: título forte + descrição legível.
   * A descrição usa `metalLight`, não `metalMid`: em 8px, o cinza-médio da paleta não tem
   * contraste suficiente contra o fundo — contorno não salva cor apagada.
   */
  private option(y: number, title: string, sub: string, color: number): void {
    this.t(GAME_WIDTH / 2, y, title, 12, color);
    this.t(GAME_WIDTH / 2, y + 13, sub, 8, COLORS.metalLight);
  }

  private t(x: number, y: number, value: string, size: number, color: number): Phaser.GameObjects.Text {
    return pixelText(this, x, y, value, { size, color }).setDepth(10);
  }

  private start(handling: HandlingMode): void {
    this.scene.start('Game', { handling });
  }
}
