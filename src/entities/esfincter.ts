import Phaser from 'phaser';
import { SCROLL_SPEED } from '../config';
import type { Fx } from '../systems/Fx';


/**
 * A SOLEIRA DO NÚCLEO — a cena do esfíncter, em três tempos: o gás VAZA, o gás fica DENSO, e o
 * primeiro tiro ACENDE.
 *
 * ⚠️ A NUVEM ENGROSSA ANTES DE ACENDER, E ISSO NÃO É ENFEITE. Num shmup o dedo já está no
 * gatilho. Se qualquer tiro acendesse no instante em que a criatura aparece, ela morreria em
 * ~0,2s e o jogador não veria nada — nem a criatura, nem o gás, nem o motivo. O acúmulo é o que
 * transforma o tiro numa espera em que ele SABE o que vem, e a antecipação é a peça inteira.
 * Pedido dele em 21/09: *"pensei em algo fácil, mas dinâmico"* — o fácil é o tiro, o dinâmico é
 * a espera.
 *
 * ⚠️ QUALQUER TIRO SERVE. A nuvem cobre a faixa inteira do corredor, então todo tiro atravessa
 * gás por construção. O gás existe para o estouro ser plausível e gigante, NÃO para ser
 * resolvido — não é um enigma de mira, e transformá-lo num travaria o jogador a segundos do
 * chefão.
 *
 * ⚠️ O CONE DISPARA PARA A DIREITA, para dentro do núcleo. É regra de JOGO, não de estilo: um
 * estouro que se abrisse para trás mataria o jogador pelo próprio acerto.
 *
 * ⚠️ TUDO AQUI É ARTE ASSADA. Nenhum `Graphics`, nenhum retângulo em tempo de jogo — a lei mais
 * cara da Fatia 7, e a razão de o 1º fim do predador ter sido reprovado na hora (*"ficou gerado e
 * sem custos"*).
 *
 * ⚠️ E ELA MORA FORA DA `GameScene` de propósito: a cena já é grande, e a soleira tem estado
 * próprio (a fase da nuvem, o relógio, a criatura que ela acompanha).
 */
export class Esfincter {
  /**
   * Quanto tempo a nuvem leva para ficar densa.
   *
   * ⚠️ É O KNOB DA PERGUNTA 1 DO TESTE JOGADO — *"a espera do gás engrossando é tensão, ou é tempo
   * morto?"*. Se for tempo morto, este número desce. É um número, não uma peça.
   */
  static readonly VAZANDO_MS = 1500;

  /** Quantos pedaços de gore partem para dentro do núcleo. */
  private static readonly PEDACOS = 14;

  /** Quantas artes de pedaço a folha tem (ver `_instalar-destroco.mjs`). */
  private static readonly GORE_QUADROS = 7;

  /** Quantas artes de víscera a folha tem (ver `_instalar-destroco.mjs`). */
  private static readonly VISCERA_QUADROS = 13;

  /**
   * Quantas vísceras voam, ALÉM das placas de casco.
   *
   * ⚠️ MENOS QUE AS 14 PLACAS, e não por economia: elas ficam em cima da ferida enquanto as placas
   * já saíram do quadro, então é o número delas que decide se o estouro lê como *matéria* ou como
   * *mancha*. A 11 as formas ainda se separam; acima disso elas se empilham no mesmo lugar e a
   * leitura de "pedaço" — que é a razão de elas existirem — some.
   */
  private static readonly VISCERAS = 11;

  /**
   * Quantas gotas o jorro cospe.
   *
   * ⚠️ SUBIU DE 46 PARA 64 EM 22/09, e não por gosto: a folha das três variações mostrou que a bola
   * de fogo do `fx.explode` toma a tela inteira nos primeiros ~0,4s — justamente o instante da
   * ignição. O que o jogador vê de sangue é o que ainda está NO AR depois que o clarão sai da
   * frente, então o jorro precisa ser grande o bastante para sobreviver a ele.
   */
  private static readonly GOTAS = 64;

  /** Quantos calibres a folha de gota tem (ver `_assar-sangue.mjs`). */
  private static readonly GOTA_CALIBRES = 6;

  /**
   * A gravidade do esguicho, px/s². Gota que voa reto lê como faísca; o que a faz LÍQUIDA é cair.
   *
   * ⚠️ E ELA CAIU DE 620 PARA 220 JUNTO COM O ALONGAMENTO DO VOO. São o mesmo número visto de dois
   * lados: a 620, uma gota que vive 1,5s desce 700px — sete vezes a altura útil do corredor, ou
   * seja, ela deixa a tela por BAIXO antes de qualquer um ver que era sangue.
   */
  private static readonly QUEDA = 220;

  /** A folga entre as mangueiras e a criatura, em px. Elas ficam À FRENTE dela. */
  private static readonly CANO_ADIANTE = 62;

  /**
   * Quantos px da PLACA das mangueiras ficam ENTERRADOS na banda do teto.
   *
   * ⚠️ PEDIDO DELE DEPOIS DE JOGAR: *"quero que suba até 'enfiar' alguns pixels da base da
   * mangueira no teto da borda"*. Encostada exatamente na linha da superfície, a placa lia como
   * POUSADA na parede — um objeto apoiado, não preso. Enfiada, ela lê como ARRANCADA de dentro
   * dela, que é a ficção da peça inteira.
   *
   * ⚠️ É a mesma correção que a porta levou em `6fc3ac3` e que ele aprovou em 21/09: *"as pontas de
   * baixo são ângulos mais retos, bom que fiquem escondidas"*. Peça que invade a parede lê
   * encaixada; peça que encosta lê colada.
   */
  private static readonly CANO_ENTERRADO = 5;

  private cano?: Phaser.GameObjects.Sprite;
  private poca?: Phaser.GameObjects.Sprite;
  private nuvem?: Phaser.GameObjects.Sprite;
  private zonaGas?: Phaser.GameObjects.Zone;
  private criatura?: Phaser.Physics.Arcade.Sprite;
  private relogio = 0;
  private acesa = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Fx,
    /** A linha de BAIXO da faixa do teto naquela coluna. Ver `Moldura.superficieTetoEm`. */
    private readonly tetoEm: (xTela: number) => number,
    /**
     * O MEIO GEOMÉTRICO entre as duas superfícies naquela coluna — NÃO o `vaoEm`.
     *
     * ⚠️ E A DIFERENÇA ENTRE OS DOIS CUSTOU UMA VOLTA. O `vaoEm` é a linha NOMINAL do corredor, e
     * o corredor não é simétrico em volta dela: a `Moldura` soma relevos diferentes às duas bandas
     * (`relevoEm(n, 0)` no chão, `relevoEm(n, 37)` no teto). Medido no ponto onde a sonda falhava:
     * 92px do nominal até o teto contra 65px até o chão. Centrar a criatura no nominal abria 7px
     * de fresta EM CIMA e enterrava 20px embaixo — e 7px passa o corpo da nave, que tem 6.
     *
     * ⚠️ A PORTA USA O `vaoEm` E ESTÁ CERTA, porque ela tem 112px num vão de 84 a 68: os 14px de
     * folga de cada lado absorvem a assimetria. Esta peça tem 167px num corredor de ~172 e não
     * absorve nada. Mesmo problema, folgas diferentes, respostas diferentes.
     */
    private readonly meioEm: (xTela: number) => number,
  ) {}

  /** A zona que a bala tem de tocar. Some na ignição — a nuvem já pegou fogo. */
  get zona(): Phaser.GameObjects.Zone | undefined {
    return this.acesa ? undefined : this.zonaGas;
  }

  get denso(): boolean {
    return !this.acesa && this.relogio >= Esfincter.VAZANDO_MS;
  }

  get ativa(): boolean {
    return this.criatura !== undefined;
  }

  /** Planta a nuvem em cima da criatura. A partir daqui o relógio corre. */
  armar(criatura: Phaser.Physics.Arcade.Sprite): void {
    this.limpar();
    this.criatura = criatura;

    // ⚠️ O CANO QUEBRADO, NO TETO E À FRENTE DELA. É a CAUSA do gás, e sem ela a nuvem seria um
    // efeito sem origem — exatamente a queixa que derrubou o portão da cutscene 3 (*"apenas surge
    // um asset sem relação nenhuma com a arte"*). O jogador chega no cano ANTES da criatura, vê
    // de onde o gás sai, e só então encontra o que vai estourar.
    //
      // ⚠️ SÃO MANGUEIRAS SOLTAS, NÃO UM CANO — e a 1ª versão errou isto. O `f4Cano2` é um cano
    // INTEIRO com volante: ele lê como encanamento em ordem, e nada em ordem sobrevive numa parede
    // que está sendo digerida. Pedido dele depois de jogar: *"quero mangueiras soltas e soltando o
    // gás, parecidas com a do guardião"*. São os cabos arrancados do guardião, mesma língua.
    //
    // ⚠️ E A ARTE JÁ VAZA SOZINHA (9 quadros: elas balançam e a pluma sobe). A nuvem grande continua
    // existindo porque é ELA que o tiro acende — mas agora o gás tem ORIGEM, e não é mais um efeito
    // colado no ar.
    //
    // ⚠️ ANCORADO NA PAREDE, PELA `Moldura`, e não no topo da criatura. Deduzir o teto do sprite
    // dela fazia o cano FLUTUAR a meio corredor — o mesmo defeito que as passarelas levaram em
    // 13/09 (*"terminaram com o problema do início das passarelas flutuando"*). Quem sabe onde a
    // parede está é quem a desenha, e `superficieTetoEm` é o MESMO número que posiciona a faixa.
    //
    // ⚠️ E `setOrigin(0.5, 1)`: o cano pendura, então o que encosta na parede é a placa de CIMA
    // dele. Ancorar pelo topo o deixaria pendurado a partir do vazio.
    if (this.scene.textures.exists('f4MangueirasSheet')) {
      const x = criatura.x - Esfincter.CANO_ADIANTE;
      const m = this.scene.add
        .sprite(x, this.tetoEm(x) - Esfincter.CANO_ENTERRADO, 'f4MangueirasSheet')
        .setOrigin(0.5, 0)
        // ⚠️ DEPTH −0,61: ATRÁS DA BORDA (a faixa mora em −0,6), e isso é pedido dele de 22/09 —
        // *"coloque o cano de gás para trás do layer da borda, para parecer que ele está cravado
        // lá"*. A −0,55 a peça ficava À FRENTE da parede: os px que ela enfia no teto eram
        // DESENHADOS por cima dele, então a mangueira lia como colada na superfície — o defeito
        // exato que o `CANO_ENTERRADO` existia para resolver e não resolvia sozinho. Enterrar sem
        // mandar para trás é pintar a peça em cima do buraco em que ela deveria estar.
        //
        // ⚠️ E −0,61 é um degrau, não um número redondo: a saia mora em −0,62 e as bandas de placas
        // em −0,75. A mangueira tem de entrar ENTRE a face da parede e o enchimento dela.
        .setDepth(-0.61)
        .setName('f4Cano');
      if (this.scene.anims.exists('f4-mangueiras')) m.play('f4-mangueiras');
      this.cano = m;
    }

    // A nuvem nasce ENTRE o cano e a criatura, puxada para o lado do cano: o gás sai dali.
    //
    // ⚠️ DEPTH −0,45: À FRENTE da criatura (que mora em `DEPTH_NA_PAREDE`, −0,65) e atrás da nave
    // (0). O gás tem de passar POR CIMA dela, senão não lê como gás no ar — lê como mancha na
    // parede, que é o defeito que a arte provisória da porta já tinha documentado.
    this.nuvem = this.scene.add
      .sprite(criatura.x - Esfincter.CANO_ADIANTE / 2, criatura.y, 'f4GasSheet')
      .setDepth(-0.45)
      .setName('f4Gas');
    if (this.scene.anims.exists('f4-gas')) this.nuvem.play('f4-gas');

    // ⚠️ A ZONA É MAIS LARGA QUE A NUVEM (186 contra 128) e cobre do cano até depois da criatura.
    // É o que faz *qualquer tiro serve* ser verdade por construção, em vez de depender de o
    // jogador acertar o meio da pluma.
    this.zonaGas = this.scene.add.zone(criatura.x - Esfincter.CANO_ADIANTE / 2, criatura.y, 186, 176);
    this.scene.physics.world.enable(this.zonaGas);
    const corpo = this.zonaGas.body as Phaser.Physics.Arcade.Body;
    corpo.setAllowGravity(false);
    // A zona é carregada pela criatura no `update`, não por velocidade própria.
    corpo.moves = false;
  }

  update(): void {
    if (!this.criatura) return;

    // A criatura saiu de cena sem acender (o jogador não atirou e ela passou): recolhe tudo.
    if (!this.criatura.active) {
      this.limpar();
      return;
    }
    // ⚠️ O CANO CONTINUA ANDANDO DEPOIS DA IGNIÇÃO, e por isso esta linha vem ANTES do `acesa`:
    // ele sobreviveu ao estouro e tem de rolar com o mundo como qualquer peça de parede.
    const xc = this.criatura.x - Esfincter.CANO_ADIANTE;
    // ⚠️ O TETO É RELIDO A CADA QUADRO, e não guardado: a parede é uma ESCADA de placas de 128px e
    // ainda está recuando quando o cano entra. Um y congelado no nascimento descolaria no primeiro
    // degrau que passasse por baixo dele.
    this.cano?.setPosition(xc, this.tetoEm(xc) - Esfincter.CANO_ENTERRADO);

    // ⚠️ ELA SEGUE O MEIO DAS DUAS SUPERFÍCIES, NÃO FICA PARADA NA ALTURA EM QUE NASCEU — e isto é
    // conserto de um defeito que a sonda pegou, não enfeite.
    //
    // O corredor é uma CURVA e é ASSIMÉTRICO em volta da linha nominal: a `Moldura` soma relevos
    // diferentes às duas bandas (`relevoEm(n, 0)` no chão, `relevoEm(n, 37)` no teto). Nascendo
    // centrada e só rolando, a criatura chegava ao meio da tela com 7px de FRESTA em cima — e o
    // corpo da nave tem 6. A comporta ficava contornável por cima, o defeito que a porta existe
    // para não ter (*"porta que dá para contornar não é porta"*).
    //
    // ⚠️ A PORTA NÃO PRECISA DISTO, e a diferença é de FOLGA: 112px num vão de 84 a 68, ou seja
    // 14px sobrando de cada lado que absorvem a assimetria. A garganta tem 167px num corredor de
    // ~172 e não absorve nada. Mesmo problema, folgas diferentes, respostas diferentes.
    //
    // ⚠️ E O AJUSTE É POR DELTA NO `y`, NUNCA UM `body.reset` — a 1ª versão usou `reset` e
    // CONGELOU a criatura no ponto de nascimento (medido: x parado em 414 por 4s, com velocidade
    // −84 e `moves: true`). O `reset` reescreve a posição inteira todo quadro e a integração do
    // Arcade nunca acumula. É o mesmo congelamento que o `body.enable` causaria na lasca da porta,
    // pela mesma razão: **prop é movido por velocidade, e quem mexe na posição dele atropela isso.**
    // Mexer só no eixo que precisa mudar deixa o `x` em paz.
    // ⚠️ SÓ O CORPO, NUNCA O SPRITE JUNTO — a 2ª armadilha deste seguimento. Mexer nos dois faz a
    // correção ser APLICADA DUAS VEZES: o `postUpdate` do Arcade reescreve a posição do sprite a
    // partir do corpo depois da cena, então o que eu escrevo no sprite é descartado e o delta é
    // somado de novo no quadro seguinte. Medido: a criatura oscilava 16px por quadro (y alternando
    // 115/99/115/99) — em jogo ela VIBRARIA. Quem manda na posição de um prop com corpo é o corpo.
    //
    // ⚠️ E A ZONA MORTA DE 1px É CONTRA A ESCADA. A parede é feita de placas de 128px: num degrau a
    // superfície salta de uma vez, e sem a zona morta a criatura persegue cada arredondamento.
    const alvoY = this.meioEm(this.criatura.x);
    const dy = alvoY - this.criatura.y;
    if (Math.abs(dy) > 1) (this.criatura.body as Phaser.Physics.Arcade.Body).y += dy;

    // A poça anda colada na carcaça e RELÊ o chão, pela mesma razão do cano: a parede é uma escada
    // e um y congelado descolaria no primeiro degrau.
    if (this.poca) {
      const xp = this.criatura.x;
      this.poca.setPosition(xp, 2 * this.meioEm(xp) - this.tetoEm(xp));
    }

    if (this.acesa) return;

    this.relogio += this.scene.game.loop.delta;


    // ⚠️ A NUVEM ANDA COM A CRIATURA, LIDA DELA A CADA QUADRO. Ela é movida por velocidade como
    // todo prop; dar velocidade PRÓPRIA à nuvem criaria dois relógios que divergem, e uma nuvem
    // que descola da peça denuncia o truque. É a mesma razão de o `QUADRO` do predador ser
    // derivado da pose em vez de um segundo número.
    const { x, y } = this.criatura;
    const xg = x - Esfincter.CANO_ADIANTE / 2;
    this.nuvem?.setPosition(xg, y);
    this.zonaGas?.setPosition(xg, y);
    (this.zonaGas?.body as Phaser.Physics.Arcade.Body | undefined)?.reset(xg, y);
  }

  /**
   * A IGNIÇÃO. Devolve `false` se a nuvem ainda está só vazando — e é esse `false` que faz o
   * jogador esperar em vez de matar a cena no primeiro quadro.
   */
  acender(): boolean {
    if (!this.denso || !this.criatura) return false;
    this.acesa = true;

    const { x, y } = this.criatura;

    // 1 · A NUVEM VIRA O CLARÃO: ela some no mesmo quadro em que o cone entra. Gás que continua
    // vazando depois de pegar fogo é gás que não pegou fogo.
    this.nuvem?.destroy();
    this.nuvem = undefined;
    this.zonaGas?.destroy();
    this.zonaGas = undefined;

    // ⚠️ O CANO FICA. Ele não estourou — o que pegou fogo foi o gás que já tinha saído dele. Um
    // cano que some junto contaria que ele era parte da criatura, e ele é parte da PAREDE: rola
    // com o mundo até o culling, como a lasca da porta fica no duto.

    // 2 · O CONE. `setOrigin(0, 0.5)`: a ESQUERDA da arte é a boca dele, então ele nasce na
    // criatura e abre para a direita, para dentro do núcleo.
    const cone = this.scene.add
      .sprite(x, y, 'f4ConeSheet')
      .setOrigin(0, 0.5)
      .setDepth(-0.4)
      .setName('f4Cone');
    if (this.scene.anims.exists('f4-cone')) {
      cone.play('f4-cone');
      cone.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => cone.destroy());
      // ⚠️ O CONE ANDA COM O MUNDO. Sem isto ele fica parado na tela enquanto a parede rola por
      // baixo, e um estouro que não acompanha a peça que estourou lê como flash de interface.
      this.scene.tweens.add({
        targets: cone,
        x: x - 110 * 0.71,
        duration: 710,
      });
    } else {
      cone.destroy();
    }

    // 3 · O GORE — pedaços dela cuspidos para dentro do núcleo.
    this.cuspirGore(x, y);

    return true;
  }

  /**
   * OS PEDAÇOS. Todos vão para a DIREITA, com espalhamento vertical — é o cone que os empurra, e
   * um destroço que voltasse para a nave contaria a história errada.
   *
   * ⚠️ SÃO `GameObjects`, NÃO PROPS. Eles não têm corpo, não cobram vida e não seguram tiro: o
   * jogador já ganhou quando eles nascem. Dar corpo a destroço de comemoração é cobrar duas vezes.
   */
  private cuspirGore(x: number, y: number): void {
    // ⚠️ AS DUAS FOLHAS SAEM JUNTAS, e isso é a escolha dele de 22/09: *"mantém a carcaça que já
    // temos e segue, gostei das gerações de pedaços e sangue"*. As três variações que ele viu eram
    // um eixo MEU — casco OU víscera, sangue no ar OU na cena —, e ele não escolheu um lado: gostou
    // das duas coisas novas. O eixo era falso, e o bicho concorda: uma criatura de casco com
    // matéria mole dentro, arrombada, cospe as DUAS.
    //
    // ⚠️ E ELAS SE COMPLETAM EM VEZ DE COMPETIR, porque ocupam tempos e lugares diferentes. A placa
    // é seca, voa longe e some rápido — ela diz *aquilo era uma peça dele* de relance, que foi
    // exatamente o veredicto dele sobre os cacos (*"não se nota tanto os detalhes... servem para o
    // propósito"*). A víscera é lenta, fica em cima da ferida e segura a opacidade — ela diz *aquilo
    // era um BICHO*, e precisa de tempo para dizer.
    this.arremessar(x, y, 'f4GoreSheet', Esfincter.GORE_QUADROS, Esfincter.PEDACOS, false);
    this.arremessar(x, y, 'f4VisceraSheet', Esfincter.VISCERA_QUADROS, Esfincter.VISCERAS, true);

    this.jorrar(x, y, Esfincter.GOTAS);
    this.sujarAParede(x);
    this.abrirPoca(x);
    this.sangrarNaTela();

    this.fx.explode(x, y, 2.2);
  }

  /**
   * UM ARREMESSO DE PEDAÇOS — uma folha, um número, um jeito de voar.
   *
   * ⚠️ `molhado` NÃO É UM ENFEITE, É O QUE SEPARA AS DUAS MATÉRIAS. A placa de casco e a víscera
   * saem do mesmo ponto no mesmo quadro; se voassem igual, a segunda folha seria só "mais cacos".
   */
  private arremessar(
    x: number,
    y: number,
    folha: string,
    quadros: number,
    n: number,
    molhado: boolean,
  ): void {
    if (!this.scene.textures.exists(folha)) return;
    for (let i = 0; i < n; i++) {
      const p = this.scene.add.sprite(x, y, folha, i % quadros).setDepth(-0.42).setName('f4Gore');
      // ⚠️ A VÍSCERA VOA MENOS LONGE QUE A PLACA, e isto é geometria de TELA, não gosto. A criatura
      // morre a ~130px da borda direita; a placa percorre 240 a 656px, ou seja ela deixa o quadro em
      // 0,3 a 0,5s. Para a placa isso é CERTO e ele aprovou assim. A víscera só diz "isso era um
      // bicho" se der tempo de ver a forma — e fora do quadro ela não diz nada.
      //
      // ⚠️ E O NÚMERO TEVE DE CAIR DUAS VEZES, porque a 1ª correção media a coisa errada. A 95–280
      // elas ainda saíam do quadro antes de aparecer — não porque fossem rápidas, mas porque a bola
      // de fogo do `fx.explode` tapa tudo por ~0,45s: o que conta não é quanto elas voam, é onde
      // elas estão QUANDO O CLARÃO SAI. A 45–165 elas ainda estão em cima da ferida nesse instante.
      const vx = (molhado ? 45 : 150) + Math.random() * (molhado ? 120 : 260);
      // A víscera é PESADA: ela abre mais para baixo do que para cima, e a placa não.
      const vy = molhado ? (Math.random() - 0.32) * 230 : (Math.random() - 0.5) * 190;
      // ⚠️ A VÍSCERA GIRA MENOS. A placa pode rodopiar 540° porque é uma PLACA: girando, ela continua
      // lendo como placa. Matéria mole rodopiando vira borrão.
      const dur = (molhado ? 1500 : 1100) + Math.random() * 700;
      this.scene.tweens.add({
        targets: p,
        x: x + vx * 1.6,
        y: y + vy * 1.6,
        angle: (Math.random() - 0.5) * (molhado ? 260 : 540),
        // ⚠️ A VÍSCERA SEGURA A OPACIDADE E SÓ APAGA NO FIM (`Quint.easeIn`), a placa some parelho
        // como sempre. Não é capricho: a placa lê de relance pela SILHUETA, que sobrevive a meio
        // alpha; a víscera lê pela MATÉRIA — cor e textura —, e matéria a 50% de opacidade sobre uma
        // parede pintada vira tinta. Ou ela está lá, ou ela não está.
        alpha: molhado ? { from: 1, to: 0, ease: 'Quint.easeIn' } : { from: 1, to: 0 },
        duration: dur,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
      this.rastroMolhado(x, y, vx, vy, dur);
    }
  }

  /**
   * A CAUDA DE CADA PEDAÇO: duas gotas atrás dele, na mesma direção e um pouco mais curtas.
   *
   * ⚠️ ELA EXISTE POR CAUSA DO QUE ELE DISSE SOBRE A 2ª VOLTA — *"a explosão é rápida e não se nota
   * tanto os detalhes dos cacos"*. A resposta não é desacelerar o estouro (ele APROVOU a
   * velocidade): é dar ao caco uma coisa que se lê SEM detalhe. Um rastro molhado atrás de uma peça
   * que passa voando diz "isso saiu de um corpo" num quadro só, e a silhueta não precisa ser lida.
   */
  private rastroMolhado(x: number, y: number, vx: number, vy: number, dur: number): void {
    if (!this.scene.textures.exists('f4SangueSheet')) return;
    for (let k = 1; k <= 2; k++) {
      const encolhe = 1 - k * 0.22;
      const g = this.scene.add.sprite(x, y, 'f4SangueSheet', 3 - k).setDepth(-0.43).setName('f4Sangue');
      this.scene.tweens.add({
        targets: g,
        x: x + vx * 1.6 * encolhe,
        y: y + vy * 1.6 * encolhe + k * 4,
        alpha: { from: 0.95, to: 0 },
        duration: dur * 0.78,
        ease: 'Quad.easeOut',
        onComplete: () => g.destroy(),
      });
    }
  }

  /**
   * O JORRO — o esguicho dela, para dentro do núcleo.
   *
   * ⚠️ E O SANGUE DELA NÃO É VERMELHO. Medida a `garganta.png`: o corpo é azul-roxo quase preto e a
   * luz mora só na goela, em magenta (#ad1f5d, #ed2778). O carmim do `sangue.ts` do predador é a
   * paleta de OUTRO bicho e brigaria com a criatura de onde ele sai — é o mesmo motivo pelo qual os
   * cacos são recortados dela em vez de gerados. Ver `_assar-sangue.mjs`.
   *
   * ⚠️ A PARÁBOLA É CONTADA NO `onUpdate`, não por corpo de física. Gota é decoração, e dar corpo a
   * 46 delas põe 46 entradas na árvore de colisão do quadro mais cheio da fase — pelo mesmo
   * argumento dos cacos ("o jogador já ganhou quando eles nascem"). O `addCounter` é o idioma que o
   * `fimDoPredador` e o `Predador` já usam para movimento contado à mão.
   */
  private jorrar(x: number, y: number, n: number): void {
    if (!this.scene.textures.exists('f4SangueSheet')) return;
    for (let i = 0; i < n; i++) {
      // Um em cada cinco é NACO. Um esguicho só de pontinhos lê como faísca; o naco é o que dá
      // matéria, e ele tem de ser minoria para não virar uma segunda chuva de cacos.
      const calibre =
        i % 3 === 0
          ? Esfincter.GOTA_CALIBRES - 2 + Math.floor(Math.random() * 2)
          : 1 + Math.floor(Math.random() * (Esfincter.GOTA_CALIBRES - 3));
      const g = this.scene.add.sprite(x, y, 'f4SangueSheet', calibre).setDepth(-0.41).setName('f4Sangue');
      // ⚠️ MENOS A ROLAGEM DO MUNDO. Sem isto o esguicho anda no referencial da TELA e descola da
      // parede que estourou — o mesmo defeito que obrigou o cone a ganhar o tween de acompanhar.
      // ⚠️ O ESGUICHO É LENTO E ABRE MAIS PARA CIMA E PARA BAIXO QUE PARA A FRENTE — e a 1ª versão
      // errou isto feio. A 180–600px/s as gotas varriam os ~130px até a borda direita em 0,3s: na
      // folha de 22/09 elas viraram uma poeira de pontinhos saindo pelo canto, e o que o olho pegava
      // era um chuvisco de detrito, não sangue. Leque que ABRE e CAI em cima da ferida fica em
      // quadro o tempo todo em que o clarão está saindo da frente.
      const vx = 100 + Math.random() * 240 - SCROLL_SPEED;
      const vy = (Math.random() - 0.5) * 330;
      // ⚠️ O VOO É LONGO DE PROPÓSITO (era 520–1220ms). O clarão do `fx.explode` some por volta de
      // 0,4s; um esguicho que morre em 0,5s nasce e morre ESCONDIDO atrás dele. O que sobra na tela
      // depois do fogo é a variação inteira.
      const dur = 760 + Math.random() * 900;
      const seg = dur / 1000;
      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: dur,
        onUpdate: (tw) => {
          const k = tw.getValue() ?? 0;
          const t = seg * k;
          g.x = x + vx * t;
          g.y = y + vy * t + 0.5 * Esfincter.QUEDA * t * t;
          g.alpha = k > 0.72 ? 1 - (k - 0.72) / 0.28 : 1;
        },
        onComplete: () => g.destroy(),
      });
    }
  }

  /**
   * A POÇA — o que escorre da carcaça e se junta no chão, embaixo dela.
   *
   * ⚠️ ELA CRESCE, não nasce pronta: uma poça inteira no quadro da ignição lê como decalque colado.
   * O `scaleX` subindo de 0,25 a 1 em 1,4s é o líquido CHEGANDO, e é o que faz o estouro continuar
   * acontecendo depois que o clarão passa.
   *
   * ⚠️ E ELA SEGUE A CARCAÇA (ver o `update`), o que é o mesmo que rolar com o mundo: a carcaça é
   * movida por velocidade como todo prop, então colar a poça nela é colá-la na parede de graça.
   */
  private abrirPoca(x: number): void {
    if (!this.scene.textures.exists('f4Poca')) return;
    const chao = 2 * this.meioEm(x) - this.tetoEm(x);
    this.poca = this.scene.add
      .sprite(x, chao, 'f4Poca')
      .setOrigin(0.5, 1)
      .setDepth(-0.58)
      .setAlpha(0)
      .setScale(0.25, 0.6)
      .setName('f4Poca');
    this.scene.tweens.add({
      targets: this.poca,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 1400,
      delay: 120,
      ease: 'Quad.easeOut',
    });
  }

  /**
   * O QUE GRUDA NA PAREDE — cinco respingos nas duas bandas, depois do ponto do estouro.
   *
   * ⚠️ ELES ROLAM COM O MUNDO, senão não são parede: mancha parada na tela enquanto o corredor
   * passa por baixo lê como sujeira na lente. É a mesma correção que o cone levou.
   *
   * ⚠️ E O CHÃO É DEDUZIDO, não recebido: `meioEm` é o ponto médio das duas superfícies, então
   * `chão = 2·meio − teto`. Pedir um terceiro callback ao construtor por uma peça de enfeite seria
   * alargar a interface da `Moldura` para nada.
   */
  private sujarAParede(xIgn: number): void {
    if (!this.scene.textures.exists('f4RespingoSheet')) return;
    const VIDA = 5200;
    for (let i = 0; i < 5; i++) {
      const x = xIgn + 12 + Math.random() * 150;
      const noTeto = i % 2 === 0;
      const teto = this.tetoEm(x);
      const chao = 2 * this.meioEm(x) - teto;
      const m = this.scene.add
        .sprite(x, noTeto ? teto + 1 : chao - 1, 'f4RespingoSheet', i % 4)
        // No teto ele PENDURA (as escorridas descem da superfície); no chão ele se apoia.
        .setOrigin(0.5, noTeto ? 0 : 1)
        // ⚠️ −0,59, NÃO −0,6: a faixa da `Moldura` mora exatamente em −0,6, e empate de depth no
        // Phaser se resolve pela ORDEM DE CRIAÇÃO. Funcionava por acidente (o respingo nasce
        // depois), e ia parar de funcionar no dia em que a parede fosse recriada durante a cena.
        .setDepth(-0.59)
        .setAlpha(0)
        .setName('f4Respingo');
      this.scene.tweens.add({ targets: m, alpha: 1, duration: 80, delay: 40 + i * 30 });
      this.scene.tweens.add({
        targets: m,
        x: x - SCROLL_SPEED * (VIDA / 1000),
        duration: VIDA,
        onComplete: () => m.destroy(),
      });
    }
  }

  /**
   * O VIDRO SUJO — cinco manchas presas à câmera.
   *
   * ⚠️ ELAS SOMEM MUITO ANTES DO CHEFÃO. A ignição cai em t≈110,7 e o chefão entra em t=118:
   * ninguém começa a luta olhando através do próprio troféu. É a lei que o `sangueNaTela` do
   * predador já cravou — *"escorrem e somem ANTES de a arma destravar"*.
   *
   * ⚠️ E ELAS FICAM NA METADE DIREITA. O respingo vem da criatura, que está à frente; mancha em
   * cima da nave taparia justamente o que o jogador precisa ver para não bater na parede.
   */
  private sangrarNaTela(): void {
    if (!this.scene.textures.exists('f4RespingoSheet')) return;
    for (let i = 0; i < 5; i++) {
      const m = this.scene.add
        .sprite(Phaser.Math.Between(150, 366), Phaser.Math.Between(24, 186), 'f4RespingoSheet', i % 4)
        .setScrollFactor(0)
        .setDepth(94)
        .setAngle(Phaser.Math.Between(-25, 25))
        .setAlpha(0)
        .setName('f4SangueTela');
      this.scene.tweens.add({ targets: m, alpha: 0.9, duration: 70, delay: 30 + i * 25 });
      this.scene.tweens.add({
        targets: m,
        y: m.y + 14,
        alpha: 0,
        delay: 620 + i * 90,
        duration: 900,
        ease: 'Sine.easeIn',
        onComplete: () => m.destroy(),
      });
    }
  }

  limpar(): void {
    this.cano?.destroy();
    this.cano = undefined;
    this.poca?.destroy();
    this.poca = undefined;
    this.nuvem?.destroy();
    this.nuvem = undefined;
    this.zonaGas?.destroy();
    this.zonaGas = undefined;
    this.criatura = undefined;
    this.acesa = false;
    this.relogio = 0;
  }
}
