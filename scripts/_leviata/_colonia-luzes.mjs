// BLOCO D · chapter 5, the WIDE SHOT (19/10). His note: "a colônia é representada por um asset, só que uma colônia
// vista do espaço, normalmente, são pontos de luzes (igual o satélite capta das cidades à noite)". The 44×13 building
// sprite read as a sticker on the moon. Now the colony is its NIGHT LIGHTS, baked in pixel at native resolution
// (`efeito-de-cena-assado-em-pixel`): 1 px points on the ground plane, squashed by the low angle (the craters around
// it are ~0.33 tall), with a dim haze of light pollution around the dense part. Drawn with ADD in the game, so the
// points light the ground instead of sitting on it.
// Sheet: N frames of FW×FH, the impact point at (CX, CY). Frame 0 = all lit; frames 1..N-1 = the grid FAILING (random
// points dimmed or out) — the flicker as the body comes down.
//   node scripts/_leviata/_colonia-luzes.mjs <nucleo|anel|grade> <out.png> [seed]
import sharp from 'sharp';

const [DESENHO = 'nucleo', OUT = 'public/sprites/f8-colonia-luzes.png', SEED_S = '7'] = process.argv.slice(2);
export const FW = 160, FH = 48, CX = 80, CY = 28, N = 6;
const SQ = 0.33;

let s = Number(SEED_S) * 0x9e3779b1;
const rnd = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const gauss = () => { let u = 0; for (let k = 0; k < 4; k++) u += rnd(); return (u - 2) / 0.58; };

// Points on the GROUND: u along the screen x, v into depth (projected by SQ). b = brightness 0..1.
const pts = [];
const ponto = (u, v, b) => pts.push({ u, v, b: Math.max(0, Math.min(1, b)) });
const estrada = (u0, v0, u1, v1, passo, b0, b1, curva = 0) => {
  const L = Math.hypot(u1 - u0, v1 - v0), n = Math.max(1, Math.round(L / passo));
  for (let k = 0; k <= n; k++) {
    const t = k / n, bend = curva * Math.sin(Math.PI * t);
    const nu = -(v1 - v0) / L, nv = (u1 - u0) / L;
    if (rnd() < 0.18) continue; // a road is not a ruler: gaps
    ponto(u0 + (u1 - u0) * t + nu * bend + gauss() * 0.4, v0 + (v1 - v0) * t + nv * bend + gauss() * 0.4, b0 + (b1 - b0) * t + gauss() * 0.08);
  }
};
const bairro = (u, v, r, n, b) => { for (let k = 0; k < n; k++) ponto(u + gauss() * r, v + gauss() * r, b * (0.7 + 0.3 * rnd()) - 0.15 * Math.abs(gauss())); };

if (DESENHO === 'nucleo') {
  // The organic city: a dense core, roads radiating out at uneven angles, suburbs strung at their ends.
  bairro(0, 0, 5, 70, 1.0);
  bairro(0, 0, 10, 60, 0.75);
  const angs = [0.15, 1.2, 2.3, 3.0, 3.9, 5.1];
  for (const a of angs) {
    const L = 26 + 26 * rnd();
    const u1 = Math.cos(a) * L * 1.3, v1 = Math.sin(a) * L;
    estrada(Math.cos(a) * 6, Math.sin(a) * 6, u1, v1, 2.2, 0.7, 0.35, (rnd() - 0.5) * 8);
    if (rnd() < 0.7) bairro(u1, v1, 3 + 2 * rnd(), 10 + Math.floor(12 * rnd()), 0.6);
  }
  bairro(-48, 14, 4, 16, 0.55);
  bairro(44, -22, 3, 10, 0.5);
} else if (DESENHO === 'anel') {
  // The crater-rim colony: habitats along the rim of a crater, a hub in the middle, spokes, and two outposts linked
  // by a long dotted road — the lunar colony read from orbit.
  const R = 24;
  for (let a = 0; a < Math.PI * 2; a += 0.075) {
    if (Math.sin(a * 3 + 1) < -0.75) continue; // a stretch of the rim still dark
    const r = R + gauss() * 1.4;
    ponto(Math.cos(a) * r * 1.15, Math.sin(a) * r, 0.75 + 0.25 * rnd() - (Math.sin(a) < 0 ? 0.15 : 0));
    if (rnd() < 0.35) ponto(Math.cos(a) * (r + 2.5) * 1.15, Math.sin(a) * (r + 2.5), 0.45);
  }
  bairro(0, 0, 3, 26, 1.0);
  for (const a of [0.5, 2.6, 4.4]) estrada(Math.cos(a) * 4, Math.sin(a) * 4, Math.cos(a) * (R - 2) * 1.15, Math.sin(a) * (R - 2), 2.5, 0.8, 0.6);
  estrada(R * 1.15, 4, 62, -14, 3, 0.55, 0.4, 5);
  bairro(64, -15, 3, 12, 0.6);
  estrada(-R * 1.15, 6, -60, 22, 3, 0.5, 0.35, -4);
  bairro(-62, 23, 2.5, 9, 0.5);
} else if (DESENHO === 'vale') {
  // The valley colony (a planned grid squashed into a smear at this angle and was dropped): the lights strung along a
  // winding canyon floor, like a river valley seen from orbit — a thin dense ribbon, swelling into towns, the biggest
  // one at the bend where the body lands; a few side roads climbing out of the valley.
  const curso = (u) => 16 * Math.sin(u / 22 + 0.6) + 6 * Math.sin(u / 9 + 2);
  const cidades = [[0, 1.0, 6, 70], [-46, 0.65, 3.5, 22], [40, 0.6, 3, 18], [-74, 0.45, 2.5, 10]];
  for (let u = -82; u <= 72; u += 1.1) {
    const perto = Math.max(...cidades.map(([cu, b, r]) => b * Math.exp(-((u - cu) ** 2) / (2 * (r * 2.2) ** 2))));
    if (rnd() < 0.25 - 0.2 * perto) continue;
    ponto(u + gauss() * 0.5, curso(u) + gauss() * (1 + 2.5 * perto), 0.4 + 0.5 * perto + gauss() * 0.06);
  }
  for (const [cu, b, r, n] of cidades) bairro(cu, curso(cu), r, n, b);
  for (const [cu, dv] of [[-20, -18], [18, 20], [-46, 16]]) estrada(cu, curso(cu), cu + dv * 0.6, curso(cu) + dv, 2.4, 0.5, 0.3, 3);
}

// Palette: sodium amber, the core white-hot. Additive in the game, so these are the light ADDED to the ground.
const COR = (b) => (b > 0.85 ? [255, 232, 176] : b > 0.62 ? [250, 184, 96] : b > 0.4 ? [214, 122, 52] : [138, 70, 34]);
const HALO = [[46, 22, 10], [70, 34, 14]];
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

const proj = pts.map((p) => ({ x: Math.round(CX + p.u), y: Math.round(CY + p.v * SQ), b: p.b, sorte: rnd(), sorte2: rnd() }));
// The haze: the density of light around each pixel, on the ground plane (a blur of the points).
const dens = new Float32Array(FW * FH);
for (const p of proj) for (let dy = -4; dy <= 4; dy++) for (let dx = -9; dx <= 9; dx++) {
  const x = p.x + dx, y = p.y + dy;
  if (x < 0 || y < 0 || x >= FW || y >= FH) continue;
  dens[y * FW + x] += p.b * Math.exp(-(dx * dx) / 18 - (dy * dy) / 2.2);
}

const frames = [];
for (let f = 0; f < N; f++) {
  const buf = Buffer.alloc(FW * FH * 4, 0);
  const px = (x, y, c) => { if (x < 0 || y < 0 || x >= FW || y >= FH) return; const i = (y * FW + x) * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255; };
  // failing grid: in frames 1.., a share of the points is dimmed or out (more in later frames)
  const falha = f === 0 ? 0 : 0.12 + 0.05 * f;
  const fator = (p) => (f === 0 ? 1 : ((p.sorte * 7.3 + f * 0.61) % 1) < falha ? (p.sorte2 < 0.5 ? 0 : 0.45) : 1);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const d = dens[y * FW + x] * (f === 0 ? 1 : 1 - falha * 0.6);
    const lim = BAYER[y % 4][x % 4] / 16;
    if (d > 2.2 && lim < 0.75) px(x, y, HALO[1]);
    else if (d > 0.9 && lim < Math.min(0.6, (d - 0.9) * 0.5 + 0.15)) px(x, y, HALO[0]);
  }
  // dimmer points first, so the bright ones win where they overlap
  for (const p of [...proj].sort((a, b) => a.b - b.b)) {
    const k = fator(p);
    if (k === 0 || p.b * k < 0.12) continue;
    px(p.x, p.y, COR(p.b * k));
  }
  frames.push({ input: await sharp(buf, { raw: { width: FW, height: FH, channels: 4 } }).png().toBuffer(), left: f * FW, top: 0 });
}
await sharp({ create: { width: FW * N, height: FH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(frames).png().toFile(OUT);
console.log(OUT, `${DESENHO}: ${pts.length} luzes, ${N} quadros de ${FW}×${FH}, impacto em ${CX},${CY}`);
