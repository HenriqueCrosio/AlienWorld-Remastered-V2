/**
 * OS NÚMEROS DA VIDA DO AMANHECER (13/11, bloco I etapa 3, parte B — spec `2026-11-13-bloco-i-tela-final-amanhecer-design.md`
 * §1, a decisão 5): o que vive por cima da pintura dele, um efeito por rodada. Tudo em px de JOGO (384×216), medido na
 * pintura com régua. Módulo PURO: o teste `scripts/test-menu-amanhecer.mjs` o lê.
 *
 * O amanhecer é uma cena de DEPOIS da batalha: mais lenta e mais quieta que a noite (as velocidades da bruma são
 * cerca de metade das de `VOLUME`), sem perigo no ar.
 */

/** Os efeitos, na ordem das rodadas. `?vida=bruma,raios` na URL liga só alguns (as maquetes). */
export const EFEITOS = ['bruma', 'raios', 'fumaca', 'fogo', 'brasas', 'lava', 'cinza', 'veu'] as const;
export type Efeito = (typeof EFEITOS)[number];

/**
 * A BRUMA: as faixas do menu (a textura das fases), nos cinzas da névoa pintada, só no vale — e só SOBRE A NÉVOA que a
 * pintura já tem (a máscara `nevoa`: cinza, de claridade média). As silhuetas pretas, o osso das costelas, a lava e o
 * fogo ficam limpos (a 1ª maquete, com a máscara só de claridade, lavava a carcaça). Ele, vendo a rodada 1: *"um pouco
 * mais densa, não muito"* — os picos subiram um quarto (eram 0,30 · 0,30 · 0,26 · 0,22).
 */
export const BRUMA = {
  bandas: [
    { y: 92, h: 64, tint: 0x5e5a5e, pico: 0.38, vel: 0.7 },
    { y: 116, h: 70, tint: 0x696468, pico: 0.38, vel: 1.5 },
    { y: 138, h: 72, tint: 0x716c6f, pico: 0.33, vel: 2.6 },
    { y: 158, h: 76, tint: 0x4c484a, pico: 0.28, vel: 4.2 },
  ],
} as const;

/**
 * OS RAIOS DE SOL: em cada abertura das nuvens da pintura (`fontes`, o ponto da abertura), um leque de fachos para
 * baixo (os ângulos em graus a partir do eixo x, no sentido do relógio: 90 = a prumo), cada um respirando no seu ritmo
 * e balançando um nada. Aditivos, quentes, fracos: reforçam os raios pintados, não desenham outros. Passam ATRÁS das
 * torres (a mesma máscara `luz`).
 */
export const RAIOS = {
  cor: 0xffdcae,
  fontes: [
    { x: 221, y: 39, de: 58, ate: 116, n: 5, comp: [38, 52], larg: [6, 10], pico: 0.3 },
    { x: 306, y: 49, de: 70, ate: 112, n: 4, comp: [30, 40], larg: [6, 9], pico: 0.26 },
    { x: 187, y: 64, de: 70, ate: 130, n: 4, comp: [32, 44], larg: [6, 9], pico: 0.24 },
  ],
  /** o período da respiração de cada facho (s) e o quanto ele balança (graus) */
  respira: [7, 13],
  balanco: 1.5,
  /** o mínimo da respiração (× o pico): cada facho quase some e volta */
  minimo: 0.15,
  semente: 91,
} as const;

/** A máscara `luz`: o quanto um pixel da pintura deixa a bruma e os raios aparecerem, pela claridade dele (0–255). */
export const MASCARA_LUZ = { de: 22, ate: 52 } as const;

/** A fração (0–1) da máscara para uma claridade `lum` (0–255): 0 nas silhuetas pretas, 1 no céu e na névoa. */
export function mascaraLuz(lum: number): number {
  const u = Math.min(1, Math.max(0, (lum - MASCARA_LUZ.de) / (MASCARA_LUZ.ate - MASCARA_LUZ.de)));
  return u * u * (3 - 2 * u);
}

const rampa = (a: number, b: number, x: number): number => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/** A máscara `nevoa`: a névoa PINTADA — cinza (pouca cor) e de claridade média. */
export const MASCARA_NEVOA = { lumDe: 30, lumCheia: 50, lumAte: 95, lumFim: 130, corCheia: 14, corFim: 30 } as const;

/**
 * A CARCAÇA na pintura (px de jogo): a elipse que a contém, medida com régua. É a imagem da vitória: a bruma viva quase
 * não passa por cima dela (`bruma` × a máscara), e é dela que sobem as brasas e onde a lava respira (as próximas rodadas).
 */
export const CARCACA = { x: 218, y: 152, rx: 118, ry: 30, bruma: 0.2 } as const;

/** O quanto a bruma vale no ponto (x, y) de jogo por causa da carcaça: `CARCACA.bruma` dentro da elipse, 1 fora, macio na borda. */
export function brumaNaCarcaca(x: number, y: number): number {
  const d = Math.hypot((x - CARCACA.x) / CARCACA.rx, (y - CARCACA.y) / CARCACA.ry);
  return CARCACA.bruma + (1 - CARCACA.bruma) * rampa(0.8, 1.2, d);
}

/**
 * A fração (0–1) da máscara da névoa para um pixel (r, g, b): 0 no preto, sobe até a claridade média, cai de novo no
 * claro (o osso, o céu aceso), e cai com a cor (a lava, o fogo, o âmbar dos raios).
 */
export function mascaraNevoa(r: number, g: number, b: number): number {
  const M = MASCARA_NEVOA;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const cor = Math.max(r, g, b) - Math.min(r, g, b);
  return rampa(M.lumDe, M.lumCheia, lum) * (1 - rampa(M.lumAte, M.lumFim, lum)) * (1 - rampa(M.corCheia, M.corFim, cor));
}

/**
 * A CAIXA DA LAVA (px de jogo): o retângulo em volta da carcaça onde a peça `lava-apagada` é assada.
 */
export const CAIXA_LAVA = { x: 92, y: 116, w: 252, h: 74 } as const;

/** O ponto (x, y) de jogo está na carcaça (dentro da elipse de `CARCACA`)? */
export const naCarcaca = (x: number, y: number): boolean => Math.hypot((x - CARCACA.x) / CARCACA.rx, (y - CARCACA.y) / CARCACA.ry) <= 1;

/** Um pixel de FOGO da pintura: laranja saturado e aceso (o creme das aberturas de sol e o osso não são). */
export const ehFogo = (r: number, g: number, b: number): boolean => r >= 105 && g < 0.75 * r && b < 0.5 * r;

/** Um pixel de LAVA: o laranja das rachaduras e o vermelho fundo do brilho delas (só vale dentro da caixa da carcaça). */
export const ehLava = (r: number, g: number, b: number): boolean => r >= 72 && r > 1.6 * g && r > 1.6 * b;

/**
 * A FUMAÇA: as colunas que a pintura JÁ tem (medidas com régua: `x`, `y` = de onde ela sai), cada uma soltando baforadas
 * escuras que sobem `sobe` px inclinando `lean`, crescem de `larg` e se desfazem — devagar, sem sair do lugar pintado.
 */
export const FUMACA = {
  colunas: [
    { x: 38, y: 46, sobe: 40, lean: -3, larg: 9 },
    { x: 158, y: 90, sobe: 28, lean: -8, larg: 7 },
    { x: 207, y: 128, sobe: 16, lean: -2, larg: 5 },
    { x: 247, y: 126, sobe: 14, lean: 2, larg: 5 },
    { x: 289, y: 68, sobe: 28, lean: -6, larg: 9 },
    { x: 365, y: 98, sobe: 34, lean: 7, larg: 9 },
  ],
  /** baforadas por coluna, o período de cada uma (s) e o pico do escuro */
  porColuna: 5,
  periodo: [7, 10],
  pico: 0.34,
  cor: 0x161416,
  semente: 53,
} as const;

/**
 * O FOGO: os `quantos` maiores focos da pintura (os grupos de `ehFogo` fora da carcaça, assados em `dados.json`)
 * ganham um clarão macio que TREMULA (duas ondas rápidas somadas, cada foco no seu ritmo) — a chama pintada não se
 * mexe, a luz dela sim.
 */
export const FOGO = {
  quantos: 40,
  areaMin: 3,
  cor: 0xff9a4a,
  /** o diâmetro do clarão (px) = base + raiz da área × fator, até o teto */
  diam: { base: 6, fator: 2.2, teto: 20 },
  alfa: [0.14, 0.28],
  /** as duas ondas (rad/s) */
  onda1: [5, 9],
  onda2: [11, 17],
  semente: 67,
} as const;

/**
 * AS BRASAS: poucas e lentas, subindo da lava da carcaça e dos focos maiores. Cada uma é função pura do relógio: nasce
 * num ponto sorteado, sobe `sobe` px em `vida` s balançando, esfria (do amarelo ao vermelho) e some.
 */
export const BRASAS = {
  quantas: 46,
  /** quantas saem da carcaça (o resto, dos `focos` maiores) */
  daCarcaca: 30,
  focos: 8,
  vida: [4, 8],
  sobe: [16, 38],
  balanco: [1.5, 4],
  deriva: [-5, 2],
  tamanho: [0.45, 0.9],
  alfa: [0.5, 0.95],
  cores: [0xffe08a, 0xff9a3a, 0xd8401a],
  semente: 29,
} as const;

/**
 * A LAVA QUASE APAGADA (a amarra com o fim da cutscene, onde ela esfria): a peça `lava-apagada` (a carcaça sem a
 * lava) fica por cima da pintura e RESPIRA — entre `apagada[0]` e `apagada[1]` de opacidade, em `zonas` faixas da
 * carcaça, cada uma no seu ritmo. Nunca some de todo: a lava é brasa, não rachadura acesa.
 */
export const LAVA = { apagada: [0.5, 0.88], zonas: 4, periodo: [9, 15], semente: 41 } as const;

/**
 * O VÉU DE FUMAÇA E NEBLINA (13/11, o último ajuste dele: *"uma tela ou um efeito de fumaça e neblina em todo o cenário,
 * para mostrar que as fumaças e a neblina do amanhecer tornaram o cenário num campo de batalha devastador"*): lençóis
 * largos da textura de bruma, esticados, cobrindo a tela INTEIRA e passando NA FRENTE de tudo (das silhuetas também:
 * é o ar entre o olho e a colônia), cada um na sua velocidade e respirando devagar. Dois de fumaça escura e quente (o
 * que tira o contraste: a devastação) e dois de neblina clara (o amanhecer). Fica atrás só da cinza.
 */
export const VEU = {
  lencois: [
    { y: -30, h: 150, tint: 0x2b2624, pico: 0.3, vel: 2.2, largura: 2.6, respira: 23 },
    { y: 50, h: 170, tint: 0x8a827b, pico: 0.13, vel: 1.2, largura: 3.2, respira: 31 },
    { y: 70, h: 180, tint: 0x241f1e, pico: 0.3, vel: 3.6, largura: 2.2, respira: 19 },
    { y: 110, h: 150, tint: 0x958c84, pico: 0.12, vel: 5, largura: 2.8, respira: 27 },
  ],
  /** o mínimo da respiração (× o pico): o véu engrossa e afina, nunca some */
  minimo: 0.6,
} as const;

/**
 * A CINZA: flocos claros caindo devagar pela tela inteira, na frente de tudo, balançando e derivando para a esquerda
 * (o vento da bruma). No lugar da poeira que flutuava na noite.
 */
export const CINZA = {
  quantos: 70,
  cai: [5, 11],
  deriva: [-3, -0.5],
  balanco: [1, 3.5],
  tamanho: [0.4, 0.9],
  alfa: [0.22, 0.5],
  cor: 0xa39d96,
  semente: 83,
} as const;

/** `?vida=…` → os efeitos ligados (sem o parâmetro, todos; `?vida=0` ou vazio, nenhum). */
export function efeitosLigados(vida: string | null): Efeito[] {
  if (vida === null) return [...EFEITOS];
  const pedidos = vida.split(',').map((s) => s.trim());
  return EFEITOS.filter((e) => pedidos.includes(e));
}
