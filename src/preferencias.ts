import type { Guarda } from './placar.ts';

/**
 * THE PLAYER'S PREFERENCES (14/11, block M1 — spec `2026-11-14-bloco-m1-pausa-configuracoes-design.md` §4.1).
 *
 * ONE versioned object under one key. Today the guard is the browser's `localStorage`; syncing with a user profile
 * later (his words: *"entrar em qualquer navegador ou mobiles (futuramente) e jogar com suas preferências"*) means
 * swapping the guard for one that also sends this object to a server — no screen changes.
 *
 * PURE module: the guard comes from outside (the test passes a fake one). Progress is NOT a preference: the
 * `alienworld:zerou` mark, the remembered handling and the records stay where they are.
 */
export const CHAVE_PREFERENCIAS = 'alienworld:preferencias';

// The keys the game already had before this object existed. They seed it once and keep being mirrored, so the code
// that reads them (`controles.ts#perfilAtivo`, `menu/qualMenu.ts#menuAtivo`) behaves as before.
const CHAVE_TECLAS = 'aw.teclas';
const CHAVE_MENU = 'alienworld:menu';
const CHAVE_ZEROU = 'alienworld:zerou';

export type PerfilTeclas = 'padrao' | 'classico';
export type MenuPreferido = 'noite' | 'amanhecer';

export interface Preferencias {
  v: 1;
  /** integers 0–10 */
  volume: { geral: number; musica: number; efeitos: number };
  teclas: PerfilTeclas;
  reduzirClaroes: boolean;
  /** only offered (and only mirrored to the menu key) after the first victory */
  menu: MenuPreferido;
}

export const PADRAO: Preferencias = {
  v: 1,
  volume: { geral: 10, musica: 10, efeitos: 10 },
  teclas: 'padrao',
  reduzirClaroes: false,
  menu: 'amanhecer',
};

export type Campo = 'volume.geral' | 'volume.musica' | 'volume.efeitos' | 'teclas' | 'reduzirClaroes' | 'menu';

const volume = (v: unknown, padrao: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(10, Math.max(0, Math.round(v))) : padrao;
const ehTeclas = (v: unknown): v is PerfilTeclas => v === 'padrao' || v === 'classico';
const ehMenu = (v: unknown): v is MenuPreferido => v === 'noite' || v === 'amanhecer';

function pegar(g: Guarda, chave: string): string | null {
  try {
    return g.getItem(chave);
  } catch {
    return null;
  }
}

/** Never throws: a broken JSON or an invalid value falls back to the default (or the limit) of that field. */
export function ler(g: Guarda): Preferencias {
  const antigaTeclas = pegar(g, CHAVE_TECLAS);
  const antigoMenu = pegar(g, CHAVE_MENU);
  const base: Preferencias = {
    ...PADRAO,
    volume: { ...PADRAO.volume },
    teclas: ehTeclas(antigaTeclas) ? antigaTeclas : PADRAO.teclas,
    menu: ehMenu(antigoMenu) ? antigoMenu : PADRAO.menu,
  };
  let cru: unknown = null;
  try {
    cru = JSON.parse(pegar(g, CHAVE_PREFERENCIAS) ?? 'null');
  } catch {
    cru = null;
  }
  if (typeof cru !== 'object' || cru === null) return base;
  const o = cru as Record<string, unknown>;
  const vol = (typeof o.volume === 'object' && o.volume !== null ? o.volume : {}) as Record<string, unknown>;
  return {
    v: 1,
    volume: {
      geral: volume(vol.geral, base.volume.geral),
      musica: volume(vol.musica, base.volume.musica),
      efeitos: volume(vol.efeitos, base.volume.efeitos),
    },
    teclas: ehTeclas(o.teclas) ? o.teclas : base.teclas,
    reduzirClaroes: typeof o.reduzirClaroes === 'boolean' ? o.reduzirClaroes : base.reduzirClaroes,
    menu: ehMenu(o.menu) ? o.menu : base.menu,
  };
}

/** Records the object and mirrors the old keys (the menu one only for who has beaten the campaign). */
export function gravar(g: Guarda, p: Preferencias): void {
  try {
    g.setItem(CHAVE_PREFERENCIAS, JSON.stringify(p));
    g.setItem(CHAVE_TECLAS, p.teclas);
    if (g.getItem(CHAVE_ZEROU) === '1') g.setItem(CHAVE_MENU, p.menu);
  } catch {
    // no storage (private tab, blocked): the choice lasts this visit only
  }
}

/** One step of ←→ on a line: the volumes walk ±1 inside 0–10, the others toggle. Returns the NEW object, recorded. */
export function mudar(g: Guarda, p: Preferencias, campo: Campo, d: -1 | 1): Preferencias {
  const n: Preferencias = { ...p, volume: { ...p.volume } };
  if (campo === 'volume.geral') n.volume.geral = volume(p.volume.geral + d, p.volume.geral);
  else if (campo === 'volume.musica') n.volume.musica = volume(p.volume.musica + d, p.volume.musica);
  else if (campo === 'volume.efeitos') n.volume.efeitos = volume(p.volume.efeitos + d, p.volume.efeitos);
  else if (campo === 'teclas') n.teclas = p.teclas === 'padrao' ? 'classico' : 'padrao';
  else if (campo === 'reduzirClaroes') n.reduzirClaroes = !p.reduzirClaroes;
  else n.menu = p.menu === 'noite' ? 'amanhecer' : 'noite';
  gravar(g, n);
  return n;
}

export const fatorMusica = (p: Preferencias): number => (p.volume.geral / 10) * (p.volume.musica / 10);
export const fatorEfeitos = (p: Preferencias): number => (p.volume.geral / 10) * (p.volume.efeitos / 10);
/** "Reduce flashes": every flash at half strength. */
export const forcaClaroes = (p: Preferencias): number => (p.reduzirClaroes ? 0.5 : 1);
