import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import type { StageBoss } from './Boss';
import type { EnemySystem } from '../systems/EnemySystem';
import type { Fx } from '../systems/Fx';
import type { TerrainSystem } from '../systems/TerrainSystem';
import { Predador } from './Predador';

/**
 * O CHEFÃO FINAL da Fase 4, em DUAS FORMAS (design do Henrique, 2026-07-19):
 *
 *   1. O GUARDIÃO (`guardiao.png`, arte criada POR ELE) — a besta blindada ENROLADA em volta
 *      da massa viva. Móvel: flutua, cospe glóbulos do bico e INVESTE telegrafado. A barriga
 *      vermelha é o alvo PERMANENTE — mas só quando ele está PARADO: em movimento, o corpo
 *      fecha inteiro. O ritmo dele é o do coração dito de outro jeito: mover = sístole.
 *   2. O PREDADOR (16/09, B3 — substitui o coração) — a casca morre numa explosão SANGRENTA e o
 *      que estava dentro dela SAI: urra, salta girando para a nave, e caça. Mora em `Predador.ts`;
 *      este arquivo fica com o guardião e a TROCA, e delega a luta da 2ª forma.
 *
 * ─── GEOMETRIA MEDIDA, NUNCA CHUTADA (lição 13; find-pad nos dois PNGs) ───
 *
 *  - GUARDIÃO (256×256, a arte nova de 15/09): massa vermelha em x=115..192, y=109..176
 *    (centroide ≈152,141 → offset +24,+13 do centro). Casca/bico à ESQUERDA na MESMA altura da
 *    massa — por isso o corpo-absorvedor cobre SÓ O DOMO SUPERIOR (a bala cruza o rebordo da
 *    casca sem morrer e cobra na massa; o mesmo pacto visual da faixa das cabeças da serpente).
 *  - PREDADOR: ver `Predador.MIOLO`.
 */
export class BossNucleo implements StageBoss {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  /** O alvo vivo da forma atual (massa ou ferida). O teleguiado mira nele. */
  readonly targets: Phaser.Physics.Arcade.Sprite[];

  // Antes dos campos de instância que os usam (ordem de inicialização de classe).
  private static readonly HP_GUARDIAO = 90;
  private static readonly HP_TOTAL = BossNucleo.HP_GUARDIAO + Predador.HP;

  /** Lida pela sonda (`probe-stage4`). */
  forma: 'guardiao' | 'predador' = 'guardiao';
  private hpGuardiao = BossNucleo.HP_GUARDIAO;
  /** A 2ª forma, depois da troca. A sonda lê o estado dela por aqui. */
  predador: Predador | null = null;
  /** A arma trava desde a vida do guardião zerar — antes de o predador existir. */
  private travaTroca = false;
  private dead = false;
  private entering = true;
  private trocando = false;
  private t = 0;

  /** Guardião: máquina de estados do movimento. Parado = vulnerável; movendo = fechado. */
  private acao: 'flutua' | 'telegrafo' | 'investe' | 'volta' = 'flutua';
  private acaoT = 0;
  private cdTiro = 0;

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
  /** A morte na troca: 9 quadros a 9 q/s, o destruído, e o coração surge. Ver `trocarParaPredador`. */
  private static readonly MORTE_MS = 1000;
  private static readonly TROCA_MS = 1500;
  private static readonly INVESTIDA_CADA = 6;
  private static readonly TELEGRAFO_DUR = 0.55;

  private static readonly ENTRY_SPEED = 40;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: EnemySystem,
    // O terreno era das PAREDES do coração; o predador não usa. Fica na assinatura da cena.
    _terrain: TerrainSystem,
    private readonly fx: Fx,
  ) {
    this.sprite = scene.physics.add.sprite(GAME_WIDTH + 120, BossNucleo.G_BASE_Y, 'guardiao');
    this.sprite.setScale(BossNucleo.G_ESCALA);
    this.sprite.setData('boss', this);

    // O GUARDIÃO RESPIRA (sheet do PixelLab): a massa vermelha pulsa como um coração — mover =
    // sístole, e até parado ele é órgão vivo. Sem a sheet, o estático segura a luta (arte entra
    // asset por asset). Yoyo: o pulso vai E VOLTA sem corte. A âncora não precisa de compensação:
    // a arte do guardião sai toda no mesmo quadro de 256² (ver `G_CORE_OFF_X`).
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

  get armaTravada(): boolean {
    return this.travaTroca || (this.predador?.armaTravada ?? false);
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  /** Corpo = só o DOMO superior: a faixa do alvo fica de corredor livre para a bala. */
  private corpoDomo(): void {
    // Dimensões CONSTANTES, em px do quadro de 256² (não `sprite.width/height`, que muda com a textura).
    // ⚠️ O DOMO ACABA ONDE A MASSA COMEÇA (y=109 no PNG): y=14..109, x=28..228. Mais baixo e ele
    // comeria o topo do alvo — a bala morreria no casco em cima do miolo aceso.
    this.body.setSize(200, 95);
    this.body.setOffset(28, 14);
  }

  /** Corpo INTEIRO: a investida é toda perigo — e fecha o alvo (bala morre no casco). */
  private corpoInteiro(): void {
    // O casco inteiro do quadro de 256² (x=27..255, y=0..249), sem as pontas dos tentáculos.
    this.body.setSize(210, 190);
    this.body.setOffset(23, 18);
  }

  update(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    // O predador roda até DEPOIS de morto (a luz apaga, o breu sai, a lava no ar segue caindo).
    if (this.predador) {
      this.predador.update(dt, target);
      return;
    }
    if (this.dead || this.trocando) return;

    if (this.entering) {
      const alvo = BossNucleo.G_STATION_X;
      this.posicionarCore();
      if (this.sprite.x > alvo) return;
      this.body.setVelocityX(0);
      this.entering = false;
    }

    this.t += dt;

    this.updateGuardiao(dt, target);

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
   * A TROCA: a casca MORRE — e o PREDADOR sai de dentro dela (B3, 16/09).
   *
   * ⚠️ A MORTE DO GUARDIÃO É COMPOSTA NO MOTOR, e é decisão dele (15/09). Duas animações geradas convergiram
   * no mesmo limite do gerador: o miolo explode, mas o grosso da silhueta fica inteiro. Então são camadas:
   *   1. a `guardiao-morte` (o miolo estourando até ficar oco), 0 → `MORTE_MS`;
   *   2. as explosões do jogo subindo pela casca por cima dela;
   *   3. o `guardiaoDestruido` + a EXPLOSÃO SANGRENTA + o SANGUE NA TELA em `MORTE_MS` (o pedido dele:
   *      *"fica imersivo e dá mais desvio para a transição"*) — a carcaça apaga sob o sangue;
   *   4. o predador em `TROCA_MS`, surgindo (ver `Predador.surgir`).
   * A arma trava JÁ no golpe fatal: a pausa dramática inteira é para olhar.
   */
  private trocarParaPredador(): void {
    this.trocando = true;
    this.travaTroca = true;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.glow.emitting = false;
    this.sprite.clearTint();

    // ⚠️ `anims.stop()` ANTES de tocar a morte: a respiração está em yoyo e sobrescreveria o quadro.
    this.sprite.anims.stop();
    if (this.scene.anims.exists('guardiao-morte')) this.sprite.play('guardiao-morte');

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
      this.explosaoSangrenta(this.core.x, this.core.y);
      this.sangueNaTela();
      this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: BossNucleo.TROCA_MS - BossNucleo.MORTE_MS });
    });

    this.scene.time.delayedCall(BossNucleo.TROCA_MS, () => {
      if (this.dead) return;
      this.forma = 'predador';
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setPosition(BossNucleo.G_STATION_X, BossNucleo.G_BASE_Y);
      this.body.reset(BossNucleo.G_STATION_X, BossNucleo.G_BASE_Y);
      this.predador = new Predador(this.scene, this.enemies, this.fx, this.sprite, this.core, () => this.atualizarBarra());
      this.travaTroca = false;
      this.trocando = false;
    });
  }

  /** O jorro: sangue escuro que sobe e CAI (gravidade), um flash vermelho e o tranco forte. */
  private explosaoSangrenta(x: number, y: number): void {
    const gotas = this.scene.add
      .particles(x, y, 'puff', {
        lifespan: { min: 700, max: 1400 },
        speed: { min: 70, max: 240 },
        angle: { min: 200, max: 340 },
        gravityY: 340,
        scale: { start: 1.6, end: 0.5 },
        alpha: { start: 0.95, end: 0.2 },
        tint: [0x5a0508, 0x7a0a0c, 0x3a0204, 0x9a1812],
        emitting: false,
      })
      .setDepth(53);
    gotas.explode(90);
    const nevoa = this.scene.add
      .particles(x, y, 'puff', {
        lifespan: { min: 500, max: 900 },
        speed: { min: 10, max: 60 },
        scale: { start: 3, end: 6 },
        // ⚠️ Escura demais (0x3a0204 a 0,7) ela lia como BURACOS PRETOS sobre a barriga dele (captura 16/09).
        alpha: { start: 0.35, end: 0 },
        tint: [0x8a1410, 0x6a0a0c],
        emitting: false,
      })
      .setDepth(52);
    nevoa.explode(26);
    this.scene.time.delayedCall(1600, () => {
      gotas.destroy();
      nevoa.destroy();
    });
    this.scene.cameras.main.flash(260, 140, 0, 0);
    this.scene.cameras.main.shake(500, 0.012);
  }

  /**
   * SANGUE NA TELA: manchas presas à câmera, por cima de tudo, que escorrem e somem ANTES de a arma destravar
   * — ninguém começa a luta olhando através do sangue. Desenhadas no motor (zero geração).
   */
  private sangueNaTela(): void {
    for (let v = 0; v < 3; v++) {
      const key = `sangueTela${v}`;
      if (this.scene.textures.exists(key)) continue;
      const g = this.scene.add.graphics();
      const cx = 48;
      const cy = 40;
      g.fillStyle(0x4a0306, 0.92);
      g.fillCircle(cx, cy, 16 + v * 3);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + v;
        const d = 14 + ((i * 7 + v * 5) % 16);
        g.fillCircle(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, 3 + ((i + v) % 4));
      }
      g.fillStyle(0x6a0a0c, 0.9);
      g.fillCircle(cx - 4, cy - 5, 8 + v);
      // As escorridas.
      g.fillStyle(0x4a0306, 0.9);
      for (let i = 0; i < 3; i++) g.fillRect(cx - 10 + i * 9 + v * 2, cy + 8, 3, 22 + ((i * 11 + v * 7) % 30));
      g.generateTexture(key, 96, 96);
      g.destroy();
    }
    for (let i = 0; i < 10; i++) {
      const img = this.scene.add
        .image(Phaser.Math.Between(10, 374), Phaser.Math.Between(4, 200), `sangueTela${i % 3}`)
        .setScrollFactor(0)
        .setDepth(95)
        .setScale(Phaser.Math.FloatBetween(0.6, 1.5))
        .setAngle(Phaser.Math.Between(-30, 30))
        .setAlpha(0.9);
      this.scene.tweens.add({
        targets: img,
        y: img.y + 18,
        alpha: 0,
        delay: Phaser.Math.Between(700, 1000),
        duration: 1100,
        ease: 'Sine.easeIn',
        onComplete: () => img.destroy(),
      });
    }
  }

  /** O alvo acompanha o corpo — `reset` (posição E posição-anterior, lição 3). */
  private posicionarCore(): void {
    const e = BossNucleo.G_ESCALA;
    const x = this.sprite.x + BossNucleo.G_CORE_OFF_X * e;
    const y = this.sprite.y + BossNucleo.G_CORE_OFF_Y * e;
    this.core.setPosition(x, y);
    (this.core.body as Phaser.Physics.Arcade.Body).reset(x, y);
  }

  private leque(n: number, boca: { x: number; y: number }): void {
    for (let i = 0; i < n; i++) {
      const angle = Phaser.Math.DegToRad(152 + (i / (n - 1)) * 56);
      this.gLobulo(angle, 100, boca);
    }
  }

  /** O glóbulo (bolt3 laranja) do bico do guardião. */
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
   * O gate do dano é o ESTADO: o guardião fecha ao MOVER (o corpo inteiro absorve — este método nem é
   * chamado); o predador decide o dele (o surgimento não fere, a recuperação dobra).
   */
  damage(amount: number): boolean {
    if (this.predador) {
      if (!this.predador.damage(amount)) return false;
      this.dead = true;
      return true;
    }
    if (this.dead || this.entering || this.trocando) return false;

    this.hpGuardiao = Math.max(0, this.hpGuardiao - amount);
    this.atualizarBarra();

    this.sprite.setTint(0xffb090);
    this.scene.time.delayedCall(60, () => !this.dead && this.sprite.clearTint());

    if (this.hpGuardiao === 0) this.trocarParaPredador();
    return false;
  }

  /** UMA barra para as duas formas: a luta é uma só, e a barra é a promessa do tamanho dela. */
  private atualizarBarra(): void {
    this.bar.width = 160 * ((this.hpGuardiao + (this.predador?.hp ?? Predador.HP)) / BossNucleo.HP_TOTAL);
  }

  destroy(): void {
    this.predador?.destroy();
    this.sprite.destroy();
    this.core.destroy();
    this.bar.destroy();
    this.barBg.destroy();
    this.glow.destroy();
  }
}
