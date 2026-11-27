import { mao as maoDaArvore, type Niveis } from '../sandbox/arvore.ts';

/**
 * THE DEV HANDS (spec 2026-11-24-besta-refeita §7 — key 8 and `?mao=`): ready card hands to fight a boss with.
 * ⚠️ PROVISIONAL: front 1 of the rebalancing (START 2026-11-21) calibrates the three reference hands (weak, median,
 * strong). Until then 'mediana' is what a run usually holds by the F4, and 'forte' a lucky one.
 */
export const NOMES_MAO = ['nenhuma', 'mediana', 'forte', 'sandbox'] as const;
export type NomeMao = (typeof NOMES_MAO)[number];

export const MAOS: Record<Exclude<NomeMao, 'sandbox'>, readonly string[]> = {
  nenhuma: [],
  // double shot, rate ×2, hull, incendiary, extra bomb, thrusters
  mediana: ['WPN_001', 'WPN_004', 'WPN_004', 'DEF_001', 'EFF_004', 'DEF_005', 'MOV_001'],
  // double → triple (27/11: the Triple requires the Double), rate ×3, heavy, explosive + bigger, the drone, hull +
  // recharge, dash
  forte: ['WPN_001', 'WPN_002','WPN_004', 'WPN_004', 'WPN_004', 'WPN_008', 'EFF_001', 'EFF_002', 'WPN_010', 'DEF_001', 'DEF_002', 'MOV_003'],
};

export function ehNomeMao(s: string | null): s is NomeMao {
  return s !== null && (NOMES_MAO as readonly string[]).includes(s);
}

/** The hand as the registry keeps it (`cartas`), always a fresh copy. 'sandbox' = the levels of the last `?sandbox` build. */
export function maoPorNome(nome: NomeMao, niveisSandbox: Niveis = {}): string[] {
  return nome === 'sandbox' ? maoDaArvore(niveisSandbox) : [...MAOS[nome]];
}
