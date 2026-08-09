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
   * A FORTALEZA é grande demais para entrar por inteiro: o PNG tem 197×189 numa tela de
   * 384×216. A 0.75 ela vira 148×142 — bem mais alta que a torre antiga (97×125), o salto de
   * presença que a fatia pedia, ainda sobrando céu acima e espaço de voo à esquerda.
   *
   * Reduzir o PNG no disco seria pior: reamostrar pixel art em 0.75 apaga a grade. Escalar no
   * render deixa o Phaser amostrar por vizinho-mais-próximo, e a arte sobrevive.
   */
  private static readonly SCALE = 0.75;

  /**
   * As DUAS alturas de repouso, MEDIDAS nos PNGs (`scripts/_medir-boss.mjs`) — a base do
   * conteúdo está a 70px do centro escalado na forma pousada e a 67px na aérea (as duas artes
   * têm silhuetas diferentes embaixo: pedra × bocais de propulsor), então NÃO dá para usar um
   * número só:
   *   POUSADA: centro em 136 crava a base em ~206, a linha do solo (`GROUND_Y`). Plantada.
   *   NO AR:   centro em 113 põe a ponta das chamas em ~180 — 26px de vão sobre o chão, o
   *            mesmo vão de antes: é ele que a decolagem promete.
   */
  private static readonly BASE_Y_GROUND = 136;
  private static readonly BASE_Y_AIR = 113;
  /** Meia-largura da fortaleza (73px do centro escalado): `STATION_X = 306` deixa ~5px à direita. */
  private static readonly STATION_X = 306;
  private static readonly ENTRY_SPEED = 45;

  /** Duração da subida na decolagem. Tempo de a cadeia de estouros tocar inteira e ser LIDA. */
  private static readonly TAKEOFF_MS = 1300;

  /**
   * Quando a arte troca de pousada para aérea, dentro da subida. No MEIO, e não no fim: é ali
   * que o estouro grande cobre o corte, e é ali que a fortaleza está a meio caminho do chão —
   * trocar no fim faria a pedra viajar a subida inteira e sumir já parada, o que denuncia o corte.
   */
  private static readonly SWAP_AT = Boss.TAKEOFF_MS * 0.55;

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
   * do cano começa em x=15, linhas 7..27, num quadro 197×189 de centro (98.5, 94.5) — logo
   * (−83.5, −77.5) em px de arte, ×SCALE. As duas formas deram o mesmo, então uma constante serve.
   *
   * Toda a arte da luta compartilha UMA caixa de recorte (`scripts/install-boss-fight.mjs`): a
   * troca de textura (pousada ↔ ar) não pode deslocar a fortaleza, e o clarão do disparo + as
   * chamas alargam a caixa — recortar cada forma em separado moveria o centro.
   */
  private static readonly MUZZLE_X = -63;
  private static readonly MUZZLE_Y = -58;

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
   * SALVA DE MÍSSEIS — o segundo padrão da luta, de leitura OPOSTA à do leque.
   *
   * O leque é rápido e mirado: exige reação. A salva é lenta, larga e em ângulos FIXOS —
   * ela não persegue ninguém. Teleguiar mísseis num chefão que o jogador enfrenta preso ao
   * flap seria punição, não desafio: com a mobilidade limitada, um projétil que corrige o
   * curso não tem esquiva, só dano garantido. Sendo fixa, a salva vira um problema de
   * POSIÇÃO — o jogador lê as brechas do leque e se planta numa delas.
   */
  private static readonly MISSILE_COUNT = 4;
  /** Lento de propósito: é o que dá tempo de ler o leque inteiro antes que ele chegue. */
  private static readonly MISSILE_SPEED = 70;
  /** Intervalo entre salvas na fase aérea (a única que tem mísseis). */
  private static readonly MISSILE_RATE_ENRAGED = 4.5;
  /**
   * Aviso antes da salva. Míssil sem telégrafo é injusto mesmo não sendo teleguiado: o
   * jogador precisa do tempo de se REPOSICIONAR, que é a única defesa que a salva admite.
   * Mesmo princípio da torre de solo (`TerrainSystem.TELEGRAPH`).
   */
  private static readonly MISSILE_TELEGRAPH = 0.65;
  /**
   * Quanto o leque fica CALADO depois que a salva de mísseis termina de carregar. Somado ao
   * telégrafo (0.65), o leque some por ~1.85s em torno da salva: os mísseis a SUBSTITUEM em vez
   * de somarem, e a luta ganha o silêncio que a Torre não tinha (era o único chefão-metrônomo,
   * `docs/MAPA_TECNICO_BALANCEAMENTO.md`). Sem isto, cometa + míssil na mesma janela tornavam a
   * fase aérea intransponível.
   */
  private static readonly FAN_MUTE_AFTER = 1.2;

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

      // A salva pode CALAR o leque (fanMute). Roda antes do leque para o mute do frame valer já.
      this.tickMissiles(dt);
    }

    if (this.fanMute > 0) {
      this.fanMute -= dt;
      // O leque não conta o cooldown enquanto calado: quando o silêncio acaba, ele recomeça do
      // zero, sem despejar uma leva represada de uma vez.
      this.cooldown = this.airborne ? 1.1 : 1.9;
      return;
    }

    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    this.cooldown = this.airborne ? 1.1 : 1.9;

    this.playFire();
    this.fan(this.airborne ? 7 : 5);
    if (this.airborne) this.aimed(target);

    // Clarão na boca do cano, além do recuo do sprite.
    const m = this.muzzle;
    this.muzzleFx.explode(6, m.x, m.y);
    this.scene.cameras.main.shake(60, 0.003);
  }

  /**
   * O relógio da salva: CARREGA (telegrafado), depois DISPARA.
   *
   * O tint pulsante é reaplicado a cada frame de propósito — o flash branco de dano
   * (`damage`) agenda um `setTint(baseTint)` 60ms depois e apagaria o aviso no meio da
   * carga. Reescrevendo todo frame, o telégrafo sobrevive a levar tiro.
   */
  private tickMissiles(dt: number): void {
    if (this.missileCharge > 0) {
      this.missileCharge -= dt;

      // setTint, NÃO setTintFill: `tintFill` apagaria a arte e a torre viraria um bloco
      // sólido — o mesmo motivo documentado no flash de dano.
      this.sprite.setTint(Math.floor(this.missileCharge * 24) % 2 === 0 ? 0xffb0f0 : 0xff40c0);

      const m = this.muzzle;
      this.chargeFx.emitParticleAt(m.x, m.y);

      if (this.missileCharge <= 0) {
        this.sprite.setTint(this.baseTint);
        this.launchMissiles();
      }
      return;
    }

    this.missileCooldown -= dt;
    if (this.missileCooldown > 0) return;

    this.missileCooldown = Boss.MISSILE_RATE_ENRAGED;
    this.missileCharge = Boss.MISSILE_TELEGRAPH;
    // A salva TOMA o compasso: cala o leque pelo telégrafo inteiro + o rescaldo. É aqui, no
    // início da carga, que o silêncio começa — o jogador vê o telégrafo já sabendo que o leque
    // parou, e lê a salva sem cometas no meio.
    this.fanMute = Boss.MISSILE_TELEGRAPH + Boss.FAN_MUTE_AFTER;
  }

  /**
   * Leque LARGO e LENTO de mísseis em ângulos FIXOS — não mira o jogador (ver MISSILE_COUNT).
   *
   * O arco (140°–220°, com o eixo y crescendo para BAIXO) varre de baixo-à-esquerda até
   * cima-à-esquerda, mais aberto que o leque de fogo (150°–210°): as brechas entre os mísseis
   * são a esquiva, e elas precisam caber a nave.
   */
  private launchMissiles(): void {
    const m = this.muzzle;
    const n = Boss.MISSILE_COUNT;

    for (let i = 0; i < n; i++) {
      const angle = Phaser.Math.DegToRad(140 + (i / (n - 1)) * 80);

      const b = this.bullets.get(m.x, m.y) as Phaser.Physics.Arcade.Sprite | null;
      if (!b) continue;

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
   * ─── AS EXPLOSÕES SÃO O ARGUMENTO (2026-08-09, pedido do Henrique) ───
   *
   * A torre remodelada não tem animação de decolagem — as duas formas são artes SOLTAS, e sem
   * nada entre elas a troca de textura seria um corte seco: a cidadela de pedra virando um casco
   * de foguetes num quadro, sem motivo. A CADEIA DE ESTOUROS é o motivo. Ela quebra a base ao
   * longo de ~1s, e a troca de arte acontece DEBAIXO do maior estouro (`SWAP_AT`), que é o
   * truque de corte mais velho que existe: o olho não vê o que trocou porque estava vendo fogo.
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
   * Os estouros andam DE BAIXO PARA CIMA e de fora para dentro: começam nos pilares (a base, que
   * é o que precisa ceder para ela subir) e terminam no corpo. Cada um é sorteado dentro da
   * silhueta — a lista é de OFFSETS relativos ao centro do sprite, lida no instante do disparo,
   * porque o sprite está SUBINDO enquanto a cadeia toca (um x/y fixo deixaria o fogo para trás).
   *
   * O estouro do meio (`SWAP_AT`) é `explodeBig` e é o que cobre a troca de arte.
   */
  private blowUpBase(): void {
    // Offsets (dx, dy) a partir do CENTRO do sprite escalado. dy +70 é a base do conteúdo
    // (ver BASE_Y_GROUND); os últimos sobem para o casco.
    const pontos: [number, number, number][] = [
      // dx, dy, tamanho (Fx.explode: ≤1.25 pequeno, ≤2 médio, >2 grande)
      [-38, 66, 1.8],
      [34, 70, 2.0],
      [-8, 60, 1.6],
      [46, 44, 1.8],
      [-46, 30, 2.0],
      [12, 10, 1.6],
      [-20, -18, 1.8],
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
