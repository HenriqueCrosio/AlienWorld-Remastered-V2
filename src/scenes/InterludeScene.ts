import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Starfield } from '../Starfield';
import { Parallax } from '../Parallax';
import { resetVariantCache } from '../art';
import { pixelText } from '../ui';
import { Fx } from '../systems/Fx';
import { Music } from '../systems/Music';
import { SHIPS, DEFAULT_SHIP, ROSTER_AURORA } from '../ships';
import { ShipPanel } from '../ui/ShipPanel';
import type { HandlingMode } from './GameScene';

/**
 * INTERLUDE — entre a Fase 1 e a Fase 2. O beat arcade dos anos 90.
 *
 * ─── POR QUE ELA EXISTE ───
 *
 * Ela é a ORIGEM NARRATIVA DA FROTA MORTA. Você pousa na capitânia da sua própria frota, ela
 * implode, e a Fase 2 é você voando pelo cadáver dela. O cinturão de destroços deixa de ser
 * "o cenário do nível 2" e passa a ser um cemitério com nome.
 *
 * ─── POR QUE ELA NÃO ATROPELA A ZERO-G ───
 *
 * A zero-G é a RECOMPENSA por matar a Torre (decisão fechada — docs/HANDOFF.md). O jogador voa
 * nela COM O CONTROLE NA MÃO por alguns segundos, na GameScene, e só DEPOIS a interlude começa.
 * A cutscene não substitui o momento-assinatura: ela o continua.
 *
 * O controle já está travado aqui, e isso é de propósito: a nave não PARA entre uma coisa e
 * outra. Ela sai da atmosfera voando e continua voando — a cutscene só assume o manche.
 *
 * ─── O GANCHO DA ESCOLHA DE NAVE ───
 *
 * O beat `escolha` abaixo é onde entra o menu de seleção (cada nave = um armamento base).
 * Hoje ele é uma pausa com um letreiro. Está isolado de propósito: implementar a escolha é
 * preencher UM beat, não reescrever a cena.
 */
export class InterludeScene extends Phaser.Scene {
  private starfield!: Starfield;
  private parallax!: Parallax;
  private fx!: Fx;

  private ship!: Phaser.GameObjects.Image;
  private carrier!: Phaser.GameObjects.Image;
  /** A aresta de luz do convés — é ela que diz ao olho onde a superfície começa. */
  private deckRim!: Phaser.GameObjects.Rectangle;
  private banner!: Phaser.GameObjects.Text;

  private score = 0;
  private handling: HandlingMode = 'diegetico';
  private done = false;

  /** O painel de escolha. É o MESMO da 2ª interlude (src/ui/ShipPanel.ts). */
  private panel: ShipPanel | null = null;
  /** A nave escolhida. Se o jogador pular a cutscene, vai a padrão — nunca "nave nenhuma". */
  private naveId: string = DEFAULT_SHIP;

  /** A linha do CONVÉS: é nela que a nave pousa. O casco desce daqui para fora da tela. */
  private static readonly DECK_Y = 168;

  /**
   * Onde o CONVÉS está DENTRO da arte (`carrier.png`, 120×49).
   *
   * MEDIDO, não chutado — é a linha em que a largura do casco salta de 38px para 84px: acima
   * dela são as torres e o mastro, abaixo é o casco. Ancorar o sprite pelo centro deixava a
   * linha do convés 30px ABAIXO da tela, e só a ponta do mastro aparecia: a nave pousava no
   * vazio. (Mesma lição das bocas de canhão do chefão — offsets de arte se medem no PNG.)
   *
   * Recalcular se a arte for trocada.
   */
  private static readonly ART_H = 49;
  private static readonly DECK_ROW = 15;
  /** ×3.2 sobre 120px de arte = 384px = a largura EXATA da tela. O casco é o horizonte. */
  private static readonly SCALE = 3.2;

  /** Y do centro do sprite que põe a linha do convés exatamente em DECK_Y. */
  private static get carrierY(): number {
    const meio = InterludeScene.ART_H / 2;
    return InterludeScene.DECK_Y + (meio - InterludeScene.DECK_ROW) * InterludeScene.SCALE;
  }

  constructor() {
    super('Interlude');
  }

  create(data: { score?: number; handling?: HandlingMode }): void {
    this.score = data.score ?? 0;
    this.handling = data.handling ?? 'diegetico';
    this.done = false;
    this.panel = null;
    this.naveId = DEFAULT_SHIP;

    resetVariantCache();

    this.starfield = new Starfield(this);
    // O MESMO fundo da Fase 2: a nave já está no vácuo. Trocar de céu entre a cena e a fase
    // denunciaria o corte — a interlude tem que parecer o mesmo voo, e não um vídeo.
    this.parallax = new Parallax(this, 'espaco');
    this.fx = new Fx(this);

    // A nave que POUSA é a que o jogador acabou de voar — a Fase 1 é sempre a nave padrão
    // (o jato, no róster v2). Desenhar outra aqui desmentiria o voo que ele acabou de fazer.
    const chegada = SHIPS[this.naveId];
    const chegadaTex = this.textures.exists(chegada.texture) ? chegada.texture : 'ship';
    const chegadaAnim = chegada.anim ?? 'ship-thrust';

    this.ship = this.add.image(-30, GAME_HEIGHT / 2, chegadaTex).setDepth(20);
    if (chegadaTex === chegada.texture && this.anims.exists(chegadaAnim)) {
      // Um sprite estático não "voa". A animação do motor é o que diz que ela está sob potência.
      const s = this.add.sprite(-30, GAME_HEIGHT / 2, chegadaTex).setDepth(20);
      s.play(chegadaAnim);
      this.ship.destroy();
      this.ship = s;
    }

    // A AURORA NÃO É UM SPRITE NA TELA — ELA É O CHÃO.
    //
    // Uma nave capital que CABE na tela parece um brinquedo. Aqui ela é grande demais para caber:
    // entra por baixo, em escala ×3, e o convés dela vira o HORIZONTE. As torres e antenas que
    // sobem do casco são a única parte que se lê como "nave" — o resto é chão.
    //
    // É a escala que faz o pouso significar alguma coisa, e é o mesmo truque que a campanha
    // inteira usa: o Leviatã cresce até virar o chão da Fase 3 (docs/GDD.md §7).
    this.carrier = this.add
      .image(GAME_WIDTH / 2, InterludeScene.carrierY, 'carrier')
      .setScale(InterludeScene.SCALE)
      .setDepth(10);

    // ARESTA DE LUZ NO CONVÉS. É o mesmo truque do solo da Fase 1 (`groundRim` em Parallax):
    // sem ela, casco escuro contra espaço escuro viram uma massa só, e o olho não sabe onde a
    // superfície começa. Uma linha de 1px é o que transforma "um borrão" em "chão".
    //
    // ⚠️ Ela cobre SÓ o vão opaco do casco na linha do convés — MEDIDO no PNG (row 15: arte
    // x=19..102). De tela a tela inteira (384px) ela sobrava ~115px flutuando sobre o vazio à
    // esquerda da proa — a "linha estranha" que o Henrique viu na subida (2026-07-18).
    const rimX0 = 19 * InterludeScene.SCALE;
    const rimW = (102 - 19 + 1) * InterludeScene.SCALE;
    this.deckRim = this.add
      .rectangle(rimX0, InterludeScene.DECK_Y, rimW, 1, 0x7fd4e8)
      .setOrigin(0, 0)
      .setDepth(11)
      .setAlpha(0.55);

    this.banner = pixelText(this, GAME_WIDTH / 2, 26, '', { size: 11, color: COLORS.hotBright })
      .setDepth(100)
      .setAlpha(0);

    this.roteiro();

    // ⚠️ NÃO EXISTE TECLA DE PULAR — e é de propósito.
    //
    // A cena é ASSISTIDA: o controle fica travado do pouso até a explosão, e o único input que
    // ela aceita é a escolha da nave (1/2/3). O jogador retoma o comando na Fase 2.
    //
    // A primeira versão tinha "[ESPAÇO] pular", e o ESPAÇO comeu a cutscene inteira na primeira
    // vez que um humano a jogou: é a tecla mais martelada do jogo e é usada SEM PARAR ao longo
    // desta transição — na Fase 1 (flap) ela é o impulso, e depois que a atmosfera rompe (voo
    // livre) ela vira o GATILHO. O jogador chegava aqui com o dedo no espaço, a cena era pulada
    // no primeiro frame, e ele caía na Fase 2 sem ver nada.
    //
    // Tentei consertar duas vezes pela trava e as duas falharam: um "delay de 1s" não resolve
    // (ele continua martelando depois de 1s), e exigir um `keyup` também não (quem flapa TECLA E
    // SOLTA dez vezes por segundo). O erro não era a trava — era existir a tecla.
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.starfield.update(dt);
    // Devagar: a nave está em aproximação, não em fuga. O fundo dita o ritmo da cena.
    this.parallax.update(dt, 26);
  }

  // ─── O roteiro, em tempos ───────────────────────────────────────────────────

  private roteiro(): void {
    this.placar();

    // PILOTO AUTOMÁTICO ENGATADO.
    //
    // É o que EXPLICA o controle travado — e explica DIEGETICAMENTE, que é a regra do jogo: a
    // física do lugar decide a condução, nunca um menu (docs/GDD.md §3). Sem este aviso, o
    // jogador aperta as teclas, nada acontece, e ele conclui que o jogo travou. Com ele, a nave
    // não está fora do controle dele: ela está sob o controle de OUTRA coisa.
    //
    // Entra depois do placar, e é o que dá a LARGADA da aproximação.
    this.time.delayedCall(2300, () => {
      if (this.done) return;
      this.aviso('PILOTO AUTOMÁTICO · ENGATADO', COLORS.hotBright);
      this.cameras.main.flash(160, 255, 212, 71);
    });

    // O casco SOBE para dentro da tela: é a Aurora se aproximando por baixo. Ela não "entra em
    // cena" pela lateral como um objeto — o mundo é que revela que ela estava ali embaixo.
    //
    // A aresta do convés viaja JUNTO (o mesmo deslocamento), senão a linha de luz fica pendurada
    // no ar enquanto o casco ainda está subindo.
    const subida = 90;
    this.carrier.y += subida;
    this.deckRim.y += subida;
    this.deckRim.setAlpha(0);

    this.tweens.add({
      targets: this.carrier,
      y: InterludeScene.carrierY,
      duration: 5200,
      ease: 'Sine.easeOut',
      delay: 2400,
    });

    this.tweens.add({
      targets: this.deckRim,
      y: InterludeScene.DECK_Y,
      alpha: 0.55,
      duration: 5200,
      ease: 'Sine.easeOut',
      delay: 2400,
    });

    // A nave atravessa a tela em altitude. Ela nunca para: é o mesmo voo da GameScene
    // continuando, só que sem o manche na mão do jogador.
    this.tweens.add({
      targets: this.ship,
      x: 150,
      duration: 3600,
      ease: 'Sine.easeOut',
      delay: 2600,
    });

    this.time.delayedCall(6400, () => this.pouso());
  }

  /** O placar da fase: o que o jogador ganhou por matar a Torre. */
  private placar(): void {
    const t = (y: number, v: string, size: number, color: number) =>
      pixelText(this, GAME_WIDTH / 2, y, v, { size, color }).setDepth(100);

    const linhas = [
      t(74, 'FASE 1 · A DECOLAGEM', 11, COLORS.playerBright),
      t(92, 'CONCLUÍDA', 8, COLORS.metalLight),
      t(116, String(this.score), 17, COLORS.hotBright),
      t(132, 'PONTOS', 7, COLORS.metalLight),
    ];

    this.tweens.add({
      targets: linhas,
      alpha: 0,
      duration: 900,
      delay: 2400,
      onComplete: () => linhas.forEach((l) => l.destroy()),
    });
  }

  /**
   * O POUSO: a nave arqueia e desce no CONVÉS.
   *
   * O X e o Y são tweens SEPARADOS, com curvas diferentes — é isso que faz um arco em vez de uma
   * linha reta. O X desacelera (`Sine.easeOut`: ela perde velocidade de avanço) enquanto o Y
   * acelera e freia no fim (`Cubic.easeInOut`: ela cai e assenta). Um tween só, com as duas
   * coisas juntas, daria uma diagonal — e uma nave não desce em diagonal, ela plana.
   */
  private pouso(): void {
    if (this.done) return;

    this.aviso('CAPITÂNIA AURORA · CONVÉS DE POUSO', COLORS.playerBright);

    this.tweens.add({
      targets: this.ship,
      x: 210,
      duration: 2000,
      ease: 'Sine.easeOut',
    });

    this.tweens.add({
      targets: this.ship,
      y: InterludeScene.DECK_Y - 6,
      duration: 2000,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        // Assenta: poeira do retro-propulsor e um baque na câmera. Sem isso a nave não POUSA,
        // ela só para de se mover.
        this.fx.hit(this.ship.x, this.ship.y + 6);
        this.cameras.main.shake(140, 0.004);
        this.escolha();
      },
    });
  }

  /**
   * A ESCOLHA DE NAVE — o coração da interlude.
   *
   * A nave É a arma base (src/ships.ts). É o único beat em que o jogo PARA e espera o jogador: o
   * resto da cutscene é assistido, e por isso ela não pode ser pulada por acidente.
   *
   * O painel é o MESMO da 2ª interlude (src/ui/ShipPanel.ts) — aqui ele oferece as TRÊS naves
   * humanas. A alienígena não existe neste convés: ela é ENCONTRADA depois, na doca do cinturão.
   * Um Arauto disponível no hangar da Aurora não teria de onde ter vindo.
   */
  private escolha(): void {
    if (this.done) return;

    this.aviso('DOCA 3 · SELECIONE SUA NAVE', COLORS.playerBright);

    this.panel = new ShipPanel(
      this,
      ROSTER_AURORA,
      (t, c) => this.aviso(t, c),
      (id) => this.escolher(id),
      () => this.sair(),
    );
  }

  /** ESC: abandona. A cutscene não tem "pular", mas SAIR do jogo é sempre um direito. */
  private sair(): void {
    if (this.done) return;
    this.done = true;
    this.scene.start('Menu');
  }

  /** Confirmada: guarda a nave, limpa o painel e a Aurora começa a morrer. */
  private escolher(id: string): void {
    if (this.done) return;

    this.naveId = id;
    this.panel?.destroy();
    this.panel = null;

    // A nave escolhida TROCA no convés: o jogador vê o que acabou de armar antes de decolar nela.
    //
    // ⚠️ PARAR A ANIMAÇÃO PRIMEIRO. A nave é um sprite tocando `ship-thrust`, e a animação
    // SOBRESCREVE a textura no quadro seguinte: um `setTexture()` solto era desfeito antes de
    // aparecer, e o jogador escolhia a Lança e decolava no Interceptor. A escolha funcionava (a
    // nave certa ia para a fase) — só a IMAGEM mentia, e mentia exatamente no beat que existe
    // para mostrar o que ele armou. É a mesma briga de animação × textura das variantes de arte.
    const nave = SHIPS[id];
    if (this.textures.exists(nave.texture)) {
      const s = this.ship as Phaser.GameObjects.Sprite;
      s.anims?.stop();
      s.setTexture(nave.texture);
    }

    this.aviso(`${nave.name} · ARMADA`, COLORS.hotBright);
    this.cameras.main.flash(200, 62, 224, 240);

    this.time.delayedCall(1400, () => this.implosao());
  }

  /** A Aurora morre. E os destroços dela são a Fase 2. */
  private implosao(): void {
    if (this.done) return;

    this.aviso('IMPACTO · A FROTA CAIU', COLORS.enemyBright);
    Music.play(this, 'boss', 600);

    // A CADEIA VARRE O CASCO DA DIREITA PARA A ESQUERDA, ao longo da linha do convés — e ela
    // chega ATÉ a nave. É a direção que cria a urgência: o jogador vê a destruição vindo na
    // direção dele antes de decolar. Uma explosão aleatória no meio da tela seria só barulho.
    const N = 14;

    for (let i = 0; i < N; i++) {
      this.time.delayedCall(i * 150, () => {
        if (this.done) return;

        const t = i / (N - 1);
        this.fx.explode(
          Phaser.Math.Linear(GAME_WIDTH + 10, 40, t) + Phaser.Math.Between(-14, 14),
          InterludeScene.DECK_Y + Phaser.Math.Between(-10, 26),
          1.5,
        );
      });
    }

    // A nave DECOLA — e decola ANTES do clarão final. Quem sai voando de uma explosão é herói;
    // quem sai depois é sobrevivente. O tempo aqui é a diferença entre as duas leituras.
    //
    // Ela sobe e vai para a DIREITA: é para lá que a Fase 2 corre. Sair pela esquerda seria
    // voltar por onde veio, e o corte para o cinturão ficaria invertido.
    this.time.delayedCall(1600, () => {
      if (this.done) return;

      this.tweens.add({ targets: this.ship, x: GAME_WIDTH + 40, duration: 1600, ease: 'Sine.easeIn' });
      this.tweens.add({ targets: this.ship, y: 60, duration: 1600, ease: 'Cubic.easeOut' });
    });

    // O casco AFUNDA e apaga: a Aurora sai de cena por baixo, por onde entrou.
    this.time.delayedCall(2700, () => {
      if (this.done) return;

      this.cameras.main.flash(800, 255, 210, 120);
      this.fx.explode(GAME_WIDTH / 2, InterludeScene.DECK_Y, 4);

      this.tweens.add({
        targets: [this.carrier, this.deckRim],
        y: '+=70',
        alpha: 0,
        duration: 1100,
        ease: 'Quad.easeIn',
      });
    });

    this.time.delayedCall(3900, () => this.avancar());
  }

  private aviso(texto: string, cor: number): void {
    this.banner
      .setText(texto)
      .setColor(Phaser.Display.Color.IntegerToColor(cor).rgba)
      .setAlpha(1)
      .setScale(1);

    this.tweens.add({ targets: this.banner, alpha: 0, duration: 1600, delay: 700 });
  }

  /** Guardado por `done`: pular no meio de uma cadeia de `delayedCall` chamaria isto N vezes. */
  private avancar(): void {
    if (this.done) return;
    this.done = true;

    this.scene.start('Game', { stage: 2, handling: this.handling, ship: this.naveId, score: this.score });
  }
}
