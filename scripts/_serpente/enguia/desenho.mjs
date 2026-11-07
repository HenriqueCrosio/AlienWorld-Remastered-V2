// 07/11 — the mock's frame at the native 384×216, on the arena's own photo: grey ring blocks and the simple head (the
// approved E3's silhouette, flat grey, the blue eye, the ember in the mouth), the breach lip in front of whatever is in
// the den, and the effects baked in pixels — the lanes' warning, the fire, the Echo's trail/seeds/blasts, the bump and
// the geysers, the steam, the breathers' jets, the dotted passage warning, the debris, the breach closing — then the
// ship and its shots. Blocks, not art: the point is the MOVEMENT and the timing.
import sharp from 'sharp';
import { telaParaCabeca, cabecaParaTela, naToca } from './corpo.mjs';
import { bocasDosCanos } from './canos.mjs';
import { trilhaFissura } from './geiseres.mjs';
import { brilha, realce, CENTRO, PESCOCO, CRANIO_X, SOBRE, fonte8 } from './arte.mjs';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const hashD = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ─── Part B, the rings: her body in the approved art (`D.arte`, from `arte.mjs` `carregaArte`) instead of grey blocks.
// Two ways to wear it, side by side on the sheet:
//   'aneis' — the spec's rings: 26 px slices of the strip, each turned WHOLE to its place on the path (rigid), 4 px of
//             overlap at each end, drawn tail → head so the plate in front hides the joint;
//   'pele'  — the skin: the whole strip BENT along the path (every column of the strip laid across the path at its
//             arc length), the roll a turning cylinder: where she rolls over, the dorsal plates slide across her
//             visible face as the other side comes round.
// Both relit by the normal maps: a pixel whose normal now faces the painting's light brightens, the other side darkens
// (the fitted light of [[jogo-de-luz-por-normais]]); what glows by itself is left alone.
function corpoArte(D, s, put, filtro) {
  const A = D.arte, F = A.faixa, nF = A.nFaixa, C = A.luzFaixa, P = s.pose, T = s.morta ? [] : P.tubo;
  if (!T.length) return;
  const comp = P.nAneis * D.N.corpo.passo, mordida = P.nAneis < D.N.corpo.aneis;
  // the stump after a bite (his note: "rasgado e dilacerado, como se tivesse arrancado de forma irregular"): the end is
  // torn per row — a jagged line of torn tissue, a few strands and plates hanging past it, embers in the wound
  const corte = (row) => {
    const q = Math.round(row), sem = P.nAneis * 7.3;
    let j = 6 + 4 * Math.sin(q * 0.83 + sem) + 3 * Math.sin(q * 2.17 + sem * 1.9) + 2 * Math.sin(q * 5.3 + sem * 0.7);
    if (hashD(q, P.nAneis, 3) < 0.12) j -= 6; // a strand hanging out
    return comp - Math.round(j);
  };
  // (uf, rowf): the strip position (float, the strip's own index — u + the neck), sampled through the 8× map
  // `dw` (the back, mid-roll): when set, the colour comes from the DORSAL texture — the back seen from above — at the
  // across position dw ∈ [−1, 1] (0 = the spine); `rowf` is still the side row, for the bite's torn edge
  const Dz = A.dorso;
  const pinta = (X, Y, rowf, uf, dx, dy, D0x, D0y, lado, dw = null) => {
    let p, src = F.data;
    if (dw != null) {
      const ui = Math.min(Dz.w - 1, Math.max(0, Math.floor(uf)));
      if (Dz.topo[ui] < 0) return;
      const yd = Math.round(Dz.meio[ui] - dw * Dz.meia[ui]);
      p = yd * Dz.w + ui;
      if (yd < 0 || yd >= Dz.h || Dz.data[p * 4 + 3] < 128) return;
      src = Dz.data;
    } else {
      p = fonte8(A.faixa8, uf, rowf);
      if (p < 0) return;
    }
    const u = uf - PESCOCO;
    let r = src[p * 4], g = src[p * 4 + 1], b = src[p * 4 + 2];
    if (s.decapitada) { // (the head blown off: the neck's front torn the same way as the tail's stump)
      const q = Math.round(rowf);
      const c = 12 + 3 + 3 * Math.sin(q * 0.91 + 2.1) + 2 * Math.sin(q * 2.3) + (hashD(q, 7, 1) < 0.15 ? -5 : 0);
      if (uf < c) return;
      if (uf < c + 2.4) {
        const h = hashD(Math.round(X), Math.round(Y), 99);
        put(X, Y, h < 0.1 ? [255, 120, 44] : h < 0.5 ? [120, 28, 22] : h < 0.85 ? [70, 16, 18] : [28, 8, 10]);
        return;
      }
    }
    if (mordida) {
      const c = corte(rowf), falta = c - u;
      if (falta < 0) return;
      if (falta < 2.2) { // the torn rim: dark flesh, a few embers
        const h = hashD(Math.round(X), Math.round(Y), P.nAneis);
        const tom = h < 0.12 ? [255, 120, 44] : h < 0.45 ? [92, 22, 16] : h < 0.8 ? [52, 12, 12] : [24, 8, 10];
        put(X, Y, tom);
        return;
      }
      if (falta < 4.5) { r *= 0.6; g *= 0.45; b *= 0.45; } // bruised just behind it
    }
    if (dw == null && !brilha(r, g, b)) {
      const q = p * 3, nx = nF[q], ny = nF[q + 1], nz = nF[q + 2];
      const vx = -nx * dx + ny * lado * D0x, vy = -nx * dy + ny * lado * D0y; // the strip's +x runs to the tail (−d)
      const k = D.semLuz ? 1 : realce(C, nx, ny, nz, vx, -vy);
      r *= k; g *= k; b *= k;
    }
    put(X, Y, [Math.min(255, r), Math.min(255, g), Math.min(255, b)]);
  };
  if (s.modoCorpo === 'aneis') {
    const passo = D.N.corpo.passo;
    for (let k = P.nAneis - 1; k >= 0; k--) {
      const uc = (k + 0.5) * passo, a = T[Math.min(T.length - 1, Math.round(uc / D.N.tubo.passo))];
      if (!filtro(a)) continue;
      const D0x = -a.dy, D0y = a.dx, lado = a.fi > Math.PI / 2 ? -1 : 1;
      for (let Y = Math.floor(a.y - 40); Y <= a.y + 40; Y++) for (let X = Math.floor(a.x - 40); X <= a.x + 40; X++) {
        const lx = X + 0.5 - a.x, ly = Y + 0.5 - a.y;
        const along = -(lx * a.dx + ly * a.dy), perp = lx * D0x + ly * D0y;
        if (Math.abs(along) > passo / 2 + 4) continue;
        const u = uc + along;
        if (u < 0 || u > comp + 10) continue;
        pinta(X, Y, CENTRO - perp * lado, u + PESCOCO, a.dx, a.dy, D0x, D0y, lado);
      }
    }
    return;
  }
  // 'pele': every 0.25 px of arc, tail → head, the strip's column laid across the path
  for (let i = T.length - 2; i >= 0; i--) {
    const a = T[i], b = T[i + 1];
    if (!filtro(a)) continue;
    for (let sub = 3; sub >= 0; sub--) {
      const f = sub / 4, u = a.u + (b.u - a.u) * f;
      if (u > comp + 10) continue;
      const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f, dx = a.dx + (b.dx - a.dx) * f, dy = a.dy + (b.dy - a.dy) * f;
      const m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m, D0x = -uy, D0y = ux;
      const fi = a.fi + (b.fi - a.fi) * f, Rr = Math.max(3, a.r + 1), cf = Math.cos(fi);
      const uf = u + PESCOCO;
      const emRolagem = fi > 0.05 && fi < Math.PI - 0.05;
      const ua = Math.min(F.w - 1, Math.max(0, Math.round(uf))), r0 = F.topo[ua] + 2, r1 = F.base[ua] - 2;
      // (3rd round, his request: the roll shown ring by ring, to compare with the cylinder — `rolagem=aneis`)
      let ladoAnel = null;
      if (emRolagem && D.rolagemAneis) {
        const uc = (Math.floor(u / D.N.corpo.passo) + 0.5) * D.N.corpo.passo;
        const ic = Math.max(0, Math.min(T.length - 1, Math.round((uc + PESCOCO) / D.N.tubo.passo)));
        ladoAnel = T[ic].fi > Math.PI / 2 ? -1 : 1;
      }
      for (let vs = -CENTRO; vs < CENTRO; vs += 0.5) {
        let row;
        if (ladoAnel) { pinta(x + D0x * vs, y + D0y * vs, CENTRO - vs * ladoAnel, uf, ux, uy, D0x, D0y, ladoAnel); continue; }
        if (!emRolagem || Math.abs(vs) >= Rr) row = CENTRO - (cf >= 0 ? vs : -vs);
        else if (Dz) {
          // (7 Nov, his circle on the roll: the side art has the back only edge-on, so any mapping stretched it. Now
          // two sources, each where it sees the surface face-on: the side art's exact projection on the flanks, the
          // DORSAL texture on the back. The back's share grows with the roll — none at rest (the art exactly as drawn),
          // the whole plated back mid-roll — with an ordered dither on the seam, which runs along the plates' edge)
          const a = Math.asin(vs / Rr) + fi, sa = Math.sin(a), m = Math.sin(fi) ** 2;
          const PX = Math.round(x + D0x * vs), PY = Math.round(y + D0y * vs);
          const lim = 1 - m * (1 - Dz.borda) + (BAYER[(PY & 3) * 4 + (PX & 3)] - 0.5) * 0.08;
          const rowCil = Math.min(r1, Math.max(r0, CENTRO - Rr * sa));
          if (sa > lim) pinta(x + D0x * vs, y + D0y * vs, rowCil, uf, ux, uy, D0x, D0y, cf >= 0 ? 1 : -1, Math.cos(a));
          else pinta(x + D0x * vs, y + D0y * vs, rowCil, uf, ux, uy, D0x, D0y, cf >= 0 ? 1 : -1);
          continue;
        } else { // the roll: a turning cylinder — the back comes round; sampled inside the column's own silhouette
          // (4th round, his note on the stretched plates: the plain projection squeezes the few dorsal rows across the
          // whole face mid-roll — its slope goes to zero there. Mid-roll the texture is read by ARC LENGTH round the
          // cylinder instead: the plates still pass across her face in order, stretched at most ~1.6×; at either end
          // of the roll it eases back to the projection, which is the art as drawn)
          const a = Math.asin(vs / Rr) + fi;
          const rowCil = CENTRO - Rr * Math.sin(a);
          const af = a > Math.PI / 2 ? Math.PI - a : a;
          const rowArco = CENTRO - af * ((2 * Rr) / Math.PI);
          const w = Math.sin(fi) ** 2;
          row = Math.min(r1, Math.max(r0, rowCil * (1 - w) + rowArco * w));
        }
        pinta(x + D0x * vs, y + D0y * vs, row, uf, ux, uy, D0x, D0y, cf >= 0 ? 1 : -1);
      }
    }
  }
}

// the head in its approved art (E3), turned and mirrored like the silhouette, relit by its normal map
function cabecaArte(D, s, put) {
  const A = D.arte, H = D.med.cabeca, img = A.cabeca;
  // (7 Nov: mid-roll, the turn-over view nearest the head's φ — already rolled, so never mirrored; at rest, the art)
  const kV = A.vistas ? Math.round((s.pose.cabeca.fi * 180) / Math.PI / A.vistas.passo) : 0;
  const V = A.vistas && kV > 0 && kV < A.vistas.lista.length - 1 ? A.vistas.lista[kV] : null;
  const C = V ? { ...s.pose.cabeca, espelho: false } : s.pose.cabeca;
  const dados = V ? V.data : img.data, mapa8 = V ? V.m8 : A.cabeca8, nC = V ? V.n : A.nCabeca, n0 = V ? V.n0 : A.nCabeca;
  const a = { x: Math.cos(H.ang), y: Math.sin(H.ang) }, r = C.ang - H.ang, cr = Math.cos(r), sr = Math.sin(r);
  const vira = (vx, vy) => { // an art vector (y down) → the screen, the same map as the points
    if (C.espelho) { const d = vx * a.x + vy * a.y; vx = 2 * d * a.x - vx; vy = 2 * d * a.y - vy; }
    return [vx * cr - vy * sr, vx * sr + vy * cr];
  };
  for (let Y = Math.floor(C.pescoco.y - 70); Y <= C.pescoco.y + 70; Y++) for (let X = Math.floor(C.pescoco.x - 70); X <= C.pescoco.x + 70; X++) {
    const p = telaParaCabeca(C, D.med, { x: X + 0.5, y: Y + 0.5 });
    if (p.x >= CRANIO_X + SOBRE) continue; // (the neck is the skin's; the skull overlaps it by SOBRE px)
    const src = fonte8(mapa8, p.x, p.y); // (the 8× map: the turned lines stay whole)
    if (src < 0) continue;
    const ax = src % img.w, ay = Math.floor(src / img.w), i = src * 4;
    // (5th round, his circle: through the bite in her skull showed what lay behind — the bite is a WOUND now: torn
    // flesh at its rim, dark and glowing inside, never a see-through hole)
    if (s.mordida) {
      const dm = Math.hypot(p.x - s.mordida.x, p.y - s.mordida.y);
      if (dm < s.mordida.r) {
        const h = hashD(Math.round(p.x * 2), Math.round(p.y * 2), 41);
        put(X, Y, dm > s.mordida.r - 1.6 ? (h < 0.5 ? [120, 30, 24] : [70, 18, 18]) : h < 0.12 ? [255, 120, 44] : h < 0.5 ? [44, 10, 12] : [24, 6, 10]);
        continue;
      }
    }
    let rr = dados[i], g = dados[i + 1], b = dados[i + 2];
    if (!brilha(rr, g, b)) {
      const q = (ay * img.w + ax) * 3, [vx, vy] = vira(nC[q], -nC[q + 1]);
      const k = D.semLuz ? 1 : realce(A.luzCabeca, n0[q], n0[q + 1], n0[q + 2], vx, -vy, nC[q + 2]);
      rr *= k; g *= k; b *= k;
    } else if (s.olhoAceso && b > rr + 40) { rr = rr + (220 - rr) * 0.5; g = g + (245 - g) * 0.5; b = b + (255 - b) * 0.5; }
    put(X, Y, [Math.min(255, rr), Math.min(255, g), Math.min(255, b)]);
  }
}

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
  const { trilha, ramos } = trilhaFissura(N);
  // the lip's inner edge (its pixels touching the hole): where her body scrapes, it heats (4th round)
  const bordaLabio = new Uint8Array(W * H);
  for (let y = N.rombo.labio.y; y < H; y++) for (let x = N.rombo.x0 - 14; x <= N.rombo.x1 + 14; x++) {
    const i = y * W + x;
    if (!naFrente[i]) continue;
    // (only against the HOLE itself — inside the breach's ring, below y 128: not the texture's top row, not the gaps
    // between the plates)
    const furo = (X, Y) => X >= N.rombo.x0 && X <= N.rombo.x1 && Y >= 128 && Y < H && !naFrente[Y * W + X];
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => furo(x + a, y + b))) bordaLabio[i] = 1;
  }
  // the band of the lip within 6 px of that edge: the only metal her body really crosses (the rest of the strip is the
  // hull she passes in front of) — the weld lives here (5th round)
  const pertoBorda = new Uint8Array(W * H);
  {
    let fila = [];
    for (let i = 0; i < W * H; i++) if (bordaLabio[i]) { pertoBorda[i] = 1; fila.push(i); }
    for (let d = 2; d <= 10; d++) { // (6th round (2): 10 px — more of the rim throws sparks and smoke)
      const prox = [];
      for (const i of fila) for (const o of [1, -1, W, -W]) { const j = i + o; if (j >= 0 && j < W * H && naFrente[j] && !pertoBorda[j]) { pertoBorda[j] = d; prox.push(j); } }
      fila = prox;
    }
  }
  return { W, H, fundo, nave, naFrente, bordaLabio, pertoBorda, trilha, ramos, mascara: new Int16Array(W * H), N, med, arte: null };
}

// the venom, dark teal → toxic yellow-green → a near-white bubble (the green head's own family)
export const VENENO = [[10, 30, 24], [18, 60, 40], [28, 110, 66], [52, 168, 92], [104, 224, 116], [170, 248, 140], [224, 255, 186], [244, 255, 226]];

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
  const comArte = D.arte && s.modoCorpo && s.modoCorpo !== 'blocos';
  const corpo = (filtro) => (comArte ? corpoArte(D, s, put, filtro) : tubo(filtro));
  corpo((a) => a.toca);
  const cabecaNaToca = naToca(P.cabeca.pescoco, N);
  if (cabecaNaToca) cabeca();
  for (let i = 0; i < W * H; i++) if (D.naFrente[i]) { const j = i * 4; out[j] = D.fundo[j]; out[j + 1] = D.fundo[j + 1]; out[j + 2] = D.fundo[j + 2]; }
  // (6th round: no lit edges on the lip — he: they look "voando" all round the hole; the sparks and the smoke hide the
  // scrape well enough on their own)

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
  corpo((a) => !a.toca);
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
    if (D.arte && s.modoCorpo && s.modoCorpo !== 'blocos') { cabecaArte(D, s, put); return; }
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
  // (3rd round, his circles on the crack: the columns BURST OUT OF THE CRACK — a rupture in the R3 line, the plates torn
  // open, the slit lit green; the gas leaves it up to y ~70 and spills down to the screen's foot, narrower: the source
  // reads as the crack, and the whole height still hurts — under the crest is no hiding place)
  for (const g of s.geis) {
    if (t < g.tColuna || t >= g.tFim) continue;
    const k = (t - g.tColuna) / N.geiser.coluna, y0 = D.trilha[Math.max(0, Math.min(W - 1, Math.round(g.x)))];
    // (5th round, his circle: no mirror going down — the venom leaves the crack and goes UP only)
    const sobe = Math.min(1, k / 0.15), topo = y0 - (y0 - N.geiser.topo) * sobe, pe = y0 + 1;
    const L = N.geiser.largura / 2;
    // the rupture: the slit torn open along the crack, its lips lifted and catching the light
    for (let dx = -11; dx <= 11; dx++) {
      const x = Math.round(g.x + dx), abre = Math.max(0, 1 - Math.abs(dx) / 11), h = Math.round(1 + 2 * abre);
      for (let dy = -h; dy <= h; dy++) put(x, y0 + dy, Math.abs(dy) < h ? [210, 255, 225] : [20, 60, 34], Math.abs(dy) < h ? 0.9 : 0.8);
      put(x, y0 - h - 1, [120, 136, 150], 0.8 * abre); put(x, y0 + h + 1, [90, 100, 112], 0.6 * abre);
    }
    // (4th round, his note: "o efeito do geiser de veneno pode ficar melhor") the venom FLOWS up the column — its
    // texture scrolls up at ~170 px/s, the edges churn in waves running up, bubbles rise in it; at the top it billows out
    // into a cloud; at the end it thins out from the crack up
    const flui = t * 170, fimK = k > 0.8 ? (k - 0.8) / 0.2 : 0;
    for (let y = Math.floor(topo); y < pe; y++) {
      const acima = y <= y0, dist = acima ? y0 - y : y - y0;
      const onda = 0.82 + 0.18 * Math.sin((y + flui) / 5 + g.x) * Math.sin((y + flui) / 13);
      const larg = (acima ? L : L * 0.7) * Math.min(1, 0.3 + dist / 12) * onda; // narrow at the crack, opening out
      if (acima && fimK > 0 && dist < fimK * (y0 - N.geiser.topo)) continue; // (thinning out from the crack up)
      for (let dx = -Math.ceil(larg); dx < larg; dx++) {
        const yf = Math.floor((y + flui) / 2), n = hash(g.x + dx, yf, 3), d = Math.abs(dx + 0.5) / larg;
        if (d > 0.86 + 0.14 * hash(yf >> 1, g.x, 5)) continue;
        if (acima && y < topo + 5 && hash(dx, y, f) > (y - topo) / 5) continue;
        const c = d < 0.22 ? VENENO[6] : d < 0.45 ? (n < 0.5 ? VENENO[5] : VENENO[4]) : d < 0.75 ? (n < 0.3 ? VENENO[4] : VENENO[3]) : VENENO[2];
        put(g.x + dx, y, c, acima ? 0.95 : 0.85);
        if (hash(g.x + dx, yf, 11) < 0.012) put(g.x + dx, y, VENENO[7]); // a bubble rising in it
      }
    }
    // the cap: the venom billowing out where the column stops
    if (sobe >= 1) {
      const kk = Math.min(1, (k - 0.15) / 0.5);
      for (let i = 0; i < 9; i++) {
        const an = (i / 9) * Math.PI * 2 + t * 2, rr = 4 + 7 * kk;
        const cx = g.x + Math.cos(an) * rr * 1.3, cy = N.geiser.topo + 2 + Math.sin(an) * rr * 0.6 - 3 * kk;
        disco(cx, cy, 3 + 2.5 * kk, i % 2 ? VENENO[3] : VENENO[4], 0.55 * (1 - fimK));
      }
      disco(g.x, N.geiser.topo + 1, 4 + 3 * kk, VENENO[5], 0.5 * (1 - fimK));
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
    if (p.pedaco) { // a piece of her (the skull blown apart): its own pixels, carried whole, darkening and fading; a few
      // embers at its torn edge
      const fim = p.idade / p.vida, esc = 1 - 0.55 * fim, some = fim > 0.7 ? 1 - (fim - 0.7) / 0.3 : 1;
      for (const q of p.pedaco) {
        const brasa = q.borda && q.brasa && fim < 0.7;
        put(p.x + q.dx, p.y + q.dy, brasa ? [255, 130, 50] : [q.c[0] * esc, q.c[1] * esc, q.c[2] * esc], some);
      }
    } else if (p.gota) { // a globule of her fluid: stretched along its flight, an orange glint on the bigger ones
      const v = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / v, uy = p.vy / v, cauda = Math.min(5, v * 0.035);
      for (let k = 0; k <= cauda; k += 0.5) put(p.x - ux * k, p.y - uy * k, p.cor, a * (1 - k / (cauda + 1)));
      if (p.tam > 1) { disco(p.x, p.y, p.tam, p.cor, a); put(p.x - 0.5, p.y - 0.5, [255, 150, 60], a * 0.9); }
    } else if (p.anel) { // a shock ring
      const r = p.tam * (1 + (p.idade / p.vida) * 3);
      const n = Math.max(24, Math.round(r * 6));
      for (let i = 0; i < n; i++) { const an = (i / n) * Math.PI * 2; put(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r, p.cor, a); }
    } else if (p.tam > 1) disco(p.x, p.y, p.tam * (p.cresce ? 1 + p.idade / p.vida : 1), p.cor, a);
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
    const i = (ay * M.w + ax) * 4, A = D.arte?.cabeca;
    out.push({ x, y, c: A ? [A.data[i], A.data[i + 1], A.data[i + 2]] : null });
  }
  return out;
}
export const bocaNaTela = (P, med) => cabecaParaTela(P.cabeca, med, med.cabeca.boca);
export const olhoNaTela = (P, med) => cabecaParaTela(P.cabeca, med, med.cabeca.olho);
