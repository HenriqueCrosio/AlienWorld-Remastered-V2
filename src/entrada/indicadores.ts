import Phaser from 'phaser';
import { pixelText } from '../ui';
import { irmaDe } from '../uiHD';
import { aoConectar, controleConectado, familiaDoControle } from './controle';
import { QUADRO_APARELHO, aoCarregarBotoes, escalaDoIcone, ladoDoIcone, texturaDosBotoes } from './icones';

/**
 * THE DEVICE INDICATORS (14/11, block M2 — his request after playing with the DualSense): three symbols in the top
 * left corner — the PlayStation controller, the Xbox controller and the keyboard — DIM when not connected, LIT when
 * connected. *"Caso fique teclado e ps, ficam os dois, caso fique xbox e teclado ficam os dois."*
 *
 * The keyboard cannot be detected by a web page: on the desktop it is taken as always there. The controller lights
 * the symbol of ITS family (the game reads one controller at a time).
 */
const COR = { aceso: 0xd0d0dc, apagado: 0x4a5062 } as const;
const ORDEM = ['ps', 'xbox', 'teclado'] as const;
const NOME = { ps: 'PS', xbox: 'XBOX', teclado: 'TECLADO' } as const;

export interface Indicadores {
  destruir(): void;
  /** For the probes: which symbols are lit. */
  acesos(): string[];
}

/** Draws the three indicators with the first one at (x, y) (its top left corner). They follow the controller coming and going. */
export function montarIndicadores(scene: Phaser.Scene, x: number, y: number, depth = 50): Indicadores {
  const destino = irmaDe(scene) ?? scene;
  let pecas: Phaser.GameObjects.GameObject[] = [];
  let morto = false;
  const aceso = (a: (typeof ORDEM)[number]): boolean => (a === 'teclado' ? true : controleConectado() && familiaDoControle() === a);

  const desenhar = (): void => {
    if (morto) return;
    for (const p of pecas) p.destroy();
    pecas = [];
    const chave = texturaDosBotoes(destino);
    const lado = ladoDoIcone(destino);
    // ONE ROW: the symbol, its name beside it (and the name alone, while the strip has not arrived)
    let px = x;
    for (const a of ORDEM) {
      const on = aceso(a);
      if (chave) {
        pecas.push(destino.add.image(px, y, chave, QUADRO_APARELHO[a][on ? 0 : 1]).setOrigin(0, 0).setScale(escalaDoIcone(destino)).setDepth(depth).setAlpha(on ? 1 : 0.55));
        px += lado + 1;
      }
      const nome = pixelText(scene, px, y + lado / 2, NOME[a], { size: 5, color: on ? COR.aceso : COR.apagado, voz: 'piloto', align: 'left', stroke: 0 }).setDepth(depth);
      pecas.push(nome);
      px += nome.width + 5;
    }
  };
  desenhar();
  const soltas = [aoConectar(desenhar), aoCarregarBotoes(desenhar)];
  const destruir = (): void => {
    if (morto) return;
    morto = true;
    for (const s of soltas) s();
    for (const p of pecas) p.destroy();
    pecas = [];
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, destruir);
  return { destruir, acesos: () => ORDEM.filter(aceso) };
}
