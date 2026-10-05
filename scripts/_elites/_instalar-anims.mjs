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
for (const [clip, qs] of Object.entries(SENTINELA)) {
  for (const [i, q] of qs.entries()) {
    const quadro = await sharp(path.join(dirS, clip, `${q}.png`)).extract(caixaS).png().toBuffer();
    fs.writeFileSync(path.join(OUT, `elite-sentinela-${clip}-${i}.png`), quadro);
    if (clip === 'abrir') fs.writeFileSync(path.join(OUT, `elite-sentinela-fechar-${qs.length - 1 - i}.png`), quadro);
  }
  console.log(`elite-sentinela-${clip}: ${qs.length} quadros`);
}
// The static open form = the first hover frame, in the same box.
fs.writeFileSync(path.join(OUT, 'elite-sentinela.png'), await sharp(path.join(dirS, 'pairar', '1.png')).extract(caixaS).png().toBuffer());
console.log(`sentinela: caixa ${caixaS.width}x${caixaS.height}`);
