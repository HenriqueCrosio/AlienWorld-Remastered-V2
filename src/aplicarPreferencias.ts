import { definirMapaTeclado } from './controles';
import { definirVibracao } from './entrada/controle';
import type { AcaoRemap } from './entrada/mapas';
import { guardaDoNavegador } from './menu/qualMenu';
import {
  fatorEfeitos, fatorMusica, forcaClaroes, gravar, ler, mapaControleDe, mapaTecladoDe, mudar, remapear, restaurarControles,
  type Campo, type Preferencias,
} from './preferencias';
import { Som } from './som/Som';
import { Music } from './systems/Music';

/**
 * THE BRIDGE between the preferences object (`preferencias.ts`, pure) and the game (14/11, blocks M1 and M2): the
 * in-memory copy, and what each change touches. The music answers at once; the flashes, the vibration and the
 * (future) sound effects read their factor from here when they fire; the keyboard map goes to `controles.ts`, which
 * every `InputReader` re-reads on `EVENTO_TECLAS`; the controller map is read from here every frame.
 */
const guarda = guardaDoNavegador();
let atual: Preferencias | null = null;

/** The player's preferences (read once, then kept in memory). */
export function prefs(): Preferencias {
  if (!atual) {
    atual = ler(guarda);
    // `?teclas=padrao|classico` (dev, and the probes): the URL wins over what is recorded
    const pedido = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('teclas');
    if ((pedido === 'padrao' || pedido === 'classico') && atual.teclas !== pedido) {
      atual = { ...atual, teclas: pedido, mapaTeclado: null };
      gravar(guarda, atual);
    }
  }
  return atual;
}

function aplicar(p: Preferencias): Preferencias {
  atual = p;
  definirMapaTeclado(mapaTecladoDe(p));
  Music.atualizarVolume();
  Som.atualizarVolume();
  return p;
}

/** One step of ←→ on a settings line: records it and applies what answers at once. */
export const mudarPref = (campo: Campo, d: -1 | 1): Preferencias => aplicar(mudar(guarda, prefs(), campo, d));

/** A new key (or button) for an action. `false` when it was refused (a key the game keeps for itself). */
export function remapearPref(aparelho: 'teclado' | 'controle', acao: AcaoRemap, valor: string | number): boolean {
  const antes = prefs();
  return aplicar(remapear(guarda, antes, aparelho, acao, valor)) !== antes;
}

export const restaurarPref = (): Preferencias => aplicar(restaurarControles(guarda, prefs()));

/** "Reduce flashes" as a factor on every flash peak (`systems/clarao/Clarao.ts`). */
export const forcaDosClaroes = (): number => forcaClaroes(prefs());
/** The sound-effects level (general × effects, 0–1). The engine itself reads `Som.volumes` (block SOUND). */
export const volumeEfeitos = (): number => fatorEfeitos(prefs());
/** The controller map in force (the ship reads it every frame). */
export const mapaDoControle = (): Record<AcaoRemap, number> => mapaControleDe(prefs());
/** The keyboard map in force, one key per action (the hints and the settings show it). */
export const mapaDoTeclado = (): Record<AcaoRemap, string> => mapaTecladoDe(prefs());

Music.fator = () => fatorMusica(prefs());
// the effects (block SOUND, 15/11): the three levels apart — the ambience and the engine also read MÚSICA (`mixagem.ts`)
Som.volumes = () => {
  const p = prefs();
  return { geral: p.volume.geral / 10, efeitos: p.volume.efeitos / 10, musica: p.volume.musica / 10 };
};
definirVibracao(() => prefs().vibracao);
definirMapaTeclado(mapaTecladoDe(prefs()));
