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

// ── the drone ──
const todosDrone = Object.entries(DRONE).flatMap(([c, qs]) => qs.map((q) => path.join(dir, c, `${q}.png`)));
const caixaD = await caixaUniao([...new Set(todosDrone)]);
for (const [clip, qs] of Object.entries(DRONE)) {
  for (const [i, q] of qs.entries()) {
    const recorte = await sharp(path.join(dir, clip, `${q}.png`)).extract(caixaD).png().toBuffer();
    fs.writeFileSync(path.join(OUT, `elite-drone-${clip}-${i}.png`), await reduzir(recorte, ESCALA_DRONE));
  }
  console.log(`elite-drone-${clip}: ${qs.length} quadros`);
}

// ── the sentinel ──
const abrir = Array.from({ length: 9 }, (_, i) => path.join(dir, 'abrir', `${i}.png`));
const caixaS = await caixaUniao(abrir);
for (const [i, f] of abrir.entries()) {
  const q = await sharp(f).extract(caixaS).png().toBuffer();
  fs.writeFileSync(path.join(OUT, `elite-sentinela-abrir-${i}.png`), q);
  fs.writeFileSync(path.join(OUT, `elite-sentinela-fechar-${8 - i}.png`), q);
}
console.log(`elite-sentinela-abrir/fechar: 9 quadros, ${caixaS.width}x${caixaS.height}; drone ${Math.round(caixaD.width * ESCALA_DRONE)}x${Math.round(caixaD.height * ESCALA_DRONE)}`);
