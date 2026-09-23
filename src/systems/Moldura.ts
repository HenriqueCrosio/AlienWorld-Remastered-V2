import Phaser from 'phaser';
import { pickVariant } from '../art';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
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
  /**
   * A BORDA desta placa, sorteada UMA VEZ, quando ela nasce — uma chave para o chão e outra para o
   * teto, cada uma com a irmã dela.
   *
   * ⚠️ A BORDA MORA NA PLACA, E NÃO NO SPRITE, PORQUE A TROCA DE CÂMARA TEM DE ROLAR COM O MUNDO.
   * Até 14/09 o `setFaixa` reescrevia os oito sprites no mesmo quadro, e ele jogou e descreveu
   * exatamente isso: *"parece acontecer um glitch… como as duas são muito diferentes visualmente,
   * o jogador percebe a troca grosseira"*. Guardada aqui, a borda nova só vale para as placas
   * geradas DEPOIS da troca — e placa nova só nasce à direita da tela (ver `placaDe`). A câmara
   * seguinte ENTRA pela direita, como todo o resto da fase.
   */
  faixaChao: string;
  faixaTeto: string;
  /**
   * O QUANTO a placa nasceu dentro do duto, de 0 a 1 — decide o tint dela, e só o tint.
   *
   * ⚠️ POR PLACA PELO MESMO MOTIVO DA BORDA, e foi ele que pegou (14/09): *"a borda do final do duto
   * ficou muito estranha e sem acabamento… arrume essa transição repentina"*. Com o tint global, o
   * `setDuto(false)` de t=106 descoloria no mesmo quadro a parede grossa e colada que ainda estava
   * inteira na tela. Agora o fim do duto rola para fora com a cara do duto.
   *
   * ⚠️ E É UM NÚMERO, NÃO UM BOOLEANO: com tint cru por placa, a placa vermelha do duto encostava
   * na azul da câmara com um corte de cor seco — uma costura nova no lugar da que se tirou. O tint
   * anda `1 / LETAL_PLACAS` por placa gerada (ver `gerar`), e a parede esfria ao longo de três.
   *
   * ⚠️ E O FIO E A MORDIDA VIRARAM DA PLACA TAMBÉM (14/09, 2º teste jogado): *"um pouco antes [da
   * câmara D] ainda tem o erro… a linha do duto não existe e o sprite da borda é diferente de todo
   * o duto, quero que fique igual ao do duto"*. Com o fio global, a parede do duto que ainda estava
   * na tela perdia a linha acesa no quadro em que o roteiro dizia "acabou". Agora a regra é uma só,
   * placa a placa: **`letal > 0` desenha o fio E morde** — a parede nunca mata sem a linha acesa, e
   * a linha nunca acende numa parede que não mata.
   */
  letal: number;
  /**
   * A borda desta placa leva CONTORNO? Sai da base em vigor quando ela nasce, como a borda. Ver
   * `Moldura.CONTORNO`.
   */
  contorno: boolean;
  /**
   * A PEÇA QUE TAPA A EMENDA entre duas câmaras, se esta placa for a primeira da câmara nova — a
   * chave da arte (uma mesa), já sorteada. Ver `JUNTA_ESCALA`.
   */
  junta?: string;
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
   * A borda com que a moldura NASCE: a da câmara A, porque é onde a fase começa.
   *
   * ⚠️ ELA TAMBÉM É A GUARDA DE EXISTÊNCIA do construtor. A `BootScene` carrega `ART`
   * GLOBALMENTE, então uma chave de faixa existe em TODA fase — sem a guarda, os 8 sprites
   * nasciam nas Fases 1, 2 e 3 como uma tira vermelha colada no rodapé. Ver `desenha`.
   */
  static readonly FAIXA_INICIAL = 'f4FaixaA';

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
   * SEGURA OU ANDA — a chance de a placa repetir a altura da anterior, e o teto de repetições.
   *
   * ⚠️ O PAR DO DUTO É MAIOR, E ISSO É ARTE VIRANDO REGRA DE GEOMETRIA. A borda da câmara C tem
   * uma VEIA ACESA horizontal na linha 41 da peça, e no duto a parede é colada no corredor
   * (`superficieChao = vaoY + meio + FOLGA`) — então a luz cai em `vaoY + 50` e anda com o vão.
   * Com o par normal, metade das juntas do duto pulava de 7 a 14px e a veia lia como uma linha
   * QUEBRADA. O veredicto dele, 20/09: *"as luzes são importantes para a arte da borda, mas ficar
   * em um degrau diferente fica estranho in game. O certo seria emendar na linha das luzes"*.
   *
   * ⚠️ E O PREÇO NÃO É APERTO — ele ofereceu pagar em largura (*"mesmo que tenha que apertar mais
   * o duto"*) e não precisa: o `gap` do roteiro (84 → 76 → 68) não muda uma linha. Achatar a
   * parede no envelope é que custaria 44px de banda (100 → 56), e por isso não foi esse o caminho.
   * O que se paga é RITMO: o duto pede menos subida e descida, em patamares mais longos.
   *
   * ⚠️ O DEGRAU RARO NÃO É DEFEITO — ele sobra de propósito. Quando o patamar acaba, o FIO já
   * desenha o trecho VERTICAL que liga as duas alturas (ver `ligaDegrau`), então um degrau isolado
   * lê como a emenda de duas seções de um duto. É a lição de 14/09: *"ligando as duas pontas, o
   * mesmo degrau passa a ler como uma SALIÊNCIA da parede"*.
   *
   * ⚠️ SE O DUTO FICAR MONÓTONO no teste jogado, estes dois números descem — nunca o `PASSO_MAX`,
   * que é o TAMANHO do degrau, não a frequência dele.
   */
  private static readonly SEGURA_P = 0.45;
  private static readonly SEGURA_MAX = 3;
  private static readonly SEGURA_P_DUTO = 0.85;
  private static readonly SEGURA_MAX_DUTO = 8;

  /**
   * ⚠️ O TETO DA ESPESSURA, e ele é uma conta, não um gosto: a peça é ancorada pela SUPERFÍCIE,
   * sem crop e sem escala, então para ela ainda alcançar a borda da tela `espessura + relevo` não
   * pode passar de 54 (206 − 54 + 64 = 216 = a base da tela; 10 + 54 − 64 = 0 = o topo).
   * Passar disso abriria uma fresta entre a faixa e a borda.
   *
   * ⚠️ A CONTA É SOBRE A PEÇA MAIS FINA (64px), E É POR ISSO QUE ELA VALE PARA TODAS. A câmara C
   * entrou no M4 com 80px — a "faixa grossa" do duto — e uma peça mais alta só SOBRA: com 80 o
   * limite daria 70. O número fica em 54 mesmo assim, e a decisão é dele (20/09): *"use a arte que
   * temos guardada e utilize-a da mesma forma que a atual"*. Subir o teto para 70 estreitaria o
   * duto, e apertar o corredor é mudança de JOGO numa fase que ele já aprovou jogada — os 16px da
   * peça grossa viram COBERTURA (parede desenhada onde antes entrava saia), não aperto.
   *
   * ⚠️ E SE UM DIA O DUTO PARECER FOLGADO, é este número que sobe — mas só até 70, e só enquanto a
   * C for a única câmara em jogo: com uma peça de 64 na tela, 70 abre a fresta que esta conta
   * existe para não ter.
   */
  static readonly ESPESSURA_MAX = 54;

  /** A margem das bordas da tela: um vão colado no teto obriga a raspar onde não se vê o que vem. */
  private static readonly MARGEM = 24;

  /**
   * O capricho da espessura, placa a placa. É o que impede a faixa de ser uma régua reta — e é
   * DECORAÇÃO, então nunca sai do fluxo de acaso do JOGO.
   *
   * ⚠️ E ELE DEIXOU DE SER SORTEADO EM 13/09, POR UM DEFEITO QUE ELE FOTOGRAFOU: *"existe um
   * degrau onde as continuações dos assets se encaixam, causando um gap reto na colagem"*. Com um
   * `Math.random()` por placa, duas placas vizinhas podiam cair a 10px uma da outra — e como cada
   * segmento é um retângulo CHATO de 128px, essa diferença vira um corte vertical na emenda. O
   * relevo existe para a parede não ser régua; ele não precisava ser RUÍDO para isso.
   *
   * Agora é uma ONDA contínua da posição no mundo (ver `relevoEm`): a mesma amplitude de 10px ao
   * longo da fase, mas a diferença entre placas VIZINHAS cai para ~2px, que é o tamanho do degrau
   * que sobra. Onda também lê melhor que ruído: é parede orgânica, não serrilha.
   */
  private static readonly RELEVO = 10;

  /** Quantos segmentos por lado. 4 × 128 = 512 ≥ 384 + 128 de folga de rolagem. */
  private static readonly SEGMENTOS = 4;

  /** px/s com que a espessura persegue o alvo. Calibragem: o teste jogado decide. */
  private static readonly RAMPA = 8;

  /**
   * ⚠️ A MORDIDA. A parede letal só cobra depois que a nave entra `MORDIDA` px nela — e este
   * número NÃO é generosidade solta, é a folga que um limite JÁ DOCUMENTADO exige.
   *
   * O `avanca` explica que `placaEm` pode discordar em UMA PLACA na fronteira dos 128px: o `x` do
   * sprite é arredondado para a grade de pixel da tela, e `floor((xMundo + x) / 128)` pode cair
   * uma placa atrás desse arredondamento. Sem folga, esse 1px de discordância poderia ser a
   * diferença entre viver e morrer num degrau. Com 3px, ele é ESTRUTURALMENTE INCAPAZ de decidir
   * uma vida — e de quebra a parede joga como shmup deve jogar, perdoando o encosto de raspão.
   */
  private static readonly MORDIDA = 3;

  /** O tint da faixa quando ela é só cenário. `0xffffff` = a arte como ela é. */
  private static readonly TINT_INERTE = 0xffffff;

  /**
   * O tint da faixa quando ela MORDE. Ele esquenta o que já tem luz — e é só isso. ⚠️ Quem carrega
   * o telégrafo é o `FIO`, logo abaixo, e o comentário dele explica por quê.
   */
  private static readonly TINT_LETAL = 0xff8a6a;

  /** Em quantas placas o tint do duto acende ou apaga. Ver `Placa.letal`. */
  private static readonly LETAL_PLACAS = 3;

  /** O tint da última placa gerada, perseguindo o `duto` placa a placa. */
  private letalAtual = 0;

  /**
   * A cor do FIO — a linha acesa na superfície da parede letal.
   *
   * ⚠️ O TELÉGRAFO É ESTE FIO, E NÃO O TINT, POR UMA MEDIÇÃO. A primeira versão apostava só no
   * `setTint`, e ele NÃO LÊ: tint no Phaser é MULTIPLICATIVO, e a faixa é quase preta na banda que
   * importa (medido em t=74: rgb 25,17,22). Multiplicar preto por qualquer cor devolve preto — o
   * delta de luminância entre inerte e letal deu **−1,5**, ou seja, nada. E não é um defeito da
   * arte provisória que a arte final conserte sozinha: o rumo desta fase é casco ESCURO com *luz
   * só onde há energia*, então a parede final também será escura.
   *
   * A parede que morde está energizada. O idioma do jogo para isso é luz ADITIVA, desenhada por
   * cima — não uma multiplicação que só pode escurecer.
   */
  private static readonly FIO = 0xffb478;

  /** A espessura do fio, em px. Dois: um pixel some na grade de 384×216, três viram enfeite. */
  private static readonly FIO_PX = 2;

  /**
   * O CONTORNO — o acabamento escuro da borda da câmara do golfinho, no traço do fio.
   *
   * ⚠️ O PEDIDO É DELE (15/09): *"uma fina camada que contorne a borda, igual tem no duto, mas mais
   * discreta e preta, apenas para dar um acabamento… pode ser um marrom escuro"*. As costelas de B
   * acabam numa barra clara colada no fundo azul, e sem linha a borda lê recortada.
   *
   * ⚠️ POR FORA DA ARTE, E NÃO POR CIMA COMO O FIO: a primeira linha da peça é opaca e é a barra
   * acesa das costelas (lum 72–85, medido). Um traço escuro por cima apagaria justamente a luz dela;
   * por fora, ele a CONTORNA. Os 2px saem dos 8 da `FOLGA`, e é decoração: não morde, não tem corpo.
   *
   * ⚠️ E A PLACA ACESA MANDA: no duto (que herda a borda B) o fio toma o lugar do contorno. Os dois
   * na mesma placa seriam uma linha dupla, e o telégrafo da parede letal não divide a superfície.
   */
  private static readonly CONTORNO = 0x22160f;
  private static readonly CONTORNO_ALPHA = 0.9;
  /** As bordas que levam contorno. Hoje só a da câmara do golfinho — o pedido foi dela. */
  private static readonly CONTORNO_BASES: ReadonlySet<string> = new Set(['f4FaixaB']);

  /**
   * A JUNTA — o pilar na frente da costura entre as bordas de duas câmaras.
   *
   * ⚠️ A IDEIA É DELE (14/09), com o print circulado: *"por que não colocar um pilar menor na frente
   * dessa costura, isso resolve o problema utilizando o cenário… truque barato e eficiente"*. A
   * emenda entre duas artes muito diferentes não some por nenhuma conta de cor; uma peça sólida
   * PLANTADA em cima dela transforma a costura em estrutura.
   *
   * ⚠️ É DECORAÇÃO, COMO A FAIXA — sem corpo, sem mordida. A arte é uma mesa (a do lugar para onde se
   * está entrando), mas ela não é um obstáculo: sobe só `JUNTA_SOBRA` px acima da superfície, dentro
   * dos 8px da trava, então nunca encosta no vão e nunca vira a parede que mata sem avisar.
   *
   * ⚠️ 0,8 DE ESCALA, E REDUZIR PODE: é o "pilar MENOR" do pedido, e a lei da resolução proíbe
   * aumentar, não diminuir. 94 × 0,8 = 75px cobre a emenda com folga para os dois lados.
   */
  private static readonly JUNTA_ESCALA = 0.8;
  /** Quanto o pilar da junta passa da superfície mais alta das duas placas. Menor que a `FOLGA`. */
  private static readonly JUNTA_SOBRA = 5;

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

  /**
   * ESTAMOS DENTRO DO DUTO? É UM ESTADO SÓ, com duas consequências, e ele vale de t=68 a t=106.
   *
   * 1. **A parede COLA no corredor** — a superfície deixa de sair da espessura e passa a ser
   *    `vaoY ± (gap/2 + FOLGA)`, exato. Ver `gerar`.
   * 2. **A parede MORDE** — encostar cobra uma vida. Ver `morde`.
   *
   * ⚠️ UM CAMPO, NÃO DOIS, e isto é uma correção de 10/09. A primeira versão tinha `letal`
   * sozinho, e a parede continuava saindo da espessura — o resultado medido foi uma parede de
   * teto com **16,6px de média** onde o roteiro pedia 54, e uma banda aberta de **127px** para um
   * corredor de 84. Os 43px sobrando não eram nem corredor nem parede, e é exatamente isso que
   * fazia o duto não ler como duto. Estar no duto é UM estado dramatúrgico; separá-lo em dois
   * booleanos permitiria a combinação inválida (parede colada que não morde) sem ganhar nada.
   *
   * ⚠️ QUEM MANDA É O ROTEIRO, e nunca a espessura. Deduzir isto de `espessura >= 54` seria
   * mágica implícita: um roteiro futuro que pedisse a faixa cheia por motivo de ARTE ganharia
   * parede assassina sem ninguém ter escrito isso. Ver `setDuto`.
   */
  duto = false;

  /**
   * A cena, guardada só quando a moldura DESENHA. É o que o `setFaixa` precisa para sortear a
   * variante e para remedir a cor do enchimento; fora da Fase 4 ela fica nula e o `setFaixa` é
   * um no-op, como todo o resto do desenho.
   */
  private scene: Phaser.Scene | null = null;

  /** A BASE da borda em vigor (`f4FaixaA`, `f4FaixaB`…). O sorteio das irmãs sai daqui. */
  private base = Moldura.FAIXA_INICIAL;

  private readonly chao: Phaser.GameObjects.Image[] = [];
  private readonly teto: Phaser.GameObjects.Image[] = [];
  /** Os fios acesos — um por segmento, por lado. Só existem quando a parede morde. Ver `FIO`. */
  private readonly fios: Phaser.GameObjects.Rectangle[] = [];
  /**
   * A SAIA: a peça CONTINUADA EM ESPELHO onde ela não alcança. Uma por segmento por lado, só no
   * duto. Ver `enche`.
   *
   * ⚠️ ELA ERA UM RETÂNGULO DE COR LISA, E ELE PEGOU ISSO JOGANDO: *"tem uma parte cinza que não
   * tem nada"*, com o print circulado. A cor era medida da última linha da peça (havia até um
   * `corDoFundo` para isso), então a emenda não aparecia — mas 19px de campo CHAPADO no rodapé,
   * atravessando a tela inteira, leem como um buraco na arte, e nenhuma cor conserta isso.
   */
  private readonly saia: Phaser.GameObjects.Image[] = [];
  /** O pilar da junta, um por lado. Invisível enquanto não há emenda na tela. Ver `JUNTA_ESCALA`. */
  private juntaChao: Phaser.GameObjects.Image | null = null;
  private juntaTeto: Phaser.GameObjects.Image | null = null;
  /**
   * A junta pedida por um `setFaixa` ao vivo que não achou placa fora da tela para carregá-la: a
   * próxima placa GERADA é a primeira da câmara nova, e leva a junta.
   */
  private juntaPendente: string | null = null;

  /**
   * O ÍNDICE DA PRIMEIRA PLACA DA CÂMARA NOVA — a emenda viva entre duas bordas. `null` com
   * `emendaPendente` = a troca já foi pedida e a placa ainda não nasceu; `null` sem pendência = não
   * há emenda em curso. Quem lê é o `xDaEmenda`, e é por ele que a PINTURA entra junto com a borda.
   */
  private emendaIndice: number | null = null;
  private emendaPendente = false;

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
    if (!desenha || !scene.textures.exists(Moldura.FAIXA_INICIAL)) return;

    this.scene = scene;
    this.base = Moldura.FAIXA_INICIAL;

    for (let i = 0; i < Moldura.SEGMENTOS; i++) {
      // Depth −0.6: atrás dos props (−0.5 — a mesa desenha por cima da faixa de onde ela nasce) e
      // à frente de tudo que é fundo (a pintura em −96, as bandas de placas em −75).
      //
      // ⚠️ Origem no TOPO no chão e na BASE no teto: a peça é ancorada pela SUPERFÍCIE, e o que
      // sobra dela sai da tela. É o que dispensa crop e escala — ver `ESPESSURA_MAX`.
      //
      // O NOME é o que torna a faixa medível: a sonda acha os segmentos por ele, como a
      // `sombraCasco` da Fase 3.
      //
      // ⚠️ `pickVariant` POR SEGMENTO, não uma textura para os oito. 384 ÷ 128 = 3 cópias na tela
      // ao mesmo tempo, e o olho pega o desenho repetido — era a decisão aberta nº 1 do M2. Com
      // duas irmãs na câmara A o sorteio quebra a fileira; com uma só, `pickVariant` devolve a
      // base e nada muda. É o mesmo caminho da mesa.
      this.chao.push(
        scene.add
          .image(0, 0, pickVariant(scene, this.base))
          .setOrigin(0, 0)
          .setDepth(-0.6)
          .setName('faixaChao'),
      );
      this.teto.push(
        scene.add
          .image(0, 0, pickVariant(scene, this.base))
          .setOrigin(0, 1)
          .setFlipY(true) // o teto é a mesma peça de cabeça para baixo
          .setDepth(-0.6)
          .setName('faixaTeto'),
      );

      // OS FIOS: dois por segmento (chão e teto), invisíveis até a parede morder.
      //
      // ⚠️ Depth −0.55: à FRENTE da faixa (−0,6) e ATRÁS dos props (−0,5). O fio é a superfície da
      // parede acesa, então a mesa que nasce dela tem de continuar passando por cima.
      //
      // ⚠️ Origem no CANTO, como a faixa: o fio é posicionado pela mesma linha de superfície que
      // a faixa, e origem no meio faria a luz nascer meio pixel fora do desenho que ela acende.
      for (const lado of ['fioChao', 'fioTeto']) {
        this.fios.push(
          scene.add
            .rectangle(0, 0, Moldura.LARGURA, Moldura.FIO_PX, Moldura.FIO)
            .setOrigin(0, 0)
            .setDepth(-0.55)
            .setVisible(false)
            .setName(lado),
        );
      }

      // O DEGRAU: o pedaço VERTICAL do fio, na emenda entre este segmento e o próximo.
      //
      // ⚠️ ELE EXISTE PORQUE O FIO HORIZONTAL DENUNCIAVA A EMENDA EM VEZ DE DESENHAR A PAREDE.
      // Dois fios de 128px em alturas diferentes, com um vazio entre eles, é a leitura de dois
      // pedaços mal colados — foi o que ele fotografou. Ligando as duas pontas, o mesmo degrau
      // passa a ler como uma SALIÊNCIA da parede: o contorno aceso é contínuo, sobe e continua.
      //
      // ⚠️ E ELE NÃO É SÓ ENFEITE: o fio é o telégrafo da parede que mata. Um vazio nele é um
      // pedaço de borda letal sem aviso, exatamente na emenda onde o jogador está raspando.
      for (const lado of ['degrauChao', 'degrauTeto']) {
        this.fios.push(
          scene.add
            .rectangle(0, 0, Moldura.FIO_PX, 1, Moldura.FIO)
            .setOrigin(0, 0)
            .setDepth(-0.55)
            .setVisible(false)
            .setName(lado),
        );
      }

      // A SAIA. Ver `enche` para o porquê e para a conta do espelho.
      //
      // ⚠️ O `flipY` DE CADA LADO É O OPOSTO DO DA PEÇA QUE ELA CONTINUA, e é isso que faz a
      // emenda sumir sem ninguém casar pixel nenhum: a peça do chão termina na ÚLTIMA linha da
      // arte (63 nas câmaras finas, 79 na C) e a saia espelhada COMEÇA nessa mesma linha. A do
      // teto é o inverso exato, porque a peça de lá já nasce virada. Quem garante que as duas
      // falam da mesma linha é a âncora do `enche`, que lê a altura da peça em vez de cravá-la.
      for (const lado of ['saiaChao', 'saiaTeto']) {
        this.saia.push(
          scene.add
            .image(0, 0, pickVariant(scene, this.base))
            .setOrigin(0, lado === 'saiaChao' ? 0 : 1)
            .setFlipY(lado === 'saiaChao')
            .setDepth(-0.62) // atrás da peça (−0,6), à frente das bandas de placas (−75)
            .setVisible(false)
            .setName(lado),
        );
      }
    }

    // A JUNTA: dois pilares, um por lado. Depth −0,54: à frente da faixa (−0,6), da saia e do FIO
    // (−0,55), atrás dos props (−0,5). ⚠️ Na frente do fio de propósito: com o duto durando até a
    // emenda do núcleo, a linha acesa da última placa de B chega ao centro do pilar — por trás dele ela
    // ENTRA na peça; por cima, atravessava metade do pilar como um risco solto (captura de 14/09).
    this.juntaChao = scene.add
      .image(0, 0, Moldura.FAIXA_INICIAL)
      .setOrigin(0.5, 0)
      .setScale(Moldura.JUNTA_ESCALA)
      .setDepth(-0.54)
      .setVisible(false)
      .setName('juntaChao');
    this.juntaTeto = scene.add
      .image(0, 0, Moldura.FAIXA_INICIAL)
      .setOrigin(0.5, 1)
      .setFlipY(true)
      .setScale(Moldura.JUNTA_ESCALA)
      .setDepth(-0.54)
      .setVisible(false)
      .setName('juntaTeto');
  }

  // ⚠️ AQUI MORAVA O `corDoFundo`, e vale saber por quê. Ele MEDIA a última linha da peça para
  // pintar o enchimento com ela, em vez de cravar um literal — engenharia correta para o problema
  // errado. A emenda de fato sumia; o que não sumia era o campo CHAPADO de 19px atravessando o
  // rodapé, e ele jogou e chamou de *"uma parte cinza que não tem nada"*. A lição fica: **cor
  // certa não salva superfície vazia.** A saia resolve os dois de uma vez, porque continuar a
  // ARTE torna a pergunta da cor sem sentido.

  /**
   * TROCA A BORDA DE CÂMARA. Quem chama é o evento `cenario` do roteiro, junto com a pintura: a
   * borda e o fundo são o MESMO lugar, e é por isso que não existe evento `faixa` próprio.
   *
   * ⚠️ RECEBE A BASE, NÃO A CHAVE FINAL (`f4FaixaA`, não `f4FaixaA2`). Cada placa sorteia a irmã
   * dela quando nasce — se a troca cravasse uma textura só, as 3 cópias na tela voltariam a ser
   * idênticas.
   *
   * ⚠️ AO VIVO, A TROCA NÃO TOCA EM NADA QUE ESTÁ NA TELA — ver `Placa.faixaChao`. Ela só muda a
   * base, e a câmara nova chega nas placas que nascem daqui em diante, pela direita. `imediato`
   * é o caminho do SALTO (`aplicaCorredorEMoldura`: o `G`, o treino, as sondas): lá não se está
   * atravessando uma passagem, está-se chegando numa câmara, e a borda velha rolando para fora
   * seria a câmara errada na tela por cinco segundos.
   *
   * ⚠️ A GUARDA DA CHAVE INEXISTENTE FOI O CAMINHO DA CÂMARA C, e agora que a C chegou (M4,
   * 20/09) ela continua aqui pelo motivo de sempre: uma chave que não existe faz a borda anterior
   * FICAR, em vez de cair na textura de erro do motor — 32×32, que apareceria como oito selos
   * minúsculos alinhados no rodapé. De 12/09 a 20/09 foi isto que fez o duto ser jogado vestido
   * com a borda da garganta, e ninguém viu um defeito: viu um lugar.
   */
  setFaixa(base: string, imediato = false, junta?: string): void {
    const scene = this.scene;
    if (!scene || !scene.textures.exists(base)) return;
    if (base === this.base && !imediato) return;

    this.base = base;

    // A JUNTA vai na PRIMEIRA placa da câmara nova — a de menor índice entre as reescritas abaixo,
    // ou, se nenhuma estava pronta fora da tela, a próxima que nascer. O salto não tem emenda.
    const chaveJunta = !imediato && junta && scene.textures.exists(junta) ? pickVariant(scene, junta) : null;
    let primeira: Placa | null = null;
    let primeiraN: number | null = null;

    // ⚠️ AO VIVO, AS PLACAS JÁ GERADAS MAS AINDA FORA DA TELA TAMBÉM TROCAM. O `spawnCorredores`
    // pergunta a curva bem à direita da tela, então há sempre duas ou três placas prontas
    // esperando — e sem esta linha a borda nova só aparecia **3,5s depois** da pintura (medido na
    // captura de 14/09: pintura do núcleo em t=109, primeira placa D na tela em t=112,5, com o
    // chefão entrando em 113). Quem ainda não entrou na tela pode trocar sem ninguém ver.
    //
    // O SALTO (`imediato`) reescreve todas; a `avanca` aplica no próximo quadro, peça e saia juntas
    // (ver `pinta`).
    //
    // ⚠️ E A CONTA É SOBRE A BORDA ESQUERDA DO PILAR, NÃO DA PLACA: o pilar é centrado na emenda e
    // meia largura dele vaza para a placa ANTERIOR. Uma placa que começa exatamente na borda da tela
    // poria o pilar já meio visível no quadro em que ele nasce.
    const meioPilar = chaveJunta ? (94 * Moldura.JUNTA_ESCALA) / 2 : 0;
    const ordenadas = [...this.placas.entries()].sort((a, b) => a[0] - b[0]);
    for (const [n, p] of ordenadas) {
      if (!imediato && n * Moldura.LARGURA - this.xMundo - meioPilar < GAME_WIDTH) continue;
      p.faixaChao = pickVariant(scene, base);
      p.faixaTeto = pickVariant(scene, base);
      p.contorno = Moldura.CONTORNO_BASES.has(base);
      p.junta = undefined;
      // ⚠️ A CÂMARA NOVA NÃO HERDA A RAMPA DO TINT DA ANTERIOR: a placa da borda nova já nasce no
      // estado final do duto. O degradê é para a MESMA borda esfriando; entre duas bordas quem tapa a
      // costura é o pilar da junta, e uma borda D meio avermelhada seria outra costura.
      p.letal = this.duto ? 1 : 0;
      if (primeira === null) {
        primeira = p;
        primeiraN = n;
      }
    }
    this.letalAtual = this.duto ? 1 : 0;
    if (chaveJunta) {
      if (primeira) primeira.junta = chaveJunta;
      else this.juntaPendente = chaveJunta;
    }
    // A EMENDA VIVA — o salto não tem uma.
    this.emendaIndice = imediato ? null : primeiraN;
    this.emendaPendente = !imediato && primeiraN === null;
  }

  /**
   * ONDE ESTÁ A EMENDA entre a borda anterior e a da câmara nova, em x de tela — a borda ESQUERDA da
   * primeira placa nova, que é também o centro do pilar da junta.
   *
   * Pedida antes de a placa nascer, responde "à direita da tela"; sem emenda nenhuma (o salto, ou
   * uma troca que nunca aconteceu), responde −Infinity, que quem espera a emenda lê como "já passou".
   */
  xDaEmenda(): number {
    if (this.emendaPendente) return GAME_WIDTH + Moldura.LARGURA;
    if (this.emendaIndice === null) return -Infinity;
    return this.emendaIndice * Moldura.LARGURA - this.xMundo;
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
   * Liga/desliga a mordida — e ACENDE A FAIXA junto, no mesmo instante.
   *
   * ⚠️ O TINT NÃO É ENFEITE, É O TELÉGRAFO, e sem ele a mordida seria sonegação. A parede foi
   * cenário atravessável por 68 segundos; passar a cobrar sem avisar é a mesma coisa que o
   * `STAGE_4` já se proíbe de fazer na abertura, onde ele gasta 14 segundos de corredor largo só
   * para o jogador descobrir que o teto mata ANTES de o vão apertar. *"Aprender a regra nova no
   * aperto é sonegação, não dificuldade."*
   *
   * O roteiro faz a troca cair junto com a pintura do duto (`paintBgF4c`) e com o banner que já
   * existe: três avisos no mesmo instante, e nenhum deles custa uma vida para ser lido.
   */
  setDuto(duto: boolean, imediato = false): void {
    this.duto = duto;
    // O TINT É DA PLACA (ver `Placa.letal`): ao vivo muda só o que ainda não entrou na tela, e o
    // `pinta` aplica quadro a quadro. O salto reescreve todas.
    if (imediato) {
      for (const p of this.placas.values()) p.letal = duto ? 1 : 0;
      this.letalAtual = duto ? 1 : 0;
    } else {
      // ⚠️ AS PLACAS PRONTAS FORA DA TELA ENTRAM NO DEGRADÊ, EM ORDEM — cravá-las no valor final
      // pulava a rampa inteira e devolvia o corte de cor seco na primeira placa fora da tela.
      // O degradê parte da última placa que JÁ está na tela.
      const ordenadas = [...this.placas.entries()].sort((a, b) => a[0] - b[0]);
      let ultimaNaTela: number | null = null;
      for (const [n, p] of ordenadas) {
        if (n * Moldura.LARGURA - this.xMundo < GAME_WIDTH) {
          ultimaNaTela = p.letal;
          continue;
        }
        if (ultimaNaTela !== null) {
          this.letalAtual = ultimaNaTela;
          ultimaNaTela = null;
        }
        p.letal = this.avancaLetal();
      }
    }
    // O FIO É DA PLACA, como o tint e a mordida — ver `Placa.letal`. A `avanca` acende quadro a quadro.
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
      this.pinta(i, p);

      // ⚠️ O FIO SAI DA MESMA PLACA QUE A FAIXA E QUE A MORDIDA — os três leem `superficieChao` /
      // `superficieTeto` da placa `base + i`. É isso que faz a luz cair EXATAMENTE na linha que
      // cobra o encosto: o jogador vê onde a parede morde, não uma aproximação dela.
      //
      // O CONTORNO usa os mesmos retângulos, POR FORA da superfície: o chão sobe `FIO_PX`, o teto desce.
      const traco = Moldura.tracoDe(p);
      const fora = traco === 'contorno' ? Moldura.FIO_PX : 0;
      const yChao = (q: Placa) => q.superficieChao - fora;
      const yTeto = (q: Placa) => q.superficieTeto - Moldura.FIO_PX + fora;
      this.veste(this.fios[i * 4], traco, 'Chao').setPosition(x, yChao(p));
      this.veste(this.fios[i * 4 + 1], traco, 'Teto').setPosition(x, yTeto(p));

      // O DEGRAU liga esta placa à SEGUINTE, na emenda. Pedir `base + i + 1` respeita o contrato
      // da poda (só se pergunta sobre a tela e sobre o que está à direita dela) — a placa mais à
      // frente aqui é `base + SEGMENTOS`, e o `spawnCorredores` já pergunta mais longe que isso.
      const prox = this.placaDe(base + i + 1);
      const xEmenda = x + Moldura.LARGURA - Moldura.FIO_PX;
      // O degrau só liga dois traços que existem, e do MESMO tipo: fio com fio, contorno com contorno.
      const ligaTraco = traco !== null && Moldura.tracoDe(prox) === traco;
      this.veste(this.fios[i * 4 + 2], traco, 'DegrauChao');
      this.veste(this.fios[i * 4 + 3], traco, 'DegrauTeto');
      // ⚠️ O CONTORNO DO DEGRAU FICA DO LADO DE FORA DA PLACA MAIS ALTA — é a quina dela que está
      // exposta. O fio fica sempre na placa da esquerda: ele é luz na superfície, não uma borda.
      const xChao = fora && p.superficieChao < prox.superficieChao ? x + Moldura.LARGURA : xEmenda;
      const xTeto = fora && p.superficieTeto > prox.superficieTeto ? x + Moldura.LARGURA : xEmenda;
      this.ligaDegrau(this.fios[i * 4 + 2], xChao, yChao(p), yChao(prox), ligaTraco);
      this.ligaDegrau(this.fios[i * 4 + 3], xTeto, yTeto(p), yTeto(prox), ligaTraco);

      this.enche(i, x, p);
    }

    this.posicionaJunta(base, off);
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
   * A PAREDE MORDEU esta caixa? Recebe a caixa da nave em px de tela.
   *
   * ⚠️ ISTO NÃO É UM CORPO FÍSICO, E ESSA É A DECISÃO INTEIRA. A spec de 08/09 proibiu física
   * nova na Fase 4 e a proibição continua de pé: não há `physics.add` aqui, nem colisor, nem
   * grupo. A mordida é uma MEDIÇÃO contra `superficieChaoEm`/`superficieTetoEm` — exatamente os
   * números que a `avanca` usa para posicionar os 8 sprites da faixa.
   *
   * O que isso compra, e é o motivo de ser assim: **a parede não tem como matar onde não está
   * desenhada**, porque a hitbox e o desenho são o MESMO dado. Um Arcade Body colado no vão é a
   * outra saída, e é onde mora morte invisível — a `probe-stage4` mede o vão a partir do mesmo
   * número que posiciona a mesa, então ela seria cega para a divergência por construção. Foi
   * assim que a mesa sem textura passou por quatro sondas em 09/09.
   *
   * ⚠️ E A FASE NÃO FICA IMPOSSÍVEL, por uma invariante que JÁ EXISTIA: a trava dos 8px
   * (`FOLGA`) garante que a superfície nunca entra no corredor. Medido no regime do duto
   * (espessura 54, gap 84): sobram de 8px (o pior caso, que é o mínimo que a trava promete) a
   * 34px entre a borda do vão e a parede que morde.
   *
   * ⚠️ AMOSTRA AS DUAS BORDAS, nunca o centro. A parede é uma escada de 128px e a nave tem ~22px:
   * medir só pelo centro daria até 11px de placa errada ao cruzar um degrau. Toma a superfície
   * mais PERIGOSA das duas colunas — o nariz encosta antes do corpo, e é assim que tem de ser.
   *
   * O contrato `xTela >= -128` das três consultas vale aqui também, e a nave o cumpre com folga:
   * ela vive por volta de x=40..60 na tela.
   */
  morde(esquerda: number, direita: number, topo: number, base: number): boolean {
    // ⚠️ SÓ MORDE A COLUNA CUJA PLACA ESTÁ ACESA — a mesma pergunta que acende o fio dela (ver
    // `Placa.letal`). Sem placa acesa sob a nave, não há parede que mate.
    let chao = Infinity;
    let teto = -Infinity;
    for (const x of [esquerda, direita]) {
      const p = this.placaEm(x);
      if (p.letal <= 0) continue;
      chao = Math.min(chao, p.superficieChao);
      teto = Math.max(teto, p.superficieTeto);
    }

    return base - Moldura.MORDIDA >= chao || topo + Moldura.MORDIDA <= teto;
  }

  /**
   * Estica o ENCHIMENTO do segmento `i` da borda da peça até a borda da tela.
   *
   * ⚠️ ELE EXISTE PORQUE A PEÇA TEM 64px E A PAREDE DO DUTO PASSA DISSO. Fora do duto a espessura
   * é limitada a `ESPESSURA_MAX` (54) exatamente para a peça de 64px sempre alcançar a borda da
   * tela sem deixar fresta. Dentro do duto a parede segue o corredor e pode chegar perto de 120px
   * — a peça sozinha deixaria uma faixa de FUNDO aparecendo no rodapé e no topo, ou seja, um
   * buraco no meio da parede que acabou de virar letal. O enchimento é o que fecha isso.
   *
   * ⚠️ É DECORAÇÃO, como a faixa. Ele não tem corpo físico e não entra na mordida: quem responde
   * pelo que mata continua sendo `superficieChaoEm`/`superficieTetoEm`, e o enchimento nasce das
   * MESMAS linhas — ele preenche daí para fora, nunca para dentro.
   */
  /**
   * Estica o pedaço vertical do fio entre duas alturas de superfície vizinhas.
   *
   * ⚠️ `+ FIO_PX` NA ALTURA, e não é arredondamento: os dois fios horizontais que ele liga têm 2px
   * de espessura, então um conector da altura EXATA da diferença deixaria uma falha de 2px numa
   * das pontas — a costura de 2px no lugar da de 8. Ele encosta nos dois, com sobra.
   *
   * Degrau zero acontece o tempo todo (a curva SEGURA ou ANDA), e aí não há nada para ligar: o
   * conector some em vez de virar um ponto aceso solto na emenda.
   */
  private ligaDegrau(
    fio: Phaser.GameObjects.Rectangle,
    x: number,
    a: number,
    b: number,
    aceso: boolean,
  ): void {
    const alto = Math.abs(a - b);
    if (alto < 1 || !aceso) {
      fio.setVisible(false);
      return;
    }
    fio.setVisible(true);
    fio.setPosition(x, Math.min(a, b));
    fio.setSize(Moldura.FIO_PX, alto + Moldura.FIO_PX);
  }

  /**
   * Veste o segmento `i` com a borda da placa que ele está desenhando neste quadro.
   *
   * ⚠️ TODO QUADRO, E NÃO SÓ NA TROCA: o segmento `i` é sempre o `i`-ésimo da TELA, e a placa sob
   * ele muda cada vez que o mundo rola 128px. A borda segue a placa, não o sprite — é isso que faz
   * a emenda entre as duas câmaras ANDAR para a esquerda em vez de ficar parada na tela.
   *
   * ⚠️ E A SAIA VESTE A MESMA CHAVE DA PEÇA QUE ELA CONTINUA. Ela é a peça continuada em espelho:
   * com a borda de outra câmara, o duto apareceria com a câmara nova em cima e a anterior logo
   * abaixo, emendadas — exatamente as "duas paredes coladas" que ele reprovou nas irmãs.
   */
  private pinta(i: number, p: Placa): void {
    if (this.chao[i].texture.key !== p.faixaChao) {
      this.chao[i].setTexture(p.faixaChao);
      this.saia[i * 2].setTexture(p.faixaChao);
    }
    if (this.teto[i].texture.key !== p.faixaTeto) {
      this.teto[i].setTexture(p.faixaTeto);
      this.saia[i * 2 + 1].setTexture(p.faixaTeto);
    }
    // ⚠️ E A SAIA COM O MESMO TINT DA PEÇA. Ela é a mesma parede continuada; um tint diferente
    // desenharia justamente a linha horizontal que ela existe para não ter.
    const tint = Moldura.tintDe(p.letal);
    if (this.chao[i].tintTopLeft !== tint) {
      this.chao[i].setTint(tint);
      this.teto[i].setTint(tint);
      this.saia[i * 2].setTint(tint);
      this.saia[i * 2 + 1].setTint(tint);
    }
  }

  /** Que traço a superfície da placa leva: o fio (ela morde), o contorno (a borda pede) ou nenhum. */
  private static tracoDe(p: Placa): 'fio' | 'contorno' | null {
    if (p.letal > 0) return 'fio';
    return p.contorno ? 'contorno' : null;
  }

  /**
   * Pinta o retângulo com o traço pedido, ou o esconde. Só troca a cor quando ela muda.
   *
   * ⚠️ O NOME SEGUE O TRAÇO (`fioChao` ↔ `contornoChao`, `degrauTeto` ↔ `contornoDegrauTeto`): a sonda
   * acha o fio pelo nome e cobra que ele só acenda onde a parede morde. Um contorno chamado de fio
   * seria uma parede "acesa" na câmara do golfinho, e a sonda estaria certa em reprovar.
   */
  private veste(
    r: Phaser.GameObjects.Rectangle,
    traco: 'fio' | 'contorno' | null,
    papel: 'Chao' | 'Teto' | 'DegrauChao' | 'DegrauTeto',
  ): Phaser.GameObjects.Rectangle {
    if (traco === null) return r.setVisible(false);
    const contorno = traco === 'contorno';
    const nome = contorno
      ? `contorno${papel}`
      : papel.startsWith('Degrau') ? `degrau${papel.slice(6)}` : `fio${papel}`;
    if (r.name !== nome) r.setName(nome);
    const cor = contorno ? Moldura.CONTORNO : Moldura.FIO;
    const alpha = contorno ? Moldura.CONTORNO_ALPHA : 1;
    if (r.fillColor !== cor || r.fillAlpha !== alpha) r.setFillStyle(cor, alpha);
    return r.setVisible(true);
  }

  /** O tint de uma placa `letal` (0..1): do branco (a arte crua) ao `TINT_LETAL`, canal a canal. */
  private static tintDe(letal: number): number {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(Moldura.TINT_INERTE),
      Phaser.Display.Color.ValueToColor(Moldura.TINT_LETAL),
      100,
      Math.round(letal * 100),
    );
    return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
  }

  /**
   * Planta o pilar da junta na emenda, se alguma das placas na tela (ou logo à direita dela) é a
   * primeira de uma câmara nova. Ver `JUNTA_ESCALA`.
   */
  private posicionaJunta(base: number, off: number): void {
    const chao = this.juntaChao;
    const teto = this.juntaTeto;
    if (!chao || !teto) return;

    // Do segmento 0 até um além do último: a emenda da placa `base + SEGMENTOS` ainda está na borda
    // direita da tela, e o pilar centrado nela já aparece pela metade.
    for (let i = 0; i <= Moldura.SEGMENTOS; i++) {
      const p = this.placaDe(base + i);
      if (!p.junta) continue;
      const ant = this.placaDe(base + i - 1);
      const x = Math.round(i * Moldura.LARGURA - off);
      // O pilar parte da superfície MAIS ALTA das duas placas: o degrau entre elas fica atrás dele.
      chao
        .setTexture(p.junta)
        .setPosition(x, Math.min(p.superficieChao, ant.superficieChao) - Moldura.JUNTA_SOBRA)
        .setVisible(true);
      teto
        .setTexture(p.junta)
        .setPosition(x, Math.max(p.superficieTeto, ant.superficieTeto) + Moldura.JUNTA_SOBRA)
        .setVisible(true);
      return;
    }
    chao.setVisible(false);
    teto.setVisible(false);
  }

  private enche(i: number, x: number, p: Placa): void {
    const chao = this.saia[i * 2];
    const teto = this.saia[i * 2 + 1];

    // ⚠️ A SAIA ENCOSTA, NÃO SE ESTICA — e é isto que a separa do retângulo que ela substituiu.
    // Ela é ancorada exatamente na linha onde a peça acaba, com a altura própria dela, e o que
    // sobrar sai da tela. Sem `setSize`, sem escala, sem crop: a mesma lei da peça
    // (`ESPESSURA_MAX`), pelo mesmo motivo — esticar arte para tapar um vão variável é o que dá
    // aquele aspecto borrado que nenhuma sonda pega.
    //
    // ⚠️ A ALTURA SAI DA PEÇA, E NÃO DE UM LITERAL 64 — e este era o número que segurava a câmara
    // C desde 12/09. A peça do duto tem 80px (a "faixa grossa"), as outras três têm 64, e a saia é
    // a MESMA arte espelhada: ler `displayHeight` é a única forma de a emenda cair no pixel
    // qualquer que seja a câmara. Com o 64 cravado, a saia da C nascia 16px DENTRO do desenho e
    // riscava uma costura no meio da parede — exatamente o defeito que ela veio consertar.
    //
    // A CONTA DE QUE A PEÇA BASTA: no duto a superfície é `vaoY + meio + FOLGA`, e o `vaoY` mais
    // alto possível é `TETO_Y + MARGEM + meio` = 66. Com `gap` 84 (o do duto), a superfície do
    // chão não sobe além de 66 + 42 + 8 = 116; a peça de 64 vai até 180 e a tela acaba em 216,
    // então o pior caso descoberto é 36px — e a saia de 64 cobre. Com a peça de 80 da C o
    // descoberto cai para 20px antes de a saia entrar, que é o que os 16px a mais compraram.
    const alturaChao = this.chao[i].displayHeight;
    const alturaTeto = this.teto[i].displayHeight;
    chao.setPosition(x, p.superficieChao + alturaChao);
    teto.setPosition(x, p.superficieTeto - alturaTeto);

    // ⚠️ A SAIA APARECE ONDE A PEÇA NÃO ALCANÇA A BORDA DA TELA — e não "no duto". Até 14/09 ela
    // seguia o `duto` global, e em t=106 sumia no mesmo quadro de toda a parede colada que ainda
    // estava na tela: 30–40px de fundo aparecendo embaixo de cada placa do fim do duto. Foi o
    // "sem acabamento" que ele apontou. A pergunta certa é de geometria, placa a placa.
    chao.setVisible(p.superficieChao + alturaChao < GAME_HEIGHT);
    teto.setVisible(p.superficieTeto - alturaTeto > 0);
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

  /**
   * O relevo da placa `n`, em px de 0 a `RELEVO`. Contínuo, não sorteado — ver `RELEVO`.
   *
   * Duas senoides de períodos incomensuráveis (≈9 e ≈20 placas): juntas não repetem num trecho
   * que caiba na tela, então a parede não denuncia um padrão, mas as duas são deriváveis e é
   * disso que sai o degrau pequeno. A diferença máxima entre `n` e `n+1` é a soma das duas
   * derivadas — `2·sen(0,35)·3 + 2·sen(0,155)·2` ≈ **2,7px**, contra os 10px do sorteio.
   *
   * `fase` separa chão e teto: com a mesma onda nos dois, a parede inteira engrossaria e
   * afinaria junto, o que lê como a tela respirando em vez de como duas superfícies.
   */
  private static relevoEm(n: number, fase: number): number {
    const a = Math.sin((n + fase) * 0.7);
    const b = Math.sin((n + fase) * 0.31);
    // De [−1,1] para [0, RELEVO], com a onda longa pesando menos que a curta.
    return ((a * 0.6 + b * 0.4) + 1) * 0.5 * Moldura.RELEVO;
  }

  /** Um passo do tint na direção do `duto` — ver `Placa.letal`. */
  private avancaLetal(): number {
    const alvo = this.duto ? 1 : 0;
    const passo = 1 / Moldura.LETAL_PLACAS;
    this.letalAtual += Math.max(-passo, Math.min(passo, alvo - this.letalAtual));
    return Math.round(this.letalAtual * 1000) / 1000;
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
    // ⚠️ NO DUTO O PATAMAR É MAIS LONGO, e o porquê está em `SEGURA_P_DUTO`: ali a borda tem uma
    // veia acesa horizontal, a parede é colada no corredor, e cada degrau QUEBRA a luz.
    //
    // ⚠️ `Phaser.Math` AQUI, e não `Math.random`. O vão é JOGO, e jogo sorteia do fluxo do jogo.
    const maxRepetida = this.duto ? Moldura.SEGURA_MAX_DUTO : Moldura.SEGURA_MAX;
    const chanceSegura = this.duto ? Moldura.SEGURA_P_DUTO : Moldura.SEGURA_P;
    const segura =
      ant !== undefined && ant.repetida < maxRepetida && Phaser.Math.FloatBetween(0, 1) < chanceSegura;

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
    const eChao = Math.min(Moldura.ESPESSURA_MAX, this.espessura + Moldura.relevoEm(n, 0));
    const eTeto = Math.min(Moldura.ESPESSURA_MAX, this.espessura + Moldura.relevoEm(n, 37));

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
      // ⚠️ NO DUTO A PAREDE COLA NO CORREDOR — ela deixa de ser `max`/`min` contra a espessura e
      // passa a ser a borda do vão mais a folga, EXATO. É a diferença entre uma borda grossa e um
      // DUTO: sem isto sobra espaço aberto que não é nem corredor nem parede, e foi assim que o
      // duto de 09/09 acabou com **127px de banda aberta para um corredor de 84** e uma parede de
      // teto de **16,6px de média** onde o roteiro pedia 54. A trava não era um piso da parede,
      // era um teto dela — e no duto é o corredor que tem de mandar, não a espessura.
      //
      // ⚠️ A FOLGA CONTINUA SENDO A MESMA, e é o que mantém a fase possível: a superfície fica a
      // `FOLGA` px da borda do vão, nem mais perto. Trocar `max` por `=` APERTA a parede contra o
      // corredor, nunca dentro dele — a invariante que a sonda cobra não muda de valor.
      if (this.duto) {
        superficieChao = vaoY + meio + Moldura.FOLGA;
        superficieTeto = vaoY - meio - Moldura.FOLGA;
      } else {
        superficieChao = Math.max(superficieChao, vaoY + meio + Moldura.FOLGA);
        superficieTeto = Math.min(superficieTeto, vaoY - meio - Moldura.FOLGA);
      }
      // ⚠️ `meio` pode ser fracionário (`gap` ímpar), e a trava acima herdaria essa fração. O
      // arredondamento entra DEPOIS do clamp, no mesmo sentido seguro de sempre — chão para
      // BAIXO, teto para CIMA — para nunca comer os 8px de folga que a trava acabou de garantir.
      superficieChao = Math.ceil(superficieChao);
      superficieTeto = Math.floor(superficieTeto);
    }

    // A BORDA DA PLACA sai da base EM VIGOR AGORA, e nunca mais muda ao vivo — ver `Placa.faixaChao`.
    // Fora da Fase 4 não há cena guardada e ninguém desenha: a base crua basta.
    const scene = this.scene;
    const faixaChao = scene ? pickVariant(scene, this.base) : this.base;
    const faixaTeto = scene ? pickVariant(scene, this.base) : this.base;

    // A junta pendente de um `setFaixa` que não achou placa fora da tela: esta é a primeira da câmara.
    const junta = this.juntaPendente ?? undefined;
    this.juntaPendente = null;
    if (this.emendaPendente) {
      this.emendaIndice = n;
      this.emendaPendente = false;
    }

    return {
      vaoY, repetida, superficieChao, superficieTeto, gap: this.gap, faixaChao, faixaTeto,
      letal: this.avancaLetal(), contorno: Moldura.CONTORNO_BASES.has(this.base), junta,
    };
  }
}
