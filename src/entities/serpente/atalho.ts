/**
 * THE SERPENT'S DEV SHORTCUT (spec §5.6): `?serpente=A&hab=raio` opens the F3 straight into her fight, in that form,
 * with that skill forced (`hab=tiros`: only the pauses' common shots). Only in dev: `main.ts` imports it dynamically
 * under `import.meta.env.DEV`. The probes pass the same data to `scene.start('Game', { serpente })`.
 */
import type Phaser from 'phaser';
import type { FormaHab, NomeHab } from './tipos';

export interface DevSerpente {
  forma: FormaHab;
  hab: NomeHab | 'tiros' | null;
}

export function lerAtalho(qs: URLSearchParams): DevSerpente | null {
  const f = qs.get('serpente');
  if (f !== 'A' && f !== 'B' && f !== 'C' && f !== 'fusao') return null;
  const h = qs.get('hab');
  return { forma: f, hab: h === 'chuva' || h === 'raio' || h === 'gas' || h === 'tiros' ? h : null };
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
