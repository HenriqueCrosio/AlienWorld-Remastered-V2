// 31/10 — THE THREE-HEAD SERPENT'S SKILLS, MOCKED (after the CCGS; his direction: normal shots like the first serpent's,
// coloured per head; the RAIN stays; new Cuphead-style skills — the BOUNCING SPIT and the CHARGED BEAM; "para cada skill
// precisa ter uma animação diferente. Para sairmos do idle eterno"). Composited at the native 384×216 on the arena's own
// photo (`arena-semnave.png`, the hull + the breach), her in the breach WHOLE (the breach lip redrawn in front of her
// coils, her low post so no pit shows under her — the defect he circled on 31/10), each skill playing its own PixelLab
// clip (17 frames of 256², the approved frame 0 at canvas (18, 10)). The projectiles are pixel-drawn at native resolution.
// Not the engine — a concept for him to judge at real speed. Output: a webm ×3.
//   node scripts/_serpente/_habilidades-maquete.mjs <habilidade> <casco-dir> <clip-dir> <out.webm> [acao=<frame>] [cabeca=<ciano|verde|laranja>]
//   habilidade: chuva | quicante | raio | tiros | misseis   (tiros: [acoes=a,b,c] [cabecas=ciano,laranja,verde]; any: [boca.<cor>=x,y])
//   zero-g (31/10, 3rd round): quicante [jato=natural|altura|mira] = the ball on jets ([rastro=0] hides the arc's
//   trail); misseis [inclina=°] [acel=px/s²]
//   the live ball (4th round): quicante jato=vivo [ordem=a,b,c] [acoes=f1,f2,f3 | soltura=s] [instavel=1] [queda=0.85]
//   the gas + spark (5th round, replaces the bounce): gas [contra=1 | carta=1] [ign=3.5] [tau=3] [calorTiro=0.5]
//   the burning jelly (6th round): gas [geleia=pinga|racha] [globos=3] [empurra=70]; for the sheet: [png=<dir>] keeps
//   the frames, [rastreia=<file.json>] logs where the jelly is each frame
//   the three dodges + the thermometer (7th round): gas [contra=1 | carta=1] [carga=2.5] [padroes=leque,trilhos,fila]
//   [termo=<heat per shot>] [eixo=<breath's angle under the horizontal, rad>] [baixo=<the mannequin's row in the gas>]
//   the cyan's signalled sweep (8th round): varredura pose=<dir> (11th: her head's PixelLab sets + pontos.json; the
//   clip-dir argument is unused) [png=<dir>] [rastreia=<file.json>] [semente=<salvo's draw>]
//   the green and the orange move (13th round): gas pose=<dir> (the gas heads' PixelLab sets + pontos.json) — without
//   pose= the gas mock is the 7th round's, idling
//   the projectiles' looks (14th round): tiros proj=<dir> [rastreia=<file.json>] · misseis forma=<dir> (a concept baked
//   by `_projeteis-assar.mjs`) — without them both are the old mock, pixel for pixel
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const [HAB, CASCO, CLIP, OUT, ...resto] = process.argv.slice(2);
const opc = Object.fromEntries(resto.map((a) => a.split('=')));
const W = 384, H = 216, FPS = 30, CRISTA = 151;
const raw = async (a) => (await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const fundo = await raw(path.join(CASCO, 'arena-semnave.png'));
const comNave = await raw(path.join(CASCO, 'arena.png'));

// the ship's patch (the two photos' difference), centred on (70, 100)
const nave = [];
for (let y = 86; y < 114; y++) for (let x = 44; x < 94; x++) {
  const i = (y * W + x) * 4;
  if (Math.abs(comNave[i] - fundo[i]) + Math.abs(comNave[i + 1] - fundo[i + 1]) + Math.abs(comNave[i + 2] - fundo[i + 2]) > 8)
    nave.push({ dx: x - 70, dy: y - 100, c: [comNave[i], comNave[i + 1], comNave[i + 2]] });
}

// the breach lip (in front of her coils): the lip texture's opaque pixels, at the breach strip's place (origin 0.5,1 at
// x 300, y 216) — on the frame they are redrawn from the photo itself, so the grading stays the scene's
const labio = await sharp('public/sprites/serpente-rombo-labio.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const LX = 300 - 159, LY = 216 - 100;
const naFrente = new Uint8Array(W * H);
for (let y = 0; y < labio.info.height; y++) for (let x = 0; x < labio.info.width; x++) {
  if (labio.data[(y * labio.info.width + x) * 4 + 3] < 128) continue;
  const X = LX + x, Y = LY + y;
  if (X >= 0 && X < W && Y >= 0 && Y < H) naFrente[Y * W + X] = 1;
}

// her: the clip at the game's scale (0.55, nearest); the art's centre in the canvas is (137, 133); her low post
const ESC = 0.55, LADO = Math.round(256 * ESC);
const POSTO = { x: 300, y: 142 };
const ORIG = { x: Math.round(POSTO.x - 137 * ESC), y: Math.round(POSTO.y - 133 * ESC) };
const clip = [];
for (let i = 0; fs.existsSync(path.join(CLIP, `${i}.png`)); i++)
  clip.push(await sharp(path.join(CLIP, `${i}.png`)).resize(LADO, LADO, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer());
const idle = [];
for (let i = 0; i < 9; i++) {
  const img = await sharp(`public/sprites/serpente-anim-${i}.png`).resize(Math.round(238 * ESC), Math.round(246 * ESC), { kernel: 'nearest' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  idle.push(img);
}
// 01/11 (11): the cyan head's PixelLab sets for the beam (`pose=<dir>`): <dir>/<set>/<i>.png on the 256² canvas, and
// <dir>/pontos.json — per frame, where the eye and the mouth are (canvas px), and which frames are raised / middle /
// lowered (`faixa`). The sets: fechada (closed jaws, raised → lowered), aberta (open jaws, raised → lowered), abre (the
// approved frame → the jaws open, drawn back), recupera (the open jaws → snap shut, thrown back, settle)
// 02/11 (13): the gas heads' sets (`gas pose=<dir>`): abre (the approved frame → the green's jaws open, pointing down),
// sopra (the open green's neck pumping), carga (the orange draws back, its lower jaw drops), bote (that pose → its
// peck), fecha (the green closes, back to the approved frame), encolhe (the three flinch, back to the approved frame);
// pontos.json gives each frame's three mouths ({verde, laranja, ciano}, canvas px)
const CAB = {};
const PONTOS = (HAB === 'varredura' || HAB === 'gas') && opc.pose ? JSON.parse(fs.readFileSync(path.join(opc.pose, 'pontos.json'), 'utf8')) : null;
if (HAB === 'varredura' && !PONTOS) throw new Error('varredura needs pose=<dir> (11th round: her head moves)');
const CONJ = HAB === 'gas' ? ['abre', 'sopra', 'carga', 'bote', 'fecha', 'encolhe'] : ['fechada', 'aberta', 'abre', 'recupera'];
if (PONTOS) for (const nome of CONJ) {
  CAB[nome] = [];
  for (let i = 0; fs.existsSync(path.join(opc.pose, nome, `${i}.png`)); i++)
    CAB[nome].push(await sharp(path.join(opc.pose, nome, `${i}.png`)).resize(LADO, LADO, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer());
}
// 01/11 (7): her left edge on each row (the idle's frame 0, where it is drawn): a shot dies there (it hits her body)
const bordaEsq = new Int16Array(H).fill(W);
{
  const { data: f, info } = idle[0];
  const ox = Math.round(POSTO.x - info.width / 2), oy = Math.round(POSTO.y - info.height / 2);
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++)
    if (f[(y * info.width + x) * 4 + 3] >= 128 && oy + y >= 0 && oy + y < H) { bordaEsq[oy + y] = Math.min(bordaEsq[oy + y], ox + x); break; }
}
// the mouths in the idle pose (art px from the art's centre, measured on the grid 29/10), on screen
const BOCAS = { ciano: [-97, -58], verde: [-20, -73], laranja: [35, -53] };
// with the body moving (31/10, his "movimento tambem corporal"), the mouth at the action frame is not the idle's:
// `boca.<cor>=x,y` gives it in the clip's 256² canvas px. `golpe`: her knock-back (px, a spring), which the mouths follow
const golpe = { x: 0, y: 0, vx: 0, vy: 0 };
// 01/11 (7): the idle moves her heads up to ~4 px (measured on its 9 frames: the green and the orange by the mouth, the
// cyan by its skull — its jaw opens and closes). In the gas mock she idles, so the mouths (the breath's root, the stuck
// jelly) follow the frame shown (`idleAtual`, set by the main loop)
const BOCA_IDLE = {
  ciano: [[0, 0], [0, 3], [0, 4], [0, 4], [0, 2], [-1, -1], [-2, -3], [-4, -5], [-5, -7]],
  verde: [[0, 0], [0, 4], [0, 6], [0, 7], [1, 6], [2, 4], [2, 1], [3, -3], [4, -5]],
  laranja: [[0, 0], [0, 3], [-1, 4], [-2, 4], [-2, 3], [-2, 0], [-1, -2], [0, -6], [2, -8]],
};
let idleAtual = 0;
// (13th) the gas heads' set frame shown ({nome, i}; null = the idle). A mouth then moves with the frame, anchored where
// the idle's frame 0 has it (the approved frame is every set's start): the idle's hand-measured mouths stay the origin
const GCAB = { q: null };
const boca = (cor) => {
  const o = opc[`boca.${cor}`];
  if (o) { const [cx, cy] = o.split(',').map(Number); return { x: ORIG.x + cx * ESC + golpe.x, y: ORIG.y + cy * ESC + golpe.y }; }
  if (HAB === 'gas' && GCAB.q) {
    const L = PONTOS[GCAB.q.nome][cor];
    let p = L[GCAB.q.i];
    for (let j = GCAB.q.i; !p && j >= 0; j--) p = L[j];
    const p0 = PONTOS.abre[cor][0], k = LADO / 256;
    return { x: POSTO.x + BOCAS[cor][0] * ESC + (p[0] - p0[0]) * k + golpe.x, y: POSTO.y + BOCAS[cor][1] * ESC + (p[1] - p0[1]) * k + golpe.y };
  }
  const [ix, iy] = HAB === 'gas' || HAB === 'varredura' ? BOCA_IDLE[cor][idleAtual] : [0, 0];
  return { x: POSTO.x + (BOCAS[cor][0] + ix) * ESC + golpe.x, y: POSTO.y + (BOCAS[cor][1] + iy) * ESC + golpe.y };
};
const COR = { ciano: [88, 120, 255], verde: [96, 240, 136], laranja: [255, 160, 64] };
const BORDA = { ciano: [7, 10, 28], verde: [7, 18, 12], laranja: [22, 12, 4] };
const NUCLEO = { ciano: [232, 236, 255], verde: [232, 255, 240], laranja: [255, 242, 220] };

// ─── 02/11 (14th round): the projectiles' looks, pixel-drawn by `_projeteis-assar.mjs` — tiros [proj=<dir>], misseis
// [forma=<dir>] (a concept's folder: <cor>-<i>.png + meta.json). Without them the mock is the old one, pixel for pixel.
async function carregaSprites(dir) {
  if (!dir) return null;
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const q = {};
  for (const cor of ['ciano', 'verde', 'laranja']) {
    q[cor] = [];
    for (let i = 0; i < meta.quadros[cor]; i++) {
      const { data, info } = await sharp(path.join(dir, `${cor}-${i}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      q[cor].push({ data, w: info.width, h: info.height });
    }
  }
  return { ...meta, q };
}
const SPR = await carregaSprites(HAB === 'tiros' ? opc.proj : HAB === 'misseis' ? opc.forma : null);
// a sprite authored pointing right, turned to the heading (ux, uy) the way the game does it (`setRotation` with
// pixelArt + roundPixels on the 384×216 canvas): its corner snaps to the pixel grid, and every screen pixel samples the
// sprite (nearest) through the inverse turn — so the jagged diagonals are the game's own
function sprite(put, s, x, y, ux, uy) {
  const x0 = Math.round(x - s.w / 2), y0 = Math.round(y - s.h / 2), cx = x0 + s.w / 2, cy = y0 + s.h / 2;
  const R = Math.ceil(Math.hypot(s.w, s.h) / 2) + 1;
  for (let Y = Math.floor(cy) - R; Y <= Math.ceil(cy) + R; Y++) for (let X = Math.floor(cx) - R; X <= Math.ceil(cx) + R; X++) {
    const dx = X + 0.5 - cx, dy = Y + 0.5 - cy;
    const sx = Math.floor(dx * ux + dy * uy + s.w / 2), sy = Math.floor(-dx * uy + dy * ux + s.h / 2);
    if (sx < 0 || sy < 0 || sx >= s.w || sy >= s.h) continue;
    const i = (sy * s.w + sx) * 4;
    if (s.data[i + 3] > 8) put(X, Y, [s.data[i], s.data[i + 1], s.data[i + 2]], s.data[i + 3] / 255);
  }
}
// where a sprite turned nose-down (heading (0, 1)) ends at the top: the screen pixel right above its tail, on the
// middle column (the same snapping as `sprite`)
function caudaDe(s, x, y) {
  const cx = Math.round(x - s.w / 2) + s.w / 2, cy = Math.round(y - s.h / 2) + s.h / 2;
  return { x: Math.floor(cx - 0.5 + (s.h / 2 - Math.floor(s.h / 2))), y: Math.ceil(cy - s.w / 2 - 0.5) - 1 };
}
// the missile's flame in its head's colour (the serpent's ordnance: her plates and a coloured flame — two axes apart
// from the hull's launcher, gunmetal with a cold flame, and the Leviathan's, bone with an amber flame)
function chamaCor(put, x, y, ux, uy, f, k, cor) {
  const L = Math.round(2 + 4 * Math.min(2.2, f) + ((k * 7 + Math.round(x)) % 3) - 1);
  const px = -uy, py = ux;
  for (let s = 0; s <= L; s++) { // a white root, the head's near-white, its colour; sides one step cooler
    const larg = s < L * 0.5 ? 1 : 0;
    const c = s < 1 ? [255, 255, 255] : s < L * 0.45 ? NUCLEO[cor] : COR[cor];
    const lado = s < 1 ? NUCLEO[cor] : COR[cor];
    for (let w = -larg; w <= larg; w++) put(x + ux * s + px * w, y + uy * s + py * w, w ? lado : c, s > L * 0.7 ? 0.7 : w ? 0.85 : 1);
  }
}
// what a shot leaves behind, looks only (the `visual()` die): the venom drips, the ember smokes and sheds sparks
const rastros = [];
const claroesBoca = []; // (14th) the discreet mouth flash of the green and the orange


// ─── the frame ───
// `png=<dir>` keeps the frames (×3 PNGs) for the sheet's zoomed strips
const tmp = opc.png ? (fs.mkdirSync(opc.png, { recursive: true }), opc.png) : fs.mkdtempSync(path.join(os.tmpdir(), 'hab-'));
let n = 0;
async function quadro({ clipQ = null, cabQ = null, idleQ = 0, naveX = 70, naveY = 100, desenhar = () => {}, tinta = 0, treme = null, luzCab = 0, luzes = null }) {
  // (12th) `luzCab` (0–1): the cyan head's own lights power up with the beam's charge — only her light-blue pixels, only
  // in the cyan head and neck's area (the canvas' x < 90, y < 140: the green neck never comes that far left)
  // (13th) `luzes` {verde, laranja} (0–1): the same for the gas heads — the green's own green lights (her head and neck:
  // the canvas' x 80–165) pulse with each puff of her breath; the orange's amber lights (x > 135) power up with its charge
  const xLuz = ORIG.x + (90 * LADO) / 256, yLuz = ORIG.y + (140 * LADO) / 256;
  const gx = Math.round(golpe.x), gy = Math.round(golpe.y);
  const acende = (X, Y, c) => {
    if (luzes) {
      const cx = ((X - ORIG.x - gx) * 256) / LADO, cy = ((Y - ORIG.y - gy) * 256) / LADO;
      if (luzes.verde > 0.01 && cx > 80 && cx < 165 && cy < 160 && c[1] > 130 && c[1] > c[0] + 45 && c[1] > c[2] + 15) {
        const k = 0.7 * luzes.verde;
        return [c[0] + (214 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (226 - c[2]) * k];
      }
      if (luzes.laranja > 0.01 && cx > 135 && cy < 150 && c[0] > 170 && c[0] > c[1] + 45 && c[1] > c[2] + 15) {
        const k = 0.8 * luzes.laranja;
        return [c[0] + (255 - c[0]) * k, c[1] + (236 - c[1]) * k, c[2] + (196 - c[2]) * k];
      }
      return c;
    }
    if (luzCab < 0.01 || X > xLuz || Y > yLuz || !(c[2] > c[1] && c[1] > c[0] + 40 && c[2] > 150)) return c;
    const k = 0.6 * luzCab;
    return [c[0] + (215 - c[0]) * k, c[1] + (245 - c[1]) * k, c[2] + (255 - c[2]) * k];
  };
  // `treme` {x, y}: the screen's shake (px)
  // `tinta` (0–1): she flashes hot where the blast comes back onto her
  const tom = (r, g, b) => (tinta > 0 ? [r + (255 - r) * tinta * 0.32, g + (226 - g) * tinta * 0.32, b + (190 - b) * tinta * 0.32] : [r, g, b]);
  const out = Buffer.from(fundo);
  const put = (x, y, c, a = 1) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = (y * W + x) * 4;
    for (let q = 0; q < 3; q++) out[i + q] = Math.round(a >= 1 ? c[q] : out[i + q] + (c[q] - out[i + q]) * a);
  };
  // her (the clip frame, the cyan head's set frame, or the idle), then the breach lip in front of her coils
  if (clipQ != null || cabQ) {
    const f = cabQ ? CAB[cabQ.nome][cabQ.i] : clip[Math.min(clipQ, clip.length - 1)];
    for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) {
      const i = (y * LADO + x) * 4;
      if (f[i + 3] < 128) continue;
      put(ORIG.x + x + gx, ORIG.y + y + gy, acende(ORIG.x + x + gx, ORIG.y + y + gy, tom(f[i] * 0.91, f[i + 1] * 0.99, f[i + 2])));
    }
  } else {
    const { data: f, info } = idle[idleQ % 9];
    const ox = Math.round(POSTO.x - info.width / 2) + gx, oy = Math.round(POSTO.y - info.height / 2) + gy;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (f[i + 3] < 128) continue;
      put(ox + x, oy + y, acende(ox + x, oy + y, tom(f[i] * 0.91, f[i + 1] * 0.99, f[i + 2])));
    }
  }
  for (let i = 0; i < W * H; i++) if (naFrente[i]) { const j = i * 4; out[j] = fundo[j]; out[j + 1] = fundo[j + 1]; out[j + 2] = fundo[j + 2]; }
  desenhar(put);
  for (const p of nave) put(naveX + p.dx, naveY + p.dy, p.c);
  let fim = out;
  if (treme && (treme.x || treme.y)) {
    fim = Buffer.alloc(out.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sx = Math.min(W - 1, Math.max(0, x - treme.x)), sy = Math.min(H - 1, Math.max(0, y - treme.y));
      out.copy(fim, (y * W + x) * 4, (sy * W + sx) * 4, (sy * W + sx) * 4 + 4);
    }
  }
  await sharp(fim, { raw: { width: W, height: H, channels: 4 } }).resize(W * 3, H * 3, { kernel: 'nearest' }).png()
    .toFile(path.join(tmp, `${String(n++).padStart(4, '0')}.png`));
}

// a glob, pixel-drawn: dark rim, the head's colour, a near-white core (the game's shot language, bigger)
function gota(put, x, y, r, cor, squash = 1) {
  for (let dy = -r - 1; dy <= r + 1; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) {
    const d = Math.hypot(dx / squash, dy * squash);
    if (d <= r - 1.5) put(x + dx, y + dy, d < r * 0.4 ? NUCLEO[cor] : COR[cor]);
    else if (d <= r + 0.5) put(x + dx, y + dy, BORDA[cor]);
  }
  put(x - Math.round(r * 0.35), y - Math.round(r * 0.35), [255, 255, 255]);
}

// ─── 31/10 (3): ZERO-G. His note on the sheet: "o quique e a chuva não condizem com gravidade zero" — the F3 is vacuum
// (the HUD's ZERO-G, the GDD's diegetic gravity), so nothing falls. Every change of direction now has a visible cause:
// the JETS, run the way the menu's sign runs them (`src/menu/abertura.ts`): the motion comes first, and each nozzle
// fires when the acceleration asks for its push — force = max(0, −a·u) for a nozzle whose gas leaves along u.
const G = 420; // the push of the ball's top nozzle (px/s²): the old mock's gravity, so the arc is the same curve
let semente = 7;
const acaso = () => (semente = (Math.imul(semente, 1103515245) + 12345) >>> 0) / 4294967296;
// (10th round) a second die, for looks only (the electric crackle): it leaves the physics' draws, and so everything
// measured on the sheets, exactly as it was
let sementeVis = 99;
const visual = () => (sementeVis = (Math.imul(sementeVis, 1103515245) + 12345) >>> 0) / 4294967296;
// the menu's gas (numerosMenu JATOS.cores): hot white → amber flame → cold vapour; in vacuum no drag and no wind, and
// the gas keeps the body's own velocity (the exhaust speed is relative to the nozzle)
const GAS = { quente: [255, 243, 220], chama: [255, 184, 96], vapor: [158, 172, 194] };
const METAL = [70, 78, 94], METAL_LUZ = [168, 178, 196];
const gas = [];
const claroes = [];
function jato(x, y, ux, uy, forca, vxB, vyB, taxa = 420, cor = undefined) {
  const qtd = Math.floor((forca * taxa) / FPS + acaso());
  for (let i = 0; i < qtd; i++) {
    // born somewhere inside this frame: already that far out of the nozzle, so the stream is continuous, not dashes
    const ang = Math.atan2(uy, ux) + (acaso() - 0.5) * 0.45, v = 75 + acaso() * 50, idade = acaso() / FPS;
    const ex = Math.cos(ang) * v, ey = Math.sin(ang) * v;
    gas.push({ x: x + ex * idade, y: y + ey * idade, vx: vxB + ex, vy: vyB + ey, idade, vida: 0.12 + acaso() * 0.16, cor });
  }
}
// the flame itself, pixel-drawn at the nozzle (1 px gas alone does not read as fire at the native size): its length
// follows the push, a hot white root, the amber body, a red tip, flickering a pixel
function chama(put, x, y, ux, uy, f, k) {
  const L = Math.round(2 + 4 * Math.min(2.2, f) + ((k * 7 + Math.round(x)) % 3) - 1);
  const px = -uy, py = ux;
  for (let s = 0; s <= L; s++) {
    const larg = s < L * 0.55 ? 1 : 0;
    const c = s < 2 ? GAS.quente : s < L * 0.7 ? GAS.chama : [255, 112, 60];
    for (let w = -larg; w <= larg; w++) put(x + ux * s + px * w, y + uy * s + py * w, Math.abs(w) && s < 2 ? GAS.chama : c, s > L * 0.7 ? 0.75 : 1);
  }
}
// sparks off the hull's plate (a real hit), in the hot white then the given colour
function faiscas(x, y, n, cor) {
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI * (0.08 + acaso() * 0.84), v = 50 + acaso() * 90;
    gas.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, idade: 0, vida: 0.12 + acaso() * 0.18, faisca: cor });
  }
}
function passoGas() {
  for (const p of gas) {
    p.x += p.vx / FPS; p.y += p.vy / FPS; p.idade += 1 / FPS;
    if (p.y > CRISTA && p.vy > 0) { p.y = CRISTA; p.vy *= -0.25; p.vx *= 1.5; } // gas that meets the hull spreads on it
  }
  for (let i = gas.length - 1; i >= 0; i--) if (gas[i].idade > gas[i].vida) gas.splice(i, 1);
  for (const c of claroes) c.idade += 1 / FPS;
  for (let i = claroes.length - 1; i >= 0; i--) if (claroes[i].idade > 0.16) claroes.splice(i, 1);
}
function desenhaGas(put) {
  for (const p of gas) {
    const f = p.idade / p.vida;
    if (p.faisca && p.rasto) { // a streak: the hot head, a short tail back along its flight
      const v = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / v, uy = p.vy / v, L = Math.min(4, Math.max(1, v / FPS * 0.7));
      for (let s = L; s >= 0; s -= 0.5) put(p.x - ux * s, p.y - uy * s, s < 1 && f < 0.5 ? GAS.quente : p.faisca, (1 - f * 0.5) * (1 - (s / (L + 1)) * 0.7));
    }
    else if (p.faisca) put(p.x, p.y, f < 0.35 ? GAS.quente : p.faisca, 1 - f * 0.5);
    else if (p.fumaca) { // soot: a 2×2 grey puff, fading
      const c = f < 0.3 ? [122, 116, 112] : [88, 86, 92], a = 0.7 * Math.pow(1 - f, 1.1);
      put(p.x, p.y, c, a); put(p.x + 1, p.y, c, a); put(p.x, p.y + 1, c, a); put(p.x + 1, p.y + 1, c, a * 0.8);
    }
    else if (p.frio) { // cold stabilizer gas: a white puff that opens and is gone
      if (p.flash) put(p.x, p.y, [255, 255, 255]);
      else if (p.idade < 0.05) put(p.x, p.y, FRIO.quente);
      else if (p.idade < 0.13) put(p.x, p.y, FRIO.meio, 0.9);
      else put(p.x, p.y, FRIO.vapor, 0.7 * Math.pow(1 - f, 1.2));
    }
    else if (p.cor) { // (14th) a coloured exhaust: the head's near-white, its colour, then cold vapour
      if (p.idade < 0.035) put(p.x, p.y, NUCLEO[p.cor]);
      else if (p.idade < 0.1) put(p.x, p.y, COR[p.cor]);
      else put(p.x, p.y, GAS.vapor, 0.6 * Math.pow(1 - f, 1.5));
    }
    else if (p.idade < 0.035) put(p.x, p.y, GAS.quente);
    else if (p.idade < 0.1) put(p.x, p.y, GAS.chama);
    else put(p.x, p.y, GAS.vapor, 0.6 * Math.pow(1 - f, 1.5));
  }
  for (const c of claroes) { // a missile's burst on the hull: a hot core, then a thin ring that opens (no dark smudge)
    const f = c.idade / 0.16, r = 2 + f * 6;
    for (let dy = -r - 1; dy <= r + 1; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) {
      const d = Math.hypot(dx, dy);
      if (f < 0.35 && d <= r * 0.6) put(c.x + dx, c.y + dy, d < r * 0.3 ? GAS.quente : NUCLEO[c.cor]);
      else if (Math.abs(d - r) < 0.7 && f < 0.8) put(c.x + dx, c.y + dy, COR[c.cor], 1 - f);
    }
  }
}
// a small missile, 7 px long and 2 wide, along the heading (hx, hy): a near-white nose, the head's colour, a dark nozzle
function missil(put, x, y, hx, hy, cor) {
  const px = -hy, py = hx;
  for (let s = -3.5; s <= 3.5; s += 0.5) for (const w of [-1.5, 1.5]) put(x + hx * s + px * w, y + hy * s + py * w, BORDA[cor], 0.85);
  for (let s = -3; s <= 3; s += 0.5) for (const w of [-0.5, 0.5]) {
    const c = s >= 2.5 ? NUCLEO[cor] : s <= -2.5 ? METAL : COR[cor];
    put(x + hx * s + px * w, y + hy * s + py * w, c);
  }
}
// ─── 31/10 (4): his answer to the jets — "jatos de propulsão de estabilizadores mesmo. Algo mais natural" (the drawn
// nozzles and the candle flame read stiff): a REAL ball (smooth arc, it spins, loses height each bounce) that is UNSTABLE
// (a drifting push and twist) and is held on course by STABILIZER puffs of cold white gas out of its own skin. It chases
// its own ideal ballistic path (reset at every real bounce on the hull); the owed push accumulates and fires as a short
// pulse once it is worth one (sigma-delta, the way real attitude thrusters work), so the puffs fight, overshoot, settle.
// The release (his): the first ball leaves first and highest, the next one later at half the height, and so on.
const FRIO = { quente: [238, 245, 255], meio: [192, 208, 228], vapor: [146, 162, 188] };
const VIVO = {
  // the throwing order; with the normal shots' clip (`tirosK`, the heads spitting one after another) the release follows
  // its action frames (`acoes`), so each ball leaves its own open mouth
  ordem: (opc.ordem ?? 'verde,ciano,laranja').split(','),
  acoes: opc.acoes ? opc.acoes.split(',').map(Number) : null,
  passo: Number(opc.soltura ?? 0.3), altura: 112, vx: [-60, -82, -104],
  inst: Number(opc.instavel ?? 1), e: Number(opc.queda ?? 0.85),
  imp: 60, // one translation puff = this much Δv (px/s)
  impW: 2.5, // one spin puff pair = this much Δω (rad/s)
};
const SUB = 8, DT = 1 / (FPS * SUB);
const normal = () => Math.sqrt(-2 * Math.log(acaso() + 1e-9)) * Math.cos(2 * Math.PI * acaso());
function sopro(x, y, ux, uy, forca, vxB, vyB) {
  const f = Math.min(1.6, forca);
  // the flash at the vent: a few white pixels that ride with the ball for a blink
  for (let i = 0; i < 3; i++) gas.push({ x: x + ux * i, y: y + uy * i, vx: vxB + ux * 8, vy: vyB + uy * 8, idade: 0, vida: 0.05 + 0.03 * f, frio: true, flash: true });
  // the puff: a dense cone that opens slowly and fades
  const n = Math.round(8 + 14 * f);
  for (let i = 0; i < n; i++) {
    const ang = Math.atan2(uy, ux) + (acaso() - 0.5) * 0.9, v = 18 + acaso() * 48, idade = acaso() * 0.02;
    const ex = Math.cos(ang) * v, ey = Math.sin(ang) * v;
    gas.push({ x: x + ex * idade, y: y + ey * idade, vx: vxB + ex, vy: vyB + ey, idade, vida: 0.14 + acaso() * 0.18, frio: true });
  }
}
function vivoPasso(p) {
  for (let s = 0; s < SUB; s++) {
    // the instability: a push and a twist that drift (0.3 s memory)
    const k = Math.sqrt((2 * DT) / 0.3);
    p.d[0] += (-p.d[0] / 0.3) * DT + 260 * VIVO.inst * k * normal();
    p.d[1] += (-p.d[1] / 0.3) * DT + 260 * VIVO.inst * k * normal();
    p.dw += (-p.dw / 0.3) * DT + 7 * VIVO.inst * k * normal();
    p.vx += p.d[0] * DT; p.vy += p.d[1] * DT; p.om += p.dw * DT;
    p.x += p.vx * DT; p.y += p.vy * DT; p.th += p.om * DT;
    // its ideal: a free ball under G since its last bounce
    p.g.vy += G * DT; p.g.x += p.g.vx * DT; p.g.y += p.g.vy * DT;
    // owed push: G down + a spring back to the ideal (ω 8 rad/s, damping 0.55); one pulse when it is worth one
    p.need[0] += (64 * (p.g.x - p.x) + 8.8 * (p.g.vx - p.vx)) * DT;
    p.need[1] += (G + 64 * (p.g.y - p.y) + 8.8 * (p.g.vy - p.vy)) * DT;
    const m = Math.hypot(p.need[0], p.need[1]);
    if (m >= VIVO.imp) {
      const ux = p.need[0] / m, uy = p.need[1] / m;
      p.vx += p.need[0]; p.vy += p.need[1];
      sopro(p.x - ux * (p.r + 1), p.y - uy * (p.r + 1), -ux, -uy, m / VIVO.imp, p.vx, p.vy); // the gas leaves the far side
      p.need = [0, 0];
    }
    // owed spin brake: a pair of puffs from two opposite points of its skin, tangential (their pushes cancel, the twist adds)
    p.needW += -1.5 * p.om * DT;
    if (Math.abs(p.needW) >= VIVO.impW) {
      const sg = Math.sign(p.needW);
      p.om += p.needW;
      for (const a of [p.th, p.th + Math.PI]) {
        const tx = -Math.sin(a), ty = Math.cos(a);
        sopro(p.x + Math.cos(a) * (p.r + 1), p.y + Math.sin(a) * (p.r + 1), -sg * tx, -sg * ty, (Math.abs(p.needW) / VIVO.impW) * 0.6, p.vx, p.vy);
      }
      p.needW = 0;
    }
    // the hull: a real bounce, a little friction turns into spin, and the ideal restarts from here
    if (p.y >= CRISTA - p.r && p.vy > 0) {
      p.y = CRISTA - p.r; p.vy = -VIVO.e * p.vy; p.vx *= 0.96;
      p.om = p.om * 0.4 + 0.6 * (p.vx / p.r);
      p.tBate = 0;
      faiscas(p.x, CRISTA - 1, 3, COR[p.cor]);
      // the ideal restarts from the real bounce, but keeps the ball's intended sideways speed (only the hit's friction):
      // restarting from the real one let the drift add up bounce after bounce until a ball almost stopped
      p.vxAlvo *= 0.96;
      p.g = { x: p.x, y: p.y, vx: p.vxAlvo, vy: p.vy }; p.need = [0, 0];
    }
  }
  // the squash rings like a spring (overshoot, settle) instead of snapping back
  if (p.tBate >= 0) { p.tBate += 1 / FPS; p.sq = 1 + 0.3 * Math.exp(-7 * p.tBate) * Math.cos(26 * p.tBate); }
}
// the ball with a seam across it (a band through the whole disc, like a real ball's), so its spin can be seen; two short
// marks on the rim read as nozzles, which he turned down
function bola(put, x, y, r, cor, sq, th) {
  gota(put, x, y, r, cor, sq);
  const c = Math.cos(th), s = Math.sin(th);
  const anel = COR[cor].map((v) => Math.round(v * 0.62));
  const miolo = NUCLEO[cor].map((v, q) => Math.round(v * 0.55 + COR[cor][q] * 0.45));
  for (let dy = -r; dy <= r; dy++) for (let dx = -r - 1; dx <= r + 1; dx++) {
    const d = Math.hypot(dx / sq, dy * sq);
    if (d <= r - 1.5 && Math.abs(-s * dx + c * dy) < 0.6) put(x + dx, y + dy, d < r * 0.4 ? miolo : anel);
  }
}

// the ball's four nozzles (gas up, down, left, right), on its rim
const BOCAIS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const bocal = (p, ux, uy) => ({ x: p.x + ux * (p.r * p.sq + 1), y: p.y + uy * (p.r / p.sq + 1) });

// the clip played once at 12 fps (2.5 game frames per clip frame) with `acao` the frame where the skill fires
const ACAO = Number(opc.acao ?? 8);
const CARGA = Number(opc.carga ?? 1.0); // the beam's charge (s): start it once the clip's mouth is open
const DUR = Number(opc.raio ?? 1.2); // the beam's swing (s)
const PASSO = FPS / Number(opc.fps ?? 12); // game frames per clip frame (12 fps → 2.5)
const tAcao = (ACAO * PASSO) / FPS;
const durClip = (clip.length * PASSO) / FPS;
const clipEm = (t) => (t < 0 || t >= durClip ? null : Math.floor((t * FPS) / PASSO));

let naveX = 70, naveY = 100;
const JATO = opc.jato; // quicante: undefined = the old gravity mock; natural | altura | mira = the ball on jets
const TOTAL = HAB === 'gas' ? (opc.carta === '1' ? 4.8 : opc.contra === '1' ? 12.6 : 14.2) : HAB === 'varredura' ? 13.3 : HAB === 'raio' ? 4.6 : HAB === 'tiros' ? 4.4 : JATO === 'vivo' ? 6.4 : HAB === 'misseis' || JATO ? 5.6 : 5.2;
const AM = Number(opc.acel ?? 160); // the missiles' engine (px/s²): from rest above the screen, slow at the top
const TAIL = Math.sqrt((2 * (100 + 6)) / AM); // how long a wave takes to reach the mannequin's row (y 100)
// ─── 31/10 (5): THE GAS AND THE SPARK — his design, replacing the bounce ("o verde começa a soltar gás em volta deles e
// um pouco a frente, o laranja começa a fagulhar esse gás e fogos com formato de plasma começam a ir na direção da nave
// e se fragmentar"). The physics agreed with him:
//  - the gas carries its own oxidizer (a premixed propellant): in vacuum nothing else would burn;
//  - it neither hangs nor rises: it spreads evenly and thins, so it is dense (burnable) only near the mouths;
//  - zero-g fire is round: the plasma globes;
//  - a globe flies straight with the breath's velocity plus the blast's push AWAY from where the cloud was lit, and cools
//    off; it splits in a readable fan around its own line (the pieces' centre keeps the line);
//  - only fire hurts; 2–3 sparks per use;
//  - the ship's shots heat the spot they hit and a small radius around it (a subtle warm hint, not the whole cloud);
//    once a spot passes the ignition point the cloud lights from THERE, so the blast goes back onto her and the skill
//    ends; with INCENDIÁRIO (the card) it lights at the first hit.
// Her own clips for it (the green breathing, the orange sparking) do not exist yet: she idles in this mock.
// ─── 01/11 (6): his notes on that sheet —
//  - "bolas maiores como se fossem geleias [...] se desfazer ou desgrudar em pequenos pedaços [...] o comportamento de
//    algo viscoso, como se fosse liquido": the globes are now burning JELLY (`geleia=pinga|racha`, below);
//  - "quando a nave explode o gas com o tiro, precisa ficar claro que o jogador conseguiu quebrar isso [...] uma
//    explosão apontando para a cara das serpentes": lit from the ship's side, the flame runs back up the breath (a
//    flashback) and the gas in front of each face is thrown INTO that face, where it sticks and burns; the thin gas on
//    the ship's side only flashes, so nothing comes back at the ship;
//  - "não existe nada saindo da cabeça laranja que mostre que é ela fazendo isso": the orange's mouth glows and crackles
//    before each spark, then the spark jumps from it to the cloud's root with a spray of streaks.
const GC = 2, GW = Math.ceil(W / GC), GH = Math.ceil(H / GC);
const dens = new Float32Array(GW * GH), densB = new Float32Array(GW * GH);
const calor = new Float32Array(GW * GH), queima = new Float32Array(GW * GH).fill(-1), queimaN = new Float32Array(GW * GH);
// ─── 01/11 (7): his notes on that sheet — "B que depois pinga, o resto ficou bom", and:
//  - "o Leque de plasma precisa dar espaço suficiente para a nave conseguir achar o melhor caminho sem tomar dano [...]
//    alguns pingos pequenos ficam bem no espaço criado [...] 3 padrões, um para cada tiro. Quem perceber, aprende a
//    técnica" → THE THREE DODGES (below, `PADRAO`), the drops only off the back;
//  - "a pessoa que não tem o incendiar precisa carregar uma pequena barrinha [...] um termômetro pequeno que sobe a
//    temperatura, quando chegar, explode de volta na serpente [...] a vermelha vai carregar alguns segundos [...] e
//    atirar. Isso dá para o jogador ler o ataque [...] Caso tenha incendiar, a barrinha de termometro pega fogo e
//    explode" → THE THERMOMETER (below, `termo`); the orange's charge is now 2.5 s;
//  - "a cabeça verde [...] precisa fazer com que o gás saia da boca ou do nariz como um vapor para baixo em forma de
//    leque instável, hoje em dia ele está solto no rosto dela" → THE BREATH (`VAPOR`).
const GASCFG = {
  // the orange charges a few seconds before each spark; the cloud refills for 1 s between a spark and the next charge
  sopro: [0.2, 11.3], faiscas: [3.6, 7.1, 10.6], carga: Number(opc.carga ?? 2.5),
  padroes: (opc.padroes ?? 'leque,trilhos,fila').split(','),
  dVis: Number(opc.dvis ?? 0.4), dCheia: Number(opc.dcheia ?? 5), dMin: Number(opc.dmin ?? 0.9), dBolsao: Number(opc.dbolsao ?? 1.8),
  calorIgn: Number(opc.ign ?? 3.5), calorTiro: Number(opc.calorTiro ?? 0.5), calorTau: Number(opc.tau ?? 3), frente: 170,
  // the thermometer: each shot that goes through the gas adds this much (× the thickest gas it crossed, full from the
  // low bank's usual density): ~12 shots, 1.5 s of steady fire into the bank; it cools slowly
  termoTiro: Number(opc.termo ?? 1 / 12), termoEsfria: 0.04,
  contra: opc.contra === '1', carta: opc.carta === '1',
};
// the breath: out of her open jaws, down (`eixo` rad under the horizontal, 0.87 ≈ 50°: it pours past the cyan's chin,
// never over its face — at 36° the sway laid it across the cyan's face, the same "solto no rosto"), a fan ±0.22 rad
// that sways ±0.15; on the hull it spreads into a low bank that reaches out in front of her, where the ship can heat it
const VAPOR = { eixo: Math.PI - Number(opc.eixo ?? 0.87), abre: 0.22, taxa: 11 };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const nuvem = [], disparos = [], ignicoes = [], arcos = [], estouros = [], agenda = [], clarao = [], respingos = [];
let engasgou = false, tEngasgo = Infinity, tGruda = Infinity, mira = VAPOR.eixo, tinta = 0, ultimoTiro = -9, sacode = 0, pufAgora = -1;
// where her breath leaves: the front of her open jaws (the mouth point is inside, on the tongue)
const labios = () => { const b = boca('verde'); return { x: b.x - 3, y: b.y + 1.5 }; };
// the ship's centre (the hitbox's, 21×9 in the game) from where its patch is drawn
const naveC = () => ({ x: naveX - 1.5, y: naveY });
const celula = (x, y) => {
  const cx = Math.floor(x / GC), cy = Math.floor(y / GC);
  return cx < 0 || cy < 0 || cx >= GW || cy >= GH ? -1 : cy * GW + cx;
};
function linha(put, x0, y0, x1, y1, c, a = 1) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) put(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, a);
}
// soot: in vacuum it just drifts on and spreads
function fumaca(x, y, n, vx = 0, vy = 0) {
  for (let i = 0; i < n; i++) {
    const a = acaso() * Math.PI * 2, v = 4 + acaso() * 12;
    gas.push({ x: x + (acaso() - 0.5) * 3, y: y + (acaso() - 0.5) * 3, vx: vx + Math.cos(a) * v, vy: vy + Math.sin(a) * v, idade: 0, vida: 0.6 + acaso() * 0.7, fumaca: true });
  }
}

// ─── THE BURNING JELLY ───
// A blob is a soft body: its outline is a circle plus two wobble modes (l = 2 the oval, l = 3 the trefoil) that ring
// like a liquid drop — Rayleigh: ω_l² ∝ l(l−1)(l+2)/R³, so the small drops ring faster and settle sooner (viscosity
// damps them harder). Its burning skin boils (small random pushes), so it never sits still. The blast that throws it
// squashes it along the push, so it leaves wobbling. It comes apart the way a viscous liquid does: a lobe swells, a
// THREAD forms between the piece and the rest, the thread thins as it stretches (its volume kept) and snaps, beading
// into a tiny satellite drop (Rayleigh–Plateau), and both ends spring back.
//  - `geleia=pinga`: along the way it sheds small drops sideways, each from the tip of a lobe, shrinking;
//  - `geleia=racha`: it stretches sideways and tears in two, the thick thread between them beading into a third drop
//    in the middle — the readable fan of three, the middle one on the line.
// Drawn as ONE metaball field (the blobs, the drops and the threads together), so necks and pinch-offs read.
const GEL = { modo: opc.geleia ?? 'pinga', f0: 3.2, ruido: 2.3 };
const geleias = [], fios = [];
let nGel = 0;
const raioDe = (g) => Math.sqrt(g.m);
function geleia(x, y, vx, vy, R, origem, extra = {}) {
  const g = { id: nGel++, x, y, vx, vy, m: R * R, idade: 0, calor: 1, vida: 2.4, origem, A: [0, 0, 0, 0], V: [0, 0, 0, 0], ...extra };
  geleias.push(g);
  return g;
}
const omega = (g, l) => Math.min(2 * Math.PI * 9, 2 * Math.PI * GEL.f0 * Math.sqrt((l * (l - 1) * (l + 2)) / 8) * Math.pow(7 / Math.max(1, raioDe(g)), 1.5));
const amort = (g, l) => Math.min(0.7, 0.1 * Math.sqrt(7 / Math.max(1, raioDe(g))) * (l === 3 ? 1.5 : 1));
// a stretch (amp > 0) or a squash (amp < 0) along ψ on mode l: as a shape now, or as a push (the shape peaks a quarter
// of its own period later)
function deforma(g, l, psi, amp, empurrao = false) {
  const i = (l - 2) * 2, a = amp * Math.cos(l * psi), b = amp * Math.sin(l * psi);
  if (empurrao) { const w = omega(g, l); g.V[i] += a * w; g.V[i + 1] += b * w; } else { g.A[i] += a; g.A[i + 1] += b; }
}
// the outline's radius at angle th (it shrinks a little as it cools)
const contorno = (g, th) => raioDe(g) * (0.85 + 0.15 * g.calor) *
  (1 + g.A[0] * Math.cos(2 * th) + g.A[1] * Math.sin(2 * th) + g.A[2] * Math.cos(3 * th) + g.A[3] * Math.sin(3 * th));
// a drop pinches off the tip of the lobe at ψ, joined to the rest by a thread
function pinga(g, atras = false) {
  const ux = Math.cos(g.psi), uy = Math.sin(g.psi);
  const md = g.m * (0.09 + acaso() * 0.04);
  const r1 = contorno(g, g.psi);
  g.m -= md;
  // off its back (7th round) the drop leaves slower than the blob, not backwards: it trails in the blob's own lane
  const rd = Math.sqrt(md), vr = atras ? 14 + acaso() * 12 : 30 + acaso() * 16;
  // (7th round) a drop is as hot as the blob it left and smaller, so it never outlives it: late drops had lingered in
  // the lanes after their blob was gone
  const vida = atras ? Math.min(1.1 + acaso() * 0.5, Math.max(0.3, g.vida - g.idade)) : 1.1 + acaso() * 0.5;
  const d = geleia(g.x + ux * (r1 - rd * 0.2), g.y + uy * (r1 - rd * 0.2), g.vx + ux * vr, g.vy + uy * vr, rd, g.origem, { vida, calor: atras ? g.calor : 1 });
  deforma(d, 2, g.psi, 0.35); // it leaves stretched along its way out
  g.vx -= (ux * vr * md) / g.m; g.vy -= (uy * vr * md) / g.m; // the recoil (momentum)
  deforma(g, 2, g.psi, -0.22, true); // and the rest snaps back
  fios.push({ a: g, b: d, w0: Math.min(1.5, rd * 0.75), L0: Math.hypot(d.x - g.x, d.y - g.y) });
}
// it tears in two along ψ; the thick thread between the halves beads into a third drop in the middle. 7th round: torn
// ACROSS its flight (the fan) or ALONG it (a train: the front piece took more of the blast); then each piece drips off
// its back (`pingador`), and the satellite a thread leaves across a gap burns out at once (`curto`)
function racha(g) {
  g.morto = true;
  const aoLongo = g.corte === 'aoLongo';
  const ux = Math.cos(g.psi), uy = Math.sin(g.psi), r1 = contorno(g, g.psi), vr = aoLongo ? 22 : 34;
  const filho = (x, y, vx, vy, m) => geleia(x, y, vx, vy, Math.sqrt(m), g.origem,
    { vida: g.vida, idade: g.idade, calor: g.calor, pingador: !!g.corte, proxGota: g.idade + 0.18 + acaso() * 0.12 });
  const lado = (s) => {
    const p = filho(g.x + s * ux * r1 * 0.5, g.y + s * uy * r1 * 0.5, g.vx + s * ux * vr, g.vy + s * uy * vr, g.m * 0.36);
    deforma(p, 2, g.psi, 0.28); // each half leaves stretched towards where it tore
    return p;
  };
  const e = lado(-1), d = lado(1);
  const meio = filho(g.x, g.y, g.vx, g.vy, g.m * 0.2);
  deforma(meio, 2, g.psi, 0.4);
  const curto = !!g.corte && !aoLongo;
  fios.push({ a: e, b: meio, w0: 2.2, L0: Math.hypot(meio.x - e.x, meio.y - e.y), curto });
  fios.push({ a: meio, b: d, w0: 2.2, L0: Math.hypot(d.x - meio.x, d.y - meio.y), curto });
}
// a viscous blob does not bounce: it spends its push spreading, sticks to her face and burns there
function gruda(g, t) {
  const b = boca(g.alvo), ang = Math.atan2(g.vy, g.vx);
  g.preso = g.alvo; g.ox = g.x - b.x; g.oy = g.y - b.y; g.vx = 0; g.vy = 0;
  g.idade = 0; g.vida = 0.9; g.angGolpe = ang;
  // the blast pointed at her face: it leans past her, along the push
  estouros.push({ x: g.x, y: g.y, t0: t, R: g.alvo === 'verde' ? 26 : 20, ang, dur: 0.46, onda: true });
  for (let j = 0; j < (g.alvo === 'verde' ? 26 : 18); j++) {
    const a = ang + (acaso() - 0.5) * 1.8, v = 60 + acaso() * 90;
    gas.push({ x: g.x, y: g.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, idade: 0, vida: 0.1 + acaso() * 0.16, faisca: [255, 190, 80], rasto: true });
  }
  tinta = 1; sacode = Math.max(sacode, 1);
  fumaca(g.x, g.y, 10, Math.cos(ang) * 14, Math.sin(ang) * 14);
  // she is knocked back — (13th) by her own flinch (the PixelLab `encolhe`, from the first face hit), not a code spring
  if (PONTOS) tGruda = Math.min(tGruda, t);
  else { golpe.vx += Math.cos(ang) * 42; golpe.vy += Math.sin(ang) * 42; }
}
function noCasco(g, t) {
  const R = raioDe(g);
  g.preso = 'casco'; g.ox = g.x; g.oy = CRISTA - R * 0.35; g.x = g.ox; g.y = g.oy; g.vx = 0; g.vy = 0;
  g.idade = 0; g.vida = Math.min(0.9, 0.35 + R * 0.08); g.angGolpe = Math.PI / 2;
  if (R > 2.5) { estouros.push({ x: Math.round(g.x), y: Math.round(CRISTA - 2), t0: t, R: R + 3 }); faiscas(g.x, CRISTA - 1, 4, [255, 170, 70]); }
}
function geleiaPasso(t, dt) {
  for (const g of geleias.slice()) {
    if (g.morto) continue;
    g.idade += dt;
    if (g.preso === 'casco') { g.x = g.ox; g.y = g.oy; }
    else if (g.preso) { const b = boca(g.preso); g.x = b.x + g.ox; g.y = b.y + g.oy; }
    else { g.x += g.vx * dt; g.y += g.vy * dt; }
    const R = raioDe(g);
    for (let s = 0; s < 4; s++) for (let l = 2; l <= 3; l++) {
      const w = omega(g, l), z = amort(g, l), h = dt / 4;
      for (let q = 0; q < 2; q++) {
        const i = (l - 2) * 2 + q;
        g.V[i] += GEL.ruido * Math.min(1, R / 5) * Math.sqrt(h) * normal() + (-w * w * g.A[i] - 2 * z * w * g.V[i]) * h;
        g.A[i] += g.V[i] * h;
      }
    }
    if (g.preso) { // stuck flat on her face (or on the hull): wide across the hit, still ringing a little, smoking
      const a = g.idade, base = -0.42 + 0.22 * Math.exp(-7 * a) * Math.cos(28 * a);
      g.A[0] = base * Math.cos(2 * g.angGolpe); g.A[1] = base * Math.sin(2 * g.angGolpe);
      // its soot leaves from the outer edge (drawn over its middle it read as a grey smudge on the fire)
      if (acaso() < 0.5) { const r = contorno(g, -0.9) + 1; fumaca(g.x + Math.cos(-0.9) * r, g.y + Math.sin(-0.9) * r, 1, 8, -5); }
    }
    const amp = Math.hypot(g.A[0], g.A[1]) + Math.hypot(g.A[2], g.A[3]);
    if (amp > 0.7) for (let i = 0; i < 4; i++) g.A[i] *= 0.7 / amp; // never inside out
    // it burns: hot while young, then it cools (darker, a little smaller) and goes out in a puff of soot
    g.calor = Math.max(0, Math.min(g.calor, (g.vida - g.idade) / (g.vida * 0.55)));
    if (g.idade >= g.vida) { g.morto = true; fumaca(g.x, g.y, Math.round(2 + R * (g.preso ? 2 : 1)), g.preso ? 8 : g.vx * 0.5, g.preso ? -3 : g.vy * 0.5); continue; }
    // the hull is a surface too: a blob that reaches it splats and burns there (viscous: no bounce)
    if (!g.preso && !g.alvo && g.vy > 0 && g.y + raioDe(g) * 0.7 >= CRISTA) { noCasco(g, t); continue; }
    if (g.alvo && !g.preso) {
      // it lands once it is on her mouth or has just passed it (a fast blob can step over a small window)
      const b = boca(g.alvo), dx = b.x - g.x, dy = b.y - g.y;
      if (Math.hypot(dx, dy) < 5 || dx * g.vx + dy * g.vy <= 0) gruda(g, t);
    }
    // 7th round: the mother tears (across or along, `corte`), then her pieces drip off their backs
    if (g.corte && g.mae) {
      if (!g.esticou && g.idade >= g.tRacha) {
        g.esticou = true;
        const va = Math.atan2(g.vy, g.vx);
        g.psi = g.corte === 'atravessa' ? va + Math.PI / 2 : va;
        deforma(g, 2, g.psi, 0.5, true);
        g.pinca = g.idade + Math.PI / 2 / omega(g, 2);
      }
      if (g.pinca != null && g.idade >= g.pinca) { g.pinca = null; racha(g); }
      continue;
    }
    if (g.pingador && !g.preso && g.m > 9) {
      if (g.idade >= g.proxGota && g.pincaGota == null) {
        g.psi = Math.atan2(g.vy, g.vx) + Math.PI + (acaso() - 0.5) * 0.5; // a lobe swells off its back
        deforma(g, 2, g.psi, 0.3, true); deforma(g, 3, g.psi, 0.16, true);
        g.pincaGota = g.idade + Math.PI / 2 / omega(g, 2);
        g.proxGota = g.idade + 0.3 + acaso() * 0.14;
      }
      if (g.pincaGota != null && g.idade >= g.pincaGota) { g.pincaGota = null; pinga(g, true); }
    }
    if (g.mae && !g.corte && GEL.modo === 'pinga') {
      // a lobe swells sideways (a little back), alternating sides; at its peak a drop pinches off its tip
      if (g.idade >= g.proxGota && g.m > 14) {
        g.lado = -(g.lado ?? (acaso() < 0.5 ? 1 : -1));
        g.psi = Math.atan2(g.vy, g.vx) + g.lado * (Math.PI * 0.55 + (acaso() - 0.5) * 0.5);
        deforma(g, 2, g.psi, 0.3, true); deforma(g, 3, g.psi, 0.16, true); // l = 2 + l = 3: one lobe, not two
        g.pinca = g.idade + Math.PI / 2 / omega(g, 2);
        g.proxGota = g.idade + 0.26 + acaso() * 0.12;
      }
      if (g.pinca != null && g.idade >= g.pinca) { g.pinca = null; pinga(g); }
    }
    if (g.mae && !g.corte && GEL.modo === 'racha') {
      if (g.idade >= 0.38 && !g.esticou) {
        g.esticou = true; g.psi = Math.atan2(g.vy, g.vx) + Math.PI / 2;
        deforma(g, 2, g.psi, 0.5, true);
        g.pinca = g.idade + Math.PI / 2 / omega(g, 2);
      }
      if (g.pinca != null && g.idade >= g.pinca) { g.pinca = null; racha(g); }
    }
  }
  // the threads: thinner as they stretch; they snap, bead into a satellite drop, and both ends spring back
  for (const f of fios) {
    if (f.morto) continue;
    const L = Math.hypot(f.b.x - f.a.x, f.b.y - f.a.y);
    f.w = f.w0 * Math.pow(f.L0 / Math.max(f.L0, L), 0.9);
    if (f.w >= 0.68 && !f.a.morto && !f.b.morto) continue;
    f.morto = true;
    if (f.a.morto || f.b.morto) continue;
    const ra = raioDe(f.a), rb = raioDe(f.b), gap = L - ra - rb, ang = Math.atan2(f.b.y - f.a.y, f.b.x - f.a.x);
    if (gap > 3) {
      const k = (ra + gap / 2) / L;
      geleia(f.a.x + (f.b.x - f.a.x) * k, f.a.y + (f.b.y - f.a.y) * k, (f.a.vx + f.b.vx) / 2, (f.a.vy + f.b.vy) / 2, 1.1, f.a.origem,
        { vida: f.curto ? 0.18 + acaso() * 0.08 : 0.5 + acaso() * 0.3, calor: Math.min(f.a.calor, f.b.calor) });
    }
    deforma(f.a, 2, ang, -0.15, true); deforma(f.b, 2, ang, -0.2, true);
  }
  for (let i = fios.length - 1; i >= 0; i--) if (fios[i].morto) fios.splice(i, 1);
  for (let i = geleias.length - 1; i >= 0; i--) if (geleias[i].morto) geleias.splice(i, 1);
}
const campo = new Float32Array(W * H), prof = new Float32Array(W * H), quente = new Float32Array(W * H);
// [cool, hot] per layer: a near-white core, the orange body, the red outside, a dark-red skin
const GELCOR = {
  nucleo: [[255, 196, 120], [255, 248, 224]], meio: [[228, 108, 46], [255, 190, 82]],
  fora: [[150, 48, 30], [240, 116, 44]], borda: [[84, 24, 22], [150, 40, 28]],
};
const mistura = (par, h) => par[0].map((v, i) => Math.round(v + (par[1][i] - v) * h));
function geleiaDesenha(put) {
  if (!geleias.length) return;
  campo.fill(0); prof.fill(-9); quente.fill(0);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  const caixa = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
  for (const g of geleias) {
    const amp = Math.hypot(g.A[0], g.A[1]) + Math.hypot(g.A[2], g.A[3]);
    const ext = Math.ceil(raioDe(g) * 1.42 * (1 + amp)) + 1, cx = Math.round(g.x), cy = Math.round(g.y);
    for (let y = Math.max(0, cy - ext); y <= Math.min(H - 1, cy + ext); y++) for (let x = Math.max(0, cx - ext); x <= Math.min(W - 1, cx + ext); x++) {
      const dx = x - g.x, dy = y - g.y, d = Math.hypot(dx, dy), r = contorno(g, Math.atan2(dy, dx));
      const s = d / (r * 1.42);
      if (s >= 1) continue;
      const i = y * W + x;
      campo[i] += (1 - s * s) ** 2;
      const p = 1 - d / r;
      if (p > prof[i]) { prof[i] = p; quente[i] = g.calor; }
      caixa(x, y);
    }
  }
  for (const f of fios) { // a capsule from centre to centre, as thick as the thread
    const { a, b } = f, h = Math.min(a.calor, b.calor), ext = f.w * 1.42 + 1;
    const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy || 1;
    for (let y = Math.max(0, Math.floor(Math.min(a.y, b.y) - ext)); y <= Math.min(H - 1, Math.ceil(Math.max(a.y, b.y) + ext)); y++)
      for (let x = Math.max(0, Math.floor(Math.min(a.x, b.x) - ext)); x <= Math.min(W - 1, Math.ceil(Math.max(a.x, b.x) + ext)); x++) {
        const u = Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / L2));
        const s = Math.hypot(x - a.x - u * vx, y - a.y - u * vy) / (f.w * 1.42);
        if (s >= 1) continue;
        const i = y * W + x;
        campo[i] += (1 - s * s) ** 2;
        if (prof[i] < -1) { prof[i] = -1; quente[i] = h; } // a thread outside every body: the outer colour
        caixa(x, y);
      }
  }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x, F = campo[i];
    if (F < 0.08) continue;
    const h = quente[i];
    if (F < 0.25) { // the heat's glow around it, sparse
      if (BAYER[(y & 3) * 4 + (x & 3)] / 16 < ((F - 0.08) / 0.17) * 0.45 * (0.4 + 0.6 * h)) put(x, y, mistura(GELCOR.fora, h), 0.35);
      continue;
    }
    const p = prof[i];
    const par = F < 0.39 ? GELCOR.borda : p > 0.62 ? GELCOR.nucleo : p > 0.3 ? GELCOR.meio : GELCOR.fora;
    put(x, y, mistura(par, h), par === GELCOR.borda ? 0.85 : 1);
  }
  // the jelly's wet shine: a hard highlight up-left on the bigger blobs
  for (const g of geleias) {
    const R = raioDe(g) * (0.85 + 0.15 * g.calor);
    if (R < 3.2) continue;
    const th = -2.3, r = contorno(g, th) * 0.56, hx = g.x + Math.cos(th) * r, hy = g.y + Math.sin(th) * r;
    put(hx, hy, [255, 255, 246]);
    if (R >= 5) { put(hx + 1, hy, [255, 236, 200], 0.8); put(hx, hy + 1, [255, 236, 200], 0.6); }
  }
  // (10th round) the plasma crackles (his: "o mesmo eu quero com o plasma"; visual only, it does not hurt): small
  // electric arcs licking its skin, new every frame — a hot white root on the skin, an amber tip
  for (const g of geleias) {
    const R = raioDe(g) * (0.85 + 0.15 * g.calor);
    if (R < 2.6 || g.calor < 0.2) continue;
    for (let i = 0; i < (R >= 6 ? 2 : 1); i++) {
      if (visual() > 0.6) continue;
      const th = visual() * Math.PI * 2, dir = visual() < 0.5 ? -1 : 1, n = 3;
      const r0 = contorno(g, th);
      let xa = g.x + Math.cos(th) * r0, ya = g.y + Math.sin(th) * r0;
      for (let p = 1; p <= n; p++) {
        const a = th + dir * 0.22 * p + (visual() - 0.5) * 0.25;
        const alto = Math.max(0.5, (2 + R * 0.35) * Math.sin((Math.PI * p) / (n + 0.6)) + (visual() - 0.5) * 1.5);
        const xb = g.x + Math.cos(a) * (contorno(g, a) + alto), yb = g.y + Math.sin(a) * (contorno(g, a) + alto);
        linha(put, xa, ya, xb, yb, p === 1 ? [255, 250, 230] : [255, 196, 100], 1 - (0.3 * p) / n);
        xa = xb; ya = yb;
      }
    }
  }
}

// light the cloud at (x, y): a flame front leaves it
function acende(x, y, t, origem) {
  if (origem === 'nave') {
    // lit from the ship's side: the thin gas there only flashes. The front runs back up the breath (a flashback) — 7th
    // round: the breath now pours out of the green's jaws, so it runs into HER mouth; the blast there throws the gas in
    // front of it into her face and splashes burning jelly onto her two sisters' faces (`naCara`)
    const b = boca('verde');
    ignicoes.push({ x, y, t0: t, origem, bolsoes: [], caras: [{ cor: 'verde', d: Math.max(0, Math.hypot(b.x - x, b.y - y) - 12), feito: false }] });
    engasgou = true; tEngasgo = t;
    return;
  }
  if (origem === 'padrao') { ignicoes.push({ x, y, t0: t, origem: 'laranja', bolsoes: [], caras: [] }); return; }
  // the densest pockets become jelly when the front reaches them, spread over the whole cloud (farthest-point from the
  // densest), not all piled at its dense root
  const cand = [];
  for (let c = 0; c < GW * GH; c++) if (densB[c] > GASCFG.dBolsao) {
    const px = (c % GW) * GC + 1, py = Math.floor(c / GW) * GC + 1;
    if (Math.hypot(px - x, py - y) >= 10) cand.push({ x: px, y: py, d: densB[c] });
  }
  const escolhidos = [];
  if (cand.length) {
    cand.sort((a, b) => b.d - a.d);
    escolhidos.push(cand[0]);
    while (escolhidos.length < GASCFG.globos) {
      let melhor = null, md = -1;
      for (const c of cand) {
        const m = Math.min(...escolhidos.map((e) => Math.hypot(e.x - c.x, e.y - c.y)));
        if (m > md) { md = m; melhor = c; }
      }
      if (!melhor || md < 12) break;
      escolhidos.push(melhor);
    }
  }
  ignicoes.push({ x, y, t0: t, origem, caras: [], bolsoes: escolhidos.map((e) => ({ x: e.x, y: e.y, dens: e.d, d: Math.hypot(e.x - x, e.y - y), feito: false })) });
}
// the gas in front of a face, lit from the ship's side, is thrown into it (away from the light point)
function naCara(cor, ig, t) {
  const b = boca(cor), d = Math.hypot(b.x - ig.x, b.y - ig.y);
  const ux = d > 1 ? (b.x - ig.x) / d : 1, uy = d > 1 ? (b.y - ig.y) / d : 0, ini = Math.min(12, d);
  const g = geleia(b.x - ux * ini, b.y - uy * ini, ux * 160, uy * 160, cor === 'verde' ? 6.5 : 5.5, 'nave', { alvo: cor, vida: 2 });
  deforma(g, 2, Math.atan2(uy, ux), -0.3);
  // the green's mouth blows up: burning jelly splashes from it onto the orange (nearer) and the cyan
  if (cor === 'verde') respingos.push({ t: t + 0.06, para: 'laranja' }, { t: t + 0.13, para: 'ciano' });
}
function respinga(cor) {
  const de = labios(), b = boca(cor), d = Math.hypot(b.x - de.x, b.y - de.y) || 1, ux = (b.x - de.x) / d, uy = (b.y - de.y) / d;
  const g = geleia(de.x + ux * 4, de.y + uy * 4, ux * 210, uy * 210, 5.5, 'nave', { alvo: cor, vida: 2 });
  deforma(g, 2, Math.atan2(uy, ux), -0.3);
}

// ─── 01/11 (7): THE THREE DODGES (his: "o Leque de plasma precisa dar espaço suficiente para a nave conseguir achar o
// melhor caminho sem tomar dano [...] 3 padrões, um para cada tiro. Quem perceber, aprende a técnica"; he chose the three
// dodges). The orange's arc is the cause and the tell: it strikes a pocket of the breath from BEHIND, and the pocket's
// blast throws it away from the strike, so she aims it by where she strikes.
//  - 1st, the FAN: one arc, one big blob aimed at the ship; it tears ACROSS into three, the middle one on the ship's
//    line → step out of the line, into a gap;
//  - 2nd, the RAILS: a forked arc, two blobs aimed above and below the ship; each tears ALONG its path into a train →
//    hold still: the gap is your own row;
//  - 3rd, the FILE: three arcs in rhythm, three blobs, each aimed where the ship is at its strike → keep moving.
// Then the pieces drip (his "B que depois pinga"), but only off their backs (`pingador`): the drops thrown sideways
// had landed in the gaps.
const PADRAO = {
  leque: [{ dt: 0, alvos: [0], R: 9.5, v: 88, corte: 'atravessa' }],
  trilhos: [{ dt: 0, alvos: [-30, 30], R: 7.5, v: 80, corte: 'aoLongo' }],
  // the file's balls fly whole for a while first (torn at once, the three read as one heap by her mouth)
  fila: [0, 0.4, 0.8].map((dt) => ({ dt, alvos: [0], R: 7, v: 104, corte: 'aoLongo', tRacha: 0.85 })),
};
// a pocket of the breath, 20 px down its axis from her jaws (two of them side by side for the rails)
function bolsao(k, n) {
  const l = labios(), ax = Math.cos(VAPOR.eixo), ay = Math.sin(VAPOR.eixo), s = n > 1 ? (k - (n - 1) / 2) * 12 : 0;
  return { x: l.x + ax * 20 - ay * s, y: l.y + ay * 20 + ax * s };
}
function golpeia(gp, t) {
  const bl = boca('laranja'), alvo = naveC(), alvos = [];
  gp.alvos.forEach((off, k) => {
    const p = bolsao(k, gp.alvos.length), tx = alvo.x, ty = alvo.y + off;
    const d = Math.hypot(tx - p.x, ty - p.y), ux = (tx - p.x) / d, uy = (ty - p.y) / d;
    const s = { x: p.x - ux * (gp.R + 3), y: p.y - uy * (gp.R + 3) }; // the strike: behind the pocket
    alvos.push(s);
    const g = geleia(p.x, p.y, ux * gp.v, uy * gp.v, gp.R, 'laranja', { mae: true, vida: 2.6, corte: gp.corte, tRacha: gp.tRacha ?? 0.32 });
    deforma(g, 2, Math.atan2(uy, ux), -0.3); // the blast squashes it along the push: it leaves wobbling
    estouros.push({ x: Math.round(p.x), y: Math.round(p.y), t0: t, R: 8, ang: Math.atan2(uy, ux), dur: 0.22 });
    const aS = Math.atan2(s.y - bl.y, s.x - bl.x), dS = Math.hypot(s.x - bl.x, s.y - bl.y);
    for (let j = 0; j < 14; j++) {
      const ang = aS + (acaso() - 0.5) * 0.8, v = (dS / 0.1) * (0.7 + acaso() * 0.8);
      gas.push({ x: bl.x, y: bl.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, idade: 0, vida: 0.08 + acaso() * 0.14, faisca: [255, 200, 90], rasto: true });
    }
    acende(s.x, s.y, t, 'padrao');
  });
  // one arc per strike; the rails' arc forks two thirds of the way
  if (alvos.length === 1) arcos.push({ x0: bl.x, y0: bl.y, x1: alvos[0].x, y1: alvos[0].y, t0: t });
  else {
    const mx = alvos.reduce((a, s) => a + s.x, 0) / alvos.length, my = alvos.reduce((a, s) => a + s.y, 0) / alvos.length;
    const fx = bl.x + (mx - bl.x) * 0.66, fy = bl.y + (my - bl.y) * 0.66;
    arcos.push({ x0: bl.x, y0: bl.y, x1: fx, y1: fy, t0: t, seg: 3 });
    for (const s of alvos) arcos.push({ x0: fx, y0: fy, x1: s.x, y1: s.y, t0: t, seg: 2 });
  }
  clarao.push(t);
}

// ─── 01/11 (7): THE THERMOMETER (his: "um termômetro pequeno que sobe a temperatura, quando chegar, explode de volta na
// serpente [...] Caso tenha incendiar, a barrinha de termometro pega fogo e explode"). Beside her, only while her gas is
// out. It rises with each shot that goes through the gas (her body does not count: it teaches where to shoot) and cools
// slowly. The orange's spark burns the gas the ship heated and the fresh breath is cold, so it starts over at every
// spark (his choice). Full first: the flashback. With INCENDIÁRIO it catches fire at the first touch and bursts.
const TERMO = { x: 370, y: 66, alto: 40 }; // the glass's top-left (3 px wide); the bulb under it
const termo = { v: 0, mostra: 0, alfa: 0, estado: 'sobe', t0: 0, pisca: -9, cacos: [] };
function termoEsquenta(t, q, x, y) {
  if (termo.estado !== 'sobe') return; // draining after her spark: the shots already in the air do not count
  termo.v = Math.min(1, termo.v + q); termo.pisca = t;
  if (termo.v >= 1 && !engasgou) {
    termo.estado = 'cheio'; termo.t0 = t;
    acende(x, y, t, 'nave');
    console.log(`termômetro cheio em t=${t.toFixed(2)}`);
  }
}
function termoZera(t) {
  if (termo.estado === 'sobe') { termo.estado = 'zera'; termo.t0 = t; }
  termo.v = 0;
}
function termoPasso(t, dt) {
  const fora = termo.estado === 'estourado' || (termo.estado === 'cheio' && t - termo.t0 > 0.7);
  const ativo = t >= GASCFG.sopro[0] && t < GASCFG.sopro[1] + 0.8 && !fora;
  termo.alfa = Math.max(0, Math.min(1, termo.alfa + (ativo ? dt / 0.3 : -dt / 0.35)));
  if (termo.estado === 'sobe' && termo.v > 0) termo.v = Math.max(0, termo.v - GASCFG.termoEsfria * dt);
  // the level shown eases to the real one: it climbs quickly, drains in ~0.3 s, shoots up when the card lights it
  const alvo = termo.estado === 'fogo' || termo.estado === 'cheio' ? 1 : termo.v;
  termo.mostra += (alvo - termo.mostra) * Math.min(1, dt * (termo.estado === 'fogo' ? 22 : termo.estado === 'zera' ? 10 : 8));
  if (termo.estado === 'zera' && t - termo.t0 > 0.5) termo.estado = 'sobe';
  if (termo.estado === 'fogo' && t - termo.t0 > 0.34) {
    // it bursts: the glass flies in shards, a small blast where it was
    termo.estado = 'estourado'; termo.t0 = t; termo.alfa = 0;
    const cx = TERMO.x + 1, cy = TERMO.y + TERMO.alto * 0.6;
    estouros.push({ x: cx, y: Math.round(cy), t0: t, R: 9, dur: 0.3 });
    for (let j = 0; j < 14; j++) {
      const a = acaso() * Math.PI * 2, v = 40 + acaso() * 80;
      termo.cacos.push({ x: cx + (acaso() - 0.5) * 3, y: cy + (acaso() - 0.5) * TERMO.alto * 0.8, vx: Math.cos(a) * v, vy: Math.sin(a) * v, idade: 0, vida: 0.3 + acaso() * 0.25, quente: acaso() < 0.4 });
    }
  }
  for (const c of termo.cacos) { c.x += c.vx * dt; c.y += c.vy * dt; c.idade += dt; }
  termo.cacos = termo.cacos.filter((c) => c.idade < c.vida);
}
// the heat's colour up the column (f 0 at the bulb, 1 at the top): a dull red, the orange, the yellow, the white-hot top
const RAMPA = [[150, 40, 28], [226, 92, 40], [255, 162, 64], [255, 222, 140], [255, 248, 228]];
const rampa = (f) => {
  const s = Math.max(0, Math.min(0.999, f)) * (RAMPA.length - 1), i = Math.floor(s), u = s - i;
  return RAMPA[i].map((v, q) => Math.round(v + (RAMPA[i + 1][q] - v) * u));
};
function termoDesenha(put, t) {
  for (const c of termo.cacos) put(c.x, c.y, c.quente ? [255, 190, 100] : [196, 206, 226], 1 - c.idade / c.vida);
  const A = termo.alfa;
  if (A <= 0) return;
  const { x, y, alto } = TERMO, bx = x + 1, by = y + alto + 3;
  const fogo = termo.estado === 'fogo', clara = termo.estado === 'cheio' && t - termo.t0 < 0.12;
  const nivel = Math.round(termo.mostra * alto);
  // the casing: dark metal, its left edge lit, a cap on top; ticks on the right at each quarter, the top one hot (the
  // ignition point)
  for (let j = -1; j < alto; j++) { put(x - 1, y + j, [96, 104, 122], A); put(x + 3, y + j, [34, 38, 50], A); }
  for (let i = -1; i <= 3; i++) put(x + i, y - 2, i === -1 || i === 3 ? [70, 78, 94] : [150, 158, 176], A);
  for (const q of [0.25, 0.5, 0.75]) put(x + 4, y + Math.round(alto * (1 - q)), [90, 98, 114], A);
  put(x + 4, y, [255, 120, 40], A); put(x + 5, y, [255, 120, 40], A * 0.7);
  // the glass and the heat in it
  for (let j = 0; j < alto; j++) {
    const yy = y + alto - 1 - j, cheio = j < nivel;
    for (let i = 0; i < 3; i++) {
      if (clara) { put(x + i, yy, [255, 250, 232], A); continue; }
      if (!cheio) { put(x + i, yy, termo.estado === 'zera' && t - termo.t0 < 0.1 ? [70, 74, 90] : [16, 18, 26], A * 0.9); continue; }
      let c = rampa(j / alto);
      if (i === 0) c = c.map((v) => Math.round(v + (255 - v) * 0.25)); // the glass's shine on its left
      if (j === nivel - 1 && t - termo.pisca < 0.07) c = [255, 255, 240]; // a hit: the top flashes
      put(x + i, yy, c, A);
    }
  }
  // the bulb: a 7-px disc (a radius-4 circle read as a cross at this size), a dark rim lit up-left, open to the glass
  // at its top, the heat inside glowing with the level, one glint
  const quente = rampa(Math.max(0.12, termo.mostra * 0.6));
  const dentro = (dx, dy) => dx * dx + dy * dy <= 10;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    if (!dentro(dx, dy)) continue;
    const borda = !(dentro(dx + 1, dy) && dentro(dx - 1, dy) && dentro(dx, dy + 1) && dentro(dx, dy - 1)) && !(dy === -3 && Math.abs(dx) <= 1);
    if (borda) { put(bx + dx, by + dy, dx + dy < 0 ? [120, 128, 146] : [34, 38, 50], A); continue; }
    let c = clara ? [255, 250, 232] : quente;
    if (dx === -1 && dy === -1 && !clara) c = c.map((v) => Math.round(v + (255 - v) * 0.4));
    put(bx + dx, by + dy, c, A);
  }
  // full: a hot glow around it for a moment
  if (termo.estado === 'cheio' && t - termo.t0 < 0.45) {
    const f = (t - termo.t0) / 0.45;
    for (let j = -4; j < alto + 8; j++) for (let i = -3; i <= 5; i++) {
      if ((i >= -1 && i <= 3 && j >= -2 && j < alto) || BAYER[((y + j) & 3) * 4 + ((x + i) & 3)] / 16 > 0.45 * (1 - f)) continue;
      put(x + i, y + j, [255, 170, 80], 0.5 * (1 - f) * A);
    }
  }
  // INCENDIÁRIO: it catches fire — flames licking out of its top and along its sides, flickering every frame
  if (fogo) for (let i = -2; i <= 4; i++) {
    const topo = 3 + Math.floor(acaso() * 6) - (i < 0 || i > 2 ? 3 : 0);
    for (let s = 0; s < topo; s++) put(x + i, y - 3 - s, s < 2 ? [255, 244, 210] : s < topo - 1 ? [255, 160, 60] : [220, 70, 36], 0.95);
    for (let j = 0; j < alto; j += 3) if (acaso() < 0.4) put(i < 1 ? x - 2 : x + 4, y + j + Math.floor(acaso() * 3), [255, 150, 60], 0.85);
  }
}
function gasPasso(t) {
  const dt = 1 / FPS;
  const bv = boca('verde'), bl = boca('laranja');
  // 7th round: the green BREATHES IT OUT of her open jaws, down and forward, in a fan that sways and breathes: its aim
  // wanders (two slow sines), its width opens and closes, and it comes in puffs. In vacuum the jet keeps the direction
  // she gives it; meeting the hull it spreads along the plate (a wall jet), mostly the way it was going, so a low bank
  // of it builds up in front of her
  pufAgora = -1;
  if (!engasgou && t >= GASCFG.sopro[0] && t < GASCFG.sopro[1]) {
    const ta = t - GASCFG.sopro[0];
    const eixo = VAPOR.eixo + 0.1 * Math.sin(2 * Math.PI * 0.8 * ta) + 0.05 * Math.sin(2 * Math.PI * 2.1 * ta + 1.3);
    const abre = VAPOR.abre + 0.06 * Math.sin(2 * Math.PI * 1.5 * ta + 0.4);
    const puf = 0.5 + 0.5 * Math.max(0, Math.sin(2 * Math.PI * 1.3 * ta));
    pufAgora = puf; // (13th) her lights pulse with it
    const q = Math.floor(VAPOR.taxa * puf * Math.min(1, ta / 0.3) + acaso());
    const l = labios();
    for (let i = 0; i < q; i++) {
      const ang = eixo + (acaso() - 0.5) * 2 * abre, v = 34 + acaso() * 34, ida = acaso() * dt;
      nuvem.push({ x: l.x + Math.cos(ang) * v * ida, y: l.y + Math.sin(ang) * v * ida, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
        idade: ida, vida: 2.0 + acaso() * 0.8, giro: (acaso() - 0.5) * 0.6 });
    }
  }
  for (const p of nuvem) {
    const c = Math.cos((p.giro ?? 0) * dt), s = Math.sin((p.giro ?? 0) * dt); // a wisp curls a little (the jet's eddies)
    const vx = p.vx * c - p.vy * s, vy = p.vx * s + p.vy * c;
    p.vx = vx; p.vy = vy;
    p.x += p.vx * dt; p.y += p.vy * dt; p.idade += dt;
    if (p.y >= CRISTA - 2 && p.vy > 0) {
      // the wall jet: it slows as it spreads and thickens (a slow lift), and lingers as a low bank
      const v = Math.hypot(p.vx, p.vy), lado = (p.vx < 0 ? -1 : 1) * (acaso() < 0.2 ? -1 : 1);
      p.y = CRISTA - 2; p.vy = -v * (0.08 + 0.2 * acaso()); p.vx = lado * v * (0.45 + 0.35 * acaso()); p.giro = 0;
      p.vida = Math.max(p.vida, p.idade + 1.4 + acaso());
    }
  }
  for (let i = nuvem.length - 1; i >= 0; i--) if (nuvem[i].idade > nuvem[i].vida || nuvem[i].comido) nuvem.splice(i, 1);
  // the density: each particle weighs less with age (the gas thins as it spreads), summed over 3×3 cells
  dens.fill(0);
  for (const p of nuvem) { const c = celula(p.x, p.y); if (c >= 0) dens[c] += 1 - Math.pow(p.idade / p.vida, 1.5); }
  for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
    let s = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const x2 = cx + ox, y2 = cy + oy;
      if (x2 >= 0 && y2 >= 0 && x2 < GW && y2 < GH) s += dens[y2 * GW + x2];
    }
    densB[cy * GW + cx] = s;
  }
  const esfria = Math.exp(-dt / GASCFG.calorTau);
  for (let c = 0; c < GW * GH; c++) calor[c] *= esfria;
  // the orange sparks (2–3 per use). The wind-up: its mouth glows and crackles for `carga` s, mostly out of its jaws
  // (forward). The strike: a spark jumps from its mouth to the cloud's ROOT (just behind the green mouth) with a spray
  // of streaks, and the cloud lights there, so the blast pushes the fire out along the breath, towards the ship
  GASCFG.faiscas.forEach((tf, i) => {
    if (engasgou || GASCFG[`f${i}`]) return;
    if (t >= tf - GASCFG.carga && t < tf - 1e-6) {
      const c = 1 - (tf - t) / GASCFG.carga;
      const n = acaso() < 0.5 + 0.5 * c ? 1 + Math.floor(acaso() * (1 + 2 * c)) : 0;
      for (let j = 0; j < n; j++) {
        const ang = Math.PI + (acaso() - 0.5) * 2.6, v = 35 + acaso() * 60;
        gas.push({ x: bl.x, y: bl.y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, idade: 0, vida: 0.06 + acaso() * 0.12, faisca: [255, 196, 96], rasto: true });
      }
      return;
    }
    if (t < tf - 1e-6) return;
    GASCFG[`f${i}`] = true;
    // 7th round: she fired first — the gas the ship heated burns, the thermometer starts over; her pattern's strikes
    termoZera(t);
    const nome = GASCFG.padroes[i % GASCFG.padroes.length];
    for (const gp of PADRAO[nome]) agenda.push({ t: tf + gp.dt, gp });
    console.log(`faísca ${i + 1} (${nome}) em t=${t.toFixed(2)}`);
  });
  for (const a of agenda) if (!a.feito && t >= a.t - 1e-6 && !engasgou) { a.feito = true; golpeia(a.gp, t); }
  for (const r of respingos) if (!r.feito && t >= r.t - 1e-6) { r.feito = true; respinga(r.para); }
  // the ship's shots: a hot round heats the gas it passes through (more where the gas is denser) and a small radius
  // around its path; INCENDIÁRIO carries fire and lights it at the first touch
  if (GASCFG.contra || GASCFG.carta) {
    if (t - ultimoTiro >= 0.12 && t > 0.3) { ultimoTiro = t; disparos.push({ x: naveX + 26, y: naveY + 1, usado: false }); }
    for (const s of disparos) {
      s.x += 320 * dt;
      const c = celula(s.x, s.y);
      if (c >= 0 && densB[c] > GASCFG.dVis && !engasgou) {
        if (GASCFG.carta && densB[c] > GASCFG.dMin) {
          termo.estado = 'fogo'; termo.t0 = t; termo.v = 1;
          acende(s.x, s.y, t, 'nave'); console.log(`aceso pela carta em t=${t.toFixed(2)}`);
        } else if (!GASCFG.carta) {
          // the subtle hint stays (the spot it heats); the thermometer takes each shot's heat once
          const cx = c % GW, cy = Math.floor(c / GW), q = GASCFG.calorTiro * Math.min(1, densB[c] / 2);
          for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
            const d = Math.hypot(ox, oy), x2 = cx + ox, y2 = cy + oy;
            if (d <= 3 && x2 >= 0 && y2 >= 0 && x2 < GW && y2 < GH) calor[y2 * GW + x2] += q * (1 - d / 4);
          }
          // the thickest gas it crossed (its first touch is always the cloud's thin edge)
          if (densB[c] > (s.dmax ?? 0)) { s.dmax = densB[c]; s.ox = s.x; s.oy = s.y; }
        }
      }
      if (s.x >= bordaEsq[Math.round(s.y)] + golpe.x) {
        s.morto = true; gas.push({ x: s.x, y: s.y, vx: -20, vy: 0, idade: 0, vida: 0.08, faisca: [255, 240, 200] });
        // through: the thermometer takes its heat, by the thickest gas it crossed
        if (s.dmax && !engasgou) termoEsquenta(t, GASCFG.termoTiro * Math.min(1, s.dmax / 1.2), s.ox, s.oy);
      }
    }
    for (let i = disparos.length - 1; i >= 0; i--) if (disparos[i].morto) disparos.splice(i, 1);
  }
  termoPasso(t, dt);
  // the flame fronts: the gas they reach burns (and is used up); the pockets they reach leave as jelly; lit from the
  // ship's side, the faces they reach get the gas in front of them thrown in
  for (const ig of ignicoes) {
    const R = GASCFG.frente * (t - ig.t0);
    if (R > 220) continue;
    const x0 = Math.max(0, Math.floor((ig.x - R) / GC)), x1 = Math.min(GW - 1, Math.ceil((ig.x + R) / GC));
    const y0 = Math.max(0, Math.floor((ig.y - R) / GC)), y1 = Math.min(GH - 1, Math.ceil((ig.y + R) / GC));
    // a flame front passes ONCE: only the shell it crossed this frame lights (the whole disc kept lighting the fresh
    // breath for 1.3 s, so the cloud in front of her never refilled)
    const R0 = ig.R ?? -1;
    ig.R = R;
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const c = cy * GW + cx, d = Math.hypot(cx * GC + 1 - ig.x, cy * GC + 1 - ig.y);
      if (queima[c] < 0 && densB[c] > GASCFG.dMin * 0.6 && d <= R && d > R0 - 2) {
        queima[c] = t;
        queimaN[c] = Math.min(1, densB[c] / GASCFG.dCheia);
      }
    }
    for (const b of ig.bolsoes) if (!b.feito && b.d <= R) {
      b.feito = true;
      const ux = (b.x - ig.x) / b.d, uy = (b.y - ig.y) / b.d;
      const g = geleia(b.x, b.y, ux * GASCFG.empurra + Math.cos(mira) * 20, uy * GASCFG.empurra + Math.sin(mira) * 20,
        7.5 + 2 * Math.min(1, b.dens / GASCFG.dCheia), ig.origem, { mae: true, vida: 2.6, proxGota: 0.28 + acaso() * 0.1 });
      deforma(g, 2, Math.atan2(uy, ux), -0.3); // the blast squashes it along the push: it leaves wobbling
    }
    for (const c of ig.caras) if (!c.feito && c.d <= R) { c.feito = true; naCara(c.cor, ig, t); }
  }
  for (const p of nuvem) { const c = celula(p.x, p.y); if (c >= 0 && queima[c] >= 0 && t - queima[c] < 0.4) p.comido = true; }
  for (let c = 0; c < GW * GH; c++) if (queima[c] >= 0 && t - queima[c] > 0.45) queima[c] = -1;
  geleiaPasso(t, dt);
  // (10th round) the plasma throws an electric spark now and then (visual only; its own die)
  for (const g of geleias) {
    const R = raioDe(g);
    if (R < 2.6 || g.calor < 0.3 || visual() > 0.12 * Math.min(2, R / 4)) continue;
    const th = visual() * Math.PI * 2, r0 = contorno(g, th), v = 40 + visual() * 60;
    gas.push({ x: g.x + Math.cos(th) * r0, y: g.y + Math.sin(th) * r0, vx: g.vx + Math.cos(th) * v, vy: g.vy + Math.sin(th) * v,
      idade: 0, vida: 0.08 + visual() * 0.12, faisca: [255, 214, 130], rasto: true });
  }
  for (let i = estouros.length - 1; i >= 0; i--) if (t - estouros[i].t0 > (estouros[i].dur ?? 0.34)) estouros.splice(i, 1);
  for (let i = arcos.length - 1; i >= 0; i--) if (t - arcos[i].t0 > 0.1) arcos.splice(i, 1);
  // her knock: a spring back to her post
  golpe.vx += (-256 * golpe.x - 11 * golpe.vx) * dt; golpe.vy += (-256 * golpe.y - 11 * golpe.vy) * dt;
  golpe.x += golpe.vx * dt; golpe.y += golpe.vy * dt;
  sacode = Math.max(0, sacode - dt * 3.5);
  tinta = Math.max(0, tinta - dt * 9); // a quick hot flash, not a wash over her art
}
// a burst: a white flash, the orange body thinning out (dithered), a red ring; with `ang` it leans along it (pointed)
function estouroDesenha(put, e, t) {
  const a = t - e.t0, f = a / (e.dur ?? 0.34);
  if (f >= 1) return;
  if (e.onda && a < 0.2) { // the shock: a thin bright ring running out past the fire
    const ro = e.R * (0.5 + 1.1 * (a / 0.2));
    for (let q = 0; q < 6.283; q += 0.6 / ro) put(e.x + Math.cos(q) * ro, e.y + Math.sin(q) * ro, [255, 226, 170], 0.75 * (1 - a / 0.2));
  }
  const r = e.R * (0.35 + 0.65 * Math.sqrt(f)), ca = e.ang != null ? Math.cos(e.ang) : 0, sa = e.ang != null ? Math.sin(e.ang) : 0;
  for (let dy = -Math.ceil(r) - 1; dy <= Math.ceil(r) + 1; dy++) for (let dx = -Math.ceil(r) - 1; dx <= Math.ceil(r) + 1; dx++) {
    const d = Math.hypot(dx, dy);
    if (d > r + 0.6) continue;
    if (e.ang != null && d > r * 0.4 && (dx * ca + dy * sa) / (d || 1) < -0.15) continue; // the back half stays tight
    const lim = BAYER[((e.y + dy) & 3) * 4 + ((e.x + dx) & 3)] / 16;
    if (a < 0.07 && d < r * 0.65) put(e.x + dx, e.y + dy, d < r * 0.35 ? [255, 255, 250] : [255, 236, 180]);
    else if (d < r * (1 - 0.15 * f)) { if (lim < 1 - f) put(e.x + dx, e.y + dy, d < r * 0.45 * (1 - f) ? [255, 230, 170] : [255, 146, 54], 0.9); }
    else if (Math.abs(d - r) < 0.8) put(e.x + dx, e.y + dy, [200, 70, 36], 1 - f);
  }
}
function gasDesenha(put, t) {
  const escura = [38, 104, 66], clara = [104, 214, 132];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = Math.floor(y / GC) * GW + Math.floor(x / GC);
    const lim = BAYER[(y & 3) * 4 + (x & 3)] / 16;
    if (queima[c] >= 0) { // burning, dithered by how much gas was there: a white-hot flash, the orange body, a red fade
      const a = t - queima[c], n = queimaN[c];
      if (lim >= 0.25 + 0.75 * n) continue;
      if (a < 0.06) put(x, y, n > 0.5 ? [255, 246, 214] : [255, 214, 140], 0.9);
      else if (a < 0.2) put(x, y, n > 0.6 && lim < 0.3 ? [255, 214, 120] : [255, 150, 60], 0.85);
      else if (a < 0.4 && lim < 1 - (a - 0.2) / 0.2) put(x, y, [150, 52, 30], 0.6);
      continue;
    }
    const d = densB[c];
    // the subtle hint: where the ship's shots heated the gas, a sparse amber shimmer of its own (tinting only the
    // gas's own pixels hid it — the cloud's front, where the shots land, is the thinnest part); denser as it heats
    const h = Math.min(1, calor[c] / GASCFG.calorIgn);
    if (h > 0.3 && d > GASCFG.dVis * 0.5 && BAYER[((y + 1) & 3) * 4 + ((x + 2) & 3)] / 16 < (h - 0.3) * 0.35) {
      put(x, y, h > 0.8 ? [255, 206, 130] : [255, 160, 80], 0.4 + 0.3 * h);
      continue;
    }
    if (d < GASCFG.dVis) continue;
    const n = Math.min(1, (d - GASCFG.dVis) / (GASCFG.dCheia - GASCFG.dVis));
    if (lim >= 0.15 + n * 0.75) continue; // ordered dither: thin gas = sparse pixels
    put(x, y, escura.map((v, i) => Math.round(v + (clara[i] - v) * n)), 0.35 + 0.3 * n);
  }
  // 7th round: the breath's root — the young wisps drawn one by one, so the stream reads leaving her jaws (the 2-px
  // cloud cells alone made a blob on her face)
  for (const p of nuvem) {
    if (p.idade > 0.5 || p.comido) continue;
    const f = p.idade / 0.5, v = Math.hypot(p.vx, p.vy) || 1;
    const c = f < 0.3 ? [200, 255, 218] : [136, 228, 164], a = 0.7 * (1 - f);
    put(p.x, p.y, c, a);
    if (f < 0.6) put(p.x - p.vx / v, p.y - p.vy / v, c, a * 0.55); // a short streak back towards her mouth
  }
  for (const e of estouros) estouroDesenha(put, e, t);
  geleiaDesenha(put);
  // the orange's mouth: the wind-up glow (pulsing faster and growing as the spark nears), each strike's flash
  const bl = boca('laranja');
  for (const tf of [...GASCFG.faiscas, ...clarao.map((c) => -c)]) {
    let r = 0, forte = 0;
    if (tf < 0) { if (t + tf < 0.1 && -tf < tEngasgo + 1e-6) { r = 5.5; forte = 1; } } // a strike (stored negative)
    else if (t >= tf - GASCFG.carga && t < tf && t < tEngasgo) {
      const c = 1 - (tf - t) / GASCFG.carga;
      r = 2 + 3 * c + (Math.sin(t * (14 + 50 * c)) > 0 ? 0.7 : 0); forte = 0.5 + 0.5 * c;
    }
    if (r <= 0) continue;
    const rh = r * 2.4; // the halo on her snout
    for (let dy = -Math.ceil(rh); dy <= Math.ceil(rh); dy++) for (let dx = -Math.ceil(rh); dx <= Math.ceil(rh); dx++) {
      const d = Math.hypot(dx, dy);
      if (d > r && d <= rh && BAYER[((Math.round(bl.y) + dy) & 3) * 4 + ((Math.round(bl.x) + dx) & 3)] / 16 < 0.5 * (1 - (d - r) / (rh - r))) put(bl.x + dx, bl.y + dy, [255, 150, 60], 0.35 * forte);
    }
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
      const d = Math.hypot(dx, dy);
      if (d <= r) put(bl.x + dx, bl.y + dy, d < r * 0.4 ? [255, 244, 214] : [255, 160, 64], forte * (1 - d / (r + 1)));
    }
  }
  // the spark's jump: a jagged hot line from her mouth to the strike, new zigzag each frame (the rails' fork: a trunk
  // and two branches, fewer segments each)
  for (const a of arcos) {
    const L = Math.hypot(a.x1 - a.x0, a.y1 - a.y0) || 1, px = -(a.y1 - a.y0) / L, py = (a.x1 - a.x0) / L;
    const nseg = a.seg ?? 5;
    let xa = a.x0, ya = a.y0;
    for (let s = 1; s <= nseg; s++) {
      const f = s / nseg, j = s < nseg ? (acaso() - 0.5) * 6 : 0;
      const xb = a.x0 + (a.x1 - a.x0) * f + px * j, yb = a.y0 + (a.y1 - a.y0) * f + py * j;
      linha(put, xa + px, ya + py, xb + px, yb + py, [255, 150, 60], 0.5);
      linha(put, xa, ya, xb, yb, [255, 244, 210]);
      linha(put, xa - px * 0.5, ya - py * 0.5, xb - px * 0.5, yb - py * 0.5, [255, 226, 160], 0.8);
      xa = xb; ya = yb;
    }
  }
  for (const s of disparos) for (let i = 0; i < 4; i++) {
    if (GASCFG.carta) put(s.x - i, s.y, i === 0 ? [255, 236, 170] : (i + Math.floor(s.x)) % 2 ? [255, 120, 40] : [255, 176, 70]);
    else put(s.x - i, s.y, i === 0 ? [255, 255, 230] : [255, 236, 150], 1 - i * 0.18);
  }
  termoDesenha(put, t);
}

// ─── 02/11 (13): THE GREEN AND THE ORANGE MOVE (his answers: the green OPENS AND POURS — her jaws open, pointing down,
// her neck pumping with the puffs; the orange DRAWS BACK AND PECKS — it draws back trembling while it charges, pecks
// forward at each strike and the arc leaves its muzzle; ONE charge gesture for the three patterns — the arc stays the
// tell, the file gets three pecks; the counter: THE THREE FLINCH — PixelLab's `encolhe` replaces the code spring). Their
// sets (`pose=<dir>`) play on the skill's own clock; a set is entered at the pose it shares with the one before (the
// approved frame, the open green `B`, the orange drawn back `C`). And the effects he asked for with them (visual only, on
// the `visual()` die): the green's lights pulse with each puff; the orange's amber lights power up with its charge and
// small arcs crawl on its snout; each peck kicks the screen a pixel, leaves smoke drifting off the muzzle (straight:
// vacuum) and discharges on the snout; as the green closes, a last breath leaks out of her jaws
const GMOV = { abre: 1.0, carga: 0.8, vai: 0.08, pico: 0.12, volta: 0.1, relaxa: 0.5, fecha: 0.75, encolhe: 1.2, aborta: 20, sopraFps: 10 };
const ATAQUES = GASCFG.faiscas.map((tf, i) => {
  const golpes = PADRAO[GASCFG.padroes[i % GASCFG.padroes.length]].map((gp) => tf + gp.dt);
  const ult = golpes[golpes.length - 1];
  return { tf, tc: tf - GASCFG.carga, golpes, ult, fim: ult + GMOV.pico + GMOV.volta + GMOV.relaxa };
});
const tAbre = GASCFG.sopro[0] - GMOV.abre;
const tFecha = Math.max(GASCFG.sopro[1], ATAQUES[ATAQUES.length - 1].fim), tVolta = tFecha + GMOV.fecha;
// the windows where neither the orange nor the opening/closing plays: the green's neck pumps there
const LIVRES = [[GASCFG.sopro[0], ATAQUES[0].tc], ...ATAQUES.slice(0, -1).map((A, i) => [A.fim, ATAQUES[i + 1].tc])];
function gasCabPasso(t) {
  if (!PONTOS) return;
  const n = (nome) => CAB[nome].length - 1;
  const q = (nome, x) => ({ nome, i: Math.max(0, Math.min(n(nome), Math.round(x))) });
  // the counter: from the first face hit, the flinch (it ends on the approved frame: the idle again)
  if (t >= tGruda) {
    const u = (t - tGruda) / GMOV.encolhe;
    if (u < 1) GCAB.q = q('encolhe', u * n('encolhe'));
    else { if (GCAB.q) GCAB.tIdle = t; GCAB.q = null; }
    return;
  }
  // the fire running back at her: the orange lets its charge go (the charge played back, fast), the green holds open
  if (t >= tEngasgo) {
    if (GCAB.abortaDe == null) GCAB.abortaDe = GCAB.q?.nome === 'carga' ? GCAB.q.i : GCAB.q?.nome === 'bote' ? n('carga') : 0;
    const x = GCAB.abortaDe - (t - tEngasgo) * GMOV.aborta;
    GCAB.q = x > 0 ? q('carga', x) : q('sopra', 0);
    return;
  }
  if (t < tAbre) { GCAB.q = null; return; }
  if (t < GASCFG.sopro[0]) { GCAB.q = q('abre', ((t - tAbre) / GMOV.abre) * n('abre')); return; }
  if (t >= tVolta) { if (GCAB.q) GCAB.tIdle = t; GCAB.q = null; return; }
  if (t >= tFecha) { GCAB.q = q('fecha', ((t - tFecha) / GMOV.fecha) * n('fecha')); return; }
  const A = ATAQUES.find((a) => t >= a.tc && t < a.fim);
  if (A) {
    if (t < A.tc + GMOV.carga) { GCAB.q = q('carga', ((t - A.tc) / GMOV.carga) * n('carga')); return; }
    const g = A.golpes.find((s) => t >= s - GMOV.vai && t < s + GMOV.pico + GMOV.volta);
    if (g != null) { // a peck: out to its peak just as the arc leaves, held, back
      const nb = n('bote');
      GCAB.q = q('bote', t < g ? nb * (1 - (g - t) / GMOV.vai) : t < g + GMOV.pico ? nb : nb * (1 - (t - g - GMOV.pico) / GMOV.volta));
      return;
    }
    if (t < A.ult) { GCAB.q = q('carga', n('carga') - [0, 1, 2, 1][Math.floor(t * 12) % 4]); return; } // drawn back, trembling
    GCAB.q = q('carga', n('carga') * (1 - (t - A.ult - GMOV.pico - GMOV.volta) / GMOV.relaxa)); // it eases back to rest
    return;
  }
  // free: the green's neck pumps — the sopra frames out and back, fitted to the window so it starts and ends on B
  const w = LIVRES.find(([a, b]) => t >= a && t < b);
  if (!w) { GCAB.q = q('sopra', 0); return; }
  const k = Math.min(n('sopra'), Math.floor(((w[1] - w[0]) * GMOV.sopraFps) / 2)), u = (t - w[0]) / (w[1] - w[0]);
  GCAB.q = q('sopra', k * (1 - Math.abs(2 * u - 1)));
}
const FXG = { luzV: 0, luzL: 0, desc: 0, kick: -9, rasteja: [], fumo: [], resto: [] };
function gasFxPasso(t) {
  if (!PONTOS) return;
  const dt = 1 / FPS, bl = boca('laranja');
  // the green's lights: up with each puff, down between them; out when she stops
  const v = pufAgora >= 0 ? 0.2 + 0.8 * (pufAgora - 0.5) * 2 : 0;
  FXG.luzV = v >= FXG.luzV ? FXG.luzV + (v - FXG.luzV) * 0.6 : FXG.luzV * Math.exp(-dt / 0.18);
  // the orange's lights: up through its charge, full at the strikes, fading after (and at once if she chokes)
  const A = t < tEngasgo && ATAQUES.find((a) => t >= a.tc && t < a.ult + GMOV.pico);
  const alvo = A ? Math.min(1, (t - A.tc) / GASCFG.carga) : 0;
  FXG.luzL = alvo >= FXG.luzL ? alvo : FXG.luzL * Math.exp(-dt / 0.4);
  // small arcs crawling on its snout while it charges, more as it fills
  if (A && t < A.tf) for (let j = 0; j < 2; j++) if (visual() < 0.15 + 0.55 * alvo) {
    const a = visual() * 6.283, r = 2 + visual() * (3 + 3 * alvo), pts = [];
    let x = bl.x + Math.cos(a) * r, y = bl.y + Math.sin(a) * r;
    for (let s = 0; s < 3 + Math.floor(visual() * 2); s++) { pts.push([x, y]); x += (visual() - 0.5) * 5; y += (visual() - 0.5) * 5; }
    FXG.rasteja.push({ pts, idade: 0, vida: 0.04 + visual() * 0.06 });
  }
  // each peck: the screen kicks, smoke drifts off the muzzle along the strike, discharges on the snout
  for (const a of ATAQUES) for (const s of a.golpes) if (t < tEngasgo && t >= s && t - dt < s) {
    FXG.kick = t; FXG.desc = Math.max(FXG.desc, s === a.ult ? 1 : 0.55);
    const alvoA = arcos[arcos.length - 1], ang = alvoA ? Math.atan2(alvoA.y1 - alvoA.y0, alvoA.x1 - alvoA.x0) : Math.PI;
    for (let j = 0; j < 3; j++) {
      const a2 = ang + (visual() - 0.5) * 0.8, vv = 6 + visual() * 12;
      FXG.fumo.push({ x: bl.x + (visual() - 0.5) * 2, y: bl.y + (visual() - 0.5) * 2, vx: Math.cos(a2) * vv, vy: Math.sin(a2) * vv, idade: 0, vida: 0.7 + visual() * 0.6, r0: 1 + visual() });
    }
  }
  if (FXG.desc > 0.05 && visual() < 0.6 * FXG.desc) {
    const a = visual() * 6.283, r = 3 + visual() * 4, pts = [];
    let x = bl.x + Math.cos(a) * r, y = bl.y + Math.sin(a) * r;
    for (let s = 0; s < 3; s++) { pts.push([x, y]); x += Math.cos(a) * 2.5 + (visual() - 0.5) * 3; y += Math.sin(a) * 2.5 + (visual() - 0.5) * 3; }
    FXG.rasteja.push({ pts, idade: 0, vida: 0.05 + visual() * 0.05, forte: true });
  }
  FXG.desc *= Math.exp(-dt / 0.35);
  // the green closing: a last breath leaks out of her jaws, along her breath's axis, thinning
  if (t >= tFecha && t < tFecha + 0.4 && t < tEngasgo) {
    const b = labios();
    for (let j = 0; j < 2; j++) {
      const a2 = VAPOR.eixo + (visual() - 0.5) * 0.6, vv = 10 + visual() * 14;
      FXG.resto.push({ x: b.x, y: b.y, vx: Math.cos(a2) * vv, vy: Math.sin(a2) * vv, idade: 0, vida: 0.6 + visual() * 0.6 });
    }
  }
  for (const L of [FXG.fumo, FXG.resto]) for (const p of L) { p.x += p.vx * dt; p.y += p.vy * dt; p.idade += dt; }
  for (const p of FXG.rasteja) p.idade += dt;
  FXG.fumo = FXG.fumo.filter((p) => p.idade < p.vida);
  FXG.resto = FXG.resto.filter((p) => p.idade < p.vida);
  FXG.rasteja = FXG.rasteja.filter((p) => p.idade < p.vida);
}
// the peck's kick: 1 px, gone in 0.08 s
const gasKick = (t) => (t - FXG.kick < 0.08 ? { x: visual() < 0.5 ? -1 : 0, y: visual() < 0.5 ? 1 : 0 } : null);
function gasFxDesenha(put, t) {
  if (!PONTOS) return;
  // smoke off the muzzle: dithered, warm grey, spreading and thinning
  for (const p of FXG.fumo) {
    const f = p.idade / p.vida, r = p.r0 + f * 3.5;
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
      const d = Math.hypot(dx, dy), X = Math.round(p.x + dx), Y = Math.round(p.y + dy);
      if (d > r || BAYER[(Y & 3) * 4 + (X & 3)] / 16 > 0.55 * (1 - f) * (1 - d / (r + 1))) continue;
      put(X, Y, f < 0.15 ? [200, 150, 110] : [110, 104, 112], 0.6 * (1 - f));
    }
  }
  // the last breath: the gas's own greens, sparse
  for (const p of FXG.resto) {
    const f = p.idade / p.vida, X = Math.round(p.x), Y = Math.round(p.y);
    put(X, Y, f < 0.3 ? [150, 236, 176] : [80, 170, 110], 0.6 * (1 - f));
    if (f < 0.5) put(X - Math.sign(p.vx), Y - Math.sign(p.vy), [80, 170, 110], 0.35 * (1 - f));
  }
  // the crawling arcs and the discharges: a white-hot thread with an amber edge
  for (const a of FXG.rasteja) {
    const f = a.idade / a.vida;
    for (let s = 1; s < a.pts.length; s++) {
      const [x0, y0] = a.pts[s - 1], [x1, y1] = a.pts[s];
      linha(put, x0, y0 + 1, x1, y1 + 1, [255, 140, 50], 0.45 * (1 - f));
      linha(put, x0, y0, x1, y1, a.forte || s === 1 ? [255, 246, 220] : [255, 200, 120], 1 - f * 0.6);
    }
  }
}

// ─── 01/11 (8–11): THE SIGNALLED SWEEP — the cyan's beam (his choice: "Varredura avisada"; the full-screen sweep with
// one safe spot under her jaw was a single answer, learnt by dying). The beam leaves the cyan's MOUTH and sweeps a SLICE
// of the screen; the warning comes out of her EYE (his: "o raio-x pode sair dos olhos da serpente, o raio sai da boca").
//  - 1st, the top slice: safe under its stop line;
//  - 2nd, the bottom slice: safe over it;
//  - 3rd, THE SALVO (his: "uma salva de raios mais rápidos, a varredura vai ser mais rápida também [...] em diferentes
//    locais [...] divertido desviar de muitos seguidos"; "vai cortar o cenário com menos largura"): six thin beams, each
//    a narrow slice swept in 0.3 s, the next one's warning already up while one fires. DRAWN BY LOT every fight (his
//    choice), under one rule: each slice covers where the ship is and leaves a safe place ≤ 25 px away, reachable in the
//    time between the last beam's end and its own shot.
// A slice is given by where the beam's far end meets the screen's left edge (y). In vacuum a beam is straight.
// 10th round: the eye's focus is ONE straight line ("o foco sai como um foco de verdade, não faz curva"); the path a faint
// shading ("um aviso sutil do caminho"); electric crackle on the beam, visual only.
// 11th round (an analysis he passed on, and his answers: the drama in the head, the wind-up inside the same warning, the
// recovery only a breather, the animation first): HER HEAD MOVES, from the PixelLab sets (`pose=<dir>`). The generator
// RAISES and LOWERS the head rather than turning it, with the jaws gaping ~100°: the beam leaves the middle of the gape,
// straight, and every angle the slices need stays between the jaws. Which frame: by where the beam (or the eye's line)
// meets the left edge — −10 → raised, 75 → the middle (the approved pose), 150 → lowered. Each big beam, inside the
// same 1.6 s warning as before:
//   READ (0.35 s): the closed head follows the ship, a small pulse from her eye at each reading;
//   REHEARSE (0.45 s): the eye's focus runs the path once, the head following it; then the eye LOCKS (a flash, then
//     steady);
//   WIND-UP (0.8 s): back to the middle, the jaws open drawn back (`abre`), the mouth charging; then up/down to the
//     path's start;
//   FIRE: the head follows the beam; then the RECOVERY (~1.2 s, no beam): the jaws snap shut, the head is thrown back,
//     the body rocks (`recupera`).
// In the salvo the jaws stay open between the shots; each shot gets its pulse, its focus pass and its lock.
const VARRE = {
  // (12th) the bottom slice starts ON the hull (172; it started at 150, grazing it): the beam cuts the plate first, then
  // rises — the hull is the one thing on the field it can hit. No ship can be under 143, so nothing else changes
  fatias: [{ de: -10, ate: 90, dur: 0.9, carga: 1.6 }, { de: 172, ate: 60, dur: 0.9, carga: 1.6 }],
  inicio: 0.3, segura: 0.25, meia: 6, feixe: null, foraDoAviso: 0,
  // what is left of the warning (0.39 s) moves the open head to the start: up to 21 of its frames, ~1 per game frame
  fase: { le: 0.35, ensaia: 0.45, centra: 0.05, abre: 0.36 },
  recupera: { centra: 0.1, fps: 12 },
  salva: { n: 6, cargaPrimeira: 1.0, ciclo: 0.7, dur: 0.3, segura: 0.06, meia: 3, le: 0.24, centra: 0.1, semente: Number(opc.semente ?? 11) },
};
// 12th round (the effects he agreed to, from the analysis): energy falling INTO her mouth while she charges and a small
// sphere of it there; her head's lights powering up; the beam in layers (a thin white core, electric blue, an outer cyan
// glow whose opacity ripples outward) and a FRONT of energy running out of the mouth instead of the beam appearing whole;
// the shot's flash (a burst, a ring of light, the screen kicks); the hull hit hard (sparks flying off straight — vacuum —,
// small bursts, a scorch cooling white → orange → red); after the shot, discharges crawling off her jaws and a residue of
// vapour leaving the mouth straight and thinning (no rising: vacuum). All visual, on the `visual()` die.
const FX = { atrai: [], vapor: [], estouros: [], casco: new Float32Array(W), luz: 0, desc: 0 };
const yBorda = (p, x, y) => p.y + ((y - p.y) * p.x) / (p.x - x); // where the line from p through (x, y) meets x = 0
const angDe = (p, yL) => Math.atan2(yL - p.y, -p.x); // from p towards (0, yL)
// the beam from her mouth along `a`: to the left edge, or to the hull if it gets there first (it burns the plate)
function feixe(b, a) {
  const c = Math.cos(a), s = Math.sin(a);
  let L = b.x / -c, bate = false;
  if (s > 0 && b.y + L * s > CRISTA - 1) { L = (CRISTA - 1 - b.y) / s; bate = true; }
  return { x0: b.x, y0: b.y, x1: b.x + c * L, y1: b.y + s * L, bate };
}
// ─ her head ─
const KC = LADO / 256; // canvas px → screen px
const naTela = (p) => ({ x: ORIG.x + p[0] * KC, y: ORIG.y + p[1] * KC });
// which frame of a set (fractional) for a left-edge y
function poseDe(nome, yL) {
  const p = PONTOS[nome].faixa;
  return yL <= 75 ? p.meio - (p.meio - p.cima) * Math.min(1, (75 - yL) / 85) : p.meio + (p.baixo - p.meio) * Math.min(1, (yL - 75) / 75);
}
const quadroDe = (nome, x) => Math.max(0, Math.min(CAB[nome].length - 1, Math.round(x)));
// the head now: its set and frame (fractional while it moves); no set = the idle
const CABV = { nome: null, x: 0 };
const cabAgora = () => (CABV.nome ? { nome: CABV.nome, i: quadroDe(CABV.nome, CABV.x) } : null);
// a point of the frame shown ('boca' | 'olho'), on screen; null when that frame has none (jaws shut, eye hidden)
function pontoCab(tipo) {
  const q = cabAgora();
  const p = q && PONTOS[q.nome][tipo]?.[q.i];
  return p ? naTela(p) : null;
}
// the head moves toward frame `alvo` of a set through the clip's own frames, ≤ `vel` frames/s. A set is entered at the
// middle pose it shares with the one before (the approved frame, or the open jaws drawn back)
function vira(nome, alvo, vel) {
  if (CABV.nome !== nome) { CABV.nome = nome; CABV.x = PONTOS[nome].faixa.meio; }
  const d = alvo - CABV.x, m = vel / FPS;
  CABV.x += Math.abs(d) <= m ? d : Math.sign(d) * m;
}
// the open mouth for a beam whose far end is at yL (the head follows the beam)
const bocaPara = (yL) => naTela(PONTOS.aberta.boca[quadroDe('aberta', poseDe('aberta', yL))]);
// the beam's y at column x when its far end is at yL, and its inverse (the mouth moves with yL, so it is solved)
const yNaColuna = (yL, x) => { const b = bocaPara(yL); return b.y + ((yL - b.y) * (b.x - x)) / b.x; };
function yLPara(x, y) {
  let lo = -400, hi = 600;
  for (let k = 0; k < 50; k++) { const md = (lo + hi) / 2; if (yNaColuna(md, x) < y) lo = md; else hi = md; }
  return (lo + hi) / 2;
}
// the path drawn: EXACTLY where the beam will pass (its band, tremor included, over the whole sweep, the head following
// it); per pixel, how far into the sweep (0–1) the beam first covers it
function caminho(f) {
  if (f.u) return f.u;
  const m = (f.meia ?? VARRE.meia) + 0.6, u = (f.u = new Float32Array(W * H).fill(Infinity));
  const n = Math.max(40, Math.ceil(Math.abs(f.ate - f.de) * 4));
  for (let s = 0; s <= n; s++) {
    const uu = s / n, yL = f.de + (f.ate - f.de) * uu, b = bocaPara(yL), fx = feixe(b, angDe(b, yL));
    const L = Math.hypot(fx.x1 - fx.x0, fx.y1 - fx.y0), ux = (fx.x1 - fx.x0) / L, uy = (fx.y1 - fx.y0) / L;
    for (let q = 0; q <= L; q += 0.5) for (let w = -m; w <= m; w += 0.5) {
      const x = Math.round(fx.x0 + ux * q - uy * w), y = Math.round(fx.y0 + uy * q + ux * w);
      if (x >= 0 && x < W && y >= 0 && y < H && uu < u[y * W + x]) u[y * W + x] = uu;
    }
  }
  return u;
}
// the timeline of the two big slices; the salvo's slices are drawn by `sorteiaSalva` (they need the ship)
const DREC = VARRE.recupera.centra + (HAB === 'varredura' ? CAB.recupera.length : 13) / VARRE.recupera.fps;
{
  let tt = VARRE.inicio;
  const F = VARRE.fase;
  for (const f of VARRE.fatias) {
    f.t0 = tt; f.t1 = tt + f.carga; f.t2 = f.t1 + f.dur; f.t3 = f.t2 + VARRE.segura;
    f.tE = f.t0 + F.le; f.tC = f.tE + F.ensaia; f.tA = f.tC + F.centra; f.tAb = f.tA + F.abre; f.tCab = f.t0;
    f.recupera = true;
    tt = f.t3 + DREC; // the next one reads right after the recovery, from the approved pose it ends on
  }
  VARRE.salva.t0 = tt;
}
// THE SALVO'S RULE, at the ship's column x: slice k covers the ship's centre P (it must move) with a band 26–38 px tall,
// whose near edge is 5–12 px from P, so the way out (that edge + the hitbox's half-height + 8 px) is ≤ 25 px — 0.23 s at
// 110 px/s, inside the 0.34 s between the last beam's end and this one's shot; the way out stays on screen; the side and
// the sweep's direction are drawn. Since 11 the band is solved with the mouth moving with the head. Returns the slices
// and where the ship goes for each.
function sorteiaSalva(P0, x) {
  let s = VARRE.salva.semente;
  const sorte = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
  const S = VARRE.salva, saidas = [];
  let P = P0;
  for (let i = 0; i < S.n; i++) {
    const d = 5 + sorte() * 7, h = 26 + sorte() * 12, sai = d + 4.5 + 8; // 8 px of room
    let sobe = sorte() < 0.5;
    if (P - sai < 30) sobe = false;
    if (P + sai > 143) sobe = true;
    const lo = sobe ? P - d : P + d - h, hi = lo + h, Q = sobe ? P - sai : P + sai;
    const mv = S.meia * 1.05; // the thin beam's vertical half-height at this slope
    const yA = yLPara(x, lo + mv), yB = yLPara(x, hi - mv);
    const desce = sorte() < 0.5;
    const carga = i ? S.ciclo : S.cargaPrimeira, t1 = S.t0 + S.cargaPrimeira + i * S.ciclo;
    const f = { de: desce ? yA : yB, ate: desce ? yB : yA, dur: S.dur, carga, meia: S.meia, salva: true,
      t0: t1 - carga, t1, t2: t1 + S.dur, t3: t1 + S.dur + S.segura, tFoco: [t1 - 0.6, t1 - 0.3] };
    if (i === 0) { f.tE = f.t0 + S.le; f.tA = f.tE + S.centra; f.tAb = f.tA + VARRE.fase.abre; f.tCab = f.t0; }
    else f.tCab = VARRE.fatias[VARRE.fatias.length - 1].t3; // the jaws stay open: straight to the next start
    if (i === S.n - 1) f.recupera = true;
    VARRE.fatias.push(f);
    saidas.push({ t: t1, de: P, para: Q });
    P = Q;
  }
  VARRE.fimRec = VARRE.fatias[VARRE.fatias.length - 1].t3 + DREC;
  return saidas;
}
function varrePasso(t) {
  VARRE.feixe = null;
  // the head: the beam being fired leads; then a charge in progress; then a recovery; else the idle
  const ativa = VARRE.fatias.find((f) => t >= f.t1 && t < f.t3);
  const carrega = !ativa && VARRE.fatias.find((f) => t >= f.tCab && t < f.t1);
  const recup = !ativa && !carrega && VARRE.fatias.find((f) => f.recupera && t >= f.t3 && t < f.t3 + DREC);
  const meioF = PONTOS.fechada.faixa.meio;
  if (ativa) {
    const u = Math.min(1, (t - ativa.t1) / ativa.dur);
    CABV.nome = 'aberta'; CABV.x = poseDe('aberta', ativa.de + (ativa.ate - ativa.de) * u);
  } else if (carrega) {
    const f = carrega;
    if (f.tE != null && t < f.tE) { // READ: her eye's line through the ship, the head following it
      const yL = yBorda(naTela(PONTOS.fechada.olho[meioF]), naveX, naveY);
      vira('fechada', poseDe('fechada', yL), 20);
    } else if (f.tC != null && t < f.tC) vira('fechada', poseDe('fechada', f.de + ((f.ate - f.de) * (t - f.tE)) / (f.tC - f.tE)), 40);
    else if (f.tA != null && t < f.tA) vira('fechada', meioF, 60);
    else if (f.tAb != null && t < f.tAb) { CABV.nome = 'abre'; CABV.x = ((t - f.tA) / (f.tAb - f.tA)) * (CAB.abre.length - 1); }
    else { // the open head to the slice's start, eased, arriving just before the shot
      if (CABV.nome !== 'aberta') { CABV.nome = 'aberta'; CABV.x = PONTOS.aberta.faixa.meio; }
      if (f.xIni == null) { f.xIni = CABV.x; f.tIni = t; }
      const u = Math.min(1, (t - f.tIni) / Math.max(0.05, f.t1 - 0.03 - f.tIni)), e = u * u * (3 - 2 * u);
      CABV.x = f.xIni + (poseDe('aberta', f.de) - f.xIni) * e;
    }
  } else if (recup) {
    const tr = t - recup.t3;
    if (tr < VARRE.recupera.centra) vira('aberta', PONTOS.aberta.faixa.meio, 80);
    else { CABV.nome = 'recupera'; CABV.x = Math.min(CAB.recupera.length - 1, (tr - VARRE.recupera.centra) * VARRE.recupera.fps); }
  } else CABV.nome = null;
  efeitosPasso(t);
  if (!ativa) return;
  // the beam: from the mouth of the frame shown, its far end swept steadily along the left edge. (12th) It does not
  // appear whole: a front of energy runs out of the mouth (0.09 s; 0.05 in the salvo) — only what is drawn hurts
  const f = ativa, u = Math.min(1, (t - f.t1) / f.dur), m = f.meia ?? VARRE.meia, yL = f.de + (f.ate - f.de) * u, b = bocaPara(yL);
  const cheio = feixe(b, angDe(b, yL)), frente = Math.min(1, (t - f.t1) / (f.salva ? 0.05 : 0.09));
  VARRE.feixe = { x0: cheio.x0, y0: cheio.y0, x1: cheio.x0 + (cheio.x1 - cheio.x0) * frente, y1: cheio.y0 + (cheio.y1 - cheio.y0) * frente,
    bate: cheio.bate && frente >= 1, frente, ds: t - f.t1, salva: !!f.salva, meia: t > f.t3 - 0.1 ? (m * Math.max(0, f.t3 - t)) / 0.1 : m };
  if (!VARRE.feixe.bate) FX.bateAnt = null;
  if (VARRE.feixe.bate) {
    const xb = VARRE.feixe.x1;
    if (acaso() < 0.7) faiscas(xb, CRISTA - 1, 2, COR.ciano);
    // (12th) the hull hit hard: the plate heats where it cuts — the whole stretch since the last frame (the bite runs
    // ~17 px a frame), so the cut is a line —, sparks fly off it straight, small bursts
    const xa = FX.bateAnt ?? xb, lo = Math.min(xa, xb), hi = Math.max(xa, xb);
    for (let x = Math.floor(lo - 3); x <= Math.ceil(hi + 3); x++)
      if (x >= 0 && x < W) FX.casco[x] = Math.max(FX.casco[x], x >= lo && x <= hi ? 1 : 1 - Math.min(Math.abs(x - lo), Math.abs(x - hi)) * 0.18);
    FX.bateAnt = xb;
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI * (0.08 + visual() * 0.84), v = 60 + visual() * 110;
      gas.push({ x: xb, y: CRISTA - 1, vx: Math.cos(a) * v, vy: Math.sin(a) * v, idade: 0, vida: 0.12 + visual() * 0.2,
        faisca: visual() < 0.5 ? [255, 236, 190] : [160, 210, 255], rasto: true });
    }
    if (visual() < 0.3) FX.estouros.push({ x: xb + (visual() - 0.5) * 4, y: CRISTA - 2 - visual() * 3, idade: 0, vida: 0.12 + visual() * 0.12, r: 2 + visual() * 2.5 });
  }
  // (10th round) electric sparks thrown off its sides, visual only
  {
    const fx0 = VARRE.feixe, L0 = Math.hypot(fx0.x1 - fx0.x0, fx0.y1 - fx0.y0), ux = (fx0.x1 - fx0.x0) / L0, uy = (fx0.y1 - fx0.y0) / L0;
    for (let i = 0; i < (m > 4 ? 3 : 1); i++) {
      if (visual() > 0.7) continue;
      const s0 = 10 + visual() * (L0 - 10), lado = visual() < 0.5 ? -1 : 1, v = 50 + visual() * 70, sp = (visual() - 0.5) * 60;
      gas.push({ x: fx0.x0 + ux * s0 - uy * lado * m, y: fx0.y0 + uy * s0 + ux * lado * m, vx: -uy * lado * v + ux * sp, vy: ux * lado * v + uy * sp,
        idade: 0, vida: 0.08 + visual() * 0.12, faisca: [150, 190, 255], rasto: true });
    }
  }
  // the check: every point of the beam's band lies on the path that was drawn
  const P = caminho(f), fx = VARRE.feixe;
  const L = Math.hypot(fx.x1 - fx.x0, fx.y1 - fx.y0), nx = -(fx.y1 - fx.y0) / L, ny = (fx.x1 - fx.x0) / L;
  for (let q = 6; q <= L; q += 2) for (const lado of [-m * 0.98, 0, m * 0.98]) {
    const x = Math.round(fx.x0 + ((fx.x1 - fx.x0) * q) / L + nx * lado), y = Math.round(fx.y0 + ((fx.y1 - fx.y0) * q) / L + ny * lado);
    if (x >= 0 && x < W && y >= 0 && y < H && P[y * W + x] === Infinity) VARRE.foraDoAviso++;
  }
}
// (12th) the effects' state, each game frame
function efeitosPasso(t) {
  const dt = 1 / FPS, B = pontoCab('boca');
  // her head's lights: up with the charge (from the jaws opening), full while she fires, fading after
  const ini = (f) => f.tA ?? f.t1 - 0.34;
  const fc = VARRE.fatias.find((f) => t >= ini(f) && t < f.t3);
  const alvo = fc ? (t < fc.t1 ? (t - ini(fc)) / (fc.t1 - ini(fc)) : 1) : 0;
  FX.luz = alvo >= FX.luz ? alvo : FX.luz * Math.exp(-dt / 0.35);
  // energy drawn INTO the mouth: sparks born on a ring around it, falling in faster and faster
  if (fc && t < fc.t1 && B) for (let i = 0; i < (fc.salva ? 1 : 2); i++)
    if (visual() < 0.45 + 0.55 * alvo) FX.atrai.push({ a: visual() * 6.283, r0: (fc.salva ? 9 : 13) + visual() * (fc.salva ? 7 : 11), idade: 0, vida: 0.2 + visual() * 0.16 });
  for (const p of FX.atrai) p.idade += dt;
  FX.atrai = FX.atrai.filter((p) => p.idade < p.vida);
  // as a beam dies: discharges off the jaws (strong after a big beam and the salvo's last, short between salvo shots)
  // and the residue — vapour leaving the mouth along the last aim, straight, spreading and thinning
  const fim = VARRE.fatias.find((f) => t >= f.t3 - 0.12 && t < f.t3);
  if (fim && B) {
    const curto = fim.salva && !fim.recupera;
    FX.desc = Math.max(FX.desc, curto ? 0.45 : 1);
    const ang = angDe(B, fim.ate);
    for (let i = 0; i < (curto ? 1 : 3); i++) {
      const a = ang + (visual() - 0.5) * 0.9, v = 8 + visual() * 16;
      FX.vapor.push({ x: B.x + (visual() - 0.5) * 3, y: B.y + (visual() - 0.5) * 3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, idade: 0, vida: 0.8 + visual() * 0.7, r0: 1 + visual() * 1.5 });
    }
  }
  FX.desc *= Math.exp(-dt / 0.45);
  for (const p of FX.vapor) { p.x += p.vx * dt; p.y += p.vy * dt; p.idade += dt; }
  FX.vapor = FX.vapor.filter((p) => p.idade < p.vida);
  for (const e of FX.estouros) e.idade += dt;
  FX.estouros = FX.estouros.filter((e) => e.idade < e.vida);
  for (let x = 0; x < W; x++) FX.casco[x] *= Math.exp(-dt / 1.4);
}
// (12th) the screen kicks when a big beam fires (2 px, gone in 0.16 s)
function varreTreme(t) {
  const f = VARRE.fatias.find((g) => !g.salva && t >= g.t1 && t < g.t1 + 0.16);
  if (!f) return null;
  const a = 2 * (1 - (t - f.t1) / 0.16);
  return { x: Math.round((visual() - 0.5) * 2 * a), y: Math.round((visual() - 0.5) * 2 * a) };
}
// a thin ring (the eye's reading pulse)
function anel(put, cx, cy, r, cor, a) {
  const n = Math.max(8, Math.ceil(r * 7));
  for (let k = 0; k < n; k++) put(cx + Math.cos((k / n) * 6.283) * r, cy + Math.sin((k / n) * 6.283) * r, cor, a);
}
function brilho(put, cx, cy, r, miolo, borda, a) {
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
    const d = Math.hypot(dx, dy);
    if (d <= r) put(cx + dx, cy + dy, d < r * 0.45 ? miolo : borda, a * (1 - d / (r + 1)));
  }
}
function varreDesenha(put, t) {
  const fx = VARRE.feixe, E = pontoCab('olho'), B = pontoCab('boca');
  // (12th) the scorch on the plate where the beam cut: white-hot → orange → red, cooling (a glow just over the plate)
  for (let x = 0; x < W; x++) {
    const h = FX.casco[x];
    if (h < 0.03) continue;
    const cor = h > 0.7 ? [255, 238, 200] : h > 0.42 ? [255, 150, 60] : h > 0.2 ? [205, 70, 30] : [130, 34, 22];
    put(x, CRISTA, cor, Math.min(1, h * 1.5));
    put(x, CRISTA + 1, cor, Math.min(1, h * 0.9));
    put(x, CRISTA + 2, cor, h * 0.4);
    if (h > 0.3) put(x, CRISTA - 1, [255, 190, 120], (h - 0.3) * 0.5);
  }
  // (12th) the residue: soft dithered puffs, spreading and thinning
  for (const p of FX.vapor) {
    const u = p.idade / p.vida, r = p.r0 + 4 * u, a = 0.32 * (1 - u);
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      const X = Math.round(p.x + dx), Y = Math.round(p.y + dy);
      if (BAYER[(Y & 3) * 4 + (X & 3)] / 16 < (1 - d / (r + 0.5)) * 0.9) put(X, Y, [140, 200, 255], a);
    }
  }
  for (const f of VARRE.fatias) {
    if (t < f.t0 || t >= f.t2) continue;
    const c = Math.min(1, (t - f.t0) / f.carga), carregando = t < f.t1;
    // the path still to come: a faint shading, exactly where the beam will pass (never over her head)
    const P = caminho(f), uAgora = carregando ? 0 : Math.min(1, (t - f.t1) / f.dur), dens = carregando ? 0.04 + 0.05 * c : 0.05;
    for (let y = 0; y < CRISTA; y++) for (let x = 0; x < 226; x++) {
      const v = P[y * W + x];
      if (v !== Infinity && v >= uAgora && BAYER[(y & 3) * 4 + (x & 3)] / 16 < dens) put(x, y, [120, 150, 255], 0.22);
    }
    if (!carregando) continue;
    // READ: a small pulse from her eye at each reading (every 0.15 s while she follows the ship; once per salvo shot)
    if (E) {
      const pulsos = f.tE != null ? [f.t0, f.tE, 0.15] : [f.t1 - 0.7, f.t1 - 0.55, 0.15];
      if (t >= pulsos[0] && t < pulsos[1]) {
        const p = ((t - pulsos[0]) % pulsos[2]) / pulsos[2];
        anel(put, E.x, E.y, 1.5 + 5 * p, [190, 220, 255], 0.75 * (1 - p));
      }
    }
    // REHEARSE: her eye's focus runs the path once, ONE straight line from the eye
    const tf0 = f.tC != null ? f.tE : f.tFoco[0], tf1 = f.tC != null ? f.tC : f.tFoco[1];
    if (E && t >= tf0 && t < tf1) {
      const u = (t - tf0) / (tf1 - tf0), foco = feixe(E, angDe(E, f.de + (f.ate - f.de) * u)), LF = Math.hypot(foco.x1 - foco.x0, foco.y1 - foco.y0);
      for (let s = 3; s < LF; s += 0.5)
        put(foco.x0 + ((foco.x1 - foco.x0) * s) / LF, foco.y0 + ((foco.y1 - foco.y0) * s) / LF, [200, 222, 255], (0.3 + 0.2 * c) * (1 - (0.6 * s) / LF));
    }
    // her eye: a soft glint while she reads; from the end of the focus pass it LOCKS — a flash, then a steady hard glint
    if (E) {
      if (t < tf1) brilho(put, E.x, E.y, 2.2, [240, 248, 255], NUCLEO.ciano, 0.6 + 0.3 * Math.sin(t * 30));
      else if (t < tf1 + 0.08) brilho(put, E.x, E.y, 4, [255, 255, 255], [220, 236, 255], 1);
      else brilho(put, E.x, E.y, 2.4, [250, 252, 255], NUCLEO.ciano, 1);
    }
    // WIND-UP (12th): energy falls into her mouth, and a small sphere of it grows there, flickering
    const tCarga = f.tA ?? f.t1 - 0.34;
    if (B && t >= tCarga) {
      const cw = Math.min(1, (t - tCarga) / (f.t1 - tCarga)), r = (f.salva ? 1.5 + 2.2 * cw : 2 + 3.6 * cw) + (visual() - 0.5) * 0.5;
      brilho(put, B.x, B.y, r + 3 + 2 * cw, [150, 225, 255], [110, 190, 255], 0.35 + 0.25 * cw);
      for (const p of FX.atrai) {
        const u = p.idade / p.vida, rr = p.r0 * Math.pow(1 - u, 1.6);
        if (rr < r) continue;
        const ca = Math.cos(p.a), sa = Math.sin(p.a);
        linha(put, B.x + ca * rr, B.y + sa * rr, B.x + ca * (rr + 1.5 + 3 * u), B.y + sa * (rr + 1.5 + 3 * u), u > 0.6 ? [235, 245, 255] : [120, 190, 255], 0.5 + 0.5 * u);
      }
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const d = Math.hypot(dx, dy);
        if (d <= r) put(B.x + dx, B.y + dy, d < r - 1 ? [238, 246, 255] : COR.ciano);
      }
    }
  }
  // the beam (12th, in layers): a thin white core, her electric blue, and an outer cyan glow whose opacity ripples
  // outward along it (it replaces the old dark edge); a pixel of tremor; a flare on her mouth; a burn where it meets the
  // hull. Drawn per pixel by its distance to the beam's line, so the glow is not stacked
  if (fx && fx.meia > 0) {
    const L = Math.hypot(fx.x1 - fx.x0, fx.y1 - fx.y0) || 1, ux = (fx.x1 - fx.x0) / L, uy = (fx.y1 - fx.y0) / L;
    const m = fx.meia + (Math.floor(t * 30) % 2) * (fx.meia > 4 ? 0.6 : 0.3), halo = fx.meia > 4 ? 4 : 2, nuc = Math.max(0.75, m * 0.2);
    const R = m + halo, bx0 = Math.floor(Math.min(fx.x0, fx.x1) - R), bx1 = Math.ceil(Math.max(fx.x0, fx.x1) + R);
    const by0 = Math.floor(Math.min(fx.y0, fx.y1) - R), by1 = Math.ceil(Math.max(fx.y0, fx.y1) + R);
    for (let Y = Math.max(0, by0); Y <= Math.min(H - 1, by1); Y++) for (let X = Math.max(0, bx0); X <= Math.min(W - 1, bx1); X++) {
      const px = X - fx.x0, py = Y - fx.y0, s = px * ux + py * uy;
      if (s < 0 || s > L) continue;
      const aw = Math.abs(-px * uy + py * ux);
      if (aw > R) continue;
      if (aw <= nuc) put(X, Y, [248, 252, 255]);
      else if (aw <= m * 0.7) put(X, Y, COR.ciano);
      else put(X, Y, [120, 215, 255], (0.72 + 0.28 * Math.sin(s * 0.16 - t * 38)) * 0.8 * (1 - (aw - m * 0.7) / (R - m * 0.7)));
    }
    for (const [cx, cy, r] of [[fx.x0, fx.y0, fx.meia > 4 ? 7 : 4], ...(fx.bate ? [[fx.x1, CRISTA - 2, 4]] : [])])
      brilho(put, cx, cy, r, [240, 246, 255], NUCLEO.ciano, 1);
    // the front, while it runs: a bulb of energy at its tip
    if (fx.frente < 1) brilho(put, fx.x1, fx.y1, m + 2.5, [255, 255, 255], [150, 225, 255], 1);
    // the shot's flash: a burst on her mouth (the screen kicks: varreTreme). No ring of light running out of it: in
    // vacuum there is nothing for a pulse to light up on its way
    if (fx.ds < 0.12) {
      const k = fx.ds / 0.12;
      brilho(put, fx.x0, fx.y0, (fx.salva ? 7 : 13) * (1 - 0.45 * k), [255, 255, 255], [190, 230, 255], 1 - 0.5 * k);
    }
    // 10th round (his: "efeitos no raio, como se faíscas elétricas saíssem ou em volta dele"; visual only, they do not
    // hurt): short jagged arcs jumping off its edges, new every frame
    const grosso = fx.meia > 4;
    for (let i = 0; i < (grosso ? 6 : 3); i++) {
      const s0 = 14 + visual() * (L - 14), lado = visual() < 0.5 ? -1 : 1, comp = 4 + visual() * (grosso ? 11 : 7), n = 3 + Math.floor(visual() * 2);
      let xa = fx.x0 + ux * s0 - uy * lado * fx.meia, ya = fx.y0 + uy * s0 + ux * lado * fx.meia, sa = s0;
      for (let p = 1; p <= n; p++) {
        sa += (visual() - 0.35) * 4;
        const o = fx.meia + (comp * p) / n + (visual() - 0.5) * 2;
        const xb = fx.x0 + ux * sa - uy * lado * o, yb = fx.y0 + uy * sa + ux * lado * o;
        linha(put, xa, ya, xb, yb, p === 1 ? [235, 245, 255] : [150, 185, 255], 1 - (0.45 * p) / n);
        xa = xb; ya = yb;
      }
    }
  }
  // (12th) after the shot: discharges crawling off her jaws, fading — they follow her head through the recoil
  if (B && FX.desc > 0.05) {
    const n = Math.round(2 + 5 * FX.desc);
    for (let i = 0; i < n; i++) {
      if (visual() > 0.4 + 0.6 * FX.desc) continue;
      let a = visual() * 6.283, xa = B.x + Math.cos(a) * 2, ya = B.y + Math.sin(a) * 2;
      const comp = 5 + visual() * 9 * (0.4 + 0.6 * FX.desc);
      for (let p = 1; p <= 3; p++) {
        a += (visual() - 0.5) * 1.4;
        const xb = xa + (Math.cos(a) * comp) / 3, yb = ya + (Math.sin(a) * comp) / 3;
        linha(put, xa, ya, xb, yb, p === 1 ? [240, 248, 255] : [140, 200, 255], Math.min(1, 0.4 + FX.desc) * (1 - (0.3 * p) / 3));
        xa = xb; ya = yb;
      }
    }
  }
  // (12th) the small bursts where the beam bites the plate
  for (const e of FX.estouros) {
    const k = e.idade / e.vida;
    brilho(put, e.x, e.y, e.r * (0.6 + 0.6 * k), [255, 245, 220], [255, 170, 80], 1 - k);
  }
}
// the salvo, drawn for the mannequin's column, from where it waits after the bottom slice
const SAIDAS = HAB === 'varredura' ? sorteiaSalva(50, 85 - 1.5) : [];

const proj = [];
// 0.6 s of idle first; the sweep's (11th round) lasts one idle cycle, so her head leaves the idle on its frame 0 (the
// approved pose every set starts from), and its length follows the timeline
// (13th) with the gas heads' sets, likewise one idle cycle first (the jaws open as the idle comes back to its frame 0),
// and the mock runs until she is back in the idle
// (on the 7th round's frame grid — 0.6 s + whole frames — so every event lands on the same frame as before)
const PRE = HAB === 'varredura' ? 9 / 8 - VARRE.inicio : HAB === 'gas' && PONTOS ? 0.6 + Math.ceil((9 / 8 - tAbre - 0.6) * FPS) / FPS : 0.6;
GCAB.tIdle = -PRE;
const NQ = HAB === 'varredura' ? Math.ceil((VARRE.fimRec + 0.6 + PRE) * FPS)
  : HAB === 'gas' && PONTOS ? Math.ceil((PRE + Math.max(TOTAL - 0.6, GASCFG.contra || GASCFG.carta ? 0 : tVolta + 0.6)) * FPS) : TOTAL * FPS;
for (let k = 0; k < NQ; k++) {
  const t = k / FPS - PRE;
  const cq = HAB === 'gas' || HAB === 'varredura' ? null : clipEm(t);
  // ─── the skills ───
  if (HAB === 'gas') {
    // the idle frame `quadro` will draw: the mouths follow it. (13th) With her sets, the idle restarts on its frame 0
    // whenever she comes back to it (every set ends on the approved frame)
    idleAtual = (PONTOS ? Math.floor((t - GCAB.tIdle) * 8) : Math.floor((k / FPS) * 8)) % 9;
    // 7th round: the mannequin plays each dodge (keyframes [t, y]; eased, or `true` = a steady glide), ≤ 110 px/s.
    // Alone: steps up out of the fan's line, holds still between the rails, keeps gliding up through the file.
    // Shooting (the counter): late into the gas in the 1st window, dodges the fan, back into the low gas in the 2nd.
    // With the card: into the gas, first touch.
    const CAM = {
      padroes: [[0, 100], [4.25, 100], [4.65, 73], [6.1, 73], [6.7, 100], [9.6, 100], [10.05, 120], [10.4, 120], [11.9, 30, true]],
      contra: [[0, 100], [2.3, 100], [2.7, Number(opc.baixo ?? 132)], [4.2, Number(opc.baixo ?? 132)], [4.6, 104], [5.95, 104], [6.35, Number(opc.baixo ?? 132)]],
      carta: [[0, 100], [0.9, 100], [1.3, Number(opc.baixo ?? 132)]],
    }[GASCFG.carta ? 'carta' : GASCFG.contra ? 'contra' : 'padroes'];
    naveX = GASCFG.contra || GASCFG.carta ? 90 : 85;
    naveY = CAM[CAM.length - 1][1];
    if (t <= CAM[0][0]) naveY = CAM[0][1];
    else for (let i = 1; i < CAM.length; i++) if (t <= CAM[i][0]) {
      const [t0, y0] = CAM[i - 1], [t1, y1, reta] = CAM[i], u = (t - t0) / (t1 - t0);
      naveY = y0 + (y1 - y0) * (reta ? u : u * u * (3 - 2 * u));
      break;
    }
    gasCabPasso(t);
    if (PONTOS && !GCAB.q) idleAtual = Math.floor((t - GCAB.tIdle) * 8) % 9; // back to the idle this very frame
    gasPasso(t);
    gasFxPasso(t);
    // `rastreia=<file.json>`: where the jelly is each frame (the sheet's zoomed strips) and how close it gets to the
    // ship's hitbox (its visible radius, wobble included)
    if (opc.rastreia) (globalThis.rastro ??= []).push({ k, t: +t.toFixed(3), nave: naveC(), termo: +termo.mostra.toFixed(3), cab: GCAB.q,
      bocas: { verde: boca('verde'), laranja: boca('laranja'), ciano: boca('ciano') },
      g: geleias.map((g) => ({ id: g.id, x: +g.x.toFixed(1), y: +g.y.toFixed(1), mae: !!g.mae, preso: g.preso ?? null,
        r: +(raioDe(g) * (0.85 + 0.15 * g.calor) * (1 + Math.hypot(g.A[0], g.A[1]) + Math.hypot(g.A[2], g.A[3]))).toFixed(2) })) });
  } else if (HAB === 'varredura') {
    idleAtual = Math.floor((k / FPS) * 8) % 9;
    // the mannequin reads each slice and leaves it: down under the top slice, up over the bottom one; in the salvo it
    // takes each way out once the last beam is gone (keyframes [t, x, y]; eased, or `true` = a steady glide), ≤ 110 px/s
    const F2 = VARRE.fatias[1];
    const CAMV = [[0, 85, 100], [0.6, 85, 100], [1.0, 85, 128], [F2.t0 + 0.3, 85, 128], [F2.t1 - 0.2, 85, 50]];
    for (const s of SAIDAS) CAMV.push([s.t - 0.32, 85, s.de], [s.t - 0.06, 85, s.para, true]);
    naveX = CAMV[CAMV.length - 1][1]; naveY = CAMV[CAMV.length - 1][2];
    if (t <= CAMV[0][0]) { naveX = CAMV[0][1]; naveY = CAMV[0][2]; }
    else for (let i = 1; i < CAMV.length; i++) if (t <= CAMV[i][0]) {
      const [t0, x0, y0] = CAMV[i - 1], [t1, x1, y1, reta] = CAMV[i], u = (t - t0) / (t1 - t0), e = reta ? u : u * u * (3 - 2 * u);
      naveX = x0 + (x1 - x0) * e; naveY = y0 + (y1 - y0) * e;
      break;
    }
    varrePasso(t);
    if (opc.rastreia) (globalThis.rastro ??= []).push({ k, t: +t.toFixed(3), nave: naveC(), raio: VARRE.feixe ? { ...VARRE.feixe } : null, cab: cabAgora() });
  } else if (HAB === 'quicante' && JATO === 'vivo') {
    VIVO.ordem.forEach((cor, j) => {
      const tj = VIVO.acoes ? (VIVO.acoes[j] * PASSO) / FPS : tAcao + j * VIVO.passo;
      if (t >= tj - 1e-6 && !VIVO[`solta${j}`]) {
        VIVO[`solta${j}`] = true; // once (a frame landing exactly on tj fired it twice)
        const b = boca(cor), yAp = CRISTA - 7 - VIVO.altura * Math.pow(0.5, j);
        const vy = -Math.sqrt(2 * G * Math.max(0, b.y - yAp));
        // spat off balance: it leaves tumbling, and the stabilizers have to catch it
        proj.push({ cor, x: b.x, y: b.y, vx: VIVO.vx[j], vy, r: 7, sq: 1, vivo: true, vxAlvo: VIVO.vx[j], g: { x: b.x, y: b.y, vx: VIVO.vx[j], vy },
          d: [0, 0], dw: 0, th: acaso() * 6.28, om: (acaso() < 0.5 ? -1 : 1) * (4 + acaso() * 3), need: [0, 0], needW: 0, tBate: -1 });
      }
    });
    for (const p of proj) {
      (p.hist ??= []).push({ x: p.x, y: p.y });
      if (p.hist.length > 48) p.hist.shift();
      vivoPasso(p);
    }
    naveY = 104 + Math.sin(k / 22) * 18;
    naveX = 82 + Math.sin(k / 40) * 42;
  } else if (HAB === 'quicante') {
    // each head lobs a big glob that bounces along the hull towards the left; the heads fire in turn
    const ordem = ['ciano', 'verde', 'laranja'];
    ordem.forEach((cor, j) => {
      const tj = tAcao + j * Number(opc.passo ?? 0.35); // passo=0 when the clip has the three spitting together
      if (t >= tj && t - 1 / FPS < tj) {
        const b = boca(cor);
        // different rhythms: the cyan low and fast, the green high, the amber in between
        const alto = [34, 70, 50][j], vx = [-120, -78, -98][j];
        // spat the same way as before; on jets, the nozzles light 0.12 s later (until then it flies straight)
        proj.push({ cor, x: b.x, y: b.y, vx, vy: -Math.sqrt(2 * 420 * Math.max(10, b.y - (CRISTA - 7 - alto))) * 0.6, alto, r: 7, sq: 1, liga: t + 0.12, chute: 0, lado: 0 });
      }
    });
    for (const p of proj) {
      const chao = CRISTA - p.r;
      // the path it drew (the last 1.6 s), so the arc's shape can be read and compared between versions
      (p.hist ??= []).push({ x: p.x, y: p.y });
      if (p.hist.length > 48) p.hist.shift();
      if (!JATO) {
        p.vy += 420 / FPS;
        p.x += p.vx / FPS; p.y += p.vy / FPS;
        if (p.y >= chao) { p.y = chao; p.vy = -Math.sqrt(2 * 420 * p.alto); p.sq = 1.35; }
        else p.sq += (1 - p.sq) * 0.35;
        continue;
      }
      // ZERO-G: the acceleration is the jets' choice. In flight the top nozzle pushes down with G (the arc of a
      // natural bounce, same curve); right after a hull hit the bottom nozzles kick (altura/mira); in mira the side
      // nozzles also set the next landing under the ship, at take-off only — after that the arc is fixed and readable
      let ax = 0, ay = t >= p.liga ? G : 0;
      if (p.chute > 0) { ay = p.ayChute; p.chute -= 1 / FPS; }
      if (p.lado > 0) { ax = p.axLado; p.lado -= 1 / FPS; }
      p.vx += ax / FPS; p.vy += ay / FPS;
      p.x += p.vx / FPS; p.y += p.vy / FPS;
      p.forcas = BOCAIS.map(([ux, uy]) => {
        const f = Math.max(0, -(ax * ux + ay * uy)) / G;
        if (f > 0.02) { const o = bocal(p, ux, uy); jato(o.x, o.y, ux, uy, Math.min(2.4, f) * 0.6, p.vx, p.vy); }
        return f;
      });
      if (p.y >= chao && p.vy > 0) {
        // the hull is a real surface: a real collision (restitution 0.8), sparks off the plate
        p.y = chao; p.sq = 1.35;
        faiscas(p.x, CRISTA - 1, 7, COR[p.cor]);
        p.vy = -0.8 * p.vy;
        if (JATO !== 'natural') {
          // the bottom nozzles add back what the hit lost (or brake what is too much): the same height every bounce
          const alvo = -Math.sqrt(2 * G * p.alto), T = 0.1;
          p.chute = T; p.ayChute = (alvo - p.vy) / T;
          if (JATO === 'mira') {
            const voo = T + (2 * Math.abs(alvo)) / G;
            const xAlvo = Math.max(p.x - 230, Math.min(p.x - 30, naveX));
            const vxAlvo = Math.max(-180, Math.min(-25, (xAlvo - p.x) / voo));
            p.lado = 0.2; p.axLado = (vxAlvo - p.vx) / 0.2;
          }
        }
      } else p.sq += (1 - p.sq) * 0.35;
    }
    // the ship reads the arcs: it waits under the high arc and slips over the low one (a mannequin); on jets it also
    // drifts left and right, so the aimed version has something to follow
    naveY = 104 + Math.sin(k / 22) * 18;
    if (JATO) naveX = 82 + Math.sin(k / 40) * 42;
  } else if (HAB === 'raio') {
    // the charge: a glow grows in the mouth for `carga` s before the action frame; the beam fires at the action frame
    // FROM THE MOUTH and swings down from the top-left to the hull over `raio` s (drawn in `desenhar` below). 31/10: a
    // sweep across the whole screen leaves no safe row (the old mock's ship crossed it), so the mannequin waits in the
    // one wedge a beam pivoting on her jaw never reaches — under her jaw, by the hull. A proposal for him to judge.
    const tf = t - tAcao;
    const ida = Math.max(0, Math.min(1, (tf + CARGA + 0.4) / 0.6)), volta = Math.max(0, Math.min(1, (tf - DUR - 0.2) / 0.8));
    const s = ida * (1 - volta);
    naveX = 70 + s * (198 - 70); naveY = 100 + s * (138 - 100);
  } else if (HAB === 'chuva') {
    const tj = tAcao;
    if (t >= tj && t - 1 / FPS < tj) for (const cor of ['ciano', 'verde', 'laranja']) {
      const b = boca(cor);
      // `inclina` (degrees towards the left): the spit leaves along the clip's jaws (0 = straight up)
      const inc = (Number(opc.inclina ?? 0) * Math.PI) / 180;
      for (const d of [-0.18, 0, 0.18]) proj.push({ cor, x: b.x, y: b.y, vx: -Math.sin(inc + d) * 320, vy: -Math.cos(inc + d) * 320, r: 3, sobe: true });
    }
    ['ciano', 'verde', 'laranja'].forEach((cor, j) => {
      const tw = tAcao + 0.45 + j * 0.55;
      if (t >= tw && t - 1 / FPS < tw) {
        const vao = 3 + j; // the gap drifts one slot per wave
        for (let s = 0; s < 12; s++) if (s < vao || s >= vao + 3) proj.push({ cor, x: 14 + s * 24, y: -6, vx: 0, vy: 100, r: 3 });
      }
    });
    for (const p of proj) { p.x += p.vx / FPS; p.y += p.vy / FPS; }
    naveX = 70 + Math.max(0, Math.min(1, (t - tAcao - 0.3) / 0.6)) * (14 + 4 * 24 - 70 + 18);
  } else if (HAB === 'misseis') {
    // the rain as small MISSILES (his idea, 31/10: "na queda, voltam impulsionados pelos motores"). Each head spits a
    // salvo of nine, engines off, that fly straight up and out of the top (zero-g: nothing bends them). Above the screen
    // they flip and burn: the engine brakes them and pushes them back down, so each wave comes in nose-first FROM REST —
    // slow at the top (the warning), faster near the hull — and bursts on the hull. Three waves, one per head's colour,
    // the gap walking one slot per wave, as in the old rain.
    const cabs = ['ciano', 'verde', 'laranja'];
    const inc = (Number(opc.inclina ?? 35) * Math.PI) / 180;
    // (14th) "this frame crosses tx", with a hair of slack: an instant that lands exactly on a frame (1.3 s on the
    // 0.6 s + k/30 grid) used to fall between two frames in floating point — the cyan wave never came, and the green
    // one came twice
    const cruza = (tx) => t >= tx - 1e-9 && t - 1 / FPS < tx - 1e-9;
    cabs.forEach((cor, j) => {
      for (let i = 0; i < 9; i++) {
        const tl = tAcao + i * 0.022;
        if (cruza(tl)) {
          const b = boca(cor), ang = inc + ((i - 4) * 4 + (acaso() - 0.5) * 3) * (Math.PI / 180);
          proj.push({ cor, x: b.x, y: b.y, vx: -Math.sin(ang) * 280, vy: -Math.cos(ang) * 280, missil: true });
        }
      }
      const tw = tAcao + 0.55 + j * 0.6;
      if (cruza(tw)) {
        // ten slots, all in front of her (x ≤ 212): her own missiles do not land on her
        const vao = 3 + j;
        for (let s = 0; s < 10; s++) if (s < vao || s >= vao + 3) proj.push({ cor, x: 14 + s * 22, y: -6, vx: 0, vy: 0, missil: true, desce: true });
      }
    });
    for (const p of proj) {
      if (p.morto) continue;
      if (p.desce) {
        p.vy += AM / FPS;
        // the engine at the tail (up): gas up, push down. (14th) With a drawn missile, at its own tail, in its colour
        if (SPR) { const t0 = caudaDe(SPR.q[p.cor][0], p.x, p.y); jato(t0.x, t0.y - 1, 0, -1, 1.3, p.vx, p.vy, 200, p.cor); }
        else jato(p.x, p.y - 4, 0, -1, 1.3, p.vx, p.vy, 200);
      }
      p.x += p.vx / FPS; p.y += p.vy / FPS;
      if (!p.desce && p.y < -12) p.morto = true;
      if (p.desce && p.y + 3 >= CRISTA) {
        p.morto = true;
        claroes.push({ x: p.x, y: CRISTA - 2, cor: p.cor, idade: 0 });
        faiscas(p.x, CRISTA - 1, 6, COR[p.cor]);
      }
    }
    if (opc.rastreia) (globalThis.rastro ??= []).push({ k, t: +t.toFixed(3), p: proj.filter((p) => !p.morto).map((p) => ({ cor: p.cor, x: +p.x.toFixed(1), y: +p.y.toFixed(1), desce: !!p.desce })) });
    // the mannequin rides the gap: into the first wave's gap, then one slot right as each wave passes its row
    const passa = (j) => tAcao + 0.55 + j * 0.6 + TAIL;
    const lerp = (a, b) => Math.max(0, Math.min(1, (t - a) / b));
    naveX = 70 + 34 * lerp(tAcao, 0.8) + 22 * lerp(passa(0) + 0.08, 0.4) + 22 * lerp(passa(1) + 0.08, 0.4);
  } else if (HAB === 'tiros') {
    // the normal shots (31/10): the three short spit clips back to back (`clip-dir` holds them joined), each head
    // firing ONE aimed shot in its colour at its own action frame (`acoes`, in the joined clip), like the first serpent
    const acoes = (opc.acoes ?? '2,9,16').split(',').map(Number);
    const cabs = (opc.cabecas ?? 'ciano,laranja,verde').split(',');
    acoes.forEach((a, j) => {
      const tj = (a * PASSO) / FPS;
      if (t >= tj && t - 1 / FPS < tj) {
        const b = boca(cabs[j]);
        const dx = naveX - b.x, dy = naveY - b.y, d = Math.hypot(dx, dy);
        proj.push({ cor: cabs[j], x: b.x, y: b.y, vx: (dx / d) * 150, vy: (dy / d) * 150, r: 3, t0: t });
        // (14th, his note: the generator's spit out of the green and orange mouths was "muito forte e grande" — it was
        // cleaned off the clip; this is the discreet one) a few-pixel flash at the mouth, and the weapon's own bits:
        // the ember two sparks and a wisp of smoke, the venom three small drops. The cyan keeps its clip as it was.
        if (SPR && cabs[j] !== 'ciano' && opc.clarao !== '0') {
          const ux = dx / d, uy = dy / d;
          claroesBoca.push({ x: b.x + ux * 2, y: b.y + uy * 2, cor: cabs[j], t0: t });
          for (let q = 0; q < (cabs[j] === 'laranja' ? 2 : 3); q++) {
            const a = Math.atan2(uy, ux) + (visual() - 0.5) * 1.1, vv = cabs[j] === 'laranja' ? 45 + visual() * 35 : 22 + visual() * 22;
            rastros.push(cabs[j] === 'laranja'
              ? { x: b.x + ux * 3, y: b.y + uy * 3, vx: Math.cos(a) * vv, vy: Math.sin(a) * vv, idade: 0, vida: 0.1 + visual() * 0.1, faisca: true }
              : { x: b.x + ux * 3, y: b.y + uy * 3, vx: Math.cos(a) * vv, vy: Math.sin(a) * vv, idade: 0, vida: 0.35 + visual() * 0.25, cor: 'verde', gota: true });
          }
          if (cabs[j] === 'laranja') for (let q = 0; q < 3; q++) rastros.push({ x: b.x + ux * (2 + q), y: b.y + uy * (2 + q) + (visual() - 0.5) * 2,
            vx: ux * (6 + visual() * 6), vy: uy * (6 + visual() * 6), idade: 0, vida: 0.4 + visual() * 0.3, fumo: true });
        }
      }
    });
    for (const p of proj) { p.x += p.vx / FPS; p.y += p.vy / FPS; }
    if (opc.rastreia) (globalThis.rastro ??= []).push({ k, t: +t.toFixed(3), p: proj.map((p) => ({ cor: p.cor, x: +p.x.toFixed(1), y: +p.y.toFixed(1), t0: p.t0 })) });
    if (SPR) { // (14th) the trails: the venom drips a drop now and then, the ember smokes and sheds a spark
      for (const p of proj) {
        const modo = SPR.rastro[p.cor], v = Math.hypot(p.vx, p.vy), ux = p.vx / v, uy = p.vy / v, L = SPR.q[p.cor][0].w / 2;
        if (modo === 'pinga' && visual() < 0.22) rastros.push({ x: p.x - ux * (L - 1), y: p.y - uy * (L - 1) + (visual() - 0.5) * 2,
          vx: p.vx * 0.12 + (visual() - 0.5) * 6, vy: p.vy * 0.12 + (visual() - 0.5) * 6, idade: 0, vida: 0.45 + visual() * 0.3, cor: p.cor, gota: true });
        if (modo === 'fumaca') {
          if (visual() < 0.7) rastros.push({ x: p.x - ux * L + (visual() - 0.5) * 2, y: p.y - uy * L + (visual() - 0.5) * 2,
            vx: p.vx * 0.08 + (visual() - 0.5) * 8, vy: p.vy * 0.08 + (visual() - 0.5) * 8, idade: 0, vida: 0.35 + visual() * 0.35, fumo: true });
          if (visual() < 0.12) { const a = Math.atan2(-uy, -ux) + (visual() - 0.5) * 1.6, vv = 30 + visual() * 40;
            rastros.push({ x: p.x - ux * (L - 2), y: p.y - uy * (L - 2), vx: p.vx * 0.5 + Math.cos(a) * vv, vy: p.vy * 0.5 + Math.sin(a) * vv, idade: 0, vida: 0.1 + visual() * 0.12, faisca: true }); }
        }
      }
      for (const r of rastros) { r.x += r.vx / FPS; r.y += r.vy / FPS; r.idade += 1 / FPS; }
      for (let i = rastros.length - 1; i >= 0; i--) if (rastros[i].idade > rastros[i].vida) rastros.splice(i, 1);
    }
    naveY = 100 + Math.sin(k / 30) * 12;
  }
  passoGas();
  await quadro({
    clipQ: cq, cabQ: HAB === 'varredura' ? cabAgora() : HAB === 'gas' ? GCAB.q : null,
    idleQ: HAB === 'varredura' && t >= VARRE.fimRec ? Math.floor((t - VARRE.fimRec) * 8)
      : HAB === 'gas' && PONTOS ? Math.floor((t - GCAB.tIdle) * 8) : Math.floor((k / FPS) * 8),
    naveX, naveY, tinta: HAB === 'gas' ? tinta : 0,
    treme: HAB === 'gas' && sacode > 0 ? { x: Math.round((acaso() - 0.5) * 4 * sacode), y: Math.round((acaso() - 0.5) * 4 * sacode) }
      : HAB === 'varredura' ? varreTreme(t) : HAB === 'gas' && PONTOS ? gasKick(t) : null,
    luzCab: HAB === 'varredura' ? FX.luz : 0,
    luzes: HAB === 'gas' && PONTOS ? { verde: FXG.luzV, laranja: FXG.luzL } : null,
    desenhar: (put) => {
      if (HAB === 'raio') {
        const cor = opc.cabeca ?? 'ciano';
        const b = boca(cor);
        const tf = t - tAcao;
        // the charge glow (pixel rings growing, pulsing)
        if (tf > -CARGA && tf < 0) {
          const r = 2 + (1 + tf / CARGA) * 7, pul = 0.6 + 0.4 * Math.sin(k * 1.3);
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            const d = Math.hypot(dx, dy);
            if (d <= r) put(b.x + dx, b.y + dy, d < r * 0.45 ? NUCLEO[cor] : COR[cor], pul * (1 - d / (r + 1)));
          }
          // the telegraph: a thin dotted line along the beam's first aim (from the mouth to the left edge at y 30)
          if (tf > -0.6 * CARGA) {
            const L0 = Math.hypot(b.x, 30 - b.y);
            for (let s = 6; s < L0; s += 3) put(b.x - (b.x / L0) * s, b.y + ((30 - b.y) / L0) * s, COR[cor], 0.6);
          }
        }
        // the beam: 12 px thick, FROM THE MOUTH to the left edge, its far end swinging from y 30 down to the crest
        if (tf >= 0 && tf < DUR) {
          const yb = 30 + (tf / DUR) * (CRISTA - 10 - 30);
          const L = Math.hypot(b.x, yb - b.y) + 8, ux = -b.x / (L - 8), uy = (yb - b.y) / (L - 8);
          for (let s = 0; s < L; s += 0.5) for (let w = -6; w <= 6; w++) {
            const a = Math.abs(w);
            const c = a <= 1 ? NUCLEO[cor] : a <= 4 ? COR[cor] : BORDA[cor];
            put(b.x + ux * s - uy * w, b.y + uy * s + ux * w, c, a <= 4 ? 1 : 0.8);
          }
        }
      }
      if (HAB === 'quicante' && opc.rastro !== '0') for (const p of proj) (p.hist ?? []).forEach((h, i) => {
        put(h.x, h.y, COR[p.cor], 0.25 + 0.45 * (i / p.hist.length));
      });
      if (HAB === 'gas') { gasDesenha(put, t); gasFxDesenha(put, t); }
      if (HAB === 'varredura') varreDesenha(put, t);
      desenhaGas(put);
      for (const c of claroesBoca) { // (14th) the mouth flash: 0.03 s a 3×3 hot core, then 0.07 s a 1 px glow
        const f = t - c.t0;
        if (f < 0 || f > 0.1) continue;
        if (f < 0.034) {
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) put(c.x + dx, c.y + dy, dx || dy ? COR[c.cor] : [255, 255, 255], dx && dy ? 0.5 : 1);
        } else put(c.x, c.y, NUCLEO[c.cor], 1 - (f - 0.034) / 0.07);
      }
      for (const r of rastros) { // (14th) the shots' trails, under the shots
        const f = r.idade / r.vida;
        if (r.gota) put(r.x, r.y, f < 0.3 ? COR[r.cor] : [47, 122, 82], 1 - f * 0.8);
        else if (r.fumo) put(r.x, r.y, f < 0.25 ? [150, 120, 100] : [96, 90, 92], 0.55 * Math.pow(1 - f, 1.2));
        else if (r.faisca) put(r.x, r.y, f < 0.4 ? [255, 244, 208] : [255, 138, 44], 1 - f * 0.5);
      }
      for (const p of proj) {
        if (p.morto) continue;
        if (p.missil && SPR) { // (14th) the drawn missile; the flame only on the way down (engines off going up)
          const v = Math.hypot(p.vx, p.vy) || 1, s = SPR.q[p.cor][Math.floor((t + p.x * 0.013) * SPR.fps[p.cor]) % SPR.q[p.cor].length];
          if (p.desce) { // the flame grows out of the row right above the turned sprite's tail, on its middle column
            const t0 = caudaDe(s, p.x, p.y);
            chamaCor(put, t0.x, t0.y, 0, -1, 1.3, k, p.cor); sprite(put, s, p.x, p.y, 0, 1);
          }
          else sprite(put, s, p.x, p.y, p.vx / v, p.vy / v);
          continue;
        }
        if (p.missil) {
          const v = Math.hypot(p.vx, p.vy) || 1;
          if (p.desce) { chama(put, p.x, p.y - 4, 0, -1, 1.3, k); missil(put, p.x, p.y, 0, 1, p.cor); }
          else missil(put, p.x, p.y, p.vx / v, p.vy / v, p.cor);
          continue;
        }
        if (p.vivo) { bola(put, p.x, p.y, p.r, p.cor, p.sq, p.th); continue; }
        if (JATO && p.forcas) BOCAIS.forEach(([ux, uy], b) => {
          if (p.forcas[b] > 0.02) { const o = bocal(p, ux, uy); chama(put, o.x + ux, o.y + uy, ux, uy, p.forcas[b], k); }
        });
        if (SPR && HAB === 'tiros') { // (14th) the drawn shot, turned to its flight, its frames running from its birth
          const v = Math.hypot(p.vx, p.vy) || 1, Q = SPR.q[p.cor];
          sprite(put, Q[Math.floor((t - p.t0) * SPR.fps[p.cor]) % Q.length], p.x, p.y, p.vx / v, p.vy / v);
          continue;
        }
        if (p.r >= 6) gota(put, p.x, p.y, p.r, p.cor, p.sq);
        else gota(put, p.x, p.y, p.r, p.cor);
        if (JATO && p.r >= 6) for (const [ux, uy] of BOCAIS) { // the four nozzles: a dark stub with a lit edge
          const o = bocal(p, ux, uy);
          put(o.x - ux, o.y - uy, METAL_LUZ); put(o.x - ux - uy, o.y - uy + ux, METAL); put(o.x - ux + uy, o.y - uy - ux, METAL);
          put(o.x, o.y, METAL);
        }
      }
    },
  });
}
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, '%04d.png'),
  '-c:v', 'libvpx-vp9', '-crf', '14', '-b:v', '0', '-pix_fmt', 'yuv420p', OUT]);
if (!opc.png) fs.rmSync(tmp, { recursive: true, force: true });
if (opc.rastreia) fs.writeFileSync(opc.rastreia, JSON.stringify(globalThis.rastro ?? []));
if (HAB === 'varredura') console.log(`beam points outside the drawn path: ${VARRE.foraDoAviso}`, SAIDAS.map((s) => `${s.t.toFixed(2)}: ${s.de.toFixed(0)}→${s.para.toFixed(0)}`).join(' · '));
console.log(n, 'quadros →', OUT);
