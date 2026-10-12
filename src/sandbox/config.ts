import type { Nave, Niveis } from './arvore.ts';

/**
 * A MONTAGEM do sandbox (spec `2026-10-02-sandbox-dev-design.md`): o que a tela HTML monta e a `GameScene` joga.
 * Fica salva no navegador — volta igual depois do ESC ou de recarregar a página.
 */

/** Os inimigos que o sandbox solta (o `EnemyKind` do jogo; a aranha é minichefe: 0 ou 1). */
export const INIMIGOS = ['drone', 'batedor', 'canhoneira', 'kamikaze', 'cargueiro', 'aguaViva', 'droneMineracao', 'sentinela', 'cacador', 'aranha'] as const;
export type TipoInimigo = (typeof INIMIGOS)[number];
export const NOME_INIMIGO: Record<TipoInimigo, string> = {
  drone: 'drone',
  batedor: 'batedor',
  canhoneira: 'canhoneira',
  kamikaze: 'kamikaze',
  cargueiro: 'cargueiro',
  aguaViva: 'água-viva',
  droneMineracao: 'drone de mineração (elite)',
  sentinela: 'sentinela orbital (elite)',
  cacador: 'caçador de vácuo, a lula (elite)',
  aranha: 'aranha (minichefe)',
};
export const MAX_POR_ONDA: Record<TipoInimigo, number> = {
  drone: 20,
  batedor: 20,
  canhoneira: 20,
  kamikaze: 20,
  cargueiro: 20,
  aguaViva: 20,
  droneMineracao: 5,
  sentinela: 5,
  cacador: 5,
  aranha: 1,
};
/** Os tiers que cada linhagem tem (`ships.ts`). */
export const TIERS: Record<Nave, number[]> = { humana: [0, 1, 2, 3], alienigena: [1, 2] };

export interface ConfigSandbox {
  nave: Nave;
  tier: number;
  niveis: Niveis;
  livre: boolean;
  fase: 1 | 2 | 3 | 4;
  chefe: boolean;
  inimigos: Record<TipoInimigo, number>;
  /** Segundos entre ondas. */
  intervalo: number;
  repetir: boolean;
}

export const PADRAO: ConfigSandbox = {
  nave: 'humana',
  tier: 2,
  niveis: {},
  livre: false,
  fase: 2,
  chefe: false,
  inimigos: { drone: 6, batedor: 0, canhoneira: 2, kamikaze: 2, cargueiro: 0, aguaViva: 0, droneMineracao: 0, sentinela: 0, cacador: 0, aranha: 0 },
  intervalo: 8,
  repetir: true,
};

const CHAVE = 'alienworld.sandbox';

export function carregar(): ConfigSandbox {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Partial<ConfigSandbox> | null;
    if (!salvo) return structuredClone(PADRAO);
    // Só os tipos que ainda existem: a montagem salva pode trazer um inimigo que saiu do jogo (o elite do casco, 12/10).
    const inimigos = Object.fromEntries(INIMIGOS.map((t) => [t, salvo.inimigos?.[t] ?? PADRAO.inimigos[t]])) as Record<TipoInimigo, number>;
    return { ...structuredClone(PADRAO), ...salvo, inimigos };
  } catch {
    return structuredClone(PADRAO);
  }
}

export function salvar(c: ConfigSandbox): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(c));
  } catch {
    // Sem armazenamento (janela privada): a montagem só não sobrevive ao recarregar.
  }
}
