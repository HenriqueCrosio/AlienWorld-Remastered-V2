import Phaser from 'phaser';
import { pixelText } from '../ui';
import { prepararCameraHD, type TextoEspelho } from '../uiHD';

/**
 * PROTÓTIPO (29/09) — o ESPELHO, só para as folhas da resolução mista: recebe os textos de uma cena do mundo (menu,
 * HUD, cutscene) e os redesenha aqui, na camada HD, no mesmo lugar. A sonda esconde os originais. Assim a folha
 * mostra qualquer tela nas duas mistas sem reescrever cena por cena.
 */
export class EspelhoHDScene extends Phaser.Scene {
  constructor() {
    super('EspelhoHD');
  }

  create(data: { textos: TextoEspelho[] }): void {
    prepararCameraHD(this);
    for (const t of data.textos) {
      pixelText(this, t.x, t.y, t.value, { size: t.size, color: t.color, align: t.align, stroke: t.stroke, voz: t.voz })
        .setOrigin(t.ox, t.oy)
        .setAlpha(t.alpha);
    }
  }
}
