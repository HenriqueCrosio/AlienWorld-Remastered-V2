/**
 * OS NÚMEROS DO MENU (spec `docs/superpowers/specs/2026-10-19-menu-refeito-design.md`). Saíram das nove rodadas de
 * maquete (`scripts/_menu/_maquete2.mjs`), aprovadas por ele em 19/10. Tudo em PIXELS DE JOGO (384×216) e segundos;
 * cores em 0xRRGGBB; ângulos em graus (−90 = para cima).
 *
 * Módulo puro: sem Phaser, sem DOM (os testes `scripts/test-menu-*.mjs` e os scripts de `scripts/_menu/` o leem).
 */

export const LARGURA = 384;
export const ALTURA = 216;
export const TITULO = 'ALIEN WORLD';
export const SUBTITULO = 'R E M A S T E R E D';

// ─── O CENÁRIO ──────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * §3.1 O Leviatã: a travessia em loop (sai à direita, o céu fica vazio, ele volta a sair da nuvem).
 * 22/10, ele: *"vai caindo degraus… parece travado… algo mais orgânico… passar mais lentamente, tipo 1h30 ou 2min"*.
 * A travessia foi de 45 s para 120 s (escolha dele entre 90 e 120, na folha `folhas/2026-10-22/menu.html`); ela ONDULA
 * (`onda`: meias-ondas de seno em cima da reta, zero nas pontas) em vez da reta; e o lugar dele quando o título acende
 * (`noTitulo`: a fração da travessia aos `t` s, a de 19/10) não muda — o `adiantar` sai dele. Os degraus eram o
 * `roundPixels` (ver `leviata.ts`).
 */
export const TRAVESSIA = {
  x0: 200, y0: 30, x1: 404, y1: 42, seg: 120, pausa: 6, nadoFps: 6, quadros: 16,
  noTitulo: { t: 9, u: 0.267 },
  onda: { amp: 2.5, meias: 3 },
} as const;

/**
 * §3.5b (22/10) O ESPAÇO entre a colônia e o planeta (ele: *"atrás da imagem da colônia e na frente do leviatã e do
 * layer de trás haja um efeito de mais fog, que mostre que aquilo é o espaço"*). Mora entre as profundidades do
 * Leviatã (1) e da cidade (2), na frente dele e do planeta: só aparece na janela. Das três variantes da maquete (véu,
 * nebulosa, nebulosa iluminada) ele escolheu o VÉU, "levemente mais densa" (os picos subiram 20%: 0,55/0,6 → 0,66/0,72).
 * Duas faixas da bruma das fases (`menu-fog`), frias, devagar. `y`/`h` em px de jogo; `vel` em px/s (positivo = o
 * desenho anda para a esquerda).
 */
export const ESPACO = [
  { y: 2, h: 70, tint: 0x3e4a62, pico: 0.66, vel: 0.7, depth: 1.45 },
  { y: 40, h: 76, tint: 0x36435a, pico: 0.72, vel: 1.6, depth: 1.55 },
] as const;

/** §3 As estrelas: só na janela aberta (a cidade transparente) e onde o céu é escuro. */
export const ESTRELAS = {
  quantidade: 9, tentativas: 400, xMin: 200, xVar: 184, yVar: 80, lumMax: 13, diametro: 1.6, semente: 11,
  cores: [0xc8d4ee, 0x8fa0c8],
} as const;

/** §3.2 As 24 janelas que apagam de tempos em tempos (35% com uma falha antes). */
export const JANELAS = {
  quantidade: 24, areaMax: 6, semente: 23, cicloMin: 4, cicloVar: 7, foraMin: 0.4, foraVar: 2.2, faseVar: 11,
  chanceFalha: 0.35, falhaDur: 0.5, falhaHz: 12, margem: 1,
} as const;

/** §3.2 Os faróis: 1,4 s acesos a cada 2,3 s; os da mesma torre (≤ 3 px de lado, ≤ 14 de altura) juntos. */
export const FAROIS = { areaMax: 4, ciclo: 2.3, acesoAte: 1.4, margem: 3, torreDx: 3, torreDy: 14 } as const;

/** §3.2 A cachoeira. */
export const CACHOEIRA = { fps: 10 } as const;

/** §3.3 O tráfego: só no trecho visível de cada deque (de → até), sumindo nos últimos `pontaFade` px. */
export const TRAFEGO = {
  pontes: [
    [70, 120.5, 145, 122.3], [58, 166, 112, 166], [127, 157.6, 157, 157.6], [277, 182.6, 342, 182.6],
    [332, 130.6, 346, 130.6],
  ],
  porComprimento: 28, pontaFade: 2.5, velMin: 3, velVar: 6, diametro: 3.2, alongar: 1.5, chanceCor1: 0.7,
  cores: [0xffc88a, 0xfff0d0],
} as const;

/** §3.4 A nave: parada onde ele pintou; só as luzes vivem (posições relativas ao recorte). */
export const NAVE = {
  fileira: [[5, 7], [11, 7], [16, 7], [18, 7], [21, 7], [24, 7]],
  baixo: [[7, 8], [9, 9], [17, 10]],
  topo: [17, 3],
  diametro: 2.4, corFileira: 0xffb05a, corBaixo: 0xd8823c, corTopo: 0xff3a2a, corridaHz: 7, apagada: 0.35,
  topoPeriodo: 1.6, topoAceso: 0.25,
} as const;

/** §3.5 O volume: a bruma das fases, os fachos frios, a volumetria da cutscene 2. */
export const VOLUME = {
  longe: { y: 34, h: 72, tint: 0x3a4658, pico: 0.3, vel: 1.2 },
  bandas: [
    { y: 108, h: 70, tint: 0x2c3647, pico: 0.42, vel: 1.5, frente: false },
    { y: 126, h: 70, tint: 0x323d50, pico: 0.38, vel: 3, frente: false },
    { y: 144, h: 72, tint: 0x384558, pico: 0.34, vel: 5, frente: false },
    { y: 158, h: 76, tint: 0x262f3e, pico: 0.3, vel: 8, frente: true },
    { y: 172, h: 80, tint: 0x1d2531, pico: 0.24, vel: 12, frente: true },
  ],
  fachos: [
    { x: 300, y: 72, escala: 2.0, pico: 0.18, deriva: 4, angulo: -32 },
    { x: 210, y: 122, escala: 2.4, pico: 0.15, deriva: 6, angulo: -30 },
    { x: 330, y: 150, escala: 1.6, pico: 0.13, deriva: 5, angulo: -34 },
  ],
  corFacho: 0xc8d6ff,
  halos: {
    quantidade: 5, margem: 14, diamMin: 26, diamVar: 12, cor: 0xffb066, baseMin: 0.22, baseVar: 0.1, durMin: 1.8,
    durVar: 1.4, semente: 37,
  },
  fachosLuz: {
    quantidade: 2, cor: 0xffcf9a, alfaMin: 0.05, alfaVar: 0.04, anguloMin: -70, anguloVar: 40, larguraMin: 0.22,
    larguraVar: 0.1, compMin: 0.5, compVar: 0.2,
  },
} as const;

// ─── O PERIGO ───────────────────────────────────────────────────────────────────────────────────────────────────

/** §4.1 Os holofotes antiaéreos, em estruturas da pintura. */
export const HOLOFOTES = [
  { x: 26, y: 80, base: -98, amp: 16, per: 21, fase: 0, comp: 120 },
  { x: 52, y: 96, base: -80, amp: 13, per: 17, fase: 3.1, comp: 130 },
  { x: 300, y: 82, base: -84, amp: 14, per: 25, fase: 1.3, comp: 110 },
] as const;

export const FEIXE = {
  largura: 10, alfa: 0.14, cor: 0xd8e4ff, lampada: 2.6, corLampada: 0xf0f4ff, alfaLampada: 0.8, vaguear: 0.25,
  vaguearPer: 0.37,
} as const;

/** §4.2 A nave vasculhando a colônia (posições relativas ao recorte da nave). */
export const BUSCA = {
  origem: [14.5, 11.2], comp: 75, largura: 22, alfa: 0.16, base: 92, amp: 26, per: 15, ampFina: 6, perFina: 6.3,
  lampada: 2, corLampada: 0xeef4ff, alfaLampada: 0.7,
} as const;

export const PROPULSORES = { pontos: [[8, 9.6], [19, 9.3]], diametro: 2.4, cor: 0x9cc2ff, alfa: 0.5, jato: [7, 3], alfaJato: 0.16 } as const;

/** §4.3 A tempestade chegando, na massa de nuvem que ele marcou. */
export const TEMPESTADE = {
  regiao: [
    [2, 10], [15, 2], [75, 1], [201, 6], [226, 12], [239, 33], [259, 48], [264, 65], [254, 80], [226, 100], [196, 110],
    [176, 105], [131, 103], [95, 110], [83, 116], [58, 114], [38, 105], [15, 90], [4, 75], [1, 38],
  ],
  borda: 10,
  /** [x, y, raio]: de onde cada clarão se espalha. */
  focos: [[60, 35, 85], [150, 28, 95], [215, 55, 70]],
  /** Os traçados dos raios, ponta a ponta (o raio n mora no foco n). */
  raios: [[[36, 16], [104, 44]], [[142, 10], [196, 38]], [[206, 26], [168, 70]]],
  semente: 91,
  /** Cada relâmpago: [início, força, duração] de cada golpe; a cauda decai em `decai` s. */
  golpes: [[0, 1, 0.06], [0.11, 0.5, 0.05], [0.22, 0.9, 0.08]],
  decai: 0.09,
  duracao: 1.5,
  forca: 0.65, cor: 0xc8d0ff, corRaio: 0xe4e8ff, global: 0.05, corGlobal: 0x8890b0,
  rolar: { alfa: 0.8, cor: 0x05070c, escala: [2.2, 2.4], vel: 3, ondula: 6, ondulaHz: 0.05, someDe: 58, someAte: 80 },
  primeiro: { t: 2.4, foco: 0, comRaio: true },
  intervalo: [6, 12],
  chanceRaio: 0.5,
} as const;

// ─── A ABERTURA E O MENU ────────────────────────────────────────────────────────────────────────────────────────

/** §6.1–6.2 O véu, o lugar das coisas e a queda do letreiro. */
export const ABERTURA = {
  veu: 1.2,
  layout: { x: 192, titulo: 58, sub: 71, lista: [178, 188, 198], desc: 208 },
  letreiro: {
    t0: 3.0, yIni: -30, queima: 3.8, forma: 2.4, sobra: 2.5,
    molaY: { periodo: 0.9, amortecimento: 0.55 },
    deriva: 6,
    molaX: { periodo: 1.4, amortecimento: 0.35 },
    /** Os jatos param de emitir este tanto depois do fim da queima. */
    fimJatos: 2,
  },
} as const;

/** §6.3 Os jatos. */
export const JATOS = {
  taxa: 420, aRef: 60, queimaAprovada: 2.2, teto: 1.4, vida: [0.18, 0.42], vel: [90, 150], abre: 0.32, arrasto: 0.13,
  herda: 0.6, deriva: [-3, -2], espalho: [2.5, 1.5], quente: 0.05, chama: 0.13, max: 1600,
  cores: { quente: 0xfff3dc, chama: 0xffb860, vapor: 0x9eacc2 },
  /** [dx, dy, ux, uy, peso]: a partir do centro do letreiro; (ux, uy) é a direção do GÁS. */
  bicos: [
    [-34.1, 16.5, 0, 1, 0.8], [-13.6, 16.5, 0, 1, 0.8], [14.9, 16.5, 0, 1, 0.8], [33.9, 16.5, 0, 1, 0.8],
    [-48, -7, 0, -1, 0.5], [48, -7, 0, -1, 0.5],
    [-62, 0, -1, 0, 0.3], [-50, 13, -1, 0, 0.22],
    [62, 0, 1, 0, 0.3], [50, 13, 1, 0, 0.22],
  ],
} as const;

/** §6.4 A lista: em formação, depois do letreiro. */
export const LISTA = { t0: 7.2, queda: 14, passo: 0.08, periodo: 0.95, amortecimento: 0.5, fade: 0.45, assenta: 1.4 } as const;

/** §6.4 O acender: cada letra acesa, apagada, acesa (a falha das janelas). */
export const ACENDE = { t0: 8.8, porLetra: 0.07, subDepois: 0.1, subPorLetra: 0.025, olhos: 0.45, acesaAte: 0.04, apagadaAte: 0.09 } as const;

/** §6.4 O repouso. */
export const REPOUSO = { respira: 5.2, respiraMin: 0.82, piscaPeriodo: 2.2, piscaMin: 0.4, outros: 0.7 } as const;

export const CORES_TEXTO = {
  selecionado: 0xb5f7ff, item: 0xd0d0dc, subApagado: 0x2f3c50, subAceso: 0x17a6bd, tituloApagado: 0x4b5a70,
  tituloAceso: 0xb5f7ff, dev: 0x6b6b7a,
} as const;

/** §7.2 Os itens da lista. */
export const ITEM = { comecar: 0, conducao: 1, arquivo: 2 } as const;
export const NOMES_ITENS = ['COMEÇAR', 'CONDUÇÃO', 'ARQUIVO DE CARTAS'] as const;

export const CONDUCOES = [
  { id: 'diegetico', nome: 'DIEGÉTICA', desc: 'a gravidade decide · recomendado', cor: 0x3ee0f0 },
  { id: 'flap', nome: 'LEGACY', desc: 'flap sempre · score ×1.25', cor: 0xff8c1a },
  { id: 'free', nome: 'LIVRE', desc: 'voo livre sempre · acessível', cor: 0x17a6bd },
] as const;

/** A chave da condução lembrada (`localStorage`). */
export const CHAVE_CONDUCAO = 'alienworld:conducao';
