// 07/11 — the mock's frame at the native 384×216, on the arena's own photo: grey ring blocks and the simple head (the
// approved E3's silhouette, flat grey, the blue eye, the ember in the mouth), the breach lip in front of whatever is in
// the den, and the effects baked in pixels — the lanes' warning, the fire, the Echo's trail/seeds/blasts, the bump and
// the geysers, the steam, the breathers' jets, the dotted passage warning, the debris, the breach closing — then the
// ship and its shots. Blocks, not art: the point is the MOVEMENT and the timing.
import sharp from 'sharp';
import { telaParaCabeca, cabecaParaTela, naToca } from './corpo.mjs';
import { bocasDosCanos } from './canos.mjs';

const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export async function preparaDesenho(N, med, arenaDir) {
  const W = N.tela.W, H = N.tela.H;
  const raw = async (a) => (await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
  const fundo = await raw(`${arenaDir}/arena-semnave.png`);
  const comNave = await raw(`${arenaDir}/arena.png`);
  const nave = [];
  for (let y = 86; y < 114; y++) for (let x = 44; x < 94; x++) {
    const i = (y * W + x) * 4;
    if (Math.abs(comNave[i] - fundo[i]) + Math.abs(comNave[i + 1] - fundo[i + 1]) + Math.abs(comNave[i + 2] - fundo[i + 2]) > 8)
      nave.push({ dx: x - 70, dy: y - 100, c: [comNave[i], comNave[i + 1], comNave[i + 2]] });
  }
  // the lip in front of the den (its opaque pixels at the breach strip's place)
  const labio = await sharp('public/sprites/serpente-rombo-labio.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const naFrente = new Uint8Array(W * H);
  for (let y = 0; y < labio.info.height; y++) for (let x = 0; x < labio.info.width; x++) {
    if (labio.data[(y * labio.info.width + x) * 4 + 3] < 128) continue;
    const X = N.rombo.labio.x + x, Y = N.rombo.labio.y + y;
    if (X >= 0 && X < W && Y >= 0 && Y < H) naFrente[Y * W + X] = 1;
  }
  // (2nd round: the breach stays open at the end — the ship's way into the Leviathan — so nothing closes it)
  // the living hull's crack path: the same seeded walk as `cascoVivo.ts` (the panel's row 168 ±5, little branches every
  // 13 columns)
  const trilha = new Int16Array(W), ramos = [];
  {
    let semente = 20261029;
    const rnd = () => { semente = (Math.imul(semente, 1664525) + 1013904223) >>> 0; return semente / 4294967296; };
    let y = N.geiser.yLombada, passo = 0;
    for (let x = W - 1; x >= 0; x--) {
      if (--passo <= 0) { y = Math.max(N.geiser.yLombada - 5, Math.min(N.geiser.yLombada + 5, y + (rnd() < 0.5 ? -1 : 1))); passo = 2 + Math.floor(rnd() * 3); }
      trilha[x] = y;
      if (x % 13 === 0) { const sobe = rnd() < 0.5 ? -1 : 1, n = 2 + Math.floor(rnd() * 3); for (let q = 1; q <= n; q++) ramos.push({ x: x - Math.round(q * 0.7), y: y + sobe * q }); }
    }
  }
  return { W, H, fundo, nave, naFrente, trilha, ramos, mascara: new Int16Array(W * H), N, med };
}

const COR = {
  anel: [[86, 90, 102], [74, 78, 90]], aro: [34, 36, 44], cabeca: [104, 108, 120], olho: [96, 210, 255], brasa: [255, 140, 48],
  livre: [205, 228, 255], perigo: [255, 46, 32], ciano: [88, 200, 255], verde: [96, 240, 136], laranja: [255, 160, 64],
};

export function quadro(D, s) {
  const { W, H, N, med } = D;
  const out = Buffer.from(D.fundo);
  const put = (x, y, c, a = 1) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= W || y < 0 || y >= H || a <= 0) return;
    const i = (y * W + x) * 4;
    for (let q = 0; q < 3; q++) out[i + q] = Math.round(a >= 1 ? c[q] : out[i + q] + (c[q] - out[i + q]) * a);
  };
  const disco = (cx, cy, r, c, a = 1) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) put(x, y, c, a); };
  const t = s.t, f = s.f, P = s.pose, hab = P.e.trecho.hab;
  // her body as ONE tube (2nd round: "mais fluido"): discs every 2 px of arc into a mask (tail first, so the front
  // wins), then the mask painted — the outline where the tube meets the outside, the joints where two rings meet
  const tubo = (filtro) => {
    const m = D.mascara;
    let x0 = W, x1 = -1, y0 = H, y1 = -1;
    const T = s.morta ? [] : P.tubo;
    for (let i = T.length - 1; i >= 0; i--) {
      const a = T[i];
      if (!filtro(a)) continue;
      const r = a.r;
      for (let y = Math.max(0, Math.floor(a.y - r)); y <= Math.min(H - 1, a.y + r); y++) for (let x = Math.max(0, Math.floor(a.x - r)); x <= Math.min(W - 1, a.x + r); x++) {
        if ((x + 0.5 - a.x) ** 2 + (y + 0.5 - a.y) ** 2 > r * r) continue;
        m[y * W + x] = a.seg + 1;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const v = m[y * W + x];
      if (!v) continue;
      const viz = (X, Y) => (X < 0 || Y < 0 || X >= W || Y >= H ? 0 : m[Y * W + X]);
      const l = viz(x - 1, y), r = viz(x + 1, y), u = viz(x, y - 1), d = viz(x, y + 1);
      if (!l || !r || !u || !d) put(x, y, COR.aro);
      else if (r !== v || d !== v) put(x, y, COR.aro, 0.6);
      else put(x, y, COR.anel[(v - 1) % 2]);
    }
    for (let y = y0; y <= y1; y++) m.fill(0, y * W + Math.max(0, x0), y * W + x1 + 1);
  };

  // ── 0 · what is in the den (the head too, when its neck is in the hole), her eye's glow down in the hole before she
  // breaks out, then the breach's lip over it all
  for (const g of s.sinais) {
    const k = Math.min(1, (t - g.t0) / (g.t1 - g.t0));
    disco(g.x, 214, 6 + 16 * k, COR.ciano, 0.12 + 0.3 * k * (0.7 + 0.3 * Math.sin(t * 20)));
    disco(g.x, 214, 3 + 5 * k, [200, 240, 255], 0.3 * k);
  }
  tubo((a) => a.toca);
  const cabecaNaToca = naToca(P.cabeca.pescoco, N);
  if (cabecaNaToca) cabeca();
  for (let i = 0; i < W * H; i++) if (D.naFrente[i]) { const j = i * 4; out[j] = D.fundo[j]; out[j + 1] = D.fundo[j + 1]; out[j + 2] = D.fundo[j + 2]; }

  // ── 1 · the living hull (`cascoVivo.ts`, the R3 he approved): the band's columns pushed up over her (the crest the
  // most, fading down the band), the dark two-row crack behind her healing from the breach, the geysers' warning
  // lighting the crack green; and before she breaks out of the breach, its rim trembling
  const L = N.geiser.lombada;
  const desloca = (x) => {
    let d = 0;
    if (s.lombada != null) d = Math.max(d, L.amp * Math.exp(-(((x - s.lombada) / L.larg) ** 2)));
    for (const g of s.sinais) {
      const k = Math.min(1, (t - g.t0) / (g.t1 - g.t0));
      d = Math.max(d, 2.2 * k * (0.6 + 0.4 * Math.sin(t * 38)) * Math.exp(-(((x - g.x) / 34) ** 2)));
    }
    return Math.round(d);
  };
  const xsLombada = [];
  if (s.lombada != null) for (let x = Math.floor(s.lombada - 3 * L.larg); x <= s.lombada + 3 * L.larg; x++) xsLombada.push(x);
  for (const g of s.sinais) for (let x = Math.floor(g.x - 80); x <= g.x + 80; x++) xsLombada.push(x);
  for (const x of new Set(xsLombada)) {
    if (x < 0 || x >= W) continue;
    const d = desloca(x);
    if (!d) continue;
    for (let y = N.crista - 16; y < 200; y++) {
      const dy = d * Math.max(0, 1 - Math.max(0, y - N.crista + 1) / L.fundo);
      const sy = Math.min(H - 1, Math.round(y + dy)), i = (sy * W + x) * 4;
      put(x, y, [D.fundo[i], D.fundo[i + 1], D.fundo[i + 2]]);
    }
  }
  for (const fi of s.fissuras) {
    const len = (fi.ate - fi.de + 6) * fi.cura, curaAte = fi.ate - len;
    for (let x = Math.ceil(fi.de); x <= fi.ate; x++) {
      if (x < 0 || x >= W || x > curaAte) continue;
      const y = D.trilha[x] - desloca(x);
      put(x, y - 1, [10, 11, 15]); put(x, y, [16, 17, 22]); put(x, y - 2, [0, 0, 0], 0.45); put(x, y + 1, [255, 255, 255], 0.28);
    }
    for (const r of D.ramos) if (r.x >= fi.de && r.x <= Math.min(fi.ate, curaAte)) put(r.x, r.y - desloca(r.x), [14, 15, 20]);
    if (fi.cura > 0) for (let q = 0; q <= 10; q++) { // the new tissue right behind the healed edge, a little darker
      const x = Math.round(curaAte + q);
      if (x < fi.de || x > fi.ate || x < 0 || x >= W) continue;
      for (const dy of [-2, -1, 0, 1]) put(x, D.trilha[x] + dy, [6, 6, 10], 0.35 * (1 - q / 10));
    }
  }
  for (const g of s.geis) { // the warning: the crack lights green where the geyser will break, a puff, the plates rise
    if (t < g.tAviso || t >= g.tFim) continue;
    const k = t < g.tColuna ? (t - g.tAviso) / N.geiser.aviso : 1;
    for (let dx = -9; dx <= 9; dx++) {
      const x = Math.round(g.x + dx), y = D.trilha[Math.max(0, Math.min(W - 1, x))];
      const a = (0.35 + 0.65 * k) * (1 - Math.abs(dx) / 11);
      put(x, y - 1, COR.verde, a); put(x, y, [200, 255, 220], a * 0.8); put(x, y - 2, COR.verde, a * 0.4);
      if (t < g.tColuna) put(x, N.crista - 1, [80, 92, 110], 0.6 * k);
    }
  }

  // ── 2 · the lanes' warning (behind her: the tint is on the arena)
  if (s.canos) {
    const q = s.canos, F = N.canos.faixas;
    if ((q.fase === 'aviso' || q.fase === 'fogo') && q.livre != null) {
      const carga = q.fase === 'aviso' ? q.k : 1;
      const pulso = 0.5 + 0.5 * Math.sin(t * (8 + 18 * carga));
      for (let l = 0; l < 4; l++) {
        const livre = l === q.livre;
        const a = livre ? 0.13 + 0.05 * pulso : (0.08 + 0.12 * carga) * (0.7 + 0.3 * pulso);
        const c = livre ? COR.livre : COR.perigo;
        for (let y = F[l]; y < F[l + 1]; y++) for (let x = 0; x < W; x++) put(x, y, c, a);
        if (!livre) for (let x = 0; x < W; x += 1) { put(x, F[l] + 1, COR.perigo, 0.25 + 0.4 * carga); put(x, F[l + 1] - 2, COR.perigo, 0.25 + 0.4 * carga); }
        else for (let x = 0; x < W; x += 3) { put(x, F[l] + 1, COR.livre, 0.55); put(x, F[l + 1] - 2, COR.livre, 0.55); }
      }
    }
  }
  // ── 3 · the fire (behind her body: it leaves the pipes' mouths and runs left)
  if (s.canos && s.canos.fase === 'fogo') {
    const q = s.canos, F = N.canos.faixas, bocas = bocasDosCanos(P, N);
    for (let l = 0; l < 4; l++) {
      if (l === q.livre) continue;
      const xb = bocas[l].x, xf = xb * (1 - q.frente), mid = (F[l] + F[l + 1]) / 2, meia = (F[l + 1] - F[l]) / 2 - 1;
      const fim = q.k > 0.8 ? 1 - (q.k - 0.8) / 0.2 : 1;
      for (let y = F[l] + 1; y < F[l + 1] - 1; y++) for (let x = Math.max(0, Math.floor(xf)); x < xb; x++) {
        const n = hash(x >> 1, y >> 1, f), d = Math.abs(y - mid) / meia;
        const borda = 0.78 + 0.22 * hash(x >> 2, l, f >> 1);
        if (d > borda) continue;
        const frente = q.frente < 1 && x - xf < 7;
        const c = frente ? [255, 248, 228] : d < 0.35 ? (n < 0.5 ? [255, 238, 190] : [255, 206, 110]) : d < 0.7 ? (n < 0.5 ? [255, 150, 50] : [240, 110, 34]) : [200, 64, 24];
        put(x, y, c, (frente ? 1 : 0.92) * (fim < 1 ? (n < fim ? 1 : 0.25) : 1));
      }
    }
  }
  for (const b of s.brasas ?? []) {
    const F = N.canos.faixas;
    for (let l = 0; l < 4; l++) {
      if (l === b.livre) continue;
      for (let i = 0; i < 90; i++) {
        const x = hash(i, l, 7) * 340, y = F[l] + 4 + hash(i, l, 9) * 46;
        const vivo = hash(i, l, 11) > b.k;
        if (vivo) put(x - b.k * 14, y, hash(i, l, 13) < 0.6 ? [255, 120, 40] : [90, 86, 90], (1 - b.k) * 0.9);
      }
    }
  }

  // ── 4 · her (out of the den): the tube, the pipes' mouths, then the head
  tubo((a) => !a.toca);
  // the pipes' mouths (open on the post): a dark stub with an ember that charges
  if (s.canos && !['fecha', 'apaga'].includes(s.canos.fase)) {
    const bocas = bocasDosCanos(P, N), q = s.canos;
    const brilho = q.fase === 'abre' ? q.k * 0.4 : q.fase === 'aviso' ? 0.4 + 0.6 * q.k : q.fase === 'fogo' ? 1 : 0.35;
    for (let l = 0; l < 4; l++) {
      const b = bocas[l];
      for (let dx = -5; dx <= 0; dx++) for (let dy = -2; dy <= 2; dy++) put(b.x + dx, b.y + dy, Math.abs(dy) === 2 ? COR.aro : [40, 40, 46]);
      if (l !== q.livre || q.fase === 'abre') for (let dy = -1; dy <= 1; dy++) put(b.x - 5, b.y + dy, COR.laranja, brilho);
    }
  }
  if (!cabecaNaToca) cabeca();
  function cabeca() {
    if (s.semCabeca) return;
    const C = P.cabeca, M = med.cabeca;
    const R = 70;
    for (let y = Math.floor(C.pescoco.y - R); y <= C.pescoco.y + R; y++) for (let x = Math.floor(C.pescoco.x - R); x <= C.pescoco.x + R; x++) {
      if (x < 0 || x >= W || y < 0 || y >= H) continue;
      const a = telaParaCabeca(C, med, { x: x + 0.5, y: y + 0.5 });
      const ax = Math.floor(a.x), ay = Math.floor(a.y);
      if (ax < 0 || ay < 0 || ax >= M.w || ay >= M.h || !M.mascara[ay * M.w + ax]) continue;
      if (s.mordida && Math.hypot(ax - s.mordida.x, ay - s.mordida.y) < s.mordida.r) continue;
      const borda = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([u, v]) => { const X = ax + u, Y = ay + v; return X < 0 || Y < 0 || X >= M.w || Y >= M.h || !M.mascara[Y * M.w + X]; });
      let c = borda ? COR.aro : COR.cabeca;
      if (Math.hypot(ax - M.olho.x, ay - M.olho.y) < 2.2) c = s.olhoAceso ? [220, 245, 255] : COR.olho;
      else if (Math.hypot(ax - M.boca.x, ay - M.boca.y) < 3.5) c = COR.brasa;
      put(x, y, c);
    }
  }

  // ── 5 · the geysers' columns and steam (in front: they come out of the hull, through the crest)
  for (const g of s.geis) {
    if (t < g.tColuna || t >= g.tFim) continue;
    const k = (t - g.tColuna) / N.geiser.coluna, topo = N.geiser.topo + (k < 0.15 ? (1 - k / 0.15) * 80 : 0);
    const L = N.geiser.largura / 2;
    for (let y = Math.floor(topo); y < H; y++) for (let dx = -L; dx < L; dx++) {
      const n = hash(g.x + dx, y >> 1, f), d = Math.abs(dx + 0.5) / L;
      const ondula = 0.82 + 0.18 * hash(y >> 2, g.x, f >> 1);
      if (d > ondula) continue;
      if (y < topo + 4 && hash(dx, y, f) > (y - topo) / 4) continue;
      put(g.x + dx, y, d < 0.4 ? (n < 0.5 ? [200, 255, 220] : [150, 250, 180]) : d < 0.75 ? [70, 210, 120] : [30, 120, 70], 0.95);
    }
  }

  // ── 6 · the Echo: the trail being read, the seeds, the blasts
  if (s.eco) {
    if (s.eco.rastro) for (let i = 0; i < s.eco.rastro.length; i += 2) {
      const p = s.eco.rastro[i], a = 0.15 + 0.45 * (i / s.eco.rastro.length);
      put(p.x, p.y, COR.ciano, a); put(p.x + 1, p.y, COR.ciano, a * 0.5);
    }
    for (const sm of s.eco.sementes) {
      const pisca = sm.voo < 1 ? 1 : sm.falta < 0.3 ? (Math.floor(t * 20) % 2 ? 1 : 0.4) : 0.75 + 0.25 * Math.sin(t * 12 + sm.i);
      disco(sm.x, sm.y, 3.2, [8, 20, 40]);
      disco(sm.x, sm.y, 2.3, COR.ciano, pisca);
      put(sm.x - 0.5, sm.y - 0.5, [235, 248, 255], pisca);
    }
    for (const x of s.eco.explosoes) {
      const r = x.k < 0.3 ? 4 + (x.r - 4) * (x.k / 0.3) : x.r;
      const a = x.k < 0.3 ? 1 : 1 - (x.k - 0.3) / 0.7;
      disco(x.x, x.y, r, x.k < 0.3 ? [230, 245, 255] : [120, 200, 255], a * 0.75);
      for (let i = 0; i < 48; i++) { const an = (i / 48) * Math.PI * 2; put(x.x + Math.cos(an) * r, x.y + Math.sin(an) * r, COR.ciano, a); }
    }
  }

  // ── 7 · the particles (jets, debris, embers, steam, dust) — nothing falls: they drift and fade
  for (const p of s.particulas) {
    const a = Math.max(0, 1 - p.idade / p.vida) * (p.a ?? 1);
    if (p.tam > 1) disco(p.x, p.y, p.tam * (p.cresce ? 1 + p.idade / p.vida : 1), p.cor, a);
    else put(p.x, p.y, p.cor, a);
  }

  // ── 8 · the ship and its shots
  for (const b of s.tiros) for (let k = 0; k < 4; k++) put(b.x - k, b.y, k ? [255, 220, 120] : [255, 255, 230], 1 - k * 0.2);
  for (const p of D.nave) put(s.nave.x + p.dx, s.nave.y + p.dy, s.naveFerida ? [255, 70 + p.c[1] * 0.2, 60] : p.c);
  return out;
}

// the head's pixels on screen (for its undoing in the breach)
export function pixelsDaCabeca(D, P, s = {}) {
  const { W, H, med } = D, C = P.cabeca, M = med.cabeca, out = [];
  for (let y = Math.floor(C.pescoco.y - 70); y <= C.pescoco.y + 70; y++) for (let x = Math.floor(C.pescoco.x - 70); x <= C.pescoco.x + 70; x++) {
    if (x < 0 || x >= W || y < 0 || y >= H) continue;
    const a = telaParaCabeca(C, med, { x: x + 0.5, y: y + 0.5 }), ax = Math.floor(a.x), ay = Math.floor(a.y);
    if (ax < 0 || ay < 0 || ax >= M.w || ay >= M.h || !M.mascara[ay * M.w + ax]) continue;
    if (s.mordida && Math.hypot(ax - s.mordida.x, ay - s.mordida.y) < s.mordida.r) continue;
    out.push({ x, y });
  }
  return out;
}
export const bocaNaTela = (P, med) => cabecaParaTela(P.cabeca, med, med.cabeca.boca);
export const olhoNaTela = (P, med) => cabecaParaTela(P.cabeca, med, med.cabeca.olho);
