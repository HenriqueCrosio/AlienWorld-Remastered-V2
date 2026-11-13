import type { Guarda } from '../placar.ts';

/**
 * QUAL MENU abre (13/11, bloco I etapa 3 — spec `2026-11-13-bloco-i-tela-final-amanhecer-design.md` §2): a NOITE (o
 * Leviatã vivo passando atrás da colônia) ou o AMANHECER (ele caído no vale). Quem zera a campanha ganha o amanhecer,
 * para sempre; a escolha entre os dois (o menu de OPÇÕES, etapa 1.55) só existe depois da primeira vitória.
 * Módulo PURO: a guarda vem de fora (o teste passa uma de mentira).
 */
export type QualMenu = 'noite' | 'amanhecer';

export const CHAVE_ZEROU = 'alienworld:zerou';
export const CHAVE_MENU = 'alienworld:menu';

/** A campanha já foi vencida neste navegador? */
export const zerou = (g: Guarda): boolean => g.getItem(CHAVE_ZEROU) === '1';

/** A primeira vitória da campanha (nunca no treino: quem chama é o resultado de uma partida de verdade). */
export function marcarZerou(g: Guarda): void {
  g.setItem(CHAVE_ZEROU, '1');
}

/** O menu que abre: o `forcado` (dev), senão a noite para quem não zerou; para quem zerou, a preferência (o amanhecer). */
export function menuAtivo(g: Guarda, forcado: QualMenu | null = null): QualMenu {
  if (forcado) return forcado;
  if (!zerou(g)) return 'noite';
  return g.getItem(CHAVE_MENU) === 'noite' ? 'noite' : 'amanhecer';
}

/** A escolha do menu de OPÇÕES. Só grava para quem zerou (antes disso a opção nem aparece); devolve se gravou. */
export function escolherMenu(g: Guarda, m: QualMenu): boolean {
  if (!zerou(g)) return false;
  g.setItem(CHAVE_MENU, m);
  return true;
}

/** O `localStorage`, ou uma guarda de memória onde ele não existe (ou recusa). */
export function guardaDoNavegador(): Guarda {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.getItem(CHAVE_ZEROU);
      return localStorage;
    }
  } catch {
    // sem `localStorage` (modo privado, iframe): a troca vale só nesta sessão
  }
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

/** `?menu=amanhecer|noite` na URL: o menu forçado (dev e filmagem). */
export function menuDaUrl(): QualMenu | null {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('menu');
  return v === 'amanhecer' || v === 'noite' ? v : null;
}
