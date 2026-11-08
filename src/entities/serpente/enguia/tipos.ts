/**
 * THE EEL'S SHARED TYPES (plan `2026-11-08-enguia-instalacao.md`). Type-only: the pure modules import it with
 * `import type`, so Node's type stripping drops it.
 */
export interface Ponto {
  x: number;
  y: number;
}

/** an RGBA image (alpha 0 pixels are 0,0,0,0 — `fonte.ts` `normaliza`) */
export interface Img {
  data: Uint8Array | Uint8ClampedArray;
  w: number;
  h: number;
}

export type Hab = 'fusao' | 'canos' | 'eco' | 'presa' | 'desfaz' | 'resto' | 'fim';

/** one stretch of the choreography: a pause or a move along the path (the mock's `trechos`) */
export interface Trecho {
  nome: string;
  cap: string;
  tipo: 'pausa' | 'move';
  t0: number;
  t1: number;
  s0: number;
  s1: number;
  pos?: (tl: number) => number;
  recua?: boolean;
  hab?: Hab;
  ciclo?: number;
  final?: boolean;
  corte?: number | null;
  prepara?: boolean;
  emerge?: boolean;
  sob?: 'ida' | 'volta';
}

export interface Estado {
  s: number;
  trecho: Trecho;
  tl: number;
}

/** the breach's tell before she breaks out of it */
export interface Sinal {
  t0: number;
  t1: number;
  x: number;
}

export interface CaminhoLeitura {
  readonly L: number;
  ponto(s: number): Ponto;
  rumo(s: number, d?: number): Ponto;
}

/** what pose / perigos / respiros read of the choreography (the mock's `montaRoteiro` object, the port's `RoteiroVivo`) */
export interface Roteiro {
  caminho: CaminhoLeitura;
  trechos: Trecho[];
  estado(t: number): Estado;
  rola(s: number): number;
  sinais: Sinal[];
  T: number;
}

/** a bite: 22 / 13 % (the tail's last 3 rings, `de`…`ate`) or 5 % (the skull) */
export interface Mordida {
  pct: number;
  tPedido: number;
  t: number;
  de?: number;
  ate?: number;
  cranio?: boolean;
}

export interface Geiser {
  x: number;
  ciclo?: number;
  via: 'ida' | 'volta';
  tAviso: number;
  tColuna: number;
  tFim: number;
  tVapor: number;
}

/** the approved art's measures (the mock's `medidas.mjs`) */
export interface Med {
  cabeca: {
    w: number;
    h: number;
    mascara: Uint8Array;
    pescoco: Ponto;
    focinho: Ponto;
    olho: Ponto | null;
    boca: Ponto | null;
    comp: number;
    ang: number;
  };
  circulosCabeca: { u: number; r: number; dy: number }[];
  perfil: (u: number) => number;
  raio: (k: number) => number;
  raioU: (u: number) => number;
}

/** the head at a time (the mock's `pose().cabeca`) */
export interface PoseCabeca {
  pescoco: Ponto;
  focinho: Ponto;
  ang: number;
  espelho: boolean;
  fi: number;
  circulos: { x: number; y: number; r: number }[];
}

export interface Anel {
  k: number;
  x: number;
  y: number;
  r: number;
  toca: boolean;
  dx: number;
  dy: number;
}

export interface Amostra {
  u: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  fi: number;
  r: number;
  seg: number;
  toca: boolean;
}

export interface Pose {
  e: Estado;
  cabeca: PoseCabeca;
  aneis: Anel[];
  tubo: Amostra[];
  nAneis: number;
}
