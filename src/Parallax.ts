import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { pickVariant } from './art';
import { GROUND_Y } from './systems/TerrainSystem';
import type { ChavePintura } from './systems/atmosfera/perfis';
import { montarHorizonte, type Horizonte } from './f1/horizonte';
import { AGLOMERADOS_F1, BRUMA_F1, COR } from './f1/numerosF1';
import { montarChao, type ChaoF1 } from './f1/chaoF1';

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
   * A SHEET que faz esta camada RESPIRAR, se ela tiver uma. Sem a chave, ou sem o PNG em disco,
   * a camada nasce `image` como sempre e o estático segura — arte entra asset por asset.
   *
   * ⚠️ O QUADRO INICIAL É SORTEADO POR SPRITE (`emit`), e é o detalhe que faz ou quebra a coisa:
   * três corações batendo em uníssono na tela leem como uma máquina, não como órgãos. É a mesma
   * lei do `pickVariant` — o que se repete igual denuncia o truque.
   */
  anim?: { sheet: string; key: string; frameRate: number };
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
   * BANDAS DE BORDA: como a `faixa`, mas são VÁRIAS e o sprite sorteia uma. Existe para uma peça
   * poder morar COLADA numa borda sem poder nascer no meio da tela.
   *
   * ⚠️ ELA NASCEU DO TESTE JOGADO DE 12/09, com print: o destroço de primeiro plano tapando o
   * miolo da Fase 4. *"alguns destroços estão atrapalhando muito a visão da fase"*, e a receita
   * dele: *"os destroços podem ser movidos para perto da borda, mas não no meio da fase"*. Uma
   * `faixa` só não resolve — ela é um intervalo CONTÍNUO, e "perto de cima OU perto de baixo" é
   * exatamente o que um intervalo contínuo não sabe dizer sem passar pelo meio.
   *
   * Quando presente, ela GANHA da `faixa`.
   */
  faixas?: Array<[number, number]>;
  /**
   * Ancorada no TETO (Fase 4, o interior): origem no TOPO, o sprite cresce para BAIXO e vai de
   * cabeça para baixo (flipY). O espelho exato de `terreno` — o interior tem teto, e um teto
   * feito de sprites "de pé" pendurados leria como chão colado no alto da tela.
   */
  teto?: boolean;
  /** Camada EXTRA da nebulosa (Fase 3): o alpha dela segue `nebulaDim` (1 dentro, 0 fora). */
  nebulosaExtra?: boolean;
  /** O CASCO do Leviatã (Fase 3, Ato 2): o alpha segue `cascoReveal`, que é dirigido pela
   * SAÍDA DO RABO — não pela nuvem. Ver `revealCasco` para o porquê da separação. */
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
/**
 * A SILHUETA DISTANTE do Leviatã novo (19/10, bloco D) — as notas dele:
 *   · *"se o leviatã é colossal, dependendo do tamanho que ele aparece no fundo, vai parecer que ele é menor do que é"*
 *     → PEQUENO e ATRÁS: logo à frente do planeta (−97), atrás dos cascos da frota morta (−94), do cinturão e das rochas.
 *     Uma nave capital cruzando NA FRENTE dele e parecendo do tamanho dele é a régua que diz "colossal" (atrás do
 *     planeta não: aí ele seria maior que um planeta). E cresce POUCO na fase — crescer 2,3× dizia "vindo depressa";
 *   · *"ao longe, é apenas uma sombra"* → só a sombra com um aro frio nas costas (a folha `leviathanLonge`);
 *   · *"um objeto a milhares de km de distância se move como se estivesse parado"* → o nado a 3 quadros/s (5,3 s);
 *   · *"descartaria a aparição na F3"* → na nebulosa ele não aparece (a nuvem o esconde; o rabo sai dela).
 * No fim da F1 ele fica acima da pintura do zero-G (−95.5, opaca), na profundidade de sempre.
 */
const LEVI_LONGE = {
  chave: 'leviathanLonge',
  /** A folha: uma linha por largura (de `wMin` a `wMax`), 16 quadros do nado por linha. */
  wMin: 28,
  wMax: 72,
  quadros: 16,
  fps: 3,
  /** A F2 inteira (setApproach 0 → 1): largura, posição do centro e alpha. ⚠️ No CÉU ABERTO acima da faixa do
   *  cinturão (−93, contínua de propósito, y ~40–150): na altura antiga (y 72–84) ela o tapava inteiro e só sobravam
   *  pedaços do aro. Aqui o aro desenha a forma contra a nebulosa, e os cascos da frota (faixa 40–130) ainda passam
   *  na frente dele de vez em quando. */
  //   E no trecho mais CLARO desse céu (à direita: luminância 21–32 contra 10–16 no meio) — a sombra quase preta
  //   precisa de fundo mais claro que ela para ler.
  f2Largura: [40, 60],
  f2X: [344, 316],
  f2Y: [44, 46],
  f2Alpha: [0.85, 1],
  /** O fim da F1 (o primeiro vislumbre, depois de romper a atmosfera): o menor de todos — e NA FRENTE DA GALÁXIA da
   *  pintura do zero-G. Todo o céu à direita é quase preto (luminância 9–15) e ali a sombra sumia, sobrando só o risco
   *  do aro; contra o brilho da galáxia ela lê como corpo, um bicho eclipsando uma galáxia. */
  f1: { largura: 34, x: 349, y: 24, alpha: 0.85 },
  profundidadeEspaco: -96.5,
} as const;

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
  private readonly leviathan: Phaser.GameObjects.Sprite;
  /** A silhueta nova (`leviathanLonge`) existe? Sem ela, cai na `leviathan` antiga, com o tint e as escalas de antes. */
  private readonly leviLonge: boolean;
  /** A largura em que a silhueta está (px de tela, 1 = uma linha da folha) e o relógio do nado dela. */
  private leviLargura: number = LEVI_LONGE.f2Largura[0];
  private leviRelogio = 0;
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
  /**
   * O PRIMEIRO PLANO ATENUADO com ELITE em cena (frente B, 05/10, ele: *"atenue o primeiro plano quando tiver elite"*):
   * as silhuetas de asteroide que passam na frente tapavam o drone na rocha justo na apresentação dele. Atenuado, não
   * apagado — a fase segue tendo profundidade. Separado do `foregroundDim` (o do chefão), e os dois multiplicam.
   */
  private foregroundElite = 1;
  /**
   * Multiplicador de alpha de TODAS as camadas de peças (1 = fase, 0 = arena do chefão). Ver
   * `limpaCenario`. Guardado pelo mesmo motivo do `foregroundDim`: a camada recicla.
   */
  private cenarioDim = 1;
  /** Densidade da nebulosa (Fase 3): 1 = dentro da nuvem. Ver `setNebulaDensity`. */
  private nebulaDim = 1;
  /**
   * A REVELAÇÃO DO CASCO (Fase 3): 0 = não existe, 1 = é o chão.
   *
   * ⚠️ SEPARADO DE `nebulaDim` DE PROPÓSITO (2026-08-27, o primeiro teste jogado). Até aqui o
   * alpha do casco era `1 − nebulaDim` — afinar a nuvem OBRIGAVA o casco a aparecer, e não
   * havia como ter um sem o outro. O roteiro se apoiava nisso em t=21 para "insinuar" o
   * Leviatã, e o que o Henrique viu jogando foi "aquele gradiente de transparência estranho":
   * uma estrutura meio apagada pairando 20s antes de ter motivo.
   *
   * Agora a nuvem afina sozinha, e o casco só nasce quando o RABO o chama — 300ms depois que
   * ele atravessa e sai pela esquerda (ver `GameScene.raboDoLeviata`).
   */
  private cascoReveal = 0;

  /**
   * QUANTOS PIXELS DE LEVIATÃ JÁ PASSARAM. Começa a contar no `revealCasco` e é a régua de
   * `familiaDoCasco`: o casco não é uma textura sorteada, é um PERCURSO sobre um corpo.
   */
  private cascoDist = 0;

  /** Ligado pelo `revealCasco`: antes dele não há casco nenhum para percorrer. */
  private cascoAndando = false;
  /**
   * A pintura do céu da FASE 3. Ela NÃO é uma `ScatterLayer` — é uma placa fixa, como o
   * `paintBgF2` — então o alpha dela não passa por `alphaFor`. Quem a apaga é o
   * `setNebulaDensity`, à mão. Ver o comentário lá.
   */
  private nebulaPainting: Phaser.GameObjects.Image[] = [];

  /** As duas cópias da pintura do interior (Fase 4). `setPintura` troca a textura delas. */
  private pinturaF4: Phaser.GameObjects.Image[] = [];

  /**
   * A PINTURA NOVA ENTRANDO PELA EMENDA (ver `setPinturaPelaEmenda`): as cópias dela por cima das
   * da pintura atual, recortadas por uma máscara de borda macia que anda com a emenda da `Moldura`.
   */
  private entrada: {
    key: string;
    copias: Phaser.GameObjects.Image[];
    mascara: Phaser.GameObjects.Image;
    bitmap: Phaser.Display.Masks.BitmapMask;
    emendaX: () => number;
  } | null = null;

  /** A largura da borda macia da cortina, em px. Larga o bastante para não ler como corte reto. */
  private static readonly ENTRADA_RAMPA = 112;

  /** A chave da pintura do interior que está na tela. A sonda da fatia cobra este valor. */
  pinturaAtual: string | null = null;
  /**
   * A FAIXA DE CASCO DA FRENTE (Fase 3, Ato 2): o equivalente do `groundFront` da Fase 1. Ela
   * existe por um motivo só — esconder o PÉ dos props, que sem ela terminam numa borda reta e
   * parecem colados no casco em vez de plantados nele. Ver `buildNebula()`.
   */
  private cascoFrente: Phaser.GameObjects.TileSprite | null = null;

  /** O HORIZONTE DA F1 (bloco G): a pintura dele, os faróis e a cachoeira, pelo relógio da fase. */
  private horizonte: Horizonte | null = null;
  /** A BRUMA ENTRE OS PLANOS da F1 (bloco G): duas bandas `fogBand` na cor da névoa da pintura. */
  private brumaF1: { ts: Phaser.GameObjects.TileSprite; fator: number }[] = [];
  /** O CHÃO da F1 (rodada 5, `src/f1/chaoF1.ts`): o Vale, a Paisagem, o entulho da frente e o primeiro plano. */
  private chao: ChaoF1 | null = null;
  /** Quanto o mundo andou (px) desde o começo da fase: a posição das faixas do chão é `chaoAndado × fator`, inteira. */
  private chaoAndado = 0;
  /** O alfa do primeiro plano AGORA (interpolado): a faixa `perto` do chão o lê a cada quadro. */
  private primeiroPlanoAlfa = { v: 1 };
  /** O relógio da fase (s), que o `GameScene` passa a cada quadro: o horizonte é função dele, não do tempo real. */
  private relogio = 0;

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
    //
    // ⚠️ 19/10 (bloco D): com a silhueta NOVA (`leviathanLonge`) a distância já vem ASSADA na arte — a sombra escura e o
    // aro frio —, então ela não leva tint, e o tamanho é a LINHA da folha, não a escala (ver `LEVI_LONGE`).
    this.leviLonge = scene.textures.exists(LEVI_LONGE.chave);
    this.leviathan = scene.add
      .sprite(330, 60, this.leviLonge ? LEVI_LONGE.chave : 'leviathan')
      .setDepth(this.leviLonge && mode === 'espaco' ? LEVI_LONGE.profundidadeEspaco : -94)
      .setAlpha(0);
    if (this.leviLonge) {
      const f1 = LEVI_LONGE.f1;
      this.leviathan.setPosition(f1.x, f1.y);
      this.larguraLeviata(f1.largura);
    } else {
      this.leviathan.setScale(0.5).setTint(0x2a3352);
    }

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
      if (this.leviLonge) this.setApproach(0);
      else this.leviathan.setPosition(304, 72).setScale(0.5).setAlpha(0.45);
    }
    if (mode === 'nebulosa') {
      // Fase 3: a lua ficou para trás de vez; o Leviatã já entra GRANDE — a Fase 2 terminou
      // com ele a 1.15, e a Fase 3 não pode reapresentá-lo pequeno (mesma regra da Fase 2 não
      // "esquecer" a lua). Ele cresce até virar o chão no Ato 2.
      //
      // ⚠️ 19/10 (bloco D): com a silhueta nova, ele NÃO aparece na F3 (ele: *"ele vai aparecer o rabo depois de 45s,
      // ou seja, como ele se aproximaria tão depressa? Acho que descartaria a aparição na F3"*). A nuvem o esconde, e o
      // rabo sai dela.
      if (this.leviLonge) this.leviathan.setVisible(false);
      else this.leviathan.setPosition(310, 66).setScale(1.15).setAlpha(0.5);
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
   * Chão e TETO são a borda da `Moldura`: o interior é a primeira fase FECHADA POR CIMA, e a
   * borda anuncia o verbo dela (precisão) antes de o primeiro corredor apertar. (As bandas de
   * placas `derelict` que faziam esse papel antes da borda saíram em 15/10 — ver abaixo.)
   */
  private buildInterior(): void {
    // ─── A PINTURA DO INTERIOR (Fatia 7) ───
    //
    // A parede era o `hangar.png` repetido, COM JANELAS MOSTRANDO O ESPAÇO — o jogador acabava
    // de ser engolido por uma garganta e a primeira coisa que via era uma parede de hangar com
    // vista para a nebulosa. O lugar mentia sobre o que é.
    //
    // Agora é a pintura do Henrique, e ela TROCA ao longo da fase (ver `setPintura`): o hangar
    // engolido → a caixa torácica → o duto → a câmara do núcleo. Quem manda na troca é o
    // ROTEIRO (evento `cenario` no `STAGE_4`), não este arquivo.
    //
    // ⚠️ A `nebula3` saiu junto, e não por gosto: ela existia para aparecer PELAS JANELAS do
    // hangar. Com uma pintura opaca na frente, ela era sprite gasto atrás de parede.
    //
    // ⚠️ ESCALA 1, SEMPRE. A pintura está assada em 384×216 (a resolução do jogo). É a grade de
    // pixel casando com a da tela que dá a PROFUNDIDADE — esticar aqui achata o fundo.
    //
    // Duas cópias lado a lado, como o `paintBgF2`/`paintBgF3`, para a rolagem nunca mostrar
    // buraco. Depth −96: atrás de tudo que é do interior, à frente do planeta (−97).
    if (this.scene.textures.exists('paintBgF4a')) {
      const w = (this.scene.textures.get('paintBgF4a').getSourceImage() as { width: number }).width;
      for (let i = 0; i < 2; i++) {
        this.pinturaF4.push(
          this.scene.add
            .image(i * w, 0, 'paintBgF4a')
            .setOrigin(0, 0)
            .setDepth(-96)
            .setData('bgFactor', 0.02),
        );
      }
      this.paintedBg.push(...this.pinturaF4);
      this.pinturaAtual = 'paintBgF4a';
    }

    // ⚠️ SEM `derelict` NA F4 — NEM CHÃO, NEM TETO, NEM VIGA DE PRIMEIRO PLANO (polimento de 15/10).
    //
    // Eram três camadas: as bandas de placas do chão e do teto (depth −75) e as vigas soltas na frente da
    // nave (depth 60, faixas y 6–28 e 188–210). As bandas eram o chão e o teto da F4 de ANTES da `Moldura`;
    // com a borda desenhada, faziam o mesmo papel duas vezes e só vazavam para dentro do corredor — medido
    // em 14/10: até 24–27px no começo da fase e 6–15px na câmara azul. As vigas moravam exatamente em cima
    // da borda, e na fase da PRECISÃO a borda é a linha que decide a batida; ao vivo, a borda limpa
    // aparece só com as três desligadas (`scripts/_polimento/_antes-depois.mjs`). Era o print 1 dele: *a borda
    // parece cortada*.
    //
    // ⚠️ E A PLACA ERA A ERRADA PARA O LUGAR: o `derelict` é o destroço de nave da F2, dentro de um bicho
    // vivo. A profundidade que as vigas davam volta com um primeiro plano PRÓPRIO da F4 (tendões e membranas
    // quase pretos, que não cruzam a linha da superfície), já combinado com ele para a rodada de geração.
    // Não religue estas camadas para tapar a falta dele.

    // ─── A ANATOMIA DO BICHO (2026-07-21) ───
    //
    // O hangar repetido dizia "estação espacial", não "dentro de um bicho VIVO". As camadas
    // orgânicas são o que fecha a leitura: COSTELAS biônicas arcando do chão e do teto em duas
    // distâncias (a longínqua escura e lenta, a próxima no plano do chão), órgãos à deriva no
    // meio-fundo e maquinário pesado pendurado no teto. Os tints são ESCUROS de propósito:
    // perspectiva aérea — e é o que separa cenário dos obstáculos jogáveis (as costelas do
    // corredor, que nascem SEM tint, claras).
    // ⚠️ A COSTELA ERAM TRÊS CAMADAS, E VIROU DUAS (teste jogado de 10/09: *"alguns se repetem em
    // outros tamanhos e ficou repetitivo"*). A que morreu era a do chão distante (fator 0.45,
    // escala 0.3–0.48) — ela e a do teto nasciam praticamente do mesmo tamanho, e duas cópias da
    // mesma arte no mesmo tamanho não leem como duas distâncias, leem como uma cópia.
    //
    // ⚠️ E AS DUAS QUE FICARAM TIVERAM AS ESCALAS SEPARADAS (0.28–0.38 contra 0.5–0.7, sem
    // sobreposição). É a SOBREPOSIÇÃO das faixas de escala que fazia a peça ler como repetição:
    // a mesma arte em tamanhos claramente diferentes lê como profundidade; em tamanhos parecidos,
    // lê como a mesma peça colada duas vezes.
    //
    // O teto tem a caixa torácica dele: o espelho escuro, longe, lento e esparso.
    this.addLayer({
      key: 'costela',
      factor: 0.4,
      baseY: -30,
      depth: -85,
      tint: 0x282234,
      alpha: 1,
      scale: [0.28, 0.38],
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
      scale: [0.5, 0.7],
      gap: [180, 300],
      terreno: false,
    });
    // ÓRGÃOS ANCORADOS NO CHÃO: massas vivas CRESCENDO do piso do bicho, grandes e raras.
    //
    // ⚠️ ESTA CAMADA FLUTUAVA, E ERA O DEFEITO QUE O HENRIQUE FOTOGRAFOU. Ela nascia com
    // `flutua: true` numa faixa de 50 a 170 e escala 0.5–0.9 — um coração PEQUENO SOLTO NO MEIO DA
    // TELA. Veredicto dele, com print: *"coração pequeno jogado no ar da fase"*, contra o
    // maquinário pendurado no teto logo abaixo, que ele aprovou por *"trazer noção de grandeza"*.
    //
    // ⚠️ A LEI QUE SAI DAÍ, E ELA VALE PARA TODA PEÇA DE CENÁRIO DESTA FASE: **peça grande
    // ANCORADA numa borda lê como grandeza; peça pequena SOLTA no meio da tela lê como asset
    // jogado na cena.** É a mesma frase que abriu a Fatia 7 inteira em 08/09 — e as duas camadas
    // são a MESMA arte (`orgao.png`, 121×118). O que mudava era âncora e tamanho, só isso.
    //
    // O chão fica com a carne e o teto com a máquina (`maquinario`, logo abaixo): cada borda ganha
    // a sua peça-assinatura, as duas grandes, e nenhuma das duas flutua.
    // ⚠️ E A ESCALA SUBIU DE 0.9–1.3 PARA 1.85–2.15 NO TESTE JOGADO DE 12/09, pelo mesmo print.
    // Ancorar no chão matou o coração FLUTUANDO, mas não os CABOS: eles fazem parte do desenho
    // (`orgao.png` é o coração numa gaiola COM tubos saindo para todos os lados), e a 1.3 o topo
    // da peça parava em y≈83 — no ar. Quatro setas dele marcaram exatamente esses tocos:
    // *"o coração com os cabos flutuando no ar, fica feio e dá aspecto de não polido"*.
    //
    // ⚠️ A RECEITA, de novo dele: *"quando for utilizado o sprite dele grande, tentar deixar suas
    // extremidades encostadas na parede de cima ou de baixo, para tapar aqueles cabos suspensos"*.
    // Não se apaga o cabo — ENTERRA-SE a ponta dele. A faixa da moldura é desenhada em depth −0,6
    // contra os −88 desta camada, então tudo o que passa da superfície some atrás dela.
    //
    // ⚠️ A BASE SUBIU DE `GAME_HEIGHT + 20` (236) PARA `GROUND_Y` (206), E ISSO É O QUE MANTÉM A
    // PEÇA MAGRA. A peça cresce para cima, então o topo é `base − 118 × escala`: quanto mais
    // fundo a base, MAIOR a escala necessária para o topo alcançar o teto — e escala é largura.
    // Medido na captura: com base em 236 a cobertura exigia 1.85 e a peça saía com **263px de
    // largura**, dois terços da tela, uma massa marrom no meio do campo de jogo. Com a base na
    // linha do chão, a mesma cobertura sai em 1.62 e **196px**.
    //
    // ⚠️ AS DUAS PONTAS FICAM ENTERRADAS, e as duas contas são estas — na abertura da fase, com
    // espessura 16: a superfície do teto está em `TETO_Y + 16` = 26 e a do chão em
    // `GROUND_Y − 16` = 190. Em cima, `206 − 118 × 1,62 = 14,8` entra 11px na faixa; embaixo, a
    // base em 206 fica 16px atrás dela. E só melhora conforme a espessura cresce (em 54 a
    // superfície do teto desce para 64). ⚠️ **Baixar deste 1.62 devolve os cabos ao ar** — é um
    // piso calculado, não uma preferência.
    //
    // ⚠️ O QUE ESTA CONTA NÃO RESOLVIA: os tubos LATERAIS. A arte era radial e só sumia no lado
    // quem fosse mais largo que a tela. Em 14/09 a peça foi REGERADA como COLUNA — o coração numa
    // cápsula, com os cabos só para cima e para baixo — e os laterais deixaram de existir.
    //
    // ⚠️ E A ESCALA É OUTRA CONTA, COM A MESMA LEI: a coluna tem 128px e as duas pontas são cabo
    // cortado, então as DUAS têm de enterrar. A base em `GROUND_Y` (206) já está 16px atrás da
    // faixa do chão; o topo é `206 − 128 × escala`, e para entrar na faixa do teto (superfície em 26
    // na abertura) a escala precisa passar de **1,41**. Em 1,45 o topo cai em 20. ⚠️ **Baixar deste
    // piso devolve o cabo de cima ao ar.** E ela emagreceu de brinde: a coluna tem ~43px de corpo,
    // 62px em tela contra os 196 da peça radial.
    this.addLayer({
      key: 'orgao',
      factor: 0.3,
      baseY: GROUND_Y,
      depth: -88,
      tint: 0x5a4048,
      alpha: 0.9,
      scale: [1.45, 1.6],
      gap: [400, 700],
      terreno: false,
      // ⚠️ 7 QUADROS/s COM YOYO = 16 quadros por volta, ou ~2,3s por batida — um coração EM
      // REPOUSO. É o mesmo `frameRate` do `nucleo-beat` do chefão, e de propósito: o cenário e o
      // núcleo são o mesmo bicho, e dois ritmos diferentes na mesma tela seriam dois bichos.
      anim: { sheet: 'orgaoAnimSheet', key: 'f4-orgao-bate', frameRate: 7 },
    });
    // MAQUINÁRIO PESADO: o bicho é biomecânico — carne E máquina.
    //
    // ⚠️ ELE ERA PENDURADO NO TETO, E VIROU COLUNA COMO O CORAÇÃO (14/09, 2º teste jogado). Ele
    // disse *"ficaram melhores na vertical para pegar teto e chão, só que percebi que só aparece um
    // deles"* — e a medição mostrou que o maquinário ESTAVA na tela (em 100% das amostras de 100s,
    // contra 86% do coração), só que como uma peça de 93px em y=−18, meio escondida atrás da borda
    // do teto. Não lia como a peça nova. Agora é a mesma conta do `orgao`: 128px, origem no teto em
    // `TETO_Y` (10), pontas enterradas nas duas bordas a partir de escala 1,45.
    //
    // ⚠️ E O `gap` SUBIU (260–480 → 520–860): coluna de chão a teto a cada 5–9s viraria grade. Com
    // ~55px/s ele passa a cada 9–16s, perto do ritmo do coração, e os dois se revezam.
    this.addLayer({
      key: 'maquinario',
      factor: 0.65,
      baseY: 10,
      depth: -80,
      tint: 0x3a4258,
      alpha: 0.95,
      scale: [1.45, 1.6],
      gap: [520, 860],
      terreno: false,
      teto: true,
      // ⚠️ 5 QUADROS/s — MAIS LENTO QUE O CORAÇÃO, e a diferença é a frase da fase. O chão é
      // carne e o teto é máquina: se os dois respirassem no mesmo compasso, o teto viraria
      // víscera junto e a metade industrial da fase sumiria. ~3,2s por ciclo é uma fornalha
      // esfriando, não um órgão.
      anim: { sheet: 'maquinarioAnimSheet', key: 'f4-maquinario-brasa', frameRate: 5 },
    });

    // ─── O QUE O BICHO ENGOLIU (12/09) — as peças que saíram das 64 candidaturas dele ───
    //
    // ⚠️ A PONTE É O QUE FALTAVA PARA A CÂMARA A DIZER O QUE ELA É. A fase abre na "doca
    // engolida", mas até aqui nada na tela dizia DOCA: costela, órgão e maquinário são todos do
    // bicho, então o lugar lia como víscera desde o primeiro segundo. Esta peça é a metade humana
    // da frase — dois pilares de convés industrial com guarda-corpo e lâmpada âmbar, tomados pelas
    // veias do Leviatã, e um vão suspenso entre eles.
    //
    // ⚠️ ELA ERA UM PILAR SÓ, E ELE JOGOU E DIAGNOSTICOU: *"está pequeno e as mesas e bordas
    // tampam ele... hoje nós temos o que seria o INÍCIO de uma ponte"*. Duas coisas mudaram por
    // causa disso, e as duas estão nos números abaixo:
    //
    // 1. **A PEÇA TRIPLICOU DE LARGURA** (71 → 178–198px), com o vão gerado coluna a coluna em
    //    `_assar-ponte.mjs`. Pilar sozinho não lê como ponte, por maior que seja a escala.
    //
    // 2. **A ESCALA SUBIU DE 0.8–1.05 PARA 1.45–1.7, E O NÚMERO É UMA CONTA.** O convés mora nas
    //    linhas 15–31 de uma peça de ~60 — de 28 a 44px acima da base. Com a base em
    //    `GAME_HEIGHT + 6` = 222, o topo do convés cai em `222 − 44·escala`. A mesa mais alta da
    //    abertura tem 46px e o topo dela fica em ~160, então a escala precisa passar de **1,41**
    //    só para o convés começar a assomar acima do terreno. Abaixo disso a mesa tapa a ponte —
    //    que é exatamente o que ele viu. Em 1,45 o guarda-corpo sai em y≈136, bem acima da mesa.
    //
    // ⚠️ E AS PONTAS GANHARAM TORRE na 2ª rodada de 12/09, por outro print dele: *"começam do nada
    // e ficam com aparência de cortadas"*. O corrimão do original atravessa o quadro e é fatiado
    // pelos 72px da peça; na ponte os cortes internos somem, mas os externos ficavam expostos. A
    // primeira tentativa foi erodir a ponta e ele descartou — *"você pode criar uma estrutura que
    // feche a ponte no PixelLab, ou mais de uma para ter troca"*. Ele está certo: esfarelar
    // disfarça o corte, uma TORRE o resolve. A peça foi de 198 para **248px**.
    //
    // ⚠️ E POR ISSO O VÃO ENCURTOU DE 3 MONTANTES PARA 2. A escala tem PISO em 1,41 (abaixo disso a
    // mesa tapa o convés), então a largura em tela é no mínimo `largura × 1,41`: com as torres e o
    // vão antigo a ponte passaria de 400px numa tela de 384, e as duas pontas nunca apareceriam
    // juntas — o conserto viraria invisível. Em 248px ela fecha em 350px no piso da escala.
    //
    // ⚠️ O `gap` TEM DE PASSAR DA LARGURA EM TELA, senão duas pontes se sobrepõem — uma emenda que
    // nenhuma escala esconde.
    this.addLayer({
      key: 'f4Ponte',
      factor: 0.55,
      baseY: GAME_HEIGHT + 6,
      depth: -78,
      // ⚠️ TINT CLARO PARA UM FUNDO, e é por causa da LÂMPADA. Um tint de força de costela
      // (0x4a3e48) apagaria o âmbar, que é a única coisa acesa da peça — e numa fase cujo rumo é
      // *luz só onde há energia*, apagar a luz é apagar o motivo de a peça existir.
      tint: 0x6d788f,
      alpha: 1,
      // ⚠️ A PONTE NASCE NO TAMANHO EM QUE APARECE (17/10, item 7 do polimento). Ela era a peça de 248px ampliada a
      // 1,41–1,55× — pixel gordo, contra a lei (reduzir pode, aumentar nunca). Agora a arte é a MESMA ponte
      // redesenhada a 1,55× pelo `image-to-pixelart` (a versão que ele escolheu: guarda a lâmpada e o detalhe), em
      // duas metades costuradas por um corte torto (`_ponte-em-metades.mjs`; o gerador não passa de 320px). A escala
      // só REDUZ: 0,91–1 é o mesmo 1,41–1,55 de antes em tela, então o convés segue acima da mesa (a conta de cima
      // vale igual). As originais estão em `assets/raw/f4-ponte*-original.png`.
      scale: [0.91, 1],
      gap: [620, 1000],
      terreno: false,
    });

    // OS GÂNGLIOS ACESOS: os núcleos nervosos do bicho, pendurados no teto e raros.
    //
    // ⚠️ ESTA CAMADA ERA OUTRA, E A CAPTURA A TROCOU. A primeira escolha foram os empilhamentos
    // de anéis de cartilagem do mesmo lote, para dizer "caixa torácica" na câmara B — e o mock
    // contra a pintura mostrou o óbvio: **a pintura da câmara B JÁ É uma caixa torácica**, com as
    // costelas ocupando o meio do quadro. A peça repetia o que já estava lá e só somava massa
    // escura no caminho.
    //
    // ⚠️ A LEI QUE SAI DAÍ, E ELA VALE PARA AS 10 PEÇAS DO M2–M5: **peça de cenário tem de dizer
    // o que a PINTURA não diz.** O critério não é "combina com a câmara" — combinar demais é como
    // se desenha papel de parede. Estes dizem: são o único ponto de luz PRÓPRIO do cenário, e é a
    // fase inteira numa peça (*luz só onde há energia*).
    //
    // ⚠️ O TINT É QUASE NEUTRO DE PROPÓSITO. Um tint escuro de costela apagaria a brasa, que é o
    // motivo de a peça existir — a mesma conta que a passarela faz pela lâmpada âmbar. Quem
    // segura a peça no fundo aqui é o ALPHA e a raridade do gap, não a multiplicação de cor.
    this.addLayer({
      key: 'f4Ganglio',
      factor: 0.4,
      baseY: -14,
      depth: -87,
      tint: 0x9aa2b8,
      alpha: 0.85,
      scale: [0.55, 0.85],
      gap: [420, 760],
      terreno: false,
      teto: true,
    });
  }

  /**
   * A F1 (bloco G, spec `2026-10-20-f1-cenario-design.md` §4): a pintura dele INTEIRA ao fundo, a bruma entre os planos,
   * a cordilheira tirada da própria pintura, o chão na paleta dela e as rochas do primeiro plano.
   *
   * ⚠️ SAÍRAM (20/10): o céu em degradê (fica só como rede de segurança atrás da pintura opaca), a `paint-bg-f1`
   * antiga, o `skyline`, as `colonyLight` (pontos ciano em código), o `cometSky`, o tráfego feito com o `enemyScout`
   * escurecido, as duas faixas de `mtnMid` pintadas de azul pelo `tint` e o entulho de `asteroid`. Tudo isso lia como
   * "gerado" contra a pintura (folha `folhas/2026-10-20/f1-cenario/hoje.html`).
   */
  private buildSurface(): void {
    // A REDE DE SEGURANÇA: sem as camadas da pintura, a fase ainda tem um céu (a pintura é opaca e o cobre inteiro).
    const ceu = this.scene.add.graphics().setDepth(-99);
    ceu.fillGradientStyle(0x05070f, 0x05070f, 0x141c30, 0x141c30, 1);
    ceu.fillRect(0, 0, GAME_WIDTH, GROUND_Y);

    // O HORIZONTE: a pintura dele inteira, os faróis e a cachoeira, derivando pelo relógio da fase.
    this.horizonte = montarHorizonte(this.scene);

    // A BRUMA ENTRE OS PLANOS: é a diferença de velocidade entre ela, a pintura e a cordilheira que vende o volume.
    for (const b of BRUMA_F1) {
      const ts = this.scene.add
        .tileSprite(0, b.y, GAME_WIDTH, b.h, 'fogBand')
        .setOrigin(0, 0)
        .setDepth(b.depth)
        .setTint(COR.nevoa)
        .setAlpha(b.pico);
      ts.setTileScale(1, b.h / 64);
      this.brumaF1.push({ ts, fator: b.fator });
    }

    // O CHÃO (rodada 5, 20/10): as DUAS pinturas dele em faixas sem emenda — o Vale atrás, a Paisagem na frente dele, as
    // estruturas plantadas entre a Paisagem e o entulho da frente (ver `CHAO_F1` e `PLANTIO_F1`). Escala 1, sem tint.
    //
    // ⚠️ SAÍRAM: a CORDILHEIRA recortada da pintura ("parece mal colado", ele, 20/10 — as peças terminavam em parede
    // vertical) e o ladrilho do chão com a aresta e a faixa da frente tingida (liso, repetido, 4× mais claro que a rocha
    // da pintura). O `groundTile` segue carregado no `BootScene`, sem uso, até a limpeza do fim do bloco.
    // O primeiro plano (`perto`) também é dele: a frente espelhada, quase preta, no lugar do pico de gelo tingido.
    this.chao = montarChao(this.scene);

    // (O ENTULHO de `asteroid` assentado no chão saiu em 20/10: a rocha do cinturão, recolorida, lia como pedra de outro
    // lugar.)

    // OS AGLOMERADOS da colônia (rodada 6, 21/10): decoração entre a Paisagem e as estruturas — ver `AGLOMERADOS_F1`.
    if (this.scene.textures.exists(AGLOMERADOS_F1.chave)) {
      this.addLayer({
        key: AGLOMERADOS_F1.chave,
        factor: AGLOMERADOS_F1.fator,
        baseY: AGLOMERADOS_F1.baseY,
        depth: AGLOMERADOS_F1.depth,
        tint: 0xffffff,
        alpha: 1,
        scale: [1, 1],
        gap: [AGLOMERADOS_F1.gap[0], AGLOMERADOS_F1.gap[1]],
        terreno: true,
      });
    }

    // NÉVOA RASTEIRA: o fog de solo, na cor da névoa da pintura. Dá "ar" ao terreno. Depth −84: à frente da
    // Paisagem, atrás das estruturas; fraca, para dar atmosfera sem esconder o jogo.
    this.addLayer({
      key: 'nebula',
      factor: 0.75,
      baseY: 0,
      depth: -84,
      tint: COR.nevoa,
      alpha: 0.16,
      scale: [1.2, 2.0],
      gap: [140, 240],
      terreno: true,
      flutua: true,
      faixa: [GROUND_Y - 20, GROUND_Y + 8],
    });

    // PRIMEIRO PLANO: na F1 ele é a faixa `perto` do chão (montada acima, com as outras): o entulho da frente espelhado,
    // quase preto, a 1,5 do mundo, na frente da nave. É o que mais vende profundidade — sem nada à frente, o cenário é
    // chapado por mais camadas que tenha atrás.
    //
    // ⚠️ SAIU O PICO DE GELO TINGIDO de azul-abissal (20/10): contra o chão novo ele lia como mancha azul. E a faixa é
    // CONTÍNUA, ao contrário do pico (que era espaçado para não virar parede), porque é BAIXA: o chão dela fica no
    // rodapé (3 px) e só os tocos sobem, até ~16 px — "só as pontas aparecem, rente ao rodapé" continua valendo.

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
      // ⚠️ 480×270 EM `y = −27`, E ISSO É UMA REVERSÃO PEDIDA, NÃO UM ESQUECIMENTO. Em
      // 2026-08-30 esta pintura foi reduzida para 384×216 em `y = 0` junto com a da Fase 2, pela
      // conta da resolução: numa janela de 384×216 uma placa de 480×270 mostra 80% de cada eixo,
      // ou seja 64% da pintura, recortada nas quatro bordas, com zoom de 1,25×. A conta continua
      // certa — e o Henrique reprovou o resultado assim mesmo, no mesmo dia: *"o fundo da zero G
      // pode ser como estava antes, reverta ele para eu verificar de novo"*.
      //
      // ⚠️ E ISSO NÃO CONTRADIZ A FASE 2, QUE FICOU EM 384×216. A diferença entre as duas não é
      // de conta, é de ORIGEM: a da F2 foi refeita do original de 1672×941, então reduzir devolve
      // a cena inteira com detalhe de sobra. Do Zero-G não há original guardado — a redução saiu
      // do próprio 480×270 (`assets/raw/paint-bg-zerog-480.png`), um passo de reamostragem a mais
      // em cima de uma arte que já era pequena. O recorte custava enquadramento; a redução
      // custava DETALHE, e neste quadro o detalhe era o que segurava a cena.
      //
      // −27 = (270−216)/2: a folga fica repartida em cima e embaixo.
      //
      // Se o original de alta resolução aparecer, é ele que resolve os dois lados de uma vez:
      // `node scripts/paint-bg.mjs <original> public/sprites/paint-bg-zerog.png 384 216`.
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
    // ⚠️ DIMENSÃO 384×216 DESDE 2026-08-30 — o parágrafo abaixo é o raciocínio ANTIGO, mantido
    // porque a metade dele continua certa e a outra metade é a armadilha. Certa: uma pintura
    // larga demais recortada em 216px mostra só um PEDAÇO da cena e lê como ampliada. Errada: a
    // conclusão de que 480×270 resolvia isso, "só 25% maior que os 384×216". Não resolvia —
    // resolvia MENOS: 384/480 e 216/270 dão 80% de cada eixo, então a janela mostrava 64% da
    // pintura, recortada nas quatro bordas, com zoom de 1,25×. O quadro inteiro nunca coube.
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
            // ⚠️ `y = 0`, E A PINTURA AGORA É 384×216 (2026-08-30). Ela era 480×270 pendurada em
            // `y = −27` para centralizar a folga. O bloco acima defende os 480×270 como
            // enquadramento — e a defesa está errada na conta: numa janela de 384×216 uma placa
            // de 480×270 mostra 80% de CADA eixo, ou seja 64% da pintura, com zoom de 1,25×. O
            // quadro inteiro NÃO cabia; ele era recortado nas quatro bordas.
            //
            // 1 px de arte = 1 px de jogo, e o upscale nearest da engine dá o acabamento pixel.
            // É a mesma correção que a Fase 3 recebeu, refeita a partir do ORIGINAL
            // (`assets/raw/paint-bg-f2-original.png`, 1672×941) e não do 480×270.
            .image(i * w, 0, 'paintBgF2')
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
    //
    // ⚠️ OS CASCOS E O CINTURÃO SÃO SÓ DA FASE 2 (polimento de 15/10). O modo 'nebulosa' também passa
    // por aqui, e na F3 os dois ficavam POR CIMA da pintura opaca da nuvem (−94 e −93 sobre −96): o
    // casco, tingido de escuro, virava um RETÂNGULO PRETO no meio da nebulosa, e o cinturão uma faixa de
    // pontas retas — as "caixas pretas" do relatório de 14/10. E é a mesma lei do cabeçalho deste
    // método: o fundo da F3 repetindo o cemitério da F2 desmente a viagem. As pedras soltas (abaixo)
    // continuam nas duas.
    if (this.mode === 'espaco') {
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
    }

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
   * ⚠️ ATUALIZADO NA FATIA 5. Eram três camadas de nuvem, todas `nebulosaExtra`. Hoje, COM a
   * pintura (`paintBgF3`), o corpo denso do fundo deixou de ser uma `ScatterLayer`: ele é uma
   * PLACA, e por isso o alpha dele não passa por `alphaFor` — quem o apaga é o
   * `setNebulaDensity`, à mão. Restam duas camadas procedurais (meio e VÉUS), essas sim
   * `nebulosaExtra`. Sem a pintura, as três voltam (é o fallback). E o CASCO
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
    // ⚠️ A PINTURA É 384×216 — A RESOLUÇÃO REAL DO JOGO — E FICA EM y=0.
    //
    // Ela era 480×270 em y=−27, que é a receita que o projeto vinha repetindo desde a Fase 1.
    // A receita está ERRADA e o Henrique reclamou dela três vezes. A conta: numa janela de
    // 384×216, uma placa de 480×270 mostra 384 de 480 na largura e 216 de 270 na altura — 80%
    // de cada eixo, ou seja **64% da pintura, com zoom de 1,25×**. A pintura do Henrique
    // chegava à tela AMPLIADA e cortada pelas beiradas, que é exatamente o oposto de "1 px da
    // arte = 1 px do jogo" (a frase está no cabeçalho do `paint-bg.mjs`, que fazia a coisa
    // certa e vinha sendo CHAMADO com os números errados).
    //
    // Em 384×216 aparece a LARGURA INTEIRA e 94,4% da altura (o recorte central de 1625×914
    // sobre 1625×968 — 5,6%, medido), com um pixel da pintura por pixel de tela.
    //
    // Duas cópias lado a lado, como o `paintBgF2`, para a rolagem nunca mostrar buraco.
    const temPintura = this.scene.textures.exists('paintBgF3');
    if (temPintura) {
      const w = (this.scene.textures.get('paintBgF3').getSourceImage() as { width: number }).width;
      for (let i = 0; i < 2; i++) {
        this.nebulaPainting.push(
          this.scene.add
            .image(i * w, 0, 'paintBgF3')
            .setOrigin(0, 0)
            // ⚠️ −96, NÃO −97. A camada `mundo` (o planeta) vive em −97, e −97 aqui daria um EMPATE
            // de profundidade: renderizaria certo só por acidente de ordem de inserção, e qualquer
            // reordenação futura das chamadas viraria a pintura para trás do planeta sem nenhuma
            // sonda pegar. −96 é o número honesto — é a camada que esta pintura SUBSTITUI, e ela
            // fica na frente do planeta, que é o que está mais longe.
            //
            // ⚠️ E A PINTURA É 100% OPACA (medido: 0 pixels não-opacos em 129.600). Ela ESCONDE
            // tudo que estiver atrás dela — inclusive o planeta. Isso é ACEITO e tem um efeito
            // colateral bom: quando a nuvem abre em t=42 e a pintura some, o planeta reaparece
            // JUNTO com o casco. A virada revela duas coisas, não uma.
            .setDepth(-96)
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

    // ─── O CASCO DO LEVIATÃ (Fatia 5) ───
    //
    // Até aqui o casco era uma fileira de `derelict` — o destroço GENÉRICO da Fase 2 — tingido de
    // azul. A fase se chama "O CASCO", e a promessa do GDD é que o Leviatã VIROU O CHÃO; uma tira
    // de sucata reaproveitada não cumpre isso.
    //
    // A arte nova é biomecânica de propósito: ela ANUNCIA o interior. A Fase 4 é costela, órgão e
    // maquinário, e entre as duas a nave é engolida por uma cutscene. Se o casco fosse placa lisa
    // de metal, a Fase 4 chegaria como surpresa desconexa; assim ela chega como confirmação.
    //
    // ⚠️ DUAS CAMADAS, E A PROPORÇÃO SAI DO `gap`. Os trechos LISOS são a base contínua e a
    // MAIORIA; o maquinário é pontuação. Um casco em que cada metro tem uma engrenagem lê como
    // brinquedo — são os trechos vazios que fazem o maquinário significar alguma coisa (a mesma
    // lógica do SILÊNCIO no ciclo da Capitânia). O `pickVariant` sorteia UNIFORME, então a
    // proporção não pode vir dele: vem daqui.
    //
    // ⚠️ ESCALA 1, INTEIRA — e o QUADRO NÃO É A FAIXA. As peças são 72×72 (70 depois do aparo,
    // ver abaixo), mas o desenho OPACO delas ocupa só as linhas 6..58 do quadro: a faixa que se
    // vê tem 53px, um quarto da tela, não um terço. O resto do quadro é padding transparente, e
    // é ele que a linha de baixo tem que compensar.
    //
    // ⚠️ `baseY = GAME_HEIGHT + 13`, NÃO `+ 6`. Com origem na base, o `baseY` ancora a BORDA DO
    // QUADRO, não o desenho — e o quadro tem 13px de transparência embaixo (a última linha
    // opaca da base é a 58 de 71). Em `+6` a faixa parava na linha 208 da tela e sobrava uma
    // tira de 7px de espaço aberto atravessando o rodapé inteiro: dava para ver estrela e
    // asteroide passando POR BAIXO do chão (medido: luminância 0,107 no casco contra 0,028 na
    // tira). `+13` põe a última linha opaca em 215, encostada na borda. O `derelict` antigo
    // usava `+26` e por isso nunca teve o problema — a âncora mudou com a arte e o padding não
    // foi recontado.
    //
    // ⚠️ SEM TINT. Luminância média medida entre 0,142 e 0,176 — a família já nasce escura. Um
    // tint aqui seria a terceira vez nesta campanha que se escurece arte que já estava escura.
    //
    // ⚠️ `gap` MENOR que a largura (70) na base: sobrepostos, como as montanhas do parallax — e
    // é por isso que isto NÃO é um TileSprite. Mas A SOBREPOSIÇÃO SOZINHA NÃO APAGAVA A EMENDA:
    // o PixelLab devolveu as peças com uma coluna de contorno PRETA na borda (0,008 contra 0,14
    // do miolo), e como a peça da direita desenha por cima, o contorno da borda ESQUERDA dela
    // ficava visível — um risco preto a cada ~60px. Quem resolve isso é o `instalar-casco.mjs`,
    // que corta 1px de cada lado das sete peças; as larguras aqui já contam com os 70px.
    // ⚠️ SEM TINT, E ISSO É A CORREÇÃO DE 28/08 — não um esquecimento.
    //
    // A geração de 25/08 voltou MARROM-OLIVA e a fase inteira teve de ser tingida de frio para
    // disfarçar (`tint 0x84c0ff`, calculado para levar #423f38 a #24323b). O Henrique jogou de
    // novo e a cor CONTINUAVA destoando: um tint multiplicativo só escurece, então o casco
    // chegava ao canon perdendo ~28% de luminância no caminho — frio E apagado, ao lado de um
    // rabo frio e vivo. Ele gerou os tiles novos, e eles nascem na cor certa (régua:
    // `scripts/_medir-paleta.mjs`, a cor MODAL do material e não os 8% mais claros, que aqui
    // mediriam o osso):
    //
    //   ref-leviata-armored   #0c121a / #1f2932   R−B −14 / −19
    //   rabo-leviata          #19222a (39%)       R−B −17
    //   casco ANTIGO          #32312b (44%)       R−B  +7   ← o intruso
    //   casco NOVO            #19222a / #2e3b44   R−B −17 / −22
    //
    // Tingir arte que já está no canon seria escurecê-la de graça.
    //
    // ⚠️ UMA CAMADA, NÃO DUAS. As sete peças velhas se dividiam em "lisas" (base densa) e
    // "detalhe" (pontuação esparsa), e a proporção entre as duas saía do `gap`. As novas são
    // seis faixas COMPLETAS de 114×66 — sobrepor duas camadas de arte opaca de altura cheia só
    // faria a de cima cobrir a de baixo em pedaços sorteados. A variedade agora vem de QUAL
    // peça entra, e isso passou a ser uma decisão de LUGAR (ver `familiaDoCasco`).
    //
    // ⚠️ `baseY = GAME_HEIGHT`, sem margem — e agora ele é honesto. As peças velhas tinham 13px
    // de padding transparente embaixo do desenho, e o `+14` era isso sendo compensado às cegas
    // (a versão `+6` deixou 7px de espaço aberto atravessando o rodapé, com estrela passando por
    // baixo do chão). O `instalar-casco.mjs` recorta as peças novas NA FAIXA: o quadro é o
    // desenho, sem padding nenhum. Com origem na base, a faixa ocupa y=150..215 — encostada na
    // borda de baixo, e com a crista em 150 contra os 165 de antes.
    //
    // ⚠️ `gap` MENOR QUE A LARGURA (114), como sempre: as peças se sobrepõem, e é por isso que
    // isto não é um TileSprite. O aparo de 1px de `instalar-casco.mjs` é o que impede a coluna
    // de contorno preta de quem desenha por cima de virar risco a cada tile.
    this.addLayer({
      key: 'cascoPlaca',
      factor: 1.0,
      baseY: GAME_HEIGHT,
      depth: -75,
      tint: 0xffffff,
      alpha: 1,
      scale: [1, 1],
      gap: [96, 108],
      terreno: true,
      casco: true,
    });

    // ─── A FAIXA DE CASCO DA FRENTE ───
    //
    // Um prop ancorado na linha do solo termina numa BORDA RETA, e sem nada na frente dele essa
    // borda fica à mostra: o respiradouro parecia "um asset colado no outro", sem base. É o
    // mesmo defeito que a Fase 1 já resolvia — e a Fase 3 nunca ganhou o remédio, porque a
    // faixa do casco vive lá atrás em `depth −75/−74` e não há nada entre o pé do prop e o olho.
    //
    // ⚠️ `depth −0.2`, o MESMO número do `groundFront` da Fase 1, e pelo mesmo motivo: à FRENTE
    // dos props (que nascem em −0.5, ver `TerrainSystem.spawn`) e ATRÁS da nave e dos inimigos
    // (depth 0). A nave nunca some atrás dela.
    //
    // ⚠️ `y = GROUND_Y − 8`, 18px de altura: a tira ocupa y=198..215 — encostada na borda de
    // baixo, sem aresta inferior à mostra. Antes eram `−4` e 20px, herdados da arte de 72² com
    // outro padding; com a faixa nova (66px, ancorada em `GAME_HEIGHT`) esses números deixariam
    // 6px da tira fora da tela sem motivo.
    //
    // ⚠️ A ARTE dela vem das linhas 44..61 do tile, não das 48..65 que corresponderiam a esta
    // altura. As 48..65 caem em cima dos SULCOS entre as placas hexagonais — colunas de 1px
    // quase pretas que, num tile repetido a cada 228px, viram um risco atravessando o chão da
    // fase (a sonda pegou, e o `casco-frente.mjs` agora reprova na fonte).
    //
    // Ela ainda cobre o pé dos props (que se ancoram em `GROUND_Y` = 206) com 8px de folga
    // acima da linha; mais alta que isso e ela começaria a engolir a silhueta deles.
    //
    // ⚠️ TINT ESCURO, nunca claro: é o casco MAIS PERTO, em leve sombra — a mesma leitura do
    // `groundFront`, e a mesma regra de sempre nesta campanha.
    //
    // ⚠️ 0x6390bf → 0xb0b0b0 (2026-08-28), pela mesma regra e pelo motivo oposto. O tint frio
    // existia para acompanhar a base, que estava sendo esfriada à força; a arte nova já é fria
    // de nascença, e repetir o frio aqui esfriaria DUAS vezes. O que sobra é o que a tira sempre
    // quis ser: um multiplicador NEUTRO a 69% — a mesma tinta com menos luz, e nada mais.
    //
    // Ela segue o alpha do CASCO (1 − nebulaDim): durante o Ato 1 não existe chão nenhum para
    // ter pé, e uma tira opaca no rodapé estragaria a nuvem. Quem a acende é o
    // `setNebulaDensity`, à mão — como a pintura, ela não é uma `ScatterLayer`.
    if (this.scene.textures.exists('cascoFrente')) {
      this.cascoFrente = this.scene.add
        .tileSprite(0, GROUND_Y - 8, GAME_WIDTH, 18, 'cascoFrente')
        .setOrigin(0, 0)
        .setDepth(-0.2)
        .setTint(0xb0b0b0)
        .setAlpha(0);
    }
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

  /**
   * QUE PARTE DO LEVIATÃ ESTÁ PASSANDO AGORA — e este é o pedido do Henrique (2026-08-28):
   * *"use a composição do casco com sabedoria, utilize uma métrica... no meio da composição você
   * pode colocar tiles que têm a costela, para 'parecer' que o jogador está +- no meio do
   * leviatã."*
   *
   * ⚠️ O `pickVariant` SORTEIA UNIFORME, então isto não pode sair dele — é a mesma lição que o
   * `gap` das camadas velhas já tinha aprendido. Aqui a escolha é de LUGAR: a mesma peça nunca
   * poderia aparecer na cauda e na proa, porque cauda e proa não são o mesmo pedaço de bicho.
   *
   * A régua é a DISTÂNCIA percorrida, não o relógio: o roteiro pode mudar de hora, a nave não
   * muda de velocidade. `CORPO` é o comprimento nominal do trecho roteirizado — o casco nasce
   * em t≈46,5 (o mergulho do rabo) e a serpente chega em t=88, o que a `SCROLL_SPEED` de 84px/s
   * põe em ~3500px. Depois disso a conta satura: a luta de chefão dura o que o jogador levar, e
   * ela acontece na PROA — perto da cabeça, que é para onde a Fase 4 leva.
   *
   *   0–28%    CAUDA    blindagem lisa e couro escamado. O toco do rabo acabou de afundar aqui.
   *   28–68%   MEIO     a CAIXA TORÁCICA. O trecho mais longo, e é ele que diz onde o jogador está.
   *   68%+     PROA     dutos e conduítes: a víscera técnica engrossando na direção da cabeça.
   *
   * As listas têm repetição de propósito: é assim que se dá PESO a uma escolha uniforme sem
   * inventar um sorteio com pesos. E nenhuma zona é de uma família só — um trecho inteiro de
   * costela seria um padrão, e padrão lê como papel de parede (a mesma razão dos trechos LISOS
   * da versão anterior).
   */
  private familiaDoCasco(): string {
    const CORPO = 3500;
    const p = Phaser.Math.Clamp(this.cascoDist / CORPO, 0, 1);

    const zona =
      p < 0.28
        ? ['cascoPlaca', 'cascoPlaca', 'cascoPlaca', 'cascoEscama', 'cascoEscama']
        : p < 0.68
          ? ['cascoCostela', 'cascoCostela', 'cascoCostela', 'cascoEscama', 'cascoEscama', 'cascoPlaca']
          : ['cascoDuto', 'cascoDuto', 'cascoDuto', 'cascoPlaca', 'cascoPlaca', 'cascoCostela'];

    // `pickVariant` ainda entra: `cascoCostela` tem a variante com maquinário e `cascoDuto` tem
    // a com a chapa arranhada. A zona escolhe a FAMÍLIA; o sorteio escolhe a peça dentro dela.
    //
    // ⚠️ `GetRandom` (que usa `Math.random`) E NÃO `Phaser.Math.RND`. Os dois são geradores
    // DIFERENTES, e o `RND` é o que `Phaser.Math.Between` consome — ou seja, o mesmo fluxo do
    // espaçamento das ondas e do sorteio de altura dos inimigos. Uma decisão de ARTE DE FUNDO
    // não pode adiantar o dado do jogo: puxar um número aqui deslocaria tudo o que vem depois,
    // e a sonda passaria a medir uma fase levemente diferente a cada mudança de cenário. O
    // `pickVariant` já usa `Math.random` pelo mesmo motivo.
    return pickVariant(this.scene, Phaser.Utils.Array.GetRandom(zona));
  }

  /**
   * Registra a animação de uma camada, uma vez por cena.
   *
   * ⚠️ `yoyo`, E É O QUE FECHA O LOOP. A sheet vem do gerador com 9 quadros que NÃO voltam ao
   * primeiro — o último é o pico, e um `repeat: -1` seco daria um corte duro de pico para
   * repouso a cada volta. Tocando 0→8→0 a batida fecha por construção, sem tocar na arte. É a
   * mesma solução que o `nucleo-beat` do chefão já usa, pelo mesmo motivo.
   */
  private registraAnim(a: { sheet: string; key: string; frameRate: number }): void {
    if (this.scene.anims.exists(a.key)) return;
    this.scene.anims.create({
      key: a.key,
      // Todos os quadros da folha, quantos forem: o coração tem 9, o maquinário 6 (ver a `BootScene`).
      frames: this.scene.anims.generateFrameNumbers(a.sheet),
      frameRate: a.frameRate,
      repeat: -1,
      yoyo: true,
    });
  }

  private emit(layer: ScatterLayer): void {
    // No vácuo o sprite nasce em qualquer altura e é ancorado pelo CENTRO — ele flutua, não
    // cresce do chão. Na superfície é o contrário: origem na base, sobre a linha do solo.
    // A `faixa`, quando existe, prende a camada a uma banda: é o que faz o cinturão ser um
    // cinturão, e não pedra espalhada.
    // As `faixas` (plural) sorteiam PRIMEIRO a banda, depois a altura dentro dela — é o que
    // permite "colado em cima ou colado embaixo, nunca no meio".
    const banda = layer.faixas
      ? Phaser.Utils.Array.GetRandom(layer.faixas)
      : (layer.faixa ?? [-10, GAME_HEIGHT + 10]);
    const y = layer.flutua ? Phaser.Math.Between(...banda) : layer.baseY;

    // A CAMADA QUE RESPIRA nasce `sprite` em vez de `image`; todo o resto é idêntico, porque
    // `Sprite` ESTENDE `Image` e o array da camada continua servindo os dois. Sem a sheet em
    // disco, `anima` é nulo e a peça nasce estática como sempre.
    const anima = layer.anim && this.scene.textures.exists(layer.anim.sheet) ? layer.anim : null;

    // ⚠️ O OBJETO NASCE NUMA EXPRESSÃO SÓ, E A CADEIA DE SETTERS VEM DEPOIS, SEM TERNÁRIO NO
    // MEIO. A 1ª versão escrevia `anima ? add.sprite(...) : add.image(...).setOrigin()...` e a
    // cadeia inteira grudava no ramo FALSO: a peça animada nascia sem depth (0 — na frente do
    // jogo), sem escala (1 em vez de 1,62–1,85), sem tint e sem origem. Ele jogou e diagnosticou
    // pela tela: *"os corações estão na primeira camada do parallax, aumente eles como fez com as
    // imagens estáticas e coloque-os na mesma camada de antes"*. Não havia nada de errado com a
    // arte — era precedência de operador.
    const base = anima
      ? this.scene.add.sprite(layer.nextX, y, anima.sheet)
      // Sorteia entre as variantes da camada: montanhas repetidas denunciam o truque.
      // O CASCO é a exceção — lá a peça não é sorteada, é o lugar do corpo que decide.
      : this.scene.add.image(
          layer.nextX,
          y,
          layer.casco ? this.familiaDoCasco() : pickVariant(this.scene, layer.key),
        );

    const img = base
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
    if (layer.flutua && !layer.faixa && !layer.faixas) img.setAngle(Phaser.Math.Between(0, 359));

    // E A RESPIRAÇÃO COMEÇA NUM PONTO SORTEADO DA BATIDA. `play` reinicia do quadro 0, então sem
    // o `startFrame` cada peça que entra pela direita nasceria em sístole junto com todas as
    // outras — e a tela inteira pulsaria em uníssono, que é a leitura de máquina, não de órgão.
    if (anima) {
      this.registraAnim(anima);
      // ⚠️ O SORTEIO VAI ATÉ O ÚLTIMO QUADRO DA ANIMAÇÃO, NUNCA ATÉ UM NÚMERO CRAVADO. Era `0..8`
      // enquanto as duas folhas tinham 9 quadros; o maquinário de 14/09 tem 6, e um sorteio 6–8
      // apontava para um quadro que não existe — a cena caía com "reading 'duration'", só às vezes.
      const quadros = this.scene.anims.get(anima.key).frames.length;
      (img as Phaser.GameObjects.Sprite).play({
        key: anima.key,
        startFrame: Phaser.Math.Between(0, quadros - 1),
      });
    }

    layer.sprites.push(img);
    layer.nextX += Phaser.Math.Between(...layer.gap);
  }

  /**
   * A fração da velocidade do mundo com que a PINTURA de fundo rola (o `bgFactor` dela; 0 sem pintura). O buraco da
   * Larva (frente B, F4) mora na pintura e anda com ela.
   */
  get fatorPintura(): number {
    const bg = this.paintedBg[0];
    return bg ? ((bg.getData('bgFactor') as number | undefined) ?? 0.04) : 0;
  }

  /** O relógio da fase (s). O horizonte da F1 é função dele: o treino, que salta para o chefão, cai no estado certo. */
  setRelogio(t: number): void {
    this.relogio = t;
  }

  /** O entulho da frente da F1 (rodada 5), ou `null` fora dela: o incêndio da morte do chefão se prende a ele. */
  chaoDaFrente(): Phaser.GameObjects.TileSprite | null {
    return this.chao?.frente() ?? null;
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
    // O HORIZONTE DA F1 e a BRUMA entre os planos (bloco G): o horizonte pelo relógio da fase; a bruma pelo mundo.
    this.horizonte?.atualizar(this.relogio);
    for (const b of this.brumaF1) b.ts.tilePositionX += worldSpeed * b.fator * dt;
    // O chão em pixel inteiro (tilePosition fracionário faz a arte tremular), cada faixa da conta do mesmo andado; as
    // brasas e a fumaça pelo relógio da fase.
    if (this.chao) {
      this.chaoAndado += worldSpeed * dt;
      this.chao.atualizar(this.relogio, this.chaoAndado, this.primeiroPlanoAlfa.v);
    }
    // O nado da silhueta, quase parado (3 quadros/s).
    if (this.leviLonge && this.leviathan.visible) {
      this.leviRelogio += dt;
      this.quadroLeviata();
    }
    this.avancaEntrada();

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

    // A faixa de casco da frente (Fase 3) tem o mesmo dever, mas o `groundOffset` acima só
    // avança quando existe `ground` — e na nebulosa não existe chão. Ela conta o dela.
    if (this.cascoFrente) {
      this.groundOffset += worldSpeed * dt;
      this.cascoFrente.tilePositionX = Math.round(this.groundOffset);
    }

    // A RÉGUA DO PERCURSO sobre o Leviatã (ver `familiaDoCasco`). Conta só DEPOIS do
    // `revealCasco`: durante o Ato 1 a faixa existe com alpha 0 e não há bicho nenhum sob a
    // nave — contar ali faria a nave nascer no meio das costelas quando o casco acendesse.
    if (this.cascoAndando) this.cascoDist += worldSpeed * dt;

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
    if (this.leviLonge) {
      // 19/10: cresce POUCO (40 → 60px) e quase não anda — longe demais para chegar depressa.
      const L = LEVI_LONGE;
      this.larguraLeviata(Phaser.Math.Linear(L.f2Largura[0], L.f2Largura[1], k));
      this.leviathan.setAlpha(Phaser.Math.Linear(L.f2Alpha[0], L.f2Alpha[1], k));
      this.leviathan.setPosition(Math.round(Phaser.Math.Linear(L.f2X[0], L.f2X[1], k)), Math.round(Phaser.Math.Linear(L.f2Y[0], L.f2Y[1], k)));
      return;
    }
    this.leviathan.setScale(Phaser.Math.Linear(0.5, 1.15, k));
    this.leviathan.setAlpha(Phaser.Math.Linear(0.45, 0.8, k));
    this.leviathan.setPosition(Phaser.Math.Linear(304, 250, k), Phaser.Math.Linear(72, 84, k));
  }

  /** A silhueta nova numa LARGURA (px de tela): escolhe a linha da folha assada nela — nunca escala. */
  private larguraLeviata(w: number): void {
    this.leviLargura = Phaser.Math.Clamp(Math.round(w), LEVI_LONGE.wMin, LEVI_LONGE.wMax);
    this.quadroLeviata();
  }

  /** O quadro da silhueta nova: a linha da largura + o quadro do nado no relógio dela. */
  private quadroLeviata(): void {
    if (!this.leviLonge) return;
    const nado = Math.floor(this.leviRelogio * LEVI_LONGE.fps) % LEVI_LONGE.quadros;
    this.leviathan.setFrame((this.leviLargura - LEVI_LONGE.wMin) * LEVI_LONGE.quadros + nado);
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

  /** Atenua (ou devolve) o primeiro plano enquanto há um ELITE em cena — ver `foregroundElite`. */
  setForegroundElite(atenuado: boolean, durationMs = 600): void {
    this.foregroundElite = atenuado ? 0.25 : 1;
    this.tweenPrimeiroPlano(durationMs);
    for (const layer of this.layers) {
      if (!layer.primeiroPlano || layer.sprites.length === 0) continue;
      this.scene.tweens.add({ targets: layer.sprites.slice(), alpha: this.alphaFor(layer), duration: durationMs, ease: 'Quad.easeOut' });
    }
  }

  /** O alfa do primeiro plano que não é camada de peças (a faixa `perto` do chão da F1) segue o mesmo alvo. */
  private tweenPrimeiroPlano(durationMs: number): void {
    this.scene.tweens.add({
      targets: this.primeiroPlanoAlfa,
      v: this.foregroundDim * this.foregroundElite,
      duration: durationMs,
      ease: 'Quad.easeOut',
    });
  }

  setForegroundDimmed(dimmed: boolean, durationMs = 1500): void {
    this.foregroundDim = dimmed ? 0 : 1;
    this.tweenPrimeiroPlano(durationMs);

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
   * A ARENA DO CHEFÃO: apaga TODAS as camadas de peças e deixa na tela só a pintura (e, na Fase 4,
   * a borda da `Moldura`, que não é camada deste arquivo). Quem chama é o roteiro — o `cenario`
   * com `soFundo` — e o salto do `G`/treino, pelo mesmo evento.
   *
   * ⚠️ A REGRA É DELE (14/09), e ela nasceu no núcleo da Fase 4: *"retire os maquinários do fundo
   * do núcleo. Todas as fases de BOSS ficam apenas com o fundo e, no caso da fase 4, a borda"*. O
   * `setForegroundDimmed` já tirava o PRIMEIRO PLANO da luta; o que sobrava atrás — coração,
   * maquinário, costelas, ponte — era cenário competindo com o chefão pelo olho.
   *
   * ⚠️ SÓ MEXE EM ALPHA, E A CAMADA CONTINUA EMITINDO — invisível. Não é preguiça: o `emit` gasta
   * `Phaser.Math.Between`, que é o fluxo de dado do JOGO. Parar de emitir mudaria a sequência
   * de sorteios da luta de chefão inteira, e a sonda passaria a medir um chefão diferente por
   * causa de uma decisão de arte de fundo. Um sprite em alpha 0 nem chega ao renderizador.
   *
   * Não tem volta, e não precisa: depois do chefão a fase acaba, e um restart reconstrói o
   * Parallax do zero (a mesma lei do `setForegroundDimmed`).
   */
  limpaCenario(durationMs = 300): void {
    if (this.cenarioDim === 0) return;
    this.cenarioDim = 0;

    for (const layer of this.layers) {
      if (layer.sprites.length === 0) continue;
      const alvo = this.alphaFor(layer);
      if (durationMs <= 0) {
        for (const s of layer.sprites) {
          this.scene.tweens.killTweensOf(s);
          s.setAlpha(alvo);
        }
        continue;
      }
      this.scene.tweens.add({
        targets: layer.sprites.slice(),
        alpha: alvo,
        duration: durationMs,
        ease: 'Sine.easeIn',
      });
    }
  }

  /**
   * O alpha REAL de um sprite da camada, com todos os fades de estado aplicados. É a fonte
   * única: `emit()` (sprite novo nasce certo), `setForegroundDimmed` e `setNebulaDensity`
   * calculam por aqui — dois fades escrevendo alpha por contas diferentes dessincronizam.
   */
  private alphaFor(layer: ScatterLayer): number {
    let a = layer.alpha * this.cenarioDim;
    if (layer.primeiroPlano) a *= this.foregroundDim * this.foregroundElite;
    if (layer.nebulosaExtra) a *= this.nebulaDim;
    if (layer.casco) a *= this.cascoReveal;
    return a;
  }

  /**
   * A DENSIDADE DA NEBULOSA (Fase 3): 1 = dentro da nuvem, 0 = céu limpo.
   *
   * ⚠️ ELE NÃO MEXE MAIS NO CASCO (2026-08-27). Até aqui era "um fade só para duas
   * revelações" — a nuvem sumindo e o casco nascendo eram a MESMA variável, e por isso
   * afinar a nuvem em t=21 arrastava o casco junto. Agora o casco tem o `cascoReveal` dele,
   * e quem o chama é o mergulho do rabo. Ver `revealCasco`.
   *
   * Counter em vez de tween por sprite: as camadas RECICLAM durante o fade, e um sprite novo
   * tem que nascer no alpha do instante (ver `emit`).
   */
  /**
   * TROCA a pintura do interior (Fase 4). Quem manda é o ROTEIRO (evento `cenario` no
   * `STAGE_4`), não um relógio interno — a forma da fase mora toda num lugar só.
   *
   * ⚠️ O fade MERGULHA NO ESCURO e volta, em vez de dissolver uma pintura na outra. As quatro
   * são opacas e detalhadas: um crossfade direto vira sopa no meio do caminho, com duas
   * anatomias diferentes somadas em alpha 0,5. O escuro lê como passar por um estreitamento —
   * que é exatamente o que a ficção diz que está acontecendo.
   *
   * ⚠️ E A TEXTURA TROCA NO MEIO DO MERGULHO, com a tela já escura. Trocar no começo mostraria
   * o corte.
   *
   * ⚠️ A duração é PONTO DE PARTIDA, não número fechado — é o tipo de coisa que só o olho do
   * Henrique jogando decide (a Fatia 6 provou isso três vezes).
   */
  setPintura(key: string, durationMs = 600): void {
    // Um salto no meio de uma entrada pela emenda termina a entrada antes: duas trocas por cima uma
    // da outra deixariam a cortina recortando a pintura errada.
    this.terminaEntrada();
    if (!this.pinturaF4.length || !this.scene.textures.exists(key)) return;
    if (this.pinturaAtual === key) return;

    if (durationMs <= 0) {
      // O CORTE SECO, SÍNCRONO (achado do review, 26/09). Era um `tweens.addCounter` de duração 0 —
      // e o Tween Manager só resolve o `onComplete` no PRÓXIMO passo dele, não no mesmo quadro em que
      // `setPintura` foi chamado. O treino (F4) e os saltos de dev (`applyState`) abrem exatamente
      // assim: o primeiro quadro ainda lia `paintBgF4a` (`pinturaAtual` só trocava um quadro depois),
      // e como `GameScene.update` lê `parallax.pinturaNaTela()` no MESMO quadro em que chama
      // `setPintura`, a Atmosfera começava com o perfil errado e só chegava ao certo por um fade de
      // 1500ms — um treino que deveria abrir na câmara D entrava na A e desbotava até D na frente do
      // jogador. Sem tween nenhum, a troca (textura + `pinturaAtual`) já vale para o quadro que pediu.
      for (const img of this.pinturaF4) img.setTexture(key).setAlpha(1);
      this.pinturaAtual = key;
      return;
    }

    const meio = durationMs / 2;
    this.scene.tweens.addCounter({
      from: 1,
      to: 0,
      duration: meio,
      ease: 'Sine.easeIn',
      onUpdate: (tw) => {
        const a = tw.getValue() ?? 0;
        for (const img of this.pinturaF4) img.setAlpha(a);
      },
      onComplete: () => {
        for (const img of this.pinturaF4) img.setTexture(key);
        this.pinturaAtual = key;
        this.scene.tweens.addCounter({
          from: 0,
          to: 1,
          duration: meio,
          ease: 'Sine.easeOut',
          onUpdate: (tw) => {
            const a = tw.getValue() ?? 1;
            for (const img of this.pinturaF4) img.setAlpha(a);
          },
        });
      },
    });
  }

  /**
   * TROCA A PINTURA PELA EMENDA — a câmara nova se revela ATRÁS do pilar da junta, acompanhando-o
   * enquanto ele atravessa a tela.
   *
   * ⚠️ ELA EXISTE PORQUE O MERGULHO NO ESCURO FOI REPROVADO NA ENTRADA DO NÚCLEO (14/09, 3º teste
   * jogado): *"a transição de fundos, de novo, está muito seca. Não está agradável"*. A borda já
   * tinha aprendido a entrar pela direita com o mundo, e o pilar a tapar a costura; a pintura
   * piscando no escuro de uma vez era a última coisa trocando "no quadro". Agora o lugar muda onde o
   * jogador PASSA: à esquerda do pilar ainda é o duto, à direita já é o núcleo.
   *
   * ⚠️ NÃO É UM CROSSFADE, e a lei do `setPintura` continua de pé: as duas pinturas nunca se somam
   * em alpha 0,5 no quadro inteiro — só na faixa de `ENTRADA_RAMPA` px da borda macia, que anda.
   *
   * `emendaX` é a borda esquerda da primeira placa nova, em x de tela (`Moldura.xDaEmenda`).
   * Quando a borda macia inteira passou da esquerda da tela, a troca se completa e a cortina some.
   */
  setPinturaPelaEmenda(key: string, emendaX: () => number): void {
    this.terminaEntrada();
    if (!this.pinturaF4.length || !this.scene.textures.exists(key) || this.pinturaAtual === key) return;

    const R = Parallax.ENTRADA_RAMPA;
    const CHAVE = 'f4EntradaMascara';
    if (!this.scene.textures.exists(CHAVE)) {
      // A máscara: transparente → opaca ao longo de R px, e opaca daí até cobrir a tela inteira mais
      // uma placa, que é de onde a emenda parte.
      const w = R + GAME_WIDTH + 256;
      const tex = this.scene.textures.createCanvas(CHAVE, w, GAME_HEIGHT)!;
      const ctx = tex.getContext();
      const g = ctx.createLinearGradient(0, 0, R, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, R, GAME_HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.fillRect(R, 0, w - R, GAME_HEIGHT);
      tex.refresh();
    }

    const mascara = this.scene.make.image({ x: GAME_WIDTH, y: 0, key: CHAVE }, false).setOrigin(0, 0);
    const bitmap = mascara.createBitmapMask();
    // Logo acima da pintura atual (−96) e abaixo de tudo o que é camada do interior (−88 em diante).
    const copias = this.pinturaF4.map((img) =>
      this.scene.add.image(img.x, img.y, key).setOrigin(0, 0).setDepth(-95.5).setMask(bitmap),
    );
    this.entrada = { key, copias, mascara, bitmap, emendaX };
    this.avancaEntrada();
  }

  /** Um quadro da entrada: a cortina segue a emenda, as cópias seguem a deriva da pintura. */
  private avancaEntrada(): void {
    const e = this.entrada;
    if (!e) return;
    e.copias.forEach((c, i) => c.setX(this.pinturaF4[i].x));
    const x = e.emendaX();
    // A borda macia é CENTRADA na emenda: metade dela ainda mostra o lugar de onde se vem.
    const esquerda = Math.min(GAME_WIDTH, x) - Parallax.ENTRADA_RAMPA / 2;
    e.mascara.setX(Math.round(esquerda));
    if (esquerda + Parallax.ENTRADA_RAMPA <= 0) this.terminaEntrada();
  }

  /** Completa a entrada em curso, se houver: a pintura nova vira a pintura, e a cortina some. */
  private terminaEntrada(): void {
    const e = this.entrada;
    if (!e) return;
    this.entrada = null;
    for (const img of this.pinturaF4) img.setTexture(e.key).setAlpha(1);
    this.pinturaAtual = e.key;
    for (const c of e.copias) c.destroy();
    e.bitmap.destroy();
    e.mascara.destroy();
  }

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
          if (!layer.nebulosaExtra) continue;
          const a = this.alphaFor(layer);
          for (const s of layer.sprites) s.setAlpha(a);
        }
        // A pintura não é ScatterLayer, então ela não passa por `alphaFor` — some aqui, à mão.
        for (const img of this.nebulaPainting) img.setAlpha(this.nebulaDim);
      },
    });
  }

  /**
   * O CASCO NASCE (Fase 3, a virada do Ato 1 para o Ato 2).
   *
   * ⚠️ QUEM CHAMA É A SAÍDA DO RABO (`GameScene.raboDoLeviata`), NÃO O ROTEIRO. O casco tem que
   * começar 300ms depois que o bicho ATRAVESSOU e saiu do quadro — e esse instante é o fim de
   * um tween, não uma linha do `STAGE_3`. Amarrá-lo ao relógio do roteiro faria os dois
   * derivarem na primeira vez que alguém mexesse na duração da travessia, e a costura viraria
   * corte outra vez.
   *
   * ⚠️ O GANCHO MUDOU DE DONO EM 2026-08-29, e o tween que o chamava não existe mais. Até 28/08
   * quem chamava era o fim do MERGULHO (o instante em que a nadadeira limpava o rodapé). O
   * Henrique reprovou o mergulho jogando — ele lia como peça se desprendendo — e escolheu, entre
   * três opções, que o casco nascesse DEPOIS da travessia, com um quadro vazio no meio: *"ele
   * passou, e o que estava atrás dele era o corpo."*
   */
  revealCasco(alvo: number, durationMs = 1500): void {
    const destino = Phaser.Math.Clamp(alvo, 0, 1);

    // O percurso sobre o bicho começa AQUI, no instante em que o casco nasce — é o zero de
    // `familiaDoCasco`, e é o instante logo depois que o rabo saiu do quadro. A cauda do
    // Leviatã é onde o jogador entra.
    if (destino > 0) this.cascoAndando = true;

    this.scene.tweens.addCounter({
      from: this.cascoReveal,
      to: destino,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        this.cascoReveal = tw.getValue() ?? destino;
        for (const layer of this.layers) {
          if (!layer.casco) continue;
          const a = this.alphaFor(layer);
          for (const s of layer.sprites) s.setAlpha(a);
        }
        // A faixa da frente não é ScatterLayer — não passa por `alphaFor`. Acende aqui, à mão,
        // e junto com o casco: ela é o casco MAIS PERTO (ver a construção dela).
        this.cascoFrente?.setAlpha(this.cascoReveal);
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
    // O chão da F1 cai em PARALLAX: a faixa mais longe desce menos (`CHAO_F1.queda`).
    this.chao?.cair();

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
    this.scene.tweens.add({ targets: this.leviathan, alpha: this.leviLonge ? LEVI_LONGE.f1.alpha : 0.55, duration: 3500, delay: 1400 });

    this.playAtmosphereExit();
  }

  /**
   * A PINTURA NA TELA — o que a Atmosfera segue (Fatia 9): cada pintura tem o seu tom. Na F1, depois de romper a
   * atmosfera, o céu é o zero-G; na F4, a câmara corrente (`pinturaAtual`, A–D).
   */
  pinturaNaTela(): ChavePintura {
    switch (this.mode) {
      case 'superficie':
        return this.exiting ? 'paintBgZeroG' : 'paintBgF1';
      case 'espaco':
        return 'paintBgF2';
      case 'nebulosa':
        return 'paintBgF3';
      case 'interior': {
        const p = this.pinturaAtual;
        return p === 'paintBgF4b' || p === 'paintBgF4c' || p === 'paintBgF4d' ? p : 'paintBgF4a';
      }
    }
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
      // A F1 do bloco G: a bruma entre os planos. Não é terreno: não cai, só sai, como a pintura antiga saía.
      ...this.brumaF1.map((b) => b.ts),
    ];
    if (saindo.length) {
      t.add({ targets: saindo, alpha: 0, delay: 500, duration: 1500, ease: 'Sine.easeInOut' });
    }
    // E o HORIZONTE (a pintura, as luzes, a invasão) sai pelo multiplicador dele: as peças da invasão escrevem o próprio
    // alfa a cada quadro, então um tween nelas seria desfeito no quadro seguinte.
    if (this.horizonte) t.add({ targets: this.horizonte.saida, v: 0, delay: 500, duration: 1500, ease: 'Sine.easeInOut' });
    t.add({ targets: this.zeroGBg, alpha: 1, delay: 500, duration: 1500, ease: 'Sine.easeInOut' });
  }
}
