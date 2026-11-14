import type { Guarda } from './placar.ts';
import {
  CONTROLE_FABRICA, TECLADO_FABRICA, mapaControleValido, mapaTecladoValido, perfilDe, trocar,
  type AcaoRemap, type MapaControle, type MapaTeclado, type PerfilControle, type PerfilTeclado,
} from './entrada/mapas.ts';

/**
 * THE PLAYER'S PREFERENCES (14/11, block M1 — spec `2026-11-14-bloco-m1-pausa-configuracoes-design.md` §4.1; the maps
 * of block M2 — spec `2026-11-14-bloco-m2-controles-design.md` §4.2).
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

export type PerfilTeclas = PerfilTeclado | 'personalizado';
export type PerfilDoControle = PerfilControle | 'personalizado';
export type MenuPreferido = 'noite' | 'amanhecer';

export interface Preferencias {
  /** 2 since block M2: the custom maps, the controller profile and the vibration. A v1 object is read and completed. */
  v: 2;
  /** integers 0–10 */
  volume: { geral: number; musica: number; efeitos: number };
  teclas: PerfilTeclas;
  /** the custom keyboard map — only when `teclas` is 'personalizado' */
  mapaTeclado: MapaTeclado | null;
  controle: PerfilDoControle;
  /** the custom controller map — only when `controle` is 'personalizado' */
  mapaControle: MapaControle | null;
  vibracao: boolean;
  reduzirClaroes: boolean;
  /** only offered (and only mirrored to the menu key) after the first victory */
  menu: MenuPreferido;
}

export const PADRAO: Preferencias = {
  v: 2,
  volume: { geral: 10, musica: 10, efeitos: 10 },
  teclas: 'padrao',
  mapaTeclado: null,
  controle: 'moderno',
  mapaControle: null,
  vibracao: true,
  reduzirClaroes: false,
  menu: 'amanhecer',
};

export type Campo = 'volume.geral' | 'volume.musica' | 'volume.efeitos' | 'teclas' | 'controle' | 'vibracao' | 'reduzirClaroes' | 'menu';

const volume = (v: unknown, padrao: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(10, Math.max(0, Math.round(v))) : padrao;
const ehTeclas = (v: unknown): v is PerfilTeclado => v === 'padrao' || v === 'classico';
const ehControle = (v: unknown): v is PerfilControle => v === 'moderno' || v === 'arcade';
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
  // a custom map only counts when it is whole and valid; otherwise the profile falls back to a factory one
  const mapaT = o.teclas === 'personalizado' && mapaTecladoValido(o.mapaTeclado) ? { ...o.mapaTeclado } : null;
  const mapaC = o.controle === 'personalizado' && mapaControleValido(o.mapaControle) ? { ...o.mapaControle } : null;
  return {
    v: 2,
    volume: {
      geral: volume(vol.geral, base.volume.geral),
      musica: volume(vol.musica, base.volume.musica),
      efeitos: volume(vol.efeitos, base.volume.efeitos),
    },
    teclas: mapaT ? 'personalizado' : ehTeclas(o.teclas) ? o.teclas : base.teclas,
    mapaTeclado: mapaT,
    controle: mapaC ? 'personalizado' : ehControle(o.controle) ? o.controle : base.controle,
    mapaControle: mapaC,
    vibracao: typeof o.vibracao === 'boolean' ? o.vibracao : base.vibracao,
    reduzirClaroes: typeof o.reduzirClaroes === 'boolean' ? o.reduzirClaroes : base.reduzirClaroes,
    menu: ehMenu(o.menu) ? o.menu : base.menu,
  };
}

/** Records the object and mirrors the old keys (the menu one only for who has beaten the campaign). */
export function gravar(g: Guarda, p: Preferencias): void {
  try {
    g.setItem(CHAVE_PREFERENCIAS, JSON.stringify(p));
    // the old key only knows the factory profiles: a custom map leaves it as it was
    if (p.teclas !== 'personalizado') g.setItem(CHAVE_TECLAS, p.teclas);
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
  else if (campo === 'teclas') {
    // between the factory profiles; leaving PERSONALIZADO drops the custom map of that device
    n.teclas = p.teclas === 'padrao' ? 'classico' : p.teclas === 'classico' ? 'padrao' : d > 0 ? 'padrao' : 'classico';
    n.mapaTeclado = null;
  } else if (campo === 'controle') {
    n.controle = p.controle === 'moderno' ? 'arcade' : p.controle === 'arcade' ? 'moderno' : d > 0 ? 'moderno' : 'arcade';
    n.mapaControle = null;
  } else if (campo === 'vibracao') n.vibracao = !p.vibracao;
  else if (campo === 'reduzirClaroes') n.reduzirClaroes = !p.reduzirClaroes;
  else n.menu = p.menu === 'noite' ? 'amanhecer' : 'noite';
  gravar(g, n);
  return n;
}

/** The keyboard map in force: the custom one, or the factory profile. */
export const mapaTecladoDe = (p: Preferencias): MapaTeclado =>
  p.teclas === 'personalizado' && p.mapaTeclado ? p.mapaTeclado : TECLADO_FABRICA[p.teclas === 'classico' ? 'classico' : 'padrao'];
/** The controller map in force. */
export const mapaControleDe = (p: Preferencias): MapaControle =>
  p.controle === 'personalizado' && p.mapaControle ? p.mapaControle : CONTROLE_FABRICA[p.controle === 'arcade' ? 'arcade' : 'moderno'];

/**
 * Gives a key (or a button) to an action, swapping with the action that had it. A map that ends up equal to a factory
 * profile IS that profile again. A forbidden key is refused: the SAME object comes back. Otherwise the NEW one, recorded.
 */
export function remapear(g: Guarda, p: Preferencias, aparelho: 'teclado' | 'controle', acao: AcaoRemap, valor: string | number): Preferencias {
  const n: Preferencias = { ...p, volume: { ...p.volume } };
  if (aparelho === 'teclado') {
    const mapa = trocar(mapaTecladoDe(p), acao, String(valor));
    if (!mapaTecladoValido(mapa)) return p;
    n.teclas = perfilDe(mapa, TECLADO_FABRICA);
    n.mapaTeclado = n.teclas === 'personalizado' ? mapa : null;
  } else {
    const mapa = trocar(mapaControleDe(p), acao, Number(valor));
    if (!mapaControleValido(mapa)) return p;
    n.controle = perfilDe(mapa, CONTROLE_FABRICA);
    n.mapaControle = n.controle === 'personalizado' ? mapa : null;
  }
  gravar(g, n);
  return n;
}

/** RESTORE THE DEFAULT: both devices back to the first factory profile. Returns the NEW object, recorded. */
export function restaurarControles(g: Guarda, p: Preferencias): Preferencias {
  const n: Preferencias = { ...p, volume: { ...p.volume }, teclas: 'padrao', mapaTeclado: null, controle: 'moderno', mapaControle: null };
  gravar(g, n);
  return n;
}

export const fatorMusica = (p: Preferencias): number => (p.volume.geral / 10) * (p.volume.musica / 10);
export const fatorEfeitos = (p: Preferencias): number => (p.volume.geral / 10) * (p.volume.efeitos / 10);
/** "Reduce flashes": every flash at half strength. */
export const forcaClaroes = (p: Preferencias): number => (p.reduzirClaroes ? 0.5 : 1);
