import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCROLL_SPEED } from '../config';
import { Starfield } from '../Starfield';
import { Parallax } from '../Parallax';
import { resetVariantCache } from '../art';
import { pixelText } from '../ui';
import { Music } from '../systems/Music';
import { InputReader } from '../input';
import { Fx } from '../systems/Fx';
import { WeaponSystem } from '../systems/WeaponSystem';
import { EnemySystem, type EnemyKind } from '../systems/EnemySystem';
import { PickupSystem } from '../systems/PickupSystem';
import { TerrainSystem, GROUND_Y, TETO_Y, type PropKind } from '../systems/TerrainSystem';
import { DebrisSystem, MINE_BLAST_RADIUS, type HazardKind } from '../systems/DebrisSystem';
import { StageDirector, STAGES, type StageDef, type Zone } from '../systems/StageDirector';
import { Boss, type StageBoss } from '../entities/Boss';
import { BossCapitania } from '../entities/BossCapitania';
import { BossSerpente } from '../entities/BossSerpente';
import { BossNucleo } from '../entities/BossNucleo';
import { SHIPS, DEFAULT_SHIP } from '../ships';
import { resetBody, type ConduçãoId, type FlightController } from '../flight/FlightController';
import { FlapController } from '../flight/FlapController';
import { FreeController } from '../flight/FreeController';

/** Quem decide a condução: o mundo (`diegetico`) ou o jogador (modificadores). */
export type HandlingMode = 'diegetico' | 'flap' | 'free';

interface PendingWave {
  kind: EnemyKind;
  left: number;
  spacing: number;
  timer: number;
  y: number;
}

/**
 * O executor de uma fase — QUALQUER fase.
 *
 * Esta cena não conhece a Fase 1 nem a Fase 2: ela recebe uma `StageDef` e a executa. O que
 * muda entre fases é DADO (o roteiro, a zona, o chefão, o fundo), não código — foi o que
 * permitiu a Fase 2 entrar sem um único `if (fase === 2)` aqui dentro.
 *
 * A condução é uma PROPRIEDADE DO AMBIENTE: atmosfera tem gravidade → flap; vácuo não tem →
 * voo livre. A Fase 1 é jogada no flap (é o berço da condução, e é o Alien World v2) e a
 * atmosfera só rompe DEPOIS de matar a torre — a zero-G é a recompensa. A Fase 2 já começa
 * no vácuo: o jogador herda a zero-G que acabou de ganhar.
 */
export class GameScene extends Phaser.Scene {
  private ship!: Phaser.Physics.Arcade.Sprite;
  private terrain!: TerrainSystem;
  private debris!: DebrisSystem;
  private starfield!: Starfield;
  private parallax!: Parallax;
  private reader!: InputReader;
  private weapons!: WeaponSystem;
  private enemies!: EnemySystem;
  private pickups!: PickupSystem;
  private fx!: Fx;
  private director!: StageDirector;
  private boss: StageBoss | null = null;
  private stage!: StageDef;
  /** A nave escolhida na interlude. Ela DEFINE a arma base (src/ships.ts). */
  private shipId: string = DEFAULT_SHIP;

  private controller!: FlightController;
  private readonly controllers: Record<ConduçãoId, FlightController> = {
    flap: new FlapController(),
    free: new FreeController(),
  };

  private handling: HandlingMode = 'diegetico';
  private zone: Zone = 'atmosfera';
  /** Treino de chefão: pula direto para a luta e reinicia nela. */
  private practice = false;

  private hud!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  /** Calor e giro da HMG. Só aparecem quando a arma equipada tem cano giratório. */
  private heatBg!: Phaser.GameObjects.Rectangle;
  private heatBar!: Phaser.GameObjects.Rectangle;
  private spoolBar!: Phaser.GameObjects.Rectangle;

  private waves: PendingWave[] = [];
  private propRate = 0;
  private propMix: PropKind[] = [];
  private propTimer = 0;
  /** O mesmo par para os destroços flutuantes do vácuo (ver DebrisSystem). */
  private hazardRate = 0;
  private hazardMix: HazardKind[] = [];
  private hazardTimer = 0;
  /** Corredores da F4: pares chão+teto com vão garantido (evento `corredor`). */
  private corredorRate = 0;
  private corredorGap = 0;
  private corredorTimer = 0;
  private elapsed = 0;
  /** No treino o relógio começa adiantado; o score não deve herdar esse tempo. */
  private clockOffset = 0;
  private score = 0;
  /** Total JÁ FECHADO das fases anteriores — a campanha pontua em cadeia, não fase a fase. */
  private scoreBase = 0;
  private lives = 3;
  /** Bombas da vida atual (GDD §5: 3 por vida). `K` detona: limpa tiros e fere tudo na tela. */
  private bombs = 3;
  /** Tomou dano nesta fase? O bônus de no-hit é pago na vitória (GDD §8). */
  private tookDamage = false;
  private invulnerableUntil = 0;
  private over = false;

  constructor() {
    super('Game');
  }

  create(data: {
    stage?: number;
    handling?: HandlingMode;
    practice?: boolean;
    ship?: string;
    /** Total acumulado das fases anteriores (a campanha soma; a fase começa do checkpoint). */
    score?: number;
  }): void {
    // Fase desconhecida cai na 1: um link velho ou um `scene.start` errado não pode
    // derrubar o jogo numa tela preta.
    this.stage = STAGES[data.stage ?? 1] ?? STAGES[1];
    // A Fase 1 acontece ANTES da escolha, então ela é sempre a nave padrão.
    this.shipId = SHIPS[data.ship ?? ''] ? data.ship! : DEFAULT_SHIP;

    this.handling = data.handling ?? 'diegetico';
    this.practice = data.practice ?? false;
    // A ZONA VEM DA FASE. É ela que decide a condução no modo diegético — e é por isso que a
    // Fase 2 começa em voo livre sem que ninguém escolha nada.
    this.zone = this.stage.zone;
    this.boss = null;
    this.waves = [];
    this.propRate = 0;
    this.propMix = [];
    this.propTimer = 0;
    this.hazardRate = 0;
    this.hazardMix = [];
    this.hazardTimer = 0;
    this.corredorRate = 0;
    this.corredorGap = 0;
    this.corredorTimer = 0;
    this.elapsed = 0;
    this.clockOffset = 0;
    this.score = 0;
    this.scoreBase = data.score ?? 0;
    this.lives = 3;
    this.bombs = 3;
    this.tookDamage = false;
    this.invulnerableUntil = 0;
    this.over = false;

    // As texturas mudam entre execuções (arte entra asset por asset): o cache de variantes
    // não pode sobreviver a uma troca de cena.
    resetVariantCache();

    this.starfield = new Starfield(this);
    // O fundo é o LUGAR: com chão na atmosfera, sem chão nenhum no vácuo. A fase pode
    // SOBREPOR o modo (a Fase 3 é vácuo, mas abre DENTRO da nebulosa).
    this.parallax = new Parallax(
      this,
      this.stage.parallax ?? (this.zone === 'atmosfera' ? 'superficie' : 'espaco'),
    );
    this.reader = new InputReader(this);
    this.fx = new Fx(this);
    this.weapons = new WeaponSystem(this);
    this.enemies = new EnemySystem(this);
    this.pickups = new PickupSystem(this);

    // Os DOIS sistemas de obstáculo existem sempre; o roteiro da fase decide qual é alimentado
    // (`terrain` na superfície, `hazard` no vácuo). Um grupo vazio não custa frame nenhum, e
    // assim a montagem das colisões não precisa saber em que fase está.
    this.terrain = new TerrainSystem(this, this.enemies.enemyBullets);
    // A mina sensora estilhaça em TIROS INIMIGOS — daí o pool. Ela é a única coisa do cenário
    // que revida, e o estilhaço dela obedece às mesmas regras de qualquer tiro do inimigo
    // (acerta o jogador, morre na rocha).
    this.debris = new DebrisSystem(this, this.enemies.enemyBullets, (x, y) =>
      this.fx.explode(x, y, 1.6),
    );

    this.director = new StageDirector(this.stage.script);

    // TREINO: salta o relógio para 1s antes do chefão. Tudo o que viria antes é
    // descartado sem executar, então a fase começa no silêncio que o anuncia.
    if (this.practice) {
      this.elapsed = this.director.bossTime - 1;
      this.clockOffset = this.elapsed;
      this.director.skipTo(this.elapsed);
    }

    const nave = SHIPS[this.shipId];

    // A textura da nave escolhida — e a `ship` padrão enquanto a arte dela não existir. Uma
    // nave sem PNG cai na do Interceptor em vez de virar o quadrado verde do Phaser.
    const tex = this.textures.exists(nave.texture) ? nave.texture : 'ship';
    this.ship = this.physics.add.sprite(70, GAME_HEIGHT / 2, tex);

    // A ANIMAÇÃO É DA NAVE (róster v2): cada uma declara a sua em `ShipDef.anim`. Tocar a
    // animação de OUTRA nave substituiria a textura pelos quadros errados (a armadilha das
    // variantes de arte: ver src/art.ts) — por isso só toca se a textura equipada é a da nave.
    const anim = nave.anim ?? (tex === 'ship' ? 'ship-thrust' : undefined);
    if (anim && tex === nave.texture && this.anims.exists(anim)) this.ship.play(anim);
    else if (tex === 'ship' && this.anims.exists('ship-thrust')) this.ship.play('ship-thrust');

    // A NAVE É A ARMA. É aqui que a escolha da interlude vira jogo — e é `setBase`, não `equip`:
    // ao morrer, o jogador tem que voltar para a arma DELE, não para a Pulse.
    this.weapons.setBase(nave.weapon);
    this.ship.setCollideWorldBounds(true);
    // Hitbox menor que o sprite: perdoar é o que faz um shmup parecer justo.
    // Derivada da textura — a arte real (32×32) entra sem recalibrar.
    this.ship.body!.setSize(this.ship.width * 0.55, this.ship.height * 0.42);

    this.physics.add.overlap(this.ship, this.terrain.props, () => this.damageShip());
    this.physics.add.overlap(this.ship, this.debris.hazards, () => this.damageShip());
    this.physics.add.overlap(this.ship, this.enemies.enemies, () => this.damageShip());
    this.physics.add.overlap(this.ship, this.enemies.enemyBullets, (_s, b) => {
      this.enemies.release(b as Phaser.Physics.Arcade.Sprite);
      this.damageShip();
    });
    this.physics.add.overlap(this.weapons.bullets, this.terrain.props, (b, p) =>
      this.bulletHitProp(b as Phaser.Physics.Arcade.Sprite, p as Phaser.Physics.Arcade.Sprite),
    );
    this.physics.add.overlap(this.weapons.bullets, this.debris.hazards, (b, h) =>
      this.bulletHitHazard(b as Phaser.Physics.Arcade.Sprite, h as Phaser.Physics.Arcade.Sprite),
    );

    // O CENÁRIO É COBERTURA. Tiro inimigo bate na rocha e morre — então o pico que te
    // atrapalha também te protege. Sem isto, várias torres somadas viram uma parede de
    // balas impossível de desviar (constatado no playtest).
    //
    // Vale igual no vácuo: lá o destroço é a ÚNICA cobertura que existe, já que não há chão
    // nem relevo atrás do qual se esconder.
    this.physics.add.overlap(this.enemies.enemyBullets, this.terrain.props, (b, p) =>
      this.enemyBulletHitCover(b as Phaser.Physics.Arcade.Sprite, p as Phaser.Physics.Arcade.Sprite),
    );
    this.physics.add.overlap(this.enemies.enemyBullets, this.debris.hazards, (b, h) =>
      this.enemyBulletHitCover(b as Phaser.Physics.Arcade.Sprite, h as Phaser.Physics.Arcade.Sprite),
    );
    this.physics.add.overlap(this.weapons.bullets, this.enemies.enemies, (b, e) =>
      this.bulletHitEnemy(b as Phaser.Physics.Arcade.Sprite, e as Phaser.Physics.Arcade.Sprite),
    );
    this.physics.add.overlap(this.ship, this.pickups.pickups, (_s, p) =>
      this.collectPickup(p as Phaser.Physics.Arcade.Sprite),
    );

    // Faixa escura sob o HUD: com o parallax atrás, texto solto no topo some.
    this.add
      .rectangle(0, 0, GAME_WIDTH, 14, COLORS.bgDeep, 0.55)
      .setOrigin(0, 0)
      .setDepth(99);

    this.hud = pixelText(this, 4, 7, '', {
      size: 9,
      color: COLORS.metalLight,
      align: 'left',
    }).setDepth(100);

    this.banner = pixelText(this, GAME_WIDTH / 2, 76, '', {
      size: 13,
      color: COLORS.hotBright,
    })
      .setDepth(100)
      .setAlpha(0);

    // ─── O MEDIDOR DA MINI-GUN ───
    //
    // DUAS barras, porque são duas grandezas com sinais opostos e o jogador precisa lê-las de
    // relance: o CALOR (em cima, quente) é o que o ameaça; o GIRO (embaixo, ciano — a cor DELE)
    // é o que ele ganhou. Uma arma que trava sem que a tela tenha avisado é, para quem joga,
    // um bug — e o GDD proíbe punir quem não teve como enxergar.
    //
    // São RETÂNGULOS, não texto: a fonte do jogo não tem os glifos de bloco do Unicode, e a
    // primeira tentativa de barra em texto (na ficha das naves) saiu como caixas vazias.
    this.heatBg = this.add
      .rectangle(GAME_WIDTH - 60, 5, 56, 3, COLORS.metalDark)
      .setOrigin(0, 0.5)
      .setDepth(100)
      .setVisible(false);

    this.heatBar = this.add
      .rectangle(GAME_WIDTH - 60, 5, 56, 3, COLORS.hot)
      .setOrigin(0, 0.5)
      .setDepth(101)
      .setVisible(false);

    this.spoolBar = this.add
      .rectangle(GAME_WIDTH - 60, 10, 56, 2, COLORS.player)
      .setOrigin(0, 0.5)
      .setDepth(101)
      .setVisible(false);

    this.applyHandling(false);

    // No treino do chefão, a trilha certa é a dele — a fase nem chega a existir.
    Music.play(this, this.practice ? 'boss' : 'stage1');

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.scene.start('Menu'));

    if (import.meta.env.DEV) {
      // Pula da fase direto para o chefão, sem reiniciar.
      kb.on('keydown-G', () => {
        if (this.boss || this.over) return;
        this.elapsed = this.director.bossTime - 1;
        this.director.skipTo(this.elapsed);
        this.propRate = 0;
        this.hazardRate = 0;
        this.corredorRate = 0;
      });

      // Troca de arma. No treino você chega só com a PULSE (não passou pelos pickups),
      // e balancear o chefão contra a arma base mede o pior caso, não o caso real.
      kb.on('keydown-ONE', () => this.weapons.equip('pulse'));
      kb.on('keydown-TWO', () => this.weapons.equip('hmg'));
      kb.on('keydown-THREE', () => this.weapons.equip('shotgun'));
      // O ENXAME (a arma da nave alienígena). Sem este atalho, testá-la exige jogar a Fase 2
      // inteira e a cutscene da Doca a cada tentativa — e ela é a arma que MAIS precisa de
      // playtest: a curva de 150°/s é a única coisa que a separa de um "modo fácil".
      kb.on('keydown-FOUR', () => this.weapons.equip('enxame'));
    }
  }

  override update(time: number, delta: number): void {
    if (this.over) return;

    const dt = delta / 1000;
    this.elapsed += dt;

    this.starfield.update(dt);
    // No vácuo o fundo quase para: sem chão passando, uma nebulosa correndo denunciaria que a
    // "parada" é uma esteira. Mas a Fase 2 é jogada NO vácuo — lá o mundo tem que correr, ou o
    // cinturão inteiro pareceria pendurado. Só a Fase 1, que ROMPE a atmosfera no fim, freia.
    const frenagem = this.zone === 'vacuo' && this.stage.zone === 'atmosfera' ? 0.15 : 1;
    this.parallax.update(dt, SCROLL_SPEED * frenagem);

    // A APROXIMAÇÃO: a lua encolhe, o Leviatã cresce. Medida até o chefão — depois dele a fase
    // acabou, e o fundo não deve continuar "andando" durante a luta.
    this.parallax.setApproach(this.elapsed / this.director.bossTime);

    for (const e of this.director.update(this.elapsed)) this.runEvent(e);

    const body = this.ship.body as Phaser.Physics.Arcade.Body;
    const input = this.reader.read();
    this.controller.update(body, input);

    // A condução decide se o gatilho é manual ou automático. A arma não sabe a diferença.
    //
    // Os ALVOS da perseguição (a nave alienígena) saem daqui: inimigos vivos + o chefão. Rocha
    // NÃO entra — um projétil teleguiado que se joga no primeiro asteroide da frente seria uma
    // arma que se sabota sozinha, e o cinturão inteiro é feito de asteroides.
    this.weapons.update(
      dt,
      this.controller.autoFire || input.firing,
      this.ship.x + 10,
      this.ship.y,
      this.homingTargets(),
    );

    this.ship.setAngle(Phaser.Math.Clamp(body.velocity.y * 0.06, -25, 25));
    this.ship.setVisible(time > this.invulnerableUntil || Math.floor(time / 60) % 2 === 0);

    // A BOMBA é da cena, não da arma: funciona nas duas conduções (no flap o K está livre,
    // já que o gatilho é automático) e independe da arma equipada.
    if (input.bombPressed) this.useBomb();

    // O CHÃO MACHUCA. Sem isto, a estratégia ótima no flap é raspar no solo — o que
    // anula o obstáculo e o próprio sentido da condução.
    if (this.zone === 'atmosfera' && this.ship.y > GROUND_Y - 6) {
      this.ship.y = GROUND_Y - 7;
      body.setVelocityY(-120);
      this.damageShip();
    }

    this.spawnWaves(dt);
    this.spawnProps(dt);
    this.spawnCorredores(dt);
    this.spawnHazards(dt);
    this.terrain.update(dt, this.ship);
    // A mina sensora precisa saber ONDE o jogador está: é a proximidade dele que a acorda.
    this.debris.update(dt, this.ship);
    this.enemies.update(dt, this.ship);
    this.pickups.update();
    this.boss?.update(dt, this.ship);
    this.updateHud();
  }

  /**
   * Em quem o tiro teleguiado pode se agarrar.
   *
   * Só o que é ABATÍVEL E VIVO: inimigos e o chefão. Se a rocha entrasse aqui, a nave alienígena
   * gastaria a munição inteira dela no cinturão — e a arma que "nunca erra" passaria a nunca
   * acertar o que importa.
   *
   * Só é montada quando a arma equipada PERSEGUE: nas outras (a maioria do jogo) esta lista seria
   * um array descartado por frame, para nada.
   */
  private homingTargets(): Phaser.Physics.Arcade.Sprite[] {
    if (!this.weapons.current.homing) return [];

    const alvos = this.enemies.enemies
      .getChildren()
      .filter((e) => (e as Phaser.Physics.Arcade.Sprite).active) as Phaser.Physics.Arcade.Sprite[];

    // Chefão multi-parte (a serpente): o teleguiado caça as CABEÇAS, não o corpo — mirar no
    // casco que absorve tiro faria o Enxame se sabotar sozinho na única luta multi-alvo.
    if (this.boss && !this.boss.isDead) {
      alvos.push(...(this.boss.targets ?? [this.boss.sprite]));
    }

    return alvos;
  }

  // ─── Roteiro ────────────────────────────────────────────────────────────────

  private runEvent(e: ReturnType<StageDirector['update']>[number]): void {
    switch (e.type) {
      case 'wave':
        this.waves.push({ kind: e.kind, left: e.count, spacing: e.spacing, timer: 0, y: e.y });
        break;
      case 'terrain':
        this.propRate = e.rate;
        this.propMix = e.mix;
        break;
      case 'hazard':
        this.hazardRate = e.rate;
        this.hazardMix = e.mix;
        break;
      case 'corredor':
        this.corredorRate = e.rate;
        this.corredorGap = e.gap;
        break;
      case 'banner':
        this.showBanner(e.text, COLORS.hotBright);
        break;
      case 'nebula':
        // Entrar é instantâneo (a fase JÁ ABRE dentro da nuvem — o construtor nasce denso);
        // SAIR é um fade longo: é a virada de ato, e ela tem que ser vista acontecendo.
        this.parallax.setNebulaDensity(e.density, e.density >= 1 ? 0 : 6000);
        break;
      case 'miniboss':
        // A aranha do casco (Fase 3, Ato 2). Um inimigo do roteiro, não um StageBoss: a fase
        // continua correndo por baixo dela — chefão de verdade só há um por fase.
        this.enemies.spawn('aranha', 0);
        break;
      case 'boss':
        this.spawnBoss();
        break;
    }
  }

  private spawnWaves(dt: number): void {
    for (const w of this.waves) {
      w.timer -= dt;
      if (w.timer > 0 || w.left <= 0) continue;

      this.enemies.spawn(w.kind, Phaser.Math.Clamp(w.y + Phaser.Math.Between(-12, 12), 16, GAME_HEIGHT - 40));
      w.left--;
      w.timer = w.spacing;
    }

    this.waves = this.waves.filter((w) => w.left > 0);
  }

  private spawnProps(dt: number): void {
    if (this.propRate <= 0 || this.propMix.length === 0) return;

    this.propTimer -= dt;
    if (this.propTimer > 0) return;

    this.propTimer = this.propRate;
    this.terrain.spawn(Phaser.Utils.Array.GetRandom(this.propMix));
  }

  /**
   * Os CORREDORES da Fase 4: um par chão+TETO por batida, com VÃO GARANTIDO.
   *
   * A altura do vão é sorteada e as duas colunas são derivadas DELA — nunca sorteadas
   * separadas: alturas independentes somam parede impassável, e corredor impassável não é
   * difícil, é roubado. O vão nunca encosta nas bordas (margem de 24px): um vão colado no
   * teto obrigaria a raspar a borda da tela, onde o jogador não vê o que vem.
   */
  private spawnCorredores(dt: number): void {
    if (this.corredorRate <= 0) return;

    this.corredorTimer -= dt;
    if (this.corredorTimer > 0) return;
    this.corredorTimer = this.corredorRate;

    const margem = 24;
    const meio = this.corredorGap / 2;
    const vaoY = Phaser.Math.Between(TETO_Y + margem + meio, GROUND_Y - margem - meio);

    // Coluna que não alcança 14px não lê como obstáculo — vira ruído no rodapé; pula-se.
    // Tint de interior: a mesma rocha da F1, vestida de crescimento escuro do casco — a
    // rocha branco-gelo da lua dentro do bicho gritava fora da paleta (revisão visual).
    const TINT_INTERIOR = 0x6b7894;
    const alturaChao = GROUND_Y - (vaoY + meio);
    const alturaTeto = vaoY - meio - TETO_Y;
    if (alturaChao >= 14) {
      this.terrain.spawn('spire', { alturaPx: alturaChao, tint: TINT_INTERIOR });
    }
    if (alturaTeto >= 14) {
      this.terrain.spawn('spire', { anchor: 'teto', alturaPx: alturaTeto, tint: TINT_INTERIOR });
    }
  }

  /** O mesmo relógio dos props, para os destroços do vácuo. */
  private spawnHazards(dt: number): void {
    if (this.hazardRate <= 0 || this.hazardMix.length === 0) return;

    this.hazardTimer -= dt;
    if (this.hazardTimer > 0) return;

    this.hazardTimer = this.hazardRate;
    this.debris.spawn(Phaser.Utils.Array.GetRandom(this.hazardMix));
  }

  // ─── Chefão ─────────────────────────────────────────────────────────────────

  private spawnBoss(): void {
    this.propRate = 0;
    this.hazardRate = 0;
    this.corredorRate = 0;

    // A trilha vira ANTES de o chefão aparecer na tela: a música é o primeiro aviso.
    Music.play(this, 'boss', 1200);

    // O PRIMEIRO PLANO SAI DE CENA no mesmo aviso. Durante a fase as silhuetas na frente da
    // nave são dificuldade; durante o chefão elas tapam a leitura dos padrões. Não volta
    // depois: matar o chefão encerra a fase (na superfície o breakAtmosphere já derruba o
    // terreno; no vácuo vem a vitória) — e um restart de cena reconstrói o Parallax do zero.
    this.parallax.setForegroundDimmed(true);

    // O chefão é uma propriedade da FASE. A cena só sabe que ele cumpre `StageBoss`.
    //
    // A Capitânia recebe o EnemySystem inteiro, não só o pool de projéteis: ela LANÇA os
    // kamikazes que perseguiram o jogador a fase toda — ela é o hangar deles.
    // A vida da TORRE subiu pouco (130 → 150), e de propósito. O que trivializava a luta não era
    // ela ter pouca vida — era a HMG entregar 18 tiros/s de graça (o nerf está no WeaponSystem).
    // Inflar a vida para consertar uma arma quebrada só faz a luta ficar LONGA para quem usa as
    // outras: quem está na Pulse já leva ~20s, e esses 20s não podem virar 30 por causa da HMG.
    // A luta da serpente é a CÉU LIMPO: na fase real a nuvem já foi embora no Ato 2, mas o
    // TREINO (skipTo) descarta o evento de saída sem executá-lo — sem esta garantia, o chefão
    // do treino lutava DENTRO da nebulosa e o do jogo real não (duas lutas diferentes).
    if (this.stage.parallax === 'nebulosa') this.parallax.setNebulaDensity(0, 800);

    this.boss =
      this.stage.id === 4
        ? new BossNucleo(this, this.enemies, this.terrain)
        : this.stage.id === 3
          ? new BossSerpente(this, this.enemies)
          : this.stage.id === 2
            ? new BossCapitania(this, this.enemies, 150)
            : new Boss(this, this.enemies.enemyBullets, 150);

    this.physics.add.overlap(this.ship, this.boss.sprite, () => this.damageShip());

    // ATENÇÃO À ORDEM. `overlap(grupo, sprite)` entrega os argumentos INVERTIDOS: o Phaser
    // roteia para spriteVsGroup, e o primeiro parâmetro do callback vira o SPRITE.
    // Escrito ao contrário, `bulletHitBoss` recebia o próprio boss e o devolvia ao pool de
    // projéteis (inativo, invisível, corpo desligado) — o boss sumia e nunca se movia.
    // Com o sprite PRIMEIRO, a ordem é determinística: (boss, projétil).
    if (this.boss.targets) {
      // CHEFÃO MULTI-PARTE (a serpente): o dano entra pelas HITBOXES da lista, e o CORPO
      // vira cobertura dele mesmo — absorve o tiro sem dano (invulnerável é telégrafo; o
      // jogador vê a fagulha morrer no casco e aprende a mirar na cabeça que brilha).
      for (const alvo of this.boss.targets) {
        this.physics.add.overlap(alvo, this.weapons.bullets, (_a, b) =>
          this.bulletHitBoss(b as Phaser.Physics.Arcade.Sprite),
        );
      }
      this.physics.add.overlap(this.boss.sprite, this.weapons.bullets, (_boss, b) =>
        this.bulletAbsorvedByBoss(b as Phaser.Physics.Arcade.Sprite),
      );
    } else {
      this.physics.add.overlap(this.boss.sprite, this.weapons.bullets, (_boss, b) =>
        this.bulletHitBoss(b as Phaser.Physics.Arcade.Sprite),
      );
    }

    this.showBanner(
      this.stage.id === 4
        ? 'O NÚCLEO DO LEVIATÃ'
        : this.stage.id === 3
        ? 'SERPENTE DO CASCO'
        : this.stage.id === 2
          ? 'CANHONEIRA-CAPITÂNIA'
          : 'TORRE DE DEFESA',
      COLORS.enemyBright,
    );
  }

  /**
   * O CORPO do chefão multi-parte absorve o tiro: sem dano, só a fagulha. O perfurante também
   * morre aqui — atravessar o chefão inteiro de graça faria da cabeça um alvo opcional.
   */
  private bulletAbsorvedByBoss(bullet: Phaser.Physics.Arcade.Sprite): void {
    if (!this.weapons.bullets.contains(bullet)) return;
    if (!bullet.active || !this.boss || this.boss.isDead) return;

    // Se a bala está na ZONA da cabeça, deixa o overlap da cabeça cobrar o dano — os dois
    // corpos se sobrepõem, e a ordem dos callbacks no mesmo frame não é garantida.
    for (const alvo of this.boss.targets ?? []) {
      if (
        alvo.active &&
        Phaser.Math.Distance.Between(bullet.x, bullet.y, alvo.x, alvo.y) < 22
      ) {
        return;
      }
    }

    this.weapons.release(bullet);
    this.fx.hit(bullet.x, bullet.y);
  }

  private bulletHitBoss(bullet: Phaser.Physics.Arcade.Sprite): void {
    // Rede de segurança contra a inversão de argumentos do Phaser: só devolve ao pool o
    // que REALMENTE saiu dele. Sem isto, um erro de ordem volta a "reciclar" o chefão.
    if (!this.weapons.bullets.contains(bullet)) return;
    if (!bullet.active || !this.boss || this.boss.isDead) return;

    this.weapons.release(bullet);
    this.fx.hit(bullet.x, bullet.y);

    if (this.boss.damage(bullet.getData('damage') as number)) this.killBoss();
  }

  private killBoss(): void {
    const boss = this.boss!;
    this.score += 2000;

    // Explosão em cadeia: um boss não morre num estouro só.
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 140, () => {
        this.fx.explode(
          boss.sprite.x + Phaser.Math.Between(-24, 24),
          boss.sprite.y + Phaser.Math.Between(-32, 32),
          1.4,
        );
      });
    }

    this.time.delayedCall(1200, () => {
      boss.destroy();
      this.boss = null;

      // Na SUPERFÍCIE, matar o chefão é o que rompe a atmosfera — a zero-G é a recompensa, e
      // a fase só termina depois de o jogador voar nela por alguns segundos (docs/GDD.md §3).
      // No VÁCUO não há atmosfera a romper: a fase acaba quando o chefão acaba.
      if (this.zone === 'atmosfera') this.breakAtmosphere();
      else this.time.delayedCall(1400, () => this.victory());
    });
  }

  // ─── O momento-assinatura ───────────────────────────────────────────────────

  /**
   * A torre caiu: a nave sobe, rompe a atmosfera, e a FÍSICA MUDA EM PLENO VOO.
   * A zero-G é a recompensa por vencer a fase, não um evento no meio dela.
   */
  private breakAtmosphere(): void {
    this.zone = 'vacuo';
    this.parallax.breakAtmosphere();
    this.applyHandling(true);

    this.showBanner('ATMOSFERA ROMPIDA · ZERO-G', COLORS.playerBright);
    this.cameras.main.shake(600, 0.01);
    this.cameras.main.flash(400, 180, 230, 255);

    // Alguns segundos de voo livre para o jogador SENTIR a diferença antes do fim da fase.
    this.time.delayedCall(6500, () => this.victory());
  }

  /**
   * A fase foi vencida. Daqui sai a INTERLUDE, OU a fase seguinte, OU a tela de fim.
   *
   * A cena não sabe o que é a Interlude — ela só sabe que a fase declarou uma. É isso que
   * permite a cutscene (pouso na capitânia → escolha de nave → implosão) entrar sem que nem a
   * Fase 1 nem a Fase 2 saibam que ela apareceu.
   *
   * IMPORTANTE: isto roda DEPOIS de `breakAtmosphere()` ter dado ao jogador vários segundos de
   * zero-G com o controle na mão. A cutscene continua o voo, não o substitui — a zero-G é a
   * recompensa por matar a Torre (decisão fechada nº 3), e nada pode atropelá-la.
   *
   * O TREINO (`B`) TAMBÉM SEGUE A CAMPANHA. Antes ele caía direto na tela de fim — e como o
   * treino é o único jeito rápido de chegar ao chefão, a cutscene ficou INALCANÇÁVEL: quem
   * apertava `B`, vencia e esperava a interlude via a tela de GameOver ("ESPAÇO repete o CHEFÃO").
   *
   * Vencer segue a campanha; MORRER continua repetindo a luta (a tela de fim cuida disso). O
   * laço de treino não se perde, e o que vem DEPOIS do chefão passa a ser testável.
   */
  private victory(): void {
    if (this.over) return;
    this.over = true;

    // O BÔNUS DE NO-HIT (GDD §8): cruzar a fase sem tomar um arranhão vale tanto quanto
    // meio chefão. É a recompensa do jogador disciplinado — e o que dá profundidade ao placar.
    if (!this.tookDamage) {
      this.score += 1000;
      this.showBanner('SEM DANO · +1000', COLORS.playerBright);
    }

    const { next, interlude } = this.stage;

    // ⚠️ A INTERLUDE ENTRA SEMPRE QUE EXISTE — mesmo com `next: null`. Antes o teste era
    // `next !== null`, e a FASE 4 (a final, sem fase seguinte) caía direto na tela de
    // vitória: a CUTSCENE FINAL era inalcançável. Só se vai direto para o GameOver quando
    // a fase NÃO declara interlude.
    if (interlude) {
      this.scene.start(interlude, {
        // A fase SEGUINTE (null na final — a Interlude4 sabe que não há próxima) e a
        // COMPLETADA (é com ela que a interlude final monta o GameOver).
        stage: next,
        stageDone: this.stage.id,
        handling: this.handling,
        // O total corrido viaja como `score`: a próxima fase soma o dela por cima (scoreBase).
        score: this.totalScore(),
        ship: this.shipId,
        // A interlude final entrega o GameOver — ela precisa do checkpoint e do treino
        // para montar o MESMO payload que esta cena montaria.
        practice: this.practice,
        baseScore: this.scoreBase,
      });
      return;
    }

    if (next !== null) {
      // A nave viaja junto. Sem isto a escolha morre na troca de cena e a Fase 3 devolveria o
      // jogador ao Interceptor — a interlude é quem SOBRESCREVE `ship`, ao ser escolhida.
      this.scene.start('Game', {
        stage: next,
        handling: this.handling,
        score: this.totalScore(),
        ship: this.shipId,
      });
      return;
    }

    this.scene.start('GameOver', {
      score: this.totalScore(),
      handling: this.handling,
      practice: this.practice,
      victory: true,
      // A fase COMPLETADA — a tela de vitória escreve o título com ela ("FASE 1 COMPLETA" era
      // texto fixo da era de fase única, e mentia em todo fim de campanha desde então).
      stage: this.stage.id,
      ship: this.shipId,
      baseScore: this.scoreBase,
    });
  }

  // ─── Condução ───────────────────────────────────────────────────────────────

  /** Resolve QUAL condução vale agora: o mundo decide, salvo modificador do jogador. */
  private applyHandling(inFlight: boolean): void {
    const id: ConduçãoId =
      this.handling === 'diegetico'
        ? this.zone === 'atmosfera'
          ? 'flap'
          : 'free'
        : this.handling;

    this.controller = this.controllers[id];

    const body = this.ship.body as Phaser.Physics.Arcade.Body;
    // Em voo, o momento é preservado: a física muda, a nave não para no ar.
    resetBody(body, inFlight);
    this.controller.setup(body);
  }

  // ─── Combate ────────────────────────────────────────────────────────────────

  private bulletHitProp(
    bullet: Phaser.Physics.Arcade.Sprite,
    prop: Phaser.Physics.Arcade.Sprite,
  ): void {
    if (!bullet.active || !prop.active) return;

    this.weapons.release(bullet);
    this.fx.hit(bullet.x, bullet.y);

    // Rocha é indestrutível (hp = Infinity): o tiro ricocheteia, e é só isso.
    const hp = (prop.getData('hp') as number) - (bullet.getData('damage') as number);
    if (!Number.isFinite(hp)) return;

    prop.setData('hp', hp);

    if (hp > 0) {
      // Flash de dano por setTint (multiplicativo), não setTintFill (branco sólido): num prop
      // grande como a base, o branco chapado apaga a arte inteira por 40ms.
      prop.setTint(0xffb0b0);
      this.time.delayedCall(40, () => prop.active && prop.clearTint());
      return;
    }

    this.fx.explode(prop.x, prop.y - prop.displayHeight / 2, 1.5);
    this.score += prop.getData('score') as number;
    prop.destroy();
  }

  /**
   * Tiro do jogador contra um destroço do cinturão.
   *
   * O asteroide MORRE — e é essa a diferença com a Fase 1. Na superfície o obstáculo se desvia
   * (o pico é indestrutível); no vácuo ele se ABATE. O destroço da frota, não: é massa morta,
   * grande demais para o canhão de um caça.
   */
  private bulletHitHazard(
    bullet: Phaser.Physics.Arcade.Sprite,
    hazard: Phaser.Physics.Arcade.Sprite,
  ): void {
    if (!bullet.active || !hazard.active) return;

    this.weapons.release(bullet);
    this.fx.hit(bullet.x, bullet.y);

    const hp = (hazard.getData('hp') as number) - (bullet.getData('damage') as number);
    // Destroço é indestrutível (hp = Infinity): o tiro ricocheteia, e é só isso.
    if (!Number.isFinite(hp)) return;

    hazard.setData('hp', hp);

    if (hp > 0) {
      // setTint (multiplicativo), NÃO setTintFill: o branco sólido apaga a arte da rocha.
      hazard.setTint(0xffb0b0);
      this.time.delayedCall(40, () => hazard.active && hazard.clearTint());
      return;
    }

    this.score += hazard.getData('score') as number;
    this.killHazard(hazard);
  }

  /** A MINA leva junto quem estiver perto. É isso que faz dela controle de espaço. */
  private killHazard(hazard: Phaser.Physics.Arcade.Sprite): void {
    const explode = this.debris.explodesOnDeath(hazard);
    const { x, y } = hazard;

    this.fx.explode(x, y, explode ? 2 : hazard.scale);
    hazard.destroy();

    if (!explode) return;

    this.cameras.main.shake(120, 0.006);

    // O RAIO fere de verdade — inclusive você. Matar uma mina colado nela é uma escolha ruim,
    // e o jogo tem que cobrar por ela, senão a mina é só um alvo que dá pontos.
    if (Phaser.Math.Distance.Between(x, y, this.ship.x, this.ship.y) <= MINE_BLAST_RADIUS) {
      this.damageShip();
    }
  }

  /**
   * Tiro INIMIGO contra o cenário: o cenário o absorve. Rocha, prédio ou destroço — o que
   * atrapalha o jogador também o protege.
   */
  private enemyBulletHitCover(
    bullet: Phaser.Physics.Arcade.Sprite,
    cover: Phaser.Physics.Arcade.Sprite,
  ): void {
    if (!bullet.active || !cover.active) return;

    // CARÊNCIA: o projétil só é absorvido depois de andar 16px.
    //
    // Sem isto, uma torre encostada numa rocha vizinha tem o tiro destruído no MESMO frame em
    // que ele nasce — o jogador vê a torre carregar, piscar, e nenhum projétil sair. Era isso
    // o "às vezes o tiro não sai".
    const dx = bullet.x - (bullet.getData('ox') as number);
    const dy = bullet.y - (bullet.getData('oy') as number);
    if (dx * dx + dy * dy < 16 * 16) return;

    this.fx.hit(bullet.x, bullet.y);
    this.enemies.release(bullet);
  }

  private bulletHitEnemy(
    bullet: Phaser.Physics.Arcade.Sprite,
    enemy: Phaser.Physics.Arcade.Sprite,
  ): void {
    if (!bullet.active || !enemy.active) return;

    // PERFURANTE: o projétil segue vivo, mas cada inimigo paga só 1× por projétil — sem o Set,
    // o overlap cobraria o mesmo inimigo todo frame e o dano 2 viraria dano infinito.
    const hits = bullet.getData('hits') as Set<Phaser.GameObjects.GameObject> | null;
    if (bullet.getData('pierce') === true && hits) {
      if (hits.has(enemy)) return;
      hits.add(enemy);
    } else {
      this.weapons.release(bullet);
    }
    this.fx.hit(bullet.x, bullet.y);

    const hp = (enemy.getData('hp') as number) - (bullet.getData('damage') as number);
    enemy.setData('hp', hp);

    if (hp > 0) {
      enemy.setTint(0xffb0b0);
      // Restaura o tint do TIPO: o inimigo já era tingido antes do flash.
      this.time.delayedCall(40, () => {
        if (enemy.active) enemy.setTint(enemy.getData('tint') as number);
      });
      return;
    }

    this.fx.explode(enemy.x, enemy.y, enemy.scale);
    this.score += enemy.getData('score') as number;
    this.pickups.maybeDrop(enemy.x, enemy.y, 0.18);
    enemy.destroy();
  }

  private collectPickup(p: Phaser.Physics.Arcade.Sprite): void {
    if (!p.active) return;

    this.weapons.equip(p.getData('weapon') as string);
    this.fx.hit(p.x, p.y);
    this.pickups.destroy(p);
  }

  /**
   * A BOMBA (K) — 3 por vida (GDD §5).
   *
   * É a válvula de escape para quando a tela fecha: limpa TODO tiro inimigo em voo, fere tudo
   * que vive na tela e dá 1s de i-frames. O dano (12) mata o miúdo e fere o sério sem virar
   * botão de vencer — um cargueiro (24) sobrevive, um chefão mal sente. Ela cobra pelo
   * estoque: acabou, acabou até perder a vida.
   */
  private useBomb(): void {
    if (this.over || this.bombs <= 0) return;
    this.bombs--;

    this.cameras.main.flash(220, 255, 232, 180);
    this.cameras.main.shake(280, 0.008);
    this.invulnerableUntil = Math.max(this.invulnerableUntil, this.time.now + 1000);
    this.fx.explode(this.ship.x + 14, this.ship.y, 1.8);

    // Todo tiro inimigo vira fagulha — a bomba é, antes de tudo, a resposta para a parede
    // de balas que não dá mais para desviar. Snapshot do array: o pool muda no meio do loop.
    for (const b of [
      ...this.enemies.enemyBullets.getChildren(),
    ] as Phaser.Physics.Arcade.Sprite[]) {
      if (!b.active) continue;
      this.fx.hit(b.x, b.y);
      this.enemies.release(b);
    }

    for (const e of [
      ...this.enemies.enemies.getChildren(),
    ] as Phaser.Physics.Arcade.Sprite[]) {
      if (!e.active) continue;
      const hp = (e.getData('hp') as number) - 12;
      e.setData('hp', hp);

      if (hp <= 0) {
        this.fx.explode(e.x, e.y, e.scale);
        this.score += e.getData('score') as number;
        this.pickups.maybeDrop(e.x, e.y, 0.18);
        e.destroy();
      } else {
        e.setTint(0xffb0b0);
        this.time.delayedCall(60, () => {
          if (e.active) e.setTint(e.getData('tint') as number);
        });
      }
    }

    if (this.boss && !this.boss.isDead && this.boss.damage(12)) this.killBoss();
  }

  private damageShip(): void {
    if (this.over || this.time.now < this.invulnerableUntil) return;

    this.lives--;
    this.invulnerableUntil = this.time.now + 1400;
    this.tookDamage = true;
    // 3 por vida (GDD §5): a vida nova vem com o estoque de bombas cheio.
    this.bombs = 3;

    // Perde a ESPECIAL ao tomar dano — o modelo Metal Slug (docs/GDD.md §5). Volta para a arma
    // da NAVE, não para a Pulse: devolver o jogador à arma de outra nave apagaria a escolha dele.
    this.weapons.equipBase();

    this.fx.explode(this.ship.x, this.ship.y, 1.4);
    this.cameras.main.flash(90, 255, 122, 168);

    if (this.lives <= 0) this.gameOver();
  }

  private gameOver(): void {
    this.over = true;

    this.ship.setVisible(false);
    (this.ship.body as Phaser.Physics.Arcade.Body).enable = false;
    this.fx.explode(this.ship.x, this.ship.y, 2.2);

    const final = this.totalScore();
    this.time.delayedCall(900, () =>
      this.scene.start('GameOver', {
        score: final,
        handling: this.handling,
        practice: this.practice,
        victory: false,
        // O RETRY é da fase, não da campanha (GDD §8): a tela de fim precisa saber de onde
        // o jogador caiu, com qual nave, e qual era o placar na ENTRADA da fase (checkpoint).
        stage: this.stage.id,
        ship: this.shipId,
        baseScore: this.scoreBase,
      }),
    );
  }

  // ─── HUD ────────────────────────────────────────────────────────────────────

  private totalScore(): number {
    const clock = this.elapsed - this.clockOffset;
    // A FASE pontua a sua (com o multiplicador da condução aplicado uma vez); a CAMPANHA é a
    // soma das fases — o multiplicador não pode incidir de novo sobre o que já foi multiplicado.
    return (
      this.scoreBase + Math.floor((this.score + clock * 10) * this.controller.scoreMultiplier)
    );
  }

  private showBanner(text: string, color: number): void {
    this.banner
      .setText(text)
      .setColor(Phaser.Display.Color.IntegerToColor(color).rgba)
      .setAlpha(1)
      .setScale(1);

    this.tweens.add({
      targets: this.banner,
      alpha: 0,
      scale: 1.12,
      duration: 1800,
      ease: 'Cubic.easeIn',
    });
  }

  private updateHud(): void {
    const w = this.weapons.current;
    const ammo = this.weapons.ammoLeft === null ? '--' : String(this.weapons.ammoLeft);
    const zona = this.zone === 'atmosfera' ? '1G' : '0G';

    // TRAVADA no lugar do nome da arma: a palavra é o aviso mais barato que existe, e a barra
    // sozinha exige que o jogador desvie o olho do centro da tela para entender por que parou.
    const nome = this.weapons.overheated ? 'TRAVADA' : w.name;

    this.hud.setText(
      `${zona} ${this.controller.label}   ${nome} ${ammo}   ${'♦'.repeat(Math.max(0, this.lives))}   B×${this.bombs}   ${this.totalScore()}`,
    );
    this.hud.setColor(this.controller.id === 'flap' ? '#ff8c1a' : '#3ee0f0');

    this.updateHeatGauge();
  }

  /** As barras de calor e giro da mini-gun. Escondidas para qualquer arma sem cano giratório. */
  private updateHeatGauge(): void {
    const spin = this.weapons.hasSpin;

    this.heatBg.setVisible(spin);
    this.heatBar.setVisible(spin);
    this.spoolBar.setVisible(spin);

    if (!spin) return;

    const heat = this.weapons.heatPct;

    // Largura zero deixa o Phaser desenhar o retângulo INTEIRO (a origem some com o corpo vazio),
    // e a barra fria apareceria cheia. Um pixel é o piso.
    this.heatBar.width = Math.max(1, 56 * heat);
    this.spoolBar.width = Math.max(1, 56 * this.weapons.spoolPct);

    // A cor é o telégrafo: âmbar tranquilo → amarelo (está perto) → magenta piscando (travou).
    // O magenta é a cor de PERIGO da paleta; ela grita a mesma coisa que o tiro inimigo.
    if (this.weapons.overheated) {
      this.heatBar.fillColor =
        Math.floor(this.time.now / 90) % 2 === 0 ? COLORS.enemyBright : COLORS.metalLight;
    } else {
      this.heatBar.fillColor = heat > 0.7 ? COLORS.hotBright : COLORS.hot;
    }
  }
}
