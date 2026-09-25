/**
 * OS PERFIS DA ATMOSFERA — só números (spec 2026-09-25-atmosfera-engine-design.md §3.3 e §4).
 *
 * `densidade = 1` e `grao = 1` são EXATAMENTE a prévia C aprovada (`scripts/_f8/_preview-atmos-mov.mjs`): névoa até
 * 0.42 de mistura, grão de amplitude 9/255, halo 70/255 (`forca 0.27`). As cores de névoa e de luz foram amostradas
 * da arte de cada ambiente com a mesma conta da prévia (névoa = média dos tons médio-escuros ×1,5 + toque frio;
 * luz = média do que é quente e aceso).
 *
 * ⚠️ O PISO (25/09, ele): *"quero que todos os capitulos sejam densos, pois o momento é pesado. Pode variar na curva
 * dramatica, mas nao tire completamente a densidade"* — nenhum perfil da cutscene final abaixo de `PISO_DENSIDADE`.
 */

/** Cor em 0–255. */
export type Cor = readonly [number, number, number];
type Vetor = readonly [number, number];

export interface PerfilAtmosfera {
  nome: string;
  nevoa: {
    /** 0–1: o quanto da névoa aparece (1 = a prévia). */
    densidade: number;
    cor: Cor;
    /** Expoente do gradiente vertical: < 1 cobre a tela, > 2 fica rente ao chão. */
    altura: number;
    /** px/s na tela, da camada de trás (larga, lenta) e da da frente (fina, rápida). */
    velTras: Vetor;
    velFrente: Vetor;
    /** O quanto a névoa muda de FORMA por segundo (não só desliza). */
    evolucao: number;
  };
  halo: {
    /** 0.27 = a prévia. Respira ±20% num ciclo de 2,4s. */
    forca: number;
    /** 0–1: o vermelho mínimo para contar como "quente e aceso" (0.59 = 150/255, a prévia). */
    limiar: number;
    cor: Cor;
  };
  /** 0–1: a correção de cor (sombra → petróleo, luz → âmbar). */
  grade: number;
  /** 0–1: só a parte âmbar da correção (o capítulo 7 a esfria). */
  gradeQuente: number;
  /** 0–1: quanto a borda escurece. */
  vinheta: number;
  /** 1 = o grão da prévia (amplitude 9/255). */
  grao: number;
  poeira: {
    /** Quantas partículas de 1 px vivas na tela. */
    quantidade: number;
    cor: Cor;
    /** px/s médio. */
    deriva: Vetor;
    /** ± px/s em volta da deriva. */
    espalhar: number;
  };
}

export const PISO_DENSIDADE = 0.6;

/** Dentro do corpo (caps 1–2): sufocante, a névoa cobre a tela, fuligem e brasa no ar. */
const viscera: PerfilAtmosfera = {
  nome: 'viscera',
  nevoa: { densidade: 1, cor: [96, 61, 83], altura: 0.8, velTras: [-6, -1], velFrente: [-14, 0], evolucao: 0.03 },
  halo: { forca: 0.27, limiar: 0.59, cor: [188, 65, 47] },
  grade: 1,
  gradeQuente: 1,
  vinheta: 0.6,
  grao: 1,
  poeira: { quantidade: 140, cor: [150, 70, 50], deriva: [-3, -2], espalhar: 4 },
};

export const PERFIS = {
  viscera,
  /** A descompressão (cap 3): o ar arrancado para a direita, rumo ao rasgo (`RASGO_X` 204). */
  visceraSuccao: {
    ...viscera,
    nome: 'visceraSuccao',
    nevoa: { ...viscera.nevoa, velTras: [40, 0], velFrente: [70, 0] },
    poeira: { quantidade: 160, cor: [150, 70, 50], deriva: [60, 0], espalhar: 20 },
  },
  /** A ferida (cap 4): o vácuo frio, violeta; o halo pega a lava da ferida. */
  vacuo: {
    nome: 'vacuo',
    nevoa: { densidade: 0.75, cor: [75, 73, 133], altura: 1.6, velTras: [-4, 0], velFrente: [-9, 1], evolucao: 0.02 },
    halo: { forca: 0.3, limiar: 0.59, cor: [229, 96, 33] },
    grade: 1,
    gradeQuente: 1,
    vinheta: 0.5,
    grao: 0.85,
    poeira: { quantidade: 110, cor: [120, 118, 190], deriva: [2, -1], espalhar: 2 },
  },
  /** A queda (cap 5): o do 4, mais frio; o rastro de fogo acende o halo. */
  vacuoQueda: {
    nome: 'vacuoQueda',
    nevoa: { densidade: 0.7, cor: [72, 71, 115], altura: 1.6, velTras: [-4, 0], velFrente: [-9, 1], evolucao: 0.02 },
    halo: { forca: 0.3, limiar: 0.59, cor: [229, 96, 33] },
    grade: 1,
    gradeQuente: 1,
    vinheta: 0.5,
    grao: 0.85,
    poeira: { quantidade: 110, cor: [115, 114, 175], deriva: [-2, -3], espalhar: 2 },
  },
  /** O sobrevoo (cap 6): névoa baixa, rente ao chão; cinza caindo devagar. */
  superficie: {
    nome: 'superficie',
    nevoa: { densidade: 0.9, cor: [69, 86, 110], altura: 2.2, velTras: [-5, 0], velFrente: [-12, 0], evolucao: 0.03 },
    halo: { forca: 0.27, limiar: 0.59, cor: [200, 83, 36] },
    grade: 1,
    gradeQuente: 1,
    vinheta: 0.55,
    grao: 0.9,
    poeira: { quantidade: 130, cor: [110, 120, 135], deriva: [-3, 6], espalhar: 3 },
  },
  /** A luz se apaga (cap 7): o âmbar sai, a vinheta fecha; o halo apaga sozinho com a lava (é lido da imagem). */
  apagando: {
    nome: 'apagando',
    nevoa: { densidade: 0.8, cor: [69, 86, 110], altura: 2.2, velTras: [-5, 0], velFrente: [-12, 0], evolucao: 0.03 },
    halo: { forca: 0.27, limiar: 0.59, cor: [200, 83, 36] },
    grade: 1,
    gradeQuente: 0,
    vinheta: 0.7,
    grao: 1,
    poeira: { quantidade: 130, cor: [110, 120, 135], deriva: [-3, 6], espalhar: 3 },
  },
} as const satisfies Record<string, PerfilAtmosfera>;

const lerp = (a: number, b: number, k: number): number => (k >= 1 ? b : a + (b - a) * k);
const lerpV = <T extends readonly number[]>(a: T, b: T, k: number): T => a.map((v, i) => lerp(v, b[i], k)) as unknown as T;

/** O perfil entre `de` e `para` em `k` (0–1). `nome` e `poeira` já são os do destino (a poeira só troca no corte). */
export function interpolarPerfil(de: PerfilAtmosfera, para: PerfilAtmosfera, k: number): PerfilAtmosfera {
  return {
    nome: para.nome,
    nevoa: {
      densidade: lerp(de.nevoa.densidade, para.nevoa.densidade, k),
      cor: lerpV(de.nevoa.cor, para.nevoa.cor, k),
      altura: lerp(de.nevoa.altura, para.nevoa.altura, k),
      velTras: lerpV(de.nevoa.velTras, para.nevoa.velTras, k),
      velFrente: lerpV(de.nevoa.velFrente, para.nevoa.velFrente, k),
      evolucao: lerp(de.nevoa.evolucao, para.nevoa.evolucao, k),
    },
    halo: {
      forca: lerp(de.halo.forca, para.halo.forca, k),
      limiar: lerp(de.halo.limiar, para.halo.limiar, k),
      cor: lerpV(de.halo.cor, para.halo.cor, k),
    },
    grade: lerp(de.grade, para.grade, k),
    gradeQuente: lerp(de.gradeQuente, para.gradeQuente, k),
    vinheta: lerp(de.vinheta, para.vinheta, k),
    grao: lerp(de.grao, para.grao, k),
    poeira: para.poeira,
  };
}
