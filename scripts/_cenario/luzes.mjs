// The lights of a painted scene — the menu rules (BLOCO E, 19/10), moved here unchanged from scripts/_menu/_camadas.mjs
// so the F1 horizon (BLOCO G) uses the very same ones. `cidade` is the FRONT layer at density K (RGBA; alpha 255 =
// opaque painting, anything else is the sky window and is skipped). Boxes come out in game px (÷K).
export const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/** 1 = warm window light, 2 = red beacon. */
export function detectarLuzes(cidade, W, H, K) {
  const tipo = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (cidade[i + 3] < 255) continue;
    const r = cidade[i], g = cidade[i + 1], b = cidade[i + 2];
    // A beacon is PURE red (19/10: the old test, g < 0.5 r, also took saturated orange facades — big groups that then
    // blinked as dark squares over the city).
    if (r >= 130 && g < r * 0.36 && b < r * 0.4) tipo[y * W + x] = 2;
    else if (r >= 105 && r > b + 45 && r > g * 1.12) tipo[y * W + x] = 1;
  }
  // 19/10, he: the off lights left holes. Off now means the SURFACE without its light (see `marcarMuda` and
  // `apagarPorDifusao`). The white-hot core of a lamp misses the warm test (its blue is high too): a warm-white pixel
  // next to a light is one.
  for (let pass = 0; pass < 2; pass++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const s = y * W + x, i = s * 4;
    if (tipo[s] || cidade[i + 3] < 255) continue;
    const r = cidade[i], g = cidade[i + 1], b = cidade[i + 2];
    if (lum(r, g, b) < 150 || r < b) continue;
    const t = tipo[s - 1] || tipo[s + 1] || tipo[s - W] || tipo[s + W];
    if (t) tipo[s] = t;
  }
  // A beacon stands alone against the dark: a red point touching a warm light (within 2K px) is a red-tinted bit of a
  // lit window or door, and it goes with that light (19/10, he: a 2-pixel "beacon" inside a lit doorway took the whole
  // building with it when it went off — a grey blot with a white dot).
  {
    // "Warm light" here is AMBER (g ≥ 0.42 r): a beacon's own red glow also passes the warm test. And the test is being
    // SURROUNDED by it (a quarter of the box within K px): the first version, any amber within 2K px, also took the
    // real beacons on tower tops with lit windows just below — they stopped blinking (19/10, he).
    const vermelhos = [];
    const ambar = (q) => tipo[q] === 1 && cidade[q * 4 + 1] >= 0.42 * cidade[q * 4];
    for (let s = 0; s < W * H; s++) if (tipo[s] === 2) vermelhos.push(s);
    for (const s of vermelhos) {
      const x = s % W, y = (s / W) | 0;
      let n = 0, total = 0;
      for (let dy = -K; dy <= K; dy++) for (let dx = -K; dx <= K; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        total++;
        if (ambar(ny * W + nx)) n++;
      }
      if (n >= total / 4) tipo[s] = 1;
    }
    // And the red dots INSIDE a lit area (the citadel's lava stairs): measured on the ring 2K–3K px around each, the real
    // beacons have ≤ 4% warm-lit pixels (lum > 55, r > b + 20), the lava dots 7–20%. They stay as fixed lights of the
    // stairs (off, they left dark smudges on the glow).
    for (const s of vermelhos) {
      if (tipo[s] !== 2) continue;
      const x = s % W, y = (s / W) | 0;
      let aceso = 0, total = 0;
      for (let dy = -3 * K; dy <= 3 * K; dy++) for (let dx = -3 * K; dx <= 3 * K; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 2 * K) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = (ny * W + nx) * 4;
        if (cidade[j + 3] < 255) continue;
        total++;
        if (lum(cidade[j], cidade[j + 1], cidade[j + 2]) > 55 && cidade[j] > cidade[j + 2] + 20) aceso++;
      }
      if (total && aceso / total > 0.055) tipo[s] = 0;
    }
    // A tower's other lights: a red-orange point (r ≥ 120, g < 0.5 r, b < 0.45 r) on the same tower as a beacon (≤ 3 px
    // across, ≤ 14 px up or down, game px), and standing against the dark like it, is one of its lights — it blinks
    // with it (19/10, he: two lights on one tower out of step read wrong; this one was orange enough to be a "window").
    const farolPx = [];
    for (let s = 0; s < W * H; s++) if (tipo[s] === 2) farolPx.push([s % W, (s / W) | 0]);
    const escuroEmVolta = (x, y) => {
      let aceso = 0, total = 0;
      for (let dy = -3 * K; dy <= 3 * K; dy++) for (let dx = -3 * K; dx <= 3 * K; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 2 * K) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = (ny * W + nx) * 4;
        if (cidade[j + 3] < 255) continue;
        total++;
        if (lum(cidade[j], cidade[j + 1], cidade[j + 2]) > 55 && cidade[j] > cidade[j + 2] + 20) aceso++;
      }
      return total > 0 && aceso / total <= 0.055;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const s = y * W + x, i = s * 4;
      if (tipo[s] === 2 || cidade[i + 3] < 255) continue;
      const r = cidade[i], g = cidade[i + 1], b = cidade[i + 2];
      if (!(r >= 120 && g < 0.5 * r && b < 0.45 * r)) continue;
      if (!farolPx.some(([fx, fy]) => Math.abs(fx - x) <= 3 * K && Math.abs(fy - y) <= 14 * K)) continue;
      // Not a lamp in a lit ROW (a bridge deck): a tower light has the dark at its sides (one deck lamp under a beacon
      // came in, and going off it cut a gap in the deck's line of light).
      const acesoEm = (xx) => {
        if (xx < 0 || xx >= W) return false;
        const j = (y * W + xx) * 4;
        return lum(cidade[j], cidade[j + 1], cidade[j + 2]) > 45 && cidade[j] > cidade[j + 2] + 15;
      };
      if ([2 * K, 3 * K].some((d) => acesoEm(x - d) || acesoEm(x + d))) continue;
      if (escuroEmVolta(x, y)) tipo[s] = 2;
    }
  }
  return tipo;
}

/** 1 = a light pixel; 2 = its warm fringe (F = K px) or a beacon's RED halo (3K px). */
export function marcarMuda(cidade, W, H, K, tipo) {
  const F = K;
  const quenteP = (i) => cidade[i] > cidade[i + 2] + 8;
  const muda = new Uint8Array(W * H); // 1 = a light pixel, 2 = its warm fringe
  for (let s = 0; s < W * H; s++) if (tipo[s]) muda[s] = 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = y * W + x;
    if (muda[s] || cidade[s * 4 + 3] < 255 || !quenteP(s * 4)) continue;
    let viz = false;
    for (let dy = -F; dy <= F && !viz; dy++) for (let dx = -F; dx <= F; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && tipo[ny * W + nx]) { viz = true; break; }
    }
    if (viz) muda[s] = 2;
  }
  // A beacon's red glow reaches farther than a window's: when it goes off, its RED halo (within 3K px) goes too — red,
  // not amber (r > 1.5 g: the old test, r > g + 6, also took the amber-lit walls around).
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = y * W + x, i = s * 4;
    if (muda[s] || cidade[i + 3] < 255 || !(cidade[i] > cidade[i + 1] * 1.5 && cidade[i] > cidade[i + 2] * 1.3)) continue;
    let viz = false;
    for (let dy = -3 * K; dy <= 3 * K && !viz; dy++) for (let dx = -3 * K; dx <= 3 * K; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && tipo[ny * W + nx] === 2) { viz = true; break; }
    }
    if (viz) muda[s] = 2;
  }
  return muda;
}

/**
 * The light LIFTED out of the painting: the changed pixels are filled from their unchanged surroundings by diffusion
 * (each one the mean of its neighbours, swept until it settles) — the sky behind a beacon, the wall behind a window.
 * (Two first tries failed: the median of the neighbours took the cloud behind a deck, a grey blot; the darker third
 * took the mast under a beacon, a dark disc on the sky.) Transparent everywhere else.
 */
export function apagarPorDifusao(cidade, W, H, muda) {
  const apagadas = Buffer.alloc(W * H * 4); // transparent but for what changes
  const alvo = [];
  for (let s = 0; s < W * H; s++) if (muda[s] && cidade[s * 4 + 3] === 255) alvo.push(s);
  const val = new Float32Array(W * H * 3);
  for (let s = 0; s < W * H; s++) for (let c = 0; c < 3; c++) val[s * 3 + c] = cidade[s * 4 + c];
  const vale = (q) => cidade[q * 4 + 3] === 255; // the transparent window of sky does not feed the fill
  for (const s of alvo) for (let c = 0; c < 3; c++) val[s * 3 + c] = 0;
  for (let volta = 0; volta < 160; volta++) {
    const ida = volta % 2 === 0;
    for (let n = 0; n < alvo.length; n++) {
      const s = alvo[ida ? n : alvo.length - 1 - n], x = s % W, y = (s / W) | 0;
      let r = 0, g = 0, b = 0, peso = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (!vale(q)) continue;
        // Settled neighbours weigh more than the ones still being filled (a faster, steadier sweep).
        const p = muda[q] ? 0.5 : 1;
        r += val[q * 3] * p; g += val[q * 3 + 1] * p; b += val[q * 3 + 2] * p; peso += p;
      }
      if (peso) { val[s * 3] = r / peso; val[s * 3 + 1] = g / peso; val[s * 3 + 2] = b / peso; }
    }
  }
  for (const s of alvo) {
    const i = s * 4;
    [apagadas[i], apagadas[i + 1], apagadas[i + 2], apagadas[i + 3]] = [val[s * 3], val[s * 3 + 1], val[s * 3 + 2], 255].map(Math.round);
  }
  return apagadas;
}

/** Clusters (8-connected) of the same type: boxes and area in GAME px (÷K, so every density flickers the SAME lights). */
export function gruposDeLuz(tipo, W, H, K) {
  const grupos = [];
  const visto = new Uint8Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (!tipo[s] || visto[s]) continue;
    const t = tipo[s], fila = [s]; visto[s] = 1;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
    while (fila.length) {
      const c = fila.pop(); n++;
      const cx = c % W, cy = (c / W) | 0;
      x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (tipo[q] === t && !visto[q]) { visto[q] = 1; fila.push(q); }
      }
    }
    grupos.push({ tipo: t === 2 ? 'farol' : 'janela', x: x0 / K, y: y0 / K, w: (x1 - x0 + 1) / K, h: (y1 - y0 + 1) / K, n: n / (K * K) });
  }
  return grupos;
}
