/**
 * THE SERPENT'S DEV SHORTCUT (spec §5.6): `?serpente=A&hab=raio` opens the F3 straight into her fight, in that form,
 * with that skill forced (`hab=tiros`: only the pauses' common shots). Only in dev: `main.ts` imports it dynamically
 * under `import.meta.env.DEV`. The probes pass the same data to `scene.start('Game', { serpente })`.
 * THE EEL (08/11): `?serpente=fusao` plays the fusion scene as soon as she has risen, and the colossal eel bursts out of
 * it; `&vida=<pct>` starts her life there (the final stretch soon), `&roteiro=maquete` replays the approved mock's script
 * and dice (the bites and the death at its times — the side by side), `&taxa=30|auto` her redraw rate.
 */
import type Phaser from 'phaser';
import type { FormaHab, NomeHab } from './tipos';

export interface DevSerpente {
  forma: FormaHab;
  hab: NomeHab | 'tiros' | null;
  /** the eel's life at the start, in % (the dev's final stretch) */
  vida?: number;
  /** the eel replays the mock's script */
  roteiro?: 'maquete';
  /** the eel's redraw rate */
  taxa?: 30 | 'auto';
}

export function lerAtalho(qs: URLSearchParams): DevSerpente | null {
  const f = qs.get('serpente');
  if (f !== 'A' && f !== 'B' && f !== 'C' && f !== 'fusao') return null;
  const h = qs.get('hab');
  const dev: DevSerpente = { forma: f, hab: h === 'chuva' || h === 'raio' || h === 'gas' || h === 'tiros' ? h : null };
  const v = Number(qs.get('vida'));
  if (qs.has('vida') && v > 0) dev.vida = v;
  if (qs.get('roteiro') === 'maquete') dev.roteiro = 'maquete';
  const tx = qs.get('taxa');
  if (tx === 'auto') dev.taxa = 'auto';
  else if (tx === '30') dev.taxa = 30;
  return dev;
}

export function ligarAtalhoSerpente(game: Phaser.Game): void {
  const dev = lerAtalho(new URLSearchParams(location.search));
  if (!dev) return;
  // (waits for the menu: stopping the Boot halfway would leave the game without textures — the sandbox's rule)
  const tentar = (): void => {
    if (!game.scene.isActive('Menu')) {
      setTimeout(tentar, 100);
      return;
    }
    game.scene.getScenes(true).forEach((s) => s.scene.stop());
    game.registry.set('cartas', []);
    game.registry.set('cartasCheckpoint', {});
    game.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico', practice: true, serpente: dev });
  };
  tentar();
}
