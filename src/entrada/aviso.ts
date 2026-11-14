import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import { pixelText } from '../ui';
import { aoConectar } from './controle';

/**
 * THE NOTICE when the controller connects or disconnects (14/11, block M2 — spec §3.2): a short line in the top right
 * corner, 2 seconds, written in the scene on top (the pause, when it is open).
 */
const MS = 2000;

export function ligarAvisoDoControle(game: Phaser.Game): void {
  let atual: Phaser.GameObjects.Text | null = null;
  aoConectar((ligou) => {
    const cenas = game.scene.getScenes(true);
    const cena = cenas[cenas.length - 1];
    if (!cena) return;
    if (atual?.active) atual.destroy();
    const o = pixelText(cena, GAME_WIDTH - 6, 26, ligou ? 'CONTROLE CONECTADO' : 'CONTROLE DESCONECTADO', {
      size: 7,
      color: ligou ? COLORS.playerGlow : COLORS.hotBright,
      align: 'left',
    }).setOrigin(1, 0.5).setDepth(300);
    atual = o;
    // a timer of the page, not of the scene: the scene on top may be paused, and the notice must leave all the same
    window.setTimeout(() => {
      if (o.active) o.destroy();
    }, MS);
  });
}
