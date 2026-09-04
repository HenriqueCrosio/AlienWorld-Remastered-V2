import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import { Starfield } from '../Starfield';
import { Parallax } from '../Parallax';
import { resetVariantCache } from '../art';
import { pixelText } from '../ui';
import { Fx } from '../systems/Fx';
import { Music } from '../systems/Music';
import { SHIPS, DEFAULT_SHIP, ROSTER_FINAL } from '../ships';
import { ShipPanel } from '../ui/ShipPanel';
import { STAGES } from '../systems/StageDirector';
import type { HandlingMode } from './GameScene';

/**
 * O HANGAR DO LEVIATÃ — a cutscene entre a Fase 3 e a Fase 4.
 *
 * ─── O QUE ELA FAZ PELA CAMPANHA ───
 *
 * As duas primeiras interludes destruíram o lugar DE ONDE o jogador veio (a Aurora implode, a
 * Doca cai). Esta inverte o verbo: o jogador não queima a ponte — ele é ENGOLIDO. A nave sai da
 * luta com a serpente danificada, perde potência e cai dentro do Leviatã. A ponte queimada desta
 * vez é a SAÍDA: a entrada colapsa atrás dele, e a única direção que resta é para dentro.
 *
 * O hangar guarda as CARCAÇAS DA FROTA ENGOLIDA — a Frota Morta da Fase 2, vista por dentro. É
 * daí que sai o painel de escolha: você não compra uma nave, você SALVA uma nave irmã do
 * cemitério. E é a única interlude com o róster completo (ROSTER_FINAL, 8 naves — entra a
 * BATERIA): é a última escolha da campanha, então nada fica guardado.
 *
 * ─── O DANO É POR CÓDIGO, NÃO POR ARTE (decisão de orçamento, 2026-07-19) ───
 *
 * A nave que chega é a REAL do jogador — qualquer uma das 8. Gerar arte "danificada" por nave
 * estouraria o saldo do PixelLab; fumaça (puff), fagulhas, o thrust falhando (timeScale da anim
 * sorteado) e o voo cambaleante (senoide em y e ângulo) vendem o dano para todas de graça.
 *
 * ─── AS JANELAS SÃO VAZADAS, E ISSO É O TRUQUE DA CENA ───
 *
 * A pintura passou pelo `scripts/instalar-cut3.mjs`: as cinco janelas foram VAZADAS por
 * preenchimento a partir de sementes (nunca limiar global — 20,5% da parede cai na mesma faixa
 * neutra do xadrez), e não têm nada pintado atrás. O starfield e o parallax REAIS do jogo vivem
 * em depth baixo e aparecem ATRAVÉS delas — o espaço lá fora se mexe de verdade. O convés já vem
 * PINTADO e opaco, então o retângulo de piso que existia por trás não é mais necessário.
 */
export class Interlude3Scene extends Phaser.Scene {
  private starfield!: Starfield;
  private parallax!: Parallax;
  private fx!: Fx;

  private ship!: Phaser.GameObjects.Sprite;
  /** A criatura que substituiu o portão. Existe desde `create()`; morre no beat final. */
  private garganta?: Phaser.GameObjects.Sprite;
  private banner!: Phaser.GameObjects.Text;
  private panel: ShipPanel | null = null;

  /** Fumaça do casco ferido e fagulhas da derrapagem — criados UMA vez (armadilha 5). */
  private fumaca!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fagulhas!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sputter?: Phaser.Time.TimerEvent;

  private score = 0;
  private handling: HandlingMode = 'diegetico';
  private naveId: string = DEFAULT_SHIP;
  private proxima = 4;
  private done = false;
  /** Ligado no impacto: daí em diante as 17 lâmpadas viram alarme (ver `pulsarLampadas`). */
  alarme = false;
  /** Os x dos 10 estouros da cadeia, na ordem — a sonda lê esta lista. */
  cadeiaX: number[] = [];
  private t = 0;
  /** 'entrando' = voo cambaleante (o update anima); depois disso os tweens assumem. */
  private fase: 'entrando' | 'chao' = 'entrando';

  // ─── A GEOMETRIA DO HANGAR — medida na PINTURA (384×216), não mais no `hangar.png` ───
  //
  // ⚠️ OS NÚMEROS ANTIGOS ERAM DA OUTRA ARTE. `ART_W/ART_H` (160), `SCALE` (1,5), `HANGAR_X`
  // (264), `WALL_ROW` (97) e `DECK_ROW` (138) descreviam o azulejo de 160px desenhado duas vezes.
  // A pintura é 1:1 com a tela, então só sobra a linha do convés.
  //
  // `DECK_Y` é o TOPO DA FAIXA DE PERIGO amarela e preta, medida por cor na pintura instalada
  // (y=171..173 acusam 152/152/161px quentes na largura; as linhas vizinhas caem para 12 e 5) e
  // conferida marcando a linha na arte (scripts/_cut3/conves-medido.png). É onde a nave encosta:
  // ela repousa em DECK_Y−7 e quica em DECK_Y−13.
  private static readonly DECK_Y = 171;

  /**
   * O CENTRO DA FAIXA DAS JANELAS, medido no alpha da pintura instalada: os pixels vazados vão de
   * y=44 a y=132, 89px de altura. É a altura por onde a nadadeira passa — ela só existe na tela
   * pelo que as janelas deixam ver, então a régua dela é a das janelas, não o olho.
   */
  private static readonly JANELAS_Y = 88;

  /**
   * A GARGANTA — a criatura que substituiu o portão.
   *
   * ⚠️ A ARTE É A DO HENRIQUE, o objeto PixelLab `15f111fd`, face `south` — a boca frontal com o
   * miolo em espiral. Ele já existia, com 8 direções, e a decisão dele em 2026-09-04 foi usar
   * AQUELE arquivo, não um redesenho: a peça entra em TAMANHO NATIVO, sem um pixel de estica.
   *
   * ⚠️ E FOI ISSO QUE FIXOU O ENQUADRAMENTO, não o contrário. O spec pedia "altura inteira"
   * (y 8..199, 191px), mas o desenho dele tem 137px depois do recorte pela caixa única das duas
   * animações. Esticar 1,46× para chegar aos 191 quebraria a grade de pixel — é o erro nº 4 da 1ª
   * volta. Então o enquadramento cedeu, e o que ficou é o que a arte real permite: ela PISA NO
   * CONVÉS. `base` é a linha do convés; o topo é consequência da altura do arquivo.
   *
   * Com centro em 330 e 136 de largura, ela cobre x≈262..398: OCLUI a janela #5 (336..376) por
   * inteiro e a #4 (288..321) quase toda. Ela não está embutida na parede, ela está DENTRO do
   * hangar, NA FRENTE dela — objeto ocluindo parede é render, não colagem, e é por aí que ela
   * escapa do defeito que matou o portão.
   *
   * `mira` é onde a nave RECUA para atirar, e `miraY` a altura da boca. ⚠️ O recuo não é enfeite:
   * a nave para em x=258, encostada na criatura, e um tiro de 72px disparado de cima do alvo não
   * se lê como tiro. Recuando para 150, o torpedo cruza 180px de tela.
   */
  private static readonly GARGANTA = {
    x: 330,
    base: Interlude3Scene.DECK_Y,
    miraY: 103,
    mira: 150,
  } as const;

  /**
   * A CADEIA — 10 estouros correndo da GARGANTA até a boca por onde a nave entrou.
   *
   * ⚠️ ELA INVERTEU DE SENTIDO, E O SENTIDO É A CAUSA. Na 1ª volta a cadeia corria só na metade
   * esquerda, com x e y SORTEADOS, e nascia de um banner. Agora ela nasce NA CRIATURA que o
   * jogador acabou de estourar e corre dali até a entrada: a onda tem origem, e a origem é o tiro
   * dele.
   *
   * ⚠️ E TUDO AQUI É DERIVADO DO ÍNDICE. O sorteio saiu porque a sonda fotografa a cena — e
   * porque uma onda com jitter aleatório não lê como onda, lê como pipoca.
   */
  private static readonly CADEIA = { n: 10, x0: 330, x1: 8, t0: 200, passo: 140 } as const;

  // A pintura (70) traz o próprio convés, então o retângulo de piso que ficava atrás dela
  // (DEPTH_PISO 64) saiu junto com o azulejo. O ENTULHO do colapso fica ACIMA dela (ele mura a
  // metade esquerda, na frente das janelas); a nave (80) passa na frente de tudo.
  private static readonly DEPTH_HANGAR = 70;
  private static readonly DEPTH_ENTULHO = 72;
  // A GARGANTA fica ACIMA da pintura e do entulho, e ABAIXO da nave: ela é um corpo dentro do
  // hangar, e a nave passa na frente dele.
  private static readonly DEPTH_GARGANTA = 75;
  private static readonly DEPTH_NAVE = 80;

  constructor() {
    super('Interlude3');
  }

  create(data: { score?: number; handling?: HandlingMode; ship?: string; stage?: number }): void {
    this.score = data.score ?? 0;
    this.handling = data.handling ?? 'diegetico';
    // A nave com que ele LUTOU contra a serpente — é ela que chega em frangalhos.
    this.naveId = SHIPS[data.ship ?? ''] ? data.ship! : DEFAULT_SHIP;
    this.proxima = data.stage ?? 4;
    this.done = false;
    this.panel = null;
    this.alarme = false;
    this.cadeiaX = [];
    this.t = 0;
    this.fase = 'entrando';

    resetVariantCache();

    this.starfield = new Starfield(this);
    // O espaço que aparece pelas janelas e pela boca é o de onde a nave VEIO: a NEBULOSA da
    // Fase 3 (modo `espaco` mostrava a Lua de Kepler e o cinturão marrom — o céu da Fase 2, a
    // duas fases de distância: o fundo mentindo). Densidade média: estamos na BORDA da nuvem,
    // colados no casco, não dentro dela. E a silhueta distante do Leviatã some — a cena
    // acontece DENTRO dele.
    this.parallax = new Parallax(this, 'nebulosa');
    this.parallax.setNebulaDensity(0.45, 0);
    this.parallax.setLeviathanVisible(false);
    this.fx = new Fx(this);

    this.construirHangar();
    this.nadadeira();
    this.plantarCarcacas();
    this.plantarGarganta();

    // A nave chega DANIFICADA. A fumaça segue o casco; as fagulhas só ligam na derrapagem.
    const chegada = SHIPS[this.naveId];
    const chegadaTex = this.textures.exists(chegada.texture) ? chegada.texture : 'ship';
    this.ship = this.add.sprite(-30, 62, chegadaTex).setDepth(Interlude3Scene.DEPTH_NAVE);
    const chegadaAnim = chegadaTex === chegada.texture ? (chegada.anim ?? 'ship-thrust') : 'ship-thrust';
    if (this.anims.exists(chegadaAnim)) this.ship.play(chegadaAnim);

    // Fumaça ESCURA, sem blend aditivo: aditivo é clarão, e fumaça é o oposto de clarão.
    this.fumaca = this.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 500, max: 900 },
        speedX: { min: -34, max: -14 },
        speedY: { min: -18, max: -4 },
        // Mais gorda e mais opaca do que o instinto pede: contra o espaço escuro, fumaça
        // tímida não existe (na revisão quadro a quadro ela mal aparecia).
        scale: { start: 1.0, end: 2.6 },
        alpha: { start: 0.75, end: 0 },
        tint: [0x4a5266, 0x333a4d],
        frequency: 40,
      })
      .setDepth(Interlude3Scene.DEPTH_NAVE - 1);
    this.fumaca.startFollow(this.ship, -10, -3);

    this.fagulhas = this.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 160, max: 360 },
        speedX: { min: -90, max: -30 },
        speedY: { min: -60, max: -6 },
        scale: { start: 1.1, end: 0 },
        tint: [COLORS.hotBright, COLORS.hot, 0xffffff],
        blendMode: 'ADD',
        frequency: 18,
        emitting: false,
      })
      .setDepth(Interlude3Scene.DEPTH_NAVE + 1);
    this.fagulhas.startFollow(this.ship, -8, 7);

    // O MOTOR FALHA: a cada batida, a animação de propulsão muda de ritmo — e às vezes cospe.
    // É o "tossir" do motor, e é ele que diz que a queda não é escolha.
    this.sputter = this.time.addEvent({
      delay: 240,
      loop: true,
      callback: () => {
        if (this.done || this.fase !== 'entrando') return;
        this.ship.anims.timeScale = Phaser.Math.FloatBetween(0.35, 1.6);
        if (Math.random() < 0.3) {
          this.fx.hit(this.ship.x - 11, this.ship.y - 1);
          this.fumaca.explode(3, this.ship.x - 10, this.ship.y - 3);
        }
      },
    });

    this.banner = pixelText(this, GAME_WIDTH / 2, 26, '', { size: 11, color: COLORS.hotBright })
      .setDepth(100)
      .setAlpha(0);

    this.roteiro();

    // ⚠️ SEM TECLA DE PULAR — a mesma lição das outras duas cutscenes (docs/HANDOFF.md): o
    // jogador chega da luta com o dedo martelando o ESPAÇO.
  }

  /**
   * O CENÁRIO — UMA pintura, não mais o azulejo repetido.
   *
   * A parede era `hangar.png` (160×160) desenhado duas vezes a 1,5×, `[espelhada | arte]`. O
   * truque resolvia a tela vazia, mas a repetição se via: o mesmo arco, a mesma janela e o mesmo
   * pilar quatro vezes. A pintura do Henrique é um quadro largo e ASSIMÉTRICO de 384×216 — 1px de
   * arte = 1px de jogo, sem emenda para esconder.
   *
   * ⚠️ E O `hangar.png` CONTINUA EXISTINDO, intocado: ele é a parede de fundo da FASE 4
   * (`Parallax` modo `interior`), que é a Fatia 7. Esta cena só deixou de usá-lo.
   *
   * O piso desenhado por trás também saiu: a pintura entrega o convés, a faixa de perigo e a
   * banda escura de baixo dela mesma.
   */
  /**
   * A NADADEIRA PEITORAL — uma remada só, atravessando a faixa das janelas.
   *
   * ⚠️ ELA VIVE ATRÁS DA PINTURA, e é isso que faz a cena funcionar sem máscara nenhuma. Como as
   * cinco janelas são as ÚNICAS aberturas da pintura, a nadadeira só aparece por elas — o quadro
   * da janela a recorta sozinho, e esse recorte é exatamente o que vende que ela está do lado de
   * fora do casco.
   *
   * ⚠️ DIREITA → ESQUERDA, e a direção foi DERIVADA E CONFIRMADA, nunca assumida. A Fase 3 já
   * cravou que o corpo do Leviatã fica fora do quadro à direita e que ele nada no mesmo sentido
   * da nave; num bicho que nada para a direita, a remada de FORÇA varre para trás. Assumir esta
   * direção sem perguntar foi o que reprovou quatro versões do rabo.
   *
   * ⚠️ E É UMA LINHA SÓ: O `x`. Sem `y`, sem `angle`, sem `alpha`. Cada eixo extra que entrou nas
   * tentativas do rabo foi lido como o corpo se deformando ou se soltando.
   *
   * O `y` é o CENTRO MEDIDO da faixa das janelas (elas ocupam y=44..132 na pintura instalada),
   * não um número escolhido no olho.
   */
  private nadadeira(): void {
    if (!this.textures.exists('nadadeira')) return;

    const nad = this.add
      .image(GAME_WIDTH + 140, Interlude3Scene.JANELAS_Y, 'nadadeira')
      .setDepth(Interlude3Scene.DEPTH_HANGAR - 1)
      .setName('nadadeiraCut3');

    this.tweens.add({
      targets: nad,
      x: -140,
      delay: 1200,
      duration: 6000,
      ease: 'Sine.easeInOut',
      // DESTRUIR, nunca deixar parada fora da tela: objeto esquecido é a armadilha que o preto do
      // casco e a sombra órfã do prop já documentaram.
      onComplete: () => nad.destroy(),
    });
  }

  /**
   * O PLANTIO DAS CARCAÇAS — a régua é a que a Fase 3 pagou (`TerrainSystem.PLANTIO`).
   *
   * ⚠️ PÉ SORTEADO COM SALTO MÍNIMO GARANTIDO POR CONSTRUÇÃO, nunca por probabilidade. Sorteio
   * uniforme puro dá dois vizinhos a 1px de diferença e a fila volta — o olho não compara uma
   * peça com a média da faixa, compara com a VIZINHA. A Fase 3 mediu isso: oito props saíram
   * entre 191 e 199 numa execução.
   *
   * ⚠️ E ELAS SÃO CENÁRIO: sem corpo físico, sem colisão. A nave derrapa e para em x≈258, um vão
   * escolhido a dedo na revisão de 2026-07-19 justamente para ela não parar dentro do monte de
   * metal e sumir. Plantar uma carcaça ali refaria aquele defeito — daí o `VAO_DA_NAVE`.
   *
   * ⚠️ O TAMANHO É DERIVADO DO TETO DAS JANELAS, e está ASSADO NO ARQUIVO — o plano não previa
   * nenhum dos dois. O gerador entrega 128px num jogo de 216px de altura: em tamanho nativo, uma
   * carcaça sozinha cobriria a parede e taparia as janelas — justamente por onde a NADADEIRA
   * precisa aparecer, que é o efeito que sustenta a cena. A conta: as janelas terminam em y=132
   * (medido no alpha da pintura) e o plantio mais ao fundo põe o pé em DECK_Y−10 = 161, então
   * sobram 29px. A mais alta do lote tinha 77px, e 29/77 = 0,376 — daí o fator 0,36, que deixa
   * folga. Elas ficam com 41×25, 47×24 e 39×28, contra os 30×22 da nave do jogador: maiores que
   * ela, como naves de guerra engolidas devem ser, sem comer o quadro.
   *
   * ⚠️ E A REDUÇÃO É DO ARQUIVO, NÃO `setScale()`. A lei do projeto é 1px de arte = 1px de jogo;
   * um setScale(0,36) deixaria 128px de arte sendo espremidos a cada quadro, e a grade de pixel
   * do sprite pararia de casar com a da tela. `scripts/reduzir-sprite.mjs` assa o tamanho e
   * relimiariza o alpha (a franja do lanczos vira contorno fantasma sobre fundo escuro).
   * ⚠️ Reinstalar do PixelLab REFAZ o arquivo em 128px — reduzir de novo depois.
   */
  private static readonly CARCACAS = { fundo: -10, frente: 4, saltoMin: 4 } as const;
  private static readonly VAO_DA_NAVE = { x: 258, raio: 40 } as const;

  private plantarCarcacas(): void {
    const artes = ['carcaca1', 'carcaca2', 'carcaca3'].filter((k) => this.textures.exists(k));
    if (!artes.length) return;

    const { fundo, frente, saltoMin } = Interlude3Scene.CARCACAS;
    // ⚠️ ERAM TRÊS, E A TERCEIRA (x=330) CAIU EM 2026-09-04. A garganta cobre x=235..426: a peça
    // ficava 100% atrás dela, invisível — arte aprovada no teste jogado sendo desenhada para
    // ninguém. Medido em `scripts/_cut3/_mock-garganta.png`; decidido pelo Henrique com as três
    // saídas na mesa (mover a carcaça, mover a nave, ou cortar). O convés livre acaba em x≈235.
    const xs = [64, 150].filter(
      (x) => Math.abs(x - Interlude3Scene.VAO_DA_NAVE.x) > Interlude3Scene.VAO_DA_NAVE.raio,
    );

    let ultimo = 0;
    for (let i = 0; i < xs.length; i++) {
      // O salto mínimo é garantia de construção: sorteia dentro do que SOBRA, em vez de tentar de
      // novo até dar certo — laço de recusa com teto às vezes estoura e devolve altura repetida.
      let pe: number;
      if (ultimo === 0) {
        pe = Math.round(fundo + Math.random() * (frente - fundo));
      } else {
        const abaixo = Math.max(0, ultimo - saltoMin - fundo + 1);
        const acima = Math.max(0, frente - (ultimo + saltoMin) + 1);
        const n = Math.floor(Math.random() * (abaixo + acima));
        pe = n < abaixo ? fundo + n : ultimo + saltoMin + (n - abaixo);
      }
      ultimo = pe;

      const y = Interlude3Scene.DECK_Y + pe;
      const c = this.add
        .image(xs[i], y, artes[i % artes.length])
        .setOrigin(0.5, 1)
        // Quem está plantado mais à FRENTE (pé maior) desenha por cima. Sem isto, a ordem seria
        // decidida pela ordem de criação, ou seja, por acaso.
        .setDepth(Interlude3Scene.DEPTH_HANGAR + 1 + (pe - fundo) * 0.01)
        .setName('carcacaCut3');

      // A SOMBRA DE CONTATO: escurecimento puro, nunca glow — a regra do projeto é que o que está
      // perto do olho entra em sombra, jamais em luz. Ela tem que TRANSBORDAR a base (1,35 da
      // largura) e ficar 1px ABAIXO do pé: mais estreita que a peça, ela desenha inteira atrás do
      // dono e não sobra um pixel na tela. Foi assim na 1ª versão do prop de casco.
      const sombra = this.add
        .ellipse(c.x, y + 1, Math.round(c.displayWidth * 1.35), 6, 0x000000, 0.5)
        .setDepth(c.depth - 0.001)
        .setName('sombraCarcaca');
      c.once('destroy', () => sombra.destroy());
    }
  }

  /**
   * A GARGANTA, plantada no primeiro quadro.
   *
   * ⚠️ ELA NÃO SURGE. Respira durante a queda, a derrapagem e o painel de escolha inteiro — a
   * queixa exata contra o portão foi "apenas surge um asset sem relação nenhuma com a arte".
   * Um corpo que já estava lá quando você caiu não surge: você é que chegou.
   *
   * ⚠️ ANCORADA PELO PÉ, não pelo centro nem pelo topo. A linha do convés (`DECK_Y`) é um número
   * MEDIDO na pintura; a altura da criatura é o que o arquivo tiver. Ancorar pelo topo faria ela
   * flutuar acima ou afundar no convés a cada reinstalação da peça — o pé é o único ponto que a
   * cena conhece de verdade. É a mesma âncora das carcaças, e pelo mesmo motivo.
   */
  private plantarGarganta(): void {
    if (!this.textures.exists('gargantaCut3')) return;

    this.garganta = this.add
      .sprite(Interlude3Scene.GARGANTA.x, Interlude3Scene.GARGANTA.base, 'gargantaCut3')
      .setOrigin(0.5, 1)
      .setDepth(Interlude3Scene.DEPTH_GARGANTA)
      .setName('gargantaCut3');

    if (this.anims.exists('garganta-idle')) this.garganta.play('garganta-idle');
  }

  private construirHangar(): void {
    this.add
      .image(0, 0, 'paintBgCut3')
      .setOrigin(0, 0)
      .setDepth(Interlude3Scene.DEPTH_HANGAR)
      // O nome é o que a sonda tem para agarrar.
      .setName('paredeCut3');
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.t += dt;

    this.starfield.update(dt);
    this.parallax.update(dt, 14);

    // O VOO CAMBALEANTE: enquanto a nave está no ar, y e ângulo oscilam por senoide — o tween só
    // leva o x. Cambalear por tween seria uma coreografia; por senoide é um sistema falhando.
    if (this.fase === 'entrando' && !this.done) {
      this.ship.y = 62 + Math.sin(this.t * 2.4) * 7 + this.t * 1.5;
      this.ship.angle = Math.sin(this.t * 3.1) * 4;
    }
  }

  // ─── O roteiro ──────────────────────────────────────────────────────────────

  private roteiro(): void {
    this.placar();

    this.time.delayedCall(2300, () => {
      if (this.done) return;
      this.aviso('CASCO CRÍTICO · POTÊNCIA CAINDO', COLORS.enemyBright);
      this.cameras.main.flash(160, 255, 80, 80);
    });

    // A nave entra manca pela boca. O x é tween; o cambaleio é do update.
    this.tweens.add({
      targets: this.ship,
      x: 104,
      duration: 3600,
      ease: 'Sine.easeOut',
      delay: 1200,
    });

    this.time.delayedCall(5200, () => this.queda());
  }

  private placar(): void {
    // ⚠️ Com FAIXA ESCURA própria: o interior agora preenche a tela INTEIRA (arte espelhada),
    // então não existe canto de céu limpo para o texto — e texto sobre parede + carcaças some
    // no ruído. A mesma regra do ShipPanel: a legibilidade não pode depender da arte atrás.
    const banda = this.add
      .rectangle(0, 64, GAME_WIDTH, 78, COLORS.bgDeep, 0.72)
      .setOrigin(0, 0)
      .setDepth(99);

    const t = (y: number, v: string, size: number, color: number) =>
      pixelText(this, GAME_WIDTH / 2, y, v, { size, color }).setDepth(100);

    const linhas = [
      t(74, 'FASE 3 · O CASCO', 11, COLORS.playerBright),
      t(92, 'CONCLUÍDA', 8, COLORS.metalLight),
      t(116, String(this.score), 17, COLORS.hotBright),
      t(132, 'PONTOS', 7, COLORS.metalLight),
    ];

    this.tweens.add({
      targets: [banda, ...linhas],
      alpha: 0,
      duration: 900,
      delay: 2400,
      onComplete: () => {
        banda.destroy();
        linhas.forEach((l) => l.destroy());
      },
    });
  }

  /**
   * A QUEDA — não é um pouso.
   *
   * As outras cutscenes pousam em arco limpo (x desacelera, y assenta). Aqui o y ACELERA
   * (Quad.easeIn): a nave não desce, ela CAI — e a diferença entre as duas curvas é a diferença
   * entre chegar e ser engolido.
   */
  private queda(): void {
    if (this.done) return;

    this.fase = 'chao';
    this.sputter?.remove();
    this.ship.anims.timeScale = 1;
    this.aviso('HANGAR DO LEVIATÃ', COLORS.hot);

    // Toca o chão em x=144 — a EMENDA das duas cópias, bem debaixo do portão duplo (o anel
    // espelhado), no único trecho de convés livre de carcaças (montes em ≈61..136 na cópia
    // espelhada e ≈151..226 na principal). O impacto no vão do portão é legível; dentro de um
    // monte, a nave sumia no metal cinza (revisão visual quadro a quadro, 2026-07-19).
    this.tweens.add({ targets: this.ship, x: 144, duration: 1400, ease: 'Sine.easeOut' });
    this.tweens.add({
      targets: this.ship,
      y: Interlude3Scene.DECK_Y - 7,
      angle: 6,
      duration: 1400,
      ease: 'Quad.easeIn',
      onComplete: () => this.derrapagem(),
    });
  }

  /**
   * A DERRAPAGEM — o pouso SUJO é a narrativa.
   *
   * Toca o convés com impacto (clarão + shake), quica uma vez e desliza de nariz baixo cuspindo
   * fagulhas até parar no meio do hangar, entre as carcaças. Se ela assentasse suave, o dano
   * inteiro da entrada viraria mentira.
   */
  private derrapagem(): void {
    if (this.done) return;

    this.fx.explode(this.ship.x, Interlude3Scene.DECK_Y, 1.3);
    this.fagulhas.emitting = true;

    // O quique: um só, curto. Dois quiques viram bolinha; nenhum vira pouso.
    this.tweens.add({
      targets: this.ship,
      y: Interlude3Scene.DECK_Y - 13,
      duration: 240,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => {
        this.fx.hit(this.ship.x, Interlude3Scene.DECK_Y);
        this.cameras.main.shake(120, 0.004);
      },
    });

    // O deslize: passa NA FRENTE do monte esquerdo (depth 80 > 70 — de raspão, vendendo o
    // caos) e para no VÃO LIVRE entre os dois montes (tela ≈ 226..286; carcaças medidas na
    // arte: x≈5..55 e x≈95..145). Parar em 240 deixava a nave COLADA na borda do monte e as
    // duas silhuetas cinza viravam uma massa só — o beat "REARMADA" existe para MOSTRAR a nave.
    this.tweens.add({
      targets: this.ship,
      x: 258,
      duration: 2100,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.fagulhas.emitting = false;
        this.tweens.add({ targets: this.ship, angle: 0, duration: 280 });
        // Parada, ela ainda fumega — só MENOS: o incêndio acabou, o estrago ficou.
        this.fumaca.frequency = 160;
        this.time.delayedCall(800, () => this.escolha());
      },
    });
  }

  /**
   * A ESCOLHA — o RÓSTER COMPLETO, e a razão é o lugar.
   *
   * O hangar guarda o que o Leviatã engoliu: as carcaças no convés são a Frota Morta por dentro,
   * e entre elas há células intactas. É a ÚNICA interlude com as 8 naves (ROSTER_FINAL — entra a
   * BATERIA): é a última escolha da campanha, e nada fica guardado para depois.
   */
  private escolha(): void {
    if (this.done) return;

    this.aviso('CARCAÇAS DA FROTA · UMA AINDA VOA', COLORS.playerBright);

    this.panel = new ShipPanel(
      this,
      ROSTER_FINAL,
      (t, c) => this.aviso(t, c),
      (id) => this.escolher(id),
      () => this.sair(),
    );
  }

  private sair(): void {
    if (this.done) return;
    this.done = true;
    this.scene.start('Menu');
  }

  /**
   * ⚠️ A ANIMAÇÃO SOBRESCREVE A TEXTURA — parar a anim ANTES do setTexture. A mesma armadilha
   * silenciosa das outras duas cutscenes (o jogador escolhia o Arauto e decolava no Interceptor;
   * ver Interlude2Scene.trocarNave).
   */
  private trocarNave(id: string): void {
    const nave = SHIPS[id];
    if (!this.textures.exists(nave.texture)) return;

    this.ship.anims?.stop();
    this.ship.setTexture(nave.texture);
  }

  private escolher(id: string): void {
    if (this.done) return;

    this.naveId = id;
    this.panel?.destroy();
    this.panel = null;

    this.trocarNave(id);

    // A nave nova está INTEIRA: a fumaça era da carcaça que ele largou no convés.
    this.fumaca.emitting = false;
    this.ship.setAngle(0);

    const nave = SHIPS[id];
    this.aviso(`${nave.name} · REARMADA`, COLORS.hotBright);
    this.cameras.main.flash(200, 62, 224, 240);

    this.time.delayedCall(1400, () => this.colapso());
  }

  /**
   * O COLAPSO — em cinco tempos, e agora com CAUSA.
   *
   * A 1ª volta foi reprovada aqui: o entulho caía porque o banner dizia que estava caindo, e um
   * portão aparecia do nada para as pedras baterem em cima. A corrente agora fecha sozinha:
   *
   *   0      a nave sobe do convés, RECUA e encara a garganta
   *   +600   dispara — torpedo próprio, atravessando 180px de tela até a boca
   *   +1000  impacto: ela entra em `garganta-morte`, clarão, shake, e a cadeia nasce NELA
   *   +1200  a cadeia corre de x≈330 para x≈8 — 10 estouros, direita → esquerda
   *   +2000  a nave voa para DENTRO da boca, encolhendo, e some no miolo
   *
   * ⚠️ O BANNER VIROU LEGENDA. Ele não abre mais o beat: chega no impacto, nomeando o que o
   * jogador acabou de ver. Era a causa; virou a descrição da causa.
   *
   * ⚠️ E A SAÍDA FICA LITERAL. A nave não escapa pela borda — ela vai MAIS PARA DENTRO, que é a
   * história desta cutscene, e a Fase 4 (o interior) começa exatamente onde ela sumiu. A versão
   * anterior a mandava para `GAME_WIDTH + 40`: ela saía de cena por uma borda, que é o oposto de
   * ser engolida.
   */
  private colapso(): void {
    if (this.done) return;

    Music.play(this, 'boss', 600);

    // A nave sobe e RECUA. O recuo não é enfeite: ela parou em x=258, encostada na criatura, e um
    // tiro de 72px disparado de cima do alvo não se lê como tiro.
    this.tweens.add({
      targets: this.ship,
      x: Interlude3Scene.GARGANTA.mira,
      y: Interlude3Scene.GARGANTA.miraY,
      angle: 0,
      duration: 520,
      ease: 'Sine.easeOut',
    });

    this.time.delayedCall(600, () => this.disparar());
    this.time.delayedCall(1000, () => this.impacto());

    // O clarão final e a entrega, depois de a última peça de entulho assentar (ver `selarBoca`).
    this.time.delayedCall(4800, () => {
      if (this.done) return;
      this.cameras.main.flash(700, 255, 150, 80);
    });
    this.time.delayedCall(5600, () => this.avancar());
  }

  /** O tiro. Sai da boca do canhão da nave e cruza a tela até o miolo da criatura. */
  private disparar(): void {
    if (this.done || !this.textures.exists('torpedoCut3')) return;

    const g = Interlude3Scene.GARGANTA;
    const t = this.add
      .image(this.ship.x + 16, this.ship.y, 'torpedoCut3')
      .setDepth(Interlude3Scene.DEPTH_NAVE + 1)
      .setName('torpedoCut3');

    this.fx.hit(t.x, t.y);
    this.cameras.main.shake(90, 0.002);

    this.tweens.add({
      targets: t,
      x: g.x,
      y: g.miraY,
      duration: 400,
      ease: 'Quad.easeIn',
      // DESTRUIR, nunca deixar parado: objeto esquecido fora da tela é armadilha documentada.
      onComplete: () => t.destroy(),
    });
  }

  /** O impacto — e é daqui que TUDO o mais desce. */
  private impacto(): void {
    if (this.done) return;

    const g = Interlude3Scene.GARGANTA;

    if (this.garganta && this.anims.exists('garganta-morte')) this.garganta.play('garganta-morte');

    this.fx.explodeBig(g.x, g.miraY, 1.1, Interlude3Scene.DEPTH_GARGANTA + 1);
    this.cameras.main.flash(220, 255, 150, 80);
    this.cameras.main.shake(320, 0.008);

    // A legenda, não a causa.
    this.aviso('A ENTRADA ESTÁ COLAPSANDO', COLORS.enemyBright);

    this.alarme = true;
    this.cadeia();
    this.selarBoca();
    this.time.delayedCall(1000, () => this.engolida());
  }

  /** A onda: 10 estouros descendo da boca da criatura até o convés, direita → esquerda. */
  private cadeia(): void {
    const { n, x0, x1, t0, passo } = Interlude3Scene.CADEIA;

    this.cadeiaX = [];
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const x = Math.round(Phaser.Math.Linear(x0, x1, k));
      const y = Math.round(Phaser.Math.Linear(24, Interlude3Scene.DECK_Y - 10, k));
      this.cadeiaX.push(x);

      this.time.delayedCall(t0 + i * passo, () => {
        if (this.done) return;
        this.fx.explode(x, y, 1.4);
      });
    }
  }

  /**
   * A NAVE ENGOLIDA. Ela voa para dentro da boca ENCOLHENDO e some no miolo.
   *
   * ⚠️ A escala aqui é MOVIMENTO, não tamanho de arte — ela termina em alpha 0. A lei "1px de
   * arte = 1px de jogo" vale para o que fica desenhado na tela, e no fim deste tween não fica
   * nada.
   */
  private engolida(): void {
    if (this.done) return;

    const g = Interlude3Scene.GARGANTA;
    this.fumaca.emitting = false;
    this.fagulhas.emitting = false;

    this.tweens.add({
      targets: this.ship,
      x: g.x,
      y: g.miraY,
      scale: 0.15,
      alpha: 0,
      angle: 0,
      duration: 1400,
      ease: 'Quad.easeIn',
    });
  }

  /**
   * O entulho que mura a boca. Pedaços caem de FORA da tela e empilham DE BAIXO PARA CIMA
   * (pilha que começa pelo topo é chuva, não desabamento), cada um com um impacto curto ao
   * assentar. Tint de silhueta escura — é parede nascendo, não pedra de cenário.
   * Posições FIXAS, não sorteadas: a sonda fotografa a cena, e o quadro tem que ser reproduzível.
   */
  private selarBoca(): void {
    // ⚠️ O PORTÃO SAIU DAQUI EM 2026-09-04, e não por gosto: o Henrique jogou a cena e o reprovou
    // inteiro — "totalmente sem nexo, sem contexto. Apenas surge um asset sem relação nenhuma com
    // a arte, direção do jogo, e as pedras caem sobre ele". Ele falhava por DUAS coisas somadas:
    // sem MOLDURA (colado sobre parede pintada) e sem CAUSA (caía porque um banner dizia). Quem
    // resolve as duas agora é a GARGANTA — ela é um corpo ocluindo a parede, e é a explosão dela
    // que derruba o teto.

    // [textura, x, yFinal, escala, ângulo] — 3 fiadas, da base ao topo da abertura.
    const pecas: Array<[string, number, number, number, number]> = [
      ['asteroid', 22, 142, 2.6, 12],
      ['asteroid2', 66, 146, 2.8, -20],
      ['asteroid3', 112, 141, 2.5, 32],
      ['asteroid2', 40, 104, 2.4, -8],
      ['asteroid', 90, 108, 2.7, 24],
      ['asteroid3', 132, 100, 2.2, -28],
      ['asteroid', 58, 66, 2.5, 16],
      ['asteroid2', 108, 62, 2.4, -14],
      ['asteroid3', 78, 30, 2.6, 8],
    ];

    pecas.forEach(([tex, x, yFinal, escala, angulo], i) => {
      if (!this.textures.exists(tex)) return;

      // ⚠️ A PILHA COMEÇA SÓ DEPOIS DE A CADEIA PASSAR (ela acaba em t≈1460 daqui). Entulho
      // caindo ANTES da onda seria a mesma mentira de antes com outra roupa: a pedra chegando
      // primeiro que a explosão que a arrancou.
      this.time.delayedCall(1700 + i * 190, () => {
        if (this.done) return;

        const peca = this.add
          .image(x, -40, tex)
          .setScale(escala)
          .setAngle(angulo)
          .setTint(0x39415c)
          // ACIMA da arte: o entulho mura a metade esquerda NA FRENTE das janelas espelhadas —
          // é a vista para fora que ele existe para apagar.
          .setDepth(Interlude3Scene.DEPTH_ENTULHO);

        this.tweens.add({
          targets: peca,
          y: yFinal,
          duration: 420,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (this.done) return;
            this.fx.hit(x, yFinal + 6);
            this.cameras.main.shake(70, 0.002);
          },
        });
      });
    });
  }

  private aviso(texto: string, cor: number): void {
    this.banner
      .setText(texto)
      .setColor(Phaser.Display.Color.IntegerToColor(cor).rgba)
      .setAlpha(1)
      .setScale(1);

    this.tweens.add({ targets: this.banner, alpha: 0, duration: 1600, delay: 700 });
  }

  /**
   * ⚠️ A FASE 4 AINDA NÃO EXISTE. A guarda de STAGES fecha a campanha na VITÓRIA em vez de
   * despejar o jogador na Fase 1 pela rede de segurança `STAGES[x] ?? STAGES[1]` — a mesma
   * armadilha documentada nas outras interludes. Quando `STAGES[4]` nascer, esta cena passa a
   * entregar o jogador a ela sem mudar uma linha.
   */
  private avancar(): void {
    if (this.done) return;
    this.done = true;

    if (!STAGES[this.proxima]) {
      this.scene.start('GameOver', {
        score: this.score,
        handling: this.handling,
        victory: true,
        // A fase COMPLETADA (a anterior à que não existe) — sem ela a tela de vitória usa o
        // título padrão e mente ("FASE 1 COMPLETA" depois de vencer a serpente).
        stage: this.proxima - 1,
      });
      return;
    }

    this.scene.start('Game', {
      stage: this.proxima,
      handling: this.handling,
      score: this.score,
      ship: this.naveId,
    });
  }
}
