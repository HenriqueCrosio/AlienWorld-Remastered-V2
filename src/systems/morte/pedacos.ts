// THE SHIP'S DEATH, the pure part (no Phaser): cutting the ship's own pixels into pieces, the heat ramps, the seeded
// luck. Everything here works on a `Bitmap` (the ship's frame read back from its texture), so it serves the four human
// choices and the manta alike, with no art per ship. Tested in Node by `scripts/test-morte.mjs`.

/** A frame's pixels, packed as the ImageData's Uint32 (little-endian: 0xAABBGGRR). 0 = empty. */
export interface Bitmap {
  w: number;
  h: number;
  cor: Uint32Array;
}

export const rgba = (r: number, g: number, b: number, a = 255): number => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
export const hex = (h: string): number => rgba(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
export const canais = (c: number): [number, number, number, number] => [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, c >>> 24];

/** The seeded luck (mulberry32): the same seed, the same death — the films compare like with like. */
export function sorte(semente: number): () => number {
  let a = semente | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Value noise in [-1, 1], a random value every `passo` px and bilinear in between: what bends a cut so it is never straight. */
export function ruido(w: number, h: number, passo: number, rnd: () => number): (x: number, y: number) => number {
  const gw = Math.ceil(w / passo) + 2;
  const gh = Math.ceil(h / passo) + 2;
  const g = Float32Array.from({ length: gw * gh }, () => rnd() * 2 - 1);
  return (x, y) => {
    const fx = x / passo, fy = y / passo;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const u = fx - ix, v = fy - iy;
    const at = (i: number, j: number): number => g[Math.min(gh - 1, Math.max(0, j)) * gw + Math.min(gw - 1, Math.max(0, i))];
    return (at(ix, iy) * (1 - u) + at(ix + 1, iy) * u) * (1 - v) + (at(ix, iy + 1) * (1 - u) + at(ix + 1, iy + 1) * u) * v;
  };
}

/**
 * THE EXHAUST FLAME is not hull: it does not break into pieces, it turns into fire at once. The flames are drawn by hand
 * behind the nozzle with their own palettes (`_nave-molde-preta.mjs`, `_jato-sem-balanco.mjs` and the blue of the
 * PROPULSORES), so it is those exact colours in the first 10 columns. A colour test would not do: the jato's tan hull
 * (d48744) is a twin of the "a" flame's orange (de8d47), and the "a" lights are the flame's f0b65a — but further forward.
 */
const CHAMA = new Set([
  // the "a": W H Y O R, and the blue
  'f9f4de', 'f0b65a', 'f9ab03', 'de8d47', 'ea4a1f', 'e2feff', '09cefa', '0399fa', '0378fa',
  // the jato: white, light, yellow, red, ember, and the blue
  'fffe0b', 'ffd60a', 'ffac0c', 'fe0101', 'b2321e', '08ecfc', '041ef7',
].map(hex));
export function ehChama(c: number, x: number): boolean {
  return x <= 9 && c >>> 24 >= 128 && CHAMA.has((c | 0xff000000) >>> 0);
}

export interface Ponto {
  x: number;
  y: number;
}

/** Seeds spread over the opaque pixels (dart throwing with a minimum distance): the even shatter. */
export function sementesEspalhadas(img: Bitmap, n: number, distMin: number, rnd: () => number): Ponto[] {
  const cheios: number[] = [];
  img.cor.forEach((c, i) => c >>> 24 >= 128 && cheios.push(i));
  const s: Ponto[] = [];
  for (let tent = 0; tent < n * 60 && s.length < n && cheios.length; tent++) {
    const i = cheios[Math.floor(rnd() * cheios.length)];
    const p = { x: (i % img.w) + 0.5, y: Math.floor(i / img.w) + 0.5 };
    if (s.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= distMin)) s.push(p);
  }
  return s;
}

/**
 * Seeds for the BREAK-UP: three along the ship's long axis (tail, middle, nose, each at the column's mean height) and
 * one in the wing farthest from that axis. Four big pieces that read as parts of a ship, not as gravel.
 */
export function sementesNoEixo(img: Bitmap, rnd: () => number): Ponto[] {
  let x0 = img.w, x1 = -1;
  const somaY = new Float32Array(img.w), conta = new Float32Array(img.w);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.cor[y * img.w + x] >>> 24 < 128) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      somaY[x] += y;
      conta[x]++;
    }
  }
  if (x1 < 0) return [];
  const yMedio = (x: number): number => {
    for (let d = 0; d < img.w; d++) {
      for (const xx of [x - d, x + d]) if (xx >= 0 && xx < img.w && conta[xx]) return somaY[xx] / conta[xx] + 0.5;
    }
    return img.h / 2;
  };
  const s: Ponto[] = [0.18, 0.5, 0.8].map((k) => {
    const x = Math.round(x0 + (x1 - x0) * (k + (rnd() - 0.5) * 0.08));
    return { x: x + 0.5, y: yMedio(x) };
  });
  // The wing: the opaque pixel farthest from the axis (above or below), in the back two thirds.
  let melhor: Ponto | null = null, dMax = 0;
  for (let y = 0; y < img.h; y++) {
    for (let x = x0; x <= x0 + (x1 - x0) * 0.66; x++) {
      if (img.cor[y * img.w + x] >>> 24 < 128) continue;
      const d = Math.abs(y + 0.5 - yMedio(x));
      if (d > dMax) {
        dMax = d;
        melhor = { x: x + 0.5, y: y + 0.5 };
      }
    }
  }
  if (melhor && dMax >= 5) {
    // halfway between the axis and the tip: the cut crosses the wing's root, not its tip
    const ya = yMedio(Math.floor(melhor.x));
    s.push({ x: melhor.x, y: ya + (melhor.y - ya) * 0.7 });
  }
  return s;
}

/** Each opaque pixel goes to its nearest seed, the distance bent by the noise: the cut is never a straight line. -1 = empty. */
export function rotular(img: Bitmap, sementes: Ponto[], torto: (x: number, y: number) => number, amp: number): Int32Array {
  const rot = new Int32Array(img.w * img.h).fill(-1);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      const i = y * img.w + x;
      if (img.cor[i] >>> 24 < 128) continue;
      let melhor = -1, dMin = Infinity;
      sementes.forEach((s, k) => {
        // each seed bends the field its own way (the noise sampled with an offset per seed)
        const d = Math.hypot(x + 0.5 - s.x, y + 0.5 - s.y) + torto(x + k * 17, y + k * 11) * amp;
        if (d < dMin) {
          dMin = d;
          melhor = k;
        }
      });
      rot[i] = melhor;
    }
  }
  return rot;
}

/** Splits the labels into 4-connected components: a cell cut by a gap (between two wings) becomes two pieces. */
export function componentes(rot: Int32Array, w: number, h: number): { rot: Int32Array; n: number } {
  const novo = new Int32Array(rot.length).fill(-1);
  let n = 0;
  const pilha: number[] = [];
  for (let i = 0; i < rot.length; i++) {
    if (rot[i] < 0 || novo[i] >= 0) continue;
    novo[i] = n;
    pilha.push(i);
    while (pilha.length) {
      const j = pilha.pop()!;
      const x = j % w, y = (j - x) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const k = yy * w + xx;
        if (rot[k] === rot[i] && novo[k] < 0) {
          novo[k] = n;
          pilha.push(k);
        }
      }
    }
    n++;
  }
  return { rot: novo, n };
}

/** One piece: its own pixels in its bounding box, where it sits in the ship, and where the cut runs through it. */
export interface Pedaco {
  bmp: Bitmap;
  /** the box's corner in the ship's frame */
  x0: number;
  y0: number;
  /** the centroid in the ship's frame (pixel centres) */
  cx: number;
  cy: number;
  n: number;
  /** per box pixel: 2 = on the cut (touches another piece), 1 = one pixel in, 0 = inside or the ship's own outline */
  corte: Uint8Array;
}

export function extrair(img: Bitmap, rot: Int32Array, n: number): Pedaco[] {
  const caixas = Array.from({ length: n }, () => ({ x0: Infinity, y0: Infinity, x1: -1, y1: -1, sx: 0, sy: 0, n: 0 }));
  for (let i = 0; i < rot.length; i++) {
    const k = rot[i];
    if (k < 0) continue;
    const x = i % img.w, y = (i - x) / img.w, c = caixas[k];
    c.x0 = Math.min(c.x0, x);
    c.y0 = Math.min(c.y0, y);
    c.x1 = Math.max(c.x1, x);
    c.y1 = Math.max(c.y1, y);
    c.sx += x + 0.5;
    c.sy += y + 0.5;
    c.n++;
  }
  return caixas.map((c, k) => {
    const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1;
    const bmp: Bitmap = { w, h, cor: new Uint32Array(w * h) };
    const corte = new Uint8Array(w * h);
    for (let y = c.y0; y <= c.y1; y++) {
      for (let x = c.x0; x <= c.x1; x++) {
        const i = y * img.w + x;
        if (rot[i] !== k) continue;
        const j = (y - c.y0) * w + (x - c.x0);
        bmp.cor[j] = img.cor[i];
        // On the cut: a 4-neighbour that is ship but another piece. One pixel in: an 8-neighbour on the cut.
        let toca = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= img.w || yy >= img.h) continue;
          const r = rot[yy * img.w + xx];
          if (r >= 0 && r !== k) toca = true;
        }
        if (toca) corte[j] = 2;
      }
    }
    for (let j = 0; j < w * h; j++) {
      if (!bmp.cor[j] || corte[j]) continue;
      const x = j % w, y = (j - x) / w;
      for (let dy = -1; dy <= 1 && !corte[j]; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && corte[yy * w + xx] === 2) {
            corte[j] = 1;
            break;
          }
        }
      }
    }
    return { bmp, x0: c.x0, y0: c.y0, cx: c.sx / c.n, cy: c.sy / c.n, n: c.n, corte };
  });
}

/** The whole cut, in one call: seeds → bent labels → connected pieces. */
export function partir(img: Bitmap, sementes: Ponto[], torto: (x: number, y: number) => number, amp: number): Pedaco[] {
  const { rot, n } = componentes(rotular(img, sementes, torto, amp), img.w, img.h);
  return extrair(img, rot, n);
}

/**
 * THE HULL LOSS (a life lost, not the last): one bite off the hull's EDGE, of exactly `alvo` pixels — the same loss on
 * every hit, wherever it lands (a radius bit 6 px off a wing tip and 39 off a flank). Its centre is an outline pixel (a
 * 4-neighbour is empty) in the band `faixa` of the hull's width (0 = tail, 1 = nose); the bite grows from it, the nearest
 * hull first by a bent distance (so it is ragged, not a disc), always in one piece. `mascara` per pixel: 2 = in the
 * bite, 1 = the rim (hull that touches the bite), 0 = the rest. null when the band has no edge.
 */
export function lasca(
  img: Bitmap,
  faixa: [number, number],
  alvo: number,
  torto: (x: number, y: number) => number,
  amp: number,
  rnd: () => number,
): { mascara: Uint8Array; centro: Ponto; n: number } | null {
  const cheio = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < img.w && y < img.h && img.cor[y * img.w + x] >>> 24 >= 128;
  let x0 = img.w, x1 = -1;
  for (let i = 0; i < img.cor.length; i++) {
    if (img.cor[i] >>> 24 < 128) continue;
    x0 = Math.min(x0, i % img.w);
    x1 = Math.max(x1, i % img.w);
  }
  if (x1 < 0) return null;
  const lo = x0 + (x1 - x0) * faixa[0], hi = x0 + (x1 - x0) * faixa[1];
  const borda: number[] = [];
  for (let y = 0; y < img.h; y++) {
    for (let x = Math.ceil(lo); x <= hi; x++) {
      if (cheio(x, y) && (!cheio(x + 1, y) || !cheio(x - 1, y) || !cheio(x, y + 1) || !cheio(x, y - 1))) borda.push(y * img.w + x);
    }
  }
  if (!borda.length) return null;
  const k0 = borda[Math.floor(rnd() * borda.length)];
  const centro = { x: (k0 % img.w) + 0.5, y: Math.floor(k0 / img.w) + 0.5 };
  // grow from the centre through 4-neighbours, the nearest (bent) first: one piece, never across a gap
  const chave = (i: number): number => {
    const x = i % img.w, y = (i - x) / img.w;
    return Math.hypot(x + 0.5 - centro.x, y + 0.5 - centro.y) + torto(x, y) * amp;
  };
  const mascara = new Uint8Array(img.w * img.h);
  const visto = new Uint8Array(img.w * img.h);
  const fronteira = [k0];
  visto[k0] = 1;
  let n = 0;
  while (n < alvo && fronteira.length) {
    let m = 0;
    for (let q = 1; q < fronteira.length; q++) if (chave(fronteira[q]) < chave(fronteira[m])) m = q;
    const i = fronteira.splice(m, 1)[0];
    mascara[i] = 2;
    n++;
    const x = i % img.w, y = (i - x) / img.w;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const xx = x + dx, yy = y + dy;
      if (!cheio(xx, yy) || visto[yy * img.w + xx]) continue;
      visto[yy * img.w + xx] = 1;
      fronteira.push(yy * img.w + xx);
    }
  }
  for (let i = 0; i < mascara.length; i++) {
    if (mascara[i] || img.cor[i] >>> 24 < 128) continue;
    const x = i % img.w, y = (i - x) / img.w;
    const toca = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const xx = x + dx, yy = y + dy;
      return xx >= 0 && yy >= 0 && xx < img.w && yy < img.h && mascara[yy * img.w + xx] === 2;
    });
    if (toca) mascara[i] = 1;
  }
  return { mascara, centro, n };
}

/**
 * The bite as flying pieces: cut in `sementes` parts, with the CUT on every side that left the hull too (where it tore
 * off) — that is the edge that glows. Only the bite's pieces come back; the rest of the hull stays on the ship.
 */
export function soltarLasca(
  img: Bitmap,
  mascara: Uint8Array,
  sementes: Ponto[],
  torto: (x: number, y: number) => number,
  amp: number,
): Pedaco[] {
  const soBite: Bitmap = { w: img.w, h: img.h, cor: img.cor.map((c, i) => (mascara[i] === 2 ? c : 0)) };
  const partes = rotular(soBite, sementes, torto, amp);
  // the rest of the hull is one more label: the pieces' cut then also marks where they touched it
  const resto = sementes.length;
  const rot = new Int32Array(img.w * img.h).fill(-1);
  for (let i = 0; i < rot.length; i++) {
    if (img.cor[i] >>> 24 < 128) continue;
    rot[i] = mascara[i] === 2 ? partes[i] : resto;
  }
  const c = componentes(rot, img.w, img.h);
  return extrair(img, c.rot, c.n).filter((p) => {
    // a piece of the bite (any of its pixels is in the mask)
    for (let k = 0; k < p.bmp.cor.length; k++) {
      if (!p.bmp.cor[k]) continue;
      const x = p.x0 + (k % p.bmp.w), y = p.y0 + Math.floor(k / p.bmp.w);
      return mascara[y * img.w + x] === 2;
    }
    return false;
  });
}

/**
 * When each pixel burns, for the DISINTEGRATION: the burning front leaves `origem` and crosses the hull in `duracao`
 * seconds, bent by the noise (the front is ragged, not a circle). Empty pixels get Infinity.
 */
export function temposDeQueima(
  img: Bitmap,
  origem: Ponto,
  duracao: number,
  torto: (x: number, y: number) => number,
  amp: number,
): Float32Array {
  const t = new Float32Array(img.w * img.h).fill(Infinity);
  let dMax = 0;
  const d = new Float32Array(img.w * img.h);
  for (let i = 0; i < t.length; i++) {
    if (img.cor[i] >>> 24 < 128) continue;
    const x = i % img.w, y = (i - x) / img.w;
    d[i] = Math.max(0, Math.hypot(x + 0.5 - origem.x, y + 0.5 - origem.y) + torto(x, y) * amp);
    dMax = Math.max(dMax, d[i]);
  }
  for (let i = 0; i < t.length; i++) if (img.cor[i] >>> 24 >= 128) t[i] = (d[i] / Math.max(1, dMax)) * duracao;
  return t;
}

/**
 * THE HEAT RAMPS, from white-hot (h = 1) down to a dead ember (h = 0). The fire is the PixelLab explosion's own palette
 * (sampled from `explosion-sheet.png`), so the pieces burn in the same colours as the fireball they fly out of. The
 * manta does not burn: it goes out in its own bioluminescence (sampled from the spots of `alien-t2-anim-*`).
 */
export const RAMPA_FOGO = ['fcfcfc', 'fce48c', 'f4ac54', 'ec742c', 'd4441c', 'bc3414', '8c2414', '641c14', '4c140c', '3c241c'].reverse().map(hex);
export const RAMPA_BIO = ['f0fffb', 'a6f4dc', '74dcbc', '5cccac', '3c9c88', '2c6c64', '1c4444', '0c2424', '040c0c'].reverse().map(hex);

/** The ramp's colour at heat `h`, in STEPS (the nearest stop below): pixel art changes colour, it does not fade between colours. */
export function corDaRampa(rampa: number[], h: number): number {
  const k = Math.max(0, Math.min(rampa.length - 1, Math.floor(h * rampa.length)));
  return rampa[k];
}

/** A colour darkened in steps (the charred hull): `k` 0 = as it is, 1 = almost black. Stepped to 3 levels. */
export function queimar(c: number, k: number): number {
  const passo = k < 0.25 ? 1 : k < 0.6 ? 0.72 : 0.5;
  if (passo === 1) return c;
  const [r, g, b, a] = canais(c);
  // charring pulls towards the ember's dark red-brown, not towards grey
  return rgba(Math.round(r * passo + 18 * (1 - passo)), Math.round(g * passo * 0.92), Math.round(b * passo * 0.85), a);
}

/** The 4×4 Bayer matrix (0..15)/16: the pixel-art fade — a piece goes away pixel by pixel, never by alpha. */
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x: number, y: number): number => BAYER[(y & 3) * 4 + (x & 3)];
