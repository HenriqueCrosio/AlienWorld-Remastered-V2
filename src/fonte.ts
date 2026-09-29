import Phaser from 'phaser';

/**
 * PROTÓTIPO (29/09) — a fonte pixel, em avaliação com `?fonte=tiny5|pixelify|silkscreen` na URL.
 *
 * Por que não basta trocar o `fontFamily`: o canvas do navegador SEMPRE suaviza a borda da letra, até de fonte
 * pixel no tamanho nativo, e o jogo é 384×216 — a borda meio acesa vira o borrão que o Henrique viu no menu. Então a
 * fonte é ASSADA: cada glifo é desenhado no tamanho nativo, binarizado (aceso ou apagado, nada no meio) e ganha 1px
 * de contorno escuro (o papel do `stroke` antigo). Vira uma BitmapFont, que o Phaser desenha sem suavizar.
 */
export interface FontePixel {
  arquivo: string;
  /** O tamanho em que 1 unidade da grade da fonte = 1 pixel (lido do arquivo: unitsPerEm ÷ passo da grade). */
  nativo: number;
}

/**
 * 29/09: a Silkscreen venceu (nativo 8px, lido do arquivo). Tiny5 (minúscula de 4px, V≈T) e Pixelify (racha o R)
 * saíram — folhas `folhas/2026-09-29/fontes-pixel.png`.
 */
export const FONTES: Record<string, FontePixel> = {
  silkscreen: { arquivo: 'fonts/silkscreen.woff2', nativo: 8 },
};

/** A chave das duas BitmapFonts assadas: com e sem contorno. */
export const BMF = { contorno: 'pixel-c', limpa: 'pixel' };

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

let escolhida: FontePixel | null = null;
let assadas: { contorno: Assada; limpa: Assada } | null = null;

export function fonteAtiva(): FontePixel | null {
  return escolhida;
}

/** Chamada uma vez antes do jogo nascer. Sem `?fonte=`, não faz nada — o jogo fica como está. */
export async function carregarFonte(): Promise<void> {
  const q = new URLSearchParams(location.search);
  // A mista `pixel` (`?ui3x=pixel`) usa a Silkscreen — o mundo e a camada HD falam a mesma fonte.
  const nome = q.get('fonte') ?? (q.get('ui3x') === 'pixel' || q.get('ui3x') === 'vozes' ? 'silkscreen' : null);
  const f = nome ? FONTES[nome] : undefined;
  if (!f) return;
  const face = new FontFace('fonte-pixel', `url(${f.arquivo})`);
  await face.load();
  (document.fonts as unknown as Set<FontFace>).add(face);
  escolhida = f;
  assadas = { contorno: assar(f.nativo, true), limpa: assar(f.nativo, false) };
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
      data: { font: chave, size: escolhida!.nativo, lineHeight: a.linha, retroFont: false, chars },
      texture: chave,
      frame: null,
    });
  }
}
