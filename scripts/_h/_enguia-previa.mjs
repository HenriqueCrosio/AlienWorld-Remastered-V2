// BLOCO H (09/11, rodada 2) — the CYLINDER EEL previewed off the game: `desenharEnguia` over the F3 Act 1 painting, at a
// few instants of the pass, for each concept. A strip of stills (×K) and, with `--video`, a 30 fps clip ×2.
//   node scripts/_h/_enguia-previa.mjs <out-dir> [--k 2] [--video]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { ENGUIA, desenharEnguia } from '../../src/f3/enguiaCilindro.ts';
const CONCEITOS_ENGUIA = { B: ENGUIA };

const args = process.argv.slice(2);
const OUT = args[0];
const K = Number(args.includes('--k') ? args[args.indexOf('--k') + 1] : 2);
const VIDEO = args.includes('--video');
fs.mkdirSync(OUT, { recursive: true });
const W = 384, H = 216;
const fundo = await sharp('public/sprites/paint-bg-f3.png').removeAlpha().raw().toBuffer();

async function quadro(c, t) {
  const buf = new Uint8ClampedArray(W * H * 4);
  desenharEnguia(buf, W, H, 0, c, t);
  const o = Buffer.from(fundo);
  for (let p = 0; p < W * H; p++) {
    const a = buf[p * 4 + 3] / 255;
    if (!a) continue;
    for (let k = 0; k < 3; k++) o[p * 3 + k] = Math.round(buf[p * 4 + k] * a + o[p * 3 + k] * (1 - a));
  }
  return sharp(o, { raw: { width: W, height: H, channels: 3 } }).resize(W * K, H * K, { kernel: 'nearest' }).png().toBuffer();
}

// --zoom: the head of each concept ×6 at 45% of its pass (to check the shading, the eye, the rim) → zoom.png
if (args.includes('--zoom')) {
  const comps = [];
  let k = 0;
  for (const c of Object.values(CONCEITOS_ENGUIA)) {
    const t = c.caminho.t0 + 0.45 * c.caminho.dur;
    const buf = new Uint8ClampedArray(W * H * 4);
    desenharEnguia(buf, W, H, 0, c, t);
    let hx = 0, hy = 0;
    for (let p = 0; p < W * H; p++) if (buf[p * 4 + 3] && p % W > hx) { hx = p % W; hy = Math.floor(p / W); }
    const o = Buffer.alloc(W * H * 3);
    for (let p = 0; p < W * H; p++) {
      const a = buf[p * 4 + 3] / 255;
      for (let j = 0; j < 3; j++) o[p * 3 + j] = Math.round(buf[p * 4 + j] * a + [58, 50, 84][j] * (1 - a));
    }
    const L = Math.max(0, Math.min(W - 130, hx - 110)), T = Math.max(0, Math.min(H - 70, hy - 14));
    comps.push({ input: await sharp(o, { raw: { width: W, height: H, channels: 3 } }).extract({ left: L, top: T, width: 130, height: 70 })
      .resize(780, 420, { kernel: 'nearest' }).png().toBuffer(), left: 0, top: k++ * 424 });
  }
  await sharp({ create: { width: 780, height: 424 * comps.length, channels: 3, background: '#f0f' } }).composite(comps).png()
    .toFile(path.join(OUT, 'zoom.png'));
  process.exit(0);
}

for (const [nome, c] of Object.entries(CONCEITOS_ENGUIA)) {
  const ts = [0.25, 0.4, 0.55, 0.7].map((k) => c.caminho.t0 + k * c.caminho.dur);
  const comps = [];
  for (const [i, t] of ts.entries()) comps.push({ input: await quadro(c, t), left: (i % 2) * (W * K + 4), top: Math.floor(i / 2) * (H * K + 4) });
  await sharp({ create: { width: 2 * W * K + 4, height: 2 * H * K + 4, channels: 3, background: '#000' } }).composite(comps).png()
    .toFile(path.join(OUT, `previa-${nome}.png`));
  if (VIDEO) {
    const q = path.join(OUT, `q-${nome}`);
    fs.rmSync(q, { recursive: true, force: true });
    fs.mkdirSync(q);
    let n = 0;
    for (let t = c.caminho.t0 - 0.2; t <= c.caminho.t0 + c.caminho.dur + 0.2; t += 1 / 30) {
      await sharp(await quadro(c, t)).toFile(path.join(q, `${String(n++).padStart(4, '0')}.png`));
    }
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(q, '%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(OUT, `previa-${nome}.mp4`)]);
    fs.rmSync(q, { recursive: true, force: true });
  }
  console.log(nome);
}
