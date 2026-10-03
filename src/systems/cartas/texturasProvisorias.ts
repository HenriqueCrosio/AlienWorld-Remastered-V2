import type Phaser from 'phaser';

/**
 * A versão da LINHAGEM de uma peça (03/10): `<chave>-alien` quando a nave é alien E a arte existe; senão a chave base
 * (a humana, ou a provisória). As duas linhagens têm míssil e tiro de drone próprios (spec do catálogo §5.1b).
 */
export function texturaDaLinhagem(scene: Phaser.Scene, chave: string, linhagem: string): string {
  return linhagem === 'alien' && scene.textures.exists(`${chave}-alien`) ? `${chave}-alien` : chave;
}

/**
 * A ARTE PROVISÓRIA das cartas novas (spec §6.2): formas simples para ele JOGAR e sentir a mecânica. Desde 03/10 a arte
 * aprovada (mísseis 16×5, tiros 6×1, estilhaço D, drones animados) é carregada pelo `BootScene` com as MESMAS chaves —
 * e aí estas aqui não nascem (`fazer` pula chave que já existe). Ficam como rede: sem o PNG, o jogo segue jogável.
 */
export function criarTexturasProvisorias(scene: Phaser.Scene): void {
  const fazer = (chave: string, w: number, h: number, desenhar: (g: Phaser.GameObjects.Graphics) => void): void => {
    if (scene.textures.exists(chave)) return;
    const g = scene.make.graphics({}, false);
    desenhar(g);
    g.generateTexture(chave, w, h);
    g.destroy();
  };
  fazer('carta-estilhaco', 2, 2, (g) => g.fillStyle(0xffb040).fillRect(0, 0, 2, 2));
  fazer('carta-missil', 7, 3, (g) => g.fillStyle(0x8a93a6).fillRect(0, 0, 6, 3).fillStyle(0xff6a20).fillRect(6, 1, 1, 1));
  fazer('carta-flare', 3, 3, (g) => g.fillStyle(0xff3a2a).fillRect(0, 0, 3, 3).fillStyle(0xffe0a0).fillRect(1, 1, 1, 1));
  // Branco: o tiro do drone é TINGIDO na cor da linhagem.
  fazer('carta-tiro-drone', 6, 1, (g) => g.fillStyle(0xffffff).fillRect(0, 0, 6, 1));
  fazer('carta-drone', 5, 5, (g) => g.fillStyle(0x5a6270).fillCircle(2.5, 2.5, 2.5).fillStyle(0x3ee0f0).fillRect(2, 2, 1, 1));
}
