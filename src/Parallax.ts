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

    this.moon = scene.add.image(300, 190, 'moon').setDepth(-95).setAlpha(0).setScale(1.6);

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
      this.moon.setPosition(58, 168).setScale(1.25).setAlpha(0.8);
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
  }

  /** A lua da Fase 1: montanhas, solo, e picos pretos passando na frente da nave. */
  private buildSurface(): void {
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
    this.addLayer({
      key: 'skyline',
      factor: 0.1,
      baseY: GROUND_Y - 6,
      depth: -93,
      tint: 0x151e38,
      alpha: 1,
      scale: [0.7, 1.0],
      gap: [170, 320],
      terreno: true,
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

    this.addLayer({
      key: 'mtnFar',
      factor: 0.12,
      baseY: GROUND_Y - 4,
      depth: -92,
      tint: 0x1a2440,
      alpha: 1,
      scale: [0.7, 1.1],
      gap: [38, 62],
      terreno: true,
    });

    this.addLayer({
      key: 'mtnMid',
      factor: 0.35,
      baseY: GROUND_Y + 2,
      depth: -88,
      tint: 0x33456e,
      alpha: 1,
      scale: [0.6, 0.95],
      gap: [45, 75],
      terreno: true,
    });

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
    // O corpo da nuvem: grande, sobreposto (gap < largura), quase parado. É ele que diz
    // "estamos DENTRO" — nuvem espaçada é nuvem vista de fora.
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
      alpha: 0.38,
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
    for (const l of terreno) l.gap = [1e9, 1e9];

    this.scene.tweens.add({ targets: this.moon, alpha: 1, duration: 2000, delay: 600 });
    // O Leviatã entra devagar. Ele é o destino — não deve ser um susto, deve ser um peso.
    this.scene.tweens.add({ targets: this.leviathan, alpha: 0.55, duration: 3500, delay: 1400 });
  }
}
