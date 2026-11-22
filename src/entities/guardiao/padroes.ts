/**
 * OS PADRÕES DO GUARDIÃO (spec 2026-11-22-guardiao-coleira-design.md §5): a salva MIRADA e o LEQUE DE LAVA com vão.
 * Puro: sem Phaser.
 */
export interface Ponto {
  x: number;
  y: number;
}

/** O centro da salva, em graus (y para baixo): a direção da boca à nave, presa em 180 ± `limite` (nunca atira para trás). */
export function miraSalva(boca: Ponto, alvo: Ponto, limite = 60): number {
  let a = (Math.atan2(alvo.y - boca.y, alvo.x - boca.x) * 180) / Math.PI;
  if (a < 0) a += 360;
  return Math.min(180 + limite, Math.max(180 - limite, a));
}

/**
 * Os ângulos (radianos) de uma salva de `n` com abertura `abre` (graus) centrada em `centro`. Com `n` PAR o meio é um
 * vão, e o vão cairia em cima da nave: o centro anda meio passo para um lado sorteado e um glóbulo vai nela.
 */
export function angulosSalva(n: number, abre: number, centro: number, rnd: () => number): number[] {
  if (n <= 1) return [(centro * Math.PI) / 180];
  const passo = abre / (n - 1);
  const c = n % 2 === 0 ? centro + (rnd() < 0.5 ? -1 : 1) * (passo / 2) : centro;
  return Array.from({ length: n }, (_, i) => ((c - abre / 2 + i * passo) * Math.PI) / 180);
}

export interface OpcoesLeque {
  n: number;
  boca: Ponto;
  /** a coluna em que as gotas ficam a `passo` px uma da outra */
  xAlvo: number;
  /** o tempo de voo até ela (s) */
  T: number;
  g: number;
  passo: number;
  /** o centro do leque na coluna (a altura da nave), preso na arena */
  centroY: number;
  topo: number;
  base: number;
  rnd: () => number;
}

export interface LequeLava {
  /** a velocidade de cada gota (px/s), do alto para baixo */
  vel: Ponto[];
  /** as n + 1 alturas na coluna alvo, e qual delas ficou sem gota */
  faixas: number[];
  vao: number;
}

/**
 * O LEQUE: n + 1 faixas a `passo` px na coluna alvo, uma tirada (o VÃO, nunca a da ponta). Todas as gotas têm o MESMO
 * vx: cruzam qualquer coluna no mesmo instante, um muro curvo que abre para a esquerda, com um buraco.
 */
export function lequeLava(o: OpcoesLeque): LequeLava {
  const nf = o.n + 1;
  const altura = (nf - 1) * o.passo;
  // O ARCO SOBE mais que a faixa: a gota de cima chega à coluna já descendo, e o pico dela fica acima. A faixa mais alta
  // é a que tem o pico a 3 px do teto — mais alto, a gota morria no teto antes de chegar à coluna (22/11, em jogo).
  const A = o.topo + 3;
  const topoArco = o.boca.y > A ? o.boca.y - o.T * Math.sqrt(2 * o.g * (o.boca.y - A)) + 0.5 * o.g * o.T * o.T : o.topo;
  const topo = Math.max(o.topo, topoArco);
  const c = altura >= o.base - topo ? (topo + o.base) / 2 : Math.min(o.base - altura / 2, Math.max(topo + altura / 2, o.centroY));
  const faixas = Array.from({ length: nf }, (_, i) => c - altura / 2 + i * o.passo);
  const vao = 1 + Math.min(nf - 3, Math.floor(o.rnd() * (nf - 2)));
  const vx = (o.xAlvo - o.boca.x) / o.T;
  const vel = faixas
    .filter((_, i) => i !== vao)
    .map((y) => ({ x: vx, y: (y - o.boca.y - 0.5 * o.g * o.T * o.T) / o.T }));
  return { vel, faixas, vao };
}
