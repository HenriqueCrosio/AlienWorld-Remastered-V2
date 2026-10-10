// THE HULL SENTINEL (10/10, his call after the strike-twist was dropped: "uma skill mais simples, que mostre o corpo
// dela inteiro — uma animação mais simples é mais fácil de ficar boa"). The serpent is the 63-3 he picked, EXACTLY
// (every gesture is PixMiniMax animated straight from it, in place, and returns to it):
//   rise from behind the hull (the code slides the drawing up; the crest hides what is still inside) → sway (idle) →
//   the spines flare and glow (espinhos) and his 3 trios fly straight at the ship with open lanes → sway → the strike
//   (bote: rears up, snaps the head out, pulls back) → sinks back into the hull.
//   node scripts/_elites/_sentinela-demo.mjs [idle] [espinhos] [bote]   (take numbers, default 1 1 1)
import fs from 'node:fs';
import sharp from 'sharp';
import { ampliar, colar, girar, ler, novo } from './_pixel-lib.mjs';
import { CRISTA, mapa, nave, px, recorte } from './_cena-casco.mjs';

const D = 'docs/superpowers/folhas/2026-10-10/elites/sentinela';
const [ti = '1', te = '1', tb = '1'] = process.argv.slice(2);
const clipe = async (dir) => {
  const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length;
  return Promise.all([...Array(n).keys()].map((i) => ler(`${dir}/${i}.png`)));
};
// His note (10/10): the spine glow was too hot (r up to 254 over ~1600px, against ~140 over 81px in the base pose).
// Every red-dominant pixel is pulled down toward the base's dark maroon, faded in by how red it is (BRILHO=<factor>).
const BRILHO = Number(process.env.BRILHO ?? 0.45);
function apagar(q) {
  for (let i = 0; i < q.d.length; i += 4) {
    const [r, g, b] = [q.d[i], q.d[i + 1], q.d[i + 2]];
    const w = Math.max(0, Math.min(1, (r - Math.max(g, b) - 20) / 60));
    if (!w) continue;
    const k = 1 - w * (1 - BRILHO);
    // Darker AND less saturated: green/blue climb toward the base glow's ratio (~0.3 of red), so it reads maroon.
    // (All three channels dim together, or the hot pinkish cores — 247,188,174 — turn teal.)
    const [r2, g2, b2] = [r * k, g * k, b * k];
    q.d[i] = Math.round(r2); q.d[i + 1] = Math.round(g2 + (Math.max(g2, r2 * 0.3) - g2) * w); q.d[i + 2] = Math.round(b2 + (Math.max(b2, r2 * 0.3) - b2) * w);
  }
  return q;
}
const IDLE = await clipe(`${D}/idle-${ti}`), ESP = (await clipe(`${D}/espinhos-${te}`)).map(apagar), BOTE = await clipe(`${D}/bote-${tb}`);

const FPS = 25, ANIM = 12, J = { x: 92, y: 14, w: 260, h: 202 }, cr = CRISTA - J.y;
const NAVE0 = { x: 64, y: 74 };
// The base pose's bottom row in the 256 canvas: she stands with it ~8px inside the hull.
const base = IDLE[0];
let fundo = 0, esq = 256;
for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) if (base.d[(y * base.w + x) * 4 + 3] > 64) [fundo, esq] = [y, Math.min(esq, x)];
const FRENTE = 130; // her front (left) edge in the window (at 150 her tail left the screen)
const X = FRENTE - esq;
let topo = 256;
for (let y = 0; y < base.h && topo === 256; y++) for (let x = 0; x < base.w; x++) if (base.d[(y * base.w + x) * 4 + 3] > 64) { topo = y; break; }
// His drawing (10/10): she stands HALF inside the hull — the crest cuts her body, as if rearing out of the hull's
// side. VISIVEL = the fraction of her height above the crest.
const VISIVEL = Number(process.env.VISIVEL ?? 0.58);
const Y_DE_PE = cr - topo - Math.round(VISIVEL * (fundo - topo));

// His 2nd drawing (10/10): the whole creature TILTED clockwise (head up) so the strike points at the ship. Pivot =
// the middle of her body where the crest cuts it, so she stays planted in the hull. GIRO=<degrees>. The tilt is a
// RotSprite (Scale2x ×3 → nearest rotate → pick each 8×8 block's centre): pixel art rotated without the jagged smear.
const GIRO = (Number(process.env.GIRO ?? 15) * Math.PI) / 180;
const opaco = (q, x, y) => q.d[(y * q.w + x) * 4 + 3] > 64;
const PIVO = (() => {
  const row = cr - Y_DE_PE;
  let x0 = -1, x1 = -1;
  for (let x = 0; x < base.w; x++) if (opaco(base, x, row)) { if (x0 < 0) x0 = x; x1 = x; } else if (x0 >= 0) break; // the first run = the body
  return { x: (x0 + x1) / 2, y: row };
})();
function scale2x(q) {
  const W = q.w * 2, out = novo(W, q.h * 2);
  const at = (x, y) => (Math.min(q.h - 1, Math.max(0, y)) * q.w + Math.min(q.w - 1, Math.max(0, x))) * 4;
  const eq = (a, b) => q.d.readUInt32LE(a) === q.d.readUInt32LE(b);
  for (let y = 0; y < q.h; y++)
    for (let x = 0; x < q.w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), Dd = at(x, y + 1);
      const ok = !eq(C, B) && !eq(A, Dd);
      const src = [ok && eq(C, A) ? A : P, ok && eq(A, B) ? B : P, ok && eq(Dd, C) ? C : P, ok && eq(B, Dd) ? B : P];
      for (const [k, [dx, dy]] of [[0, 0], [1, 0], [0, 1], [1, 1]].entries()) q.d.copy(out.d, ((y * 2 + dy) * W + x * 2 + dx) * 4, src[k], src[k] + 4);
    }
  return out;
}
const ROT = (() => {
  if (!GIRO) return { f: (q) => q, ox: 0, oy: 0 };
  // Where the pivot lands in the rotated (and re-shrunk) canvas: girar keeps the canvas centre at the output centre.
  const W = Math.ceil(Math.abs(256 * 8 * Math.cos(GIRO)) + Math.abs(256 * 8 * Math.sin(GIRO))) + 2, M = Math.floor(W / 8);
  const dx = PIVO.x - 128, dy = PIVO.y - 128, c = Math.cos(GIRO), sn = Math.sin(GIRO);
  const px2 = W / 16 + c * dx - sn * dy, py2 = W / 16 + sn * dx + c * dy;
  const f = (q) => {
    const g = girar(scale2x(scale2x(scale2x(q))), GIRO), out = novo(M, M);
    for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) g.d.copy(out.d, (y * M + x) * 4, ((y * 8 + 4) * g.w + x * 8 + 4) * 4, ((y * 8 + 4) * g.w + x * 8 + 4) * 4 + 4);
    return out;
  };
  return { f, ox: Math.round(PIVO.x - px2), oy: Math.round(PIVO.y - py2) };
})();
for (const a of [IDLE, ESP, BOTE]) a.splice(0, a.length, ...a.map(ROT.f));
// From here on every frame is the tilted one, drawn at (X + OX, y + OY).
const OX = ROT.ox, OY = ROT.oy;
const bR = IDLE[0];
let topoR = bR.h, esqR = bR.w;
for (let y = 0; y < bR.h; y++) for (let x = 0; x < bR.w; x++) if (opaco(bR, x, y)) { topoR = Math.min(topoR, y); esqR = Math.min(esqR, x); }
const FRENTE_R = X + OX + esqR;
const Y_FUNDO = cr + 2 - topoR - OY; // her top row just under the crest line

// Timeline (s): [start, end, what]
const T = { sobe: [0.3, 1.0], idle1: [1.0, 1.8], esp: [1.8, 1.8 + ESP.length / ANIM], idle2: [0, 0], bote: [0, 0], idle3: [0, 0], desce: [0, 0] };
T.idle2 = [T.esp[1], T.esp[1] + 0.6];
T.bote = [T.idle2[1], T.idle2[1] + BOTE.length / ANIM];
T.idle3 = [T.bote[1], T.bote[1] + 0.4];
T.desce = [T.idle3[1], T.idle3[1] + 0.6];
const FIM = T.desce[1] + 0.6;
const ease = (u) => 1 - (1 - u) ** 3;
const no = (t, [a, b]) => t >= a && t < b;

function pose(t) {
  if (no(t, T.esp)) return ESP[Math.min(ESP.length - 1, Math.floor((t - T.esp[0]) * ANIM))];
  if (no(t, T.bote)) return BOTE[Math.min(BOTE.length - 1, Math.floor((t - T.bote[0]) * ANIM))];
  // The sway: its 17 frames back and forth (yoyo) at 10 fps.
  const k = Math.floor(t * 10) % (2 * (IDLE.length - 1));
  return IDLE[k < IDLE.length ? k : 2 * (IDLE.length - 1) - k];
}
function altura(t) {
  if (t < T.sobe[0]) return null;
  if (t < T.sobe[1]) return Y_FUNDO + (Y_DE_PE - Y_FUNDO) * ease((t - T.sobe[0]) / (T.sobe[1] - T.sobe[0]));
  if (t < T.desce[0]) return Y_DE_PE;
  if (t < T.desce[1]) { const u = (t - T.desce[0]) / (T.desce[1] - T.desce[0]); return Y_DE_PE + (Y_FUNDO - Y_DE_PE) * u * u; }
  return null;
}

// His spines: 3 trios at the glow's peak (espinhos frames 6, 8, 10), each out of her FRONT EDGE at its height, all
// flying the same heading (at the ship) on parallel lanes 26px apart — climb out of the rows, or thread a gap.
const ESPINHO = mapa(['.OOOOOO........', 'OFRrMMhhHHsssOO', '.OOOOOOOO......']);
const espinhos = [];
{
  const yEsp = Y_DE_PE;
  const q0 = ESP[8];
  // The aim: from her chest (the middle of what shows above the crest) to the ship.
  const meio = Math.round((yEsp + OY + topoR + cr) / 2);
  const ang = Math.atan2(NAVE0.y - meio, NAVE0.x - FRENTE_R), ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  for (const [g, f] of [6, 8, 10].entries()) {
    const off = (g - 1) * 26;
    const cy = meio + ny * off;
    // Her front edge in that frame at that row.
    const q = ESP[f] ?? q0;
    const row = Math.round(Math.min(cy, cr - 4) - yEsp - OY);
    let ex = q.w;
    for (let x = 0; x < q.w; x++) if (row >= 0 && row < q.h && q.d[(row * q.w + x) * 4 + 3] > 64) { ex = x; break; }
    const x0 = ex < q.w ? X + OX + ex + 4 : FRENTE_R + nx * off;
    for (const d of [-6, 0, 6]) espinhos.push({ t0: T.esp[0] + f / ANIM, x: x0 + nx * d, y: cy + ny * d, ang });
  }
}

// LEGENDA=1: the explainer cut — a caption bar naming each step, and (while the spines fly) the two open lanes
// dotted in green. LENTO=<factor> plays it slower.
const LEGENDA = !!process.env.LEGENDA, LENTO = Number(process.env.LENTO ?? 1);
const fase = (t) =>
  t < T.sobe[1] ? ['1 · SOBE DE TRÁS DO CASCO', 'o casco esconde o que ainda está dentro']
  : t < T.esp[0] ? ['2 · BALANÇA', 'pose de espera — dá tempo de atirar nela']
  : t < T.esp[0] + 6 / ANIM ? ['3 · OS ESPINHOS ACENDEM', 'o aviso: vai disparar']
  : t < T.idle2[1] ? ['3 · DISPARA 3 TRIOS RETOS NA NAVE', 'suba acima das fileiras ou passe ENTRE elas (verde)']
  : t < T.bote[1] ? ['4 · BOTE', 'recua, dá o golpe com a boca aberta e volta']
  : ['5 · AFUNDA NO CASCO', 'some e reaparece em outro ponto'];
const legenda = async ([a, b]) =>
  sharp(Buffer.from(`<svg width="780" height="54" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="12" y="24" font-family="Consolas" font-size="19" font-weight="bold" fill="#ffb040">${a}</text><text x="12" y="45" font-family="Consolas" font-size="14" fill="#b8c2d8">${b}</text></svg>`)).png().toBuffer();
const cacheLeg = new Map();
const VAOS = (() => {
  const meio = Math.round((Y_DE_PE + OY + topoR + cr) / 2);
  const ang = Math.atan2(NAVE0.y - meio, NAVE0.x - FRENTE_R);
  return { meio, ang, t0: T.esp[0] + 6 / ANIM };
})();
const out = [];
for (let f = 0; f < Math.round(FIM * FPS); f++) {
  const t = f / FPS;
  const img = recorte(J);
  // The ship: holds, then slips into the lane between the middle trio and the upper one.
  const ny = NAVE0.y - 13 * ease(Math.max(0, Math.min(1, (t - T.esp[0] - 0.75) / 0.35)));
  colar(img, nave, NAVE0.x - nave.w / 2, ny - nave.h / 2);
  for (const e of espinhos) {
    const k = t - e.t0;
    if (k < 0) continue;
    const x = e.x + Math.cos(e.ang) * 85 * k, y = e.y + Math.sin(e.ang) * 85 * k;
    if (x < -12) continue;
    const g = girar(ESPINHO, e.ang);
    colar(img, g, x - g.w / 2, y - g.h / 2);
  }
  const y0 = altura(t);
  if (y0 !== null) {
    const q = pose(t), oy = Math.round(y0) + OY;
    for (let y = 0; y < q.h; y++)
      for (let x = 0; x < q.w; x++) {
        const o = (y * q.w + x) * 4, Y = y + oy;
        if (q.d[o + 3] > 64 && Y < cr) px(img, x + X + OX, Y, [q.d[o], q.d[o + 1], q.d[o + 2]], 1); // the hull hides the rest
      }
  }
  if (LEGENDA && t >= VAOS.t0 && t < VAOS.t0 + 2.2) {
    // The two open lanes, between the trios (offset ±13 across the line of fire), dotted from her front edge.
    const ux = Math.cos(VAOS.ang), uy = Math.sin(VAOS.ang), nx = -uy, ny = ux;
    for (const off of [-13, 13])
      for (let d = 0; d < 160; d += 4) px(img, Math.round(FRENTE_R + nx * off + ux * d), Math.round(VAOS.meio + ny * off + uy * d), [90, 255, 140], 0.7);
  }
  const quadro = await ampliar(img, 3);
  // QUADROS=<dir>: also dump each frame as PNG (for checking exact moments).
  if (process.env.QUADROS) fs.writeFileSync(`${process.env.QUADROS}/${f}.png`, quadro);
  if (!LEGENDA) out.push(quadro);
  else {
    const [a, b] = fase(t), k = a + b;
    if (!cacheLeg.has(k)) cacheLeg.set(k, await legenda([a, b]));
    out.push(await sharp({ create: { width: 780, height: 606 + 54, channels: 4, background: '#000' } })
      .composite([{ input: cacheLeg.get(k), left: 0, top: 0 }, { input: quadro, left: 0, top: 54 }]).png().toBuffer());
  }
}
const nome = `sentinela-${LEGENDA ? 'explicada' : 'demo'}-${ti}${te}${tb}-g${Math.round((GIRO * 180) / Math.PI)}${LENTO !== 1 ? '-lenta' : ''}.gif`;
await sharp(out, { join: { animated: true } }).gif({ delay: Array(out.length).fill(Math.round(1000 / FPS / LENTO)), loop: 0 }).toFile(`${D}/${nome}`);
console.log(nome, out.length, 'quadros', JSON.stringify(T));
