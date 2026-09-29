import Phaser from 'phaser';

/**
 * A IRMÃ HD de uma cena do mundo (`uiHD.ts#irmaDe`): é aqui, na camada HD, que o texto daquela cena mora.
 *
 * Nasce com o 1º `pixelText` da cena e morre no `shutdown` dela. A cada quadro copia o ESCURECIMENTO da câmera
 * principal do mundo — o fade de troca de cena (a Atmosfera usa `fadeOut`) apaga o texto junto. O TREMOR e o FLASH
 * ficam só no mundo, de propósito: a HUD e os alertas ficam firmes e legíveis no caos (spec §2.4).
 */
export class IrmaHDScene extends Phaser.Scene {
  private mundo: Phaser.Scene | null = null;

  init(data: { mundo: Phaser.Scene }): void {
    this.mundo = data.mundo;
  }

  override update(): void {
    const cam = this.mundo?.cameras?.main;
    if (!cam) return;
    // `alpha` é privado no `phaser.d.ts`, mas é o valor que o Phaser pinta: sobe 0→1 no fadeOut, desce no fadeIn.
    const fade = cam.fadeEffect as unknown as { isRunning: boolean; isComplete: boolean; alpha: number };
    const escuro = fade.isRunning || fade.isComplete ? fade.alpha : 0;
    this.cameras.main.setAlpha(1 - escuro);
  }
}
