import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import type { StageBoss } from './Boss';
import type { EnemySystem } from '../systems/EnemySystem';
import type { Fx } from '../systems/Fx';
import type { TerrainSystem } from '../systems/TerrainSystem';
import { Predador } from './Predador';
import { SerraGuardiao } from './SerraGuardiao';
import { afundarNaLava } from './fimDoPredador';
import { explosaoSangrenta, sangueNaTela } from './sangue';

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
  /** Do estouro final até a cutscene: o corpo no chão, o piso rachando e a lava subindo (ver `fimDoPredador`). */
  static readonly CORPO_FICA_MS = 4200;

  /** Lida pela sonda (`probe-stage4`). */
  forma: 'guardiao' | 'predador' = 'guardiao';
  private hpGuardiao = BossNucleo.HP_GUARDIAO;
  /** A 2ª forma, depois da troca. A sonda lê o estado dela por aqui. */
  predador: Predador | null = null;
  /** O estouro grande da troca (ver a fumaça em `trocarParaPredador`). */
  private estouro: Phaser.GameObjects.Sprite | null = null;
  /** A arma trava desde a vida do guardião zerar — antes de o predador existir. */
  private travaTroca = false;
  private dead = false;
  private entering = true;
  private trocando = false;
  private t = 0;

  /** Guardião: máquina de estados do movimento. Parado = vulnerável; movendo = fechado. */
  private acao: 'flutua' | 'telegrafo' | 'investe' | 'volta' | 'serra' = 'flutua';
  private acaoT = 0;
  private cdTiro = 0;
  /**
   * As duas skills se ALTERNAM (spec de 19/09). A investida empurra o jogador para as bordas; a salva
   * torna a borda cara; a serra é a ameaça de caminho fixo E a janela de dano. A dificuldade mora na
   * tensão entre elas, não em cada uma ficar mais rápida.
   */
  private proxima: 'serra' | 'investida' = 'serra';
  private serra: SerraGuardiao | null = null;
  /**
   * O que FERE por contato mas NÃO é alvo: a serra. Fica num grupo próprio justamente porque ninguém
   * registra as balas do jogador contra ele — é o que mantém a linha de tiro limpa na cravada.
   * A cena liga o `overlap` com a nave em `spawnBoss` (ver `StageBoss.perigos`).
   */
  readonly perigos: Phaser.Physics.Arcade.Group;

  private readonly core: Phaser.Physics.Arcade.Sprite;
  private readonly barBg: Phaser.GameObjects.Rectangle;
  private readonly bar: Phaser.GameObjects.Rectangle;
  private readonly glow: Phaser.GameObjects.Particles.ParticleEmitter;
  /**
   * O rastro dos glóbulos: UM emissor de cada família para TODOS eles (armadilha nº 5 — nunca um
   * emissor por bala). Quem decide de quem é o rastro é a TEXTURA do projétil, lida no laço: só a
   * `globuloGuardiao` deixa fumaça, e a bala volta limpa para o pool sozinha.
   */
  private readonly fumaca: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly brasa: Phaser.GameObjects.Particles.ParticleEmitter;
  /** A carga do telégrafo: o anel que FECHA no miolo antes da investida. */
  private readonly carga: Phaser.GameObjects.Particles.ParticleEmitter;
  private cargaT = 0;

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
  /**
   * ─── O RITMO, POR DEGRAU DE VIDA (19/09) ───
   * Mesma gramática do predador (66% e 33%), por consistência. **Nada de novo aparece nos degraus: o que
   * muda é o ritmo.** Os três ataques existem desde 100% — a serra precisa estar lá desde o começo,
   * porque é dela que sai a janela de dano.
   */
  private static readonly DEGRAUS = [0.66, 0.33];
  /** A pausa entre skills, por degrau. Era 6s fixos — e 6s de risco zero eram metade da queixa dele. */
  private static readonly PAUSA = [4.2, 3.4, 2.6];
  /** Quantos glóbulos por salva, por degrau. */
  private static readonly SALVA_N = [3, 4, 5];
  /** Quantas cravadas a serra dá antes de sair, por degrau. No último ela fica mais tempo na arena. */
  private static readonly SERRA_CRAVADAS = [2, 2, 3];
  /**
   * ⚠️ 0,55 → 0,7 (20/09). O aviso não era curto de mais para DESVIAR — era curto de mais para ser
   * LIDO: *"o aviso, que é a aceleração do core do guardião, precisa estar mais distinta"*. A
   * aceleração da respiração precisa de ~0,7s para subir de 1× a 5× e o olho perceber que subiu.
   * Voltar é um número: 0,55 devolve a janela antiga sem desfazer a linguagem nova.
   */
  private static readonly TELEGRAFO_DUR = 0.7;
  /** A respiração acelera de 1× até este fator ao longo do telégrafo — é ELE o aviso. */
  private static readonly TELEG_RESPIRO = 5;
  /** O tint do casco no telégrafo: FRIO. É o contrário do flash de dano (0xffb090), e é o ponto. */
  private static readonly CASCO_FRIO = 0x7a8290;
  /** O raio do anel de carga em volta do miolo: abre em `CARGA_R0` e FECHA em `CARGA_R1`. */
  private static readonly CARGA_R0 = 26;
  private static readonly CARGA_R1 = 4;
  /**
   * O intervalo entre sopros da carga, do começo (lento) ao fim (jorro).
   *
   * ⚠️ MEDIDO na captura, e o intervalo sozinho não resolveu: com 70→22ms o anel fechava com 6
   * partículas vivas no pico, e apertar para 55→16 deu 7 — a vida de 240ms limita o acúmulo, não o
   * intervalo. Por isso a METADE FINAL solta DOIS sopros por batida (ver o `case 'telegrafo'`): 14
   * vivas no fim, e a densidade dobra exatamente onde o aviso precisa gritar.
   */
  private static readonly CARGA_MS0 = 55;
  private static readonly CARGA_MS1 = 16;
  /**
   * ─── O RASTRO DO GLÓBULO (20/09) ───
   * *"pode gerar um efeito de rastro do projétil, como fumaça ou algo incandescente"*. São as duas
   * coisas: uma BRASA que esfria (a espinha do rastro) e uma FUMAÇA quente em volta dela.
   *
   * ⚠️ A 1ª TENTATIVA FOI MEDIDA E DESCARTADA: fumaça na CROSTA FRIA da escória (0x24343c/0x1c292d,
   * blend NORMAL, as cores mais claras do próprio PNG) some por completo no fundo — a pintura da
   * arena é vermelho escuro de luminância parecida, e cinza-azulado a 50% em cima dela não tem
   * contraste nenhum. A lei do dark sci-fi diz *luz só onde há energia*, e o glóbulo É energia: a
   * saída não é clarear o rastro, é fazê-lo QUENTE e curto. A fumaça vira ADD com tom baixo
   * (0x3a241c/0x2a1a16) — acrescenta calor, não clarão — e a brasa passa a sair quase todo sopro.
   */
  /**
   * ⚠️ O ESPAÇAMENTO É O QUE FAZ O RASTRO SER RASTRO. Com 0,034s (um sopro a cada 2 quadros) e 150px/s
   * a brasa nascia a cada ~7px e a captura mostrou uma FILEIRA DE PONTOS, não uma esteira: com 130–220ms
   * de vida, só 3 brasas ficavam vivas por glóbulo. Um sopro POR QUADRO põe a brasa a cada ~2,5px e
   * mantém 8–10 vivas — aí o rastro tem corpo e afina para trás sozinho, pela escala e pelo alpha.
   */
  private static readonly RASTRO_MS = 0.016;
  /** Chance de um sopro também soltar brasa. É a espinha do rastro: abaixo de ~0,6 vira ponto solto. */
  private static readonly RASTRO_BRASA = 0.8;
  /**
   * ⚠️ A SALVA COBRE AS BORDAS, e é de propósito. A investida empurra o jogador para o canto (medido:
   * o casco de 133px deixa ~20px de folga num vão de 160px), e no canto não acontecia nada — por isso
   * os dois ataques eram fáceis SEPARADAMENTE. Abrindo o leque, o canto passa a ter preço.
   */
  private static readonly SALVA_ABRE = 96;
  /**
   * ⚠️ E ELA PRECISA SER MAIS RÁPIDA QUE A NAVE. Os 100px/s antigos perdiam para os 110px/s do
   * `FreeController`: dava para simplesmente andar para longe do tiro. Projétil mais lento que quem
   * desvia não é ameaça — era a outra metade do *"os 3 tiros dele são muito fáceis"*.
   */
  private static readonly SALVA_VEL = 150;
  /** Cravada = ele segurando o cabo, ancorado e em esforço: o dano dobra, como a recuperação do predador. */
  private static readonly DANO_CRAVADA = 2;
  /**
   * A boca do cabo da serra, em px do PNG a partir do centro.
   *
   * ⚠️ NASCE ABAIXO DO CENTRO, e é medida de propósito. O feixe de cabos dele sai por CIMA, e foi de lá
   * que a primeira versão lançou: com a âncora em y≈72 e a borda de cima em 48, a primeira diagonal virou
   * um TOCO de 47px — ele mal soltava a serra e ela já cravava. Saindo por baixo, a subida tem ~70px de
   * altura e a coreografia que ele desenhou (sobe, crava, desce, crava) ganha espaço para ser lida.
   */
  private static readonly G_CABO_X = 40;
  private static readonly G_CABO_Y = 20;
  /** O vão jogável da arena — as bordas em que a serra crava. */
  private static readonly ARENA_TOPO = 30;
  private static readonly ARENA_BASE = 190;

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

    // ─── O rastro do glóbulo (ver `RASTRO_MS`) ───
    // A FUMAÇA: ADD com tom BAIXO (não é o mesmo que ADD com tom claro — somar 0x3a241c acrescenta
    // um véu de calor, não um clarão). Ela cresce e apaga: 280ms a 150px/s ≈ 42px de esteira, que é
    // comprimento de munição. Cometa é assinatura de chefão, e o glóbulo não é o chefão.
    this.fumaca = scene.add
      .particles(0, 0, 'puff', {
        lifespan: { min: 220, max: 340 },
        speed: { min: 2, max: 14 },
        scale: { start: 0.6, end: 1.8 },
        alpha: { start: 0.85, end: 0 },
        tint: [0x4a2e22, 0x3a241c, 0x2a1a16],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(19);
    // A BRASA é a luz — e é a espinha do rastro. Curta (160ms ≈ 24px) e apertada, para ler como
    // material incandescente desprendendo da crosta, não como chama.
    this.brasa = scene.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 130, max: 220 },
        speed: { min: 2, max: 16 },
        scale: { start: 0.9, end: 0 },
        alpha: { start: 0.95, end: 0 },
        tint: [0xfc9a04, 0xf46b02, 0xec3c05],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(20);

    // A CARGA do telégrafo. Ao contrário do `glow` (que CRESCE e se espalha: o bicho respirando), a
    // partícula da carga ENCOLHE — e o anel de onde ela nasce fecha no miolo. É matéria sendo puxada
    // para dentro, o oposto visual da respiração, e é por isso que o aviso não se confunde com ela.
    this.carga = scene.add
      .particles(0, 0, 'puff', {
        lifespan: 240,
        speed: { min: 0, max: 8 },
        scale: { start: 1.3, end: 0.2 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xffd447, 0xff8a2a, 0xff4a10],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(52);

    // ⚠️ `allowGravity: false`: a serra anda pela própria coreografia, não pela física da cena.
    this.perigos = scene.physics.add.group({ allowGravity: false });
    SerraGuardiao.registrarAnims(scene);

    this.barBg = scene.add
      .rectangle(GAME_WIDTH / 2, 16, 160, 4, COLORS.enemyDark)
      .setDepth(100);
    this.bar = scene.add
      .rectangle(GAME_WIDTH / 2 - 80, 16, 160, 4, COLORS.enemyBright)
      .setOrigin(0, 0.5)
      .setDepth(101);

    this.acaoT = BossNucleo.pausa(1);
    this.cdTiro = 1.4;
  }

  /** 0, 1 ou 2 — o degrau de vida em que a luta está. Lido pela sonda. */
  get degrau(): number {
    const k = this.hpGuardiao / BossNucleo.HP_GUARDIAO;
    return k > BossNucleo.DEGRAUS[0] ? 0 : k > BossNucleo.DEGRAUS[1] ? 1 : 2;
  }

  /** A pausa entre skills no degrau atual. `pausa(1)` serve ao construtor, antes de haver vida lida. */
  private static pausa(d: number): number {
    return BossNucleo.PAUSA[d];
  }

  /** A serra está cravada: ele segura o cabo, ancorado, e o dano dobra. */
  get segurandoCabo(): boolean {
    return this.serra?.cravada === true;
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
    // ANTES de qualquer saída antecipada: os glóbulos no ar continuam sendo glóbulos depois que o
    // guardião morre (a salva sobrevive à troca por ~2s), e um rastro que corta no meio se denuncia.
    this.rastroGlobulos(dt);

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
          this.leque(BossNucleo.SALVA_N[this.degrau], this.gMuzzle());
          this.scene.cameras.main.shake(40, 0.002);
        }

        if (this.acaoT <= 0) {
          if (this.proxima === 'serra') {
            // A SERRA. Ele fica na estação segurando o cabo: parado, à direita, miolo aberto.
            this.proxima = 'investida';
            this.acao = 'serra';
            this.body.setVelocityY(0);
            this.serra = new SerraGuardiao(
              this.scene,
              this.perigos,
              this.fx,
              () => this.gCabo(),
              BossNucleo.ARENA_TOPO,
              BossNucleo.ARENA_BASE,
              BossNucleo.SERRA_CRAVADAS[this.degrau],
            );
          } else {
            // TELEGRAFO: pisca e FECHA o corpo — quem ainda estiver na frente foi avisado.
            this.proxima = 'serra';
            this.acao = 'telegrafo';
            this.acaoT = BossNucleo.TELEGRAFO_DUR;
            this.cargaT = 0;
            this.corpoInteiro();
            this.body.setVelocityY(0);
            // O CASCO ESFRIA enquanto o miolo acende. O tint escuro diz "fechado" (a bala morre no
            // casco a partir de agora) e libera a linguagem do CALOR para o aviso — ver o `case`.
            this.sprite.setTint(BossNucleo.CASCO_FRIO);
          }
        }
        break;
      }

      case 'telegrafo': {
        /**
         * ─── O AVISO É A ACELERAÇÃO DO CORE (20/09, pedido dele) ───
         *
         * ⚠️ O QUE ESTAVA ERRADO NÃO ERA A DURAÇÃO, ERA O VOCABULÁRIO: o telégrafo piscava o corpo
         * INTEIRO em rosa (0xffd0d0/0xff6060) — a MESMA gramática do flash de dano (0xffb090, ver
         * `damage`). O jogador via o guardião piscar e lia "acertei nele", não "ele vai investir".
         * Agora as duas coisas não podem ser confundidas: no dano, o casco esquenta por 60ms; aqui o
         * casco ESFRIA e quem acende é o miolo, em três camadas que sobem juntas:
         *
         *   1. a RESPIRAÇÃO acelera (`timeScale` 1× → `TELEG_RESPIRO`) — é o coração disparando, e é
         *      literalmente o que ele pediu. ⚠️ Ela é a única camada que existe mesmo sem partícula:
         *      se um dia a sheet sumir, o aviso degrada, não desaparece;
         *   2. o ANEL DE CARGA fecha no miolo (`CARGA_R0` → `CARGA_R1`), com o sopro acelerando de
         *      `CARGA_MS0` a `CARGA_MS1`. Encolher é o oposto do `glow` do `flutua`, que se espalha;
         *   3. no estalo, o `glow` solta uma coroa de 14 de uma vez: a carga SOLTANDO.
         */
        const k = 1 - Math.max(0, this.acaoT) / BossNucleo.TELEGRAFO_DUR;
        this.sprite.anims.timeScale = 1 + k * (BossNucleo.TELEG_RESPIRO - 1);

        this.cargaT -= dt;
        if (this.cargaT <= 0) {
          this.cargaT = Phaser.Math.Linear(BossNucleo.CARGA_MS0, BossNucleo.CARGA_MS1, k) / 1000;
          const raio = Phaser.Math.Linear(BossNucleo.CARGA_R0, BossNucleo.CARGA_R1, k);
          // Na metade final, DOIS por batida e em lados opostos do anel: é o que o transforma de
          // cacho de partículas em ANEL, e é onde a leitura precisa estar mais alta.
          const a = Math.random() * Math.PI * 2;
          this.carga.emitParticleAt(this.core.x + Math.cos(a) * raio, this.core.y + Math.sin(a) * raio);
          if (k > 0.5) {
            this.carga.emitParticleAt(this.core.x - Math.cos(a) * raio, this.core.y - Math.sin(a) * raio);
          }
        }

        if (this.acaoT <= 0) {
          this.sprite.clearTint();
          this.sprite.anims.timeScale = 1;
          this.glow.emitParticleAt(this.core.x, this.core.y, 14);
          this.acao = 'investe';
          // Investe NA ALTURA do jogador no instante do disparo — mirada no passado, não
          // teleguiada: dá para reagir saindo da linha (o mesmo pacto da cabeça ciano).
          this.body.setVelocity(-300, Phaser.Math.Clamp((target.y - this.sprite.y) * 1.2, -70, 70));
        }
        break;
      }

      case 'serra': {
        // Ele NÃO se mexe enquanto a serra corre: está ancorado no cabo. É a janela de dano da luta —
        // a nave atira para a direita, então só serve para ela um guardião parado e à direita.
        this.serra?.update(dt);
        if (Math.random() < (this.segurandoCabo ? 0.5 : 0.35)) {
          this.glow.emitParticleAt(this.core.x, this.core.y);
        }
        if (!this.serra?.viva) {
          this.serra = null;
          this.acao = 'flutua';
          this.acaoT = BossNucleo.pausa(this.degrau);
          this.cdTiro = 0.6;
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
          this.acaoT = BossNucleo.pausa(this.degrau);
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
    // A serra é do GUARDIÃO. Se ele morre com ela na arena, ela some junto — o predador tem as armas dele.
    this.serra?.destroy();
    this.serra = null;
    this.body.setVelocity(0, 0);
    this.body.enable = false;
    this.glow.emitting = false;
    this.sprite.clearTint();

    // ⚠️ `anims.stop()` ANTES de tocar a morte: a respiração está em yoyo e sobrescreveria o quadro.
    // E o `timeScale` VOLTA A 1: morrer no meio do telégrafo deixava a respiração em 5× e a morte
    // inteira tocava acelerada — o `timeScale` é do sprite, não do clipe.
    this.sprite.anims.timeScale = 1;
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
      this.estouro = this.fx.explodeBig(this.core.x, this.core.y, 1.1, 52);
      explosaoSangrenta(this.scene, this.core.x, this.core.y);
      sangueNaTela(this.scene);
      this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: BossNucleo.TROCA_MS - BossNucleo.MORTE_MS });
    });

    this.scene.time.delayedCall(BossNucleo.TROCA_MS, () => {
      if (this.dead) return;
      this.forma = 'predador';
      // ⚠️ A FUMAÇA do fim do estouro ainda está no ar e caía como uma MANCHA PRETA sobre a barriga dele recém-
      // surgido (capturas de 16/09). Ela passa para TRÁS do predador: o que sobra dela vira fundo do surgimento.
      if (this.estouro?.active) this.estouro.setDepth(-0.05);
      this.scene.tweens.killTweensOf(this.sprite);
      this.sprite.setPosition(BossNucleo.G_STATION_X, BossNucleo.G_BASE_Y);
      this.body.reset(BossNucleo.G_STATION_X, BossNucleo.G_BASE_Y);
      this.predador = new Predador(this.scene, this.enemies, this.fx, this.sprite, this.core, () => this.atualizarBarra());
      this.travaTroca = false;
      this.trocando = false;
    });
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
    const abre = BossNucleo.SALVA_ABRE;
    for (let i = 0; i < n; i++) {
      const angle = Phaser.Math.DegToRad(180 - abre / 2 + (i / (n - 1)) * abre);
      this.gLobulo(angle, BossNucleo.SALVA_VEL, boca);
    }
  }

  /** A boca do CABO: de onde a serra sai e onde o cabo fica preso. Ele flutua, então é lido a cada quadro. */
  private gCabo(): { x: number; y: number } {
    const e = BossNucleo.G_ESCALA;
    return {
      x: this.sprite.x + BossNucleo.G_CABO_X * e,
      y: this.sprite.y + BossNucleo.G_CABO_Y * e,
    };
  }

  /**
   * O RASTRO dos glóbulos no ar. Quem tem rastro é decidido pela TEXTURA, não por uma lista: o pool
   * de balas é compartilhado com os inimigos comuns, e uma lista de referências envelheceria mal
   * (a bala volta para o pool e renasce como outra coisa). `globuloGuardiao` só ele atira.
   *
   * ⚠️ Cada bala carrega o PRÓPRIO relógio (`rt`), e não o do quadro: com 5 glóbulos abertos num
   * leque, emitir "uma vez por quadro por bala" faria o rastro engrossar junto com a salva.
   */
  private rastroGlobulos(dt: number): void {
    if (!this.scene.textures.exists('globuloGuardiao')) return;
    for (const obj of this.enemies.enemyBullets.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (!b.active || b.texture.key !== 'globuloGuardiao') continue;

      const rt = ((b.getData('rt') as number) ?? 0) - dt;
      if (rt > 0) {
        b.setData('rt', rt);
        continue;
      }
      b.setData('rt', BossNucleo.RASTRO_MS);

      // Atrás da bala, nunca em cima dela: o sopro nasce na cauda (o glóbulo tem 12px de corpo no
      // sprite de 32×16) para o rastro sair de trás e não engolir a própria silhueta.
      const ang = b.rotation;
      const x = b.x - Math.cos(ang) * 6;
      const y = b.y - Math.sin(ang) * 6;
      this.fumaca.emitParticleAt(x, y);
      if (Math.random() < BossNucleo.RASTRO_BRASA) this.brasa.emitParticleAt(x, y);
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

    // ⚠️ SEM TINT. A arte nova já traz a própria cor (casco escuro, só a brasa acesa); tingir de laranja
    // acendia o corpo inteiro e devolvia o projétil genérico que ele mandou trocar.
    if (this.scene.textures.exists('globuloGuardiao')) {
      b.setTexture('globuloGuardiao');
      b.clearTint();
    } else if (this.scene.textures.exists('bolt3')) {
      b.setTexture('bolt3');
      b.setTint(0xffa040);
    }
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

    // Ancorado no cabo, em esforço: o dano dobra. Mesma gramática da recuperação do predador — a
    // janela de dano da luta tem de PAGAR, senão ela é só um lugar onde nada acontece.
    const dano = this.segurandoCabo ? amount * BossNucleo.DANO_CRAVADA : amount;
    this.hpGuardiao = Math.max(0, this.hpGuardiao - dano);
    this.atualizarBarra();

    this.sprite.setTint(0xffb090);
    // ⚠️ O flash de dano NÃO pode apagar o tint frio do telégrafo: um golpe que cai no último quadro
    // antes do aviso deixava o `clearTint` atrasado limpar o casco no meio da carga.
    this.scene.time.delayedCall(60, () => {
      if (this.dead) return;
      if (this.acao === 'telegrafo') this.sprite.setTint(BossNucleo.CASCO_FRIO);
      else this.sprite.clearTint();
    });

    if (this.hpGuardiao === 0) this.trocarParaPredador();
    return false;
  }

  /** UMA barra para as duas formas: a luta é uma só, e a barra é a promessa do tamanho dela. */
  private atualizarBarra(): void {
    this.bar.width = 160 * ((this.hpGuardiao + (this.predador?.hp ?? Predador.HP)) / BossNucleo.HP_TOTAL);
  }

  /** O corpo do predador fica na tela, racha o chão e afunda na lava antes da cutscene — ver `destroy`. */
  get pausaFinalMs(): number | undefined {
    return this.predador ? BossNucleo.CORPO_FICA_MS : undefined;
  }

  destroy(): void {
    this.serra?.destroy();
    this.serra = null;
    // O CORPO FICA (17/09: *"a animação dele morto não apareceu, ele sumiu"*): a cena destrói o chefão 1,2s depois
    // do golpe final, bem quando o clipe da morte termina estendido. O último quadro vira uma imagem solta no
    // chão — e dali sai o FIM: o piso racha, estoura, a lava sobe e o corpo afunda (ver `fimDoPredador`).
    if (this.predador?.dead && this.sprite.active) {
      const s = this.sprite;
      const corpo = this.scene.add
        .image(s.x, s.y, s.texture.key, s.frame.name)
        .setOrigin(s.originX, s.originY)
        .setScale(s.scaleX, s.scaleY)
        .setFlip(s.flipX, s.flipY)
        .setDepth(s.depth);
      afundarNaLava(this.scene, corpo, this.fx, Predador.CHAO_APOIO);
    }
    this.predador?.destroy();
    this.sprite.destroy();
    this.core.destroy();
    this.bar.destroy();
    this.barBg.destroy();
    this.glow.destroy();
    this.fumaca.destroy();
    this.brasa.destroy();
    this.carga.destroy();
  }
}
