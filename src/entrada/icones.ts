import Phaser from 'phaser';
import { ehHD, escalaHD } from '../uiHD';
import { BOTAO, type Familia } from './mapas';

/**
 * THE BUTTON ICONS of the controller hints (14/11, block M2). His call: *"Sobre os ícones do Xbox e Play, pode retirar
 * de acervo público"* — they come from Kenney's "Input Prompts Pixel" (CC0, public domain), baked into one strip of
 * 16×16 frames by `scripts/_m/_botoes-assar.mjs` (the source and its licence: `assets/raw/kenney-input-prompts-pixel/`).
 *
 * The strip is loaded once by the page and handed to whichever Phaser game draws it (the world, or the HD layer).
 */
const CHAVE = 'botoes';
const LADO = 16;
const imagem = typeof Image === 'undefined' ? null : new Image();
if (imagem) imagem.src = 'sprites/botoes.png';

/** The frame of each button of the standard mapping, per family (the order of the baking script). */
const QUADROS: Record<Familia, Partial<Record<number, number>>> = {
  xbox: { [BOTAO.A]: 0, [BOTAO.B]: 1, [BOTAO.X]: 2, [BOTAO.Y]: 3, [BOTAO.LB]: 4, [BOTAO.RB]: 5, [BOTAO.LT]: 6, [BOTAO.RT]: 7, [BOTAO.START]: 8 },
  ps: { [BOTAO.A]: 9, [BOTAO.B]: 10, [BOTAO.X]: 11, [BOTAO.Y]: 12, [BOTAO.LB]: 13, [BOTAO.RB]: 14, [BOTAO.LT]: 15, [BOTAO.RT]: 16, [BOTAO.START]: 8 },
};
export const QUADRO_DIRECIONAL = 17;
export const QUADRO_ANALOGICO = 18;
/** The device indicators: [lit, dim]. */
export const QUADRO_APARELHO = { xbox: [19, 20], teclado: [21, 22], ps: [23, 24] } as const;

/** Called once when the strip has arrived (who drew names in its place redraws). Returns the unsubscribe. */
export function aoCarregarBotoes(f: () => void): () => void {
  if (!imagem || (imagem.complete && imagem.naturalWidth > 0)) return () => {};
  imagem.addEventListener('load', f, { once: true });
  return () => imagem.removeEventListener('load', f);
}

export const quadroDoBotao = (i: number, familia: Familia): number | null => QUADROS[familia][i] ?? null;

/** The texture key of the strip in this scene's game, or `null` while the image has not arrived (the hint stays text). */
export function texturaDosBotoes(scene: Phaser.Scene): string | null {
  if (!imagem || !imagem.complete || imagem.naturalWidth === 0) return null;
  if (!scene.textures.exists(CHAVE)) scene.textures.addSpriteSheet(CHAVE, imagem, { frameWidth: LADO, frameHeight: LADO });
  return CHAVE;
}

/**
 * The scale that keeps the icon CRISP: each of its pixels a whole number of screen pixels, the icon about half its
 * size in game pixels (8–11 px, the height of a line of text). In the world (no HD layer) it is plain 0.5.
 */
export function escalaDoIcone(scene: Phaser.Scene): number {
  if (!ehHD(scene)) return 0.5;
  const s = escalaHD();
  return Math.max(1, Math.round(s / 2)) / s;
}
export const ladoDoIcone = (scene: Phaser.Scene): number => LADO * escalaDoIcone(scene);
