import { guardaDoNavegador } from './menu/qualMenu';
import { fatorEfeitos, fatorMusica, forcaClaroes, ler, mudar, type Campo, type Preferencias } from './preferencias';
import { Music } from './systems/Music';

/**
 * THE BRIDGE between the preferences object (`preferencias.ts`, pure) and the game (14/11, block M1 — spec §4.2): the
 * in-memory copy, and what each change touches. The music answers at once; the flashes and the (future) sound effects
 * read their factor from here when they fire; the key profile and the menu choice travel through the keys the game
 * already reads (`preferencias.ts#gravar` mirrors them).
 */
const guarda = guardaDoNavegador();
let atual: Preferencias | null = null;

/** The player's preferences (read once, then kept in memory). */
export function prefs(): Preferencias {
  atual ??= ler(guarda);
  return atual;
}

/** One step of ←→ on a settings line: records it and applies what answers at once. */
export function mudarPref(campo: Campo, d: -1 | 1): Preferencias {
  atual = mudar(guarda, prefs(), campo, d);
  Music.atualizarVolume();
  return atual;
}

/** "Reduce flashes" as a factor on every flash peak (`systems/clarao/Clarao.ts`). */
export const forcaDosClaroes = (): number => forcaClaroes(prefs());
/** The sound-effects level (general × effects, 0–1): recorded today, used when the sound comes in. */
export const volumeEfeitos = (): number => fatorEfeitos(prefs());

Music.fator = () => fatorMusica(prefs());
