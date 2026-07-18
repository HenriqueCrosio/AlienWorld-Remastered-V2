import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';

/**
 * O CANO GIRATÓRIO — a trava da mini-gun.
 *
 * Duas mecânicas, e cada uma fecha um buraco diferente:
 *
 * **GIRO** (`up`/`idleRate`/`down`): o cano precisa girar antes de cuspir na cadência cheia. É o
 * custo de ABRIR fogo — a HMG deixa de ser a resposta instantânea para tudo e passa a exigir que
 * o jogador decida ANTES do que ele quer matar.
 *
 * **CALOR** (`heatPerShot`/`cool`/`lock`): é o custo de MANTER o fogo. Segurar o gatilho
 * superaquece e TRAVA a arma.
 *
 * ⚠️ **O CALOR NÃO ZERA AO SOLTAR O GATILHO — é isso que fecha o exploit.** A defesa óbvia contra
 * o superaquecimento é metralhar em toques curtos; se o calor caísse a pique fora do gatilho,
 * quem tamborilasse o dedo jamais esquentaria e o nerf inteiro seria decorativo. Aqui ele
 * DISSIPA DEVAGAR (`cool`), bem mais devagar do que sobe: tamborilar ADIA o travamento, nunca o
 * evita. Quem despeja 200 balas superaquece, ponto — e é essa a única promessa que a arma faz.
 *
 * O giro, ao contrário, decai rápido: ele pune quem alterna de alvo, não quem economiza bala.
 */
export interface SpinDef {
  /** Segundos de gatilho segurado até a cadência CHEIA. */
  up: number;
  /** Fração da cadência com o cano parado (0.2 = um quinto dos tiros por segundo). */
  idleRate: number;
  /** Segundos até o cano parar depois de soltar. */
  down: number;
  /** Calor por tiro. 1.0 = superaquece. */
  heatPerShot: number;
  /** Calor dissipado por segundo — SÓ fora do gatilho, e de propósito mais lento do que sobe. */
  cool: number;
  /** Segundos de arma TRAVADA ao superaquecer. */
  lock: number;
}

/**
 * O TELEGUIADO — e a trava que impede ele de apagar o jogo.
 *
 * Mira automática é a mecânica mais perigosa que existe num shmup: se o projétil sempre acerta,
 * MIRAR deixa de ser uma habilidade, e mirar é metade do que o jogador está fazendo. Uma arma que
 * nunca erra não é uma escolha — é um modo fácil disfarçado de arma.
 *
 * A trava é a **curva**, e ela é deliberadamente LENTA (`turn`, em graus por segundo).
 *
 * O projétil não persegue: ele **corrige**. Contra um alvo GRANDE e LENTO (o cargueiro, a mina, o
 * chefão) ele tem tempo de sobra para se alinhar e nunca erra. Contra um batedor cruzando a tela
 * ou um kamikaze mergulhando em cima de você, ele **não consegue virar rápido o bastante** — ele
 * passa reto e se perde. É exatamente o inverso das outras armas, e é isso que faz dela um eixo
 * novo em vez de um upgrade:
 *
 *   as outras armas   → fáceis contra o alvo grande, difíceis contra o alvo rápido
 *   o teleguiado      → **impossível de errar no lento, quase inútil no rápido**
 *
 * Somado ao dano baixo e à cadência baixa, ela é a arma de quem quer *derreter casco* enquanto
 * desvia — e é péssima para limpar um enxame, que é justamente o que a Fase 2 mais cobra.
 */
export interface HomingDef {
  /** Quanto o projétil consegue virar por segundo, em GRAUS. É a trava: baixo = ele erra o rápido. */
  turn: number;
  /** Raio (px) em que ele procura alvo. Fora disso, voa reto. */
  range: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  /** Sprite do projétil. */
  bullet: string;
  /** Animação do projétil, se houver (fogo ardendo). */
  bulletAnim?: string;
  /** Escala do projétil. */
  bulletScale: number;
  /** Tiros por segundo. */
  rate: number;
  speed: number;
  damage: number;
  /** Nº de projéteis por disparo (leque). */
  pellets: number;
  /** Abertura do leque, em graus. */
  spread: number;
  /** Munição; null = infinita (só a arma base). */
  ammo: number | null;
  /** Alcance em px; null = infinito. É o que impede a shotgun de virar sniper. */
  range: number | null;
  /** Cano giratório + superaquecimento. Ausente = a arma atira no primeiro frame, para sempre. */
  spin?: SpinDef;
  /** Perseguição. Ausente = o projétil voa reto, para sempre. */
  homing?: HomingDef;

  // ─── Extensões do róster v2 (2026-07-17). Todas OPCIONAIS: as armas antigas não mudam. ───

  /**
   * Bocas PARALELAS: cada tiro nasce em `y + dy`, com desvio `angle` (graus). Substitui o leque
   * `pellets/spread` — leque abre a partir de UM ponto; bocas paralelas são canos lado a lado
   * (o traçante duplo do jato, os 4 canos da bateria). A divergência da bateria é o limitador
   * de alcance natural dela: de perto os 4 conectam, de longe abrem.
   */
  muzzles?: { dy: number; angle: number }[];
  /**
   * RAJADA: `count` tiros espaçados `interval`s; a pausa entre rajadas é 1/`rate`. A arma de
   * quem domina o ritmo — o dano é adiantado na janela e a pausa expõe.
   */
  burst?: { count: number; interval: number };
  /**
   * O projétil ATRAVESSA inimigos (fere cada um só 1×). Morre em rocha e destroço normalmente:
   * cobertura continua sendo cobertura — só carne deixa de parar a bala.
   */
  pierce?: boolean;
  /** Escala VERTICAL própria (a lâmina é alta). Ausente = `bulletScale` nos dois eixos. */
  bulletScaleY?: number;
  /** Tint do projétil. A lâmina é TEAL (tecnologia alien) — o bolt ciano tinge sem virar preto. */
  tint?: number;

  // ─── Peso visual (2026-07-18). SÓ cosmético: damage/rate/speed/hitbox INTOCADOS. ───

  /**
   * Estica o projétil no eixo do voo — SÓ o desenho. A Lança (dano 3) lia quase igual à Pulse
   * (dano 1): o dano precisa aparecer na silhueta. A hitbox de MUNDO é compensada no shoot()
   * (setSize ÷ stretchX, o mesmo truque do míssil do TerrainSystem) — nada de gameplay muda.
   */
  stretchX?: number;
  /**
   * Brilho aditivo + pulso de alpha (tickFx). O obus é lento e de dano 5: um projétil que
   * atravessa a tela devagar tem que parecer CARREGADO, senão lê como bala perdida.
   */
  glow?: boolean;
  /** Partículas do flash de boca por disparo (padrão 2). O flash é o coice visual da arma. */
  muzzleFlash?: number;
}

/**
 * Armas do M2. As definitivas virão de data/weapons.json (docs/TECH.md).
 *
 * BALANCEAMENTO (playtest): a shotgun estava quebrada — 5 projéteis × 2 de dano num alvo
 * grande é DPS de boss melter, e ela acertava de qualquer distância. A correção não foi só
 * baixar o dano: ela ganhou ALCANCE CURTO. Agora é uma escolha (chegar perto é arriscado),
 * não um botão de vitória.
 */
export const WEAPONS: Record<string, WeaponDef> = {
  // Cada arma tem um projétil VISUALMENTE distinto: num shmup, o jogador precisa saber o que
  // está atirando sem olhar o HUD.
  pulse: { id: 'pulse', name: 'PULSE', bullet: 'bolt', bulletScale: 1, rate: 7, speed: 300, damage: 1, pellets: 1, spread: 0, ammo: null, range: null },

  // ── Armas BASE das naves (docs/GDD.md §5: infinitas e fracas). ──
  //
  // São SIDEGRADES da Pulse, nunca upgrades: se a nave escolhida for simplesmente melhor, a
  // escolha deixa de ser escolha e vira a resposta certa.
  //
  //  pulse   7 dps · alcance infinito · reta          → o equilíbrio
  //  lance   9 dps num alvo · cadência baixa          → precisão (erra e você fica a ver navios)
  //  spread  9 dps num alvo GRANDE · ALCANCE CURTO    → cobertura (paga com o risco de chegar perto)
  //
  // O `range` da spread não é sabor, é a trava de balanceamento: 3 projéteis somados num chefão
  // dariam DPS de boss melter à distância — foi exatamente o bug da shotgun (ver abaixo). O
  // alcance curto transforma isso numa ESCOLHA (chegar perto é arriscado), não num botão.
  // `stretchX`/`muzzleFlash` são peso VISUAL (dano 3 tem que aparecer na silhueta e no coice);
  // os números de gameplay são os mesmos, e a hitbox de mundo é compensada no shoot().
  lance: { id: 'lance', name: 'LANÇA', bullet: 'bolt3', bulletScale: 1.2, rate: 3, speed: 430, damage: 3, pellets: 1, spread: 0, ammo: null, range: null, stretchX: 1.8, muzzleFlash: 6 },
  spread: { id: 'spread', name: 'DISPERSOR', bullet: 'bolt2', bulletScale: 0.9, rate: 3, speed: 250, damage: 1, pellets: 3, spread: 22, ammo: null, range: 110 },

  // ── ENXAME: a arma base da nave ALIENÍGENA (escolhida na 2ª interlude). ──
  //
  // Ela NUNCA erra um alvo grande e lento. Ela QUASE SEMPRE erra um alvo pequeno e rápido.
  //
  // A curva de 150°/s é a peça de balanceamento inteira (ver HomingDef): o projétil sai devagar
  // (170px/s — mais lento que qualquer outro do jogo) e corrige o rumo aos poucos. Um cargueiro,
  // uma mina ou o casco de um chefão não têm como fugir disso. Um batedor cruzando a tela a 95px/s
  // em senóide, sim — o projétil vira atrás dele e chega tarde.
  //
  // Ela persegue INIMIGO e CHEFÃO, nunca rocha: um projétil que se joga no primeiro asteroide da
  // frente seria uma arma que se sabota sozinha (e o cinturão está cheio deles).
  //
  // Dano 1 e cadência 4: o DPS é BAIXO de propósito. O que ela vende não é matar rápido, é matar
  // SEM OLHAR — a mão fica livre para desviar. Num campo minado com kamikazes em cima de você,
  // isso é uma troca de verdade, e não um upgrade.
  enxame: {
    id: 'enxame', name: 'ENXAME', bullet: 'bolt2', bulletScale: 1, rate: 4, speed: 170, damage: 1, pellets: 1, spread: 6, ammo: null, range: null,
    homing: { turn: 150, range: 150 },
  },

  // A MINI-GUN. Ela MATAVA o chefão da Fase 1 sozinha (playtest do Henrique): 18 tiros por
  // segundo, sem custo nenhum, disponíveis no frame em que o dedo desce. Não havia decisão —
  // havia um botão de vencer.
  //
  // O nerf NÃO foi no dano. Baixar o dano faria dela uma pulse pior e ninguém a pegaria mais; o
  // problema nunca foi o quanto ela dá, foi ela não COBRAR nada. Agora ela cobra duas coisas: o
  // cano precisa GIRAR (custo de abrir fogo) e ele ESQUENTA (custo de manter). O DPS de pico
  // continua brutal — ele só não é mais grátis nem eterno.
  //
  // No FLAP o gatilho é automático (a mão está na altitude): a HMG entra girando sozinha e
  // esquenta sozinha. Ali ela é uma arma que se GASTA, e é assim que tem que ser.
  hmg: {
    id: 'hmg', name: 'HMG', bullet: 'bolt3', bulletScale: 0.85, rate: 18, speed: 340, damage: 1, pellets: 1, spread: 5, ammo: 200, range: null,
    // ~3s de fogo cheio até travar; 1.6s travada; e o calor leva ~6.5s para sair inteiro.
    //
    // ⚠️ O `cool` É A TRAVA DO EXPLOIT, E O NÚMERO FOI MEDIDO, NÃO CHUTADO.
    //
    // Ele estava em 0.28/s, e a sonda (`scripts/probe-hmg.mjs`) mostrou o furo: tamborilando o
    // gatilho (0.4s liga / 0.4s desliga) o calor subia só +0.026 por ciclo — a dissipação comia
    // quase tudo o que a rajada punha. O jogador travava a arma NUNCA, e a munição acabava antes
    // de o calor chegar perto do teto. O nerf existia no papel e não existia em jogo.
    //
    // A 0.15/s a mesma tamborilada acumula ~+0.08 por ciclo e trava em ~10s. É exatamente a
    // promessa que a arma faz: tamborilar ADIA o travamento, não o evita.
    spin: { up: 0.55, idleRate: 0.22, down: 0.9, heatPerShot: 0.024, cool: 0.15, lock: 1.6 },
  },
  // A shotgun cospe FOGO: leque de estilhaços ardendo em vermelho e amarelo. É a arma de
  // chegar perto — o visual precisa gritar isso.
  shotgun: { id: 'shotgun', name: 'SHOTGUN', bullet: 'blast', bulletAnim: 'blast-burn', bulletScale: 1, rate: 2.2, speed: 210, damage: 1, pellets: 5, spread: 32, ammo: 40, range: 96 },

  // ─── AS ARMAS-BASE DO RÓSTER v2 (tabela aprovada pelo Henrique, 2026-07-17). ───
  //
  // A régua é a pulse (7 dps, reta, infinita). Cada uma é forte num eixo e fraca no oposto —
  // sidegrades, nunca upgrades. Auditoria de balanceamento no scratchpad da sessão.
  //
  //  tracer      8 dps no casco grande, 4 no alvo pequeno (só 1 dos 2 raios conecta)
  //  obus        5 dps que chegam de uma vez — pune tudo que fica parado, erra tudo que anda
  //  agulha      6 dps quase-instantâneos — nunca chega tarde no batedor, rala no casco
  //  salva       6.2 dps médios ADIANTADOS na janela (6 de dano em 0.16s, depois 0.8s exposta)
  //  perfurante  5 dps por alvo, × cada inimigo na linha — a fila inteira paga
  //  bateria     8 dps de perto; a divergência de ±2° abre o feixe com a distância
  //  lamina      4 dps numa faixa ALTA — perdoa a mira, não recompensa ela

  // O TRAÇANTE DUPLO do jato (spec do Henrique, 2026-07-18): tiro DUPLO CADENCIADO simulando
  // munição traçante — o risco fino vermelho/laranja do `tracerRound` (BootScene), não um raio
  // de energia. Cadência 3.5, não 4: "cadenciado" é rajada com ritmo, e a base tem que ser
  // COMUM E SIMPLES — boa o bastante para jogar, fraca o bastante para o jogador caçar pickups.
  tracer: {
    id: 'tracer', name: 'TRAÇANTE', bullet: 'tracerRound', bulletScale: 1, rate: 3.5, speed: 420,
    damage: 1, pellets: 2, spread: 0, ammo: null, range: null,
    muzzles: [{ dy: -2, angle: 0 }, { dy: 2, angle: 0 }],
  },
  obus: {
    id: 'obus', name: 'OBUS', bullet: 'bolt3', bulletScale: 1.7, rate: 1, speed: 150,
    damage: 5, pellets: 1, spread: 0, ammo: null, range: null,
    // O glow é só figurino (blend ADD + pulso de ALPHA — nunca de escala, que arrastaria a
    // hitbox de mundo junto): 5 de dano viajando a 150px/s tem que parecer carregado.
    glow: true, muzzleFlash: 4,
  },
  agulha: {
    id: 'agulha', name: 'AGULHA', bullet: 'bolt', bulletScale: 0.7, rate: 6, speed: 500,
    damage: 1, pellets: 1, spread: 0, ammo: null, range: null,
  },
  // Dano 2, não 1: com dano 1 a média do ciclo (3 tiros + 0.8s de pausa) caía a 3.1 dps — abaixo
  // de qualquer régua. A 2, a janela cospe 6 de dano em 0.16s e o ciclo fecha em ~6.2 dps.
  salva: {
    id: 'salva', name: 'SALVA', bullet: 'bolt', bulletScale: 1, rate: 1.25, speed: 340,
    damage: 2, pellets: 1, spread: 0, ammo: null, range: null,
    burst: { count: 3, interval: 0.08 },
  },
  perfurante: {
    id: 'perfurante', name: 'PERFURANTE', bullet: 'bolt3', bulletScale: 1.1, rate: 2.5, speed: 300,
    damage: 2, pellets: 1, spread: 0, ammo: null, range: null,
    pierce: true,
  },
  bateria: {
    id: 'bateria', name: 'BATERIA', bullet: 'bolt', bulletScale: 0.85, rate: 2, speed: 320,
    damage: 1, pellets: 4, spread: 0, ammo: null, range: null,
    muzzles: [{ dy: -5, angle: -2 }, { dy: -2, angle: -0.7 }, { dy: 2, angle: 0.7 }, { dy: 5, angle: 2 }],
  },
  // Teal, não ciano puro nem magenta: é tecnologia ALIEN na mão do jogador — parente da cor do
  // Arauto, longe da cor do inimigo (armadilha 24: a cor tem dono).
  lamina: {
    id: 'lamina', name: 'LÂMINA', bullet: 'bolt', bulletScale: 1, bulletScaleY: 3.2, rate: 2,
    speed: 260, damage: 2, pellets: 1, spread: 0, ammo: null, range: null, tint: 0x5ef2d8,
  },
};

/**
 * Dispara a arma equipada, gasta munição e volta para a base ao esgotar —
 * o modelo Metal Slug (docs/GDD.md).
 *
 * Projéteis vivem num pool: reciclar em vez de instanciar/destruir não é otimização
 * prematura, é a arquitetura que impede o GC de travar o navegador.
 */
export class WeaponSystem {
  readonly bullets: Phaser.Physics.Arcade.Group;

  private weapon: WeaponDef = WEAPONS.pulse;
  private ammo: number | null = null;
  private cooldown = 0;
  /**
   * A arma BASE — a infinita, para a qual sempre se volta (ao morrer, ao acabar a munição).
   *
   * Era `'pulse'` cravado em dois lugares. Com a escolha de nave, a base passou a ser uma
   * PROPRIEDADE DA NAVE: quem escolheu a Lança não pode ser devolvido à Pulse ao morrer — isso
   * apagaria a escolha dele justamente no momento em que ela mais importa.
   */
  private baseId = 'pulse';

  /** Tiros já disparados da RAJADA atual (só armas com `burst`). */
  private burstShots = 0;

  /** Giro do cano: 0 = parado, 1 = cadência cheia. Só as armas com `spin` o usam. */
  private spool = 0;
  /** Calor: 0 = frio, 1 = superaquecida. */
  private heat = 0;
  /** Segundos que faltam de trava por superaquecimento. > 0 = a arma não atira. */
  private lock = 0;

  /** UM emissor de clarão, reaproveitado. Criar um por tiro vazaria memória. */
  private readonly muzzle: Phaser.GameObjects.Particles.ParticleEmitter;

  /**
   * O rastro do ENXAME — UM emissor para todos os teleguiados (armadilha nº 5: nunca um por
   * tiro). A CURVA é a identidade da arma inteira (HomingDef) e era invisível: o projétil
   * corrigia o rumo e ninguém via a correção. O rastro curto é o que a desenha no ar.
   */
  private readonly homingTrail: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly scene: Phaser.Scene) {
    this.bullets = scene.physics.add.group({
      defaultKey: 'bolt',
      maxSize: 128,
      allowGravity: false,
    });

    this.muzzle = scene.add
      .particles(0, 0, 'flash', {
        lifespan: 90,
        speed: { min: 0, max: 20 },
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.9, end: 0 },
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(20);

    // TEAL, nunca magenta: teleguiado é tecnologia ALIEN na mão do JOGADOR — a cor tem dono
    // (armadilha 24), e magenta diria "tiro que me mata". Vida de 120ms: rastro CURTO, que
    // mostra a correção de rota sem virar a cauda longa — essa é assinatura de chefão.
    this.homingTrail = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 120,
        speed: { min: 0, max: 12 },
        scale: { start: 1.1, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: [0x5ef2d8, 0x2fbfae],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(19);
  }

  get current(): WeaponDef {
    return this.weapon;
  }

  get ammoLeft(): number | null {
    return this.ammo;
  }

  // ─── Estado do cano giratório (o HUD precisa VER isto) ──────────────────────
  //
  // Uma arma que trava sem avisar é um bug aos olhos de quem joga. O jogador tem que ver o calor
  // subir para poder decidir soltar o gatilho — é o mesmo princípio do telégrafo dos inimigos:
  // ninguém pode ser punido por algo que não teve como enxergar (docs/GDD.md pilar 3).

  /** A arma equipada tem cano giratório? */
  get hasSpin(): boolean {
    return this.weapon.spin !== undefined;
  }

  /** 0..1 — o quanto o cano já girou. */
  get spoolPct(): number {
    return this.spool;
  }

  /** 0..1 — o quanto ela esquentou. */
  get heatPct(): number {
    return this.heat;
  }

  /** Travada por superaquecimento agora? */
  get overheated(): boolean {
    return this.lock > 0;
  }

  equip(id: string): void {
    const def = WEAPONS[id];
    if (!def) return;
    this.weapon = def;
    this.ammo = def.ammo;
    // Trocar de arma esfria e para o cano: o calor é DA ARMA, não do jogador. Sem isto, pegar
    // uma cápsula no meio de uma rajada entregaria a arma nova já quente (ou já travada).
    this.spool = 0;
    this.heat = 0;
    this.lock = 0;
    // A rajada também zera: trocar de arma no meio de uma salva não pode herdar a contagem.
    this.burstShots = 0;
  }

  /** Define a arma da NAVE e já a equipa. Chamado uma vez, ao montar a fase. */
  setBase(id: string): void {
    if (!WEAPONS[id]) return;
    this.baseId = id;
    this.equip(id);
  }

  /** Volta para a arma da nave. É o "perdeu a especial" do modelo Metal Slug. */
  equipBase(): void {
    this.equip(this.baseId);
  }

  /**
   * `wantsToFire` já vem resolvido pela condução (autoFire ou gatilho).
   *
   * `targets` são os alvos VÁLIDOS da perseguição (inimigos e chefão — nunca rocha). A cena os
   * fornece; a arma não sabe o que é um inimigo, só que aquilo ali é uma coisa em que se mira.
   */
  update(
    dt: number,
    wantsToFire: boolean,
    x: number,
    y: number,
    targets: Phaser.Physics.Arcade.Sprite[] = [],
  ): void {
    this.cooldown -= dt;

    // A correção de rumo roda TODO frame, mesmo sem o gatilho: os projéteis já no ar continuam
    // caçando depois de o jogador ter soltado o botão.
    this.steer(dt, targets);

    // O figurino também: o rastro do enxame e o pulso do obus não dependem do gatilho.
    this.tickFx();

    const spin = this.weapon.spin;
    if (spin) this.updateSpin(dt, wantsToFire, spin);

    // Travada: o gatilho não faz nada. É o preço de ter segurado o dedo.
    const podeAtirar = wantsToFire && this.lock <= 0;

    if (!podeAtirar || this.cooldown > 0) {
      this.cull();
      return;
    }

    // A CADÊNCIA É O GIRO. Com o cano parado a HMG cospe a `idleRate` da cadência cheia — ela
    // atira, só que devagar. Zero tiro enquanto gira seria um atraso morto, e atraso morto num
    // shmup parece input engolido; uma arma que ACELERA é uma arma que se sente girando.
    const rate = spin
      ? Phaser.Math.Linear(this.weapon.rate * spin.idleRate, this.weapon.rate, this.spool)
      : this.weapon.rate;

    // RAJADA: dentro dela o intervalo é curto; ao fechar a contagem entra a pausa (1/rate).
    // O dano é ADIANTADO na janela — e a pausa é o preço, não um defeito.
    const burst = this.weapon.burst;
    if (burst) {
      this.burstShots++;
      if (this.burstShots < burst.count) {
        this.cooldown = burst.interval;
      } else {
        this.cooldown = 1 / rate;
        this.burstShots = 0;
      }
    } else {
      this.cooldown = 1 / rate;
    }
    this.shoot(x, y);

    if (spin) {
      this.heat += spin.heatPerShot;
      if (this.heat >= 1) this.overheat(spin, x, y);
    }

    if (this.ammo !== null) {
      this.ammo--;
      // Munição esgotada: volta para a arma DA NAVE, nunca fica sem tiro.
      if (this.ammo <= 0) this.equipBase();
    }

    this.cull();
  }

  /**
   * O cano gira e esquenta.
   *
   * As duas grandezas correm em sentidos OPOSTOS quando o gatilho está solto — e é essa assimetria
   * que é a mecânica inteira:
   *
   *   o GIRO cai rápido (`down` ≈ 1s)   → soltar o gatilho custa o pique. Pune alternar de alvo.
   *   o CALOR cai devagar (`cool`)      → soltar o gatilho NÃO desfaz o estrago. Pune a rajada longa.
   *
   * Se o calor caísse tão rápido quanto o giro, tamborilar o dedo seria fogo cheio de graça e o
   * nerf viraria enfeite (ver SpinDef).
   */
  private updateSpin(dt: number, firing: boolean, spin: SpinDef): void {
    if (this.lock > 0) {
      this.lock -= dt;
      this.spool = 0;
      // O calor DRENA durante a trava, e ela dura exatamente o tempo de zerá-lo: a arma volta
      // FRIA. Sair da trava ainda quente travaria de novo em dois tiros — o jogador leria isso
      // como a arma tendo quebrado, não como uma regra.
      this.heat = Math.max(0, this.heat - dt / spin.lock);
      return;
    }

    if (firing) {
      this.spool = Math.min(1, this.spool + dt / spin.up);
      return;
    }

    this.spool = Math.max(0, this.spool - dt / spin.down);
    this.heat = Math.max(0, this.heat - spin.cool * dt);
  }

  /**
   * O rumo dos projéteis teleguiados, um frame de cada vez.
   *
   * ⚠️ **A CURVA É LIMITADA, E É AÍ QUE MORA O BALANCEAMENTO.** Apontar a velocidade direto para o
   * alvo (o jeito óbvio) daria um projétil que NUNCA erra nada — e aí mirar deixaria de ser uma
   * habilidade do jogo. Aqui ele só pode virar `turn` graus por segundo: contra o cargueiro isso é
   * infinito, contra um batedor cruzando é pouco. É o mesmo princípio da ACELERAÇÃO do kamikaze
   * (EnemySystem): perseguir por incremento dá INÉRCIA, e a inércia é o que transforma
   * perseguição em padrão — para os dois lados.
   */
  private steer(dt: number, targets: Phaser.Physics.Arcade.Sprite[]): void {
    if (targets.length === 0) return;

    for (const obj of this.bullets.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (!b.active) continue;

      const homing = b.getData('homing') as HomingDef | undefined;
      if (!homing) continue;

      const alvo = this.nearest(b, targets, homing.range);
      // Sem alvo no raio, ele segue reto. Um projétil que gira no vazio procurando alguém parece
      // um bug — e, pior, ele acabaria mirando alguma coisa que entrou na tela depois, atrás dele.
      if (!alvo) continue;

      const body = b.body as Phaser.Physics.Arcade.Body;
      const speed = b.getData('speed') as number;

      const atual = Math.atan2(body.velocity.y, body.velocity.x);
      const desejado = Phaser.Math.Angle.Between(b.x, b.y, alvo.x, alvo.y);

      // O passo é limitado — é ISTO que faz a arma errar o que é rápido.
      const passo = Phaser.Math.DegToRad(homing.turn) * dt;
      const novo = atual + Phaser.Math.Clamp(
        Phaser.Math.Angle.Wrap(desejado - atual),
        -passo,
        passo,
      );

      body.setVelocity(Math.cos(novo) * speed, Math.sin(novo) * speed);
      b.setRotation(novo);
    }
  }

  /** O alvo mais próximo dentro do raio. Nada no raio = null (e o projétil segue reto). */
  private nearest(
    b: Phaser.Physics.Arcade.Sprite,
    targets: Phaser.Physics.Arcade.Sprite[],
    range: number,
  ): Phaser.Physics.Arcade.Sprite | null {
    let melhor: Phaser.Physics.Arcade.Sprite | null = null;
    let menor = range * range;

    for (const t of targets) {
      if (!t.active) continue;

      const dx = t.x - b.x;
      const dy = t.y - b.y;
      const d2 = dx * dx + dy * dy;

      if (d2 < menor) {
        menor = d2;
        melhor = t;
      }
    }

    return melhor;
  }

  /** SUPERAQUECEU: trava, solta um jorro de fagulhas e para o cano. */
  private overheat(spin: SpinDef, x: number, y: number): void {
    this.lock = spin.lock;
    this.heat = 1;
    this.spool = 0;

    // O travamento tem que ser um EVENTO, não um silêncio. Sem o esguicho, "a arma parou de
    // atirar" é indistinguível de um bug de input.
    this.muzzle.explode(14, x, y);
    this.scene.cameras.main.shake(120, 0.004);
  }

  private shoot(x: number, y: number): void {
    const { pellets, spread, speed, damage, muzzles } = this.weapon;

    // Bocas paralelas substituem o leque: n canos lado a lado, cada um com seu desvio fixo.
    const tiros = muzzles ? muzzles.length : pellets;

    for (let i = 0; i < tiros; i++) {
      const boca = muzzles?.[i];
      const b = this.bullets.get(x, y + (boca?.dy ?? 0)) as Phaser.Physics.Arcade.Sprite | null;
      if (!b) {
        // Pool cheio: o tiro some sem aviso. É a explicação mais provável para "às vezes o
        // projétil não sai" — e sem este log ninguém descobre.
        if (import.meta.env.DEV) console.warn('[armas] pool cheio, tiro descartado');
        return;
      }

      b.setActive(true).setVisible(true);
      b.body!.enable = true;

      // O pool é um só; a textura (ou a animação) muda conforme a arma equipada.
      b.anims.stop();

      if (this.weapon.bulletAnim && this.scene.anims.exists(this.weapon.bulletAnim)) {
        b.play(this.weapon.bulletAnim);
        // Fase aleatória: os 5 estilhaços do leque ardendo em uníssono parecem um objeto só.
        b.anims.setProgress(Math.random());
      } else {
        b.setTexture(this.weapon.bullet);
      }

      // Escala por eixo: a lâmina é ALTA (scaleY próprio) — e a hitbox de mundo acompanha a
      // escala do sprite, então a faixa alta dela sai daqui de graça.
      //
      // `stretchX` é peso VISUAL: estica só o desenho no eixo do voo (a Lança de dano 3 lia
      // igual à Pulse de dano 1). A hitbox compensa logo abaixo — nada de gameplay muda.
      const stretch = this.weapon.stretchX ?? 1;
      b.setScale(
        this.weapon.bulletScale * stretch,
        this.weapon.bulletScaleY ?? this.weapon.bulletScale,
      );
      if (this.weapon.tint !== undefined) b.setTint(this.weapon.tint);
      else b.clearTint();
      // GLOW: blend aditivo (energia, não adesivo) + marca para o pulso de alpha do tickFx().
      // Setado a CADA disparo — o pool é compartilhado, e o release() também limpa.
      b.setBlendMode(this.weapon.glow ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
      b.setAlpha(1);
      b.setData('glow', this.weapon.glow === true);
      // Hitbox derivada da arte, e generosa: bala fina com corpo justo erra o que devia acertar.
      // O PISO de 3px existe pelo traçante (8×1): a 90% da arte, o corpo dele teria ~1px de
      // altura e atravessaria inimigo sem tocar — visualmente acertando.
      //
      // O ÷stretch desfaz o esticão visual: o setSize é em px LOCAIS e o corpo escala junto com
      // o sprite, então dividir pelo stretch devolve o MESMO tamanho de mundo de antes (o truque
      // do míssil do TerrainSystem). O visual cresceu, a hitbox não — balanceamento fechado.
      b.body!.setSize(Math.max(b.width * 0.9, 3) / stretch, Math.max(b.height * 0.9, 3));

      b.setData('damage', damage);
      // Perfurante: o projétil não morre no inimigo, mas fere cada um só 1× — o Set guarda quem
      // já pagou. Setado a CADA disparo (o pool é compartilhado; um slot que foi perfurante não
      // pode continuar atravessando quando virar bala de pulse).
      b.setData('pierce', this.weapon.pierce === true);
      b.setData('hits', this.weapon.pierce ? new Set<Phaser.GameObjects.GameObject>() : null);
      // Origem guardada para medir o alcance percorrido.
      b.setData('ox', x);
      b.setData('oy', y);
      b.setData('range', this.weapon.range);

      // A perseguição viaja NO PROJÉTIL, não na arma: o pool é compartilhado, e um tiro disparado
      // pela nave alienígena tem que continuar caçando mesmo depois de o jogador ter trocado de
      // arma no meio do voo (uma cápsula de HMG pega no chão não pode "desligar" o que já saiu).
      //
      // `speed` é guardada porque a curva PRESERVA o módulo da velocidade — ela só gira o vetor.
      // Sem isto, `Math.cos(a) * speed` leria `undefined` e o projétil pararia no ar.
      b.setData('homing', this.weapon.homing);
      b.setData('speed', speed);

      // Boca paralela: ângulo FIXO do cano (traçantes paralelos tremidos não são traçantes).
      // Leque: centrado em 0°, pellets ímpares saem retos no meio.
      let angle: number;
      if (boca) {
        angle = boca.angle;
      } else {
        const t = pellets === 1 ? 0 : i / (pellets - 1) - 0.5;
        angle = t * spread + Phaser.Math.FloatBetween(-spread * 0.06, spread * 0.06);
      }
      const rad = Phaser.Math.DegToRad(angle);

      b.setVelocity(Math.cos(rad) * speed, Math.sin(rad) * speed);
      b.setRotation(rad);
    }

    // O flash de boca é o COICE visual: a Lança e o obus estouram mais partículas — metade do
    // que separa "tiro pesado" de "tiro comum", sem tocar em nenhum número de gameplay.
    this.muzzle.explode(this.weapon.muzzleFlash ?? 2, x, y);
    this.scene.cameras.main.shake(40, 0.0015);
  }

  /**
   * O figurino que roda TODO frame: o rastro do ENXAME e o pulso do obus.
   *
   * O rastro nasce recuado 6px pelo ângulo do voo — senão ele nasce em cima do nariz e o
   * projétil voa "dentro" da própria cauda (a mesma conta da fumaça do míssil, TerrainSystem).
   * Como a fase de cada teleguiado muda a cada frame de correção, é o rastro que torna a curva
   * VISÍVEL — e a curva é a arma.
   */
  private tickFx(): void {
    const t = this.scene.time.now;

    for (const obj of this.bullets.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (!b.active) continue;

      if (b.getData('homing')) {
        this.homingTrail.emitParticleAt(
          b.x - Math.cos(b.rotation) * 6,
          b.y - Math.sin(b.rotation) * 6,
        );
      }

      // O PULSO do obus: SÓ alpha — nunca escala, que arrastaria a hitbox de mundo junto.
      // A fase vem da origem do tiro (`ox`), senão dois obuses no ar pulsariam em uníssono.
      if (b.getData('glow') === true) {
        b.setAlpha(0.75 + 0.25 * Math.sin(t * 0.02 + (b.getData('ox') as number)));
      }
    }
  }

  /** Devolve ao pool em vez de destruir. */
  release(b: Phaser.Physics.Arcade.Sprite): void {
    b.setActive(false).setVisible(false);
    b.body!.enable = false;
    b.setVelocity(0, 0);
    // Sem isto, um slot que foi estilhaço de shotgun continuaria ardendo como bala de pulse.
    b.anims.stop();
    // E o figurino do glow: um slot que foi obus sairia brilhando (blend ADD) e pulsando
    // quando virar bala de pulse. O mesmo padrão do EnemySystem.release().
    b.setBlendMode(Phaser.BlendModes.NORMAL);
    b.setAlpha(1);
    b.setData('glow', false);
  }

  private cull(): void {
    for (const obj of this.bullets.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Sprite;
      if (!b.active) continue;

      if (b.x > GAME_WIDTH + 8 || b.x < -8 || b.y < -8 || b.y > 224) {
        this.release(b);
        continue;
      }

      // Alcance esgotado: o projétil se dissipa no ar.
      const range = b.getData('range') as number | null;
      if (range === null) continue;

      const dx = b.x - (b.getData('ox') as number);
      const dy = b.y - (b.getData('oy') as number);
      if (dx * dx + dy * dy >= range * range) this.release(b);
    }
  }
}
