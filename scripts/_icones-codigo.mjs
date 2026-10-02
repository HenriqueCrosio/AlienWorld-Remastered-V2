// Card icons built IN CODE from approved art (his round of feedback, 02/10): each one starts from a piece he already
// chose, so it stays in the same family. Usage: node scripts/_icones-codigo.mjs <icon-dir> <outdir>
// Writes <outdir>/<ID>c/<n>.png for EFF_006 (real enemy on fire), EFF_007 (#41 in fire), DEF_002 (casco + ring with a
// gap), DEF_004 (casco + blast from its centre), DEF_005 (bomb #24 with the + away from the fuse), MOV_003 (» chevrons).
import fs from 'fs';
import sharp from 'sharp';

const [IC, OUT] = process.argv.slice(2);
const R5 = 'docs/superpowers/folhas/2026-10-01/pecas-novas/rodada5';
const R3 = 'docs/superpowers/folhas/2026-10-01/pecas-novas/rodada3';
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const trim = (f) => sharp(f).ensureAlpha().trim({ threshold: 1 }).raw().toBuffer({ resolveWithObject: true });
const salvar = async (id, n, raw) => {
  fs.mkdirSync(`${OUT}/${id}c`, { recursive: true });
  await sharp(raw.data, { raw: raw.info }).png().toFile(`${OUT}/${id}c/${n}.png`);
};
const tela = (w, h) => ({ data: Buffer.alloc(w * h * 4), info: { width: w, height: h, channels: 4 } });
/** Paste `src` over `dst` at (x,y), alpha-over (src opaque pixels win). */
function colar(dst, src, x, y) {
  for (let j = 0; j < src.info.height; j++) for (let i = 0; i < src.info.width; i++) {
    const X = x + i, Y = y + j;
    if (X < 0 || Y < 0 || X >= dst.info.width || Y >= dst.info.height) continue;
    const s = (j * src.info.width + i) * 4, d = (Y * dst.info.width + X) * 4;
    if (src.data[s + 3] < 128) continue;
    src.data.copy(dst.data, d, s, s + 4);
  }
}
const encolher = async (f, fator) => {
  const t = await trim(f);
  const w = Math.round(t.info.width * fator), h = Math.round(t.info.height * fator);
  const { data, info } = await sharp(t.data, { raw: t.info }).resize(w, h, { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] > 110 ? 255 : 0;
  return { data, info };
};

// ── COMBUSTÃO: a REAL enemy of the game, burning (the approved "queimando #12" flames on top, the body heated) ──
const FOGO = [0x5c1a06, 0xa83a0e, 0xff8c1a, 0xffb040, 0xffd447, 0xfff1c0].map(hex);
for (const [n, sprite] of [[0, 'public/sprites/enemy-kamikaze.png'], [1, 'public/sprites/enemy-drone-2.png']]) {
  const e = await trim(sprite);
  // flip to face LEFT (as in game) and heat the lower half of the body
  const { data, info } = await sharp(e.data, { raw: e.info }).flop().raw().toBuffer({ resolveWithObject: true });
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    if (!data[i + 3] || y < info.height * 0.45) continue;
    const c = FOGO[Math.min(5, Math.floor(lum(data[i], data[i + 1], data[i + 2]) * 4) + 1)];
    data[i] = Math.round(data[i] * 0.35 + c[0] * 0.65); data[i + 1] = Math.round(data[i + 1] * 0.35 + c[1] * 0.65); data[i + 2] = Math.round(data[i + 2] * 0.35 + c[2] * 0.65);
  }
  const W = 40, H = 40, c = tela(W, H);
  const ex = Math.round((W - info.width) / 2), ey = H - info.height - 3;
  colar(c, { data, info }, ex, ey);
  for (const [k, dx] of [['12', 0.2], ['4', 0.5], ['61', 0.78]]) {
    const f = await trim(`${R3}/fx-queimando-${k}.png`);
    colar(c, f, Math.round(ex + info.width * dx - f.info.width / 2), ey - f.info.height + 4);
  }
  await salvar('EFF_006', n, c);
}

// ── EM CADEIA: the approved Arco em Cadeia #41, the arcs recoloured to fire ──
{
  const a = await trim(`${IC}/EFF_012/41.png`);
  const d = Buffer.from(a.data);
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    if (!(b > r + 30 && g > r)) continue; // the cyan arcs (and cyan glints on the nodes)
    const c = FOGO[Math.min(5, Math.floor(lum(r, g, b) * 6))];
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
  await salvar('EFF_007', 0, { data: d, info: a.info });
}

// ── RECARGA: the Casco #0 inside a cyan recharge ring with a clear gap and an arrow head ──
const CIANO = { escuro: hex(0x0e6b7a), meio: hex(0x17a6bd), claro: hex(0x3ee0f0), brilho: hex(0xb5f7ff), contorno: hex(0x05060d) };
// (02/10) "o círculo está torto, não está centrado": the casco was SHRUNK (nearest, uneven) and pasted on an even
// canvas. Now: the casco at its native size, an ODD canvas sized from it, and both centred on the same whole pixel.
for (const [n, esp] of [[0, 3], [1, 2]]) {
  const k = await trim(`${IC}/DEF_001/0.png`);
  // the ring clears the casco by 3px (a shield: no bottom corners — its half-height, not the diagonal, is the radius)
  const R = Math.ceil(Math.max(k.info.width, k.info.height) / 2) + 5 + esp;
  const W = 2 * (R + 2) + 1, c = tela(W, W), cx = R + 2, cy = R + 2;
  colar(c, k, cx - Math.floor(k.info.width / 2), cy - Math.floor(k.info.height / 2));
  // the arc (degrees, 0 = right, clockwise in screen space): the GAP sits at the TOP, where the shield's two wide
  // corners are — the ring hugs the sides and the bottom without touching them; the arrow closes the turn there
  const A0 = -25, A1 = 200; // the arrow stops BELOW the shield's top-left corner (~230°)
  const noArco = (ang) => { const a = ((ang - A0) % 360 + 360) % 360; return a <= A1 - A0; };
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy), ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (!noArco(ang)) continue;
    let cor = null;
    if (d >= R - esp && d < R) cor = d < R - esp / 2 ? CIANO.claro : CIANO.meio;
    else if ((d >= R && d < R + 1) || (d >= R - esp - 1 && d < R - esp)) cor = CIANO.contorno;
    if (cor) c.data.set([...cor, 255], (y * W + x) * 4);
  }
  // arrow head at the arc's end (A1), pointing along the clockwise direction
  const t = (A1 * Math.PI) / 180, px = cx + Math.cos(t) * (R - esp / 2), py = cy + Math.sin(t) * (R - esp / 2);
  const tx = -Math.sin(t), ty = Math.cos(t); // tangent (clockwise)
  for (let s = 0; s <= 4; s++) for (let w = -4 + s; w <= 4 - s; w++) {
    const x = Math.round(px + tx * s + Math.cos(t) * w * 0.9), y = Math.round(py + ty * s + Math.sin(t) * w * 0.9);
    if (x < 0 || y < 0 || x >= W || y >= W) continue;
    c.data.set([...(Math.abs(w) === 4 - s ? CIANO.contorno : s < 2 ? CIANO.brilho : CIANO.claro), 255], (y * W + x) * 4);
  }
  await salvar('DEF_002', n, c);
}

// ── CASCO REATIVO: the Casco #0 with the blast bursting out of its CENTRE — (02/10) "mais fumaça, estilhaço": the
// missile's round blast #53 (it has smoke) + the approved shard D flying outward ──
const ESTILHACO = { data: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 255, 241, 192, 255, 0, 0, 0, 0, 255, 176, 64, 255, 0, 0, 0, 0, 168, 58, 14, 255, 0, 0, 0, 0, 0, 0, 0, 0]), info: { width: 3, height: 3, channels: 4 } };
for (const [n, exp, fator] of [[0, `${R5}/redonda-grande-53.png`, 0.6], [1, `${R5}/redonda-grande-53.png`, 0.72]]) {
  const casco = await trim(`${IC}/DEF_001/0.png`);
  const W = 40, c = tela(W, W);
  const x0 = Math.round((W - casco.info.width) / 2), y0 = Math.round((W - casco.info.height) / 2);
  colar(c, casco, x0, y0);
  // cracks from the centre (dark) before the blast
  const cx = x0 + casco.info.width / 2, cy = y0 + casco.info.height / 2;
  for (const [ax, ay] of [[1, -1], [-1, -0.6], [0.8, 1], [-0.7, 1.1], [0.1, -1.3]]) for (let s = 4; s < 13; s++) {
    const x = Math.round(cx + ax * s), y = Math.round(cy + ay * s), i = (y * W + x) * 4;
    if (c.data[i + 3]) c.data.set([5, 6, 13, 255], i);
  }
  const e = await encolher(exp, fator);
  colar(c, e, Math.round(cx - e.info.width / 2), Math.round(cy - e.info.height / 2));
  // shards flying out past the blast (mirrored so each points away from the centre)
  for (const [ax, ay] of [[1, -1], [-1, -1], [1.2, 0.4], [-1.2, 0.5], [0.3, 1.2]]) {
    const dist = e.info.width / 2 + 3;
    const s = { data: Buffer.from(ESTILHACO.data), info: ESTILHACO.info };
    const m = await sharp(s.data, { raw: s.info }).flop(ax < 0).flip(ay > 0).raw().toBuffer({ resolveWithObject: true });
    colar(c, m, Math.round(cx + ax * dist - 1), Math.round(cy + ay * dist - 1));
  }
  await salvar('DEF_004', n, c);
}

// ── BOMBA EXTRA: bomb #24 with the "+" moved away from the fuse ──
{
  const b = await sharp(`${IC}/DEF_005/24.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = b.info.width, mais = [];
  for (let y = 0; y < b.info.height; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4, [r, g, bb, a] = [b.data[i], b.data[i + 1], b.data[i + 2], b.data[i + 3]];
    if (a && bb > 150 && g > 150 && r < 170 && x > W / 2 && y < b.info.height / 2) mais.push([x, y, b.data.slice(i, i + 4)]);
  }
  // keep only the "+" itself: the pixels near the cluster's median (a stray cyan glint elsewhere was dragged along)
  const med = (a) => a.slice().sort((p, q) => p - q)[a.length >> 1];
  const mx = med(mais.map((m) => m[0])), my = med(mais.map((m) => m[1]));
  for (let i = mais.length - 1; i >= 0; i--) if (Math.abs(mais[i][0] - mx) > 4 || Math.abs(mais[i][1] - my) > 4) mais.splice(i, 1);
  const x0 = Math.min(...mais.map((m) => m[0])), y0 = Math.min(...mais.map((m) => m[1]));
  // the "+" also has a WHITE centre the cyan mask misses: take every bright pixel inside its box
  const x1 = Math.max(...mais.map((m) => m[0])), y1 = Math.max(...mais.map((m) => m[1]));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = (y * W + x) * 4;
    if (b.data[i + 3] && b.data[i] > 190 && b.data[i + 1] > 190 && b.data[i + 2] > 190 && !mais.some((m) => m[0] === x && m[1] === y)) mais.push([x, y, b.data.slice(i, i + 4)]);
  }
  // (02/10) "no canto superior direito DA BOMBA": the body = the widest rows (the fuse is thin); the "+" goes centred on
  // the body's top-right corner.
  const largura = (y) => { let a = W, z = -1; for (let x = 0; x < W; x++) if (b.data[(y * W + x) * 4 + 3] && !mais.some((m) => m[0] === x && m[1] === y)) { a = Math.min(a, x); z = Math.max(z, x); } return z < 0 ? 0 : z - a + 1; };
  const larguras = Array.from({ length: b.info.height }, (_, y) => largura(y));
  const corpoTopo = larguras.findIndex((l) => l >= Math.max(...larguras) * 0.5);
  let corpoDir = 0;
  for (let y = corpoTopo; y < b.info.height; y++) for (let x = 0; x < W; x++) if (b.data[(y * W + x) * 4 + 3]) corpoDir = Math.max(corpoDir, x);
  const pw = x1 - x0 + 1, ph = y1 - y0 + 1;
  for (const [n, nx, ny] of [[0, corpoDir - Math.floor(pw / 2), corpoTopo - Math.floor(ph / 2) + 1], [1, corpoDir - pw + 2, corpoTopo - 1]]) {
    const d = { data: Buffer.from(b.data), info: b.info };
    for (const [x, y] of mais) d.data.fill(0, (y * W + x) * 4, (y * W + x) * 4 + 4);
    for (const [x, y, p] of mais) { const X = nx + x - x0, Y = ny + y - y0; d.data.set(p, (Y * W + X) * 4); }
    await salvar('DEF_005', n, d);
  }
}

// ── DASH: the » symbol, in pixel (energy white-cyan, dark outline) ──
function chevrons(n, alfas) {
  const H = 15, L = 8, GAP = 3, W = n * (L + GAP) + 6, c = tela(W, H + 2);
  for (let k = 0; k < n; k++) {
    const ox = 2 + k * (L + GAP), a = alfas[k];
    for (let y = 0; y < H; y++) {
      const off = Math.round((1 - Math.abs(y - (H - 1) / 2) / ((H - 1) / 2)) * (L - 4));
      for (let t = 0; t < 4; t++) {
        const x = ox + off + t, i = ((y + 1) * W + x) * 4;
        const cor = t === 0 || t === 3 ? CIANO.contorno : t === 1 ? CIANO.brilho : CIANO.claro;
        c.data.set([...cor, Math.round(255 * a)], i);
      }
    }
  }
  return c;
}
await salvar('MOV_003', 0, chevrons(2, [1, 1]));
await salvar('MOV_003', 1, chevrons(3, [0.35, 0.65, 1]));
console.log('ok', fs.readdirSync(OUT).filter((d) => d.endsWith('c')).join(' '));
