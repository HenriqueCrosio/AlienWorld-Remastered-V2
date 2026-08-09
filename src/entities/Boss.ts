import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import type { Fx } from '../systems/Fx';

/**
 * O que a GameScene precisa saber de um chefão — e nada mais.
 *
 * A cena não conhece a Torre nem a Capitânia: ela conhece ISTO. Acrescentar o chefão de uma
 * fase nova não pode obrigar a mexer na cena que os executa (o mesmo princípio do
 * FlightController: a abstração é o que deixa a campanha crescer sem `if (fase === 2)`).
 */
export interface StageBoss {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly isDead: boolean;
  /**
   * As HITBOXES vivas do chefão, quando ele tem mais de uma (a serpente da Fase 3: cabeças).
   *
   * Ausente = o chefão é o `sprite` (Torre, Capitânia — nada muda para eles). Presente, a
   * GameScene liga um overlap POR alvo e o teleguiado do jogador mira NELES, não no corpo.
   * A lista é VIVA: o chefão a atualiza quando uma parte morre — a cena a lê a cada uso.
   */
  readonly targets?: Phaser.Physics.Arcade.Sprite[];
  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void;
  /** @returns true se este dano matou o chefão. */
  damage(amount: number): boolean;
  destroy(): void;
}

/**
 * Torre de Defesa da Colônia — chefão da Fase 1.
 *
 * A luta espelha o arco da FASE (GDD §7, "A Decolagem"): o espaço fecha e depois abre.
 *
 *   FASE 1 — POUSADA (>50% vida): a cidadela está no chão. Só o leque lento de 5. É a fase de
 *            ENSINAR a ler um padrão, sem punir.
 *   DECOLAGEM (na virada de 50%): a cidadela EXPLODE em cadeia, se arranca do chão e SOBE nos
 *            propulsores. Imune durante a transição, como a Serpente e o Núcleo
 *            (BossNucleo.trocarParaCoracao).
 *   FASE 2 — NO AR (≤50%): pairando, leque rápido de 7 + rajada mirada + a salva de mísseis.
 *
 * Os mísseis só existem na fase aérea — são a ESCALADA da fúria, não um perigo desde o início.
 * E a salva TOMA O COMPASSO do leque (partitura, como a Capitânia): quando ela carrega, o leque
 * cala. Somados, os dois padrões entupiam a tela; alternados, cada um tem seu tempo de leitura.
 */
export class Boss implements StageBoss {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  private hp: number;
  private readonly maxHp: number;
  private cooldown = 2;
  private t = 0;
  private entering = true;
  private dead = false;
  /** Já decolou? `false` = fase pousada; `true` = fase aérea. A DECOLAGEM fica no meio. */
  private airborne = false;
  /** Imune e sem atacar enquanto a animação de decolagem toca. */
  private takingOff = false;
  /** > 0 = o leque está CALADO (a salva de mísseis tomou o compasso). */
  private fanMute = 0;

  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly bar: Phaser.GameObjects.Rectangle;
  /** UM emissor, reaproveitado. Criar um por tiro vaza memória. */
  private readonly muzzleFx: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Faíscas de CARGA dos tubos de míssil — sugam para dentro, o oposto do clarão de disparo. */
  private readonly chargeFx: Phaser.GameObjects.Particles.ParticleEmitter;

  /** Contagem para a próxima salva de mísseis, independente do leque. Semeada no construtor. */
  private missileCooldown: number;
  /** > 0 enquanto os tubos CARREGAM (o telégrafo). Ao zerar, a salva sai. */
  private missileCharge = 0;

  /**
   * Tint de REPOUSO, e não `clearTint()` espalhado pelo código.
   *
   * A fúria esquenta o casco de forma PERMANENTE (ver `damage`): se o flash branco de dano
   * terminasse em `clearTint()`, cada tiro levado apagaria a marca da segunda fase — a torre
   * voltaria à cor da primeira e o jogador perderia o único sinal de que o padrão mudou.
   */
  private baseTint = 0xffffff;

  /**
   * A FORTALEZA é grande demais para entrar por inteiro: o PNG tem 200×198 numa tela de
   * 384×216. A 0.75 ela vira 150×148 — bem mais alta que a torre antiga (97×125), o salto de
   * presença que a fatia pedia, ainda sobrando céu acima e espaço de voo à esquerda.
   *
   * Reduzir o PNG no disco seria pior: reamostrar pixel art em 0.75 apaga a grade. Escalar no
   * render deixa o Phaser amostrar por vizinho-mais-próximo, e a arte sobrevive.
   */
  private static readonly SCALE = 0.75;

  /**
   * As DUAS alturas de repouso, MEDIDAS nos PNGs (`scripts/_medir-boss.mjs`) — a base do
   * conteúdo está a 73.5px do centro escalado na forma pousada e a 70.5px na aérea (as duas
   * artes têm silhuetas diferentes embaixo: pedra × bocais de propulsor), então NÃO dá para usar
   * um número só:
   *   POUSADA: centro em 132 crava a base em ~206, a linha do solo (`GROUND_Y`). Plantada.
   *   NO AR:   centro em 110 põe a ponta das chamas em ~180 — 26px de vão sobre o chão: é ele
   *            que a decolagem promete.
   */
  private static readonly BASE_Y_GROUND = 132;
  private static readonly BASE_Y_AIR = 110;
  /** Meia-largura da fortaleza (72px do centro escalado): `STATION_X = 306` deixa ~6px à direita. */
  private static readonly STATION_X = 306;
  private static readonly ENTRY_SPEED = 45;

  /** Duração da subida, casada com os 12 quadros de `boss-takeoff` a 10fps (1.2s). */
  private static readonly TAKEOFF_MS = 1300;

  /**
   * Quando a arte troca de pousada para aérea, dentro da subida.
   *
   * No FIM (88%), e não no meio: com a animação de decolagem de volta (2026-08-09), é ELA que
   * conta a transformação inteira — a base pega fogo, racha, os pedaços voam e a torre sobe nas
   * chamas. Cortar no meio jogaria fora justamente o que se pagou para ter. A troca acontece no
   * último respiro, debaixo do estouro grande, e o que ela troca já não é "pedra → foguetes"
   * (a animação já fez isso), é a silhueta pousada pela silhueta QUEBRADA da fase aérea.
   */
  private static readonly SWAP_AT = Boss.TAKEOFF_MS * 0.88;

  /**
   * Amplitude do bailado vertical — só na fase AÉREA (pousada não bobeia).
   *
   * Eram 26px numa torre de 125px. Numa fortaleza de 148px o mesmo número vira TERREMOTO: sobe
   * e desce um sexto da própria altura. 8px lê como sustentação por propulsor — a massa aparece
   * na lentidão, não no percurso.
   */
  private static readonly BOB = 8;

  /**
   * Boca do canhão, em px a partir do CENTRO do sprite JÁ ESCALADO — e IGUAL nas duas artes: o
   * `create_object_state` só trocou a base (pedra → propulsores), o cano de gatling ficou no
   * mesmo lugar. Remedida nos dois PNGs da torre remodelada (`scripts/_medir-boss.mjs`): a ponta
   * do cano começa em x=15, linhas 23..31, num quadro 200×198 de centro (100, 99) — logo
   * (−85, −72) em px de arte, ×SCALE. As duas formas deram o mesmo, então uma constante serve.
   *
   * Toda a arte da luta compartilha UMA caixa de recorte (`scripts/install-boss-fight.mjs`): as
   * trocas de textura (pousada ↔ decolagem ↔ ar) não podem deslocar a fortaleza, e o clarão do
   * disparo + os estilhaços da decolagem alargam a caixa — recortar cada forma em separado
   * moveria o centro. É por isso que MUDAR A LISTA DE QUADROS do install OBRIGA a remedir estes
   * números: a caixa é a união de todos eles.
   */
  private static readonly MUZZLE_X = -64;
  private static readonly MUZZLE_Y = -54;

  /**
   * Para onde a arte do cometa APONTA, medida no PNG — não chutada (lição 13).
   *
   * O quadro (18×17) tem a bola sólida no canto inferior-direito (centro ≈ 11.7, 10.7) e a
   * cauda subindo para o superior-esquerdo: o vetor cauda→bola é ≈ +40° nos 8 quadros
   * (37°–44°, medido por centroide de cor). O código antigo assumia 0° ("aponta para a
   * direita") e a chama saía desalinhada do voo em TODOS os tiros — era este o desvio.
   */
  private static readonly COMET_ART_ANGLE = Phaser.Math.DegToRad(40);

  /** Raio da bola SÓLIDA do cometa (px do quadro), medido no PNG. A cauda não fere. */
  private static readonly COMET_CORE_RADIUS = 4.5;

  /**
   * O LEQUE, em números — e eles foram MEDIDOS, não estimados (`scripts/_probe-leque.mjs`
   * fotografa os cometas cruzando a coluna do jogador e imprime os vãos verticais).
   *
   * ─── POR QUE O NÚMERO DE TIROS ENCOLHEU (2026-08-09) ───
   *
   * A queixa do Henrique foi que o leque não deixava espaço, e com o flap isso vira punição.
   * A sonda deu razão a ele, e apontou o culpado exato: a fase POUSADA (5 tiros) abria vãos de
   * 41–44px, folgados para uma nave de ~14px; a fase AÉREA (7 tiros) abria 31px — e caía para
   * **15px** onde o tiro MIRADO cruzava o leque. 15px para uma nave de 14px não é uma esquiva
   * difícil, é uma esquiva que não existe: o flap sobe em degraus, não em milímetros.
   *
   * A correção tem duas partes, e a segunda importa mais que a primeira:
   *   1. A fase aérea desce de 7 para 5 tiros — o mesmo vão da fase pousada, que já estava bom.
   *   2. O tiro MIRADO sai de dentro do leque: ele passa a ser disparado `AIMED_DELAY` depois,
   *      não no mesmo frame. Somados, os dois padrões viravam uma parede; separados no TEMPO,
   *      cada um tem a sua janela de leitura — o leque é um problema de POSIÇÃO, o mirado é um
   *      problema de REAÇÃO, e o jogador só resolve os dois se puder resolvê-los um de cada vez.
   */
  private static readonly FAN_GROUND = 5;
  private static readonly FAN_AIR = 5;
  /** Atraso do tiro mirado depois do leque. É o que impede os dois de virarem uma parede só. */
  private static readonly AIMED_DELAY = 400;

  /**
   * MÍSSEIS — o segundo padrão da luta, de leitura OPOSTA à do leque.
   *
   * ─── DE SALVA DE 4 PARA UM DE CADA VEZ (2026-08-09, pedido do Henrique) ───
   *
   * A salva antiga eram 4 mísseis em ângulos FIXOS: um leque lento. Ou seja, o mesmo problema
   * que o leque de cometas já apresentava, com outra arte — e a fase aérea passava a repetir a
   * pergunta em vez de fazer uma nova. Um míssil SOZINHO e MIRADO faz a pergunta que faltava.
   *
   * Ele mira a posição do jogador NO INSTANTE DO DISPARO e segue reto — não corrige o curso.
   * A diferença importa: um projétil que persegue de verdade não tem esquiva quando a
   * mobilidade é de flap, só dano garantido. Mirado no lançamento, a defesa existe e é clara —
   * **saia de onde você estava**. E é isso que o telégrafo compra tempo para fazer.
   */
  /** Lento de propósito: é o que dá tempo de SAIR do lugar depois de ver para onde ele aponta. */
  private static readonly MISSILE_SPEED = 70;
  /** Intervalo entre mísseis na fase aérea (a única que os tem). Era 4.5 para uma salva de 4. */
  private static readonly MISSILE_RATE_ENRAGED = 2.6;
  /**
   * Aviso antes do disparo. Míssil sem telégrafo é injusto mesmo não sendo teleguiado: o
   * jogador precisa do tempo de se REPOSICIONAR, que é a única defesa que ele admite.
   * Mesmo princípio da torre de solo (`TerrainSystem.TELEGRAPH`).
   */
  private static readonly MISSILE_TELEGRAPH = 0.65;
  /**
   * Quanto o leque fica CALADO depois que o míssil termina de carregar. Era 1.2 (silêncio total
   * de ~1.85s) quando o míssil vinha em salva de 4 a cada 4.5s. Agora que ele vem sozinho a
   * cada 2.6s, aquele silêncio comeria a maior parte da luta — 0.35 mantém o princípio (o
   * míssil SUBSTITUI o leque em vez de somar a ele) sem transformar a fase aérea em pausa.
   */
  private static readonly FAN_MUTE_AFTER = 0.35;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bullets: Phaser.Physics.Arcade.Group,
    /** As explosões da cena — a DECOLAGEM é contada por elas (ver `startTakeoff`). */
    private readonly fx: Fx,
    hp = 90,
  ) {
    this.hp = hp;
    this.maxHp = hp;
    // No corpo do construtor, não no campo: um inicializador de campo não enxerga um `static`
    // declarado abaixo dele (TS2729). Só conta de verdade depois da decolagem.
    this.missileCooldown = Boss.MISSILE_RATE_ENRAGED;

    this.sprite = scene.physics.add.sprite(GAME_WIDTH + 50, Boss.BASE_Y_GROUND, 'boss');

    // Só a ARTE real é grande demais para a tela. O placeholder procedural do BootScene
    // (`makeBoss`, 64×80) já nasce no tamanho certo — encolhê-lo o tornaria ilegível no
    // exato cenário em que ele existe, o de a arte não ter carregado.
    if (scene.textures.get('boss').source[0].width > 100) this.sprite.setScale(Boss.SCALE);

    // ATRÁS da faixa de solo da frente (`groundFront`, depth −0.2), como os props (−0.5): é ela
    // que ENRAÍZA o pé da fortaleza no terreno na fase pousada. Sem isto, a base desenha por
    // cima da faixa e fica com a borda reta "colada" no chão — o mesmo defeito que a faixa
    // resolveu para silos e torres. As balas (18–40) e os efeitos (50) seguem à frente do boss,
    // e na fase aérea ele flutua acima da faixa, então a −0.3 não o oculta ali.
    this.sprite.setDepth(-0.3);

    // Entra POUSADA: o olho pulsa, mas os propulsores estão apagados (é a arte de solo). Se a
    // animação não existir, fica o sprite parado.
    if (scene.anims.exists('boss-idle')) this.sprite.play('boss-idle');

    this.body.setAllowGravity(false);
    // Derivada da textura, e o corpo Arcade escala junto com o sprite: a hitbox acompanha o
    // SCALE sem uma segunda conta aqui.
    this.body.setSize(this.sprite.width * 0.7, this.sprite.height * 0.8);
    this.sprite.setData('boss', this);

    // Entra deslizando pela direita, POR VELOCIDADE — nunca por tween de posição.
    //
    // BUG CORRIGIDO: um tween em `sprite.x` não move um corpo Arcade. O tween escreve a
    // posição, o corpo a sobrescreve no mesmo frame, e o sprite fica onde o corpo está.
    // O tween ainda roda até o fim e dispara o onComplete — então o boss "chegava",
    // começava a atirar, mas continuava PARADO FORA DA TELA. Viam-se os tiros, não ele.
    this.body.setVelocityX(-Boss.ENTRY_SPEED);

    this.muzzleFx = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 160,
        speed: { min: 20, max: 90 },
        // Cone apontando para a ESQUERDA: é para onde o cano atira.
        angle: { min: 150, max: 210 },
        scale: { start: 2, end: 0 },
        tint: [COLORS.hotBright, COLORS.hot],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(50);

    // CARGA: faíscas convergindo PARA a boca (speed negativo = vindo de fora para dentro),
    // magenta da facção. Ler diferente do clarão de disparo é o ponto — uma é promessa,
    // a outra é consequência.
    this.chargeFx = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 220,
        speed: { min: -70, max: -30 },
        angle: { min: 150, max: 210 },
        scale: { start: 0, end: 1.8 },
        tint: [COLORS.enemyBright, 0xff6bd6],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(50);

    this.barBg = scene.add
      .rectangle(GAME_WIDTH / 2, 16, 160, 4, COLORS.enemyDark)
      .setDepth(100);
    this.bar = scene.add
      .rectangle(GAME_WIDTH / 2 - 80, 16, 160, 4, COLORS.enemyBright)
      .setOrigin(0, 0.5)
      .setDepth(101);
  }

  get isDead(): boolean {
    return this.dead;
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    if (this.dead) return;

    // Chegou à posição de combate: freia e a luta começa.
    if (this.entering) {
      if (this.sprite.x > Boss.STATION_X) return;

      this.body.setVelocityX(0);
      this.entering = false;
    }

    // DECOLANDO: imune e sem atacar. A subida é um tween em `sprite.y` (ver startTakeoff);
    // o corpo é ressincronizado ao fim. Nada de leque, nada de míssil no meio da transição.
    if (this.takingOff) return;

    this.t += dt;

    if (this.airborne) {
      // Só a fase AÉREA bobeia. A velocidade PERSEGUE a altura desejada em vez de ser a
      // derivada dela — integrar a derivada acumularia erro e o boss derivaria da altura de
      // repouso ao longo da luta.
      const targetY = Boss.BASE_Y_AIR + Math.sin(this.t * 0.8) * Boss.BOB;
      this.body.setVelocityY((targetY - this.sprite.y) * 6);

      // O míssil pode CALAR o leque (fanMute). Roda antes do leque para o mute do frame valer já.
      this.tickMissiles(dt, target);
    }

    if (this.fanMute > 0) {
      this.fanMute -= dt;
      // O leque não conta o cooldown enquanto calado: quando o silêncio acaba, ele recomeça do
      // zero, sem despejar uma leva represada de uma vez.
      this.cooldown = this.fanRate;
      return;
    }

    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    this.cooldown = this.fanRate;

    this.playFire();
    this.fan(this.airborne ? Boss.FAN_AIR : Boss.FAN_GROUND);

    // O MIRADO vem DEPOIS, não junto (ver AIMED_DELAY): disparado no mesmo frame, ele cruzava o
    // leque e fechava o vão para 15px. `target` é lido de novo no callback — mirar na posição
    // de 400ms atrás transformaria o atraso num tiro que erra de propósito.
    if (this.airborne) {
      this.scene.time.delayedCall(Boss.AIMED_DELAY, () => {
        if (this.dead || this.takingOff || !this.sprite.active || !target.active) return;
        this.aimed(target);
        const a = this.muzzle;
        this.muzzleFx.explode(4, a.x, a.y);
      });
    }

    // Clarão na boca do cano, além do recuo do sprite.
    const m = this.muzzle;
    this.muzzleFx.explode(6, m.x, m.y);
    this.scene.cameras.main.shake(60, 0.003);
  }

  /**
   * Compasso do leque. A fase aérea era 1.1s com 7 tiros; com 5 tiros ela pode respirar um
   * pouco mais sem perder a pressão — o que aperta a fase aérea agora é o míssil mirado, não a
   * quantidade de cometa na tela.
   */
  private get fanRate(): number {
    return this.airborne ? 1.35 : 1.9;
  }

  /**
   * O relógio da salva: CARREGA (telegrafado), depois DISPARA.
   *
   * O tint pulsante é reaplicado a cada frame de propósito — o flash branco de dano
   * (`damage`) agenda um `setTint(baseTint)` 60ms depois e apagaria o aviso no meio da
   * carga. Reescrevendo todo frame, o telégrafo sobrevive a levar tiro.
   */
  private tickMissiles(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    if (this.missileCharge > 0) {
      this.missileCharge -= dt;

      // setTint, NÃO setTintFill: `tintFill` apagaria a arte e a torre viraria um bloco
      // sólido — o mesmo motivo documentado no flash de dano.
      this.sprite.setTint(Math.floor(this.missileCharge * 24) % 2 === 0 ? 0xffb0f0 : 0xff40c0);

      const m = this.muzzle;
      this.chargeFx.emitParticleAt(m.x, m.y);

      if (this.missileCharge <= 0) {
        this.sprite.setTint(this.baseTint);
        this.launchMissile(target);
      }
      return;
    }

    this.missileCooldown -= dt;
    if (this.missileCooldown > 0) return;

    this.missileCooldown = Boss.MISSILE_RATE_ENRAGED;
    this.missileCharge = Boss.MISSILE_TELEGRAPH;
    // O míssil TOMA o compasso: cala o leque pelo telégrafo inteiro + o rescaldo. É aqui, no
    // início da carga, que o silêncio começa — o jogador vê o telégrafo já sabendo que o leque
    // parou, e lê o míssil sem cometas no meio.
    this.fanMute = Boss.MISSILE_TELEGRAPH + Boss.FAN_MUTE_AFTER;
  }

  /**
   * UM míssil, mirado em ONDE O JOGADOR ESTÁ neste instante — e depois reto, sem correção.
   *
   * A esquiva é SAIR DO LUGAR, e é por isso que ele é lento (MISSILE_SPEED) e telegrafado: as
   * duas coisas existem para dar tempo de fazer exatamente isso. Corrigir o curso no meio do
   * voo tiraria a única defesa que a mobilidade de flap permite — ver o bloco de MISSILE_SPEED.
   */
  private launchMissile(target: Phaser.Physics.Arcade.Sprite): void {
    const m = this.muzzle;
    const angle = Phaser.Math.Angle.Between(m.x, m.y, target.x, target.y);

    const b = this.bullets.get(m.x, m.y) as Phaser.Physics.Arcade.Sprite | null;
    if (b) {
      b.setActive(true).setVisible(true);
      b.body!.enable = true;

      // O slot pode vir de um cometa (que TOCA 'comet-burn'). O release() do pool já para a
      // animação, mas setTexture sem parar seria sobrescrito no frame seguinte pelo quadro
      // da animação — parar aqui torna a troca de figurino independente de quem veio antes.
      b.anims.stop();
      b.setTexture('missile').setScale(0.9).clearTint();
      b.setBlendMode(Phaser.BlendModes.NORMAL);

      // A marca que o TerrainSystem.tickMissileTrails procura. Ele varre `enemyBullets`, que
      // é EXATAMENTE este grupo (GameScene passa o mesmo a ambos), e roda todo frame antes do
      // boss — o rastro de exaustão sai de graça, sem emissor próprio aqui.
      b.setData('missile', true);

      // A arte do míssil aponta para a DIREITA, então o ângulo de voo é o giro direto
      // (diferente do cometa, cuja arte aponta a +40° — ver COMET_ART_ANGLE).
      b.setRotation(angle);

      // Hitbox em px de MUNDO (~16×7), compensando a escala visual: o corpo Arcade escala
      // junto com o sprite. Mesma conta da torre de solo (TerrainSystem.fireAt).
      b.body!.setSize(16 / 0.9, 7 / 0.9);

      // A CARÊNCIA de 16px do `enemyBulletHitCover` (GameScene) lê estes dois. Sem eles a
      // conta dá NaN, a comparação falha, e o míssil é absorvido pelo primeiro cenário que
      // encostar na boca — some no frame em que nasce.
      b.setData('ox', m.x);
      b.setData('oy', m.y);

      b.setVelocity(Math.cos(angle) * Boss.MISSILE_SPEED, Math.sin(angle) * Boss.MISSILE_SPEED);
    }

    this.muzzleFx.explode(10, m.x, m.y);
    this.scene.cameras.main.shake(90, 0.004);
  }

  /** Leque: cobre o espaço e obriga o jogador a se posicionar, não a reagir. */
  private fan(count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.DegToRad(150 + (i / (count - 1)) * 60);
      this.shoot(angle, 80);
    }
  }

  private aimed(target: Phaser.Physics.Arcade.Sprite): void {
    const m = this.muzzle;
    const angle = Phaser.Math.Angle.Between(m.x, m.y, target.x, target.y);
    this.shoot(angle, 130);
  }

  /** Recuo do cano + clarão na boca. Ao terminar, volta ao idle DA FASE (pousado ou no ar). */
  private playFire(): void {
    const fire = this.airborne ? 'boss-air-fire' : 'boss-fire';
    const idle = this.airborne ? 'boss-air-hover' : 'boss-idle';
    if (!this.scene.anims.exists(fire)) return;

    this.sprite.play(fire);
    this.sprite.once(`animationcomplete-${fire}`, () => {
      if (!this.dead && !this.takingOff && this.scene.anims.exists(idle)) this.sprite.play(idle);
    });
  }

  private get muzzle(): { x: number; y: number } {
    return {
      x: this.sprite.x + Boss.MUZZLE_X,
      y: this.sprite.y + Boss.MUZZLE_Y,
    };
  }

  private shoot(angle: number, speed: number): void {
    const m = this.muzzle;
    const b = this.bullets.get(m.x, m.y) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;

    b.setActive(true).setVisible(true);
    b.body!.enable = true;

    // Bola de fogo com rastro, ardendo. O tiro de um chefão tem que se anunciar como coisa
    // diferente da de um drone, senão o jogador não sabe o que priorizar.
    b.clearTint();

    if (this.scene.anims.exists('comet-burn')) {
      b.play('comet-burn');
      // Fase aleatória: projéteis do mesmo leque ardendo em uníssono parecem um só objeto.
      b.anims.setProgress(Math.random());
    } else {
      b.setTexture('comet');
    }

    b.setScale(1.1);
    b.setFlipX(false);
    // A arte NÃO aponta para a direita: o "para frente" dela é +40° (COMET_ART_ANGLE, medido
    // no PNG). Subtraí-lo alinha a bola com o vetor de velocidade e a chama fica ATRÁS do
    // movimento. Espelhar por cima disso inverteria duas vezes — flip fica sempre false.
    b.setRotation(angle - Boss.COMET_ART_ANGLE);

    // O corpo cobre só a BOLA, não a cauda de fogo. Um corpo Arcade NÃO gira com o sprite,
    // então o círculo é centrado no CENTRO do quadro (9, 8.5): girando, a bola orbita a ~3px
    // dele e o círculo a acompanha em qualquer direção. Antes o corpo era o retângulo 13×9
    // herdado do `bolt2` do pool, ancorado no canto superior-esquerdo — exatamente a CAUDA.
    // O EnemySystem.release() devolve o corpo padrão ao reciclar o slot.
    const body = b.body as Phaser.Physics.Arcade.Body;
    body.setCircle(
      Boss.COMET_CORE_RADIUS,
      b.width / 2 - Boss.COMET_CORE_RADIUS,
      b.height / 2 - Boss.COMET_CORE_RADIUS,
    );

    b.setData('ox', m.x);
    b.setData('oy', m.y);

    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  /** @returns true se este dano matou o boss. */
  damage(amount: number): boolean {
    // Invulnerável enquanto desliza para dentro da tela E durante a decolagem (o mesmo escudo
    // da troca de forma do Núcleo). Sem o primeiro, dá para matá-lo antes de ele aparecer,
    // atirando no vazio à direita (constatado no playtest).
    if (this.dead || this.entering || this.takingOff) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.bar.width = 160 * (this.hp / this.maxHp);

    // setTint, e NÃO setTintFill.
    //
    // `setTintFill` pinta o sprite inteiro de branco sólido — some com a arte. Num inimigo
    // pequeno isso é um piscar; num chefão de 150px apanhando 7 tiros por segundo (o flap
    // atira sozinho), ele passa a maior parte do tempo como um borrão branco.
    // `setTint` multiplica a cor: avermelha sem apagar o desenho.
    this.sprite.setTint(0xffa0a0);
    // Volta ao tint de REPOUSO, não a "sem tint": depois da fúria o repouso é o casco quente.
    this.scene.time.delayedCall(60, () => !this.dead && !this.takingOff && this.sprite.setTint(this.baseTint));

    // Cruzou 50% ainda pousada → DECOLA. Uma vez só (airborne trava a reentrada).
    if (!this.airborne && this.hp <= this.maxHp / 2) this.startTakeoff();

    if (this.hp > 0) return false;

    this.dead = true;
    this.body.setVelocity(0, 0);
    return true;
  }

  /**
   * A DECOLAGEM — a virada de fúria, uma vez só.
   *
   * É o beat central da luta e o eco da fase ("A Decolagem", GDD §7): a cidadela se ARRANCA do
   * chão e sobe nos propulsores. Enquanto isso ela é IMUNE e não ataca (mesmo escudo da troca de
   * forma do Núcleo), senão o jogador atravessaria a transição no dano.
   *
   * ─── QUEM CONTA O QUÊ (2026-08-09) ───
   *
   * A ANIMAÇÃO (`boss-takeoff`, 12 quadros) conta a transformação: a base pega fogo, racha, os
   * pedaços voam e a torre se levanta sobre as chamas. As EXPLOSÕES (pedido do Henrique) são a
   * força que a arranca — elas estouram FORA da silhueta, onde a animação não alcança, e é a
   * maior delas que cobre a troca para a silhueta quebrada da fase aérea (`SWAP_AT`). Uma sem a
   * outra já foi testada e faltava: só a animação não sacode a cena; só as explosões deixavam a
   * pedra intacta subindo no ar.
   *
   * O CÓDIGO faz a subida, com um tween em `sprite.y` do repouso pousado ao aéreo. Um tween em
   * `y` não moveria o CORPO Arcade (ele sobrescreve a posição todo frame — o bug documentado na
   * entrada), mas durante a decolagem o `update` retorna cedo e o corpo está parado; ao fim,
   * `body.reset` ressincroniza tudo.
   */
  private startTakeoff(): void {
    this.takingOff = true;
    // O casco fica QUENTE para o resto da luta (o aviso é o estado). Mas só um viés — não uma
    // repintura: com a torre remodelada (2026-08-09), 0xff9a6a virava o aço quase preto em cobre
    // enferrujado e apagava a linha dark sci-fi da arte. O que anuncia a fase aérea é a FORMA
    // (a cidadela de pedra vira bocais de propulsor), não a cor; ao tint sobra insinuar o calor.
    this.baseTint = 0xffd0bc;
    this.body.setVelocity(0, 0);

    if (this.scene.anims.exists('boss-takeoff')) {
      this.sprite.anims.stop();
      this.sprite.play('boss-takeoff');
    }

    const m = this.muzzle;
    this.muzzleFx.explode(24, m.x, m.y);
    this.chargeFx.explode(20, this.sprite.x, this.sprite.y);
    this.scene.cameras.main.shake(Boss.TAKEOFF_MS, 0.006);
    // 160ms, não 400: o clarão é o SOCO de abertura da virada. Esticado, ele lava a tela inteira
    // durante um terço da decolagem — e a decolagem agora tem uma cadeia de estouros para ser
    // VISTA. Um flash que cobre o que ele deveria anunciar trabalha contra si mesmo.
    this.scene.cameras.main.flash(160, 232, 60, 140);

    this.blowUpBase();

    this.scene.tweens.add({
      targets: this.sprite,
      y: Boss.BASE_Y_AIR,
      duration: Boss.TAKEOFF_MS,
      ease: 'Sine.easeInOut',
      onComplete: () => this.finishTakeoff(),
    });
  }

  /**
   * A CADEIA que arranca a fortaleza do chão.
   *
   * Os estouros andam DE BAIXO PARA CIMA: começam nos pilares (a base, que é o que precisa
   * ceder para ela subir) e sobem pelo corpo. A lista é de OFFSETS relativos ao centro do
   * sprite, lida no instante do disparo, porque o sprite está SUBINDO enquanto a cadeia toca
   * (um x/y fixo deixaria o fogo para trás).
   *
   * São QUATRO, não sete: com a animação de decolagem de volta, o fogo de dentro da silhueta já
   * é dela. Sete estouros por cima viravam uma cortina — o jogador via fumaça, não a fortaleza
   * se partindo. Estes quatro ficam nas BORDAS, onde a animação não pinta.
   */
  private blowUpBase(): void {
    // Offsets (dx, dy) a partir do CENTRO do sprite escalado. dy +73 é a base do conteúdo
    // (ver BASE_Y_GROUND); os últimos sobem pela lateral.
    const pontos: [number, number, number][] = [
      // dx, dy, tamanho (Fx.explode: ≤1.25 pequeno, ≤2 médio, >2 grande)
      [-52, 68, 1.8],
      [52, 72, 2.0],
      [-58, 26, 1.8],
      [56, 34, 1.6],
    ];

    const passo = Boss.TAKEOFF_MS / (pontos.length + 1);

    pontos.forEach(([dx, dy, tam], i) => {
      this.scene.time.delayedCall(Math.round(i * passo), () => {
        if (this.dead || !this.sprite.active) return;
        this.fx.explode(this.sprite.x + dx, this.sprite.y + dy, tam);
      });
    });

    // O ESTOURO GRANDE, no meio da subida: é ele que esconde o corte entre as duas artes.
    //
    // `explode(2.6)` e NÃO `explodeBig`: os dois usam a mesma sheet de 128px, mas o explodeBig
    // acende um flash de TELA INTEIRA junto. Aqui isso seria autossabotagem — o clarão apaga a
    // fortaleza no exato quadro em que ela troca de forma, que é o quadro que o jogador precisa
    // ver. A bola de fogo local cobre o corte; a tela continua legível ao redor dela.
    this.scene.time.delayedCall(Boss.SWAP_AT, () => {
      if (this.dead || !this.sprite.active) return;
      this.fx.explode(this.sprite.x, this.sprite.y + 30, 2.6);
      this.swapToAirArt();
    });
  }

  /**
   * Troca para a arte com propulsores. Parar a animação ANTES do setTexture (armadilha do
   * Núcleo: a animação sobrescreve a textura no quadro seguinte).
   *
   * Chamada de dentro da cadeia de explosões (debaixo do estouro grande) e, por garantia, de
   * novo no fim da decolagem — `airborne` já estar de pé faria a segunda chamada reiniciar a
   * animação de hover no meio, então ela é idempotente pelo próprio `anims.getName()`.
   */
  private swapToAirArt(): void {
    if (this.sprite.texture.key === 'bossAir' || this.sprite.anims.getName() === 'boss-air-hover') {
      return;
    }
    this.sprite.anims.stop();
    if (this.scene.anims.exists('boss-air-hover')) this.sprite.play('boss-air-hover');
    else this.sprite.setTexture('bossAir');
    this.sprite.setTint(this.baseTint);
  }

  /** Fim da decolagem: ressincroniza o corpo e volta a lutar. */
  private finishTakeoff(): void {
    if (this.dead) return;
    this.airborne = true;
    this.takingOff = false;

    this.swapToAirArt();

    // O tween moveu o sprite; o corpo estava parado no y de solo. Ressincroniza na altura aérea.
    this.body.reset(this.sprite.x, Boss.BASE_Y_AIR);
    this.body.setAllowGravity(false);
    this.body.setSize(this.sprite.width * 0.7, this.sprite.height * 0.8);

    // Recomeça os dois relógios do zero: a fase aérea não deve despejar leque + salva no frame
    // em que assume o controle.
    this.cooldown = 1.1;
    this.missileCooldown = Boss.MISSILE_RATE_ENRAGED;
    this.t = 0;
  }

  destroy(): void {
    this.sprite.destroy();
    this.bar.destroy();
    this.barBg.destroy();
    this.muzzleFx.destroy();
    this.chargeFx.destroy();
  }
}
