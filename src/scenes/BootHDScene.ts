import Phaser from 'phaser';
import { ICONES_CARTAS } from '../cartas';

/**
 * O boot da CAMADA HD (`uiHD.ts`): ela é outro jogo Phaser e não enxerga as texturas do mundo — carrega aqui as que
 * as cenas dela usam (hoje, só a mesa: os ícones das cartas).
 */
export class BootHDScene extends Phaser.Scene {
  constructor() {
    super('BootHD');
  }

  preload(): void {
    ICONES_CARTAS.forEach((id) => this.load.image(`icone-${id}`, `sprites/cartas/icone-${id}.png`));
  }
}
