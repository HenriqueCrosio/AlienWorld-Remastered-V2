// BLOCO D — the carcass dorsal, round 2 (18/10). The inpaint fins sat ON THE HEAD (x 240–288 is in front of the gills,
// which are at x≈260) and read as glued on — him: "a nadadeira na cabeça do leviatã? Parecendo que foi grudada?".
// Anatomy of the 82, read at ×4: snout x≈330, eye 292,147, gills x 258–268 (the head/body line), the torn-open back
// with the ribs x 150–245, tail x≈100. On the base the dorsal sits at 50–65% from the tail → here x≈205–250, i.e.
// rising from BEHIND the rib cage. So the fin is THE BASE'S OWN dorsal (identity), not a generated one:
//   cut from the base (x 175–250, y 0–44) → reduced to the carcass scale (body 230 px vs 363 → ×0.63) → leaned back
//   (shear) and torn (a bite out of the trailing edge, a ragged tip) → snapped to the carcass palette → placed with its
//   base on the back line behind the ribs; bone pixels of the 82 stay IN FRONT of it.
//   node scripts/_leviata/_carcaca-dorsal-base.mjs <outDir> [baseX=190] [baseY=100] [lean=0.2] [escala=0.8] [rasgo=1]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [outDir, BX_S = '190', BY_S = '100', LEAN_S = '0.2', ESC_S = '0.8', RASGO_S = '1'] = process.argv.slice(2);
const RASGO = RASGO_S === '1';
const [BX, BY, LEAN, ESC] = [BX_S, BY_S, LEAN_S, ESC_S].map(Number);
const SRC = 'docs/superpowers/folhas/2026-10-18/leviata/cenas/cru/carcaca-x1-82-so-carcaca.png';
const BASE = 'docs/superpowers/folhas/2026-10-18/leviata/aprovado/leviata-base.png';
fs.mkdirSync(outDir, { recursive: true });

// 1. The fin, cut and reduced.
const corte = { left: 175, top: 0, width: 76, height: 45 };
const red = await sharp(BASE).extract(corte).resize({ width: Math.round(corte.width * ESC), kernel: 'mitchell' })
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { data: fd, info: fi } = red;
const FW = fi.width, FH = fi.height;

// 2. Lean + tear, into a wider buffer (the shear pushes the tip left).
const PAD = Math.ceil(FH * LEAN) + 2;
const OW = FW + PAD, OH = FH;
const fin = Buffer.alloc(OW * OH * 4, 0);
for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
  const i = (y * FW + x) * 4;
  if (fd[i + 3] < 120) continue;
  const alto = (FH - 1 - y) / (FH - 1); // 0 at the base, 1 at the tip
  // Torn: a bite out of the trailing (left) edge around the middle, and the tip ragged.
  const xs = x / FW;
  // (shallow: a deep bite severed the tip into a floating shard)
  if (RASGO && alto > 0.48 && alto < 0.62 && xs < 0.1 + 0.12 * Math.sin((alto - 0.48) * 22)) continue;
  if (alto > 0.86 && (x * 7 + y * 3) % 5 < 2) continue;
  const nx = Math.round(x + PAD - LEAN * (FH - 1 - y));
  const o = (y * OW + nx) * 4;
  fin[o] = fd[i]; fin[o + 1] = fd[i + 1]; fin[o + 2] = fd[i + 2]; fin[o + 3] = 255;
}

// 3. The carcass palette (inside the 24/09 ellipse), and the snap. The carcass is lit colder and darker than the
//    base sheet: the fin is darkened a touch first so it sits in the same night.
const { data: cd, info: ci } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = ci.width, H = ci.height;
const pal = new Map();
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (((x - 214) / 130) ** 2 + ((y - 132) / 58) ** 2 > 1) continue;
  const i = (y * W + x) * 4;
  pal.set((cd[i] << 16) | (cd[i + 1] << 8) | cd[i + 2], 1);
}
const PAL = [...pal.keys()].map((c) => [c >> 16, (c >> 8) & 255, c & 255]);
const snap = (r, g, b) => {
  let m = PAL[0], d0 = Infinity;
  for (const c of PAL) {
    const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
    if (d < d0) { d0 = d; m = c; }
  }
  return m;
};

// 4. Place: the fin's base row sits on y = BY, its left edge (before the lean) at x = BX.
//    ⚠️ Round 3 painted the fin OVER the red flesh between the ribs and over the wound, with a straight line at its
//    base — him: "é nítido que foi colado ... jogue a nadadeira para trás da costela". So the fin only shows where the
//    82 has BACKGROUND: sky and mountains, flooded from the top of the frame through bluish pixels (b > r, lum ≥ 24, not
//    warm). The flood stops at the carcass outline, the bone and the flesh, so everything of the body stays in front
//    and the fin's lower edge follows the carcass silhouette.
const osso = (i) => cd[i] > 150 && cd[i + 1] > 125 && cd[i + 2] > 85 && cd[i] - cd[i + 2] > 30;
const fundo = new Uint8Array(W * H);
{
  const ehFundo = (p) => {
    const i = p * 4, r = cd[i], g = cd[i + 1], b = cd[i + 2];
    return b > r + 6 && 0.3 * r + 0.59 * g + 0.11 * b >= 24 && !osso(i);
  };
  const fila = [];
  for (let x = 0; x < W; x++) if (ehFundo(x)) { fundo[x] = 1; fila.push(x); }
  for (let k = 0; k < fila.length; k++) {
    const p = fila[k], x = p % W, y = (p / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy, q = yy * W + xx;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H || fundo[q] || !ehFundo(q)) continue;
      fundo[q] = 1; fila.push(q);
    }
  }
}
const out = Buffer.from(cd);
const X0 = BX - PAD, Y0 = BY - OH + 1;
const naFin = new Uint8Array(W * H);
for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
  const f = (y * OW + x) * 4;
  if (!fin[f + 3]) continue;
  const X = X0 + x, Y = Y0 + y;
  if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
  const i = (Y * W + X) * 4;
  if (!fundo[Y * W + X]) continue;
  const [r, g, b] = snap(fin[f] * 0.85, fin[f + 1] * 0.88, fin[f + 2] * 0.95);
  out[i] = r; out[i + 1] = g; out[i + 2] = b;
  naFin[Y * W + X] = 1;
}

// 4b. The leftovers: fin pieces that only peek through a gap between the ribs as a few loose pixels read as dirt,
//     not as a fin behind the bone. Islands under 12 px go back to the 82's pixels.
{
  const visto = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    if (!naFin[p] || visto[p]) continue;
    const ilha = [p];
    visto[p] = 1;
    for (let k = 0; k < ilha.length; k++) {
      const q = ilha[k], x = q % W, y = (q / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const r = (y + dy) * W + x + dx;
        if (naFin[r] && !visto[r]) { visto[r] = 1; ilha.push(r); }
      }
    }
    if (ilha.length >= 12) continue;
    for (const q of ilha) { naFin[q] = 0; for (let k = 0; k < 4; k++) out[q * 4 + k] = cd[q * 4 + k]; }
  }
}

// 5. The light of the place, so it does not read pasted on: the rest of the hull has a blue-steel rim on its top
//    edges. Rim on the LEADING edge, only where the sky is beyond it (never against the body). ⚠️ The lava vein of
//    round 3 is gone: with the base hidden behind the ribs it was left as a loose orange stroke on the edge.
const ARO = snap(78, 92, 112);
const pinta = (X, Y, c) => { const i = (Y * W + X) * 4; out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2]; };
for (let Y = 0; Y < BY - 3; Y++) for (let X = 0; X < W - 1; X++) {
  const dir = Y * W + X + 1;
  if (naFin[Y * W + X] && !naFin[dir] && fundo[dir]) pinta(X, Y, ARO);
}
const nome = `dorsal-base-${BX}-${BY}-${LEAN}-${ESC}-r${RASGO ? 1 : 0}`;
await sharp(out, { raw: ci }).png().toFile(path.join(outDir, `${nome}.png`));
// The zoom to judge it BEFORE showing: the back and the head, ×4.
await sharp(out, { raw: ci }).extract({ left: 120, top: 55, width: 230, height: 110 }).resize(920, 440, { kernel: 'nearest' })
  .png().toFile(path.join(outDir, `${nome}-zoom.png`));
console.log(nome, `fin ${OW}×${OH} at ${X0},${Y0}`);
