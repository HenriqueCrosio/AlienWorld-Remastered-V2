import Phaser from 'phaser';
import { GROUND_Y, TETO_Y } from './TerrainSystem';

/**
 * Uma PLACA do mundo: o pedaço de 128px que a peça da faixa cobre. Vão, espessura e mesa derivam
 * todos da MESMA placa — ver a nota da grade em `Moldura`.
 */
interface Placa {
  /** O centro do vão nesta placa, em px de tela. Já ARREDONDADO: o vão medido tem de ser inteiro. */
  vaoY: number;
  /** Quantas placas seguidas saíram nesta MESMA altura (1..3). Ver `gerar`. */
  repetida: number;
  /** A linha de cima da faixa do chão, em y de tela. Já com a trava aplicada. */
  superficieChao: number;
  /** A linha de baixo da faixa do teto, em y de tela. Já com a trava aplicada. */
  superficieTeto: number;
  /**
   * O `gap` sob o qual esta placa nasceu.
   *
   * ⚠️ ELE EXISTE PARA A TRAVA DOS 8px SER MEDÍVEL, e já foi removido uma vez por parecer peso
   * morto — o que deixou a sonda sem como aferir a própria invariante que ela cobra. A trava é
   * aplicada com o `gap` VIGENTE NA HORA em que a placa nasce; quando o roteiro alarga o corredor
   * (t=37: 96→104, e t=63,5: 76→84, ambos +8px), as placas ainda na tela pertencem ao regime
   * antigo. Medi-las contra o `gap` corrente devolve 4px onde a trava garantiu 8 — e é a MEDIDA
   * que está errada, não a parede: a superfície continua fora do corredor, com menos folga, até
   * as placas velhas saírem da tela.
   */
  gap: number;
}

/**
 * A MOLDURA DA FASE 4 — a faixa contínua e a curva do vão.
 *
 * ⚠️ ELA EXISTE PORQUE "SEM NEXO" ERA UM FATO DO CÓDIGO, NÃO UMA IMPRESSÃO. Até 08/09 cada par de
 * colunas sorteava um `vaoY` NOVO no alcance inteiro (`GameScene.spawnCorredores`), então duas
 * colunas seguidas não tinham relação nenhuma — e foi isso que o Henrique leu como *"assets
 * jogados na cena"*. A altura do corredor agora deriva de x (a posição no mundo), não de um
 * sorteio por batida.
 *
 * ⚠️ A SEPARAÇÃO MAIS IMPORTANTE DESTE ARQUIVO: a FAIXA é decoração pura, sem corpo físico; quem
 * colide é a MESA, com o mesmo `gap` que o roteiro já manda. É por isso que a linha de base
 * `corredores {"chao":3,"teto":3,"vaos":[110,110,110]}` da `probe-stage4` sobrevive e **nenhuma
 * física nova entra** — que é onde bug de colisão mora.
 *
 * ⚠️ A GRADE DE 128px É O QUE FAZ A TRAVA SER EXATA. O mundo é dividido em placas da largura da
 * peça da faixa, e vão, espessura e mesa derivam todos da MESMA placa. Sem a grade, a superfície
 * variaria dentro de um segmento e a trava dos 8px viraria aproximação — e aproximação em cima do
 * vão é exatamente o que come a linha de base.
 */
export class Moldura {
  /** A largura de um segmento da faixa, e da grade do mundo. 128 ÷ 84 = 1,52s por placa. */
  static readonly LARGURA = 128;

  /**
   * ⚠️ A TRAVA. A superfície da faixa nunca chega a menos de 8px da borda do vão. O desenho cede,
   * o vão nunca — é um assert da sonda, não uma boa intenção.
   */
  static readonly FOLGA = 8;

  /**
   * O passo máximo de um degrau. ⚠️ É ESTE NÚMERO que substitui o sorteio: hoje o vão pula até
   * 38px entre batidas; com 14 ele ANDA. Se o Henrique achar a fase monótona no teste jogado, é o
   * primeiro número a subir.
   */
  static readonly PASSO_MAX = 14;

  /**
   * ⚠️ O TETO DA ESPESSURA, e ele é uma conta, não um gosto: a peça tem 64px de altura e é
   * ancorada pela SUPERFÍCIE, sem crop e sem escala. Para ela ainda alcançar a borda da tela,
   * `espessura + relevo` não pode passar de 54 (206 − 54 + 64 = 216 = a base da tela; 10 + 54 −
   * 64 = 0 = o topo). Passar disso abriria uma fresta entre a faixa e a borda.
   */
  static readonly ESPESSURA_MAX = 54;

  /** A margem das bordas da tela: um vão colado no teto obriga a raspar onde não se vê o que vem. */
  private static readonly MARGEM = 24;

  /**
   * O capricho da espessura, placa a placa. É o que impede a faixa de ser uma régua reta — e é
   * DECORAÇÃO, então sai do fluxo de acaso da ARTE (`Math.random`), nunca do fluxo do jogo.
   */
  private static readonly RELEVO = 10;

  /** Quantos segmentos por lado. 4 × 128 = 512 ≥ 384 + 128 de folga de rolagem. */
  private static readonly SEGMENTOS = 4;

  /** px/s com que a espessura persegue o alvo. Calibragem: o teste jogado decide. */
  private static readonly RAMPA = 8;

  /** A distância que o mundo já rolou, em px. É o eixo de tudo. */
  private xMundo = 0;

  private readonly placas = new Map<number, Placa>();
  /** O maior índice de placa já gerado. A geração é sempre para a FRENTE. */
  private ultima = -1;

  private gap = 0;
  /** A espessura pedida pelo roteiro (evento `moldura`). Ver `setEspessura`. */
  private alvo = 0;
  /** A espessura em vigor — ela persegue o alvo (ver `avanca`), porque parede não salta. */
  espessura = 0;

  private readonly chao: Phaser.GameObjects.Image[] = [];
  private readonly teto: Phaser.GameObjects.Image[] = [];

  /**
   * @param desenha Só a Fase 4 recebe os SPRITES da faixa. A CURVA (`avanca`, `vaoEm`,
   * `superficieChaoEm`/`superficieTetoEm`) roda sempre — é matemática pura, não custa nada, e é
   * o que o comentário do `create()` promete.
   *
   * ⚠️ ISTO NÃO É CAUTELA, É CONSERTO DE UM BUG JÁ MEDIDO: a `BootScene` carrega `ART` (e
   * `f4Faixa` com ele) GLOBALMENTE, então `scene.textures.exists('f4Faixa')` sozinho é verdadeiro
   * em TODA fase — os 8 sprites da faixa nasciam nas Fases 1, 2 e 3 também. A peça é OPACA de
   * ponta a ponta (não é uma silhueta com buraco no meio); o que aparecia na tela era só a quina
   * acesa e a brasa, e isso lia como uma tira vermelha listrada colada no rodapé (e outra fina no
   * topo) de três fases já fechadas e aprovadas jogando — pior caso medido na Fase 2 (vácuo, sem
   * nada na frente para tapar). `desenha` é a guarda que faltava.
   */
  constructor(scene: Phaser.Scene, desenha: boolean) {
    // ⚠️ SEM `physics.add`. A faixa é DECORAÇÃO: um corpo físico aqui seria a física nova que a
    // spec proibiu, e ele apareceria como morte invisível no meio do vão. A sonda cobra a
    // ausência dele.
    //
    // Sem a textura, ou fora da Fase 4, a `Moldura` continua respondendo a curva (matemática
    // pura) e não desenha nada — a mesma lei de todo o resto: arte entra asset por asset.
    if (!desenha || !scene.textures.exists('f4Faixa')) return;

    for (let i = 0; i < Moldura.SEGMENTOS; i++) {
      // Depth −0.6: atrás dos props (−0.5 — a mesa desenha por cima da faixa de onde ela nasce) e
      // à frente de tudo que é fundo (a pintura em −96, as bandas de placas em −75).
      //
      // ⚠️ Origem no TOPO no chão e na BASE no teto: a peça é ancorada pela SUPERFÍCIE, e o que
      // sobra dela sai da tela. É o que dispensa crop e escala — ver `ESPESSURA_MAX`.
      //
      // O NOME é o que torna a faixa medível: a sonda acha os segmentos por ele, como a
      // `sombraCasco` da Fase 3.
      this.chao.push(
        scene.add.image(0, 0, 'f4Faixa').setOrigin(0, 0).setDepth(-0.6).setName('faixaChao'),
      );
      this.teto.push(
        scene.add
          .image(0, 0, 'f4Faixa')
          .setOrigin(0, 1)
          .setFlipY(true) // o teto é a mesma peça de cabeça para baixo
          .setDepth(-0.6)
          .setName('faixaTeto'),
      );
    }
  }

  /** O `gap` do roteiro. A placa que nascer daqui em diante é julgada por ele. */
  setGap(gap: number): void {
    this.gap = gap;
  }

  /**
   * A espessura pedida pelo roteiro. Um pedido CRAVA quando `espessura` ainda está em 0 — hoje
   * isso só acontece no primeiro pedido, então a fase não abre com a parede crescendo na cara do
   * jogador; os seguintes são perseguidos devagar, porque a dramaturgia da fase é *as paredes vão
   * fechando em você* — e uma parede que salta 12px num quadro não fecha, pisca.
   *
   * ⚠️ Um roteiro futuro que voltasse a pedir 0 no meio da fase cravaria de novo no próximo
   * pedido (a condição é `espessura === 0`, não "é o primeiro"), e a parede saltaria em vez de
   * perseguir. Hoje as duas leituras coincidem porque só o primeiro evento pede 0.
   */
  setEspessura(px: number): void {
    this.alvo = Phaser.Math.Clamp(px, 0, Moldura.ESPESSURA_MAX);
    if (this.espessura === 0) this.espessura = this.alvo;
  }

  /**
   * Roda o mundo. Chamada da `GameScene.update`, ANTES dos spawns — o corredor que nasce neste
   * frame tem de ler a curva já avançada.
   */
  avanca(dt: number, speed: number): void {
    this.xMundo += speed * dt;

    // A espessura persegue o alvo a `RAMPA` px/s, sem passar dele.
    const falta = this.alvo - this.espessura;
    const passo = Moldura.RAMPA * dt;
    this.espessura += Math.abs(falta) <= passo ? falta : Math.sign(falta) * passo;

    if (!this.chao.length) return;

    // ⚠️ A POSIÇÃO É CALCULADA, NUNCA ACUMULADA — e não há reciclagem. Um segmento que andasse
    // sozinho e fosse reposicionado ao sair da tela acumularia erro de ponto flutuante e sairia
    // da grade; fora da grade, a trava dos 8px deixa de ser exata. Aqui `x = i*128 − (xMundo %
    // 128)` por construção, todo frame.
    //
    // ⚠️ O ÍNDICE DA PLACA VEM DO LAÇO, NUNCA DO `x` ARREDONDADO. O `x` é arredondado para a
    // grade de pixel da tela (nada de sprite em meio pixel), e esse arredondamento pode empurrar
    // `floor((xMundo + x) / 128)` uma placa para trás — o segmento passaria a desenhar a altura
    // da placa vizinha toda vez que `off` cruzasse um meio pixel. O segmento `i` É a placa
    // `base + i`, por construção.
    const base = Math.floor(this.xMundo / Moldura.LARGURA);
    const off = this.xMundo - base * Moldura.LARGURA;
    for (let i = 0; i < Moldura.SEGMENTOS; i++) {
      const p = this.placaDe(base + i);
      const x = Math.round(i * Moldura.LARGURA - off);
      this.chao[i].setPosition(x, p.superficieChao);
      this.teto[i].setPosition(x, p.superficieTeto);
    }
  }

  /**
   * ⚠️ O CONTRATO DAS TRÊS CONSULTAS ABAIXO, E ELE É O QUE SEGURA A PODA DE PÉ:
   * **`xTela >= -128`.** Ou seja, pergunta-se sobre a tela e sobre o que está à direita dela,
   * nunca sobre o passado. A `avanca` respeita isso pedindo a placa pelo ÍNDICE (`base + i`), e o
   * `spawnCorredores` pede em `x = 414`, à direita da tela.
   *
   * O motivo é que o piso da poda é `base − 1` (ver `placaDe`): uma pergunta mais atrás que isso
   * cai numa placa já apagada, e ela NÃO é regerada — regerar sortearia outro valor e a parede
   * saltaria de altura. Foi exatamente uma suposição deste tipo, não escrita, que derrubou o jogo
   * no frame 1 antes do conserto da poda. Está escrita agora.
   */

  /** O centro do corredor na coluna `xTela` da tela. */
  vaoEm(xTela: number): number {
    return this.placaEm(xTela).vaoY;
  }

  /** A linha de cima da faixa do chão em `xTela`. */
  superficieChaoEm(xTela: number): number {
    return this.placaEm(xTela).superficieChao;
  }

  /** A linha de baixo da faixa do teto em `xTela`. */
  superficieTetoEm(xTela: number): number {
    return this.placaEm(xTela).superficieTeto;
  }

  /**
   * A placa de índice `n`, gerando as que faltam e podando as que já saíram da tela.
   *
   * ⚠️ A PODA MEDE A TELA, NUNCA A PERGUNTA — e esta distinção custou um crash garantido no
   * frame 1. A primeira versão podava `k < n - 3` com o `n` de QUEM PERGUNTOU. Mas quem pergunta
   * mais à frente é o `spawnCorredores` (`vaoEm(414)`, três a quatro placas à direita do último
   * segmento desenhado), e a poda dele apagava a placa que o segmento da ESQUERDA ia pedir no
   * frame seguinte: `placas.get(n)` devolvia `undefined` e o `!` mentia para o TypeScript.
   * O piso agora sai do `xMundo` — a borda esquerda da tela, que é a mesma para todos os que
   * perguntam.
   */
  private placaDe(n: number): Placa {
    // A geração é sempre para a FRENTE: o mundo só rola num sentido, e cada placa deriva da
    // anterior (ver `gerar`), então gerar em ordem é o que mantém a curva contínua.
    while (this.ultima < n) {
      this.ultima++;
      this.placas.set(this.ultima, this.gerar(this.ultima));
    }

    const piso = Math.floor(this.xMundo / Moldura.LARGURA) - 1;
    for (const k of this.placas.keys()) if (k < piso) this.placas.delete(k);

    return this.placas.get(n)!;
  }

  private placaEm(xTela: number): Placa {
    return this.placaDe(Math.floor((this.xMundo + xTela) / Moldura.LARGURA));
  }

  private gerar(n: number): Placa {
    const ant = this.placas.get(n - 1);
    const meio = this.gap / 2;
    const lo = TETO_Y + Moldura.MARGEM + meio;
    const hi = GROUND_Y - Moldura.MARGEM - meio;

    // ⚠️ SEGURA OU ANDA — e é daqui que saem as "placas de larguras diferentes" da spec com uma
    // peça só de 128px: duas ou três placas na mesma altura LEEM como uma placa larga. Onda lisa
    // lê como onda; placa lê como parede.
    //
    // ⚠️ `Phaser.Math` AQUI, e não `Math.random`. O vão é JOGO, e jogo sorteia do fluxo do jogo.
    const segura = ant !== undefined && ant.repetida < 3 && Phaser.Math.FloatBetween(0, 1) < 0.45;

    let vaoY: number;
    let repetida: number;
    if (segura && ant) {
      // O `gap` pode ter mudado sob a placa: reclampa em vez de herdar cru.
      vaoY = Phaser.Math.Clamp(ant.vaoY, lo, hi);
      repetida = ant.repetida + 1;
    } else {
      const base = ant ? ant.vaoY : (lo + hi) / 2;
      vaoY = Phaser.Math.Clamp(base + Phaser.Math.FloatBetween(-1, 1) * Moldura.PASSO_MAX, lo, hi);
      repetida = 1;
    }
    // ⚠️ ARREDONDA. A mesa é ancorada em `vaoY ± gap/2`, e o vão medido pela `probe-stage4` tem de
    // dar o inteiro do roteiro — 110, não 109,7.
    vaoY = Math.round(vaoY);

    // ⚠️ `Math.random` AQUI, e não `Phaser.Math`. O relevo é ARTE, e arte de fundo não pode
    // adiantar o dado do jogo — é a mesma fronteira do plantio do casco da Fase 3.
    //
    // ⚠️ O `Math.min` CORTA O RELEVO, NÃO O DESLOCA — comportamento, não defeito, documentado
    // aqui porque só existe na cabeça de quem mediu. A partir de `espessura = 44` o relevo (até
    // +10) começa a ser aparado pelo teto de 54; em `espessura = 54` (STAGE_4: de t≈68 até o fim
    // da fase) ele é EXATAMENTE 0 — a parede vira uma régua perfeitamente reta bem no clímax,
    // onde os degraus são a leitura. Se o duto parecer "morto" no teste jogado, é isto, não um
    // bug: não mexer sem o Henrique julgar primeiro.
    const eChao = Math.min(Moldura.ESPESSURA_MAX, this.espessura + Math.random() * Moldura.RELEVO);
    const eTeto = Math.min(Moldura.ESPESSURA_MAX, this.espessura + Math.random() * Moldura.RELEVO);

    // ⚠️ ARREDONDA NA DIREÇÃO SEGURA: o chão para BAIXO (y maior), o teto para CIMA (y menor).
    // Arredondar para o lado errado devolveria 7px de folga onde a trava prometeu 8.
    let superficieChao = Math.ceil(GROUND_Y - eChao);
    let superficieTeto = Math.floor(TETO_Y + eTeto);

    // ⚠️ A TRAVA DOS 8px. Só existe quando há corredor: em `gap 0` (o silêncio antes do chefão) não
    // há vão para proteger, e travar contra um vão que não existe apagaria a parede justamente
    // onde ela é o cenário inteiro.
    //
    // ⚠️ LIMITE LATENTE: a trava é aplicada com o `gap` VIGENTE NA HORA em que a placa nasce, e
    // placas velhas ficam na tela por até `SEGMENTOS × LARGURA` px depois que o roteiro alarga o
    // corredor. Um alargamento maior que `2 × FOLGA` (16px) faria essas placas velhas invadirem de
    // fato o vão novo por alguns segundos — hoje o maior alargamento do roteiro é +8 (t=37:
    // 96→104; t=63,5: 76→84), então há folga, mas quem mexer nos vãos do roteiro precisa saber
    // disso.
    if (this.gap > 0) {
      superficieChao = Math.max(superficieChao, vaoY + meio + Moldura.FOLGA);
      superficieTeto = Math.min(superficieTeto, vaoY - meio - Moldura.FOLGA);
      // ⚠️ `meio` pode ser fracionário (`gap` ímpar), e a trava acima herdaria essa fração. O
      // arredondamento entra DEPOIS do clamp, no mesmo sentido seguro de sempre — chão para
      // BAIXO, teto para CIMA — para nunca comer os 8px de folga que a trava acabou de garantir.
      superficieChao = Math.ceil(superficieChao);
      superficieTeto = Math.floor(superficieTeto);
    }

    return { vaoY, repetida, superficieChao, superficieTeto, gap: this.gap };
  }
}
