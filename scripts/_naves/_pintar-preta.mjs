// 23/10 — THE BLACK PAINT on today's animated ships. Of round 1c he kept one thing: "a pintura preta na nave humana
// que temos ficou ótima" — family A, today's ships repainted graphite by PixelLab. But A exists only as STILLS; the
// game needs every thrust frame (8 + the 8 blue ones). So, per frame:
//   - where today's frame equals today's still, the pixel is A's own (its exact plates, edges and amber windows);
//   - where the frame moves (flame, blinking lights, bob), today's colour goes through a table LEARNED from the three
//     still pairs (today → A, same position: the most frequent A colour);
//   - colours the table never saw (the blue flame, hot glows) stay as they are.
// A's pixels outside today's silhouette (the spire on A's T2) are dropped, so the black ship has today's size and
// only the paint changes.
//   node scripts/_naves/_pintar-preta.mjs <outDir> <todayStill.png> <aStill.png> [<frame.png> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [OUT, HOJE, A, ...QUADROS] = process.argv.slice(2);
const R1C = 'docs/superpowers/folhas/2026-10-22/naves/rodada1c';
const PARES = [
  ['public/sprites/naves/humana-t0.png', `${R1C}/a-t0.png`],
  ['public/sprites/ship-jato.png', `${R1C}/a-t1.png`],
  ['public/sprites/naves/humana-t2.png', `${R1C}/a-t2.png`],
];

const ler = async (f) => {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 40) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const px = (x, y) => (x < 0 || y < 0 || x >= info.width || y >= info.height || data[(y * info.width + x) * 4 + 3] <= 40
    ? null : [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 3)]);
  return { w: info.width, h: info.height, x0, y0, x1, y1, px };
};
const chave = (c) => c.join(',');
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Best offset of A onto today's still (most of today's opaque pixels landing on A's opaque ones).
const alinhar = (H, Aimg) => {
  let best = null;
  for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
    let ok = 0;
    for (let y = H.y0; y <= H.y1; y++) for (let x = H.x0; x <= H.x1; x++) {
      if (H.px(x, y) && Aimg.px(x - H.x0 + Aimg.x0 + dx, y - H.y0 + Aimg.y0 + dy)) ok++;
    }
    if (!best || ok > best.ok) best = { ok, ox: Aimg.x0 + dx - H.x0, oy: Aimg.y0 + dy - H.y0 };
  }
  return best;
};

// The learned table: today colour → the most frequent A colour at the same pixel.
const votos = new Map();
for (const [h, a] of PARES) {
  const H = await ler(h), Ai = await ler(a), { ox, oy } = alinhar(H, Ai);
  for (let y = 0; y < H.h; y++) for (let x = 0; x < H.w; x++) {
    const c = H.px(x, y), d = Ai.px(x + ox, y + oy);
    if (!c || !d) continue;
    const m = votos.get(chave(c)) ?? new Map();
    m.set(chave(d), (m.get(chave(d)) ?? 0) + 1);
    votos.set(chave(c), m);
  }
}
const tabela = new Map([...votos].map(([c, m]) => [c, [...m].sort((p, q) => q[1] - p[1])[0][0].split(',').map(Number)]));
const conhecidas = [...tabela.keys()].map((k) => k.split(',').map(Number));
const trocar = (c) => {
  const t = tabela.get(chave(c));
  if (t) return t;
  const quente = (c[0] > 220 && c[1] > 80 && c[2] < 90) || (c[2] > 180 && c[0] < 120); // amber flame / blue flame
  if (quente) return c;
  let best = null, bd = 1e9;
  for (const k of conhecidas) { const dd = dist(k, c); if (dd < bd) { bd = dd; best = k; } }
  return bd <= 24 ? tabela.get(chave(best)) : c;
};

const H = await ler(HOJE), Ai = await ler(A), { ox, oy } = alinhar(H, Ai);
fs.mkdirSync(OUT, { recursive: true });
let doA = 0, trocados = 0;
for (const f of [HOJE, ...QUADROS]) {
  const Q = await ler(f), buf = Buffer.alloc(Q.w * Q.h * 4);
  for (let y = 0; y < Q.h; y++) for (let x = 0; x < Q.w; x++) {
    const q = Q.px(x, y);
    if (!q) continue;
    const s = H.px(x, y), a = Ai.px(x + ox, y + oy);
    const igual = s && dist(s, q) <= 6;
    const c = igual && a ? a : trocar(q);
    if (igual && a) doA++; else trocados++;
    buf.set([...c, 255], (y * Q.w + x) * 4);
  }
  await sharp(buf, { raw: { width: Q.w, height: Q.h, channels: 4 } }).png().toFile(path.join(OUT, path.basename(f)));
}
console.log(`${path.basename(HOJE)}: ${1 + QUADROS.length} frames · pixels de A ${doA} · pela tabela ${trocados} · tabela ${tabela.size} cores`);
