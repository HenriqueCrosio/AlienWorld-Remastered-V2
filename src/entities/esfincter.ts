import Phaser from 'phaser';
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
        .setDepth(-0.55)
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
    for (let i = 0; i < Esfincter.PEDACOS; i++) {
      const p = this.scene.add
        .sprite(x, y, 'f4GoreSheet', i % Esfincter.GORE_QUADROS)
        .setDepth(-0.42)
        .setName('f4Gore');
      const vx = 150 + Math.random() * 260;
      const vy = (Math.random() - 0.5) * 190;
      this.scene.tweens.add({
        targets: p,
        x: x + vx * 1.6,
        y: y + vy * 1.6,
        angle: (Math.random() - 0.5) * 540,
        alpha: { from: 1, to: 0 },
        duration: 1100 + Math.random() * 700,
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }
    this.fx.explode(x, y, 2.2);
  }

  limpar(): void {
    this.cano?.destroy();
    this.cano = undefined;
    this.nuvem?.destroy();
    this.nuvem = undefined;
    this.zonaGas?.destroy();
    this.zonaGas = undefined;
    this.criatura = undefined;
    this.acesa = false;
    this.relogio = 0;
  }
}
