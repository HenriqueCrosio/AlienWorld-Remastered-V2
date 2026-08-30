import Phaser from 'phaser';
import { Fx } from './Fx';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { pickVariant } from '../art';

export type EnemyKind =
  | 'drone'
  | 'batedor'
  | 'canhoneira'
  | 'kamikaze'
  | 'cargueiro'
  | 'aranha'
  | 'aguaViva';

interface EnemyDef {
  texture: string;
  /** Animação de voo, se houver. */
  anim?: string;
  hp: number;
  speed: number;
  /** Amplitude da senóide, em px. 0 = voa reto. */
  wave: number;
  /** Segundos entre tiros. 0 = não atira. */
  fireRate: number;
  score: number;
  scale: number;
  tint: number;
  /**
   * Aceleração (px/s²) na direção do jogador. 0 = não persegue.
   * É o que faz o kamikaze CAÇAR em vez de atravessar a tela.
   */
  homing: number;
  /** Cospe este inimigo a cada `spawnRate` segundos. O cargueiro é uma fábrica com casco. */
  spawns?: EnemyKind;
  spawnRate: number;
  /**
   * TRAVESSIA VERTICAL: em vez de atravessar da direita para a esquerda, o bicho entra por uma
   * borda horizontal e sai pela oposta — está DE PASSAGEM, cruzando a rota do jogador.
   *
   * Quando ligada, `speed` passa a ser a velocidade VERTICAL e `wave` a gingada HORIZONTAL (o
   * contrário do padrão). Ver `spawn` e o culling em `update`.
   */
  travessia?: 'vertical';
}

/**
 * CADA INIMIGO TEM A SUA SILHUETA.
 *
 * Antes eram dois sprites para cinco inimigos: o batedor era o drone com outra cor, o kamikaze
 * também, e o cargueiro era a canhoneira ampliada em 1.9×. Em teoria isso era economia elegante
 * (o tint já dizia que o comportamento era outro). **Na prática, não dizia.**
 *
 * Num shmup o jogador não LÊ a tela, ele reconhece formas na periferia enquanto olha para o que
 * está atirando nele. Cor é o segundo canal, não o primeiro — e um kamikaze que MERGULHA em cima
 * de você e um drone que atravessa a tela em linha reta pedem reações opostas. Se os dois têm o
 * mesmo contorno, a decisão só existe depois de o jogador ter comparado as cores, e nesse tempo
 * o kamikaze já bateu.
 *
 * Agora a FORMA é o primeiro canal, e ela anuncia o verbo:
 *
 *   drone       casco de inseto, reto      → atravessa. Ignore, ou limpe.
 *   batedor     asas em flecha, magro      → rápido, em senóide.
 *   kamikaze    ESPETO na proa             → vem em cima de você. Atire NELE.
 *   canhoneira  casco pesado, canhão       → para e mira. Saia da linha.
 *   cargueiro   barriga com HANGAR aberto  → não atira: PARE. Prioridade de alvo.
 *
 * A cor continua reforçando (o kamikaze é quente, o cargueiro é escuro) — só não trabalha mais
 * sozinha.
 */
const DEFS: Record<EnemyKind, EnemyDef> = {
  drone: { texture: 'enemyDrone', anim: 'drone-fly', hp: 2, speed: 70, wave: 0, fireRate: 0, score: 25, scale: 1, tint: 0xffffff, homing: 0, spawnRate: 0 },

  // BATEDOR: sprite PRÓPRIO (asas em flecha). O tint fica só como reforço — a silhueta já
  // separa ele do drone antes de a cor ser lida.
  batedor: { texture: 'enemyScout', anim: 'scout-fly', hp: 2, speed: 95, wave: 28, fireRate: 0, score: 40, scale: 0.85, tint: 0xffc8dc, homing: 0, spawnRate: 0 },

  // O tint puxa o casco para o ROXO da facção. A arte nova da canhoneira veio vermelho-tijolo,
  // e contra o azul-escuro da F1 ela saltava como a única peça quente da tela — o jogador lia
  // "coisa importante" numa nave que é tropa comum. Multiplicar por um lilás rebaixa o
  // vermelho e levanta o azul sem apagar o desenho (é o mesmo recurso do cargueiro).
  canhoneira: { texture: 'enemyGunship', anim: 'gunship-fly', hp: 6, speed: 40, wave: 0, fireRate: 1.6, score: 100, scale: 1, tint: 0xbfa8f0, homing: 0, spawnRate: 0 },

  // KAMIKAZE: entra devagar e ACELERA em cima de você. Frágil de propósito — a resposta
  // certa é atirar nele, não fugir, e 2 de vida garante que a arma base dê conta.
  //
  // O sprite dele tem um ESPETO na proa. É a arma dele desenhada no casco: o jogador entende que
  // aquilo vem para bater antes de ele ter começado a acelerar. O tint quente foi ABRANDADO
  // (0xff8c1a → 0xffb066) porque a arte agora carrega a leitura — o laranja chapado apagava o
  // espeto, que é justamente a parte que informa.
  //
  // ARTE NOVA (2026-08-10), e ela vale nas TRÊS fases e dentro da luta da Capitânia — troca
  // global, na mesma chave. A escolha é de LEITURA: o kamikaze é o mesmo bicho em todo lugar, e
  // trocá-lo só na Fase 2 o transformaria em figurino em vez de procedência (a Capitânia é o
  // hangar dele, ver BossCapitania).
  //
  // O TINT foi de 0xffb066 para BRANCO porque o calor agora está PINTADO na arte (a crista
  // laranja), não multiplicado por cima. O laranja quente sobre uma arte CLARA não insinua: ele
  // pinta — apagaria o azul do casco e os olhos verdes, que é o que a peça tem de leitura.
  //
  // A ESCALA 0.85 sobre a tela 31x28 devolve EXATAMENTE o tamanho e a hitbox de antes
  // (25.5x17 em tela, hitbox 15.8x13.1 contra 15.6x13.2) — ver scripts/_moldurar.mjs. O
  // número não é estético, é o que mantém o balanceamento intocado.
  kamikaze: { texture: 'enemyKamikaze', anim: 'kamikaze-fly', hp: 2, speed: 45, wave: 0, fireRate: 0, score: 60, scale: 0.85, tint: 0xffffff, homing: 150, spawnRate: 0 },

  // CARGUEIRO: lento, gordo e cheio de vida. Não atira — o perigo dele é o que ele CUSPE.
  // Ignorá-lo enche a tela de drones; é a definição de prioridade de alvo (docs/GDD.md §6).
  //
  // Sprite PRÓPRIO, e com o hangar aberto na barriga — de onde os drones saem de verdade. Antes
  // era a canhoneira esticada a 1.9×, o que além de repetir a forma BORRAVA a grade de pixel
  // (escala fracionária em pixel art). Nativo a 60px, ele agora vai a 1.1× e a grade fica de pé.
  //
  // ARTE NOVA (2026-08-10), troca GLOBAL como a do kamikaze — e pela mesma razão: ele aparece em
  // STAGE_2/3/4 (nunca na Fase 1), sempre como o mesmo bicho.
  //
  // O TINT foi de 0xb9a8d8 para BRANCO. O lilás foi escolhido para a arte antiga, clara e lavada;
  // sobre um casco quase preto ele levanta o cinza e apaga a única coisa acesa do desenho, que é
  // a baia. Branco aqui significa "mostre a arte como ela foi pintada".
  //
  // O VERDE DA BAIA É DELIBERADO (decisão do Henrique, 2026-08-10). A baia cicla vermelho →
  // oliva → amarelo, e o oliva/verde é cor NOVA no vocabulário do jogo — que ensina magenta como
  // "isto te mata". É justamente por não ser a cor de perigo que ela serve: o hangar não é uma
  // arma, é uma boca. Não trocar por magenta "para ficar coerente" — a incoerência é o ponto.
  //
  // A ESCALA NÃO MUDOU, e isso não é sorte: a arte nova foi remoldurada para a MESMA tela 60x39
  // da antiga (`scripts/_moldurar.mjs`), então o comprimento em tela e a hitbox (39.6x23.6)
  // seguem idênticos. O desenho é mais BAIXO que o anterior (29px de arte contra 35), o que é
  // propriedade da arte, não do enquadramento.
  cargueiro: { texture: 'enemyCarrier', anim: 'carrier-fly', hp: 24, speed: 20, wave: 0, fireRate: 0, score: 300, scale: 1.1, tint: 0xffffff, homing: 0, spawns: 'drone', spawnRate: 1.5 },

  // A ARANHA — o MINI-BOSS do Ato 2 da Fase 3 (roteirizada: evento 'miniboss', uma por fase).
  // Um ANDADOR: entra pisando no casco do Leviatã (o y dela é cravado na linha do casco pelo
  // spawn), ESTACIONA no terço direito e cospe leques de 3 mirados. 50 HP (auditoria): grande
  // o bastante para pesar, curta o bastante para não roubar o clímax da serpente.
  aranha: { texture: 'aranha', anim: 'aranha-walk', hp: 50, speed: 30, wave: 0, fireRate: 2.6, score: 500, scale: 0.62, tint: 0xffffff, homing: 0, spawnRate: 0 },

  // A ÁGUA-VIVA (Fase 3, Ato 1). A única coisa LENTA da nebulosa.
  //
  // O Ato 1 era todo rápido — drone 70, batedor 95, kamikaze 45 com perseguição, mais asteroide,
  // mina e sensor. Não havia nada que FICASSE no quadro. Ela é isso: deriva a 28, atravessa em
  // ~14,3s (400px a partir de `GAME_WIDTH + 16`, não 384), e o azul aceso dela é a única coisa que
  // a névoa densa deixa ver de longe.
  //
  // ⚠️ NÃO ATIRA E NÃO PERSEGUE. Ela ATRAPALHA — é obstáculo vivo, não alvo. Isso é deliberado:
  // um projétil novo entraria no volume de tiro do Ato 1, e esse número está congelado até o
  // playtest.
  //
  // ⚠️ `hp 10` É O NÚMERO MAIS FRÁGIL DESTA PEÇA. A escala do jogo é 2 para drone/batedor/
  // kamikaze e 6 para a canhoneira; dez é 5× um drone, e é para ela não morrer de raspão. Se no
  // playtest ela virar pedágio em vez de estorvo, é este número que desce — não a velocidade,
  // que é a razão de ela existir.
  //
  // A arte é 25×42 (alta e estreita: o sino mais os tentáculos), então 0.6 devolve 15×25 em
  // tela, ao lado dos 26×24 do kamikaze. Tint BRANCO: ela já nasce acesa, e multiplicar cor por
  // cima apagaria justamente o brilho.
  // ⚠️ ELA ESTÁ DE PASSAGEM, E ISSO É O CONSERTO DO PRIMEIRO TESTE (2026-08-27). A primeira
  // versão derivava da direita para a esquerda subindo e descendo em senóide, e o Henrique
  // reprovou o MOVIMENTO ("elas sobem e descem verticalmente... quero que elas subam ou desçam e
  // SAIAM da tela também, como se estivessem de passagem"). Agora ela cruza a rota do jogador:
  // entra por baixo e sobe, ou entra de ponta-cabeça por cima e desce. Some pela borda oposta.
  //
  // Com `travessia: 'vertical'` os dois números TROCAM DE EIXO: `speed` é a subida/descida e
  // `wave` é a gingada lateral. 264px de travessia a 34px/s = ~7,8s no quadro — tempo de sobra
  // para atirar ou desviar, que é o que a mudança comprou.
  aguaViva: { texture: 'aguaViva', anim: 'aguaviva-drift', hp: 10, speed: 34, wave: 26, fireRate: 0, score: 120, scale: 0.6, tint: 0xffffff, homing: 0, spawnRate: 0, travessia: 'vertical' },
};

/**
 * PELE POR FASE: canhoneira e batedor trocam de arte entre a Fase 1 (biomec roxo, sempre) e a
 * Fase 2 (facção do cinturão) — mesmo `EnemyKind`/comportamento, só a textura. Fonte única de
 * verdade para o comportamento (opção A do spec 2026-08-05): sem o PNG do cinturão, `spawn()`
 * cai de volta em `def.texture`/`def.anim` — a Fase 1 e uma Fase 2 sem arte nova continuam
 * IDÊNTICAS a hoje.
 *
 * `scale`, quando presente, SUBSTITUI `def.scale` só pra essa pele — o plano original previa
 * gerar a arte nova na MESMA caixa nativa da antiga (pra um `scale` só bastar), mas o batedor do
 * cinturão veio um dardo de verdade (115×34, bem mais alongado que os 27×26 de sempre); forçar a
 * mesma caixa esmagaria o desenho. O `scale` próprio recalibra o TAMANHO em tela pra ficar
 * parecido com o da Fase 1 (hitbox deriva do tamanho exibido, ver `spawn`) sem mexer em `DEFS`.
 *
 * `bullet` troca o PROJÉTIL junto com a pele, e não junto com o inimigo: a canhoneira da Fase 1
 * continua cuspindo o traço de sempre. Existe porque o traço (`bolt2`, 13×9 tingido de rosa)
 * SOME no fundo do cinturão — fundo pintado escuro, destroços, nebulosa —, e um tiro que não se
 * vê não é dificuldade, é injustiça. A bola é redonda e tem núcleo branco justamente para não
 * depender da cor para ser vista.
 *
 * `tint` idem, e pelo mesmo motivo que o chefão da Fase 1 precisou baixar o dele: os tints do
 * `DEFS` foram escolhidos para a arte BIOMEC, que é clara e lavada, e eles COLOREM em vez de
 * insinuar. Aplicados sobre a arte do cinturão — quase preta de propósito — o lilás da canhoneira
 * (0xbfa8f0) puxava o casco inteiro para cinza-malva e apagava a linha dark sci-fi. Branco aqui
 * significa "mostre a arte como ela foi pintada", não "sem tint".
 */
const STAGE_2_SKIN: Partial<
  Record<
    EnemyKind,
    {
      texture: string;
      anim: string;
      scale?: number;
      tint?: number;
      bullet?: { texture: string; scale: number; anim?: string };
    }
  >
> = {
  batedor: { texture: 'enemyScoutCinturao', anim: 'scout-cinturao-fly', scale: 0.28, tint: 0xffffff },
  // 0.72 encolhe a arte (115×36, a caixa união do voo) até os 26px de ALTURA da canhoneira
  // biomec, não até os 45 de largura. A escolha é de balanceamento, não de enquadramento: o
  // jogador atira na HORIZONTAL, então quem decide "quão difícil é acertar" é o perfil VERTICAL
  // — a hitbox sai de `e.height * 0.55`. Encaixando pela largura a nave ficaria com 13px de
  // altura e metade da hitbox vertical de hoje, virando bem mais tanque sem ninguém ter pedido.
  // O preço desta escolha é o comprimento: 83px em tela contra 45 da Fase 1.
  canhoneira: {
    texture: 'enemyGunshipCinturao',
    anim: 'gunship-cinturao-fly',
    scale: 0.72,
    tint: 0xffffff,
    // A bola em ~14px de diâmetro em tela, contra os 10×7 do traço que ela substitui. Maior de
    // propósito: o que se ganha aqui é LEITURA, e ela é o motivo do troco. Sem tint — a arte já
    // nasce magenta, que é a cor que o jogo ensina como "tiro que me mata" (ver `fireAt`).
    //
    // 0.8 e não o 0.5 de antes porque a ARTE mudou (2026-08-09), não o desejo: a bola nova tem
    // corpo de 18px contra os 29 da anterior, então o mesmo 0.5 a entregaria com METADE do
    // tamanho calibrado. O número muda para o tamanho em tela ficar o mesmo.
    bullet: { texture: 'bulletOrb', scale: 0.8, anim: 'bullet-orb-pulse' },
  },
};

export class EnemySystem {
  readonly enemies: Phaser.Physics.Arcade.Group;
  readonly enemyBullets: Phaser.Physics.Arcade.Group;

  /**
   * Flash de boca dos atiradores COMUNS (canhoneira/drone) — a versão menor do tratamento da
   * Capitânia. UM emissor para o SISTEMA inteiro, criado aqui (armadilha nº 5: nunca um por
   * tiro), na família magenta do inimigo. SEM trail, de propósito: o rastro é assinatura de
   * chefão, e um tiro comum que arrasta cauda rouba essa leitura.
   */
  private readonly muzzleFlash: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    /** A FASE atual (`GameScene.stage.id`) — só usada para a pele por fase (ver `STAGE_2_SKIN`). */
    private readonly stageId: number,
    /** Só para o ESTALO da água-viva (ver `update`). O resto dos efeitos é da GameScene. */
    private readonly fx: Fx,
  ) {
    this.enemies = scene.physics.add.group({ allowGravity: false });
    this.enemyBullets = scene.physics.add.group({
      defaultKey: 'bolt2',
      // 128, não 64: a fúria do NÚCLEO (leque de 5 + mirado a cada 1.1s + paredes + 2 drones)
      // somada aos estilhaços de uma mina sensora acordada estourava o teto — e o tiro
      // descartado em silêncio é uma luta mais fácil do que a desenhada.
      maxSize: 128,
      allowGravity: false,
    });

    // O rosa claro é o mesmo do flash de dano do jogador (0xff7aa8) — a família de cor já
    // existe no jogo (é a mesma dupla do tracerFlash da Capitânia, só que mais contida).
    this.muzzleFlash = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 130,
        speed: { min: 20, max: 80 },
        scale: { start: 1.4, end: 0 },
        tint: [0xff7aa8, COLORS.enemyBright],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(40);
  }

  /** `x` só é passado quando um inimigo PARE outro (o cargueiro cospe drones de dentro de si). */
  spawn(kind: EnemyKind, y: number, x = GAME_WIDTH + 16): void {
    const def = DEFS[kind];

    // A aranha ANDA — o y dela não é do roteiro, é da FÍSICA: os pés na linha do casco
    // (a banda `casco` do Parallax tem o topo em ~190; o centro dela assenta em cima).
    if (kind === 'aranha') y = 170;

    // ⚠️ A TRAVESSIA VERTICAL IGNORA O `y` DO ROTEIRO, e tem que ignorar: aqui o roteiro não
    // escolhe ALTURA, escolhe QUANDO. Quem entra por uma borda horizontal nasce NA borda.
    //
    // O sorteio de sentido é meio a meio, e o que desce entra DE PONTA-CABEÇA — pedido literal do
    // Henrique. Uma água-viva mergulhando com o sino para baixo é a mesma criatura noutro rumo;
    // sem o `flipY` ela pareceria um segundo bicho com a mesma arte.
    const sobe = DEFS[kind].travessia === 'vertical' ? Math.random() < 0.5 : false;
    if (DEFS[kind].travessia === 'vertical') {
      y = sobe ? GAME_HEIGHT + 24 : -24;
      // Nasce à DIREITA do meio da tela: com a deriva lateral ela ainda cruza boa parte do
      // quadro antes de sair, em vez de raspar a borda e sumir.
      x = Phaser.Math.Between(Math.round(GAME_WIDTH * 0.45), GAME_WIDTH + 40);
    }

    // A PELE POR FASE (canhoneira/batedor): na Fase 2, tenta a textura do cinturão primeiro;
    // sem o PNG (guarda de textura), cai na arte biomec de sempre — ver STAGE_2_SKIN.
    const skin = this.stageId === 2 ? STAGE_2_SKIN[kind] : undefined;
    const hasSkin = skin !== undefined && this.scene.textures.exists(skin.texture);
    const baseTexture = hasSkin ? skin!.texture : def.texture;
    const baseAnim = hasSkin ? skin!.anim : def.anim;
    // A pele pode trazer a própria escala (ver STAGE_2_SKIN) — a arte do cinturão nem sempre
    // nasce na mesma caixa nativa da biomec, e forçar o `def.scale` de sempre distorceria o
    // tamanho em tela.
    const scale = hasSkin && skin!.scale !== undefined ? skin!.scale : def.scale;
    // E o próprio tint: os do `DEFS` foram escolhidos para a arte biomec (clara) e COLOREM a arte
    // do cinturão (quase preta) em vez de insinuar — ver STAGE_2_SKIN.
    const tint = hasSkin && skin!.tint !== undefined ? skin!.tint : def.tint;

    const texture = pickVariant(this.scene, baseTexture);
    const e = this.enemies.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;

    // A animação só existe para a variante BASE. Tocá-la numa variante trocaria a textura
    // pelos quadros da base — e a variedade que acabamos de ganhar iria embora.
    if (texture === baseTexture && baseAnim && this.scene.anims.exists(baseAnim)) {
      e.play(baseAnim);
    }

    if (def.travessia === 'vertical') {
      // ⚠️ SÓ A VERTICAL É FÍSICA. A horizontal (deriva + gingada) é escrita à mão no `update`,
      // porque a gingada ESCREVE `x` — e escrever x todo frame apagaria uma velocityX. É o
      // espelho exato do que o resto do róster faz: lá a física é a horizontal e a senóide
      // escreve `y`. Os dois eixos trocaram de papel, e a regra é a mesma.
      e.setVelocityY(sobe ? -def.speed : def.speed);
      e.setFlipY(!sobe);
      e.setData('sobe', sobe);
      e.setData('baseX', x);
    } else {
      e.setVelocityX(-def.speed);
    }
    e.setScale(scale);
    e.setTint(tint);

    // Todos os sprites são gerados apontando para a DIREITA. O inimigo vem na sua direção,
    // então normalmente é só espelhar.
    //
    // O PERSEGUIDOR é a exceção: ele aponta para onde VOA, e isso se faz girando o sprite.
    // Girar um sprite já espelhado inverte duas vezes — o nariz do kamikaze apontaria para
    // trás justamente enquanto ele mergulha em cima do jogador.
    e.setFlipX(def.homing === 0);

    if (def.homing > 0) {
      // Teto de velocidade: sem ele a aceleração integra para sempre e o kamikaze vira um
      // projétil impossível de acompanhar depois de duas voltas na tela.
      (e.body as Phaser.Physics.Arcade.Body).setMaxVelocity(190, 190);
    }

    // Hitbox derivada da textura, não fixa: a arte real (32/48px) entra sem recalibrar,
    // e um sprite com muito espaço transparente em volta não vira uma hitbox inflada.
    e.body!.setSize(e.width * 0.6, e.height * 0.55);

    e.setData('kind', kind);
    e.setData('hp', def.hp);
    e.setData('score', def.score);
    // Guardado para restaurar depois do flash branco de dano.
    // O tint DA PELE, não o do DEFS: é este valor que o flash branco de dano restaura ao
    // terminar (ver `damage`), e restaurar o do DEFS repintaria a arte do cinturão no 1º tiro.
    e.setData('tint', tint);
    e.setData('baseY', y);
    e.setData('t', Phaser.Math.FloatBetween(0, Math.PI * 2));
    // Espera antes do PRIMEIRO tiro: uma canhoneira não dispara no frame em que aparece.
    e.setData('cooldown', Phaser.Math.FloatBetween(1.2, 2.0));
    e.setData('charging', 0);
    // Espera antes de cuspir o primeiro drone: um cargueiro não pare no frame em que entra.
    e.setData('spawnCd', def.spawnRate > 0 ? def.spawnRate : 0);

    // ⚠️ O PULSO ELÉTRICO É CÓDIGO, E ISSO NÃO É PREGUIÇA — É A LIÇÃO DA HÉLICE.
    //
    // "Acende e apaga" cabe numa frase de geometria, e nesta mesma fatia o v3 do PixelLab leu
    // "bater para cima e para baixo" como GIRAR: a animação do rabo do Leviatã voltou com a
    // nadadeira rodando em torno do próprio eixo e foi descartada inteira. Pedir "pulsa com
    // eletricidade" aos quadros devolveria uma hélice azul. Aos quadros foi o que código não faz
    // (o sino deformando, os tentáculos arrastando); o brilho fica aqui.
    //
    // ⚠️ GLOW E NÃO TINT. O tint é do flash branco de dano, que restaura o valor guardado em
    // `setData('tint')` — um pulso escrevendo tint todo frame comeria o flash, e o jogador
    // deixaria de ver que acertou.
    //
    // `preFX` é nulo no renderer Canvas. A guarda mantém o contrato de sempre: sem o recurso, a
    // cena continua — só sem brilho.
    // ⚠️ BRILHO PARA DENTRO (`innerStrength`), NUNCA PARA FORA. O `outerStrength` desenha o halo
    // ALÉM da silhueta — e a quad do sprite é a arte recortada justa (25×42, o `install-anim`
    // corta pela caixa união). O halo vaza para fora da quad e é ceifado nela: o que aparece na
    // tela é um RETÂNGULO azul aceso em volta do bicho, não um brilho. Foi assim na primeira
    // versão, e quem entregou foi a captura ampliada — no tamanho do jogo passava por "brilho".
    //
    // O brilho interno vive dentro do alfa da forma, então não tem como virar caixa. E é a
    // leitura certa de todo modo: a criatura ACENDE, não a moldura dela.
    // ⚠️ O ESTALO É SEPARADO DO GLOW, E NÃO É DUPLICAÇÃO. O glow é ESTADO — a criatura está
    // carregada, e isso se vê o tempo todo. O estalo é EVENTO — ela DESCARREGA, e é isso que o
    // Henrique pediu depois do 3º teste ("algo que pareça que ela dá choque"). Um bicho que só
    // brilha lê como lâmpada; o que ensina o jogador a não encostar é o arco.
    //
    // O primeiro sai cedo (0,3–1,1s): a criatura tem ~7,8s de tela, e um estalo que só aparece
    // depois de metade da travessia chega tarde para mudar a decisão de quem vai passar por ela.
    if (kind === 'aguaViva') e.setData('estalo', Phaser.Math.FloatBetween(0.3, 1.1));

    if (kind === 'aguaViva' && e.preFX) {
      const glow = e.preFX.addGlow(0x35b6ea, 0, 0, false, 0.1, 10);
      this.scene.tweens.add({
        targets: glow,
        innerStrength: 2.2,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    // SNAPSHOT do grupo. `getChildren()` devolve o array vivo: o cargueiro ACRESCENTA a ele
    // (cospe drones) e o culling REMOVE dele, os dois no meio da iteração. Percorrer o array
    // vivo enquanto ele muda de tamanho pula elementos — um inimigo perderia um frame de update
    // por causa do vizinho que morreu.
    for (const obj of [...this.enemies.getChildren()]) {
      const e = obj as Phaser.Physics.Arcade.Sprite;
      if (!e.active) continue;

      const def = DEFS[e.getData('kind') as EnemyKind];

      if (def.travessia === 'vertical') {
        // OS EIXOS TROCADOS: a física cuida da subida/descida, e aqui se escreve o X — a deriva
        // lateral do mundo mais a gingada da criatura. `baseX` guarda a deriva sozinha, para a
        // senóide não se acumular sobre si mesma a cada frame.
        const t = (e.getData('t') as number) + dt * 2;
        e.setData('t', t);
        const baseX = (e.getData('baseX') as number) - 16 * dt;
        e.setData('baseX', baseX);
        e.x = baseX + Math.sin(t) * def.wave;

        // O ESTALO: um arco atravessando o sino, de tempos em tempos. Ver `Fx.estalo`.
        //
        // ⚠️ INTERVALO SORTEADO A CADA DISPARO, não fixo. Um período constante lê como
        // pisca-pisca (o defeito que o pulso do glow já evita sendo lento); irregular lê como
        // descarga. E o raio do arco sai do `displayWidth` REAL, não de um número: a criatura
        // entra em duas escalas de sprite e um raio fixo estouraria a silhueta da menor.
        const estalo = (e.getData('estalo') as number) - dt;
        if (estalo <= 0) {
          this.fx.estalo(e.x, e.y, e.displayWidth * 0.42);
          e.setData('estalo', Phaser.Math.FloatBetween(1.1, 2.3));
        } else {
          e.setData('estalo', estalo);
        }
      } else if (def.wave > 0) {
        const t = (e.getData('t') as number) + dt * 3;
        e.setData('t', t);
        e.y = (e.getData('baseY') as number) + Math.sin(t) * def.wave;
      }

      if (def.homing > 0) this.updateChaser(e, def, target);
      if (def.fireRate > 0) this.updateGunner(e, def, dt, target);
      if (def.spawns) this.updateCarrier(e, def, dt);

      if (e.getData('kind') === 'aranha') this.updateAranha(e, dt, target);

      // O perseguidor passa RETO pelo jogador e volta — culpa da inércia, e é o que o torna
      // legível. Se ele fosse morto ao cruzar a borda esquerda, um kamikaze que errou sumiria
      // no meio da curva de volta. Ele só morre bem longe da tela.
      const limite = def.homing > 0 ? -120 : -24;
      if (e.x < limite) e.destroy();

      // ⚠️ QUEM ATRAVESSA NA VERTICAL PRECISA DE CULLING VERTICAL. O culling do róster só olha a
      // borda ESQUERDA — nada mais sai por cima ou por baixo. Sem isto a água-viva sairia da tela
      // e continuaria viva descendo para sempre, contada por toda sonda e por todo overlap.
      if (def.travessia === 'vertical' && (e.y < -48 || e.y > GAME_HEIGHT + 48)) e.destroy();
    }

    this.cullBullets();
  }

  /**
   * KAMIKAZE: acelera na direção do jogador, todo frame.
   *
   * Por ACELERAÇÃO, não por velocidade direta. Apontar a velocidade para o alvo faria um
   * inimigo grudado nele, impossível de despistar e chato de matar; acelerar dá INÉRCIA —
   * ele mergulha, erra, faz a curva e volta. É a inércia que transforma perseguição em padrão.
   */
  private updateChaser(
    e: Phaser.Physics.Arcade.Sprite,
    def: EnemyDef,
    target: Phaser.Physics.Arcade.Sprite,
  ): void {
    const body = e.body as Phaser.Physics.Arcade.Body;

    const angle = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y);
    body.setAcceleration(Math.cos(angle) * def.homing, Math.sin(angle) * def.homing);

    // O nariz aponta para onde ele VOA (não para o alvo): é o vetor de velocidade que o
    // jogador precisa ler para saber se ainda dá tempo de sair da frente.
    const rumo = Math.atan2(body.velocity.y, body.velocity.x);
    e.setRotation(rumo);

    // E VOANDO PARA A ESQUERDA ELE FICA DE PÉ. O sprite é desenhado apontando para a direita;
    // girá-lo além de 90° o entrega de ponta-cabeça — dorso embaixo, barriga em cima. Como ele
    // passa a maior parte do voo indo para a esquerda (é a direção do jogador), esse era o
    // estado NORMAL dele, não a exceção.
    //
    // O defeito é antigo e estava escondido: a arte anterior era um bloco mecânico simétrico,
    // que invertido continua parecendo o mesmo bloco. A arte de 2026-08-10 tem crista dorsal e
    // barriga, e denunciou.
    //
    // `setFlipY` sobre o sprite JÁ GIRADO espelha no eixo local: composto com a rotação de ~180°
    // ele desfaz a inversão vertical e mantém o rumo. Não é o mesmo que trocar a rotação — o
    // nariz continua apontando para onde a velocidade aponta, que é a informação que o jogador lê.
    e.setFlipY(Math.abs(rumo) > Math.PI / 2);
  }

  /** CARGUEIRO: cospe drones enquanto estiver na tela. Fora dela, seria um spawn invisível. */
  private updateCarrier(e: Phaser.Physics.Arcade.Sprite, def: EnemyDef, dt: number): void {
    if (e.x > GAME_WIDTH) return;

    const cd = (e.getData('spawnCd') as number) - dt;

    if (cd > 0) {
      e.setData('spawnCd', cd);
      return;
    }

    e.setData('spawnCd', def.spawnRate);
    // Nasce NO HANGAR — a boca acesa na BARRIGA do cargueiro, que agora existe na arte. Antes o
    // drone saía do meio do casco (±8px do centro), e parecia atravessar o metal; sair por baixo,
    // de onde a luz vaza, é a diferença entre um inimigo LARGADO e um inimigo teletransportado.
    //
    // A FAIXA É MEDIDA NA ARTE, não escolhida a olho: com a arte de 2026-08-10 a baia acesa fica
    // em +5.5 a +10.5 do centro (localizada por SATURAÇÃO — o casco e as espinhas dorsais são
    // neutros, só a baia tem cor). O intervalo anterior, +4 a +14, passava 3px ABAIXO dela, e
    // um em cada quatro ou cinco drones brotava debaixo do casco em vez de dentro do hangar.
    //
    // ⚠️ Este número vale para ESTA arte. Trocar o sprite do cargueiro obriga a re-medir a baia
    // (`scripts/_probe-cargueiro.mjs` mede a faixa e onde os drones de fato apareceram).
    this.spawn(def.spawns!, e.y + Phaser.Math.Between(5, 11), e.x - 6);
  }

  /**
   * A canhoneira PISCA antes de atirar — mesmo princípio da torre de solo.
   *
   * O problema nunca foi o tiro ser mirado: foi ele ser INVISÍVEL. Mira sem aviso não dá
   * ao jogador nada a que reagir. Com o telégrafo, o tiro mirado vira uma pergunta
   * ("sai da linha agora") em vez de um imposto.
   */
  private updateGunner(
    e: Phaser.Physics.Arcade.Sprite,
    def: EnemyDef,
    dt: number,
    target: Phaser.Physics.Arcade.Sprite,
  ): void {
    const charging = e.getData('charging') as number;

    if (charging > 0) {
      const left = charging - dt;
      e.setData('charging', left);
      // setTint, NÃO setTintFill — ver TerrainSystem: tintFill apaga a arte e o inimigo vira
      // um retângulo branco.
      e.setTint(Math.floor(left * 30) % 2 === 0 ? 0xffd0d0 : 0xff6060);

      if (left <= 0) {
        e.setTint(e.getData('tint') as number);
        this.fireAt(e, target);
      }
      return;
    }

    const cd = (e.getData('cooldown') as number) - dt;

    if (cd <= 0) {
      e.setData('cooldown', def.fireRate);
      e.setData('charging', EnemySystem.TELEGRAPH);
    } else {
      e.setData('cooldown', cd);
    }
  }

  private static readonly TELEGRAPH = 0.45;

  /** A linha do casco onde a aranha pisa (os pés dela; ver spawn). */
  private static readonly ARANHA_Y = 170;

  /**
   * A ARANHA: anda, estaciona, atira — e PULA (pedido do Henrique: um combo que justifique o
   * corpo dela). O ciclo: entra andando → estaciona no terço direito → leques de 3 (o gunner
   * comum cuida disso) → a cada ~7s, TELEGRAFA (agacha piscando 0.5s), SALTA num arco na
   * direção do jogador (anim 'aranha-jump') e ATERRISSA com um anel radial de 6 tiros + shake.
   * O pulo é a resposta dela a quem acampa na esquerda achando que ela é um canhão fixo.
   */
  private updateAranha(
    e: Phaser.Physics.Arcade.Sprite,
    dt: number,
    target: Phaser.Physics.Arcade.Sprite,
  ): void {
    const body = e.body as Phaser.Physics.Arcade.Body;
    const estado = (e.getData('aranhaEstado') as string) ?? 'chao';

    if (estado === 'chao') {
      // Estaciona ao chegar no terço direito (um mini-boss que atravessa e some seria uma
      // canhoneira gorda; parada, ela nega o lado direito — prioridade de alvo, GDD §6).
      if (e.x <= 306 && body.velocity.x < 0) e.setVelocityX(0);

      const cd = ((e.getData('puloCd') as number) ?? 6) - dt;
      e.setData('puloCd', cd);
      if (cd <= 0 && body.velocity.x === 0) {
        e.setData('aranhaEstado', 'telegrafo');
        e.setData('aranhaT', 0.5);
      }
      return;
    }

    if (estado === 'telegrafo') {
      const t = (e.getData('aranhaT') as number) - dt;
      e.setData('aranhaT', t);
      e.setTint(Math.floor(t * 20) % 2 === 0 ? 0xffd0d0 : 0xff6060);
      if (t <= 0) {
        e.setTint(e.getData('tint') as number);
        e.setData('aranhaEstado', 'ar');
        // O salto MIRA o lado do jogador, mas com teto de alcance — pular para fora da tela
        // (ou para cima do rodapé esquerdo, encurralando) não é ataque, é sumiço.
        const alvoX = Phaser.Math.Clamp(target.x + 40, 150, 300);
        const vx = (alvoX - e.x) / 1.1; // ~1.1s de voo
        e.setVelocity(vx, -190);
        body.setAccelerationY(360); // a "gravidade" do salto — só existe no ar
        if (this.scene.anims.exists('aranha-jump')) e.play('aranha-jump');
      }
      return;
    }

    // No AR: cai de volta na linha do casco e ATERRISSA.
    if (e.y >= EnemySystem.ARANHA_Y && body.velocity.y > 0) {
      e.setY(EnemySystem.ARANHA_Y);
      e.setVelocity(0, 0);
      body.setAccelerationY(0);
      e.setData('aranhaEstado', 'chao');
      e.setData('puloCd', Phaser.Math.FloatBetween(6, 8));
      if (this.scene.anims.exists('aranha-walk')) e.play('aranha-walk');

      // O ANEL da aterrissagem: 6 tiros radiais. É o novo combo — o pulo não é fuga, é área.
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + Math.PI / 12;
        const b = this.enemyBullets.get(e.x, e.y - 6) as Phaser.Physics.Arcade.Sprite | null;
        if (!b) break;
        b.setActive(true).setVisible(true);
        b.body!.enable = true;
        // A MESMA munição de cobre do leque dela (ver `municaoAranha`). O anel de aterrissagem é
        // o segundo caminho de tiro da aranha, e os dois têm que cuspir a MESMA coisa — foi um
        // par de caminhos com a mesma cópia de linhas que já fez a água-viva morrer em fogo por
        // uma porta e em choque pela outra.
        EnemySystem.municaoAranha(b);
        b.setData('ox', e.x);
        b.setData('oy', e.y);
        b.setVelocity(Math.cos(ang) * 105, Math.sin(ang) * 105);
        b.setRotation(ang);
      }
      this.muzzleFlash.explode(8, e.x, e.y + 16);
      this.scene.cameras.main.shake(110, 0.005);
    }
  }

  /**
   * A MUNIÇÃO DA ARANHA DO CASCO — um lugar só, porque ela atira por DOIS caminhos.
   *
   * O leque de 3 (`fireAt`) e o anel de 6 da aterrissagem (`updateAranha`) são código separado,
   * e duas cópias das mesmas quatro linhas foi exatamente como a água-viva chegou a morrer em
   * fogo por uma porta e em choque pela outra. Aqui é um método estático para que trocar o tiro
   * dela seja impossível de fazer pela metade.
   *
   * ⚠️ `shotAranha` NASCE EM 13×9, o mesmo quadro do `bolt2` que ela usava — então a hitbox do
   * slot (que o `release` devolve a partir do quadro do `bolt2`) continua exata e o
   * balanceamento não se move. Ver `BootScene.makeShotsChefes`.
   *
   * ⚠️ `clearTint()` E BLEND NORMAL. A arte já nasce na cor certa; tingir por cima só a
   * escureceria, e o aditivo estouraria a ogiva branca e comeria a borda escura que a separa do
   * casco — que é metade do motivo de ela ser visível (a lição da bola da Fase 2).
   */
  private static municaoAranha(b: Phaser.Physics.Arcade.Sprite): void {
    b.setTexture('shotAranha').setScale(0.8).clearTint();
    b.setBlendMode(Phaser.BlendModes.NORMAL);
  }

  /**
   * Tiro MIRADO: pune quem fica parado, que é a função da canhoneira.
   * A ARANHA cospe um LEQUE de 3 (±13°) — mini-boss cobra área, não linha.
   */
  private fireAt(e: Phaser.Physics.Arcade.Sprite, target: Phaser.Physics.Arcade.Sprite): void {
    const centro = Phaser.Math.Angle.Between(e.x, e.y, target.x, target.y);

    // A MUNIÇÃO da pele por fase (ver STAGE_2_SKIN). Mesma guarda de textura do resto: sem o
    // PNG, cai no traço de sempre e nada quebra. Só a Fase 2 tem pele — a aranha da Fase 3, que
    // também passa por aqui, nunca entra nesta condição.
    const skin = this.stageId === 2 ? STAGE_2_SKIN[e.getData('kind') as EnemyKind] : undefined;
    const municao =
      skin?.bullet && this.scene.textures.exists(skin.bullet.texture) ? skin.bullet : undefined;
    const angulos =
      e.getData('kind') === 'aranha'
        ? [centro - Phaser.Math.DegToRad(13), centro, centro + Phaser.Math.DegToRad(13)]
        : [centro];

    for (const angle of angulos) {
      const b = this.enemyBullets.get(e.x, e.y) as Phaser.Physics.Arcade.Sprite | null;
      if (!b) {
        if (import.meta.env.DEV) console.warn('[inimigos] pool cheio, tiro descartado');
        return;
      }

      b.setActive(true).setVisible(true);
      b.body!.enable = true;

      if (municao) {
        // A BOLA da pele do cinturão (Fase 2). Sem tint e sem blend aditivo: a arte já vem
        // magenta com núcleo branco, e somar luz por cima só estoura o núcleo e come a borda
        // escura que a separa do fundo — a borda é metade do motivo de ela ser visível.
        b.setTexture(municao.texture).setScale(municao.scale).clearTint();
        b.setBlendMode(Phaser.BlendModes.NORMAL);
        // E ela PULSA. Mesma guarda do resto: sem a animação registrada, fica o estático (que é
        // o quadro 0 — mesma caixa união, então não salta ao começar). `release()` já para a
        // animação ao reciclar o slot, senão o próximo tiro a herdar a vaga sairia pulsando.
        if (municao.anim && this.scene.anims.exists(municao.anim)) b.play(municao.anim);
        // A hitbox do slot é a do `bolt2` até alguém trocá-la (o pool é compartilhado, ver
        // `release`). Uma bola redonda com a caixa de um traço acerta pelo canto vazio — então
        // aqui ela é um CÍRCULO, como o cometa da Torre (mesma razão, ver `release`).
        //
        // Os números saem de MEDIÇÃO, não de gosto: a bola ocupa 18×18 de um canvas 20×24 (o
        // resto é a fagulha do quadro 3, que não fere), e o centro dela cai em (10, 12). Raio
        // 6.25 dá 10px de diâmetro em tela na escala 0.8 — que é exatamente a caixa que a arte
        // ANTERIOR tinha (10.2×9.8) e que o balanceamento da Fase 2 já foi jogado em cima.
        // Manter o `0.7` do canvas aqui teria inflado a caixa vertical em 37% de graça: o canvas
        // novo é mais alto, e a fagulha teria virado hitbox.
        (b.body as Phaser.Physics.Arcade.Body).setCircle(6.25, 10 - 6.25, 12 - 6.25);
      } else if (e.getData('kind') === 'aranha') {
        // A ARANHA TEM MUNIÇÃO PRÓPRIA (2026-08-29). Ver `municaoAranha` e `makeShotsChefes`.
        EnemySystem.municaoAranha(b);
      } else {
        // Mesmo sprite do jogador, tingido de MAGENTA. A cor é o que separa "meu tiro" de
        // "tiro que me mata" — a forma não precisa mudar, e assim não custa geração nenhuma.
        b.setTexture('bolt2').setScale(0.8).setTint(0xff3a78);
        // Leve GLOW aditivo: energia, não palito rosa chapado. Só o blend — sem trail e sem
        // escala anisotrópica, que são o figurino do traçante da Capitânia. O release() abaixo
        // devolve o blend NORMAL ao reciclar o slot.
        b.setBlendMode(Phaser.BlendModes.ADD);
      }
      // Origem: usada para a carência contra o relevo (ver GameScene).
      b.setData('ox', e.x);
      b.setData('oy', e.y);

      b.setVelocity(Math.cos(angle) * 110, Math.sin(angle) * 110);
      b.setRotation(angle);
    }

    // Pequeno clarão na BOCA, na cor do dono: o disparo vira um evento legível — o telégrafo
    // piscou, e AQUI está a prova de que o tiro saiu (e de onde).
    this.muzzleFlash.explode(3, e.x, e.y);
  }

  /**
   * Quantos deste tipo estão vivos.
   *
   * Existe para o chefão: uma Capitânia que larga interceptadores a cada ciclo, sem teto,
   * satura a tela em um minuto — e aí o jogador não morre pela luta, morre pelo acúmulo.
   */
  countOf(kind: EnemyKind): number {
    return this.enemies.getChildren().filter((e) => {
      const s = e as Phaser.Physics.Arcade.Sprite;
      return s.active && s.getData('kind') === kind;
    }).length;
  }

  release(b: Phaser.Physics.Arcade.Sprite): void {
    b.setActive(false).setVisible(false);
    b.body!.enable = false;
    b.setVelocity(0, 0);
    // O pool é compartilhado (drones, torres, chefão). Parar a animação evita que um tiro
    // de drone reaproveite o slot e continue tocando a chama do chefão.
    b.anims.stop();
    // E o GIRO: a cápsula de flak da Capitânia roda no ar (setAngularVelocity). Sem zerar aqui,
    // o próximo projétil a herdar este slot sai do cano RODOPIANDO — um traçante que gira não
    // aponta para onde vai, e apontar para onde vai é a única informação que ele carrega.
    const body = b.body as Phaser.Physics.Arcade.Body;
    body.setAngularVelocity(0);

    // E o CORPO: o cometa da Torre usa um círculo (só a bola fere, não a cauda), o míssil da
    // torre de solo e o traçante da Capitânia usam retângulos próprios. Devolve o retângulo
    // padrão do pool (o quadro do `bolt2`, como o slot nasce) — senão um tiro de drone herda a
    // hitbox de quem usou o slot antes.
    const frame = this.scene.textures.getFrame('bolt2');
    body.setSize(frame.realWidth, frame.realHeight, false);
    body.setOffset(0, 0);

    // E o RESTO do figurino: o blend aditivo do traçante e as marcas de trilha. Sem apagar,
    // um tiro comum sairia brilhando — e os emissores de trilha (Capitânia/Terrain) seguiriam
    // um slot reciclado.
    b.setBlendMode(Phaser.BlendModes.NORMAL);
    b.setData('tracer', false);
    b.setData('missile', false);
    // E o ATIRADOR: sem apagar, o slot reciclado continuaria imune ao prop que disparou o tiro
    // ANTERIOR — um projétil que atravessa uma torre por herança de vaga. Ver
    // `TerrainSystem.fireAt` e `GameScene.enemyBulletHitCover`.
    b.setData('atirador', null);
  }

  private cullBullets(): void {
    for (const obj of this.enemyBullets.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (!b.active) continue;
      if (b.x < -8 || b.x > GAME_WIDTH + 8 || b.y < -8 || b.y > GAME_HEIGHT + 8) this.release(b);
    }
  }
}
