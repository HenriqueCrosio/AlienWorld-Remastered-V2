/**
 * OS NÚMEROS DO CENÁRIO DA F1 (spec `2026-10-20-f1-cenario-design.md` §4): a pintura dele em camadas, a deriva, a
 * cordilheira tirada da pintura, a bruma e o chão. Tudo em PIXELS DE JOGO. Módulo puro: os testes o leem no Node.
 */

/**
 * A PINTURA INTEIRA (`assets/raw/Cidadela Gótica entre Montanhas Nebulosas.png`, 1768×890) reduzida à altura da tela.
 * A regra é dele (20/10): *"todos os fundos das fases são no tamanho original da pintura, exatamente para dar o aspecto
 * de grandeza e profundidade"* — nunca recorte ampliado. A sobra de 45 px vira a deriva da fase inteira.
 */
export const PINTURA = { largura: 429, altura: 216, derivaMax: 45, derivaSeg: 110 } as const;

/**
 * O horizonte fica NA FRENTE da pintura do zero-G (−95,5, opaca), que só aparece quando a saída o apaga. A invasão
 * (rodada 2) vive entre a pintura e a bruma (−91): fumaça atrás das naves, o fogo e o magenta na frente, a luz por cima.
 */
export const PROF = {
  pintura: -94.6,
  apagadas: -94.59,
  agua: -94.58,
  fumaca: -94.57,
  naves: -94.565,
  explosao: -94.56,
  fogo: -94.555,
  magenta: -94.55,
  holofote: -94.545,
  tracante: -94.54,
  clarao: -94.535,
} as const;

/**
 * A INVASÃO AO LONGO DA FASE (spec §5, rodada 2): a colônia cai na frente do jogador, pela LUZ, presa ao relógio da
 * fase (o roteiro: a colônia aparece aos 12 s, "DEFESAS DE SOLO ATIVAS" aos 23, "FOGO CRUZADO" aos 47, o silêncio aos
 * 63). As coordenadas são da PINTURA (429×216); o horizonte soma a deriva.
 *
 * Regras (as do menu): um evento forte por vez — explosão rara e curta; o constante (fogo, fumaça) lento e fraco. O
 * magenta do fundo fica mais apagado que os olhos dos inimigos e debaixo da névoa: ninguém atira no fundo.
 */
export const INVASAO = {
  /** O coração da colônia (a cidadela): a invasão chega de fora para dentro, e ela cai por último. */
  centro: { x: 277, y: 88 },
  /** As janelas apagam entre `ini` e `fim` (s), as de fora primeiro; `sorte` embaralha ±s; `falha` = a falha antes. */
  janelas: { ini: 16, fim: 58, sorte: 3, semente: 57, falhaDur: 0.4, falhaHz: 12 },
  /** Onde o âmbar morre, o magenta acende: 1 a cada `cada` janelas, `atraso` s depois, pulsando devagar. */
  magenta: { cada: 4, atrasoMin: 1.2, atrasoVar: 2.5, entra: 1.2, alfaMin: 0.32, alfaMax: 0.58, perMin: 2.2, perVar: 2, diametro: 4, cor: 0xb8346e, corNucleo: 0xd0508a },
  /** A ponta da cidadela fica magenta aos `t` s (a defesa foi tomada; logo antes de "ALERTA · TORRE DE DEFESA"). */
  topo: { t: 55, x: 283, y: 53, diametro: 7, alfa: 0.75 },
  /** Os holofotes da defesa varrendo as nuvens; cada um apaga (com a falha) aos `fim` s. Ângulos em graus (−90 = para cima). */
  holofotes: [
    { x: 191, y: 72, base: -102, amp: 14, per: 19, fase: 0, comp: 110, fim: 26 },
    { x: 262, y: 75, base: -84, amp: 16, per: 23, fase: 2, comp: 130, fim: 36 },
    { x: 323, y: 88, base: -70, amp: 12, per: 17, fase: 4, comp: 100, fim: 44 },
  ],
  feixe: { largura: 9, alfa: 0.11, cor: 0xd8e4ff, lampada: 2.2, alfaLampada: 0.6, falha: 0.5 },
  /** A artilharia da colônia: rajadas de traçantes subindo até `fim` s; cada rajada a cada `intervalo` s. */
  armas: [
    { x: 196, y: 80, angulo: -78, fim: 27, semente: 3 },
    { x: 268, y: 82, angulo: -96, fim: 41, semente: 5 },
    { x: 318, y: 92, angulo: -66, fim: 45, semente: 7 },
  ],
  rajada: { intervaloMin: 2.2, intervaloVar: 2.4, tirosMin: 3, tirosVar: 3, cadencia: 0.09, abre: 6, vel: 72, vida: 0.95, chanceFlak: 0.35, flakFps: 12 },
  /** As naves invasoras descendo das nuvens para a colônia; somem na névoa no fim (pousam lá longe). */
  naves: [
    { t: 13, de: [150, -12], para: [204, 92], dur: 9, tipo: 0 },
    { t: 19, de: [338, -12], para: [292, 94], dur: 8, tipo: 1 },
    { t: 27, de: [70, -10], para: [176, 98], dur: 10, tipo: 0 },
    { t: 34, de: [410, -8], para: [318, 96], dur: 9, tipo: 1 },
    { t: 41, de: [236, -12], para: [258, 90], dur: 8, tipo: 0 },
  ],
  nave: { alfa: 0.9, entra: 0.12, some: 0.35, balanco: 0.8 },
  /** As explosões ao longe (a folha da cena final reduzida): onde uma janela grande morre perto da hora. */
  explosoes: [14, 19.5, 25, 30, 35.5, 41, 46, 51, 55.5, 59.5],
  explosao: { fps: 24, clarao: 70, alfaClarao: 0.2, decaiClarao: 0.45, corClarao: 0xffa060 },
  /** Cada explosão deixa um fogo (depois de `fogo` s) e uma coluna de fumaça (depois de `fumaca` s). */
  rastro: { fogo: 0.35, fumaca: 1.4, fogoFps: 8, fumacaFps: 5, alfaFumaca: 0.62, entraFumaca: 3, brilho: 7, corBrilho: 0xff9a50, alfaBrilho: 0.28 },
} as const;

/** A cachoeira da pintura (a caixa e os quadros vêm do `dados.json`). */
export const CACHOEIRA_F1 = { fps: 10 } as const;

/**
 * A BRUMA ENTRE OS PLANOS: a textura `fogBand` das fases, na cor da névoa da pintura. A de cima separa a pintura do
 * chão; a de baixo passa entre o Vale e a Paisagem (depth entre os dois). Leve: ela é volume, não véu.
 */
export const BRUMA_F1 = [
  { y: 92, h: 96, pico: 0.2, fator: 0.2, depth: -91 },
  { y: 124, h: 92, pico: 0.16, fator: 0.4, depth: -87 },
] as const;

/**
 * O CHÃO (rodada 5, 20/10) — as DUAS pinturas dele, no quadro da pintura (1768×890 → 429×216), assadas em faixas sem
 * emenda por `scripts/_g/_camadas-chao-f1.mjs` (as caixas em `sprites/f1/chao.json`):
 * - `vale`     o "Valle Industrial Devastado": as colinas enevoadas e as torres arruinadas, o plano de trás;
 * - `paisagem` a "Paisagem Montanhosa Sombria com Brasas": as montanhas quase pretas, o chão onde as estruturas pisam;
 * - `frente`   o entulho baixo, quase preto, NA FRENTE do pé das estruturas e atrás da nave (depth −0,2).
 * A ordem é a escolha dele (20/10, "Vale atrás, Paisagem na frente"); as estruturas ficam entre a Paisagem e a frente.
 *
 * ⚠️ A FRENTE ANDA MAIS RÁPIDO QUE O MUNDO (1,15): ela está mais perto que as estruturas, então passa NA FRENTE delas. O
 * pé de cada uma nunca aparece porque o plantio fica abaixo do topo mais baixo da faixa (ver `PLANTIO_F1`).
 *
 * - `perto`    o PRIMEIRO PLANO: a frente espelhada, mais baixa e mais escura, NA FRENTE da nave (depth 60) e mais
 *              rápida ainda; só as pontas aparecem rente ao rodapé. Some na luta do chefão e com um elite em cena, como
 *              o primeiro plano de sempre. Substitui o pico de gelo tingido de azul ("manchas azuis", 20/10).
 *
 * `queda`: quanto cada faixa desce ao romper a atmosfera (a mais longe cai menos — a parallax da saída).
 */
export const CHAO_F1 = {
  vale: { fator: 0.3, depth: -88, queda: 40 },
  paisagem: { fator: 0.5, depth: -86, queda: 60 },
  frente: { fator: 1.15, depth: -0.2, queda: 90 },
  perto: { fator: 1.5, depth: 60, queda: 110 },
} as const;

/**
 * OS AGLOMERADOS (rodada 6, 21/10 — a ideia dele: "pode criar novos tipos de edifícios ou aglomerados"): trechos do
 * perímetro da colônia numa peça só (cúpulas com pináculos, tanque, canos, o invasor), DECORAÇÃO num plano entre a
 * Paisagem e as estruturas — a colônia lê como lugar, e a jogabilidade não muda. A regra da camada de trás: menores
 * (60%, `_aglomerados-f1.mjs`), no tom da Paisagem (a cadência), mais lentos que o mundo. Atrás da névoa rasteira (−84),
 * o pé enterrado atrás do entulho da frente.
 */
export const AGLOMERADOS_F1 = { chave: 'f1Aglomerado', fator: 0.72, depth: -85, baseY: 212, gap: [150, 330] } as const;

/** A QUEDA do chão na saída da atmosfera: a duração e a curva (as da queda do terreno de sempre). */
export const QUEDA_CHAO_F1 = { ms: 2500 } as const;

/**
 * AS BRASAS do chão (as luzes quentes das duas pinturas, `_luzes-chao-f1.mjs`): cada faixa tem três terços de brasas, e
 * o quanto cada terço está APAGADO é uma soma de três senos (`freq`, rad/s) com fase própria — elas tremulam, nunca em
 * uníssono, e nunca se apagam de todo (`max`).
 */
export const BRASAS_F1 = { base: 0.18, amp: 0.42, max: 0.7, freq: [3.1, 5.3, 1.1] } as const;

/** A FUMAÇA dos fogos das torres do Vale: a coluna da invasão (`f1-fumaca`), subindo do fogo, presa à faixa. */
export const FUMACA_CHAO_F1 = { fps: 5, alfa: 0.5 } as const;

/**
 * O PLANTIO DA SUPERFÍCIE (rodada 5): o pé de cada estrutura da F1 é sorteado entre `fundo` e `frente` (y de tela), sem
 * repetir a altura do vizinho (`saltoMin`) — a regra do casco da F3 (`TerrainSystem.PLANTIO`), que tirou a "tira de
 * adesivos". ⚠️ `fundo` fica ABAIXO do topo mais baixo da faixa da frente (`chao.json` → `frente.cobreDe`): é isso que
 * garante o pé sempre escondido. A sonda confere.
 */
export const PLANTIO_F1 = { fundo: 204, frente: 213, saltoMin: 4 } as const;

/** As cores tiradas da pintura (`_cor-nevoa-f1.mjs`). */
export const COR = {
  /** A névoa da pintura (a média da bruma pintada, com o toque frio): a bruma e a névoa rasteira. */
  nevoa: 0x21293a,
} as const;
