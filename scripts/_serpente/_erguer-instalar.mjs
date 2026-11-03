// 29/10 — THE RISE INSTALLED (S1b, spec `2026-10-29-serpente-luta-s1b-design.md` §5; his pick on the concept sheet: the
// ERGUER — the heads rise on their necks, spread and open their jaws). For each head form (A three heads, B two, C one),
// from its 17 PixMiniMax frames (256², the approved frame 0 at (18, 256 − h)):
//   - `public/sprites/serpente-erguer-<F>-<i>.png`: the frames as they are (the art keeps its place in the canvas; the
//     game sets the sprite's origin on the art's centre while the gesture plays);
//   - every living head's SKULL and MOUTH per frame (measured by eye on the grid in the start and the held pose, and
//     carried between them by the clip's rhythm — see `FORMAS`), so the hit circle, the veins and the spit follow;
//   - `serpente-veias-erguer-<F>-<i>.png`: the live head's accent hue within `RAIO` art px of it (ADD in the game) and
//     `serpente-sombra-erguer-<F>-<i>.png`: the other living heads' accent hue above THE CUT (`CORTE`), 55% darker —
//     the coils never show (his cut), so what is below it does not matter;
//   - `public/sprites/serpente-rombo-inteiro.png`: the breach's strip WITHOUT the breach (the arrival: the hull stops
//     whole and bursts open) — the three prow pieces as `_rombo-base.mjs` lays them;
//   - `src/entities/gestoSerpente.ts`: the per-frame head offsets (art px from the art's centre) and the canvas origin;
//   - a check sheet: every frame, the art dimmed, the veins in colour, the shadow grey, the tracked head ringed.
//   node scripts/_serpente/_erguer-instalar.mjs <cru-dir with erguer-A, erguer-B, erguer-C> <check.png>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [CRU, CHECK] = process.argv.slice(2);
const LADO = 256, ESQ = 18, N = 17, RAIO = 40, CORTE = 20;
/** the art's height per form (its frame 0) and the live head's measured offset (`BossSerpente.FASES`) */
// THE HEADS, MEASURED BY EYE ON THE GRID (29/10). Block matching followed the NECK, not the head (the head changes
// shape as the jaws open; the neck under it does not), so the heads are read on the 3× grid in the start pose (frame 0)
// and in the held pose, art px from the art's centre; `ritmo` is how far into the held pose each frame is, read off
// the clip's per-frame change (`_elites/_continuidade.mjs`). ⚠️ The S1's `FASES.cabeca` (find-cabecas, July: the
// centroid of the head's COLOUR) sat on the NECK, ~25–35 art px below the skull of the cyan and the green — the hit
// circle did not touch the drawn head. The skull is the hit; the MOUTH is where the spit leaves (him, 29/10: *"Cada
// cabeça atira de uma cor"*, and the triple rain spits from every living mouth).
const FORMAS = {
  A: {
    arq: 'serpente-anim-0', viva: 'ciano', outras: ['verde', 'laranja'],
    cabecas: { ciano: [[-84, -78], [-95, -83]], verde: [[1, -91], [-12, -113]], laranja: [[66, -66], [85, -76]] },
    bocas: { ciano: [[-97, -58], [-112, -46]], verde: [[-20, -73], [-25, -90]], laranja: [[35, -53], [70, -53]] },
    ritmo: [0, 0, 0.7, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.4, 0.05, 0],
  },
  B: {
    arq: 'serpente-2c-anim-0', viva: 'verde', outras: ['laranja'],
    cabecas: { verde: [[1, -91.5], [2, -114.5]], laranja: [[66, -67.5], [78, -94.5]] },
    bocas: { verde: [[-19, -72.5], [-22, -87.5]], laranja: [[40, -51.5], [58, -71.5]] },
    ritmo: [0, 0.35, 0.75, 0.95, 1, 1, 1, 1, 1, 0.85, 0.6, 0.35, 0.12, 0, 0, 0, 0],
  },
  C: {
    arq: 'serpente-1c-anim-0', viva: 'laranja', outras: [],
    cabecas: { laranja: [[63, -64.5], [-8, -101.5]] },
    bocas: { laranja: [[38, -46.5], [-15, -88.5]] },
    ritmo: [0, 0.05, 0.2, 0.45, 0.8, 0.95, 1, 1, 1, 1, 1, 0.8, 0.55, 0.35, 0.15, 0.05, 0],
  },
};
const MATIZ = {
  ciano: { h: [168, 206], s: 0.35, v: 0.45 },
  verde: { h: [88, 166], s: 0.3, v: 0.4 },
  laranja: { h: [8, 50], s: 0.45, v: 0.4, quente: { s: 0.1, v: 0.82 } },
};
const hsv = (r, g, b) => {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx / 255];
};
const doMatiz = (r, g, b, m) => {
  const [h, s, v] = hsv(r, g, b);
  return h >= m.h[0] && h <= m.h[1] && ((s >= m.s && v >= m.v) || (m.quente && s >= m.quente.s && v >= m.quente.v));
};
const ler = async (arq) => (await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;

const gesto = {};
const paineis = [];
for (const [F, cfg] of Object.entries(FORMAS)) {
  const h = (await sharp(`public/sprites/${cfg.arq}.png`).metadata()).height;
  const topo = LADO - h;
  const centro = { x: ESQ + 119, y: topo + h / 2 };
  const quadros = [];
  for (let i = 0; i < N; i++) quadros.push(await ler(path.join(CRU, `erguer-${F}`, `${i}.png`)));
  // every living head and mouth, frame by frame: the start pose → the held pose by the clip's rhythm
  const quadroDe = (par, i) => {
    const [[x0, y0], [x1, y1]] = par, k = cfg.ritmo[i];
    return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
  };
  const trilhas = {}, bocas = {};
  for (const [nome, par] of Object.entries(cfg.cabecas)) trilhas[nome] = Array.from({ length: N }, (_, i) => quadroDe(par, i).map((v, q) => v + (q ? centro.y : centro.x)));
  for (const [nome, par] of Object.entries(cfg.bocas)) bocas[nome] = Array.from({ length: N }, (_, i) => quadroDe(par, i).map((v, q) => v + (q ? centro.y : centro.x)));
  const cab = trilhas[cfg.viva];
  const rel = (t) => t.map(([x, y]) => ({ x: +(x - centro.x).toFixed(1), y: +(y - centro.y).toFixed(1) }));
  gesto[F] = {
    origem: { x: +(centro.x / LADO).toFixed(4), y: +(centro.y / LADO).toFixed(4) },
    cabeca: rel(cab),
    cabecas: Object.fromEntries(Object.entries(trilhas).map(([nome, t]) => [nome, rel(t)])),
    bocas: Object.fromEntries(Object.entries(bocas).map(([nome, t]) => [nome, rel(t)])),
    inicio: { cabecas: cfg.cabecas, bocas: cfg.bocas },
  };
  const corteY = centro.y + CORTE;
  for (let i = 0; i < N; i++) {
    const d = quadros[i];
    fs.copyFileSync(path.join(CRU, `erguer-${F}`, `${i}.png`), `public/sprites/serpente-erguer-${F}-${i}.png`);
    const veias = Buffer.alloc(d.length), sombra = Buffer.alloc(d.length);
    const [hx, hy] = cab[i];
    for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) {
      const k = (y * LADO + x) * 4;
      if (d[k + 3] < 128 || y > corteY) continue;
      const [r, g, b] = [d[k], d[k + 1], d[k + 2]];
      if (Math.hypot(x - hx, y - hy) <= RAIO && doMatiz(r, g, b, MATIZ[cfg.viva])) {
        veias[k] = r; veias[k + 1] = g; veias[k + 2] = b; veias[k + 3] = 255;
        continue;
      }
      if (Math.hypot(x - hx, y - hy) > RAIO * 0.6 && cfg.outras.some((o) => doMatiz(r, g, b, MATIZ[o]))) {
        sombra[k] = Math.round(r * 0.45); sombra[k + 1] = Math.round(g * 0.45); sombra[k + 2] = Math.round(b * 0.45); sombra[k + 3] = 255;
      }
    }
    await sharp(veias, { raw: { width: LADO, height: LADO, channels: 4 } }).png().toFile(`public/sprites/serpente-veias-erguer-${F}-${i}.png`);
    if (cfg.outras.length) await sharp(sombra, { raw: { width: LADO, height: LADO, channels: 4 } }).png().toFile(`public/sprites/serpente-sombra-erguer-${F}-${i}.png`);
    // the check panel: the art dimmed, veins in colour, shadow grey, the head ringed, the cut line
    const pin = Buffer.alloc(LADO * LADO * 3);
    for (let q = 0; q < LADO * LADO; q++) {
      const k = q * 4, y = Math.floor(q / LADO), x = q % LADO;
      let c = d[k + 3] >= 128 ? [d[k] * 0.35, d[k + 1] * 0.35, d[k + 2] * 0.35] : [11, 13, 20];
      if (veias[k + 3]) c = [veias[k], veias[k + 1], veias[k + 2]];
      else if (sombra[k + 3]) c = [120, 120, 120];
      for (const [nome, t] of Object.entries(trilhas)) {
        const r = Math.hypot(x - t[i][0], y - t[i][1]);
        // (the hit circle's size: 30 art px)
        if (Math.abs(r - (nome === cfg.viva ? 30 : 9)) < 0.7) c = nome === cfg.viva ? [255, 255, 255] : [255, 200, 60];
      }
      for (const t of Object.values(bocas)) if (Math.hypot(x - t[i][0], y - t[i][1]) < 2.5) c = [255, 60, 220];
      if (y === Math.round(corteY) && x % 3 === 0) c = [255, 60, 60];
      pin[q * 3] = c[0]; pin[q * 3 + 1] = c[1]; pin[q * 3 + 2] = c[2];
    }
    paineis.push(await sharp(pin, { raw: { width: LADO, height: LADO, channels: 3 } }).png().toBuffer());
  }
}

// the breach's strip, whole (the three prow pieces, 102 px apart, 34 px of sky above)
await sharp({ create: { width: 318, height: 100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(['casco-duto2', 'casco-duto', 'casco-placa'].map((p, i) => ({ input: `public/sprites/${p}.png`, left: i * 102, top: 34 })))
  .png().toFile('public/sprites/serpente-rombo-inteiro.png');

const ts = `/**
 * THE RISE (29/10, S1b — generated by \`scripts/_serpente/_erguer-instalar.mjs\`, do not edit by hand). The ERGUER gesture
 * of each head form (PixMiniMax, his pick): 17 frames of 256², the art where the approved frame 0 sits in the canvas
 * (\`origem\`, the art's centre as a fraction of the canvas — the sprite's origin while the gesture plays, so the art
 * does not jump), and the LIVE HEAD tracked frame by frame (\`cabeca\`, art px from the art's centre, like
 * \`BossSerpente.FASES\`): the hit circle and the veins follow it as it rises.
 */
export interface Gesto {
  origem: { x: number; y: number };
  cabeca: { x: number; y: number }[];
  /** every living head's skull and MOUTH per frame (the triple rain spits from each mouth), the same way */
  cabecas: Partial<Record<Cor, { x: number; y: number }[]>>;
  bocas: Partial<Record<Cor, { x: number; y: number }[]>>;
  /** the start pose (the idle's frame 0) and the held pose, as measured: [[x0, y0], [x1, y1]] per head */
  inicio: { cabecas: Partial<Record<Cor, number[][]>>; bocas: Partial<Record<Cor, number[][]>> };
}

/** the three heads by their colour: the cyan (its shot is BLUE), the green, the amber */
export type Cor = 'ciano' | 'verde' | 'laranja';

export const ERGUER: Record<'A' | 'B' | 'C', Gesto> = ${JSON.stringify(gesto, null, 2).replace(/"(\w+)":/g, '$1:')};
`;
fs.writeFileSync('src/entities/gestoSerpente.ts', ts);

const comp = paineis.map((buf, n) => ({ input: buf, left: (n % N) * 258, top: Math.floor(n / N) * 258 }));
await sharp({ create: { width: N * 258, height: 3 * 258, channels: 3, background: '#05060a' } }).composite(comp).png().toFile(CHECK);
console.log(JSON.stringify(Object.fromEntries(Object.entries(gesto).map(([F, g]) => [F, g.cabeca.map((c) => `${c.x},${c.y}`).join(' ')]))));
