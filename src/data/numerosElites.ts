/**
 * OS NÚMEROS DOS ELITES (spec 2026-10-05-frente-b-elites-design.md §2.5) — UM endereço, como o `numerosCartas.ts`.
 * Todos são CHUTE até a calibragem no sandbox. Módulo PURO (sem Phaser): o `test-elites-regras` roda em node.
 * Tempos em segundos, distâncias em px de jogo (384×216), velocidades em px/s.
 */
export const ELITES = {
  drone: {
    hp: 10,
    score: 250,
    /** Acorda quando a nave chega a esta distância. */
    raioAlerta: 90,
    /** ...ou quando a rocha passa deste x (nunca atravessa a tela minerando). */
    acordaAteX: 190,
    /** O alerta: a broca recolhe e o OLHO ACENDE (8 quadros a 12 qps). */
    alertaS: 0.65,
    velAtaque: 55,
    /** Quão rápido ele corrige o rumo para a nave (rad/s). */
    giro: 2.5,
    rajadaCadaS: 1.4,
    rajadaN: 3,
    /** 06/10, ele: os 3 saíam *"colados em fila indiana"* (0.12s ≈ 13px) — agora ~33px entre eles. */
    rajadaEspacoS: 0.3,
    velTiro: 110,
    ataqueMaxS: 5,
    raioPisca: 34,
    piscaS: 0.6,
    raioExplosao: 30,
    /** 06/10, ele: *"não precisa ser tão punitivo"* (eram 8). */
    estilhacos: 5,
    velEstilhaco: 100,
  },
  /** O asteroide minerável (o hazard `mineravel`). */
  rocha: { hp: 8, score: 40 },
  sentinela: {
    hp: 18,
    score: 350,
    velRolando: 120,
    /** O giro da roda (graus/s). */
    giroRolando: 540,
    abrirS: 0.5,
    fogoS: 2.5,
    /**
     * A SOBRECARGA (05/10, ele: *"precisa ter mais um time vulnerável, onde ele faz mais alguma coisa e pode tomar
     * dano"*): depois do fogo o escudo CAI e a MINIGUN VARRE em leque, de cima para baixo — uma cortina com buracos.
     */
    sobrecargaS: 1.6,
    /**
     * 06/10, ele: *"o leque precisa ser mais aberto, tire mais alguns projéteis para dar mais espaço"*. Eram ~11 tiros
     * a cada 0,15s em 70° (~6° entre eles); agora ~7 a cada 0,25s em 100° (~16° entre eles).
     */
    varreduraCadaS: 0.25,
    /** O arco TOTAL da varredura, centrado na esquerda. */
    varreduraArcoGraus: 100,
    velVarredura: 105,
    fecharS: 0.5,
    ciclos: 3,
    /** A abertura TOTAL do arco do escudo, centrado na esquerda. */
    escudoArcoGraus: 120,
    /**
     * A VIDA do escudo (06/10, pedido dele): zerada, ele QUEBRA até o próximo ABRIR (cada ciclo ergue um novo). A base
     * faz ~4 de dano/s e o escudo fica de pé ~3s (abrir + fogo): 8 = fogo concentrado o quebra em ~2s.
     */
    escudoHp: 8,
    /**
     * O FOGO com DOIS TIROS (05/10 (2), ele: *"como o golfinho, dois tipos de tiros"*), um cano de cada vez, alternando a
     * cada `alternarCadaS`: o CANHÃO DE CIMA solta a bola PESADA (grande e LENTA, mirada — sair da linha) e a MINIGUN o
     * LEQUE leve (rápido — achar o vão). Era rajada de 3 + anel de 8 + espiral: ~50 tiros por ciclo, impossível no meio
     * da fase; agora ~18.
     */
    alternarCadaS: 0.6,
    /** O BALAÇO do canhão de cima (06/10: era a bola rosa da canhoneira; agora o tiro desenhado, ver `Sentinela.ts`). */
    pesadoVel: 60,
    /**
     * 06/10, ele: o leque com MENOS tiros e mais espaço entre eles (eram 3 em 24°) — os elites atiram, mas a nave
     * ainda lida com o resto da fase. Com 2, o vão cai na linha da nave: o leque cerca, não caça.
     */
    lequeN: 2,
    /** 06/10 (2): mais aberto (era 28°), junto com a varredura. */
    lequeAberturaGraus: 36,
    lequeVel: 120,
    postoX: [230, 330] as const,
    postoY: [40, 176] as const,
    postoDistY: 50,
    velSaida: 140,
  },
  /**
   * O CAÇADOR DE VÁCUO (spec F3 §2) — desde 07/10 a LULA (Pro nº 15, 85%): ESCONDIDO (sem corpo) → SURGE → MIRA (segue
   * a nave) → TRAVA → RAJADA de agulhas na linha travada → SOME na tinta. 3 ressurgimentos, depois vai embora.
   */
  cacador: {
    hp: 10,
    score: 300,
    escondidoS: 1.2,
    surgeS: 0.3,
    miraS: 0.6,
    travaS: 0.3,
    /** As agulhas saem a cada `agulhaEspacoS` (3 em 0,16s); a rajada fecha logo depois. */
    rajadaS: 0.25,
    someS: 0.4,
    /**
     * A FUGA (12/10), no lugar do último SOME: ela recolhe os tentáculos (`fugaImpulsoS`, parada — ainda dá para matá-la),
     * solta a CORTINA e dispara esticada no rumo do manto a `velFuga`; aos `fugaS` já foi.
     */
    fugaS: 0.95,
    fugaImpulsoS: 0.35,
    velFuga: 320,
    ressurgimentos: 3,
    agulhaN: 3,
    agulhaEspacoS: 0.08,
    velAgulha: 200,
    /** Os postos: só na metade direita, longe da altura do anterior (a regra da sentinela). */
    postoX: [220, 340] as const,
    postoY: [36, 140] as const,
    postoDistY: 50,
  },
  /**
   * A TINTA da lula (spec F3 §2.3, 07/10): o SOPRO nos sumiços 1 e 2 (só a tampa), a CORTINA no último. Tempos desde o
   * jato: cresce até `cresceS`, segura até `seguraS`, esvai em pontilhado até `someS`. Os quadros são ASSADOS nestes
   * tempos (`scripts/_elites/_instalar-f3.mjs`, a `qps`) — mudou aqui, reinstale.
   */
  tinta: {
    sopro: { cresceS: 0.15, seguraS: 0.5, someS: 0.9 },
    cortina: { cresceS: 0.35, seguraS: 1.2, someS: 1.9 },
    qps: 20,
  },
  /**
   * A LARVA MECÂNICA (spec F4 §2): abre um BURACO no fundo e sai dele → PÕE pupas → TRANCO para o posto seguinte →
   * (`paradas` vezes) → PERFURA e MERGULHA no buraco. Não atira: o tiro dela são as pupas. O tempo do buraco abrindo
   * (o aviso, antes de ela existir) é o `buraco.abreS`.
   */
  larva: {
    hp: 12,
    score: 350,
    saiS: 0.4,
    poeS: 0.9,
    trancoS: 0.35,
    perfuraS: 0.5,
    mergulhaS: 0.4,
    /** No começo do SAI e no fim do MERGULHA ela é um ponto dentro do buraco: sem corpo (nem fere, nem é ferida). */
    miudaS: 0.18,
    paradas: 3,
    /** O knob principal (§2.2): o pior caso é `pupasPorParada × paradas` moscas por aparição. */
    pupasPorParada: 2,
    /** As pupas saem neste instante do PÕE (a cauda abre no meio do clipe). */
    pupaSaiS: 0.5,
    /** O leque das pupas: o meio-ângulo em volta da direção da nave. */
    pupaLequeGraus: 17,
    /** Os postos: só na metade direita (decisão dele: ziguezague, sem cruzar para o lado da nave). */
    postoX: [230, 340] as const,
    /** Do posto às bordas do vão: meio corpo + folga — ela nunca encosta em mesa nem em parede. */
    postoMargem: 14,
    /**
     * Cada posto fica pelo menos a isto da altura do anterior. O duto mais fechado (vão de 68) deixa 68 − 2×14 = 40px
     * de faixa: com 20, a ponta mais longe do anterior sempre serve.
     */
    postoDistY: 20,
  },
  /**
   * O BURACO da Larva: abre em `abreS` (5 quadros), fecha em `fechaS` (3 quadros, de trás para a frente) e deixa uma
   * cicatriz que some em `cicatrizS` (4 quadros, perdendo pixels). Quadros ASSADOS por `scripts/_elites/_instalar-f4.mjs`.
   */
  buraco: {
    abreS: 0.5,
    fechaS: 0.25,
    cicatrizS: 1.0,
    /**
     * ONDE ELE ABRE (spec F4 §9.5): só na face da BORDA ou de uma MESA — nunca na pintura do fundo. As colunas de
     * tela em que a borda é candidata (na metade direita, como os postos), a profundidade do centro do buraco dentro
     * da faixa e dentro da mesa (a partir da beira que dá para o corredor), e a folga de uma mesa que tape a coluna.
     * ⚠️ O buraco anda com a superfície (84 px/s): ~76px entre abrir e ela sair dele, ~105px do tranco da saída ao fim
     * do mergulho. Por isso as colunas começam em 280, não em 250 — aberto em 250, ela saía em x≈174 (14/10, a sonda).
     */
    colunas: [280, 300, 320, 340, 360] as const,
    naBordaPx: 14,
    naMesaPx: 18,
    folgaMesa: 16,
  },
  /**
   * A PUPA (§2.2): voa `vooPx` em `vooS` e PARA no ar; pulsa cada vez mais rápido; eclode em `eclodeS`. O TREMOR
   * (§9.2): nos últimos `tremeS` ela treme ±1px, o passo encurtando de 0,1 para 0,03s.
   */
  pupa: { hp: 1, score: 20, vooPx: 50, vooS: 0.4, eclodeS: 2.0, tremeS: 0.6, tremePassoS: [0.1, 0.03] as const },
  /**
   * A MOSCA (§2.2): mais lenta que o kamikaze (ele: velocidade 45, perseguição 150, teto 190). O TREMOR (§9.6): uma
   * aceleração lateral de até `tremorAcel` px/s², num ritmo sorteado em `tremorHz`.
   */
  mosca: { hp: 1, score: 30, velInicial: 40, perseguicao: 110, velMax: 120, bateAsaS: 0.06, tremorAcel: 160, tremorHz: [1.5, 3] as const },
  /**
   * O TUBO PULSANTE (spec F4 §3 e §9.3): preso à parede, rola com ela → INCHA (o aviso) → PULSA uma nuvem de ESPOROS
   * que deixam a nave lenta. ⚠️ A densidade se decide jogando: os knobs são `esporosN`, `pulsos` e o bloco `esporo`.
   */
  tubo: {
    hp: 10,
    score: 300,
    inchaS: 0.6,
    pulsaS: 0.35,
    pulsos: 2,
    /** O x de tela em que cada INCHA começa (ele vem da direita com a parede). Um por pulso. */
    pulsoX: [310, 190] as const,
    /** Os ESPOROS de cada pulso (§9.3): uma nuvem de 6 (`esporosDoPulso`), nos dois pulsos. */
    esporosN: 6,
    /** Onde ele nasce (fora da tela) e onde as mesas nascem (`TerrainSystem.spawn`: `GAME_WIDTH + 30`). */
    nasceX: 428,
    mesaX: 414,
    /** A mesa (`f4-mesa*.png`, 94px) e a arte dele (35–36px). */
    larguraMesa: 94,
    largura: 36,
    folgaMesa: 6,
    folgaEmenda: 4,
    /** A largura de uma placa da borda (`Moldura.LARGURA`): a parede tem degrau nas emendas. */
    placa: 128,
    /** O pé entra 5px na borda (§9.4: com 2 ele parecia pousado, não preso). O pé de raízes cobre o resto. */
    afunda: 5,
    /** Esperou isto sem caber: nasce assim mesmo — uma entrada do roteiro não some em silêncio. */
    esperaMaxS: 8,
  },
  /**
   * O ESPORO do Tubo (spec F4 §9.3): cada um sai num rumo sorteado dentro de um cone de ±`coneGraus` para dentro do
   * corredor, com a velocidade (`vel`) e a freada (`freiaS`) dele, e o sopro se espalha por `soproS` — uma NUVEM, não um
   * arco (calibragem de 14/10, o desenho dele: *"a soltura de esporos mais orgânica e desorganizada … e para cima,
   * cobra destreza do jogador"*). Parado, ele anda com o cenário, pairando (`balancoPx`, num ciclo de `balancoS`) e
   * subindo devagar (`sobe` px/s, para dentro do corredor), e some nos últimos `someS` dos `vidaS`. Não fere; o tiro o
   * atravessa. `corpo` = a hitbox (quadrada, centrada). A distância de cada um = vel × freiaS / 2 (de ~11 a ~68px).
   */
  esporo: {
    coneGraus: 60,
    vel: [30, 105] as const,
    freiaS: [0.7, 1.3] as const,
    soproS: 0.3,
    sobe: 5,
    vidaS: 3.5,
    someS: 0.5,
    balancoPx: 1.5,
    balancoS: [1.2, 2.0] as const,
    corpo: 5,
  },
  /**
   * A LENTIDÃO do esporo (§9.3): a nave voa a `velocidade` × o normal por `duracaoS`. Outro toque renova, não soma.
   * 14/10, ele: *"a lentidão pode ser para 60%, punitiva"* — 60% mais lenta (era 40%).
   */
  lentidao: { velocidade: 0.4, duracaoS: 2.5 },
};
