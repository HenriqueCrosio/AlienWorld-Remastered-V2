// Posing the Tentacle on the REAL act-2 hull, offline (08/10): the head (Pinça 49), a chain of body pieces that turn
// with their path, the crest that hides what is inside the hull, the ship for scale, sheets and panels.
// Shared by `_tentaculo-v3.mjs` (the Void Serpent body and the spine-serpent skill).
import sharp from 'sharp';
import { hex, px } from './_tinta-lib.mjs';
import { ampliar, colar, colarCentro, girar, ler, novo } from './_pixel-lib.mjs';

export const CRISTA = 150;

/** The head's own palette (the Pro 49). */
export const P = {
  O: hex('#050609'), o: hex('#0c0b0f'), d: hex('#141219'), D: hex('#1a1820'), m: hex('#24212b'), M: hex('#2d2835'),
  l: hex('#36313c'), L: hex('#3d3744'), h: hex('#45414a'), H: hex('#4b4c4f'), s: hex('#635d62'), r: hex('#923639'),
  R: hex('#b31a1d'), F: hex('#ff4a3a'),
};

/** A drawing from a char map (`.` = transparent). */
export function mapa(linhas, pal = P) {
  const img = novo(linhas[0].length, linhas.length);
  linhas.forEach((l, y) => [...l].forEach((c, x) => c !== '.' && px(img, x, y, pal[c], 1)));
  return img;
}

export const CABECA = await ler('docs/superpowers/folhas/2026-10-07/elites/cand/tentaculoPinca-31-49.png', { flop: true, trim: true });
/** Where the neck joins the body, and the mouth, from the head's centre (the 30×27 art). */
export const NUCA = { x: 6, y: 12 };
export const BOCA = { x: -9, y: 2 };

const fundo = await ler('docs/superpowers/folhas/2026-10-06/elites/ref/fundo-casco.png');
export const nave = await ler('public/sprites/ship-jato.png');

/** A window of the hull capture. ⚠️ x ≥ 90: the capture has its own ship at x≈45–85. */
export function recorte(J) {
  const img = novo(J.w, J.h);
  for (let y = 0; y < J.h; y++) fundo.d.copy(img.d, y * J.w * 4, ((J.y + y) * fundo.w + J.x) * 4, ((J.y + y) * fundo.w + J.x + J.w) * 4);
  return img;
}

/** Pastes only what is ABOVE `crista` (in front of the plates, the hull hides what is inside it). */
export function colarAcima(img, spr, cx, cy, crista) {
  const tmp = novo(img.w, img.h);
  colarCentro(tmp, spr, cx, cy);
  for (let y = 0; y < Math.min(crista, img.h); y++)
    for (let x = 0; x < img.w; x++) {
      const k = (y * img.w + x) * 4;
      if (tmp.d[k + 3]) px(img, x, y, [tmp.d[k], tmp.d[k + 1], tmp.d[k + 2]], tmp.d[k + 3] / 255);
    }
}

/** The head at (x, y) turned `rot` (0 = upright, pincers to the left); returns the neck point. */
export function cabeca(img, x, y, rot, crista = null) {
  const g = girar(CABECA, rot);
  if (crista !== null) colarAcima(img, g, x, y, crista);
  else colarCentro(img, g, x, y);
  const c = Math.cos(rot), s = Math.sin(rot);
  return { x: x + NUCA.x * c - NUCA.y * s, y: y + NUCA.x * s + NUCA.y * c };
}

/**
 * Poses a CHAIN along `caminho(u)` (u∈[0,1], 0 = the neck): each piece turns so its art-up points back to the head.
 * Returns the posed pieces ({x, y, ang}) — the skill reads where each spine-bearing piece is.
 */
export function corrente(img, caminho, pecas, espacos, crista = null, desenhar = true) {
  const pts = Array.from({ length: 500 }, (_, i) => caminho(i / 499));
  const ao = (dist) => {
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (acc + seg >= dist) {
        const u = (dist - acc) / seg;
        return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * u, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * u, ang: Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x) };
      }
      acc += seg;
    }
    return null;
  };
  const pos = [];
  let dist = espacos[0];
  pecas.forEach((p, i) => {
    const q = ao(dist);
    if (q) pos.push({ p, ...q, i });
    dist += espacos[Math.min(i + 1, espacos.length - 1)];
  });
  if (desenhar)
    for (const q of [...pos].reverse()) {
      const g = girar(q.p, q.ang - Math.PI / 2);
      if (crista !== null) colarAcima(img, g, q.x, q.y, crista);
      else colarCentro(img, g, q.x, q.y);
    }
  return pos;
}

export async function painel(img, titulo, Z = 3) {
  const w = img.w * Z;
  const rot = await sharp(Buffer.from(`<svg width="${w}" height="24" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="17" font-family="Consolas, monospace" font-size="15" fill="#ffb040">${titulo}</text></svg>`)).png().toBuffer();
  return { rot, img: await ampliar(img, Z), w, h: img.h * Z + 24 };
}

export async function folha(paineis, cols, arq) {
  const PW = paineis[0].w, PH = paineis[0].h;
  const comp = paineis.flatMap((p, k) => {
    const left = (k % cols) * (PW + 6), top = Math.floor(k / cols) * (PH + 8);
    return [{ input: p.rot, left, top }, { input: p.img, left, top: top + 24 }];
  });
  await sharp({ create: { width: cols * (PW + 6), height: Math.ceil(paineis.length / cols) * (PH + 8), channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(arq);
  console.log(arq);
}

export { colar, colarCentro, girar, px, hex, novo };
