import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCROLL_SPEED } from '../config';
import { pickVariant } from '../art';

/** Linha do solo. Tudo aqui é ANCORADO nela — nada flutua. */
export const GROUND_Y = GAME_HEIGHT - 10;

/**
 * Linha do TETO (Fase 4, o interior). O espelho de GROUND_Y: o interior do Leviatã é a
 * primeira fase FECHADA POR CIMA, e um obstáculo pode nascer pendurado nela.
 */
export const TETO_Y = 10;

export type PropKind =
  | 'spire'
  | 'building'
  | 'turret'
  | 'base'
  | 'silo'
  | 'radar'
  | 'wreck'
  // O CASCO do Leviatã (Fase 3, Ato 2). O Ato 2 sorteava `turret`/`radar`/`silo` — a colônia
  // da FASE 1 transplantada para as costas de uma baleia. Funcionava como bloco de jogo e
  // mentia como ficção: o casco vivo do Leviatã não tem reservatório de colônia em cima.
  // Estes dois são a defesa DELE, geradas com o Leviatã armored como referência de estilo.
  | 'lancaMisseis'
  | 'respiradouro'
  // O interior ORGÂNICO do Leviatã (Fase 4): costela biônica, pedaço de órgão, maquinário
  // pesado. Terreno indestrutível como a rocha — existe para ser desviado.
  | 'costela'
  | 'orgao'
  | 'maquinario';

interface PropDef {
  /** Vida. Infinity = indestrutível (rocha: existe para ser desviada). */
  hp: number;
  score: number;
  /** Atira no jogador? */
  shoots: boolean;
  /**
   * Animação em laço, se houver. Só toca na variante BASE — numa variante, a animação
   * substituiria a textura pelos quadros da base e a variedade sumiria.
   *
   * A colônia é MORTA, mas não apagada: janelas piscando e um radar girando são o que
   * fazem uma ruína parecer uma ruína, e não um cenário de papelão.
   */
  anim?: string;
  /**
   * PROP DE CASCO (Fase 3, Ato 2): ele é plantado NA SUPERFÍCIE do Leviatã, e não na linha de
   * solo. Ver `PLANTIO` e `plantarNoCasco`.
   */
  casco?: boolean;
}

/**
 * O PLANTIO DOS PROPS DE CASCO — a resposta ao "eles ainda estão com sensação de colados"
 * (Henrique, 2026-08-29, o 4º teste jogado; foi a quarta vez que os respiradouros voltaram, e a
 * primeira em que a palavra foi ÚTIL: não é falta de vida, é falta de ASSENTAMENTO).
 *
 * ⚠️ O DEFEITO, MEDIDO. Todo prop nascia com o pé em `GROUND_Y` (206), a aresta MAIS PRÓXIMA da
 * faixa do casco. A faixa vai de y=150 (a crista) a y=216, e um respiradouro tem 62px:
 *
 *     faixa do casco   y 150 ──────────────────── 216
 *     respiradouro     y 144 ─────────── 206
 *
 * São 56px dos 62 achatados contra a face do casco — 90% de sobreposição, com 6px espiando
 * acima da crista. Nenhum prop QUEBRAVA a linha do horizonte, e todos ficavam no mesmo `y`, em
 * fila. Isso não é um relevo: é uma tira de adesivos. As quatro hipóteses das rodadas
 * anteriores (falta sopro / falta luz / falta reagir / falta variar de tamanho) erravam o alvo
 * porque nenhuma delas era sobre onde a peça ENCOSTA.
 *
 * ⚠️ E POR QUE NÃO BAIXAR A CRISTA. Era a outra saída (`ALTURA` 66 → 51 em `instalar-casco.mjs`,
 * crista de volta a y=165), e ela devolveria 6% de área de jogo — mas em 53 linhas as COSTELAS
 * saem decapitadas, que é exatamente por que a crista subiu em 28/08. O plantio resolve sem
 * pagar a arte.
 *
 * ⚠️ O TETO É 199 PORQUE O PROP MAIS BAIXO MANDA, E ISSO CUSTOU UMA REPROVAÇÃO DA SONDA. A
 * primeira versão usou 204, calculado sobre o respiradouro (62px). Mas o `lancaMisseis` tem
 * 59px, e plantado em 204 ele coroa 5px — PIOR que os 6 do defeito original. O alcance de um
 * plantio se mede pela peça mais BAIXA que vai usá-lo, nunca pela mais alta:
 *
 *     lancaMisseis (59px) em 199  →  topo 140, coroa 10px   ← o pior caso, e ele passa
 *     respiradouro (62px) em 186  →  topo 124, coroa 26px   ← o melhor
 *
 * ⚠️ E O PISO DE 186 NÃO SOBE MAIS QUE ISSO. Ele deixa 30px de casco visível ABAIXO do prop, e
 * é isso que faz a peça ler como "apoiada numa superfície". Plantar perto da crista (150) a
 * penduraria na linha do horizonte, que é outro defeito.
 *
 * ⚠️ SEM VARIAR A ESCALA, e isso é deliberado. Perspectiva pediria que o plantado mais fundo
 * fosse menor, mas escala não-inteira em pixel art de 62px borra a peça — e a faixa é rasa
 * demais (13px de alcance) para o ganho pagar o preço.
 */
const PLANTIO = { fundo: 186, frente: 199, saltoMin: 5 } as const;

/**
 * A colônia da Fase 1. Rocha, construções, silos, antenas, destroços — e as torres que atiram.
 * Sortear entre eles é o que faz a superfície parecer um LUGAR, e não um corredor de obstáculos.
 */
const PROPS: Record<PropKind, PropDef> = {
  spire: { hp: Infinity, score: 0, shoots: false },
  building: { hp: 8, score: 60, shoots: false, anim: 'building-lights' },
  turret: { hp: 5, score: 150, shoots: true, anim: 'turret-idle' },
  base: { hp: 16, score: 250, shoots: false, anim: 'base-lights' },
  silo: { hp: 6, score: 90, shoots: false },
  radar: { hp: 4, score: 120, shoots: false, anim: 'radar-scan' },
  wreck: { hp: Infinity, score: 0, shoots: false },
  // ⚠️ OS NÚMEROS SÃO OS DA TORRE E DO SILO, DE PROPÓSITO. Esta é uma troca de ARTE, não de
  // balanceamento: o `lancaMisseis` herda `hp 5 / score 150 / shoots` da `turret` e o
  // `respiradouro` herda `hp 6 / score 90` do `silo`. O Ato 2 continua pesando exatamente o
  // mesmo, e o playtest que ainda não aconteceu vai medir a fase que já existia.
  lancaMisseis: { hp: 5, score: 150, shoots: true, casco: true },
  respiradouro: { hp: 6, score: 90, shoots: false, casco: true },
  costela: { hp: Infinity, score: 0, shoots: false },
  orgao: { hp: Infinity, score: 0, shoots: false },
  maquinario: { hp: Infinity, score: 0, shoots: false },
};

/**
 * AS BOCAS de cada prop que atira — offsets MEDIDOS na arte, nunca chutados. `x` conta a partir
 * do CENTRO do sprite e `y` a partir do TOPO do quadro. O `setFlipX` do `spawn` espelha o prop
 * (ele atira para a esquerda), e o `fireAt` troca o sinal do `x` por causa disso.
 *
 * A `turret` da Fase 1 tem UMA: a ponta do cano ocupa x 23..26 num sprite 32×30 de centro 16 —
 * +9 — e encosta no topo do quadro (y 0..2). São os mesmos números de sempre, agora numa tabela
 * em vez de dois literais soltos no meio do `fireAt`.
 *
 * O `lancaMisseis` da Fase 3 tem QUATRO, medidas por saturação no PNG (as bocas são os únicos
 * pontos âmbar fortes da arte): duas em cima (y≈5) e duas embaixo (y≈15). Ele REVEZA entre elas
 * a cada disparo, então o jogador vê os quatro tubos trabalharem.
 *
 * ⚠️ OS NÚMEROS SÃO DA `lanca-misseis.png`, e a camada sorteia entre DUAS variantes. Medidas as
 * duas: a `lanca-misseis2` bate em três das quatro dentro de 1px (7,6 / 17,5 / 22,3), e na
 * quarta o tubo dela fica alguns px fora da conta. Aceito — é um prop de fundo de 59px e o tiro
 * continua saindo da metade certa da peça. Uma tabela por VARIANTE resolveria, e não paga:
 * `BOCAS` é indexada por `PropKind`, e a textura só se sabe depois do `pickVariant`.
 *
 * ⚠️ REVEZAR NÃO É SALVA. Continua UM míssil por disparo, na mesma cadência (`TURRET_RATE`) e
 * com o mesmo dano — a troca de arte não podia mexer no peso da fase. Uma salva de quatro é
 * possível e foi cogitada, mas quadruplicaria o volume de tiro do Ato 2, e esse número está
 * fechado até o playtest.
 */
const BOCAS: Partial<Record<PropKind, ReadonlyArray<readonly [number, number]>>> = {
  turret: [[9, 2]],
  lancaMisseis: [
    [7, 5],
    [18, 5],
    [12, 15],
    [23, 15],
  ],
};

/**
 * Obstáculos da superfície.
 *
 * Asteroides flutuando sobre um planeta não fazem sentido (constatado no playtest).
 * O que a superfície pede é relevo: picos de rocha, construções da colônia e torres
 * fixas. São os canos do flappy virando terreno — o DNA do v2, agora coerente.
 *
 * - `spire`    rocha. INDESTRUTÍVEL: existe para ser desviada, não abatida.
 * - `building` estrutura da colônia. Destrutível, dá pontos.
 * - `turret`   canhão de solo. Mira em você. Destrutível — e é prioridade de alvo.
 */
export class TerrainSystem {
  readonly props: Phaser.Physics.Arcade.Group;

  /**
   * A fumaça de exaustão dos mísseis das torres. UM emissor para o sistema inteiro, criado no
   * construtor e reaproveitado por todos os mísseis — nunca um por tiro (armadilha nº 5).
   * Serve também de sopro de lançamento (explode na boca do cano).
   */
  private readonly smokeFx: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemyBullets: Phaser.Physics.Arcade.Group,
  ) {
    this.props = scene.physics.add.group({ allowGravity: false, immovable: true });

    // Fumaça que NASCE pequena e clara e MORRE grande e sumida — é o que o olho conhece de
    // exaustão. Uma pitada de brasa (hot) no meio dos cinzas vende o motor queimando.
    // 'puff' (sopro redondo), NUNCA 'spark': o quadrado 2×2 escalado com blend normal aparecia
    // como CAIXAS soltas na boca do cano a cada disparo (bug visual apontado pelo Henrique).
    this.smokeFx = scene.add.particles(0, 0, 'puff', {
      lifespan: { min: 240, max: 420 },
      speed: { min: 3, max: 14 },
      scale: { start: 0.5, end: 1.3 },
      alpha: { start: 0.5, end: 0 },
      tint: [0xcfd6dd, 0x8b939c, 0xff8c1a],
      emitting: false,
    });
  }

  /**
   * `anchor: 'teto'` pendura o prop na linha do teto, de cabeça para baixo (Fase 4 — o
   * interior é fechado por cima). ⚠️ Só props que NÃO atiram: a boca do cano da torre é
   * calculada para ela estar de pé (`updateTurret`/`fireAt` medem para CIMA).
   *
   * `alturaPx` crava a altura visível do prop (em px de tela) — é o que permite ao roteiro
   * montar um CORREDOR com vão garantido: duas alturas sorteadas de forma independente podem
   * somar uma parede impassável.
   *
   * `tint` veste o prop para o LUGAR (F4: a rocha branco-gelo da lua dentro do Leviatã escuro
   * gritava fora da paleta). ⚠️ Vale só para prop INDESTRUTÍVEL: o flash de dano dá clearTint
   * e devolveria a cor crua.
   *
   * `angle` inclina o prop em torno da ÂNCORA (base no chão, topo no teto) — é o que faz as
   * costelas da F4 fecharem em funil na direção do scroll. O corpo físico NÃO gira junto
   * (Arcade é axis-aligned): manter pequeno (≤ ~14°), senão a hitbox mente feio.
   */
  spawn(
    kind: PropKind,
    opts?: { anchor?: 'chao' | 'teto'; alturaPx?: number; tint?: number; angle?: number },
  ): void {
    const teto = opts?.anchor === 'teto';

    // ⚠️ O PÉ DO PROP DE CASCO É SORTEADO DENTRO DA FAIXA, e é isso que tira a "sensação de
    // colado". Ver `PLANTIO`. Prop de teto e prop de chão da F1/F4 continuam onde sempre
    // estiveram — este sorteio existe porque a Fase 3 tem uma SUPERFÍCIE de 66px de fundo, e
    // nenhuma outra fase tem.
    //
    // ⚠️ `Math.random`, NUNCA `Phaser.Math`. O `Phaser.Math.RND` é o mesmo fluxo que o
    // espaçamento das ondas consome, e arte de fundo não pode adiantar o dado do jogo.
    const naCasca = !teto && PROPS[kind].casco;
    const pe = naCasca ? this.sortearPlantio() : GROUND_Y;

    // Sorteia entre as variantes: um relevo com um pico só é um padrão, não uma paisagem.
    const texture = pickVariant(this.scene, kind);
    const p = this.props.create(
      GAME_WIDTH + 30,
      teto ? TETO_Y : pe,
      texture,
    ) as Phaser.Physics.Arcade.Sprite;

    // Origem na BASE: o prop cresce a partir do chão — ou, no teto, a partir dele para baixo
    // (origem no topo + flipY: uma estalactite é um pico de cabeça para baixo).
    p.setOrigin(0.5, teto ? 0 : 1);
    p.setFlipY(teto);
    // A arte da torre nasce com o cano para cima-DIREITA (convenção do projeto: todo sprite
    // aponta para a direita, o espelhamento é feito em jogo — ver BootScene). Mas ela só atira
    // quando o jogador já passou, ou seja, para a ESQUERDA. Sem espelhar, o cano aponta para o
    // lado oposto ao do tiro.
    if (PROPS[kind].shoots) p.setFlipX(true);
    p.setData('kind', kind);
    // Depth −0.5: os props ficam ATRÁS da nave/inimigos (depth 0) e da FAIXA DE SOLO DA FRENTE
    // do parallax da F1 (−0.2), que esconde o pé "colado" deles. Só ordem de render — nenhum
    // overlap/colisão depende disto.
    //
    // ⚠️ E OS DE CASCO SE ORDENAM ENTRE SI PELO PLANTIO. Assim que o pé passou a variar, dois
    // props podem se sobrepor na horizontal — e sem isto qual fica na frente seria decidido pela
    // ordem de criação, ou seja, por acaso. Quem está plantado mais à FRENTE (pé maior) desenha
    // por cima: `−0.5` na aresta de frente, `−0.536` no fundo. Toda a faixa continua entre a
    // tira do casco (−0.2, à frente) e a faixa de fundo (−74/−75, atrás), então nada mais no
    // quadro muda de ordem.
    p.setDepth(naCasca ? -0.5 - (PLANTIO.frente - pe) * 0.002 : -0.5);

    const def = PROPS[kind];

    // Anima só a variante base (ver PropDef).
    if (def.anim && texture === kind && this.scene.anims.exists(def.anim)) {
      p.play(def.anim);
      // Fase aleatória: sem isto, TODAS as janelas da colônia piscam em uníssono — o que
      // não é uma colônia, é um letreiro.
      p.anims.setProgress(Math.random());
    }
    p.setData('hp', def.hp);
    p.setData('score', def.score);

    // Só a rocha varia de altura: é ela que define o corredor, e é a altura variável que dá
    // ritmo ao flap. Construção esticada parece construção derretida.
    if (kind === 'spire') p.setScale(1, Phaser.Math.FloatBetween(0.55, 1.25));

    // Altura CRAVADA pelo roteiro (corredores da F4): sobrepõe o sorteio acima.
    // A rocha estica só na vertical (é o que varia o relevo dela); os props ORGÂNICOS escalam
    // UNIFORME — uma costela de 256×237 esticada só em Y viraria uma parede de 256px de
    // largura deformada.
    if (opts?.alturaPx !== undefined) {
      if (kind === 'spire') p.setScale(1, opts.alturaPx / p.height);
      else p.setScale(opts.alturaPx / p.height);
    }
    if (opts?.tint !== undefined) p.setTint(opts.tint);
    if (opts?.angle !== undefined) p.setAngle(opts.angle);

    if (def.shoots) {
      // ⚠️ DOIS RELÓGIOS, UM POR FASE, E ISSO NÃO É INCONSISTÊNCIA — É UMA FRONTEIRA.
      //
      // O prop do CASCO usa a faixa curta: o relógio dele só corre dentro da janela de tiro (ver
      // `updateTurret`), então este sorteio existe só para os canhões não dispararem em uníssono,
      // e a faixa curta garante o primeiro tiro mesmo com a janela em 0,88s.
      //
      // A `turret` da FASE 1 fica no `1.6 a 2.8` de sempre. O mesmo defeito existe lá — canhão
      // que nunca atira se o jogador voa à frente — mas a Fase 1 está mergeada e aprovada
      // jogando, e mudar o peso dela de carona num conserto da Fase 3 é exatamente o tipo de
      // efeito colateral que ninguém descobre até jogar. Fica para a fatia da Fase 1.
      p.setData(
        'cooldown',
        def.casco
          ? Phaser.Math.FloatBetween(...TerrainSystem.PRIMEIRO_TIRO)
          : Phaser.Math.FloatBetween(1.6, 2.8),
      );
      p.setData('charging', 0);
    }

    const body = p.body as Phaser.Physics.Arcade.Body;

    // O corpo físico precisa acompanhar a escala, senão a hitbox mente.
    body.setSize(p.width * 0.6, p.height);
    body.setOffset(p.width * 0.2, 0);

    // `reset()`, e NÃO `updateFromGameObject()`.
    //
    // O grupo cria o sprite ancorado pelo CENTRO; só depois trocamos a origem para a base.
    // `updateFromGameObject()` reposiciona o corpo mas NÃO atualiza a posição anterior que ele
    // guarda — e no frame seguinte o Arcade lê essa diferença como MOVIMENTO e puxa o sprite
    // para cima. Era isso que fazia picos, torres e prédios FLUTUAREM.
    // `reset()` sincroniza posição e posição-anterior de uma vez.
    body.reset(p.x, p.y);

    // Depois do reset, porque ele zera a velocidade.
    p.setVelocityX(-SCROLL_SPEED);

    if (naCasca) this.plantarNoCasco(p);
  }

  /** O último pé sorteado, para o plantio seguinte não repetir a altura. Ver `sortearPlantio`. */
  private ultimoPlantio = 0;

  /**
   * SORTEIA O PÉ DO PROP DE CASCO, RECUSANDO ALTURA REPETIDA.
   *
   * ⚠️ UNIFORME PURO NÃO BASTA, E A SONDA MOSTROU ISSO NA PRIMEIRA EXECUÇÃO: oito props saíram
   * entre 191 e 199 (um sorteio de 0,4% de chance, conferido — o alcance está certo), e nessa
   * rodada a fila voltaria. O olho não compara um prop com a média da faixa; compara com o
   * VIZINHO. Dois seguidos a 1px de diferença leem como a mesma linha, que é o defeito inteiro.
   *
   * ⚠️ É A MESMA IDEIA DA `RESPIRADOURO_CARENCIA` do `GameScene`, e pelo mesmo motivo: sorteio
   * uniforme pode dar dois iguais em seguida, e quem garante o espaçamento é a recusa, nunca a
   * distribuição. Aqui a recusa é em pixels de altura em vez de segundos.
   *
   * ⚠️ E ELA SORTEIA DENTRO DO QUE SOBRA, EM VEZ DE TENTAR DE NOVO ATÉ DAR CERTO. A primeira
   * versão era um laço de até 8 tentativas com teto — e um laço de recusa com teto às vezes
   * ESTOURA, o que devolveria um plantio repetido em ~3% das vezes e faria a sonda piscar. Um
   * assert que reprova de vez em quando é pior que não ter assert. Aqui as alturas permitidas
   * são duas faixas fechadas (abaixo e acima da última), e o sorteio é uniforme sobre a soma
   * delas: o salto mínimo passa a ser uma garantia de construção, não uma probabilidade.
   *
   * As duas faixas nunca ficam ambas vazias: o alcance é 13px e `2 × saltoMin` é 10, então
   * sobram no mínimo 4 alturas mesmo com a última bem no meio.
   *
   * O `saltoMin` de 5px é o que se enxerga numa tela de 384 de largura sem estreitar demais o
   * que resta para sortear.
   *
   * ⚠️ `Math.random`, NUNCA `Phaser.Math`. O `Phaser.Math.RND` é o mesmo fluxo que o espaçamento
   * das ondas consome, e arte de fundo não pode adiantar o dado do jogo.
   */
  private sortearPlantio(): number {
    const { fundo, frente, saltoMin } = PLANTIO;

    // O primeiro prop da fase não tem vizinho anterior: sorteia livre no alcance inteiro.
    if (this.ultimoPlantio === 0) {
      this.ultimoPlantio = Math.round(fundo + Math.random() * (frente - fundo));
      return this.ultimoPlantio;
    }

    const abaixo = Math.max(0, this.ultimoPlantio - saltoMin - fundo + 1);
    const acima = Math.max(0, frente - (this.ultimoPlantio + saltoMin) + 1);
    const n = Math.floor(Math.random() * (abaixo + acima));
    this.ultimoPlantio =
      n < abaixo ? fundo + n : this.ultimoPlantio + saltoMin + (n - abaixo);
    return this.ultimoPlantio;
  }

  /**
   * A SOMBRA DE CONTATO do prop de casco — a outra metade da resposta ao "colado".
   *
   * ⚠️ ELA SÓ EXISTE PORQUE O PLANTIO TIROU O PÉ DE BAIXO DA TIRA. A `cascoFrente` do
   * `Parallax` (y=198..215, depth −0,2) foi posta ali justamente para esconder a base reta dos
   * props — e enquanto todo prop nascia em `GROUND_Y` (206) ela dava conta. Com o pé podendo
   * subir até 186, a base fica À MOSTRA na maioria dos sorteios, e uma aresta reta pousada no
   * nada é a definição de adesivo. A sombra é o que substitui a tira nesse trecho: ela não
   * esconde a base, ela ANCORA a base.
   *
   * ⚠️ UMA ELIPSE, NÃO UM SPRITE, e nunca um `glow`. É escurecimento puro sobre um casco que já
   * é escuro — a mesma regra do `groundFront` e do tint da tira: o que está mais perto do olho
   * entra em sombra, jamais em luz. Um halo aceso aqui viraria um anel brilhante em volta do
   * pé, que é o defeito que esta fatia já pagou no rabo.
   *
   * ⚠️ `depth` LOGO ATRÁS DO PRÓPRIO PROP (−0,001), e não um número fixo. Fixo, a sombra de um
   * prop plantado no fundo passaria na FRENTE de um prop plantado à frente. Amarrada ao dono,
   * ela viaja na profundidade junto com ele.
   *
   * ⚠️ O `once('destroy')` COBRE OS DOIS CAMINHOS DE MORTE. O prop morre pelo culling
   * (`x < −40`) e morre pelo tiro do jogador, em arquivos diferentes. Pendurar a limpeza no
   * evento do dono, e não no culling, é o que impede uma sombra órfã de ficar deslizando sozinha
   * pela fase — é a mesma lição dos dois caminhos de morte da água-viva, num caso novo.
   */
  private plantarNoCasco(p: Phaser.Physics.Arcade.Sprite): void {
    // ⚠️ ELA TEM QUE TRANSBORDAR A BASE — 1,35 da largura, e centrada 1px ABAIXO do pé. A
    // primeira versão foi 0,9 da largura centrada em `y − 1`, e ficou INVISÍVEL: mais estreita
    // que o prop e acima da linha do pé, a elipse inteira desenhava atrás do dono e não sobrava
    // um pixel dela na tela. Uma sombra que não escapa da silhueta não é sombra, é enchimento.
    // Quem entrega o contato é justamente o que vaza para os lados.
    //
    // 7px de altura é o que some na perspectiva rasa da faixa; mais que isso e ela lê como
    // buraco em vez de apoio.
    const sombra = this.scene.add
      .ellipse(p.x, p.y + 1, Math.round(p.displayWidth * 1.35), 7, 0x000000, 0.5)
      .setDepth(p.depth - 0.001)
      // O nome é o que torna o vazamento MEDÍVEL: a sonda conta sombras contra props vivos, e
      // uma sombra órfã deslizando sozinha pela fase reprova em vez de passar despercebida.
      .setName('sombraCasco');

    p.setData('sombra', sombra);
    p.once('destroy', () => sombra.destroy());
  }

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    for (const obj of this.props.getChildren()) {
      const p = obj as Phaser.Physics.Arcade.Sprite;
      if (!p.active) continue;

      // `!p.flipY`: prop de TETO não atira — a boca do cano é medida para a torre DE PÉ
      // (fireAt mira para cima). Guarda dura: um roteiro que pendurar uma torre por engano
      // ganha uma torre muda, não um tiro nascendo do lugar errado.
      if (PROPS[p.getData('kind') as PropKind].shoots && !p.flipY) this.updateTurret(p, dt, target);

      // A sombra não tem corpo físico: quem a move é o dono. Sincronizar aqui (e não dar
      // velocidade a ela) é o que garante que as duas nunca derivem uma da outra — a mesma
      // razão de o rabo não misturar eixo escrito à mão com eixo de física.
      const sombra = p.getData('sombra') as Phaser.GameObjects.Ellipse | undefined;
      if (sombra) sombra.x = p.x;

      if (p.x < -40) p.destroy();
    }

    this.tickMissileTrails();
  }

  /**
   * A fumaça sai da CAUDA de cada míssil vivo, uma partícula por frame — recuada 8px pelo
   * ângulo do sprite, senão o rastro nasce em cima do nariz e o míssil voa "dentro" dele.
   * Um emissor só para todos (ver construtor); a marca `missile` é apagada pelo
   * EnemySystem.release() quando o slot volta ao pool.
   */
  private tickMissileTrails(): void {
    for (const obj of this.enemyBullets.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (!b.active || b.getData('missile') !== true) continue;

      this.smokeFx.emitParticleAt(
        b.x - Math.cos(b.rotation) * 8,
        b.y - Math.sin(b.rotation) * 8,
      );
    }
  }

  /**
   * A torre PISCA antes de atirar.
   *
   * Tiro mirado sem aviso é injusto por definição: o jogador não pode reagir ao que
   * não vê chegar. O telégrafo é o que separa "difícil" de "sacanagem".
   */
  private updateTurret(
    p: Phaser.Physics.Arcade.Sprite,
    dt: number,
    target: Phaser.Physics.Arcade.Sprite,
  ): void {
    const charging = p.getData('charging') as number;

    if (charging > 0) {
      const left = charging - dt;
      p.setData('charging', left);
      // Pisca durante a carga.
      // setTint, NÃO setTintFill: `tintFill` pinta o sprite inteiro de branco sólido e a torre
      // vira um QUADRADO BRANCO. `setTint` multiplica a cor — a torre esquenta sem sumir.
      p.setTint(Math.floor(left * 30) % 2 === 0 ? 0xffd0d0 : 0xff6060);

      if (left <= 0) {
        p.clearTint();
        this.fireAt(p, target);
      }
      return;
    }

    // Só mira quando está na tela E o jogador ainda está à sua frente: uma torre que
    // já passou não deve atirar pelas costas.
    const naJanela = p.x < GAME_WIDTH - 10 && p.x > target.x;

    // ⚠️ O RELÓGIO SÓ ANDA DENTRO DA JANELA, E ISSO É O CONSERTO DE UM DEFEITO RELATADO JOGANDO
    // (Henrique, 2026-08-29: *"alguns canhões não estão atirando"*).
    //
    // A causa, medida com `scripts/_f3/diag-canhao.mjs`: a janela de tiro é
    // `(374 − x_do_jogador) / SCROLL_SPEED`, ou seja, ela ENCOLHE conforme o jogador avança. O
    // cooldown inicial era sorteado em 1,6–2,8s e corria desde o nascimento, então o canhão
    // gastava a janela inteira esperando ficar pronto:
    //
    //     jogador em x=70   janela 3,62s   4 de 4 atiravam
    //     jogador em x=160  janela 2,55s   7 de 7
    //     jogador em x=240  janela 1,60s   2 de 4     ← e os dois que falharam eram
    //     jogador em x=300  janela 0,88s   0 de 7        os de `cdInicial` mais alto
    //
    // Quanto mais para a frente se jogava, menos o Ato 2 revidava — o oposto do que a fase quer.
    // Com o relógio parado fora da janela, o sorteio deixa de disputar com a posição: o canhão
    // chega pronto e o primeiro tiro sai `PRIMEIRO_TIRO` depois de ele PODER atirar. Do segundo
    // em diante continua a cadência de sempre.
    //
    // ⚠️ O PREÇO ESTÁ ESCOLHIDO, NÃO ESCONDIDO: quem fica atrás passa a levar ~2 tiros por canhão
    // em vez de 1, porque agora sobra janela para a segunda recarga. A ameaça deixa de depender
    // de onde o jogador voa, que era o defeito.
    //
    // ⚠️⚠️ E O CONSERTO VALE SÓ PARA OS PROPS DO CASCO (FASE 3), POR DECISÃO DO HENRIQUE.
    // Este arquivo é COMPARTILHADO: a `turret` da Fase 1 passa por aqui também, e a primeira
    // versão do conserto mudou o peso dela sem ninguém pedir — numa fase já mergeada, revisada e
    // aprovada jogando. O defeito É o mesmo lá, e continua lá: está anotado para a fatia da
    // Fase 1, onde ele pode ser consertado e TESTADO junto.
    //
    // A regra geral desta campanha, custe o que custar: conserto em código compartilhado não
    // atravessa a fronteira de uma fase fechada sem alguém rejogar aquela fase.
    const doCasco = PROPS[p.getData('kind') as PropKind].casco === true;
    if (doCasco && !naJanela) return;

    const cd = (p.getData('cooldown') as number) - dt;
    if (cd <= 0 && naJanela) {
      p.setData('cooldown', TerrainSystem.TURRET_RATE);
      p.setData('charging', TerrainSystem.TELEGRAPH);
    } else {
      p.setData('cooldown', cd);
    }
  }

  private static readonly TURRET_RATE = 2.4;
  private static readonly TELEGRAPH = 0.4;

  /**
   * A espera do PRIMEIRO tiro, contada de dentro da janela (ver `updateTurret`). Curta porque a
   * janela pode ser de 0,88s; sorteada porque canhões que disparam em uníssono viram uma salva.
   */
  private static readonly PRIMEIRO_TIRO: readonly [number, number] = [0.35, 0.75];

  private fireAt(p: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite): void {
    // A BOCA DE ONDE O TIRO SAI, por prop. Ver `BOCAS`: são offsets MEDIDOS na arte, e o
    // lança-mísseis reveza entre as quatro dele a cada disparo.
    const kind = p.getData('kind') as PropKind;
    const bocas = BOCAS[kind] ?? BOCAS.turret!;
    const i = ((p.getData('boca') as number | undefined) ?? 0) % bocas.length;
    p.setData('boca', i + 1);
    const [bx, by] = bocas[i];

    // O `setFlipX` do spawn espelha o prop (ele atira para a ESQUERDA, ver `spawn`), então o
    // offset medido na arte não-espelhada entra aqui com o sinal trocado. A origem do prop é a
    // BASE, então o topo do quadro é `p.y − displayHeight`. Multiplicar pela escala mantém a
    // conta certa se algum dia um roteiro cravar `alturaPx` num prop que atira.
    const muzzleX = p.x - bx * p.scaleX;
    const muzzleY = p.y - p.displayHeight + by * p.scaleY;

    const b = this.enemyBullets.get(muzzleX, muzzleY) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;

    b.setActive(true).setVisible(true);
    b.body!.enable = true;

    // MÍSSIL — mas só na LEITURA. Os números de balanceamento são os MESMOS do traçante que
    // ele substitui (fechados pelo Henrique): mesma velocidade (100), mesma mira reta no
    // jogador (NÃO teleguiado), mesma cadência (TURRET_RATE) e o mesmo dano por contato (o
    // pool e o overlap são os mesmos). O que mudou: sprite alongado girado na direção do voo
    // ('missile' — placeholder do BootScene; a arte do PixelLab entra com esta chave) e a
    // fumaça de exaustão emitida no update().
    // Escala 0.8: o Henrique achou o foguete GRANDE demais saindo de uma torre pequena — a arte
    // nova (30×11) a 0.8 vira ~24×9 na tela, proporcional à boca que o lança.
    //
    // ⚠️ E O FOGUETE É SÓ DO LANÇA-MÍSSEIS, DESDE 2026-08-30. Este método é compartilhado por
    // todo prop que atira, e vestia `missile` em TODOS — então a torre de colônia da Fase 1
    // cuspia o mesmo foguete do canhão do casco do Leviatã. O Henrique topou com isso jogando a
    // Fase 1: *"os misseis das torres da fase 1 viraram o mesmo missel do canhão do casco"*.
    // É a terceira vez nesta fatia que duas coisas diferentes dividiam um projétil só.
    //
    // ⚠️ A `missile: true` VAI JUNTO COM A ARTE, e é por isso que ela mora aqui e não numa linha
    // solta: ela liga a FUMAÇA DE EXAUSTÃO do `tickMissileTrails`. Um traçante de canhão que
    // deixasse rastro de foguete seria o mesmo erro com outra cara.
    //
    // ⚠️ A CAIXA NÃO DEPENDE DA ARTE. O `setSize` logo abaixo crava 10×7 em px de MUNDO para os
    // dois, então a Fase 1 troca de textura sem que um número de balanceamento se mexa — que era
    // a condição para encostar numa fase já mergeada.
    const foguete = kind === 'lancaMisseis';
    b.setTexture(foguete ? 'missile' : 'shotTorre').setScale(0.8).clearTint();
    b.setBlendMode(Phaser.BlendModes.NORMAL);
    b.setData('missile', foguete);

    // ⚠️ QUEM ATIROU, para o próprio cano não comer o tiro. Ver `GameScene.enemyBulletHitCover`.
    //
    // O projétil nasce DENTRO da hitbox do canhão que o dispara: a boca fica a 7–23px do centro
    // da peça e o corpo dela tem 35px de largura. A carência de 16px que existia para isso não
    // basta quando o tiro sai em diagonal — ele anda os 16px e ainda está dentro do próprio dono.
    // Medido (`scripts/_f3/diag-missil.mjs`): 2 de cada 4 mísseis morriam com 16–17px andados,
    // absorvidos pelo MESMO prop que os disparou. É o *"o canhão está soltando o míssil e
    // explodindo antes de tudo"* do teste jogado de 2026-08-30.
    //
    // A carência continua valendo para o resto do cenário; o que se corrige aqui é só o caso em
    // que atirador e cobertura são a mesma peça, que nunca deveria absorver nada.
    b.setData('atirador', p);

    // A HITBOX também é a de antes, em px de MUNDO: 10×7. O setSize é em px LOCAIS e o corpo
    // escala junto com o sprite — com a escala visual 0.8, compensa-se dividindo por ela.
    // O release() do pool desfaz isto ao reciclar o slot.
    b.body!.setSize(10 / 0.8, 7 / 0.8);

    b.setData('ox', muzzleX);
    b.setData('oy', muzzleY);

    const angle = Phaser.Math.Angle.Between(muzzleX, muzzleY, target.x, target.y);
    b.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);
    b.setRotation(angle);

    // Sopro de lançamento na boca do cano — o arco estético ficou de fora de propósito:
    // curvar a trajetória mudaria o tempo-até-o-jogador, e esse número está fechado.
    this.smokeFx.explode(6, muzzleX, muzzleY);

    this.scene.cameras.main.shake(30, 0.001);
  }
}
