import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import type { StageBoss } from './Boss';
import type { EnemySystem } from '../systems/EnemySystem';
import type { Fx } from '../systems/Fx';
import { TerrainSystem, GROUND_Y, TETO_Y } from '../systems/TerrainSystem';

/**
 * O CHEFÃO FINAL da Fase 4, em DUAS FORMAS (design do Henrique, 2026-07-19):
 *
 *   1. O GUARDIÃO (`guardiao.png`, arte criada POR ELE) — a besta blindada ENROLADA em volta
 *      da massa viva. Móvel: flutua, cospe glóbulos do bico e INVESTE telegrafado. A barriga
 *      vermelha é o alvo PERMANENTE — mas só quando ele está PARADO: em movimento, o corpo
 *      fecha inteiro. O ritmo dele é o do coração dito de outro jeito: mover = sístole.
 *   2. O CORAÇÃO BLINDADO (`nucleo.png`) — a casca morre, estoura, e o que ela protegia
 *      SURGE: sístole (fechado: parede, glóbulos, anticorpos) e diástole (aberto: a ferida
 *      BRILHA e ele fica quieto — a janela é a recompensa). Fases pela vida; paredes de
 *      corredor entram na luta da fase 2 em diante.
 *
 * É a estrutura da serpente (formas que trocam de arte) aplicada ao fim: o chefão final
 * cobra os quatro verbos da campanha — desviar (glóbulos/investida), abater (anticorpos),
 * anatomia (a janela), precisão (as paredes).
 *
 * ─── GEOMETRIA MEDIDA, NUNCA CHUTADA (lição 13; find-pad nos dois PNGs) ───
 *
 *  - GUARDIÃO (256×256, a arte nova de 15/09): massa vermelha em x=115..192, y=109..176
 *    (centroide ≈152,141 → offset +24,+13 do centro). Casca/bico à ESQUERDA na MESMA altura da
 *    massa — por isso o corpo-absorvedor cobre SÓ O DOMO SUPERIOR (a bala cruza o rebordo da
 *    casca sem morrer e cobra na massa; o mesmo pacto visual da faixa das cabeças da serpente).
 *  - CORAÇÃO (122×122): ferida em x=52..91, y=56..87 (offset +10,+10 do centro).
 */
export class BossNucleo implements StageBoss {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  /** O alvo vivo da forma atual (massa ou ferida). O teleguiado mira nele. */
  readonly targets: Phaser.Physics.Arcade.Sprite[];

  // Antes dos campos de instância que os usam (ordem de inicialização de classe).
  private static readonly HP_GUARDIAO = 90;
  private static readonly HP_CORACAO = 180;
  private static readonly HP_TOTAL = BossNucleo.HP_GUARDIAO + BossNucleo.HP_CORACAO;

  private forma: 'guardiao' | 'coracao' = 'guardiao';
  private hpGuardiao = BossNucleo.HP_GUARDIAO;
  private hpCoracao = BossNucleo.HP_CORACAO;
  private dead = false;
  private entering = true;
  private trocando = false;
  private t = 0;

  /** Guardião: máquina de estados do movimento. Parado = vulnerável; movendo = fechado. */
  private acao: 'flutua' | 'telegrafo' | 'investe' | 'volta' = 'flutua';
  private acaoT = 0;
  private cdTiro = 0;

  /** Coração: sístole/diástole. */
  private aberto = false;
  private cicloT = 0;
  private cdParede = 0;

  private readonly core: Phaser.Physics.Arcade.Sprite;
  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly bar: Phaser.GameObjects.Rectangle;
  private readonly glow: Phaser.GameObjects.Particles.ParticleEmitter;

  // ─── Guardião (256×256 a escala 0.7 ≈ 179×179) ───
  private static readonly G_ESCALA = 0.7;
  private static readonly G_STATION_X = GAME_WIDTH - 86;
  private static readonly G_BASE_Y = 104;
  /**
   * Centro da massa vermelha, em px do PNG a partir do centro do sprite (medido,
   * `scripts/_f4/_medir-guardiao.mjs`).
   *
   * ⚠️ E AGORA ELE VALE DURANTE A RESPIRAÇÃO TAMBÉM. A arte antiga tinha o estático em 256×227 e a
   * sheet em 256² alinhada no topo: com a sheet tocando (o tempo todo), o centro do quadro descia
   * 14,5px e o +31 medido no estático punha o alvo ~10px de tela ABAIXO do miolo desenhado. A arte
   * nova sai toda no mesmo quadro.
   */
  private static readonly G_CORE_OFF_X = 24;
  private static readonly G_CORE_OFF_Y = 13;
  /**
   * O bico (a boca dos glóbulos): a ponta do gancho da cabeça, em (34,172) do PNG.
   *
   * ⚠️ O ANTIGO (−100,−20) ERA "A OLHO" E CAÍA NO VAZIO: 64px acima da cabeça, fora do casco. O leque
   * saía do ar. Este ponto é medido, e baixa a origem dos glóbulos ~45px na tela.
   */
  private static readonly G_MUZZLE_X = -94;
  private static readonly G_MUZZLE_Y = 44;
  /** A morte na troca: 9 quadros a 9 q/s, o destruído, e o coração surge. Ver `trocarParaCoracao`. */
  private static readonly MORTE_MS = 1000;
  private static readonly TROCA_MS = 1500;
  private static readonly INVESTIDA_CADA = 6;
  private static readonly TELEGRAFO_DUR = 0.55;

  // ─── Coração (122×122 a escala 1.2) ───
  private static readonly C_ESCALA = 1.2;
  private static readonly C_STATION_X = GAME_WIDTH - 78;
  private static readonly C_BASE_Y = 108;
  private static readonly C_CORE_OFF_X = 10;
  private static readonly C_CORE_OFF_Y = 10;
  private static readonly ABERTO_DUR = [0, 3.2, 2.6, 2.2];
  private static readonly FECHADO_DUR = [0, 4.4, 3.8, 3.2];
  private static readonly CADENCIA = [0, 1.7, 1.4, 1.1];

  private static readonly ENTRY_SPEED = 40;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: EnemySystem,
    private readonly terrain: TerrainSystem,
    private readonly fx: Fx,
  ) {
    this.sprite = scene.physics.add.sprite(GAME_WIDTH + 120, BossNucleo.G_BASE_Y, 'guardiao');
    this.sprite.setScale(BossNucleo.G_ESCALA);
    this.sprite.setData('boss', this);

    // AS FORMAS VIVAS (sheets do PixelLab, 2026-07-21): o guardião RESPIRA (a massa vermelha
    // pulsa como um coração — mover = sístole, e agora até parado ele é órgão vivo) e o
    // coração BATE (a ferida acende e apaga no ritmo da janela). Sem a sheet, o estático de
    // sempre segura a luta (arte entra asset por asset). Yoyo: o pulso vai E VOLTA sem corte.
    // A âncora não precisa de compensação: a arte do guardião sai toda no mesmo quadro de 256²
    // (ver `G_CORE_OFF_X`), e a do coração foi medida a <3px do centro do estático.
    const anims = scene.anims;
    if (scene.textures.exists('guardiaoMorteSheet') && !anims.exists('guardiao-morte')) {
      anims.create({
        key: 'guardiao-morte',
        frames: anims.generateFrameNumbers('guardiaoMorteSheet', { start: 0, end: 8 }),
        frameRate: 9000 / BossNucleo.MORTE_MS,
        repeat: 0,
      });
    }
    if (scene.textures.exists('guardiaoIdleSheet') && !anims.exists('guardiao-idle')) {
      anims.create({
        key: 'guardiao-idle',
        frames: anims.generateFrameNumbers('guardiaoIdleSheet', { start: 0, end: 8 }),
        frameRate: 6,
        repeat: -1,
        yoyo: true,
      });
    }
    if (scene.textures.exists('nucleoBeatSheet') && !anims.exists('nucleo-beat')) {
      anims.create({
        key: 'nucleo-beat',
        frames: anims.generateFrameNumbers('nucleoBeatSheet', { start: 0, end: 8 }),
        frameRate: 7,
        repeat: -1,
        yoyo: true,
      });
    }
    if (anims.exists('guardiao-idle')) this.sprite.play('guardiao-idle');

    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    this.corpoDomo();
    body.setVelocityX(-BossNucleo.ENTRY_SPEED);

    this.core = scene.physics.add.sprite(this.sprite.x, this.sprite.y, 'spark');
    this.core.setVisible(false);
    const coreBody = this.core.body as Phaser.Physics.Arcade.Body;
    coreBody.setAllowGravity(false);
    // A massa medida (78×68 no PNG) na escala 0,7.
    coreBody.setSize(54, 48);
    this.targets = [this.core];

    this.glow = scene.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 260, max: 480 },
        speed: { min: 4, max: 18 },
        scale: { start: 0.9, end: 1.9 },
        alpha: { start: 0.55, end: 0 },
        tint: [0xffa040, 0xff6a2a, 0xffd447],
        blendMode: 'ADD',
        frequency: 85,
        emitting: false,
      })
      .setDepth(51);

    this.barBg = scene.add
      .rectangle(GAME_WIDTH / 2, 16, 160, 4, COLORS.enemyDark)
      .setDepth(100);
    this.bar = scene.add
      .rectangle(GAME_WIDTH / 2 - 80, 16, 160, 4, COLORS.enemyBright)
      .setOrigin(0, 0.5)
      .setDepth(101);

    this.acaoT = BossNucleo.INVESTIDA_CADA;
    this.cdTiro = 1.4;
  }

  get isDead(): boolean {
    return this.dead;
  }

  /** Fase do CORAÇÃO pela vida dele (1→2→3). O guardião tem fase única. */
  private get fase(): number {
    const f = this.hpCoracao / BossNucleo.HP_CORACAO;
    return f > 0.66 ? 1 : f > 0.33 ? 2 : 3;
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  /** Corpo = só o DOMO superior: a faixa do alvo fica de corredor livre para a bala. */
  private corpoDomo(): void {
    // Dimensões CONSTANTES, em px do quadro: `sprite.width/height` muda com a textura (o coração
    // tem estático de 122² e sheet de 128²), e o corpo cresceria junto.
    if (this.forma === 'guardiao') {
      // ⚠️ O DOMO ACABA ONDE A MASSA COMEÇA (y=109 no PNG): y=14..109, x=28..228. Mais baixo e ele
      // comeria o topo do alvo — a bala morreria no casco em cima do miolo aceso.
      this.body.setSize(200, 95);
      this.body.setOffset(28, 14);
    } else {
      this.body.setSize(122 * 0.78, 122 * 0.42);
      this.body.setOffset(122 * 0.11, 122 * 0.06);
    }
  }

  /** Corpo INTEIRO: a investida é toda perigo — e fecha o alvo (bala morre no casco). */
  private corpoInteiro(): void {
    // O casco inteiro do quadro de 256² (x=27..255, y=0..249), sem as pontas dos tentáculos.
    this.body.setSize(210, 190);
    this.body.setOffset(23, 18);
  }

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    if (this.dead || this.trocando) return;

    if (this.entering) {
      const alvo = this.forma === 'guardiao' ? BossNucleo.G_STATION_X : BossNucleo.C_STATION_X;
      this.posicionarCore();
      if (this.sprite.x > alvo) return;
      this.body.setVelocityX(0);
      this.entering = false;
    }

    this.t += dt;

    if (this.forma === 'guardiao') this.updateGuardiao(dt, target);
    else this.updateCoracao(dt, target);

    this.posicionarCore();
  }

  // ─── FORMA 1: o guardião ───────────────────────────────────────────────────

  private updateGuardiao(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    this.acaoT -= dt;

    switch (this.acao) {
      case 'flutua': {
        const alvoY = BossNucleo.G_BASE_Y + Math.sin(this.t * 0.7) * 16;
        this.body.setVelocityY((alvoY - this.sprite.y) * 6);

        // A barriga exposta BRILHA de leve: parado = vulnerável, e o brilho é o telégrafo.
        if (Math.random() < 0.35) this.glow.emitParticleAt(this.core.x, this.core.y);

        this.cdTiro -= dt;
        if (this.cdTiro <= 0) {
          this.cdTiro = 1.8;
          this.leque(3, this.gMuzzle());
          this.scene.cameras.main.shake(40, 0.002);
        }

        if (this.acaoT <= 0) {
          // TELEGRAFO: pisca e FECHA o corpo — quem ainda estiver na frente foi avisado.
          this.acao = 'telegrafo';
          this.acaoT = BossNucleo.TELEGRAFO_DUR;
          this.corpoInteiro();
          this.body.setVelocityY(0);
        }
        break;
      }

      case 'telegrafo': {
        this.sprite.setTint(Math.floor(this.acaoT * 24) % 2 === 0 ? 0xffd0d0 : 0xff6060);
        if (this.acaoT <= 0) {
          this.sprite.clearTint();
          this.acao = 'investe';
          // Investe NA ALTURA do jogador no instante do disparo — mirada no passado, não
          // teleguiada: dá para reagir saindo da linha (o mesmo pacto da cabeça ciano).
          this.body.setVelocity(-300, Phaser.Math.Clamp((target.y - this.sprite.y) * 1.2, -70, 70));
        }
        break;
      }

      case 'investe': {
        if (this.sprite.x < 70) {
          this.acao = 'volta';
          this.body.setVelocity(150, 0);
        }
        break;
      }

      case 'volta': {
        if (this.sprite.x >= BossNucleo.G_STATION_X) {
          this.sprite.x = BossNucleo.G_STATION_X;
          this.body.setVelocity(0, 0);
          const alvoY = BossNucleo.G_BASE_Y - this.sprite.y;
          this.body.setVelocityY(alvoY * 2);
          this.acao = 'flutua';
          this.acaoT = BossNucleo.INVESTIDA_CADA;
          this.cdTiro = 1.0;
          this.corpoDomo();
        }
        break;
      }
    }
  }

  private gMuzzle(): { x: number; y: number } {
    const e = BossNucleo.G_ESCALA;
    return {
      x: this.sprite.x + BossNucleo.G_MUZZLE_X * e,
      y: this.sprite.y + BossNucleo.G_MUZZLE_Y * e,
    };
  }

  /**
   * A TROCA: a casca MORRE, estoura — e o CORAÇÃO surge do estouro. O mesmo beat da serpente
   * pré-fusão: a pausa dramática É o telégrafo da forma nova.
   *
   * ⚠️ A MORTE É COMPOSTA NO MOTOR, e é decisão dele (15/09). Duas animações geradas convergiram no
   * mesmo limite do gerador: o miolo explode, mas o grosso da silhueta fica inteiro — e morte que
   * acaba com o cadáver intacto lê como "desligou". Então são três camadas:
   *   1. a `guardiao-morte` (o miolo estourando até ficar oco), 0 → `MORTE_MS`;
   *   2. as explosões do jogo subindo pela casca por cima dela, a mesma gramática de todo chefão;
   *   3. o `guardiaoDestruido` no fim, o único quadro em que o casco PARTE — com a detonação grande.
   * A carcaça some quando o coração surge, em `TROCA_MS`, como antes (ele escolheu não adiantar o B3).
   */
  private trocarParaCoracao(): void {
    this.trocando = true;
    this.body.setVelocity(0, 0);
    this.glow.emitting = false;
    this.sprite.clearTint();

    // ⚠️ `anims.stop()` ANTES de tocar a morte: a respiração está em yoyo e sobrescreveria o quadro.
    this.sprite.anims.stop();
    if (this.scene.anims.exists('guardiao-morte')) this.sprite.play('guardiao-morte');

    // As explosões do motor, espalhadas pelo CASCO (não pelo miolo, que a animação já estoura).
    const e = BossNucleo.G_ESCALA;
    for (let i = 0; i < 6; i++) {
      this.scene.time.delayedCall(80 + i * 150, () => {
        if (this.dead) return;
        this.fx.explode(
          this.sprite.x + Phaser.Math.Between(-90, 90) * e,
          this.sprite.y + Phaser.Math.Between(-70, 80) * e,
          1.6,
          52,
        );
      });
    }

    this.scene.time.delayedCall(BossNucleo.MORTE_MS, () => {
      if (this.dead) return;
      this.sprite.anims.stop();
      if (this.scene.textures.exists('guardiaoDestruido')) this.sprite.setTexture('guardiaoDestruido');
      this.fx.explodeBig(this.core.x, this.core.y, 1.1, 52);
    });

    this.scene.time.delayedCall(BossNucleo.TROCA_MS, () => {
      if (this.dead) return;

      this.forma = 'coracao';
      this.sprite.clearTint();
      // A troca de arte: para a animação do guardião ANTES de mexer na textura (armadilha 26:
      // a animação sobrescreve a textura no quadro seguinte). Com a sheet do coração, é ela
      // quem entra — o batimento É o telégrafo da forma nova.
      this.sprite.anims.stop();
      if (this.scene.anims.exists('nucleo-beat')) this.sprite.play('nucleo-beat');
      else this.sprite.setTexture('nucleo');
      this.sprite.setScale(BossNucleo.C_ESCALA);
      this.sprite.setPosition(BossNucleo.C_STATION_X, BossNucleo.C_BASE_Y);
      this.corpoDomo();
      this.body.reset(BossNucleo.C_STATION_X, BossNucleo.C_BASE_Y);

      (this.core.body as Phaser.Physics.Arcade.Body).setSize(40, 30);
      this.posicionarCore();

      // Surge FECHADO, num clarão: o jogador aprende a primeira diástole olhando.
      this.aberto = false;
      this.cicloT = BossNucleo.FECHADO_DUR[1];
      this.cdTiro = 0.9;
      this.glow.explode(14, this.sprite.x, this.sprite.y);
      this.scene.cameras.main.flash(500, 255, 140, 60);

      this.trocando = false;
    });
  }

  // ─── FORMA 2: o coração ────────────────────────────────────────────────────

  private updateCoracao(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    const alvoY = BossNucleo.C_BASE_Y + Math.sin(this.t * 0.6) * 18;
    this.body.setVelocityY((alvoY - this.sprite.y) * 6);

    if (this.aberto) {
      this.glow.emitParticleAt(this.core.x, this.core.y);
    }

    this.cicloT -= dt;
    if (this.cicloT <= 0) {
      this.aberto = !this.aberto;
      const f = this.fase;
      this.cicloT = this.aberto ? BossNucleo.ABERTO_DUR[f] : BossNucleo.FECHADO_DUR[f];

      if (this.aberto) {
        this.glow.emitting = true;
        this.glow.explode(10, this.core.x, this.core.y);
      } else {
        this.glow.emitting = false;
        const n = f === 3 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          this.enemies.spawn('drone', Phaser.Math.Between(46, 170));
        }
        this.cdTiro = 0.7;
      }
    }

    if (!this.aberto) {
      this.cdTiro -= dt;
      if (this.cdTiro <= 0) {
        const f = this.fase;
        this.cdTiro = BossNucleo.CADENCIA[f];
        this.leque(f === 3 ? 5 : 3, { x: this.core.x, y: this.core.y });
        if (f >= 2) this.mirado(target);
        this.scene.cameras.main.shake(50, 0.002);
      }
    }

    if (this.fase >= 2) {
      this.cdParede -= dt;
      if (this.cdParede <= 0) {
        this.cdParede = this.fase === 3 ? 5 : 6.5;
        this.parede(this.fase === 3 ? 84 : 92);
      }
    }
  }

  /** O alvo acompanha o corpo — `reset` (posição E posição-anterior, lição 3). */
  private posicionarCore(): void {
    const g = this.forma === 'guardiao';
    const e = g ? BossNucleo.G_ESCALA : BossNucleo.C_ESCALA;
    const ox = g ? BossNucleo.G_CORE_OFF_X : BossNucleo.C_CORE_OFF_X;
    const oy = g ? BossNucleo.G_CORE_OFF_Y : BossNucleo.C_CORE_OFF_Y;

    const x = this.sprite.x + ox * e;
    const y = this.sprite.y + oy * e;
    this.core.setPosition(x, y);
    (this.core.body as Phaser.Physics.Arcade.Body).reset(x, y);
  }

  /** Par de parede com vão garantido (a regra do roteiro; margem maior — luta parada). */
  private parede(gap: number): void {
    const margem = 34;
    const meio = gap / 2;
    const vaoY = Phaser.Math.Between(TETO_Y + margem + meio, GROUND_Y - margem - meio);

    // Dentro do Núcleo a parede é CARNE E METAL, não rocha: costela biônica com o mesmo
    // funil dos corredores da fase (a rocha tingida fica de fallback, ver GameScene).
    const organico = this.scene.textures.exists('costela');
    const TINT = 0x6b7894;
    const funil = (): number => Phaser.Math.Between(5, 11);
    const alturaChao = GROUND_Y - (vaoY + meio);
    const alturaTeto = vaoY - meio - TETO_Y;
    if (alturaChao >= 14) {
      this.terrain.spawn(organico ? 'costela' : 'spire', {
        alturaPx: alturaChao,
        ...(organico ? { angle: -funil() } : { tint: TINT }),
      });
    }
    if (alturaTeto >= 14) {
      this.terrain.spawn(organico ? 'costela' : 'spire', {
        anchor: 'teto',
        alturaPx: alturaTeto,
        ...(organico ? { angle: funil() } : { tint: TINT }),
      });
    }
  }

  private leque(n: number, boca: { x: number; y: number }): void {
    for (let i = 0; i < n; i++) {
      const angle = Phaser.Math.DegToRad(152 + (i / (n - 1)) * 56);
      this.gLobulo(angle, 100, boca);
    }
  }

  private mirado(target: Phaser.Physics.Arcade.Sprite): void {
    const angle = Phaser.Math.Angle.Between(this.core.x, this.core.y, target.x, target.y);
    this.gLobulo(angle, 135, { x: this.core.x, y: this.core.y });
  }

  /** O glóbulo (bolt3 laranja): as DUAS formas cospem o mesmo sangue — é o mesmo organismo. */
  private gLobulo(angle: number, speed: number, boca: { x: number; y: number }): void {
    const b = this.enemies.enemyBullets.get(boca.x, boca.y) as
      | Phaser.Physics.Arcade.Sprite
      | null;
    if (!b) return;

    b.setActive(true).setVisible(true);
    b.body!.enable = true;

    if (this.scene.textures.exists('bolt3')) b.setTexture('bolt3');
    b.setTint(0xffa040);
    b.setScale(1);
    b.setFlipX(false);
    b.setRotation(angle);

    b.setData('ox', boca.x);
    b.setData('oy', boca.y);
    b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  /**
   * O gate do dano é o ESTADO, e cada forma tem o seu: o guardião fecha ao MOVER (o corpo
   * inteiro absorve — este método nem é chamado); o coração fecha por PLACAS (chamado, e
   * devolve o retinir frio). A bala que chega aqui SEMPRE tocou o alvo — quem decide se
   * doeu é a forma.
   */
  damage(amount: number): boolean {
    if (this.dead || this.entering || this.trocando) return false;

    if (this.forma === 'guardiao') {
      this.hpGuardiao = Math.max(0, this.hpGuardiao - amount);
      this.atualizarBarra();

      this.sprite.setTint(0xffb090);
      this.scene.time.delayedCall(60, () => !this.dead && this.sprite.clearTint());

      if (this.hpGuardiao === 0) this.trocarParaCoracao();
      return false;
    }

    if (!this.aberto) {
      this.sprite.setTint(0xb8c2d4);
      this.scene.time.delayedCall(60, () => !this.dead && this.sprite.clearTint());
      return false;
    }

    this.hpCoracao = Math.max(0, this.hpCoracao - amount);
    this.atualizarBarra();

    this.sprite.setTint(0xffb090);
    this.scene.time.delayedCall(60, () => !this.dead && this.sprite.clearTint());

    if (this.hpCoracao > 0) return false;

    this.dead = true;
    this.body.setVelocity(0, 0);
    this.glow.emitting = false;
    return true;
  }

  /** UMA barra para as duas formas: a luta é uma só, e a barra é a promessa do tamanho dela. */
  private atualizarBarra(): void {
    this.bar.width = 160 * ((this.hpGuardiao + this.hpCoracao) / BossNucleo.HP_TOTAL);
  }

  destroy(): void {
    this.sprite.destroy();
    this.core.destroy();
    this.bar.destroy();
    this.barBg.destroy();
    this.glow.destroy();
  }
}
