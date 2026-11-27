import Phaser from 'phaser';
import { Medidas } from '../../systems/Medidas.ts';
import { RegistroLuta, type CenaVista } from './RegistroLuta.ts';
import type { GanchoRegistro } from './tipos.ts';

/**
 * `?registro` (DEV — spec 2026-11-26-medicao-das-lutas §3): every start of the Game scene gets a fresh fight recorder.
 * The scene's `Medidas` (the sandbox's counter, which the scene already feeds with the effective damage per source) is
 * created when the scene has none of its own; the sandbox keeps its own. `window.__registro` = the current recorder.
 */
export function ligarRegistro(game: Phaser.Game): void {
  if (!new URLSearchParams(location.search).has('registro')) return;
  const tentar = (): void => {
    const sc = game.scene.getScene('Game');
    if (!sc) {
      setTimeout(tentar, 100);
      return;
    }
    sc.events.on(Phaser.Scenes.Events.CREATE, () => montar(sc));
    if (game.scene.isActive('Game')) montar(sc);
  };
  tentar();
}

function montar(sc: Phaser.Scene): void {
  const v = sc as unknown as CenaVista & { registro: GanchoRegistro | null; sandbox: unknown };
  if (!v.sandbox) v.medidas = new Medidas(() => sc.time.now);
  const r = new RegistroLuta(v, [...((sc.registry.get('cartas') as string[] | undefined) ?? [])]);
  v.registro = r;
  sc.events.on(Phaser.Scenes.Events.POST_UPDATE, r.quadro);
  sc.events.once(Phaser.Scenes.Events.SHUTDOWN, () => sc.events.off(Phaser.Scenes.Events.POST_UPDATE, r.quadro));
  (window as unknown as { __registro: RegistroLuta }).__registro = r;
}
