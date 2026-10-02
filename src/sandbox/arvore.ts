import { CARTAS, type Categoria } from '../data/catalogoCartas.ts';

/**
 * A ÁRVORE DO SANDBOX (spec `2026-10-02-sandbox-dev-design.md` §2) — estilo WoW clássico, 4 árvores por categoria,
 * com as REGRAS DO JOGO (requisito, máximo, Triplo tranca Duplo, `semF1`): não há "gaste X para abrir o andar", porque
 * no jogo isso não existe e o sandbox tem que montar builds REAIS. Módulo PURO — testado em node
 * (`scripts/test-sandbox-arvore.mjs`).
 */

/** Pontos por carta: `{ WPN_004: 2 }` = Cadência 2/3. */
export type Niveis = Record<string, number>;
export type Nave = 'humana' | 'alienigena';

export interface ContextoArvore {
  nave: Nave;
  /** Sem limite de pontos (combinações que o jogador não alcança — estressar o balanceamento). */
  livre: boolean;
  /** O fundo escolhido: na F1 (voo por impulso) as cartas `semF1` não existem. */
  fase: number;
}

/** Um nó na grade da árvore: coluna e linha (a linha é a profundidade da cadeia). */
export interface No {
  id: string;
  col: number;
  lin: number;
}

export interface Arvore {
  categoria: Categoria;
  titulo: string;
  colunas: number;
  nos: No[];
}

export const ARVORES: Arvore[] = [
  {
    categoria: 'arma',
    titulo: 'ARMAMENTO',
    colunas: 3,
    nos: [
      { id: 'WPN_001', col: 0, lin: 0 },
      { id: 'WPN_002', col: 1, lin: 0 },
      { id: 'WPN_004', col: 2, lin: 0 },
      { id: 'WPN_007', col: 0, lin: 1 },
      { id: 'WPN_008', col: 1, lin: 1 },
      { id: 'WPN_009', col: 0, lin: 2 },
      { id: 'WPN_010', col: 1, lin: 2 },
    ],
  },
  {
    categoria: 'efeito',
    titulo: 'EFEITO',
    colunas: 4,
    nos: [
      { id: 'EFF_001', col: 0, lin: 0 },
      { id: 'EFF_004', col: 2, lin: 0 },
      { id: 'EFF_011', col: 3, lin: 0 },
      { id: 'EFF_002', col: 0, lin: 1 },
      { id: 'EFF_003', col: 1, lin: 1 },
      { id: 'EFF_006', col: 2, lin: 1 },
      { id: 'EFF_012', col: 3, lin: 1 },
      { id: 'EFF_010', col: 0, lin: 2 },
      { id: 'EFF_007', col: 2, lin: 2 },
      { id: 'EFF_013', col: 3, lin: 2 },
    ],
  },
  {
    categoria: 'defesa',
    titulo: 'DEFESA',
    colunas: 3,
    nos: [
      { id: 'DEF_001', col: 0, lin: 0 },
      { id: 'DEF_003', col: 2, lin: 0 },
      { id: 'DEF_002', col: 0, lin: 1 },
      { id: 'DEF_004', col: 1, lin: 1 },
      { id: 'DEF_005', col: 2, lin: 1 },
    ],
  },
  {
    categoria: 'movimento',
    titulo: 'MOVIMENTO',
    colunas: 1,
    nos: [
      { id: 'MOV_001', col: 0, lin: 0 },
      { id: 'MOV_003', col: 0, lin: 1 },
    ],
  },
];

/**
 * O MÁXIMO REAL da campanha: 7 mesas (F1 meio, Torre, F2 meio, Capitânia, aranha, Serpente, guardião) — e a troca
 * para a alien na Doca refaz a mão com +1 (`resetDaAlien`).
 */
const PONTOS_REAIS: Record<Nave, number> = { humana: 7, alienigena: 8 };

/** Os atalhos de build: a cadeia inteira de uma vez (somando por cima do que já está). */
export const ATALHOS: Record<string, string[]> = {
  FOGO: ['EFF_004', 'EFF_006', 'EFF_007'],
  'ELÉTRICA': ['EFF_011', 'EFF_012', 'EFF_013'],
  'EXPLOSÕES': ['EFF_001', 'EFF_002', 'EFF_003'],
  CASCO: ['DEF_001', 'DEF_002', 'DEF_004'],
};

export function limiteDePontos(c: ContextoArvore): number {
  return c.livre ? Infinity : PONTOS_REAIS[c.nave];
}

export function gastos(n: Niveis): number {
  return Object.values(n).reduce((s, v) => s + v, 0);
}

export function podeSomar(id: string, n: Niveis, c: ContextoArvore): boolean {
  const carta = CARTAS[id];
  if (!carta) return false;
  if ((n[id] ?? 0) >= carta.max) return false;
  if (gastos(n) >= limiteDePontos(c)) return false;
  if (carta.requer && !(n[carta.requer] > 0)) return false;
  if (carta.excluiSe && n[carta.excluiSe] > 0) return false;
  if (carta.semF1 && c.fase <= 1) return false;
  return true;
}

/** Tira um nível — a não ser que a carta (no último nível) segure outra que tem ponto. */
export function podeTirar(id: string, n: Niveis): boolean {
  const nivel = n[id] ?? 0;
  if (nivel <= 0) return false;
  if (nivel > 1) return true;
  return !Object.values(CARTAS).some((c) => c.requer === id && n[c.id] > 0);
}

export function somar(id: string, n: Niveis, c: ContextoArvore): Niveis {
  return podeSomar(id, n, c) ? { ...n, [id]: (n[id] ?? 0) + 1 } : n;
}

export function tirar(id: string, n: Niveis): Niveis {
  if (!podeTirar(id, n)) return n;
  const out = { ...n, [id]: n[id] - 1 };
  if (out[id] === 0) delete out[id];
  return out;
}

/** Soma a cadeia do atalho em ordem, nó a nó, parando no que o limite (ou uma regra) não deixar. */
export function atalho(nome: string, n: Niveis, c: ContextoArvore): Niveis {
  let out = n;
  for (const id of ATALHOS[nome] ?? []) if (!(out[id] > 0)) out = somar(id, out, c);
  return out;
}

/** A MÃO para o registry: na ordem da árvore (requisito antes de quem depende dele), um id por nível. */
export function mao(n: Niveis): string[] {
  const ordem = ARVORES.flatMap((a) => [...a.nos].sort((p, q) => p.lin - q.lin || p.col - q.col).map((no) => no.id));
  return ordem.flatMap((id) => Array<string>(n[id] ?? 0).fill(id));
}

/** Trocar o fundo para a F1: as cartas `semF1` (as de movimento) saem da build. */
export function semF1Fora(n: Niveis): Niveis {
  return Object.fromEntries(Object.entries(n).filter(([id]) => !CARTAS[id]?.semF1));
}
