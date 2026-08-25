import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { pickVariant } from './art';
import { GROUND_Y } from './systems/TerrainSystem';

/**
 * Que lugar este parallax desenha. É a mesma decisão da física: tem chão ou não tem.
 *
 * `nebulosa` (Fase 3, Ato 1) é o `espaco` MERGULHADO numa nuvem: tudo do vácuo continua lá,
 * mais três camadas densas de nebulosa — inclusive VÉUS na frente da nave. A fase SAI da
 * nuvem no meio (ver `setNebulaDensity`), e o que sobra é o espaço de sempre.
 */
export type ParallaxMode = 'superficie' | 'espaco' | 'nebulosa' | 'interior';

interface ScatterLayer {
  key: string;
  /** Fração da velocidade do mundo. Menor = mais longe. */
  factor: number;
  /** Y da BASE dos sprites (eles crescem para cima). */
  baseY: number;
  depth: number;
  tint: number;
  /**
   * Variações de matiz sorteadas POR SPRITE (passe visual 2026-07-18). Uma camada inteira num
   * tom só é papel de parede; três matizes vizinhos na mesma família dão ao céu a variação que
   * um céu tem — sem quebrar a leitura de distância (todos igualmente escuros/dessaturados).
   */
  tints?: number[];
  alpha: number;
  scale: [number, number];
  /** Distância entre um sprite e o próximo, em px. */
  gap: [number, number];
  /**
   * Cai para trás ao romper a atmosfera?
   * Terreno sim. Nebulosa e planeta NÃO — eles são o espaço, e o espaço continua lá.
   */
  terreno: boolean;
  /** Espalha na altura toda em vez de crescer do chão. É o que faz uma pedra FLUTUAR. */
  flutua?: boolean;
  /** Sprite ADITIVO (luzes da colônia, brilho de névoa): vira BRILHO em vez de mancha opaca. */
  glow?: boolean;
  /**
   * PRIMEIRO PLANO: passa NA FRENTE da nave (depth 60). É a única camada que a luta de chefão
   * apaga — ver `setForegroundDimmed`: durante a fase ela é dificuldade, durante o chefão ela
   * tapa a leitura dos padrões.
   */
  primeiroPlano?: boolean;
  /**
   * Limita a altura em que a camada flutuante nasce (`[min, max]`).
   *
   * Sem isto tudo o que flutua se espalha pela tela inteira — e a FAIXA do cinturão, que só é um
   * cinturão porque é uma BANDA, viraria pedra espalhada igual a todo o resto.
   */
  faixa?: [number, number];
  /**
   * Ancorada no TETO (Fase 4, o interior): origem no TOPO, o sprite cresce para BAIXO e vai de
   * cabeça para baixo (flipY). O espelho exato de `terreno` — o interior tem teto, e um teto
   * feito de sprites "de pé" pendurados leria como chão colado no alto da tela.
   */
  teto?: boolean;
  /** Camada EXTRA da nebulosa (Fase 3): o alpha dela segue `nebulaDim` (1 dentro, 0 fora). */
  nebulosaExtra?: boolean;
  /** O CASCO do Leviatã (Fase 3, Ato 2): o alpha segue o INVERSO de `nebulaDim` — sair da
   * nuvem e revelar o casco são o MESMO fade, e é por isso que são a mesma variável. */
  casco?: boolean;
  sprites: Phaser.GameObjects.Image[];
  nextX: number;
}

/**
 * O fundo do jogo, em dois lugares.
 *
 * `superficie` (Fase 1) — a lua. Montanhas, solo e picos em primeiro plano.
 * `espaco`     (Fase 2) — o vácuo. Sem chão: só nebulosa, planeta e pedra à deriva.
 *
 * As montanhas são sprites ESPALHADOS, não um TileSprite. Uma imagem repetida em tile mostra a
 * emenda a cada ciclo — o olho pega o padrão em segundos. Espalhar sprites com escala e
 * espelhamento variados não tem costura e parece um horizonte de verdade.
 *
 * O solo, sim, é TileSprite: ele usa um TILE 16×16 costurável do PixelLab, feito para repetir.
 *
 * A HISTÓRIA ESTÁ NO FUNDO (docs/GDD.md §7): a Lua de Kepler encolhendo atrás e o LEVIATÃ
 * crescendo à frente contam a aproximação inteira sem uma linha de diálogo. Vender ESCALA é o
 * mais difícil em pixel art, e estes dois sprites fazem isso sozinhos.
 */
export class Parallax {
  private readonly layers: ScatterLayer[] = [];
  // Não existem no vácuo: lá não há chão. Nulos, e não "invisíveis" — um TileSprite escondido
  // ainda seria atualizado todo frame para não ser visto.
  private ground: Phaser.GameObjects.TileSprite | null = null;
  private groundRim: Phaser.GameObjects.Rectangle | null = null;
  /** FUNDO PINTADO (Fase 1): duas cópias da arte da colônia que rolam devagar e se alternam. */
  private paintedBg: Phaser.GameObjects.Image[] = [];
  /**
   * FAIXA DE SOLO DA FRENTE (Fase 1): a MESMA arte do chão, um degrau à frente e ACIMA da linha
   * do solo, escondendo o pé "colado" dos props (silos/torres/picos) atrás dela. Não é sprite
   * novo — é o groundTile de novo, mais escuro e mais próximo.
   */
  private groundFront: Phaser.GameObjects.TileSprite | null = null;
  /**
   * A SAÍDA DA ATMOSFERA (Fase 1, ver `breakAtmosphere`). Tudo nasce em alpha 0 e só existe
   * durante os ~6.5s de zero-G: antes disso a Fase 1 está inteira na tela, depois disso a
   * cutscene assume.
   */
  private zeroGBg: Phaser.GameObjects.Image | null = null;
  /** As camadas de bruma, do fundo para a frente. `fator` é a velocidade relativa do arrasto. */
  private fog: {
    ts: Phaser.GameObjects.TileSprite;
    fator: number;
    pico: number;
    /** O y de repouso, e o quanto a banda desce ao se dissolver (ver `playAtmosphereExit`). */
    y: number;
    queda: number;
  }[] = [];
  /** Os fachos que atravessam a bruma. `deriva` é o quanto cada um anda por segundo. */
  private rays: { img: Phaser.GameObjects.Image; deriva: number; pico: number }[] = [];
  /** Ligado por `breakAtmosphere`: é o que faz o `update` gastar quadro com a bruma/fachos. */
  private exiting = false;
  private readonly leviathan: Phaser.GameObjects.Image;
  private readonly moon: Phaser.GameObjects.Image;
  private groundOffset = 0;
  /**
   * Multiplicador de alpha do PRIMEIRO PLANO (1 = fase normal, 0 = luta de chefão).
   *
   * Guardado aqui — e não só no tween — porque a camada RECICLA: um sprite que nasce em `emit()`
   * no meio da luta tem que já nascer apagado, senão pedras opacas atravessam a tela na frente
   * dos padrões do chefão.
   */
  private foregroundDim = 1;
  /** Densidade da nebulosa (Fase 3): 1 = dentro da nuvem. Ver `setNebulaDensity`. */
  private nebulaDim = 1;
  /**
   * A pintura do céu da FASE 3. Ela NÃO é uma `ScatterLayer` — é uma placa fixa, como o
   * `paintBgF2` — então o alpha dela não passa por `alphaFor`. Quem a apaga é o
   * `setNebulaDensity`, à mão. Ver o comentário lá.
   */
  private nebulaPainting: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly mode: ParallaxMode = 'superficie',
  ) {
    // Nebulosas e o planeta: o fundo mais distante, quase parado. É o que dá PROFUNDIDADE —
    // sem eles a tela é preta e o parallax não tem contra o quê ser medido.
    // Existem NOS DOIS lugares: eles são o espaço, e o espaço não acaba na atmosfera.
    this.addLayer({
      key: 'nebula',
      factor: 0.03,
      baseY: 120,
      depth: -98,
      tint: 0x4a5a8c,
      // Azul (o tom de sempre), violeta e petróleo — o céu deixa de ser monocromático sem
      // ganhar nenhuma cor que brigue com o ciano do jogador ou o magenta do inimigo.
      tints: [0x4a5a8c, 0x5e4a8c, 0x3d6a80],
      alpha: 0.5,
      scale: [1.1, 1.8],
      gap: [140, 230],
      terreno: false,
    });

    // O PLANETA. Na lua ele é um gigante gasoso anelado, intacto, ao longe.
    //
    // No cinturão ele é o MESMO planeta PARTIDO — rachado até o núcleo e sangrando escombros. É a
    // causa do lugar: o cinturão é o que sobrou dele. Trocar este único sprite é o que impede o
    // fundo da Fase 2 de ser o fundo da Fase 1 outra vez (era essa a queixa: o vácuo tinha
    // exatamente o céu da lua de onde o jogador acabara de decolar).
    const mundo = mode !== 'superficie' && this.scene.textures.exists('planetBroken')
      ? 'planetBroken'
      : 'planet';

    this.addLayer({
      key: mundo,
      factor: 0.06,
      baseY: 108,
      depth: -97,
      tint: 0x8a93b8,
      alpha: 0.85,
      scale: [0.75, 1.15],
      gap: [520, 900],
      terreno: false,
    });

    if (mode === 'superficie') this.buildSurface();
    else if (mode === 'interior') this.buildInterior();
    else this.buildSpace();
    // A nebulosa é o ESPAÇO mergulhado numa nuvem: tudo do vácuo continua lá, mais as camadas
    // densas — e o casco do Leviatã dormindo com alpha 0, esperando a saída da nuvem revelá-lo.
    if (mode === 'nebulosa') this.buildNebula();

    // A lua REAL (`moonBelt`, recorte do `menuMoon` do menu — mesmo disco, e o cinturão de
    // destroços que ele já carregava serve de graça à história da Fase 2). Mesma caixa 96×96 da
    // placeholder procedural (`moon`, o fallback), então os números do `setApproach()` abaixo
    // (escala/posição — fechados, esta fatia não mexe neles) continuam valendo sem ajuste.
    const moonKey = scene.textures.exists('moonBelt') ? 'moonBelt' : 'moon';
    this.moon = scene.add.image(300, 190, moonKey).setDepth(-95).setAlpha(0).setScale(1.6);

    // O LEVIATÃ É UMA SILHUETA DISTANTE — e o TINT é o que faz dele uma.
    //
    // Sem tint ele aparecia como uma LAJE azul-clara de bordas retas atravessando o céu (o
    // placeholder é preenchido com `bgMid`, que é MAIS CLARO que o fundo do espaço: um objeto
    // "distante" desenhado mais claro que o vazio atrás dele lê como uma parede na frente, não
    // como uma massa no horizonte). Achado com uma sonda A/B — esconde o sprite, tira o print,
    // compara —, não a olho nu.
    //
    // É a mesma perspectiva aérea das montanhas da Fase 1: a profundidade vem do TINT, e o que
    // está longe é ESCURO. Vale igual quando a arte de verdade entrar — ele é o destino da
    // campanha, e um destino tem que parecer LONGE até a hora de chegar nele.
    this.leviathan = scene.add
      .image(330, 60, 'leviathan')
      .setDepth(-94)
      .setAlpha(0)
      .setScale(0.5)
      .setTint(0x2a3352);

    // No vácuo os dois já estão lá desde o primeiro frame: a Fase 1 terminou mostrando-os, e a
    // Fase 2 não pode "esquecer" o Leviatã e reapresentá-lo. Ele é o destino — está sempre à vista.
    if (mode === 'espaco') {
      // A lua que você DEIXOU: atrás (à esquerda) e grande — ainda perto, no começo da fase.
      //
      // DESLIGADA por decisão do Henrique (2026-08-08): a arte é a placeholder procedural
      // (`makeMoon`), e mesmo trocada pela `moonBelt` (ver commit anterior) ela competia com o
      // fundo pintado novo. `setApproach()` continua calculando posição/escala normalmente — só
      // o alpha fica de fora — então religar é só descomentar a linha abaixo quando houver arte
      // (ou uma composição) que combine com a pintura.
      this.moon.setPosition(58, 168).setScale(1.25);
      // this.moon.setAlpha(0.8);
      // O Leviatã, à FRENTE (à direita). Longe e pequeno — por enquanto.
      this.leviathan.setPosition(304, 72).setScale(0.5).setAlpha(0.45);
    }
    if (mode === 'nebulosa') {
      // Fase 3: a lua ficou para trás de vez; o Leviatã já entra GRANDE — a Fase 2 terminou
      // com ele a 1.15, e a Fase 3 não pode reapresentá-lo pequeno (mesma regra da Fase 2 não
      // "esquecer" a lua). Ele cresce até virar o chão no Ato 2.
      this.leviathan.setPosition(310, 66).setScale(1.15).setAlpha(0.5);
    }
  }

  /**
   * O INTERIOR do Leviatã (Fase 4) — o hangar da 3ª cutscene virando MUNDO.
   *
   * A parede de fundo é a PRÓPRIA arte do hangar repetida (mesma família visual da cutscene:
   * o jogador acabou de POUSAR nesse lugar — o corredor tem que parecer o mesmo navio). As
   * janelas dela são VAZADAS (scripts/vazar-janelas.mjs), então a nebulosa e o planeta
   * partido aparecem ATRAVÉS delas de graça — a referência do Henrique: interior industrial
   * com janelões mostrando o espaço.
   *
   * Chão e TETO são bandas contínuas de placas (`derelict`) — a mesma receita do casco do
   * Ato 2 da F3 (continuidade: o chão da F4 é o MESMO material do casco que o jogador
   * sobrevoou), agora espelhada no alto: o interior é a primeira fase FECHADA POR CIMA, e o
   * fundo anuncia o verbo dela (precisão) antes de o primeiro corredor apertar.
   */
  private buildInterior(): void {
    // A nebulosa pelas janelas: só fragmentos dela são visíveis (pelos buracos vazados), então
    // ela pode ser esparsa — está ali para dar COR ao vazio, não para ser protagonista.
    this.addLayer({
      key: 'nebula3',
      factor: 0.03,
      baseY: 0,
      depth: -96,
      tint: 0xffffff,
      tints: [0xb8c4e8, 0x8fa0c8, 0xe8d8c0],
      alpha: 0.5,
      scale: [1.6, 2.4],
      gap: [180, 300],
      terreno: false,
      flutua: true,
    });

    // A PAREDE: hangar atrás de hangar, quase contínuo (gap < largura da arte). Tint frio e
    // escuro — é fundo, e fundo distante é ESCURO (a mesma perspectiva aérea das montanhas).
    this.addLayer({
      key: 'hangar',
      factor: 0.06,
      baseY: 208,
      depth: -90,
      tint: 0x707a98,
      tints: [0x707a98, 0x64708c, 0x7a82a0],
      alpha: 0.95,
      scale: [1.15, 1.3],
      gap: [150, 180],
      terreno: false,
    });

    // O CHÃO: a banda de placas do casco (receita da F3), sempre visível.
    this.addLayer({
      key: 'derelict',
      factor: 1.0,
      baseY: GAME_HEIGHT + 26,
      depth: -75,
      tint: 0x2f3a55,
      alpha: 0.95,
      scale: [1.1, 1.5],
      gap: [78, 108],
      terreno: false,
    });

    // O TETO: a mesma banda, espelhada no alto (flag `teto`). Um tom mais escuro que o chão —
    // a luz das fases vem sempre de baixo/frente, e um teto tão claro quanto o chão achataria
    // o túnel.
    this.addLayer({
      key: 'derelict',
      factor: 1.0,
      baseY: -26,
      depth: -75,
      tint: 0x27304a,
      alpha: 0.95,
      scale: [1.1, 1.5],
      gap: [78, 108],
      terreno: false,
      teto: true,
    });

    // VIGAS SOLTAS no primeiro plano: as silhuetas que passam na frente da nave (dificuldade
    // de leitura na fase; o chefão as apaga via setForegroundDimmed, como nas outras).
    // Com FAIXA e escala contida: a placa girada em ângulo aleatório a escala 2.1 lia como um
    // BORRÃO preto tapando um canto da tela, não como viga (revisão visual). A faixa a mantém
    // horizontal — viga passa deitada — e o tom sobe um degrau para ela ter silhueta, não buraco.
    this.addLayer({
      key: 'derelict',
      factor: 1.3,
      baseY: 0,
      depth: 60,
      tint: 0x1a2440,
      alpha: 1,
      scale: [1.0, 1.4],
      gap: [380, 560],
      terreno: false,
      flutua: true,
      faixa: [30, 186],
      primeiroPlano: true,
    });

    // ─── A ANATOMIA DO BICHO (2026-07-21) ───
    //
    // O hangar repetido dizia "estação espacial", não "dentro de um bicho VIVO". As camadas
    // orgânicas são o que fecha a leitura: COSTELAS biônicas arcando do chão e do teto em duas
    // distâncias (a longínqua escura e lenta, a próxima no plano do chão), órgãos à deriva no
    // meio-fundo e maquinário pesado pendurado no teto. Os tints são ESCUROS de propósito:
    // perspectiva aérea — e é o que separa cenário dos obstáculos jogáveis (as costelas do
    // corredor, que nascem SEM tint, claras).
    this.addLayer({
      key: 'costela',
      factor: 0.45,
      baseY: GAME_HEIGHT + 30,
      depth: -85,
      tint: 0x2e2838,
      alpha: 1,
      scale: [0.3, 0.48],
      gap: [130, 210],
      terreno: false,
    });
    // O teto tem a caixa torácica dele: o espelho escuro, um degrau mais lento e esparso.
    this.addLayer({
      key: 'costela',
      factor: 0.4,
      baseY: -30,
      depth: -85,
      tint: 0x282234,
      alpha: 1,
      scale: [0.3, 0.46],
      gap: [150, 250],
      terreno: false,
      teto: true,
    });
    // As costelas PRÓXIMAS: quase no plano do chão, um tom acima — são elas que fazem o
    // corredor ler como a garganta do bicho fechando à frente.
    this.addLayer({
      key: 'costela',
      factor: 0.9,
      baseY: GAME_HEIGHT + 34,
      depth: -74,
      tint: 0x4a3e48,
      alpha: 1,
      scale: [0.42, 0.6],
      gap: [180, 300],
      terreno: false,
    });
    // ÓRGÃOS à deriva no meio-fundo: massas vivas presas entre as costelas, longe e lentas.
    this.addLayer({
      key: 'orgao',
      factor: 0.3,
      baseY: 0,
      depth: -88,
      tint: 0x5a4048,
      alpha: 0.9,
      scale: [0.5, 0.9],
      gap: [220, 420],
      terreno: false,
      flutua: true,
      faixa: [50, 170],
    });
    // MAQUINÁRIO PESADO pendurado no teto: o bicho é biomecânico — carne E máquina.
    this.addLayer({
      key: 'maquinario',
      factor: 0.65,
      baseY: -18,
      depth: -80,
      tint: 0x3a4258,
      alpha: 0.95,
      scale: [0.6, 1.0],
      gap: [260, 480],
      terreno: false,
      teto: true,
    });
  }

  /** A lua da Fase 1: montanhas, solo, e picos pretos passando na frente da nave. */
  private buildSurface(): void {
    // GRADIENTE DE CÉU: topo mais preto → horizonte um tom acima. Dá VOLUME ao céu (era preto
    // chapado). Estático (é o céu), depth −99 (atrás de tudo). Frio e escuro — a Fase 1 segue dark.
    const ceu = this.scene.add.graphics().setDepth(-99);
    ceu.fillGradientStyle(0x05070f, 0x05070f, 0x141c30, 0x141c30, 1);
    ceu.fillRect(0, 0, GAME_WIDTH, GROUND_Y);

    // FUNDO PINTADO (Metal Slug): a arte da colônia alienígena (do Henrique) como a camada MAIS
    // DISTANTE, preenchendo o céu azul-escuro vazio ATRÁS das cidades/montanhas pixel (depth −94:
    // atrás do skyline −93 e das montanhas, à frente do céu procedural). Duas cópias de reserva,
    // mas o scroll é tão lento (ver `update`, fator 0.04) que a 1ª cópia cobre a fase inteira e a
    // paisagem NUNCA repete. Y negativo posiciona os picos/colônia no céu.
    if (this.scene.textures.exists('paintBgF1')) {
      const w = (this.scene.textures.get('paintBgF1').getSourceImage() as { width: number }).width;
      for (let i = 0; i < 2; i++) {
        this.paintedBg.push(
          this.scene.add.image(i * w, -80, 'paintBgF1').setOrigin(0, 0).setDepth(-94),
        );
      }
    }

    // TRÁFEGO DISTANTE DA COLÔNIA (passe visual 2026-07-18): silhuetas minúsculas cruzando o
    // vão de céu vazio no meio da tela. A colônia embaixo está VIVA (janelas acesas, radar
    // varrendo) — um céu absolutamente deserto desmentia isso. Eles são CENÁRIO: escuros como
    // o fundo, lentos como o fundo (factor 0.08), presos numa banda alta onde nenhum inimigo
    // real voa — a cor e o ritmo dizem "longe" antes de qualquer um mirar neles.
    // A `faixa` também os mantém HORIZONTAIS (sem o giro aleatório das pedras): nave voa de pé.
    this.addLayer({
      key: 'enemyScout',
      factor: 0.08,
      baseY: 0,
      depth: -96,
      tint: 0x1c2440,
      alpha: 0.9,
      scale: [0.45, 0.65],
      // Denso o bastante para QUASE sempre haver 1 na tela; raro o bastante para nunca virar
      // esquadrilha (tráfego de colônia, não formação de ataque).
      gap: [280, 520],
      terreno: false,
      flutua: true,
      faixa: [22, 68],
    });
    // ALPHA = 1 nas montanhas. Com alpha < 1, duas sobrepostas somam o escuro e aparece uma
    // banda vertical na silhueta de uma delas. A profundidade vem do TINT (perspectiva aérea),
    // não da opacidade.
    //
    // GAP MENOR QUE A LARGURA = sobreposição obrigatória. A arte encosta na borda do canvas,
    // então cada sprite termina numa PAREDE VERTICAL reta. Espaçados, esse corte fica exposto
    // contra o céu — era o "risco lateral". Sobrepostos, o vizinho o cobre.
    // O HORIZONTE DA COLÔNIA: skyline industrial ATRÁS das montanhas distantes (mais escura
    // que elas — o que está longe é escuro, perspectiva aérea). Em bolsões espaçados: a colônia
    // é assentamento em cordão, não megacidade contínua.
    // baseY um pouco ABAIXO da linha do solo (não acima): a base reta dos prédios fica ENTERRADA
    // atrás do chão (−80) e da faixa da frente (−0.2), que a ocultam. Com `GROUND_Y − 6` o pé
    // ficava 6px ACIMA do solo, e a borda reta flutuava — invisível na fase (os picos na frente a
    // tapavam), mas exposta na luta de chefão, que limpa o primeiro plano. O skyline agora nasce
    // do horizonte em vez de pairar sobre ele.
    this.addLayer({
      key: 'skyline',
      factor: 0.1,
      baseY: GROUND_Y + 2,
      depth: -93,
      tint: 0x151e38,
      alpha: 1,
      scale: [0.7, 1.0],
      gap: [170, 320],
      terreno: true,
    });

    // LUZES FRIAS DA COLÔNIA: pontos de luz pontilhando o horizonte industrial (o "vale com luz"
    // do ref, mas alienígena — ciano frio, não janela amarela). Aditivas (glow), na velocidade do
    // skyline. Faixa NA ALTURA das torres do skyline (não rente ao chão); densas. Depth −92.9:
    // logo à frente do skyline (−93) — um cume à frente ainda OCLUI a luz distante (perspectiva).
    this.addLayer({
      key: 'colonyLight',
      factor: 0.1,
      baseY: 0,
      depth: -92.9,
      tint: 0xffffff,
      alpha: 1,
      scale: [0.8, 1.7],
      gap: [20, 50],
      terreno: true,
      flutua: true,
      faixa: [GROUND_Y - 68, GROUND_Y - 18],
      glow: true,
    });

    // O CÉU COM EVENTO: um cometa raríssimo cruzando o alto. Raro DE PROPÓSITO — ponto de
    // interesse é o que quebra a monotonia; dois na mesma tela viram papel de parede animado.
    this.addLayer({
      key: 'cometSky',
      factor: 0.05,
      baseY: 0,
      depth: -96,
      tint: 0x9fb8e0,
      alpha: 0.8,
      scale: [0.5, 0.8],
      gap: [1400, 2600],
      terreno: false,
      flutua: true,
      faixa: [14, 48],
    });

    // As MONTANHAS DE ROCHA pixel (mtnFar/mtnMid/mtnNear) e a haze entre elas foram REMOVIDAS: o
    // FUNDO PINTADO já entrega as montanhas distantes, e elas nasciam na LINHA DO SOLO mas rolavam
    // em parallax lento (10–50 px/s) contra o chão/props (que correm a 84) — o "deslizamento" do
    // solo. Sem elas, o solo não desliza mais e a cena não duplica montanha pixel sobre a pintada.

    // Alto o bastante para sangrar para fora da tela: uma faixa fina de solo denuncia
    // que o mundo acaba ali embaixo.
    this.ground = this.scene.add
      .tileSprite(0, GROUND_Y, GAME_WIDTH, 48, 'groundTile')
      .setOrigin(0, 0)
      .setDepth(-80)
      // O tile novo (2026-07-18) é ROCHA rachada, já na paleta — o tile antigo era o "trilho"
      // de rebites roxo que precisava de correção (e de tint). O PNG é [arte | arte espelhada]
      // (128px): espelhar garante emenda invisível nos DOIS lados sem depender do gerador.
      // SEM tint: só 10px do chão aparecem (GROUND_Y = 216-10) — escurecer mataria a textura.
      .setTint(0xffffff);

    // Aresta de luz no topo do solo. Sem ela, chão e montanhas viram uma massa escura só —
    // é o contraste que diz ao olho onde o terreno começa.
    this.groundRim = this.scene.add
      .rectangle(0, GROUND_Y, GAME_WIDTH, 1, 0x7590b8)
      .setOrigin(0, 0)
      .setDepth(-79)
      .setAlpha(0.7);

    // FAIXA DE SOLO DA FRENTE: a MESMA arte do chão, começando um pouco ACIMA da linha do solo
    // (GROUND_Y−5) e um tom mais escura (o solo mais PERTO, em leve sombra). Ela cobre o pé dos
    // props (silos/torres/picos), escondendo a borda reta onde ficavam "colados". Depth −0.2: à
    // FRENTE dos props (que passam a −0.5, ver TerrainSystem.spawn), mas ATRÁS da nave/inimigos
    // (depth 0) — a nave NUNCA some atrás da faixa. Rola junto com o mundo (mesmo `groundOffset`),
    // senão os props deslizariam sobre o chão.
    this.groundFront = this.scene.add
      .tileSprite(0, GROUND_Y - 5, GAME_WIDTH, 48, 'groundTile')
      .setOrigin(0, 0)
      .setDepth(-0.2)
      .setTint(0x6878a0);

    // O ENTULHO do chão (pedido do Henrique, 2026-07-18): pedras avulsas ASSENTADAS na linha do
    // solo, correndo na MESMA velocidade dele (factor 1.0 = o groundOffset). É o que quebra o
    // "trilho": um chão em que nada muda por 75s lê como esteira; meia dúzia de calhaus
    // diferentes por tela lê como TERRENO. São decoração pura — nada colide, e o tint na
    // família do solo os cola nele (não competem com o `spire` jogável, que é claro e alto).
    this.addLayer({
      key: 'asteroid',
      factor: 1.0,
      baseY: GROUND_Y + 7,
      depth: -78,
      tint: 0x5a6e94,
      alpha: 1,
      scale: [0.22, 0.45],
      gap: [60, 140],
      terreno: true,
    });

    // NÉVOA RASTEIRA: fog frio e sutil cruzando a linha do chão (o fog de solo do Metal Slug). Dá
    // "ar" ao terreno. Depth −84: à frente das montanhas, atrás do chão e dos obstáculos; dim
    // para dar atmosfera sem esconder o jogo.
    this.addLayer({
      key: 'nebula',
      factor: 0.75,
      baseY: 0,
      depth: -84,
      tint: 0x1c2740,
      alpha: 0.16,
      scale: [1.2, 2.0],
      gap: [140, 240],
      terreno: true,
      flutua: true,
      faixa: [GROUND_Y - 20, GROUND_Y + 8],
    });

    // PRIMEIRO PLANO: rochas em silhueta quase preta, MAIS RÁPIDAS que o mundo, passando NA
    // FRENTE da nave (depth 60). É o que mais vende profundidade — sem nada à frente, o
    // cenário é chapado por mais camadas que tenha atrás.
    //
    // Fica baixo e escuro de propósito: um primeiro plano que tapa o jogo é um estorvo, não
    // uma camada. Só as pontas aparecem, rente ao rodapé.
    // Usa o PICO, não a montanha média: em silhueta preta, a montanha (uma massa densa que
    // preenche a própria caixa) vira um retângulo chapado. O pico é recortado e pontudo —
    // é o que ainda tem FORMA quando reduzido a uma cor só.
    this.addLayer({
      key: 'spire',
      factor: 1.5,
      baseY: GAME_HEIGHT + 8,
      depth: 60,
      // 0x05070f era preto puro na prática: contra a lua ou o céu, o pico virava uma MANCHA sem
      // forma (parecia um buraco na tela, não uma rocha passando perto). Este azul-abissal
      // continua o mais escuro da cena — a hierarquia de profundidade fica — mas deixa o relevo
      // da arte aparecer de leve.
      tint: 0x121a2e,
      alpha: 1,
      scale: [0.9, 1.6],
      // Espaçado: o primeiro plano é PONTUAL. Contínuo, viraria uma parede tapando o jogo.
      gap: [120, 230],
      terreno: true,
      primeiroPlano: true,
    });

    this.buildAtmosphereExit();
  }

  /**
   * A SAÍDA DA ATMOSFERA — a pintura, a bruma e os fachos dos ~6.5s de zero-G.
   *
   * Tudo nasce em ALPHA 0 e fica assim a fase inteira: quem acende é `breakAtmosphere()`. Montar
   * na construção (e não na hora) é de propósito — criar TileSprite e imagem no instante em que a
   * Torre morre é engasgo garantido no quadro que o jogador mais olha.
   *
   * ─── POR QUE A PROFUNDIDADE DA PINTURA É −95.5 ───
   *
   * Ela é OPACA, então tudo o que estiver atrás dela some de graça: o gradiente de céu (−99), a
   * nebulosa de fundo (−98) e o tráfego da colônia (−96). Só sobra apagar à mão o que está NA
   * FRENTE dela e não é terreno: o fundo pintado da Fase 1 (−94) e a faixa de solo (−0.2). A lua
   * (−95) e o Leviatã (−94) continuam por cima, que é onde eles têm que estar — o
   * `breakAtmosphere` de sempre os acende.
   */
  private buildAtmosphereExit(): void {
    if (!this.scene.textures.exists('paintBgZeroG')) return;

    this.zeroGBg = this.scene.add
      // −27 = (270−216)/2, a mesma conta do `paintBgF2`/`paintBgCut1`: a pintura é maior que a
      // janela do jogo, e a folga fica repartida em cima e embaixo.
      .image(0, -27, 'paintBgZeroG')
      .setOrigin(0, 0)
      .setDepth(-95.5)
      .setAlpha(0);

    // ─── A BRUMA, em cinco camadas ───
    //
    // Cinco e não uma porque o que vende VOLUME é a diferença de VELOCIDADE entre elas: uma névoa
    // só, por mais densa que seja, lê como filtro por cima da tela. O `fator` é o arrasto de cada
    // uma, e a da frente corre 12× a do fundo — é essa disparidade que diz "estou atravessando
    // alguma coisa" em vez de "tem uma cor por cima da tela".
    //
    // As cinco moram na METADE DE BAIXO: é de lá que a nave está saindo. Bruma no topo diria que
    // ela está entrando em alguma coisa.
    //
    // Duas ficam ATRÁS dos fachos (−95.4, −94.5) e três NA FRENTE (−92, −20, 55). Os fachos no
    // meio do sanduíche é o que faz eles atravessarem a névoa em vez de pousarem sobre ela.
    //
    // `queda` é o quanto a banda DESCE ao se dissolver — ver `playAtmosphereExit`. É o que
    // transforma "a névoa sumiu" em "a nave subiu acima dela".
    const bandas: {
      y: number;
      h: number;
      tint: number;
      pico: number;
      fator: number;
      depth: number;
      queda: number;
    }[] = [
      // Teto de nuvem, quase parado, lá no fundo.
      { y: 66, h: 116, tint: 0x2b2545, pico: 0.85, fator: 0.08, depth: -95.4, queda: 44 },
      { y: 94, h: 116, tint: 0x342c52, pico: 0.72, fator: 0.2, depth: -94.5, queda: 60 },
      { y: 118, h: 116, tint: 0x39325a, pico: 0.64, fator: 0.36, depth: -92, queda: 78 },
      { y: 138, h: 124, tint: 0x241f3e, pico: 0.5, fator: 0.6, depth: -20, queda: 98 },
      // A da FRENTE, passando por cima da nave (depth 55, como o primeiro plano de rochas). É a
      // camada que mais custa e mais entrega: sem nada na frente, a bruma é cenário; com ela, a
      // nave está DENTRO da bruma. A mais fraca das cinco de propósito — ela cobre o jogador, e
      // uma névoa que esconde a própria nave vira estorvo, não volume.
      { y: 156, h: 130, tint: 0x1b1832, pico: 0.38, fator: 0.95, depth: 55, queda: 124 },
    ];

    for (const b of bandas) {
      const ts = this.scene.add
        .tileSprite(0, b.y, GAME_WIDTH, b.h, 'fogBand')
        .setOrigin(0, 0)
        .setDepth(b.depth)
        .setTint(b.tint)
        .setAlpha(0);
      // A banda é 256×64 e a faixa é mais alta: esticar na vertical dá nuvem LONGA em vez de
      // fileira de bolinhas repetidas. As escalas horizontais diferem de camada para camada
      // (1.0 no fundo → 0.62 na frente) porque bolinha do mesmo tamanho em cinco profundidades
      // denuncia que é a MESMA textura cinco vezes — o que está perto tem que ter grão maior.
      ts.setTileScale(1 - this.fog.length * 0.095, b.h / 64);
      this.fog.push({ ts, fator: b.fator, pico: b.pico, y: b.y, queda: b.queda });
    }

    // ─── OS FACHOS ───
    //
    // Depth −93.5: entre a bruma funda (−95.4) e a média (−92). Não é enfeite de ordenação — é
    // literalmente o pedido: os raios PASSAM PELA névoa, com bruma atrás e bruma na frente.
    //
    // A cor sai do arco de atmosfera da própria pintura (âmbar frio, não amarelo de sol), e o
    // ângulo é o dele: sobem da esquerda-baixa para a direita-alta. Blend ADD com pico baixo —
    // a lição da decolagem do chefão foi que clarão que lava a tela apaga o que o jogador
    // precisava ver, e aqui o que ele precisa ver é a pintura.
    const fachos: { x: number; y: number; escala: number; pico: number; deriva: number }[] = [
      { x: 40, y: 150, escala: 1.5, pico: 0.2, deriva: 5 },
      { x: 150, y: 108, escala: 2.1, pico: 0.14, deriva: 8 },
      { x: 250, y: 168, escala: 1.7, pico: 0.18, deriva: 6 },
      { x: 320, y: 126, escala: 1.3, pico: 0.11, deriva: 10 },
    ];

    for (const f of fachos) {
      const img = this.scene.add
        .image(f.x, f.y, 'godRay')
        .setDepth(-93.5)
        .setTint(0xffcf9a)
        .setAlpha(0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAngle(-24)
        .setScale(f.escala, 1);
      this.rays.push({ img, deriva: f.deriva, pico: f.pico });
    }
  }

  /**
   * O vácuo da Fase 2: nenhum chão, nenhuma montanha.
   *
   * O primeiro plano continua existindo — é ele que vende a profundidade — mas agora é PEDRA
   * À DERIVA, espalhada na altura toda em vez de nascer do rodapé. Um pico de rocha subindo do
   * nada, no espaço, denunciaria que a camada é a mesma da Fase 1 com outra cor.
   *
   * ─── O FUNDO PRECISA DIZER "CINTURÃO" ───
   *
   * Antes ele não dizia. A Fase 2 herdava o céu da Fase 1 inteiro (a mesma nebulosa, o mesmo
   * planeta anelado intacto) e só acrescentava pedras na frente. O jogador saía da lua, atravessava
   * uma cutscene, e caía num lugar cujo horizonte era idêntico ao que ele tinha acabado de deixar
   * — o fundo desmentia a viagem.
   *
   * A correção não é "mais rochas": é uma FAIXA (`belt`), que é como um cinturão se parece visto
   * de dentro — uma banda densa de escombros atravessando o céu, não pedras avulsas —, e é o
   * PLANETA PARTIDO ao fundo, que responde de onde veio tudo isso. O fundo passa a ter uma causa.
   */
  private buildSpace(): void {
    // FUNDO PINTADO (arte do Henrique): a colônia de mineração do cinturão, como a camada MAIS
    // DISTANTE de todas — atrás até da nebulosa procedural (−98). Ela ENTRA, não SUBSTITUI: ao
    // contrário da cutscene 1 (onde a pintura trocou o `Parallax('espaco')` inteiro), aqui a
    // lua-encolhendo/Leviatã-crescendo é mecânica de narrativa ativa que não pode desaparecer —
    // a pintura só preenche o vazio atrás dela.
    //
    // ⚠️ DIMENSÃO 480×270 (não 2 telas largo como o `paintBgF1`) — mesma receita do
    // `paintBgCut1` da cutscene 1, e por um motivo específico deste quadro: o `paintBgF1` é um
    // céu de montanhas com MUITO vazio (a maior parte fica atrás do skyline/montanhas
    // procedurais, que TAPAM o resto — ver `buildSurface`). O `paintBgF2` é uma cena FECHADA
    // (guindastes, prédios, rochas até a borda) sem nada na frente que a esconda — a instalação
    // original entrou em 768×432 (2 telas, câmera "por dentro" do quadro) e qualquer recorte de
    // 216px dela mostrava só um PEDAÇO da cena, com as rochas de primeiro plano da PRÓPRIA
    // pintura preenchendo a tela = lia como perto/ampliada. Em 480×270 (só 25% maior que os
    // 384×216 do jogo) o quadro INTEIRO cabe na janela — é a mesma pintura, só exibida como o
    // Henrique a compôs, não recortada no meio.
    //
    // Cada entrada de `paintedBg[]` carrega o próprio fator de scroll em `data('bgFactor')`
    // (0.04 se ausente — o que o `paintBgF1` continua usando); 0.018 aqui porque mesmo a cena
    // inteira, ela ainda tem elementos de primeiro plano na própria composição.
    //
    // `buildSpace()` também é chamado pelo modo 'nebulosa' (Fase 3: o vácuo continua lá, mais a
    // nuvem por cima) — mas a pintura é da COLÔNIA do cinturão, cenário só da Fase 2. Sem o
    // guard de `mode`, ela vazaria para dentro da nuvem da Fase 3.
    if (this.mode === 'espaco' && this.scene.textures.exists('paintBgF2')) {
      const w = (this.scene.textures.get('paintBgF2').getSourceImage() as { width: number }).width;
      for (let i = 0; i < 2; i++) {
        this.paintedBg.push(
          this.scene.add
            // −27 = (270−216)/2: centraliza verticalmente a pintura na janela do jogo — mesma
            // conta que o `paintBgCut1` da cutscene 1 já usa pra essa mesma dimensão.
            .image(i * w, -27, 'paintBgF2')
            .setOrigin(0, 0)
            .setDepth(-99)
            .setData('bgFactor', 0.018),
        );
      }
    }

    // A FAIXA DO CINTURÃO. Bem atrás, quase parada, e é a camada que dá o NOME do lugar: uma
    // banda espessa de escombros correndo na horizontal. Fica na altura do meio e é ESTREITA na
    // vertical — um cinturão visto de dentro é uma linha, não uma nuvem: é essa leitura de
    // "estamos no plano dele" que a Fase 2 vende.
    // A FROTA MORTA DE VERDADE: cascos capitais partidos, GRANDES e lentíssimos, atravessando
    // o fundo. O cinturão dizia "campo de pedra"; são eles que dizem "cemitério de naves".
    // Presos na horizontal (faixa) — nave capital não deriva de ponta-cabeça.
    this.addLayer({
      key: 'derelict',
      factor: 0.07,
      baseY: 0,
      depth: -94,
      tint: 0x232c46,
      alpha: 1,
      scale: [0.9, 1.4],
      gap: [520, 900],
      terreno: false,
      flutua: true,
      faixa: [40, 130],
    });

    this.addLayer({
      key: 'belt',
      factor: 0.1,
      baseY: 0,
      depth: -93,
      tint: 0x2a3352,
      // O cinturão é o cadáver de um MUNDO: pedra, mas também metal morto. O azul de sempre,
      // um roxo-cinza e uma ferrugem apagada — a faixa ganha textura de escombro variado sem
      // perder a leitura de banda contínua (todos no mesmo nível de escuro).
      tints: [0x2a3352, 0x3a3048, 0x40342c],
      alpha: 0.9,
      scale: [0.8, 1.25],
      // Sobreposto de propósito (gap < largura): a faixa tem que ser CONTÍNUA. Espaçada, ela
      // vira ilhas de cascalho e deixa de ser um cinturão.
      gap: [70, 110],
      terreno: false,
      // Faixa ESTREITA em volta do meio da tela — não espalhada na altura toda como as pedras.
      flutua: true,
      faixa: [70, 150],
    });

    // Cinturão distante: a massa de rocha que dá volume ao fundo, bem atrás e quase parada.
    this.addLayer({
      key: 'asteroid',
      factor: 0.18,
      baseY: 0,
      depth: -90,
      tint: 0x232c4a,
      alpha: 1,
      scale: [0.8, 1.7],
      gap: [40, 90],
      terreno: false,
      flutua: true,
    });

    // Primeiro plano, NA FRENTE da nave: silhuetas quase pretas correndo mais rápido que o
    // mundo. Espaçadas — contínuo, taparia o jogo.
    this.addLayer({
      key: 'asteroid',
      factor: 1.5,
      baseY: 0,
      depth: 60,
      // O mesmo ajuste do pico da superfície: preto puro lia como buraco, não como pedra.
      tint: 0x121a2e,
      alpha: 1,
      scale: [1.4, 2.6],
      gap: [130, 260],
      terreno: false,
      flutua: true,
      primeiroPlano: true,
    });
  }

  /**
   * A NEBULOSA da Fase 3, POR CIMA do espaço: a nave está DENTRO da nuvem.
   *
   * Três camadas de nuvem (fundo denso, meio, e VÉUS na frente da nave) — todas
   * `nebulosaExtra`, apagáveis pelo `setNebulaDensity` quando a fase sai da nuvem. E o CASCO
   * do Leviatã: uma banda contínua de placas no rodapé, com alpha 0 até a saída da nuvem
   * revelá-la (`casco`). Proporção da referência do Henrique (Metal Slug): o "chão" é uma
   * faixa GENEROSA e detalhada, não um risco no rodapé.
   */
  private buildNebula(): void {
    // A PINTURA DO HENRIQUE é o corpo da nuvem. Ela SUBSTITUI a camada procedural mais profunda
    // (a de baixo, `factor 0.05`) — as outras duas continuam, e é isso que mantém o movimento:
    // uma placa parada atrás + nuvem procedural derivando por cima lê como "voar dentro"; a placa
    // sozinha leria como papel de parede.
    //
    // ⚠️ Ela é uma PLACA, não uma ScatterLayer: o alpha dela não passa por `alphaFor`, e por isso
    // o `setNebulaDensity` a apaga à mão. Sem isso ela ficaria de pé depois de t=42 e o ATO 2
    // teria nebulosa no céu — a fase inteira perderia a virada.
    //
    // −27 = (270−216)/2: centraliza a pintura de 480×270 na janela de 384×216. Duas cópias
    // lado a lado, como o `paintBgF2`, para a rolagem nunca mostrar buraco.
    const temPintura = this.scene.textures.exists('paintBgF3');
    if (temPintura) {
      const w = (this.scene.textures.get('paintBgF3').getSourceImage() as { width: number }).width;
      for (let i = 0; i < 2; i++) {
        this.nebulaPainting.push(
          this.scene.add
            .image(i * w, -27, 'paintBgF3')
            .setOrigin(0, 0)
            .setDepth(-97)
            .setData('bgFactor', 0.02),
        );
      }
      this.paintedBg.push(...this.nebulaPainting);
    }

    // O corpo da nuvem: grande, sobreposto (gap < largura), quase parado. É ele que diz
    // "estamos DENTRO" — nuvem espaçada é nuvem vista de fora.
    // ⚠️ SÓ ENTRA SEM A PINTURA. Com ela, esta é a camada substituída (fallback = o visual antigo).
    if (!temPintura) {
      this.addLayer({
        key: 'nebula3',
        factor: 0.05,
        baseY: 0,
        depth: -96,
        tint: 0xffffff,
        // A arte já é dourado-sobre-azul; os tints só variam a temperatura entre nuvens.
        tints: [0xffffff, 0xe8d8c0, 0xb8c4e8],
        alpha: 0.85,
        scale: [1.8, 3.0],
        gap: [95, 160],
        terreno: false,
        flutua: true,
        nebulosaExtra: true,
      });
    }

    this.addLayer({
      key: 'nebula3',
      factor: 0.16,
      baseY: 0,
      depth: -89,
      tint: 0xd8c8b0,
      alpha: 0.65,
      scale: [1.0, 1.8],
      gap: [150, 280],
      terreno: false,
      flutua: true,
      nebulosaExtra: true,
    });

    // Os VÉUS: nuvem passando NA FRENTE da nave. É a assinatura de "voar dentro" — e também o
    // tema mecânico do Ato 1 (a visibilidade). `primeiroPlano` porque a luta de chefão não
    // pode ser lida através de névoa (mas o chefão só chega DEPOIS da nuvem — dupla garantia).
    this.addLayer({
      key: 'nebula3',
      factor: 1.3,
      baseY: 0,
      depth: 60,
      tint: 0x9aa2c8,
      // ⚠️ ALPHA MEDIDO EM A/B COM INIMIGO ESCURO NA TELA (Fatia 5), não escolhido no olho. O
      // critério é o inimigo LER através do véu — numa fase que põe minas em cachos na névoa, não
      // ver a mina não é problema estético, é morte. Era 0.38 e escondia demais.
      alpha: 0.24,
      scale: [1.8, 3.0],
      gap: [240, 460],
      terreno: false,
      flutua: true,
      primeiroPlano: true,
      nebulosaExtra: true,
    });

    // O CASCO DO LEVIATÃ: banda contínua de placas mortas no rodapé (origem na base, como o
    // terreno da F1), dormindo em alpha 0 — `casco` faz o alpha dela seguir 1−nebulaDim.
    this.addLayer({
      key: 'derelict',
      factor: 1.0,
      baseY: GAME_HEIGHT + 26,
      depth: -75,
      tint: 0x2f3a55,
      alpha: 0.95,
      scale: [1.1, 1.5],
      gap: [78, 108],
      terreno: true,
      casco: true,
    });
  }

  private addLayer(cfg: Omit<ScatterLayer, 'sprites' | 'nextX'>): void {
    // Camada sem arte não entra. Sem isto, o Phaser desenha a textura "faltando" —
    // uma caixa verde gritante no meio do céu.
    if (!this.scene.textures.exists(cfg.key)) return;

    const layer: ScatterLayer = { ...cfg, sprites: [], nextX: 0 };
    this.layers.push(layer);

    // Preenche a tela inteira já no início: nada de horizonte vazio no primeiro frame.
    while (layer.nextX < GAME_WIDTH + 120) this.emit(layer);
  }

  private emit(layer: ScatterLayer): void {
    // No vácuo o sprite nasce em qualquer altura e é ancorado pelo CENTRO — ele flutua, não
    // cresce do chão. Na superfície é o contrário: origem na base, sobre a linha do solo.
    // A `faixa`, quando existe, prende a camada a uma banda: é o que faz o cinturão ser um
    // cinturão, e não pedra espalhada.
    const y = layer.flutua
      ? Phaser.Math.Between(...(layer.faixa ?? [-10, GAME_HEIGHT + 10]))
      : layer.baseY;

    const img = this.scene.add
      // Sorteia entre as variantes da camada: montanhas repetidas denunciam o truque.
      .image(layer.nextX, y, pickVariant(this.scene, layer.key))
      // Teto: origem no TOPO e de cabeça para baixo — o espelho do terreno (ver ScatterLayer).
      .setOrigin(0.5, layer.teto ? 0 : layer.flutua ? 0.5 : 1)
      .setFlipY(layer.teto ?? false)
      .setDepth(layer.depth)
      .setTint(layer.tints ? Phaser.Math.RND.pick(layer.tints) : layer.tint)
      // O sprite nasce já no alpha do ESTADO ATUAL (fade do chefão, densidade da nebulosa,
      // casco revelado): um reciclado que nascesse opaco desfaria qualquer fade sozinho.
      .setAlpha(this.alphaFor(layer))
      .setScale(Phaser.Math.FloatBetween(...layer.scale))
      // Espelhar metade das montanhas dobra a variedade sem custar geração.
      .setFlipX(Math.random() < 0.5);

    // Aditivo (glow): a luz da colônia e o brilho de névoa viram BRILHO, não mancha opaca.
    if (layer.glow) img.setBlendMode(Phaser.BlendModes.ADD);

    // Uma pedra à deriva com o mesmo prumo de todas as outras é um adesivo, não uma pedra.
    //
    // A FAIXA é a exceção, e por isso ela é reconhecida aqui: ela só lê como cinturão porque é
    // HORIZONTAL. Rodada em ângulo aleatório como as pedras, viraria cascalho picado no céu — e
    // a banda, que é a coisa toda, some.
    if (layer.flutua && !layer.faixa) img.setAngle(Phaser.Math.Between(0, 359));

    layer.sprites.push(img);
    layer.nextX += Phaser.Math.Between(...layer.gap);
  }

  update(dt: number, worldSpeed: number): void {
    // FUNDO PINTADO: a camada mais distante rola LENTÍSSIMA — fator 0.04 por padrão (o F1, na
    // fase de ~75s, deriva ~250px, menos que a folga de 384px da imagem, então a paisagem não
    // repete). CADA cópia carrega o próprio fator em `data('bgFactor')` — o F2 usa um valor menor
    // (ver `buildSpace`): a pintura dele tem pedras grandes em primeiro plano que já leem como
    // PRÓXIMAS, e herdar o fator do F1 as fazia deslizar rápido demais. O wrap é só insurance
    // para uma fase longa demais.
    if (this.paintedBg.length) {
      for (const bg of this.paintedBg) {
        const factor = (bg.getData('bgFactor') as number | undefined) ?? 0.04;
        const dx = worldSpeed * factor * dt;
        bg.x -= dx;
        if (bg.x <= -bg.width) bg.x += 2 * bg.width;
      }
    }

    for (const layer of this.layers) {
      const dx = worldSpeed * layer.factor * dt;
      layer.nextX -= dx;

      for (const s of layer.sprites) s.x -= dx;

      // Recicla o que saiu pela esquerda.
      layer.sprites = layer.sprites.filter((s) => {
        if (s.x > -s.displayWidth) return true;
        s.destroy();
        return false;
      });

      while (layer.nextX < GAME_WIDTH + 120) this.emit(layer);
    }

    if (this.ground) {
      this.groundOffset += worldSpeed * dt;
      // Math.round: tilePosition fracionário faz a arte tremular.
      this.ground.tilePositionX = Math.round(this.groundOffset);
    }
    // A faixa da frente rola JUNTO com o chão/mundo — senão os props deslizariam sobre ela.
    if (this.groundFront) this.groundFront.tilePositionX = Math.round(this.groundOffset);

    if (this.exiting) this.updateAtmosphereExit(dt, worldSpeed);
  }

  /**
   * O MOVIMENTO da bruma e dos fachos. Sem ele os dois são filtro de cor por cima da tela: o que
   * transforma névoa em AR é a diferença de velocidade entre as camadas.
   *
   * A bruma também escorre para BAIXO — a nave está subindo, então o que ela atravessa desce. É
   * a única coisa na cena que diz "para cima" (o resto do jogo rola na horizontal), e é de graça.
   */
  private updateAtmosphereExit(dt: number, worldSpeed: number): void {
    for (const f of this.fog) {
      if (f.ts.alpha <= 0) continue;
      // SÓ NA HORIZONTAL — e isto não é esquecimento.
      //
      // A queda das bordas da névoa vive DENTRO da textura (ver `makeFogBand`), e o TileSprite é
      // montado com uma repetição por faixa: a parte transparente da textura coincide com a borda
      // do retângulo, e é isso que faz a faixa não ter aresta. Arrastar `tilePositionY` desloca
      // essa coincidência — em poucos segundos o miolo OPACO da textura chega à borda do
      // retângulo, que corta seco, e aparecem linhas horizontais retas atravessando a pintura.
      //
      // O movimento vertical não se perde: quem o entrega é a QUEDA das faixas na dissolução
      // (`playAtmosphereExit`), que move o sprite inteiro e leva as bordas macias junto.
      f.ts.tilePositionX += worldSpeed * f.fator * dt;
    }

    for (const r of this.rays) {
      if (r.img.alpha <= 0) continue;
      r.img.x += r.deriva * dt;
      // Some pela direita, volta pela esquerda: um facho que some e não volta deixa a bruma
      // apagando sozinha no fim, que é o oposto do que a cena está contando.
      if (r.img.x - r.img.displayWidth / 2 > GAME_WIDTH) {
        r.img.x = -r.img.displayWidth / 2;
      }
    }
  }

  /**
   * A APROXIMAÇÃO, em um número: 0 no início da fase, 1 no fim.
   *
   * A lua ENCOLHE (ficou para trás) e o Leviatã CRESCE (está mais perto). É o arco da campanha
   * inteira dito com duas escalas — e é de graça: os dois sprites já existem.
   */
  setApproach(t: number): void {
    if (this.mode !== 'espaco') return;

    const k = Phaser.Math.Clamp(t, 0, 1);

    // A lua desliza para fora pela esquerda enquanto encolhe: quem fica para trás sai de cena.
    this.moon.setScale(Phaser.Math.Linear(1.25, 0.45, k));
    this.moon.setPosition(Phaser.Math.Linear(58, -10, k), Phaser.Math.Linear(168, 150, k));

    // O Leviatã cresce e ESCURECE menos (ganha alpha): ele não aparece, ele se APROXIMA.
    this.leviathan.setScale(Phaser.Math.Linear(0.5, 1.15, k));
    this.leviathan.setAlpha(Phaser.Math.Linear(0.45, 0.8, k));
    this.leviathan.setPosition(Phaser.Math.Linear(304, 250, k), Phaser.Math.Linear(72, 84, k));
  }

  /**
   * Apaga (ou reacende) o PRIMEIRO PLANO — a camada de silhuetas que passa na frente da nave.
   *
   * Durante a fase ela é parte da dificuldade e FICA. Durante a luta de chefão ela tapa a
   * leitura dos padrões e SAI (chamado em `GameScene.spawnBoss`, no mesmo gatilho da música).
   *
   * Só mexe em ALPHA: a camada continua rolando e reciclando por baixo — e é `foregroundDim`
   * quem garante que sprites novos nasçam já no estado certo (ver `emit`).
   */
  /**
   * A 3ª cutscene acontece DENTRO do Leviatã: a silhueta distante dele não pode aparecer pelas
   * janelas do hangar — ver o monstro "ao longe" estando dentro dele é o fundo mentindo.
   * (A lua já não aparece: fora do modo `espaco` ela fica em alpha 0.)
   */
  setLeviathanVisible(v: boolean): void {
    this.leviathan.setVisible(v);
  }

  /**
   * A CUTSCENE FINAL cresce a lua de Kepler POR CONTA PRÓPRIA (o retorno é o beat 4 dela) —
   * a lua fixa do modo `espaco` duplicaria o astro no céu. O espelho do setLeviathanVisible.
   */
  setMoonVisible(v: boolean): void {
    this.moon.setVisible(v);
  }

  setForegroundDimmed(dimmed: boolean, durationMs = 1500): void {
    this.foregroundDim = dimmed ? 0 : 1;

    for (const layer of this.layers) {
      if (!layer.primeiroPlano || layer.sprites.length === 0) continue;

      this.scene.tweens.add({
        targets: layer.sprites.slice(),
        alpha: this.alphaFor(layer),
        duration: durationMs,
        ease: 'Quad.easeOut',
      });
    }
  }

  /**
   * O alpha REAL de um sprite da camada, com todos os fades de estado aplicados. É a fonte
   * única: `emit()` (sprite novo nasce certo), `setForegroundDimmed` e `setNebulaDensity`
   * calculam por aqui — dois fades escrevendo alpha por contas diferentes dessincronizam.
   */
  private alphaFor(layer: ScatterLayer): number {
    let a = layer.alpha;
    if (layer.primeiroPlano) a *= this.foregroundDim;
    if (layer.nebulosaExtra) a *= this.nebulaDim;
    if (layer.casco) a *= 1 - this.nebulaDim;
    return a;
  }

  /**
   * A DENSIDADE DA NEBULOSA (Fase 3): 1 = dentro da nuvem, 0 = céu limpo.
   *
   * É UM fade só para DUAS revelações: as camadas `nebulosaExtra` somem e a banda `casco`
   * aparece — sair da nuvem e ver o casco do Leviatã embaixo são o mesmo momento (a virada
   * do Ato 1 para o Ato 2). Counter em vez de tween por sprite: as camadas RECICLAM durante
   * o fade, e um sprite novo tem que nascer no alpha do instante (ver `emit`).
   */
  setNebulaDensity(density: number, durationMs = 5000): void {
    const alvo = Phaser.Math.Clamp(density, 0, 1);

    this.scene.tweens.addCounter({
      from: this.nebulaDim,
      to: alvo,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        this.nebulaDim = tw.getValue() ?? alvo;
        for (const layer of this.layers) {
          if (!layer.nebulosaExtra && !layer.casco) continue;
          const a = this.alphaFor(layer);
          for (const s of layer.sprites) s.setAlpha(a);
        }
        // A pintura não é ScatterLayer, então ela não passa por `alphaFor` — some aqui, à mão.
        for (const img of this.nebulaPainting) img.setAlpha(this.nebulaDim);
      },
    });
  }

  /** A atmosfera rompeu: o TERRENO fica para trás. A nebulosa e o planeta continuam. */
  breakAtmosphere(): void {
    const terreno = this.layers.filter((l) => l.terreno);

    const targets: Phaser.GameObjects.GameObject[] = [
      ...terreno.flatMap((l) => l.sprites),
      ...(this.ground ? [this.ground] : []),
      ...(this.groundRim ? [this.groundRim] : []),
    ];

    this.scene.tweens.add({
      targets,
      y: `+=${90}`,
      alpha: 0,
      duration: 2500,
      ease: 'Quad.easeIn',
    });

    // Para de emitir terreno novo. O espaço segue povoando o fundo.
    //
    // `gap` sozinho não bastava: o `while (nextX < GAME_WIDTH + 120)` do `update` ainda solta UM
    // sprite antes de o nextX saltar para o infinito, e esse último nascia com o alpha cheio da
    // camada — uma luz de colônia opaca ficava acesa no vácuo depois de todo o resto ter apagado.
    // Zerar o alpha da CAMADA faz o `alphaFor()` (a fonte única) apagar também o retardatário.
    for (const l of terreno) {
      l.gap = [1e9, 1e9];
      l.alpha = 0;
    }

    // A LUA só entra quando NÃO há pintura.
    //
    // Ela existia para dar alguma coisa ao céu vazio que a atmosfera revelava. Com a pintura da
    // saída, o céu já vem cheio — e aí ela cobra dois preços. O de leitura: o disco é claro e
    // chapado, e contra uma pintura escura ele lê como adesivo, não como astro (é a mesma razão
    // pela qual o Leviatã leva tint). E o de história: o corpo que a nave está deixando já está
    // desenhado, ocupando a tela inteira embaixo — a lua o desenha DE NOVO, do lado, menor.
    //
    // Sem o PNG da pintura, nada disso se aplica e o comportamento é o de sempre.
    if (!this.zeroGBg) {
      this.scene.tweens.add({ targets: this.moon, alpha: 1, duration: 2000, delay: 600 });
    }
    // O Leviatã entra devagar. Ele é o destino — não deve ser um susto, deve ser um peso.
    this.scene.tweens.add({ targets: this.leviathan, alpha: 0.55, duration: 3500, delay: 1400 });

    this.playAtmosphereExit();
  }

  /**
   * A COREOGRAFIA da saída: a bruma sobe, a Fase 1 sai DENTRO dela, e ela afina no espaço.
   *
   * A ordem é o truque, e é o mesmo da decolagem do chefão: **a troca acontece escondida.** A
   * bruma vai de 0 ao pico em 0.9s; a Fase 1 só começa a sumir aos 0.5s, quando já há o que a
   * cubra. Trocar a céu aberto seria um dissolve de duas paisagens sobrepostas — e duas
   * paisagens sobrepostas não são nenhuma paisagem.
   *
   * Depois a bruma AFINA até zero: o que fica para trás é a atmosfera, e é a saída dela que a
   * cena está contando. Terminar dentro da névoa contaria o contrário.
   *
   * Tudo cabe em ~5.8s, dentro dos 6.5s de zero-G (`GameScene.breakAtmosphere`) — a cutscene não
   * pode entrar em cima de um fade pela metade.
   */
  private playAtmosphereExit(): void {
    if (!this.zeroGBg) return;
    this.exiting = true;

    const t = this.scene.tweens;

    // 1. A BRUMA FECHA — e é ela que dá cobertura para o resto.
    //
    // Ela entra ESCALONADA, de trás para a frente (90ms por camada): as cinco chegando juntas
    // leem como uma cortina só acendendo: entrando em fila, leem como a nave ENTRANDO nelas.
    for (let i = 0; i < this.fog.length; i++) {
      const f = this.fog[i];
      t.add({ targets: f.ts, alpha: f.pico, delay: i * 90, duration: 950, ease: 'Quad.easeOut' });
    }
    for (const r of this.rays) {
      t.add({ targets: r.img, alpha: r.pico, delay: 200, duration: 1100, ease: 'Quad.easeOut' });
    }

    // 2. A BRUMA ABRE — e esta é a batida que o Henrique pediu: LIBERDADE.
    //
    // Apagar não bastava. Uma névoa que só perde opacidade some POR CIMA da nave, e o que fica
    // é "o efeito acabou". Aqui cada camada DESCE enquanto se dissolve (`queda`), e as de baixo
    // descem mais — a bruma sai pelo rodapé em vez de evaporar. Quem se move em relação a ela é
    // a NAVE, e é isso que faz a saída ser dela e não do efeito.
    //
    // `Cubic.easeIn` na queda: começa devagar e desgarra. Um afastamento linear parece elevador.
    for (let i = 0; i < this.fog.length; i++) {
      const f = this.fog[i];
      t.add({
        targets: f.ts,
        alpha: 0,
        y: f.y + f.queda,
        delay: 2500,
        duration: 3300,
        ease: 'Cubic.easeIn',
      });
    }

    // Os fachos ABREM junto: ao perder a névoa que os corporificava, eles se espalham e somem.
    // É o mesmo gesto da bruma dito na luz — sem isso, eles apagariam ainda apertados, e um
    // facho estreito que some lê como lâmpada desligando.
    for (const r of this.rays) {
      t.add({
        targets: r.img,
        alpha: 0,
        scaleX: r.img.scaleX * 1.7,
        delay: 2500,
        duration: 2900,
        ease: 'Cubic.easeIn',
      });
    }

    // 3. A TROCA, dentro do pico da bruma. O que sai é só o que está NA FRENTE da pintura nova e
    //    não é terreno (o resto o depth −95.5 resolve — ver `buildAtmosphereExit`).
    const saindo: Phaser.GameObjects.GameObject[] = [
      ...this.paintedBg,
      ...(this.groundFront ? [this.groundFront] : []),
    ];
    if (saindo.length) {
      t.add({ targets: saindo, alpha: 0, delay: 500, duration: 1500, ease: 'Sine.easeInOut' });
    }
    t.add({ targets: this.zeroGBg, alpha: 1, delay: 500, duration: 1500, ease: 'Sine.easeInOut' });
  }
}
