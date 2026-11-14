import Phaser from 'phaser';
import { COLORS } from '../config';

/**
 * THE WINDOW of the game (14/11, block M1 — spec §4.4): the dark box with the double border that he approved for the
 * end-of-campaign scoreboard (*"um visual baseado em grandes sucessos de snes"*), at any size. The scoreboard
 * (`menu/painelResultado.ts`) and the pause (`scenes/PausaScene.ts`) draw the same frame.
 *
 * A texture drawn pixel by pixel (1 texel = 1 game px), once per game and size.
 */
export const COR_JANELA = { osso: 0xf0e4cc, fundo: 0x07080f } as const;

export const css = (c: number, a = 1): string => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;

/** A texture drawn pixel by pixel (1 texel = 1 game px), once per game. */
export function textura(scene: Phaser.Scene, chave: string, w: number, h: number, desenhar: (c: CanvasRenderingContext2D) => void): string {
  if (!scene.textures.exists(chave)) {
    const t = scene.textures.createCanvas(chave, w, h);
    if (t) {
      desenhar(t.context);
      t.refresh();
    }
  }
  return chave;
}

/** The window frame; `pintar` draws what goes inside the texture (the scoreboard's dotted lines). */
export function texturaJanela(
  scene: Phaser.Scene,
  chave: string,
  w: number,
  h: number,
  pintar?: (c: CanvasRenderingContext2D) => void,
  fundo = 0.78,
): string {
  return textura(scene, chave, w, h, (c) => {
    c.fillStyle = css(COR_JANELA.fundo, fundo);
    c.fillRect(1, 1, w - 2, h - 2);
    const borda = (m: number, cor: number, a: number): void => {
      c.fillStyle = css(cor, a);
      c.fillRect(m + 1, m, w - 2 * m - 2, 1);
      c.fillRect(m + 1, h - 1 - m, w - 2 * m - 2, 1);
      c.fillRect(m, m + 1, 1, h - 2 * m - 2);
      c.fillRect(w - 1 - m, m + 1, 1, h - 2 * m - 2);
    };
    borda(0, COR_JANELA.osso, 0.95);
    borda(1, 0x000000, 0.9);
    borda(2, COLORS.player, 0.7);
    // the corners: one pixel of shine
    c.fillStyle = css(0xffffff);
    for (const [x, y] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]]) c.fillRect(x, y, 1, 1);
    pintar?.(c);
  });
}
