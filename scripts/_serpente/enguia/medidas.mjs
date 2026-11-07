// 07/11 — the approved art as the MEASURE of the mock's blocks (`folhas/2026-11-04/enguia-corpo/aprovada/`): the head
// E3's silhouette (drawn flat grey as "the simple head"), its neck joint and snout (the head's rigid chord), the eye and
// the mouth's ember, the circles that stand for it in the touch, and the body's height profile (the rings' radii).
import sharp from 'sharp';
import { CRANIO_X } from './arte.mjs';

const DIR = 'docs/superpowers/folhas/2026-11-04/enguia-corpo/aprovada/';

async function cru(arq) {
  const { data, info } = await sharp(DIR + arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}
const colunas = (img) => {
  const c = [];
  for (let x = 0; x < img.w; x++) {
    let a = -1, b = -1;
    for (let y = 0; y < img.h; y++) if (img.data[(y * img.w + x) * 4 + 3] > 128) { if (a < 0) a = y; b = y; }
    c.push(a < 0 ? null : { a, b, h: b - a + 1, m: (a + b) / 2 });
  }
  return c;
};
const centroide = (img, teste, x1 = img.w) => {
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < x1; x++) {
    const i = (y * img.w + x) * 4, p = [img.data[i], img.data[i + 1], img.data[i + 2]];
    if (img.data[i + 3] > 128 && teste(p)) { sx += x; sy += y; n++; }
  }
  return n ? { x: sx / n, y: sy / n } : null;
};

export async function medidas(N) {
  const cab = await cru('cabeca-e3-pescoco.png');
  const cc = colunas(cab);
  // (2nd round of the rings: only the SKULL is rigid — the neck, x ≥ 66, bends with the body; `pescoco` is now the
  // skull's joint, the head's anchor)
  const x0 = cc.findIndex(Boolean), x1 = CRANIO_X;
  const pescoco = { x: x1, y: cc[x1].m }, focinho = { x: x0, y: cc[x0].m };
  const mascara = new Uint8Array(cab.w * cab.h);
  for (let i = 0; i < cab.w * cab.h; i++) mascara[i] = cab.data[i * 4 + 3] > 128 && i % cab.w < CRANIO_X ? 1 : 0;
  const olho = centroide(cab, ([r, g, b]) => b > 170 && b > r + 60);
  const boca = centroide(cab, ([r, g, b]) => r > 180 && r > b + 80, 80);
  // the touch: 4 circles along the chord, each the half-height of the silhouette at its column
  const comp = Math.hypot(focinho.x - pescoco.x, focinho.y - pescoco.y);
  const circulos = [0.1, 0.35, 0.6, 0.85].map((u) => {
    const x = Math.round(pescoco.x + (focinho.x - pescoco.x) * u);
    return { u: u * comp, r: Math.max(4, cc[x].h / 2 - 1), dy: cc[x].m - (pescoco.y + (focinho.y - pescoco.y) * u) };
  });

  // the body: the whole eel's columns from the neck (x 96) to the tail tip
  const f1 = await cru('enguia-f1.png');
  const fc = colunas(f1);
  const X0 = 96, X1 = fc.length - 1 - [...fc].reverse().findIndex(Boolean);
  const corpoLen = N.corpo.aneis * N.corpo.passo, artLen = X1 - X0, cab0 = 80, cauda = 150;
  // body arc u (px from the neck) → the art's column: the first 80 px and the last 150 px as drawn, the middle stretched
  const coluna = (u) => {
    if (u <= cab0) return X0 + u;
    if (u >= corpoLen - cauda) return X1 - (corpoLen - u) * (cauda / cauda);
    const k = (u - cab0) / (corpoLen - cauda - cab0);
    return X0 + cab0 + k * (artLen - cauda - cab0);
  };
  const perfil = (u) => {
    const x = Math.round(Math.min(X1, Math.max(CRANIO_X, coluna(u))));
    return fc[x] ? fc[x].h : 2;
  };

  return {
    cabeca: { w: cab.w, h: cab.h, mascara, pescoco, focinho, olho, boca, comp, ang: Math.atan2(focinho.y - pescoco.y, focinho.x - pescoco.x) },
    circulosCabeca: circulos,
    perfil,
    raio: (k) => Math.max(2.5, perfil((k + 0.5) * N.corpo.passo) / 2),
    // the tube's radius at any arc u from the neck (smoothed over ±4 px: the art's columns step)
    // (u < 0 is the neck: the art's columns 66–95)
    raioU: (u) => { let s = 0; for (let d = -4; d <= 4; d += 2) s += perfil(Math.max(CRANIO_X - X0, u + d)); return Math.max(2, s / 10); },
  };
}
