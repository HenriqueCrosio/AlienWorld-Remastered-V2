// 07/11 — stage 3: a video that FOLLOWS the head (for gestures played while she moves — the swim's breath): for each
// stretch, every frame of the mock's videos (antes, agora) cropped around the head's middle (from the pose), ×2, side by
// side, the stretches one after another.
//   node scripts/_serpente/_enguia-segue-cabeca.mjs <antes.mp4> <agora.mp4> <saida.mp4> <t0:dur> [<t0:dur>…]
// (the videos start at t 0, 30 fps, ×3 of 384×216)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { N } from './enguia/numeros.mjs';
import { montaRoteiro } from './enguia/roteiro.mjs';
import { medidas } from './enguia/medidas.mjs';
import { pose, mordidas } from './enguia/corpo.mjs';

const [ANTES, AGORA, SAIDA, ...TRECHOS] = process.argv.slice(2);
const med = await medidas(N), R = montaRoteiro(N, med, {}), mord = mordidas(R, N, med);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'segue-'));
const CW = 110, CH = 90, Z = 2; // (the crop in native px, ×3 in the video; shown ×2)
let n = 0;
for (const tr of TRECHOS) {
  const [t0, dur] = tr.split(':').map(Number);
  for (const [nome, v] of [['a', ANTES], ['b', AGORA]]) {
    fs.mkdirSync(path.join(tmp, `${nome}${t0}`), { recursive: true });
    spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(t0), '-t', String(dur), '-i', v, path.join(tmp, `${nome}${t0}`, '%04d.png')]);
  }
  const quadros = fs.readdirSync(path.join(tmp, `a${t0}`)).sort();
  let cx = null, cy = null;
  for (const [i, q] of quadros.entries()) {
    const t = t0 + i / 30, C = pose(R, N, med, t, { mord }).cabeca;
    const mx = (C.pescoco.x + C.focinho.x) / 2, my = (C.pescoco.y + C.focinho.y) / 2;
    cx = cx == null ? mx : cx + (mx - cx) * 0.25; cy = cy == null ? my : cy + (my - cy) * 0.25; // (a soft follow)
    const L = Math.round(Math.max(0, Math.min(N.tela.W - CW, cx - CW / 2)) * 3), T = Math.round(Math.max(0, Math.min(N.tela.H - CH, cy - CH / 2)) * 3);
    const lado = await Promise.all(['a', 'b'].map((nm) => sharp(path.join(tmp, `${nm}${t0}`, q)).extract({ left: L, top: T, width: CW * 3, height: CH * 3 }).resize(CW * 3 * Z / 3 * 1.5, CH * 3 * Z / 3 * 1.5, { kernel: 'nearest' }).toBuffer()));
    const w = CW * Z * 1.5, h = CH * Z * 1.5;
    await sharp({ create: { width: w * 2 + 6, height: h, channels: 3, background: { r: 255, g: 255, b: 255 } } })
      .composite([{ input: lado[0], left: 0, top: 0 }, { input: lado[1], left: w + 6, top: 0 }]).png().toFile(path.join(tmp, `s${String(n++).padStart(5, '0')}.png`));
  }
}
spawnSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '30', '-i', path.join(tmp, 's%05d.png'), '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', SAIDA], { stdio: 'inherit' });
fs.rmSync(tmp, { recursive: true, force: true });
console.log(SAIDA, n, 'quadros');
