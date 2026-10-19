import type { HandlingMode } from '../scenes/GameScene';
import { CHAVE_CONDUCAO, CONDUCOES } from './numerosMenu';

/** A condução lembrada entre sessões (spec §7.2); sem `localStorage` (ou com lixo nele), a diegética. */
export function lerConducao(): HandlingMode {
  try {
    const v = localStorage.getItem(CHAVE_CONDUCAO);
    const c = CONDUCOES.find((x) => x.id === v);
    if (c) return c.id;
  } catch {
    // Sem armazenamento (modo privado, bloqueado): fica a padrão.
  }
  return 'diegetico';
}

export function salvarConducao(h: HandlingMode): void {
  try {
    localStorage.setItem(CHAVE_CONDUCAO, h);
  } catch {
    // Sem armazenamento: a escolha vale só nesta sessão.
  }
}
