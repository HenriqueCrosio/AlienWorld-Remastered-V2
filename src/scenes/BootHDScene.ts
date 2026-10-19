import Phaser from 'phaser';
import { ICONES_CARTAS, RARIDADES } from '../cartas';
import { carregarCamadasMenu } from '../menu/cenario';

/**
 * O boot da CAMADA HD (`uiHD.ts`): ela é outro jogo Phaser e não enxerga as texturas do mundo — carrega aqui as que
 * as cenas dela usam (a mesa: molduras, ícones e o realce; o menu: as camadas da pintura).
 */
export class BootHDScene extends Phaser.Scene {
  constructor() {
    super('BootHD');
  }

  preload(): void {
    ICONES_CARTAS.forEach((id) => this.load.image(`icone-${id}`, `sprites/cartas/icone-${id}.png`));
    RARIDADES.forEach((r) => this.load.image(`moldura-${r}`, `sprites/cartas/moldura-${r}.png`));
    this.load.image('realce-canto', 'sprites/cartas/realce-canto.png');
    // O MENU (bloco E): a pintura dele em camadas, na densidade da camada (o cenário mora aqui, atrás do texto).
    carregarCamadasMenu(this.load, 'menuK4', 'sprites/menu/k4');
  }
}
