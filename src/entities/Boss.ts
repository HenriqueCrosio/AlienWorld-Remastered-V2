import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';

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
 * Duas fases: leque lento → leque rápido + rajada mirada. Simples de propósito:
 * é o primeiro boss do jogo e existe para ENSINAR a ler um padrão, não para punir.
 */
export class Boss implements StageBoss {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  private hp: number;
  private readonly maxHp: number;
  private cooldown = 2;
  private t = 0;
  private entering = true;
  private dead = false;

  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly bar: Phaser.GameObjects.Rectangle;
  /** UM emissor, reaproveitado. Criar um por tiro vaza memória. */
  private readonly muzzleFx: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Faíscas de CARGA dos tubos de míssil — sugam para dentro, o oposto do clarão de disparo. */
  private readonly chargeFx: Phaser.GameObjects.Particles.ParticleEmitter;
  /** O fogo dos propulsores sob a cidadela — o que sustenta a fortaleza no ar. */
  private readonly thrusterFx: Phaser.GameObjects.Particles.ParticleEmitter;

  /** Largura da esteira de fogo, um pouco menor que a base (148px) para nascer DENTRO dela. */
  private static readonly THRUSTER_SPAN = 116;
  /** Distância do centro do sprite até a boca dos propulsores (meia-altura 71, menos a saia). */
  private static readonly THRUSTER_Y = 62;

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
  /** O beat de virada da fúria toca UMA vez. */
  private ragedShown = false;

  /**
   * A FORTALEZA é grande demais para entrar por inteiro: o PNG tem 197×190 numa tela de
   * 384×216, ou seja 88% da altura. A 0.75 ela vira 148×143 — 14% mais alta que a torre
   * antiga (97×125), que é o salto de presença que a fatia pedia, mas ainda sobrando céu
   * acima e espaço de voo à esquerda.
   *
   * Reduzir o PNG no disco seria pior: reamostrar pixel art em 0.75 apaga a grade. Escalar no
   * render deixa o Phaser amostrar por vizinho-mais-próximo, e a arte sobrevive.
   */
  private static readonly SCALE = 0.75;

  /**
   * Altura de repouso e posição de combate — TODAS derivadas do sprite real, não herdadas.
   *
   * Com meia-altura de 71px (190×0.75/2), `BASE_Y = 128` põe o pé da cidadela em y≈199, logo
   * acima da linha de solo (`GROUND_Y = 206`): ela paira rente ao chão, que é o que os
   * propulsores da animação prometem. Meia-largura de 74px com `STATION_X = 304` deixa 6px de
   * margem à direita — o mesmo aperto da torre antiga.
   */
  private static readonly BASE_Y = GAME_HEIGHT - 88;
  private static readonly STATION_X = GAME_WIDTH - 80;
  private static readonly ENTRY_SPEED = 45;

  /**
   * Amplitude do bailado vertical.
   *
   * Eram 26px, calibrados para uma torre de 125px de altura. Numa fortaleza de 143px o mesmo
   * número deixa de ser "pairando" e vira TERREMOTO: a estrutura inteira sobe e desce um sexto
   * da própria altura. 8px é o que se lê como sustentação por propulsor — a massa aparece na
   * lentidão, não no percurso.
   */
  private static readonly BOB = 8;

  /**
   * Boca do canhão, em px a partir do CENTRO do sprite JÁ ESCALADO.
   * Medida no PNG instalado (primeiro pixel opaco do terço superior — o cano de gatling aponta
   * para a esquerda, em x=15, linhas 15..23 de um quadro 197×190 de centro 98.5,95), e então
   * multiplicada por SCALE. Não chutada: os −31/−39 antigos eram de outra arte e nasceriam
   * dentro da carapaça.
   *
   * Recalcular se o enquadramento mudar. As duas animações compartilham uma caixa única
   * (`scripts/install-anim-par.mjs` existe só para garantir isso): o clarão do disparo alarga
   * a caixa para a esquerda, e recortá-las em separado deslocaria o centro entre elas.
   */
  private static readonly MUZZLE_X = -63;
  private static readonly MUZZLE_Y = -57;

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
  private static readonly MISSILE_RATE = 6.5;
  /** Na fúria a salva vem mais junto — mas o telégrafo NÃO encolhe. */
  private static readonly MISSILE_RATE_ENRAGED = 4.5;
  /**
   * Aviso antes da salva. Míssil sem telégrafo é injusto mesmo não sendo teleguiado: o
   * jogador precisa do tempo de se REPOSICIONAR, que é a única defesa que a salva admite.
   * Mesmo princípio da torre de solo (`TerrainSystem.TELEGRAPH`).
   */
  private static readonly MISSILE_TELEGRAPH = 0.65;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly bullets: Phaser.Physics.Arcade.Group,
    hp = 90,
  ) {
    this.hp = hp;
    this.maxHp = hp;
    // No corpo do construtor, não no campo: um inicializador de campo não enxerga um `static`
    // declarado abaixo dele (TS2729).
    this.missileCooldown = Boss.MISSILE_RATE;

    this.sprite = scene.physics.add.sprite(GAME_WIDTH + 50, Boss.BASE_Y, 'boss');

    // Só a ARTE real é grande demais para a tela. O placeholder procedural do BootScene
    // (`makeBoss`, 64×80) já nasce no tamanho certo — encolhê-lo o tornaria ilegível no
    // exato cenário em que ele existe, o de a arte não ter carregado.
    if (scene.textures.get('boss').source[0].width > 100) this.sprite.setScale(Boss.SCALE);

    // Propulsores acesos e casco flutuando. Se a animação não existir, fica o sprite parado.
    if (scene.anims.exists('boss-hover')) this.sprite.play('boss-hover');

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

    // PROPULSORES. A arte não os traz: a fortaleza foi desenhada pousada, e as duas tentativas
    // de animar o "hover" no PixelLab devolveram estroboscópio (a estrutura inteira lavava de
    // branco e o olho magenta chegava a APAGAR — medido: luminância média oscilando entre 36 e
    // 88 contra 45 do quadro base). Então o fogo vem de partículas, que é como o resto do jogo
    // faz fogo — e assim ele se move de verdade, em vez de ciclar 9 quadros.
    //
    // Depth −1: atrás do casco. As chamas escapam POR BAIXO da base e o que entraria por dentro
    // da pedra fica escondido, que é exatamente o recorte certo.
    this.thrusterFx = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 320,
        speedY: { min: 55, max: 140 },
        speedX: { min: -14, max: 14 },
        scale: { start: 2.4, end: 0 },
        tint: [COLORS.enemyBright, 0xff6bd6, COLORS.hot],
        blendMode: 'ADD',
        // ~140 partículas/s numa esteira de 116px: menos que isto e o fogo vira poeira solta,
        // que lê como avaria e não como propulsão.
        frequency: 21,
        quantity: 3,
        emitZone: {
          type: 'random',
          source: new Phaser.Geom.Rectangle(-Boss.THRUSTER_SPAN / 2, 0, Boss.THRUSTER_SPAN, 4),
          // O mesmo cast do Interlude4Scene: a união EmitZoneData do Phaser não aceita o
          // literal inferido de um objeto solto.
        } as Phaser.Types.GameObjects.Particles.ParticleEmitterConfig['emitZone'],
      })
      .setDepth(-1);

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

  /** Fase 2 começa com metade da vida: o padrão acelera e ele passa a mirar. */
  private get enraged(): boolean {
    return this.hp <= this.maxHp / 2;
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    if (this.dead) return;

    // ANTES do `return` da entrada: a fortaleza entra deslizando, e uma entrada com os
    // propulsores apagados denunciaria que ela está sendo empurrada, não voando.
    this.thrusterFx.setPosition(this.sprite.x, this.sprite.y + Boss.THRUSTER_Y);

    // Chegou à posição de combate: freia e a luta começa.
    if (this.entering) {
      if (this.sprite.x > Boss.STATION_X) return;

      this.body.setVelocityX(0);
      this.entering = false;
    }

    this.t += dt;

    // Sobe e desce devagar: um alvo parado não é uma luta.
    //
    // A velocidade PERSEGUE a altura desejada em vez de ser a derivada dela. Integrar a
    // derivada acumularia erro e o boss iria derivando para fora da altura de repouso ao
    // longo da luta. Perseguir o alvo não deriva.
    const targetY = Boss.BASE_Y + Math.sin(this.t * 0.8) * Boss.BOB;
    this.body.setVelocityY((targetY - this.sprite.y) * 6);

    // Timer PRÓPRIO, fora do `cooldown` do leque: os dois padrões precisam se sobrepor em
    // ritmos diferentes. Amarrá-los ao mesmo relógio faria a salva cair sempre no mesmo
    // compasso do leque, e o jogador decoraria um padrão só em vez de dois.
    this.tickMissiles(dt);

    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    this.cooldown = this.enraged ? 1.1 : 1.9;

    this.playFire();
    this.fan(this.enraged ? 7 : 5);
    if (this.enraged) this.aimed(target);

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

    this.missileCooldown = this.enraged ? Boss.MISSILE_RATE_ENRAGED : Boss.MISSILE_RATE;
    this.missileCharge = Boss.MISSILE_TELEGRAPH;
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

  /** Recuo do cano + clarão na boca. Ao terminar, volta a flutuar. */
  private playFire(): void {
    if (!this.scene.anims.exists('boss-fire')) return;

    this.sprite.play('boss-fire');
    this.sprite.once('animationcomplete-boss-fire', () => {
      if (!this.dead && this.scene.anims.exists('boss-hover')) this.sprite.play('boss-hover');
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
    // Invulnerável enquanto desliza para dentro da tela. Sem isto dá para matá-lo
    // ANTES DE ELE APARECER, atirando no vazio à direita (constatado no playtest).
    if (this.dead || this.entering) return false;

    this.hp = Math.max(0, this.hp - amount);
    this.bar.width = 160 * (this.hp / this.maxHp);

    // setTint, e NÃO setTintFill.
    //
    // `setTintFill` pinta o sprite inteiro de branco sólido — some com a arte. Num inimigo
    // pequeno isso é um piscar; num chefão de 97×125 apanhando 7 tiros por segundo (o flap
    // atira sozinho), ele passa a maior parte do tempo como um borrão branco.
    // `setTint` multiplica a cor: avermelha sem apagar o desenho.
    this.sprite.setTint(0xffa0a0);
    // Volta ao tint de REPOUSO, não a "sem tint": depois da fúria o repouso é o casco quente.
    this.scene.time.delayedCall(60, () => !this.dead && this.sprite.setTint(this.baseTint));

    if (this.enraged && !this.ragedShown) this.showRage();

    if (this.hp > 0) return false;

    this.dead = true;
    this.body.setVelocity(0, 0);
    // Os propulsores morrem com ela: uma fortaleza destruída que segue com o fogo aceso
    // continuaria dizendo "estou voando" enquanto explode.
    this.thrusterFx.stop();
    return true;
  }

  /**
   * O BEAT da virada de fúria — uma vez só.
   *
   * Antes a segunda fase entrava em silêncio: o leque passava de 5 para 7 e a cadência caía
   * de 1.9s para 1.1s, e nada na tela dizia por quê. Um chefão que endurece sem avisar parece
   * inconsistente, não mais difícil. Aqui a torre SOBREAQUECE, e o casco fica quente para o
   * resto da luta (`baseTint`) — o aviso não é só o instante, é o estado.
   */
  private showRage(): void {
    this.ragedShown = true;
    this.baseTint = 0xff9a6a;

    const m = this.muzzle;
    this.muzzleFx.explode(24, m.x, m.y);
    this.chargeFx.explode(20, this.sprite.x, this.sprite.y);
    this.scene.cameras.main.shake(320, 0.008);

    // Estouro branco-quente e queda para o casco sobreaquecido. O `damage` que dispara esta
    // virada já agendou um `setTint(baseTint)` para daqui a 60ms — este tween começa DEPOIS
    // dele, senão o flash de dano cortaria o marco no meio.
    this.scene.time.delayedCall(70, () => {
      if (this.dead) return;
      this.sprite.setTint(0xffffff);
      this.scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 520,
        onUpdate: (tw) => {
          if (this.dead) return;
          const k = tw.getValue() ?? 0;
          this.sprite.setTint(
            Phaser.Display.Color.ObjectToColor(
              Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.ValueToColor(0xffffff),
                Phaser.Display.Color.ValueToColor(this.baseTint),
                100,
                k * 100,
              ),
            ).color,
          );
        },
        onComplete: () => !this.dead && this.sprite.setTint(this.baseTint),
      });
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.bar.destroy();
    this.barBg.destroy();
    this.muzzleFx.destroy();
    this.chargeFx.destroy();
    this.thrusterFx.destroy();
  }
}
