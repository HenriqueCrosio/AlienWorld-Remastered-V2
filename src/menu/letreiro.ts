import Phaser from 'phaser';
import { glifosDaFonte } from '../fonte';
import { TITULO } from './numerosMenu';
import { faixasDasLetras, pintarLetreiro, type EstadoLetreiro } from './letreiroPixels';

/** O neon pronto para a tela: as três texturas (um quadro `L<i>` por letra) e as faixas das letras. */
export interface Letreiro {
  /** A escala da tela para a qual foi gerado (P = s pixels do letreiro por pixel da fonte). */
  s: number;
  w: number;
  h: number;
  chaves: Record<EstadoLetreiro, string>;
  letras: { ch: string; ini: number; fim: number }[];
}

const ESTADOS: EstadoLetreiro[] = ['apagado', 'aceso', 'olhos'];

/**
 * O neon do título como texturas da cena, para a escala `s` da tela (spec §6.5). Gerado na hora a partir das letras que
 * o jogo assa: cai pixel a pixel na tela em qualquer janela (cada pixel do letreiro = 2 px de tela). `null` sem a fonte.
 */
export function gerarLetreiro(scene: Phaser.Scene, s: number): Letreiro | null {
  const g = glifosDaFonte(TITULO);
  if (!g) return null;
  const letras = faixasDasLetras(g, s);
  const chaves = {} as Record<EstadoLetreiro, string>;
  let w = 0;
  let h = 0;
  for (const estado of ESTADOS) {
    const chave = `letreiro-${estado}-${s}`;
    chaves[estado] = chave;
    if (!scene.textures.exists(chave)) {
      const img = pintarLetreiro(g, s, estado);
      const tex = scene.textures.createCanvas(chave, img.w, img.h);
      if (!tex) return null;
      tex.context.putImageData(new ImageData(new Uint8ClampedArray(img.rgba), img.w, img.h), 0, 0);
      tex.refresh();
      letras.forEach((l, i) => tex.add(`L${i}`, 0, l.ini, 0, l.fim - l.ini, img.h));
    }
    const fonte = scene.textures.get(chave).getSourceImage();
    w = fonte.width;
    h = fonte.height;
  }
  return { s, w, h, chaves, letras };
}
