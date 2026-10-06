// Installs the F2 elite animations (05/10, PixMiniMax clips at 80×80) into public/sprites.
//   node scripts/_elites/_instalar-anims.mjs <clipsDir>
// - The DRONE clips share ONE crop box (the union of every frame of the three clips), so switching animation never
//   jumps; then each frame goes down to 70% like the approved static (`_tratar.mjs reduzir`: lanczos + snap to the
//   frame's own palette + hard alpha).
// - The SENTINEL opening keeps scale 1; closing is the same frames reversed.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [dir] = process.argv.slice(2);
const OUT = 'public/sprites';
const ESCALA_DRONE = 0.7;

// Which generated frames make each clip (the clip folders hold 0..8).
const DRONE = {
  // Yo-yo: the sparks grow and shrink — the clip is a progression, not a cycle (PixMiniMax lesson).
  minerar: [1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2],
  // Only the drill pulling back: from frame 5 on the body twists to the camera and frame 8 is a big orange ball.
  alerta: [0, 1, 2, 3, 4],
  voo: [1, 2, 3, 4, 5, 6, 7, 8],
};

const caixaUniao = async (arqs) => {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (const f of arqs) {
    const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++)
        if (data[(y * info.width + x) * 4 + 3] > 0) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
};

const reduzir = async (buf, escala) => {
  const { data: o, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const paleta = [];
  const vistas = new Set();
  for (let i = 0; i < o.length; i += 4) {
    if (o[i + 3] < 128) continue;
    const k = (o[i] << 16) | (o[i + 1] << 8) | o[i + 2];
    if (!vistas.has(k)) {
      vistas.add(k);
      paleta.push([o[i], o[i + 1], o[i + 2]]);
    }
  }
  const w = Math.round(info.width * escala);
  const h = Math.round(info.height * escala);
  const { data } = await sharp(buf).ensureAlpha().resize(w, h, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) {
      data[i + 3] = 0;
      continue;
    }
    data[i + 3] = 255;
    let melhor = paleta[0];
    let dMin = Infinity;
    for (const p of paleta) {
      const d = (p[0] - data[i]) ** 2 + (p[1] - data[i + 1]) ** 2 + (p[2] - data[i + 2]) ** 2;
      if (d < dMin) {
        dMin = d;
        melhor = p;
      }
    }
    [data[i], data[i + 1], data[i + 2]] = melhor;
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
};

/**
 * THE EYE LIGHTING UP (05/10, his ask): painted over the drone's eye lamp (the warm cluster at the top-front of the
 * body — found per frame, since the body bobs). Level 1: hot orange · 2: yellow + 1px halo · 3: near-white core + wider
 * halo. Pixels, not a glow FX: a vector glow reads "generated".
 */
const acenderOlho = async (buf, nivel) => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const quentes = [];
  for (let y = 0; y < Math.ceil(H * 0.3); y++)
    for (let x = Math.floor(W * 0.55); x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] && data[i] > 140 && data[i] > data[i + 2] + 60) quentes.push([x, y]);
    }
  if (!quentes.length) return buf;
  const cx = Math.round(quentes.reduce((s, q) => s + q[0], 0) / quentes.length);
  const cy = Math.round(quentes.reduce((s, q) => s + q[1], 0) / quentes.length);
  const pintar = (x, y, [r, g, b], soSobreCorpo = false) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4;
    if (soSobreCorpo && !data[i + 3]) return; // the halo stays on the hull: no square box around the eye
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  };
  const NUCLEO = [[255, 150, 48], [255, 214, 110], [255, 246, 214]][nivel - 1];
  const HALO = [null, [214, 96, 28], [240, 140, 44]][nivel - 1];
  if (HALO) {
    const r = nivel === 3 ? 2 : 1;
    for (let dy = -r; dy <= r + 1; dy++)
      for (let dx = -r; dx <= r + 1; dx++) if (Math.abs(dx - 0.5) + Math.abs(dy - 0.5) <= r + 0.5) pintar(cx + dx, cy + dy, HALO, true);
  }
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) pintar(cx + dx, cy + dy, NUCLEO);
  return sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
};

// ── the drone ──
const todosDrone = Object.entries(DRONE).flatMap(([c, qs]) => qs.map((q) => path.join(dir, c, `${q}.png`)));
const caixaD = await caixaUniao([...new Set(todosDrone)]);
for (const [clip, qs] of Object.entries(DRONE)) {
  const quadros = [];
  for (const q of qs) {
    const recorte = await sharp(path.join(dir, clip, `${q}.png`)).extract(caixaD).png().toBuffer();
    quadros.push(await reduzir(recorte, ESCALA_DRONE));
  }
  // The ALERT ends with the eye lighting up over the last frame (the drill is in); in FLIGHT the eye stays lit.
  if (clip === 'alerta') {
    const ultimo = quadros[quadros.length - 1];
    for (const n of [1, 2, 3]) quadros.push(await acenderOlho(ultimo, n));
  }
  if (clip === 'voo') for (const [i, q] of quadros.entries()) quadros[i] = await acenderOlho(q, 2);
  for (const [i, q] of quadros.entries()) fs.writeFileSync(path.join(OUT, `elite-drone-${clip}-${i}.png`), q);
  console.log(`elite-drone-${clip}: ${quadros.length} quadros`);
}

// ── the sentinel (05/10 (2): S2 with thrusters — the clips live in a SECOND folder) ──
// Every open-form frame (and the static) shares ONE crop box: switching animation never jumps. The hitbox is fixed in
// code (`Sentinela.ts`), so flames and muzzle flashes do not grow it.
const dirS = process.argv[3] ?? dir;
const SENTINELA = {
  abrir: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  // Thrusters flickering while it fires: a cycle (1..8).
  pairar: [1, 2, 3, 4, 5, 6, 7, 8],
  // Overheating: the vents open (1..3) then glow — looped from 3 in yo-yo so the vents stay open.
  sobrecarga: [3, 4, 5, 6, 7, 8, 7, 6, 5, 4],
  // One burst: barrels spin, flash, settle.
  disparo: [1, 2, 3, 4, 5, 6, 7, 8],
};
const todosS = Object.entries(SENTINELA).flatMap(([c, qs]) => qs.map((q) => path.join(dirS, c, `${q}.png`)));
const caixaS = await caixaUniao([...new Set(todosS)]);
/**
 * THE LIGHTS ON THE GUNS (05/10 (2), his note: *"as luzes na minigun e nos canos de cima ficaram muito estranhos; as
 * luzes de flash no interior da carcaça ficaram boas, talvez mais leves"*). In the FIRE and OVERLOAD clips: the upper
 * cannon and the minigun go back to dark metal (their red-hot fill read as a solid block), whatever passes the barrel
 * tips is cleared (the muzzle flash is code — `PadroesDeTiro`), and the hull lights drop to half. The thrusters (bottom
 * left) are untouched. Boxes measured on the crop box (art facing RIGHT, 63×50).
 */
const CANOS = [
  { x0: 24, y0: 2, x1: 44, y1: 11 }, // the upper cannon
  { x0: 40, y0: 12, x1: 44, y1: 13 }, // a flash remnant just under its tip (06/10)
  { x0: 27, y0: 20, x1: 44, y1: 37 }, // the minigun (y 20–37: flash remnants sat just above and below it)
];
const PONTA_X = 45;
// The guns are COPIED from the approved still (hover frame 1) — the generator had turned whole barrels into flash, and
// repainting them grey left a hollow outline.
const BASE = await sharp(path.join(dirS, 'pairar', '1.png')).extract(caixaS).ensureAlpha().raw().toBuffer();
const ehCano = (x, y) => x >= PONTA_X || CANOS.some((c) => x >= c.x0 && x <= c.x1 && y >= c.y0 && y <= c.y1);
/**
 * THE BODY MOVES, so the copied guns must move with it (06/10, his note: *"ao atirar ele corta parte da minigun e da
 * metralhadora de cima — a ponta não acompanha o movimento do corpo"*): the fire clip recoils up to 4px back and the
 * overload rises 2px, and guns pinned at the still's place came off the hull. The offset is measured per frame against
 * the still, on the hull only (guns, tips and thruster flames out), and the still's guns are pasted at that offset.
 */
const medirDesloc = (data, W, H) => {
  const lum = (d, i) => (d[i + 3] ? (d[i] + d[i + 1] + d[i + 2]) / 3 : -60);
  const fora = (x, y) => x >= PONTA_X || CANOS.some((c) => x >= c.x0 - 2 && x <= c.x1 && y >= c.y0 - 2 && y <= c.y1 + 2) || (y >= 32 && x < 24);
  let melhor = { dx: 0, dy: 0, v: Infinity };
  for (let dy = -4; dy <= 4; dy++)
    for (let dx = -5; dx <= 5; dx++) {
      let s = 0;
      let c = 0;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const xs = x - dx;
          const ys = y - dy;
          if (fora(x, y) || xs < 0 || ys < 0 || xs >= W || ys >= H) continue;
          s += Math.abs(lum(data, (y * W + x) * 4) - lum(BASE, (ys * W + xs) * 4));
          c++;
        }
      if (s / c < melhor.v) melhor = { dx, dy, v: s / c };
    }
  return melhor;
};
const acalmarLuzes = async (buf) => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { dx, dy } = medirDesloc(data, info.width, info.height);
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const xs = x - dx;
      const ys = y - dy;
      if (ehCano(xs, ys)) {
        const dentro = xs >= 0 && ys >= 0 && xs < info.width && ys < info.height;
        for (let k = 0; k < 4; k++) data[i + k] = dentro ? BASE[(ys * info.width + xs) * 4 + k] : 0;
        continue;
      }
      if (!data[i + 3]) continue;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      // The thruster FLAMES (orange/yellow, bottom left) stay as they are; a pure red dot there is a stray light.
      if (y >= 32 && x < 24 && g > 70) continue;
      const vermelho = r > 120 && r > g + 50 && r > b + 50;
      const branco = r > 200 && g > 160 && b > 120; // the white-hot vents of the overload
      if (vermelho || branco) {
        // Hull lights at half: halfway to the dark hull.
        data[i] = Math.round(r * 0.5 + 60 * 0.5);
        data[i + 1] = Math.round(g * 0.5 + 40 * 0.5);
        data[i + 2] = Math.round(b * 0.5 + 44 * 0.5);
      }
    }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};

for (const [clip, qs] of Object.entries(SENTINELA)) {
  for (const [i, q] of qs.entries()) {
    let quadro = await sharp(path.join(dirS, clip, `${q}.png`)).extract(caixaS).png().toBuffer();
    if (clip === 'disparo' || clip === 'sobrecarga') quadro = await acalmarLuzes(quadro);
    fs.writeFileSync(path.join(OUT, `elite-sentinela-${clip}-${i}.png`), quadro);
    if (clip === 'abrir') fs.writeFileSync(path.join(OUT, `elite-sentinela-fechar-${qs.length - 1 - i}.png`), quadro);
  }
  console.log(`elite-sentinela-${clip}: ${qs.length} quadros`);
}
// The static open form = the first hover frame, in the same box.
fs.writeFileSync(path.join(OUT, 'elite-sentinela.png'), await sharp(path.join(dirS, 'pairar', '1.png')).extract(caixaS).png().toBuffer());
console.log(`sentinela: caixa ${caixaS.width}x${caixaS.height}`);
