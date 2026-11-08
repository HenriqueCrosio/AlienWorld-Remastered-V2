/**
 * THE EEL'S ART READER (plan `2026-11-08-enguia-instalacao.md`, decision 2): the approved PNGs as RGBA, the same bytes in
 * the browser (a canvas) and in Node (`sharp`, the oracle's reader). The PNGs have no partial alpha and no colour
 * profile (measured 08/11), so only one thing differs between the two decoders — the colour a fully transparent pixel
 * keeps — and the mock never reads it; `normaliza` zeroes it on both sides anyway.
 */
import type { Img } from './tipos.ts';

/** a reader: Phaser key (`arquivos.ts`) → RGBA */
export type Leitor = (chave: string) => Img;

export function normaliza(img: Img): Img {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] === 0) d[i] = d[i + 1] = d[i + 2] = 0;
  return img;
}

/** the browser's reader: a loaded texture's source image drawn on a canvas, read back */
export function leitorDeTexturas(texturas: { get(k: string): { getSourceImage(): unknown } }): Leitor {
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' }) as CanvasRenderingContext2D;
  return (chave) => {
    const fonte = texturas.get(chave).getSourceImage() as HTMLImageElement;
    const w = fonte.naturalWidth || fonte.width, h = fonte.naturalHeight || fonte.height;
    cv.width = w;
    cv.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(fonte, 0, 0);
    const d = ctx.getImageData(0, 0, w, h).data;
    return normaliza({ data: new Uint8Array(d.buffer.slice(0)), w, h });
  };
}
