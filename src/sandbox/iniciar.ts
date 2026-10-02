import type Phaser from 'phaser';
import { mao } from './arvore.ts';
import type { ConfigSandbox } from './config.ts';
import { abrirMontagem } from './montagem.ts';

/**
 * O SANDBOX DE DEV (spec `2026-10-02-sandbox-dev-design.md`) — só existe no `npm run dev` (o `main.ts` importa este
 * módulo atrás do `import.meta.env.DEV`, então ele nem entra no build do jogador).
 *
 * Abre a montagem por `?sandbox` na URL, pela tecla X do menu (dev) ou pelo ESC dentro do sandbox (o evento
 * `sandbox:montagem`); o JOGAR liga a `GameScene` em modo sandbox com a build na mão.
 */
export function ligarSandbox(game: Phaser.Game): void {
  const abrir = (): void => {
    game.scene.getScenes(true).forEach((s) => s.scene.stop());
    abrirMontagem((c) => jogar(game, c));
  };
  game.events.on('sandbox:montagem', abrir);
  if (new URLSearchParams(location.search).has('sandbox')) {
    // Espera o carregamento terminar (o menu nascer) — parar o Boot no meio deixaria o jogo sem texturas.
    const tentar = (): void => {
      if (game.scene.isActive('Menu')) abrir();
      else setTimeout(tentar, 100);
    };
    tentar();
  }
  (window as unknown as { __sandbox: { abrir: () => void } }).__sandbox = { abrir };
}

function jogar(game: Phaser.Game, c: ConfigSandbox): void {
  // A build vai para a MÃO (o registry) como se tivesse saído das mesas; o tier é o escolhido.
  game.registry.set('cartas', mao(c.niveis));
  game.registry.set('cartasCheckpoint', {});
  game.registry.set('tierNave', c.tier);
  game.scene.start('Game', { stage: c.fase, ship: c.nave, handling: 'diegetico', practice: c.chefe, sandbox: c });
}
