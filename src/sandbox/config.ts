import type { Nave, Niveis } from './arvore.ts';
import { ESCOLHAS, escolhaPorNome, nomeDaEscolha } from '../ships.ts';

/**
 * A MONTAGEM do sandbox (spec `2026-10-02-sandbox-dev-design.md`): o que a tela HTML monta e a `GameScene` joga.
 * Fica salva no navegador — volta igual depois do ESC ou de recarregar a página.
 */

/** Os inimigos que o sandbox solta (o `EnemyKind` do jogo; a aranha é minichefe: 0 ou 1). */
export const INIMIGOS = ['drone', 'batedor', 'canhoneira', 'kamikaze', 'cargueiro', 'aguaViva', 'droneMineracao', 'sentinela', 'cacador', 'larva', 'tubo', 'mosca', 'aranha'] as const;
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
  larva: 'larva mecânica (elite)',
  tubo: 'tubo pulsante (elite, F4)',
  mosca: 'mosca da larva (F4)',
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
  larva: 5,
  tubo: 5,
  mosca: 20,
  aranha: 1,
};
export interface ConfigSandbox {
  nave: Nave;
  /** A humana escolhida no hangar, pelo nome (`nomeDaEscolha` em `ships.ts`: "a-laranja", "jato-osso"…). A manta ignora. */
  humana: string;
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
  humana: nomeDaEscolha(ESCOLHAS[0]),
  niveis: {},
  livre: false,
  fase: 2,
  chefe: false,
  inimigos: { drone: 6, batedor: 0, canhoneira: 2, kamikaze: 2, cargueiro: 0, aguaViva: 0, droneMineracao: 0, sentinela: 0, cacador: 0, larva: 0, tubo: 0, mosca: 0, aranha: 0 },
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
    // A montagem salva antes de 25/10 traz `tier` (saiu); a da tarde de 25/10, só a `pintura` da "a".
    const velha = salvo as Partial<ConfigSandbox> & { tier?: number; pintura?: string };
    const humana = escolhaPorNome(velha.humana) ? velha.humana! : velha.pintura === 'preta' ? 'a-preta' : PADRAO.humana;
    const { tier: _tier, pintura: _pintura, ...resto } = velha;
    return { ...structuredClone(PADRAO), ...resto, inimigos, humana };
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
