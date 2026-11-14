import Phaser from 'phaser';
import { aoQuadro, desceuBotao, direcaoDeMenu, quadroDoControle } from './controle';
import { BOTAO } from './mapas';

/**
 * THE CONTROLLER IN THE MENUS (14/11, block M2 — spec §4.5). The menu buttons are FIXED (his words: *"controles usam
 * os padrões da fábrica"*): the d-pad or the stick walk, the bottom face button confirms, the right one goes back,
 * the shoulders change tab, START pauses.
 *
 * Each screen keeps its own keyboard handlers and hands the SAME callbacks here. It listens to the reader's frame
 * (`aoQuadro`), not to the scene's update: the card table lives in another Phaser game, with another frame, and an
 * edge must be seen exactly once.
 */
export interface AcoesDeMenu {
  cima?: () => void;
  baixo?: () => void;
  esquerda?: () => void;
  direita?: () => void;
  /** the bottom face button (A / X) */
  ok?: () => void;
  /** the right face button (B / circle) */
  voltar?: () => void;
  /** the shoulders (LB · RB / L1 · R1) */
  abaAnt?: () => void;
  abaProx?: () => void;
  /** the top face button (Y / triangle) and the left one (X / square): a screen's extra actions */
  cimaFace?: () => void;
  esquerdaFace?: () => void;
  start?: () => void;
}

/** Holding a direction repeats it: after this long, then at this pace (ms). */
const REPETE = { depois: 400, cada: 110 } as const;
const DIRECOES = ['cima', 'baixo', 'esquerda', 'direita'] as const;

/**
 * Plugs the controller into a menu scene. `ligado` says when the screen is taking input (false while it animates out,
 * or while something else owns the buttons). Unplugs itself when the scene shuts down; returns the unplug.
 */
export function controleNoMenu(scene: Phaser.Scene, a: AcoesDeMenu, ligado: () => boolean = () => true): () => void {
  // the frame it was born in: the press that opened this screen was not for it
  const nasceu = quadroDoControle();
  const proxima: Record<(typeof DIRECOES)[number], number> = { cima: 0, baixo: 0, esquerda: 0, direita: 0 };
  const segurava: Record<(typeof DIRECOES)[number], boolean> = { cima: true, baixo: true, esquerda: true, direita: true };
  const soltar = aoQuadro(() => {
    const d = direcaoDeMenu();
    const ativa = quadroDoControle() !== nasceu && scene.scene.isActive() && scene.input.keyboard?.enabled !== false && ligado();
    if (!ativa) {
      // a direction held while the screen was not listening does not fire when it comes back
      for (const k of DIRECOES) segurava[k] = d[k];
      return;
    }
    const agora = performance.now();
    for (const k of DIRECOES) {
      if (d[k] && (!segurava[k] || agora >= proxima[k])) {
        proxima[k] = agora + (segurava[k] ? REPETE.cada : REPETE.depois);
        a[k]?.();
      }
      segurava[k] = d[k];
    }
    if (desceuBotao(BOTAO.A)) a.ok?.();
    if (desceuBotao(BOTAO.B)) a.voltar?.();
    if (desceuBotao(BOTAO.LB)) a.abaAnt?.();
    if (desceuBotao(BOTAO.RB)) a.abaProx?.();
    if (desceuBotao(BOTAO.Y)) a.cimaFace?.();
    if (desceuBotao(BOTAO.X)) a.esquerdaFace?.();
    if (desceuBotao(BOTAO.START)) a.start?.();
  });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, soltar);
  return soltar;
}
