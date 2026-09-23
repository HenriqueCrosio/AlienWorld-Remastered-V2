import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './../config';
import { pickVariant } from '../art';

/** Em que ponto do ciclo a câmara está. Ver o comentário da classe para o porquê de cada um. */
type EstadoAgua = 'seco' | 'enchendo' | 'assentando' | 'submerso' | 'esvaziando';

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

  /**
   * De seco a cheio.
   *
   * ⚠️ ERA 0,62 E VIROU 2,6 NO TESTE JOGADO DE 12/09, e a mudança não é de gosto — é de MONTAGEM.
   * Veredicto dele: *"a água e o efeito da água ficaram ótimos. Mas achei o encher da tela muito
   * repentino e forçado... do jeito que está agora o efeito de encher a tela de água casa/atrapalha
   * com a chegada (aviso) do golfinho."* Dois eventos grandes disputando os mesmos 2 segundos.
   *
   * ⚠️ A RECEITA É DELE: *"enchendo até ficar completamente cheio na hora do golfinho, mesmo que
   * comece a encher antes do encontro"*. O roteiro passou a mandar encher em **t=36**, quatro
   * segundos antes do bicho — a câmara alaga, DEPOIS o habitante chega. A ordem dos dois deixa de
   * ser simultânea e vira dramaturgia: o lugar muda, e só então algo mora nele.
   */
  private static readonly ENCHE_DUR = 2.6;
  /**
   * A sobra do véu no instante em que a água topa, antes de assentar. ⚠️ SUBSTITUIU O `SURTO`, que
   * era um pico OPACO de alpha 0,96 — uma tela azul chapada para tapar a troca de pintura. Com o
   * enchimento adiantado ele deixou de ter função: quando a pintura troca, a água JÁ está cheia, e
   * quem esconde o corte é o mergulho no escuro que o `setPintura` sempre soube fazer — que é a
   * outra receita dele, *"tela preta por milissegundos e já aparecer cheia de água"*. O que sobra
   * aqui é um repuxo de 10% do véu, que lê como a água se acomodando.
   */
  private static readonly ASSENTA_DUR = 0.9;
  /** A drenagem, quando o golfinho morre. */
  private static readonly ESVAZIA_DUR = 0.8;

  // ─── OS VALORES ───

  /**
   * O azul da água. ⚠️ ELE É ESCURO DE PROPÓSITO: o rumo da fase é *luz só onde há energia*, e um
   * azul claro por cima de tudo é justamente o "filtro de aquário" que apagaria o casco escuro.
   * Quem carrega a leitura de "submerso" são os FEIXES e as BOLHAS, não a saturação do véu.
   */
  private static readonly COR = 0x14495e;
  /**
   * O véu enquanto a água sobe, e o repuxo do instante em que ela topa.
   *
   * ⚠️ ERA 0,46 E CAIU PARA 0,34: com o enchimento em 2,6s o véu fica visível quatro vezes mais
   * tempo, e o que era um lampejo virou estado. Dá para ver através dele o caminho todo — que é o
   * que faz a massa ler como ÁGUA e não como cortina.
   */
  private static readonly ALPHA_SUBINDO = 0.34;
  /** O repouso. Tem de deixar a nave, o golfinho e os tiros legíveis. */
  private static readonly ALPHA_SUBMERSO = 0.24;

  /** A linha da superfície: 2px acesos, e é o que diz que a água TEM superfície. */
  private static readonly COR_SUPERFICIE = 0x7fd4e8;

  /** Quantas bolhas no ar ao mesmo tempo. Pool fixo: nada é criado durante a arena. */
  private static readonly BOLHAS = 22;
  /** Quantos feixes de luz descendo do teto. */
  private static readonly FEIXES = 3;

  // ─── OS CANOS (12/09, 2ª rodada) ───

  /**
   * Quantos canos despejando ao mesmo tempo.
   *
   * ⚠️ ELES EXISTEM PORQUE ÁGUA SEM FONTE NÃO CONVENCE. Pedido dele, depois de jogar o
   * enchimento: *"se quiser implementar canos soltando a água, como um asset visual diferente.
   * Assim fica mais plausível"*. Até aqui o nível subia sozinho, e "sozinho" é exatamente o que
   * um cenário não pode fazer — o Leviatã engoliu uma doca, e doca tem encanamento.
   */
  private static readonly CANOS = 3;
  /** Gotas no ar, somadas todas as bocas. Pool fixo: nada nasce durante o enchimento. */
  private static readonly GOTAS = 30;
  /** A cor do jato e da gota. Clara e fria — é a única coisa em movimento rápido na tela. */
  private static readonly COR_JATO = 0x9fe4f5;
  /**
   * Onde o TOPO do cano fica, medido do topo da tela.
   *
   * ⚠️ 2, E NÃO 0: o flange tem de ficar enterrado na faixa do teto (que cobre y 0–26 na espessura
   * 16 — o que o roteiro mantém de t=37 a t=50, a arena inteira), para o cano ler como saindo da
   * parede em vez de colado por cima dela. Com a peça em ~43px de altura, a boca cai em y≈45:
   * 19px abaixo da faixa, que é o quanto um cano de descarga deve se projetar.
   */
  private static readonly CANO_Y = 2;

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
  private readonly canos: Phaser.GameObjects.Image[] = [];
  private readonly jatos: Phaser.GameObjects.Rectangle[] = [];
  private readonly respingos: Phaser.GameObjects.Rectangle[] = [];
  private readonly gotas: Phaser.GameObjects.Rectangle[] = [];
  /** O x de mundo de cada cano, em px de tela. Eles rolam; o sprite só segue este número. */
  private readonly canoX: number[] = [];
  private readonly gotaVy: number[] = [];
  private readonly gotaDono: number[] = [];
  /** 0 a 1: o quanto os canos estão despejando. Sobe ao abrir e cai ao fechar, sem corte seco. */
  private forcaCano = 0;

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

    this.montarCanos(scene);
  }

  /**
   * A câmara já está CHEIA? A sonda pergunta isto em dois momentos, e os dois são invariantes que
   * saíram do teste jogado de 12/09:
   *
   * 1. **quando a pintura troca** — se a água ainda estivesse subindo, o jogador veria a câmara
   *    mudar de lugar E de nível ao mesmo tempo, que é a confusão que ele descreveu;
   * 2. **quando o golfinho nasce** — *"enchendo até ficar completamente cheio na hora do
   *    golfinho"*. O aviso dele tem de acontecer numa câmara parada.
   *
   * ⚠️ ELA SUBSTITUIU O `cobrindo`, que perguntava se o véu estava OPACO (alpha ≥ 0,9). Essa
   * pergunta morreu junto com o `surto`: não é mais a água que esconde o corte da pintura.
   */
  get cheia(): boolean {
    return this.nivel >= 0.999;
  }

  /** A água chegou ao repouso? É o que diz que a câmara parou de se mexer. */
  get assentada(): boolean {
    return this.estado === 'submerso';
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
    // Já enchendo, assentando ou cheia: não recomeça do zero nem empilha um segundo enchimento.
    if (this.estado !== 'seco' && this.estado !== 'esvaziando') return;
    this.estado = 'enchendo';
    this.t = 0;
    this.abrirCanos();
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
    this.forcaCano = 0;
    this.fecharCanos();
  }

  update(dt: number, worldSpeed = 0): void {
    if (this.estado === 'seco') return;
    this.tempoVivo += dt;
    this.t += dt;

    switch (this.estado) {
      case 'enchendo': {
        const p = Math.min(1, this.t / Agua.ENCHE_DUR);
        // ⚠️ SINE.INOUT, E NÃO SINE.OUT. Com 0,62s a saída rápida era o efeito; com 2,6s ela lia
        // como barra de carregamento — a água disparava e depois rastejava. O InOut faz a maré
        // COMEÇAR devagar também, e é a entrada suave que tira o "repentino" que ele apontou.
        this.nivel = Phaser.Math.Easing.Sine.InOut(p);
        this.alpha = Agua.ALPHA_SUBINDO * Math.min(1, p * 3);
        if (p >= 1) {
          this.estado = 'assentando';
          this.t = 0;
        }
        break;
      }
      case 'assentando': {
        const p = Math.min(1, this.t / Agua.ASSENTA_DUR);
        this.nivel = 1;
        // O repuxo: o véu cede os 10% que tinha a mais enquanto subia. Nada de pico opaco aqui —
        // ver o comentário do ASSENTA_DUR para o porquê de o `surto` ter morrido.
        this.alpha = Phaser.Math.Linear(Agua.ALPHA_SUBINDO, Agua.ALPHA_SUBMERSO, Phaser.Math.Easing.Sine.InOut(p));
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
    this.correrCanos(dt, worldSpeed, GAME_HEIGHT - Math.round(this.nivel * GAME_HEIGHT));
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

  /**
   * Monta os canos e o jato de cada um. Chamado uma vez, na construção.
   *
   * ⚠️ SEM A ARTE, A ÁGUA CONTINUA — arte entra asset por asset nesta fatia, e um enchimento que
   * dependesse do PNG para funcionar seria uma regressão esperando a próxima geração falhar.
   * Sem `f4Cano` não há cano nem jato; a maré sobe igual.
   */
  private montarCanos(scene: Phaser.Scene): void {
    if (!scene.textures.exists('f4Cano')) return;

    for (let i = 0; i < Agua.CANOS; i++) {
      // ⚠️ ORIGEM NO TOPO E Y FIXO EM 12: a faixa do teto cobre y 0–26 na espessura 16, que é o
      // que o roteiro mantém de t=37 a t=50 — a arena inteira. Com a peça ancorada em 12, o corpo
      // do cano fica DENTRO da faixa (lê como saindo da parede) e só a boca aparece embaixo dela.
      this.canos.push(
        scene.add
          .image(0, Agua.CANO_Y, pickVariant(scene, 'f4Cano'))
          .setOrigin(0.5, 0)
          // ⚠️ DEPTH −0,5, E NÃO 69 COMO O VÉU. O cano é MUNDO — parede do Leviatã, logo à frente
          // da faixa da moldura (−0,6) e atrás de tudo o que se joga. É isso que faz a água, ao
          // subir, PASSAR NA FRENTE dele: o véu está em 70, então o cano afunda conforme o nível
          // sobe, em vez de boiar por cima da própria enchente.
          .setDepth(-0.5)
          .setAlpha(0)
          .setVisible(false),
      );
      // O JATO: a coluna d'água entre a boca e a superfície. Ela é o corpo do despejo; as gotas
      // são o detalhe por cima. ⚠️ ADITIVA, pela mesma lei do fio da moldura — numa fase escura
      // só luz ADICIONADA aparece.
      this.jatos.push(
        scene.add
          .rectangle(0, 0, 3, 0, Agua.COR_JATO)
          .setOrigin(0.5, 0)
          .setDepth(-0.5)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0)
          .setVisible(false),
      );
      // O RESPINGO: a marca no ponto em que o jato fura a superfície.
      this.respingos.push(
        scene.add
          .rectangle(0, 0, 9, 2, Agua.COR_JATO)
          .setDepth(73)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0)
          .setVisible(false),
      );
      this.canoX.push(0);
    }

    for (let i = 0; i < Agua.GOTAS; i++) {
      this.gotas.push(
        scene.add
          .rectangle(0, 0, 1, 2, Agua.COR_JATO)
          .setDepth(73)
          .setAlpha(0)
          .setVisible(false),
      );
      this.gotaVy.push(0);
      this.gotaDono.push(0);
    }
  }

  /** Espalha os canos pela largura da tela e acende o despejo. */
  private abrirCanos(): void {
    for (let i = 0; i < this.canos.length; i++) {
      // Espalhados com folga e um empurrão sorteado: três canos em passo igual leem como grade.
      this.canoX[i] = 40 + (i * GAME_WIDTH) / Agua.CANOS + Phaser.Math.Between(-18, 18);
      this.canos[i].setVisible(true);
      this.jatos[i].setVisible(true);
      this.respingos[i].setVisible(true);
    }
    for (let i = 0; i < this.gotas.length; i++) {
      this.gotaDono[i] = i % Math.max(1, this.canos.length);
      this.recolocarGota(i, true);
      this.gotas[i].setVisible(true);
    }
  }

  /** Apaga canos, jatos e gotas — sem animação. */
  private fecharCanos(): void {
    for (const c of this.canos) c.setVisible(false).setAlpha(0);
    for (const j of this.jatos) j.setVisible(false).setAlpha(0);
    for (const r of this.respingos) r.setVisible(false).setAlpha(0);
    for (const g of this.gotas) g.setVisible(false).setAlpha(0);
  }

  /** Devolve uma gota à boca do cano dono dela. */
  private recolocarGota(i: number, inicial = false): void {
    const dono = this.gotaDono[i];
    const g = this.gotas[i];
    g.x = this.canoX[dono] + Phaser.Math.Between(-2, 2);
    const boca = Agua.CANO_Y + (this.canos[dono]?.displayHeight ?? 16);
    // Na primeira montagem elas já nascem espalhadas na queda; depois, sempre na boca.
    g.y = inicial ? Phaser.Math.Between(boca, GAME_HEIGHT) : boca + Phaser.Math.Between(0, 4);
    this.gotaVy[i] = Phaser.Math.Between(90, 170);
  }

  /**
   * O despejo, quadro a quadro.
   *
   * ⚠️ OS CANOS ROLAM COM O MUNDO. Eles são parede do Leviatã, não sobreposição de tela: um cano
   * parado enquanto o corredor anda leria como marca d'água da interface. Quando um sai pela
   * esquerda, ele volta pela direita enquanto ainda houver o que despejar.
   */
  private correrCanos(dt: number, worldSpeed: number, linha: number): void {
    if (!this.canos.length) return;

    // O despejo só existe enquanto a água SOBE. Assentada, os canos fecham e saem de cena.
    const despejando = this.estado === 'enchendo';
    const alvo = despejando ? 1 : 0;
    this.forcaCano = Phaser.Math.Linear(this.forcaCano, alvo, Math.min(1, dt * 4));
    if (!despejando && this.forcaCano < 0.02) {
      this.fecharCanos();
      return;
    }

    for (let i = 0; i < this.canos.length; i++) {
      this.canoX[i] -= worldSpeed * dt;
      if (this.canoX[i] < -40) this.canoX[i] = GAME_WIDTH + Phaser.Math.Between(10, 70);

      const cano = this.canos[i];
      cano.x = Math.round(this.canoX[i]);
      cano.setAlpha(this.forcaCano);

      const boca = Agua.CANO_Y + cano.displayHeight;
      const queda = Math.max(0, linha - boca);
      const jato = this.jatos[i];
      jato.x = cano.x;
      jato.y = boca;
      jato.setSize(3, queda);
      // O jato treme de largura: coluna de espessura cravada lê como barra de progresso.
      jato.scaleX = 1 + Math.sin(this.tempoVivo * 9 + i * 2) * 0.25;
      jato.setAlpha(this.forcaCano * 0.32);

      const r = this.respingos[i];
      r.x = cano.x;
      r.y = linha + 1;
      r.scaleX = 1 + Math.sin(this.tempoVivo * 13 + i) * 0.3;
      r.setAlpha(queda > 4 ? this.forcaCano * (0.3 + Math.sin(this.tempoVivo * 17 + i * 3) * 0.12) : 0);
    }

    for (let i = 0; i < this.gotas.length; i++) {
      const g = this.gotas[i];
      this.gotaVy[i] += 260 * dt; // gravidade
      g.y += this.gotaVy[i] * dt;
      g.x -= worldSpeed * dt;
      g.setAlpha(this.forcaCano * 0.7);
      // Morre ao furar a superfície — ou ao ficar para trás do próprio cano.
      if (g.y >= linha || g.x < -6) this.recolocarGota(i);
    }
  }

  destroy(): void {
    this.veu.destroy();
    this.superficie.destroy();
    for (const b of this.bolhas) b.destroy();
    for (const f of this.feixes) f.destroy();
    for (const c of this.canos) c.destroy();
    for (const j of this.jatos) j.destroy();
    for (const r of this.respingos) r.destroy();
    for (const g of this.gotas) g.destroy();
  }
}
