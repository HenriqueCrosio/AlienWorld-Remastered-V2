import Phaser from 'phaser';
import { CLARAO, forcaDisco, forcaVinheta, nivel } from './claraoRegras';

/**
 * AS TEXTURAS DOS CLARÕES, assadas em canvas na 1ª vez que cada uma é pedida (as texturas são do jogo, não da cena):
 * `CLARAO.quadros` quadros lado a lado, a luz morrendo de um para o outro; cada pixel é branco com o alpha do seu nível
 * (a cor entra pelo `setTint`). Em pixel, na resolução nativa — nada de `Graphics` nem de gradiente liso.
 */
function assa(scene: Phaser.Scene, chave: string, w: number, h: number, forca: (x: number, y: number) => number): string {
  if (scene.textures.exists(chave)) return chave;
  const K = CLARAO.quadros;
  const t = scene.textures.createCanvas(chave, w * K, h);
  if (!t) return chave;
  const ctx = t.getContext();
  const img = ctx.createImageData(w * K, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const f = forca(x, y);
      if (f <= 0) continue;
      for (let k = 0; k < K; k++) {
        const q = nivel(f * (1 - k / K), x, y);
        if (q <= 0) continue;
        const i = (y * w * K + k * w + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round((q / CLARAO.niveis) * 255);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  t.refresh();
  for (let k = 0; k < K; k++) t.add(k, 0, k * w, 0, w, h);
  return chave;
}

/** O disco de luz de raio `raio` (a chave da textura; os quadros 0…5). */
export function texturaDisco(scene: Phaser.Scene, raio: number): string {
  return assa(scene, `clarao-${raio}`, 2 * raio, 2 * raio, (x, y) => forcaDisco(x, y, raio));
}

/** A vinheta da tela inteira (a chave da textura; os quadros 0…5). */
export function texturaVinheta(scene: Phaser.Scene): string {
  return assa(scene, 'clarao-vinheta', CLARAO.tela.w, CLARAO.tela.h, forcaVinheta);
}
