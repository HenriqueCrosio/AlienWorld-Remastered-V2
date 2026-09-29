import Phaser from 'phaser';

/**
 * AS FONTES DAS TRÊS VOZES (spec `2026-09-29-tres-vozes-camada-hd-design.md`), carregadas ANTES do jogo nascer.
 *
 * - JOGO: a Silkscreen, ASSADA. O canvas do navegador SEMPRE suaviza a borda da letra, até de fonte pixel no tamanho
 *   nativo — e a borda meio acesa é o borrão que o Henrique viu no menu. Então cada glifo é desenhado no tamanho
 *   nativo, binarizado (aceso ou apagado, nada no meio) e ganha 1px de contorno escuro (o papel do `stroke` antigo).
 *   Vira uma BitmapFont, que o Phaser desenha sem suavizar. Tiny5 (minúscula de 4px, V≈T) e Pixelify (racha o R)
 *   perderam — `folhas/2026-09-29/fontes-pixel.png`.
 * - NAVE: a Chivo Mono bold — das 18 monos livres medidas, uma das 3 com o ZERO LIMPO (as de programação marcam o
 *   zero, e o placar ficava "estranho").
 * - PILOTO: a Chakra Petch 600, a leitura confortável da mesa.
 *
 * Nenhuma falha de fonte impede o jogo de abrir: a voz que perdeu a fonte cai para a Silkscreen, e sem a Silkscreen
 * o texto volta para a fonte do sistema (`fontesOk`).
 */

/** O tamanho em que 1 unidade da grade da Silkscreen = 1 pixel (lido do arquivo: unitsPerEm ÷ passo da grade). */
export const NATIVO_PIXEL = 8;

/** As famílias CSS das duas vozes lisas. */
export const FAMILIA = { nave: 'fonte-nave', piloto: 'fonte-piloto' } as const;

/** A chave das duas BitmapFonts assadas: com e sem contorno. */
export const BMF = { contorno: 'pixel-c', limpa: 'pixel' };

const ARQUIVO = {
  jogo: 'fonts/silkscreen.woff2',
  nave: 'fonts/chivo-mono-700.woff2',
  piloto: 'fonts/chakra-petch-600.woff2',
};

const CHARS = (() => {
  let s = '';
  for (let c = 32; c <= 126; c++) s += String.fromCharCode(c);
  for (let c = 160; c <= 255; c++) s += String.fromCharCode(c);
  return s + '—–−→←↔…★♦•';
})();

const CONTORNO = [5, 6, 13];

interface Assada {
  canvas: HTMLCanvasElement;
  chars: Record<number, { x: number; y: number; w: number; h: number; adv: number }>;
  linha: number;
}

let assadas: { contorno: Assada; limpa: Assada } | null = null;
const ok = { jogo: false, nave: false, piloto: false };

/** Quais vozes têm a sua fonte. */
export const fontesOk = (): Readonly<typeof ok> => ok;

async function carregar(familia: string, arquivo: string): Promise<void> {
  const face = new FontFace(familia, `url(${arquivo})`);
  await face.load();
  (document.fonts as unknown as Set<FontFace>).add(face);
}

/** Chamada uma vez, antes do `new Phaser.Game`. */
export async function carregarFontes(): Promise<void> {
  const [jogo, nave, piloto] = await Promise.allSettled([
    carregar('fonte-pixel', ARQUIVO.jogo),
    carregar(FAMILIA.nave, ARQUIVO.nave),
    carregar(FAMILIA.piloto, ARQUIVO.piloto),
  ]);
  if (jogo.status === 'fulfilled') {
    assadas = { contorno: assar(NATIVO_PIXEL, true), limpa: assar(NATIVO_PIXEL, false) };
    ok.jogo = true;
  }
  ok.nave = nave.status === 'fulfilled';
  ok.piloto = piloto.status === 'fulfilled';
  for (const r of [jogo, nave, piloto]) if (r.status === 'rejected') console.warn('[fonte]', r.reason);
}

function assar(tam: number, contorno: boolean): Assada {
  const med = document.createElement('canvas').getContext('2d')!;
  med.font = `${tam}px "fonte-pixel"`;
  const m = med.measureText('ÁÇgjy|');
  const asc = Math.ceil(m.fontBoundingBoxAscent);
  const linha = asc + Math.ceil(m.fontBoundingBoxDescent);
  const pad = contorno ? 1 : 0;

  const glifos: { code: number; img: ImageData; adv: number }[] = [];
  for (const ch of CHARS) {
    const adv = Math.round(med.measureText(ch).width);
    const w = Math.max(1, adv + 2 + pad * 2);
    const h = linha + pad * 2;
    const t = document.createElement('canvas');
    t.width = w;
    t.height = h;
    const x = t.getContext('2d', { willReadFrequently: true })!;
    x.font = med.font;
    x.fillStyle = '#fff';
    x.textBaseline = 'alphabetic';
    x.fillText(ch, pad, pad + asc);
    const img = x.getImageData(0, 0, w, h);
    const d = img.data;
    const aceso = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) aceso[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
    for (let i = 0; i < w * h; i++) {
      const o = i * 4;
      if (aceso[i]) {
        d[o] = d[o + 1] = d[o + 2] = d[o + 3] = 255;
        continue;
      }
      let viz = false;
      if (contorno) {
        const px = i % w;
        const py = (i / w) | 0;
        for (let dy = -1; dy <= 1 && !viz; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx;
            const ny = py + dy;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h && aceso[ny * w + nx]) { viz = true; break; }
          }
      }
      [d[o], d[o + 1], d[o + 2]] = CONTORNO;
      d[o + 3] = viz ? 255 : 0;
    }
    glifos.push({ code: ch.charCodeAt(0), img, adv });
  }

  // Empacota em fileiras de 256px, com 1px de folga entre glifos.
  const W = 256;
  let cx = 0;
  let cy = 0;
  let alt = 0;
  const pos: { x: number; y: number }[] = [];
  for (const g of glifos) {
    if (cx + g.img.width > W) { cx = 0; cy += alt + 1; alt = 0; }
    pos.push({ x: cx, y: cy });
    cx += g.img.width + 1;
    alt = Math.max(alt, g.img.height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = cy + alt;
  const ctx = canvas.getContext('2d')!;
  const chars: Assada['chars'] = {};
  glifos.forEach((g, i) => {
    ctx.putImageData(g.img, pos[i].x, pos[i].y);
    chars[g.code] = { x: pos[i].x, y: pos[i].y, w: g.img.width, h: g.img.height, adv: g.adv };
  });
  return { canvas, chars, linha };
}

/** Registra as BitmapFonts assadas no jogo (uma vez; a cache é global). */
export function registrarFonte(scene: Phaser.Scene): void {
  if (!assadas || scene.cache.bitmapFont.exists(BMF.contorno)) return;
  for (const [tipo, a] of Object.entries(assadas) as ['contorno' | 'limpa', Assada][]) {
    const chave = BMF[tipo];
    const tex = scene.textures.addCanvas(chave, a.canvas)!;
    const TW = a.canvas.width;
    const TH = a.canvas.height;
    const pad = tipo === 'contorno' ? 1 : 0;
    const chars: Record<number, unknown> = {};
    for (const [code, c] of Object.entries(a.chars)) {
      const u0 = c.x / TW;
      const v0 = c.y / TH;
      const u1 = (c.x + c.w) / TW;
      const v1 = (c.y + c.h) / TH;
      chars[+code] = {
        x: c.x, y: c.y, width: c.w, height: c.h,
        centerX: Math.floor(c.w / 2), centerY: Math.floor(c.h / 2),
        xOffset: -pad, yOffset: -pad, xAdvance: c.adv,
        data: {}, kerning: {}, u0, v0, u1, v1,
      };
      const fr = tex.add(String.fromCharCode(+code), 0, c.x, c.y, c.w, c.h);
      fr?.setUVs(c.w, c.h, u0, v0, u1, v1);
    }
    scene.cache.bitmapFont.add(chave, {
      data: { font: chave, size: NATIVO_PIXEL, lineHeight: a.linha, retroFont: false, chars },
      texture: chave,
      frame: null,
    });
  }
}
