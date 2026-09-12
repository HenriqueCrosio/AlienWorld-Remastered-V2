import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './../config';

/** Em que ponto do ciclo a câmara está. Ver o comentário da classe para o porquê de cada um. */
type EstadoAgua = 'seco' | 'enchendo' | 'surto' | 'assentando' | 'submerso' | 'esvaziando';

/**
 * A ÁGUA DA ARENA DO GOLFINHO — a câmara B enche, e a tela cheia ESCONDE a troca de pintura.
 *
 * ⚠️ ELA TEM DUAS FUNÇÕES, E A SEGUNDA É A QUE MANDA NOS NÚMEROS. A primeira é de leitura: um
 * golfinho biomecânico nadando num corredor seco era a única coisa da fase que não se explicava
 * sozinha. A segunda é de MONTAGEM — pedido dele: *"ao entrar na zona do golfinho, para casar com
 * a transição da imagem de fundo, tenha um pequeno efeito para encher de água a tela e assim
 * escondemos a transição das imagens de fundo"*. A troca de `paintBgF4a` para `paintBgF4b` sempre
 * foi um CORTE SECO de uma pintura para outra; agora ela acontece atrás de uma tela opaca.
 *
 * ⚠️ POR ISSO O `SURTO` EXISTE, e ele não é enfeite. Encher de baixo para cima é bonito mas não
 * tapa nada: enquanto a água sobe, a metade de cima da tela ainda mostra a pintura velha. O surto
 * é a janela em que o véu vai a `ALPHA_PICO` e a tela inteira vira uma cor só — e é DENTRO dela
 * que o roteiro troca a pintura.
 *
 * ⚠️ O CASAMENTO COM O ROTEIRO É UM NÚMERO EM DOIS LUGARES, e ele está aqui e no `STAGE_4`:
 * o `miniboss` de t=40 chama `encher()`, e o `cenario` de **t=40,7** cai no meio do surto
 * (`ENCHE_DUR` 0,62 + `SURTO_DUR` 0,16 = 0,78 para o pico completo, que se sustenta por
 * `SURTO_SEGURA` 0,3). Mexer num sem o outro devolve o corte seco. **A `probe-f4-agua` cobra
 * exatamente isto:** que no instante em que a pintura troca, a água esteja `cobrindo`.
 *
 * ⚠️ A ÁGUA É DECORAÇÃO PURA — nenhum corpo físico, nenhuma colisão, nenhum efeito no voo. É a
 * mesma separação da faixa da moldura, e pela mesma razão: física nova é onde bug de colisão mora,
 * e a arena do golfinho já é o trecho mais frágil da fase (ela SEGURA o relógio).
 */
export class Agua {
  // ─── OS TEMPOS (segundos) ───

  /** De seco a cheio. Curto: é uma câmara enchendo de golpe, não uma maré. */
  private static readonly ENCHE_DUR = 0.62;
  /** A subida do véu até o pico opaco, depois de cheio. */
  private static readonly SURTO_DUR = 0.16;
  /**
   * Quanto tempo o pico se SUSTENTA. ⚠️ É A JANELA EM QUE O ROTEIRO PODE TROCAR A PINTURA, e ela
   * foi medida, não escolhida: com 0,3 a captura pegou o `cenario` disparando com o véu ainda em
   * alpha 0,83 — 17% da pintura velha atravessando o "pico". Com 0,45 a janela vai de 0,78s a
   * 1,23s depois do `encher()`, e o evento de t=40,95 cai no meio dela com ~0,2s de folga dos
   * dois lados.
   */
  private static readonly SURTO_SEGURA = 0.45;
  /** Do pico até o repouso submerso. Longo: é o olho se acostumando com a água. */
  private static readonly ASSENTA_DUR = 0.55;
  /** A drenagem, quando o golfinho morre. */
  private static readonly ESVAZIA_DUR = 0.8;

  // ─── OS VALORES ───

  /**
   * O azul da água. ⚠️ ELE É ESCURO DE PROPÓSITO: o rumo da fase é *luz só onde há energia*, e um
   * azul claro por cima de tudo é justamente o "filtro de aquário" que apagaria o casco escuro.
   * Quem carrega a leitura de "submerso" são os FEIXES e as BOLHAS, não a saturação do véu.
   */
  private static readonly COR = 0x14495e;
  /** O véu enquanto a água sobe: dá para ver através, e é isso que faz ela ler como água. */
  private static readonly ALPHA_SUBINDO = 0.46;
  /** ⚠️ O pico. É ele que tapa a troca de pintura — abaixo de 0,9 a pintura velha vaza. */
  private static readonly ALPHA_PICO = 0.96;
  /** O repouso. Tem de deixar a nave, o golfinho e os tiros legíveis. */
  private static readonly ALPHA_SUBMERSO = 0.24;

  /** A linha da superfície: 2px acesos, e é o que diz que a água TEM superfície. */
  private static readonly COR_SUPERFICIE = 0x7fd4e8;

  /** Quantas bolhas no ar ao mesmo tempo. Pool fixo: nada é criado durante a arena. */
  private static readonly BOLHAS = 22;
  /** Quantos feixes de luz descendo do teto. */
  private static readonly FEIXES = 3;

  // ─── O ESTADO ───

  private estado: EstadoAgua = 'seco';
  /** O relógio contínuo da camada, só para as derivas. Não zera com a troca de estado. */
  private tempoVivo = 0;
  /** Quanto tempo já passou DENTRO do estado atual. */
  private t = 0;
  /** 0 = seca, 1 = cheia. É a fração da tela coberta pela massa de água. */
  private nivel = 0;
  /** O alpha corrente do véu — guardado para a sonda poder cobrar o `cobrindo`. */
  private alpha = 0;

  private readonly veu: Phaser.GameObjects.Rectangle;
  private readonly superficie: Phaser.GameObjects.Rectangle;
  private readonly bolhas: Phaser.GameObjects.Rectangle[] = [];
  private readonly feixes: Phaser.GameObjects.Rectangle[] = [];
  /** A deriva horizontal de cada bolha, em px/s, e a fase da oscilação. */
  private readonly bolhaDeriva: number[] = [];
  private readonly bolhaFase: number[] = [];
  private readonly bolhaVel: number[] = [];

  constructor(scene: Phaser.Scene) {
    // ⚠️ DEPTH 70–74: acima do primeiro plano (60), abaixo da HUD e das barras de chefão (99+).
    // A água é um lugar, então ela cobre até as vigas que passam na frente da nave; mas cobrir a
    // barra de vida do golfinho seria cobrar do jogador uma informação que a arena precisa dar.
    this.veu = scene.add
      .rectangle(0, GAME_HEIGHT, GAME_WIDTH, 0, Agua.COR)
      .setOrigin(0, 1)
      .setDepth(70)
      .setScrollFactor(0)
      .setAlpha(0)
      .setVisible(false);

    this.superficie = scene.add
      .rectangle(0, GAME_HEIGHT, GAME_WIDTH, 2, Agua.COR_SUPERFICIE)
      .setOrigin(0, 1)
      .setDepth(74)
      .setScrollFactor(0)
      .setAlpha(0)
      .setVisible(false);

    // OS FEIXES: luz do teto furando a água. ⚠️ ADITIVOS, e é a mesma lei do fio da moldura —
    // numa fase escura só luz ADICIONADA aparece; multiplicar cor em cima de preto devolve preto.
    for (let i = 0; i < Agua.FEIXES; i++) {
      this.feixes.push(
        scene.add
          .rectangle(0, 0, 26, GAME_HEIGHT * 1.6, 0x86e0ff)
          .setOrigin(0.5, 0)
          .setDepth(71)
          .setScrollFactor(0)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAngle(14)
          .setAlpha(0)
          .setVisible(false),
      );
    }

    // AS BOLHAS: quadradinhos de 1 e 2px. ⚠️ Quadrado, não círculo — num jogo de 384×216 um
    // círculo de 2px é um quadrado de 2px com passos a mais para chegar no mesmo lugar.
    for (let i = 0; i < Agua.BOLHAS; i++) {
      const g = i % 3 === 0 ? 2 : 1;
      this.bolhas.push(
        scene.add
          .rectangle(0, 0, g, g, 0xbfefff)
          .setDepth(72)
          .setScrollFactor(0)
          .setAlpha(0)
          .setVisible(false),
      );
      this.bolhaDeriva.push(0);
      this.bolhaFase.push(0);
      this.bolhaVel.push(0);
      this.recolocarBolha(i, true);
    }
  }

  /** A câmara está com água o bastante para esconder o que passa atrás? A sonda pergunta isto. */
  get cobrindo(): boolean {
    return this.nivel >= 0.999 && this.alpha >= 0.9;
  }

  /** Para a sonda e para quem for depurar: o estado e os dois números que o descrevem. */
  get estadoAtual(): { estado: EstadoAgua; nivel: number; alpha: number } {
    return { estado: this.estado, nivel: +this.nivel.toFixed(3), alpha: +this.alpha.toFixed(3) };
  }

  /**
   * ENCHE. Chamado pelo nascimento do golfinho — a câmara alaga junto com a chegada do bicho.
   *
   * ⚠️ Reentrante de propósito: trocar de golfinho no meio (a sonda faz isso) não pode empilhar
   * dois enchimentos nem ressetar uma água que já está cheia.
   */
  encher(): void {
    if (this.estado === 'enchendo' || this.estado === 'surto') return;
    // Já submerso: não recomeça do zero, só segura.
    if (this.estado === 'submerso') return;
    this.estado = 'enchendo';
    this.t = 0;
    this.veu.setVisible(true);
    this.superficie.setVisible(true);
    for (const b of this.bolhas) b.setVisible(true);
    for (const f of this.feixes) f.setVisible(true);
  }

  /** ESVAZIA. Chamado quando o golfinho sai de cena por qualquer caminho. */
  esvaziar(): void {
    if (this.estado === 'seco' || this.estado === 'esvaziando') return;
    this.estado = 'esvaziando';
    this.t = 0;
  }

  /** Corta tudo na hora, sem animação — troca de fase, `restart`, `G` para o chefão. */
  limpar(): void {
    this.estado = 'seco';
    this.t = 0;
    this.nivel = 0;
    this.alpha = 0;
    this.veu.setVisible(false).setAlpha(0);
    this.superficie.setVisible(false).setAlpha(0);
    for (const b of this.bolhas) b.setVisible(false);
    for (const f of this.feixes) f.setVisible(false);
  }

  update(dt: number): void {
    if (this.estado === 'seco') return;
    this.tempoVivo += dt;
    this.t += dt;

    switch (this.estado) {
      case 'enchendo': {
        const p = Math.min(1, this.t / Agua.ENCHE_DUR);
        // Desacelera no fim: água que para de subir de repente lê como barra de carregamento.
        this.nivel = Phaser.Math.Easing.Sine.Out(p);
        this.alpha = Agua.ALPHA_SUBINDO * Math.min(1, p * 2.2);
        if (p >= 1) {
          this.estado = 'surto';
          this.t = 0;
        }
        break;
      }
      case 'surto': {
        this.nivel = 1;
        const p = Math.min(1, this.t / Agua.SURTO_DUR);
        this.alpha = Phaser.Math.Linear(Agua.ALPHA_SUBINDO, Agua.ALPHA_PICO, p);
        // ⚠️ O pico SE SUSTENTA — é a janela em que o `cenario` do roteiro troca a pintura.
        if (this.t >= Agua.SURTO_DUR + Agua.SURTO_SEGURA) {
          this.estado = 'assentando';
          this.t = 0;
        }
        break;
      }
      case 'assentando': {
        const p = Math.min(1, this.t / Agua.ASSENTA_DUR);
        this.nivel = 1;
        this.alpha = Phaser.Math.Linear(Agua.ALPHA_PICO, Agua.ALPHA_SUBMERSO, Phaser.Math.Easing.Sine.InOut(p));
        if (p >= 1) {
          this.estado = 'submerso';
          this.t = 0;
        }
        break;
      }
      case 'submerso': {
        this.nivel = 1;
        // Respiração lenta no véu: água parada em alpha cravado lê como vidro colorido.
        this.alpha = Agua.ALPHA_SUBMERSO + Math.sin(this.t * 1.1) * 0.022;
        break;
      }
      case 'esvaziando': {
        const p = Math.min(1, this.t / Agua.ESVAZIA_DUR);
        this.nivel = 1 - Phaser.Math.Easing.Sine.In(p);
        this.alpha = Agua.ALPHA_SUBMERSO * (1 - p);
        if (p >= 1) {
          this.limpar();
          return;
        }
        break;
      }
    }

    this.desenhar(dt);
  }

  /** Põe no ecrã o que o estado calculou. Nenhuma regra mora aqui — só geometria. */
  private desenhar(dt: number): void {
    const altura = Math.round(this.nivel * GAME_HEIGHT);
    const linha = GAME_HEIGHT - altura;

    this.veu.setSize(GAME_WIDTH, altura).setAlpha(this.alpha);
    this.veu.y = GAME_HEIGHT;

    // A SUPERFÍCIE só existe enquanto a água se move: com a câmara cheia ela está fora da tela,
    // e desenhá-la no topo viraria um risco aceso colado no teto.
    const movendo = this.estado === 'enchendo' || this.estado === 'esvaziando';
    this.superficie.setVisible(movendo && altura > 1 && altura < GAME_HEIGHT);
    if (movendo) {
      this.superficie.y = linha + 2;
      this.superficie.setAlpha(0.75);
    }

    // OS FEIXES: descem do teto, derivam devagar e só aparecem com a água assentada — durante o
    // surto eles somem no branco, e durante o enchimento competem com a superfície.
    const luz = this.estado === 'submerso' || this.estado === 'assentando' ? 1 : 0;
    for (let i = 0; i < this.feixes.length; i++) {
      const f = this.feixes[i];
      const base = 70 + i * 128;
      // A deriva é lenta e em velocidades diferentes: feixes em passo igual leem como listras.
      f.x = ((base + this.tempoVivo * (7 + i * 3)) % (GAME_WIDTH + 120)) - 60;
      f.y = -20;
      f.setAlpha(luz * (0.05 + Math.sin(this.tempoVivo * 0.6 + i) * 0.018));
    }

    // AS BOLHAS: sobem, oscilam de lado, e morrem ao furar a superfície.
    for (let i = 0; i < this.bolhas.length; i++) {
      const b = this.bolhas[i];
      b.y -= this.bolhaVel[i] * dt;
      this.bolhaFase[i] += dt * 2.4;
      b.x += Math.sin(this.bolhaFase[i]) * this.bolhaDeriva[i] * dt;
      // Fora d'água (acima da linha) ela não existe; nasce de novo lá embaixo.
      if (b.y < linha + 2) this.recolocarBolha(i);
      b.setAlpha(this.estado === 'seco' ? 0 : Math.min(0.5, this.alpha * 1.6));
    }
  }

  /** Devolve uma bolha ao fundo da câmara, com velocidade e deriva próprias. */
  private recolocarBolha(i: number, inicial = false): void {
    const b = this.bolhas[i];
    b.x = Phaser.Math.Between(4, GAME_WIDTH - 4);
    // Na primeira montagem elas se espalham pela coluna toda; depois nascem sempre no fundo.
    b.y = inicial ? Phaser.Math.Between(0, GAME_HEIGHT) : GAME_HEIGHT + Phaser.Math.Between(0, 30);
    this.bolhaVel[i] = Phaser.Math.Between(16, 42);
    this.bolhaDeriva[i] = Phaser.Math.Between(6, 20);
    this.bolhaFase[i] = Math.random() * Math.PI * 2;
  }

  destroy(): void {
    this.veu.destroy();
    this.superficie.destroy();
    for (const b of this.bolhas) b.destroy();
    for (const f of this.feixes) f.destroy();
  }
}
