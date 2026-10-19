import Phaser from 'phaser';
import { lcg } from './acaso';

/**
 * As TEXTURAS DESENHADAS do cenário do menu (spec §3.5, §4): o brilho macio das luzes, a bruma e o facho das fases
 * redesenhados na densidade `k` (ampliados, os de 384×216 viravam blocos) e o cone dos holofotes. Cada jogo Phaser
 * tem as suas: o mundo (k = 1) e a camada HD (k = 4).
 */

/** A largura visível do cone no fim (px da textura): para dar a um feixe a largura em px de jogo. */
export const LARG_CONE = 46;

/** A escala da textura `menu-brilho` (64 px) para um brilho de `diametro` px de jogo. */
export const brilho = (diametro: number): number => diametro / 64;

function canvas(
  scene: Phaser.Scene,
  chave: string,
  w: number,
  h: number,
  desenhar: (c: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  if (scene.textures.exists(chave)) return;
  const t = scene.textures.createCanvas(chave, w, h);
  if (!t) return;
  desenhar(t.context, w, h);
  t.refresh();
}

export function garantirTexturas(scene: Phaser.Scene, k: number): void {
  canvas(scene, 'menu-px', 1, 1, (c) => {
    c.fillStyle = '#fff';
    c.fillRect(0, 0, 1, 1);
  });
  // Uma luz vista de longe: macia, não um ponto (19/10, ele: *"luzes mais distorcidas ou embaçadas"*).
  canvas(scene, 'menu-brilho', 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });
  // A BRUMA das fases (`BootScene.makeFogBand`), com a mesma receita e a mesma semente, nesta densidade.
  canvas(scene, `menu-fog-${k}`, 256 * k, 64 * k, (c, W, H) => {
    const rnd = lcg(0x5eed);
    const borrao = (x: number, y: number, rr: number, a: number): void => {
      const g = c.createRadialGradient(x, y, 0, x, y, rr);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    };
    for (const p of [{ n: 34, rMin: 16, rMax: 38, alpha: 0.26 }, { n: 55, rMin: 5, rMax: 14, alpha: 0.18 }]) {
      for (let i = 0; i < p.n; i++) {
        const x = rnd() * W;
        const y = H / 2 + (rnd() - 0.5) * H * 0.9;
        const rr = (p.rMin + rnd() * (p.rMax - p.rMin)) * k;
        borrao(x, y, rr, p.alpha);
        if (x - rr < 0) borrao(x + W, y, rr, p.alpha);
        if (x + rr > W) borrao(x - W, y, rr, p.alpha);
      }
    }
    const corte = c.createLinearGradient(0, 0, 0, H);
    corte.addColorStop(0, 'rgba(0,0,0,1)');
    corte.addColorStop(0.22, 'rgba(0,0,0,0)');
    corte.addColorStop(0.78, 'rgba(0,0,0,0)');
    corte.addColorStop(1, 'rgba(0,0,0,1)');
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = corte;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
  });
  // O FACHO das fases (`BootScene.makeGodRay`): 192×24 px de jogo, macio nos dois sentidos, pico 0,55.
  canvas(scene, `menu-raio-${k}`, 192 * k, 24 * k, (c, W, H) => {
    for (let y = 0; y < H; y++) {
      const tt = 1 - Math.abs(y - (H - 1) / 2) / ((H - 1) / 2);
      const tr = tt * tt;
      if (tr <= 0) continue;
      for (let x = 0; x < W; x += 6) {
        c.fillStyle = `rgba(255,255,255,${0.55 * tr * Math.sin((Math.PI * (x + 3)) / W)})`;
        c.fillRect(x, y, 6, 1);
      }
    }
  });
  // O FEIXE de um holofote: um cone macio a partir da lâmpada (o meio da borda esquerda), abrindo e sumindo.
  canvas(scene, 'menu-cone', 256, 64, (c, W, H) => {
    const img = c.createImageData(W, H);
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const ao = Math.pow(1 - u, 1.2) * Math.min(1, x / 6);
      const meia = 3 + u * 26;
      for (let y = 0; y < H; y++) {
        const i = (y * W + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(255 * ao * Math.exp(-Math.pow((y - H / 2 + 0.5) / meia, 2) * 1.6));
      }
    }
    c.putImageData(img, 0, 0);
  });
}

/** Os pixels RGBA de uma textura carregada. */
export function lerPixels(scene: Phaser.Scene, chave: string): Uint8ClampedArray {
  const img = scene.textures.get(chave).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(img, 0, 0);
  return x.getImageData(0, 0, c.width, c.height).data;
}
