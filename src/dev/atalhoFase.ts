import type Phaser from 'phaser';
import { lerAtalhoFase } from './fasesDev.ts';
import { maoPorNome } from './maos.ts';
import { carregar } from '../sandbox/config.ts';

/**
 * `?fase=besta3&mao=mediana` (dev — spec 2026-11-24-besta-refeita §7): the boss's stage opens straight into the fight
 * (the practice), the scene walks the boss to that phase (`devFase` → `IrParaFase`), with that hand (`devMao`). Only in
 * dev: `main.ts` imports this under `import.meta.env.DEV`.
 */
export function ligarAtalhoFase(game: Phaser.Game): void {
  const a = lerAtalhoFase(new URLSearchParams(location.search));
  if (!a) return;
  // (waits for the menu: stopping the Boot halfway would leave the game without textures — the sandbox's rule)
  const tentar = (): void => {
    if (!game.scene.isActive('Menu')) {
      setTimeout(tentar, 100);
      return;
    }
    game.scene.getScenes(true).forEach((s) => s.scene.stop());
    const devMao = a.mao ? maoPorNome(a.mao, carregar().niveis) : undefined;
    game.scene.start('Game', {
      stage: a.stage,
      ship: a.stage === 1 ? undefined : 'humana',
      handling: 'diegetico',
      practice: true,
      devFase: a.fase,
      devMao,
    });
  };
  tentar();
}
