// 29/10 (night) — THE EMERGENCE AFTER THE CHARGE, MOCKED (him, on the S1b: *"Precisamos urgente de uma animação decente
// para depois da investida"*; *"aquela sombra para cobrir parte do corpo ficou feio"*). No cover, no dark strip: the
// emergence clip (PixMiniMax, 17 frames of 256², drawn already CUT at the canvas' bottom edge = the hull's crest) comes
// out of a torn-hull HOLE (an inpaint concept on the prow pieces): the hole's back behind her, its lip (the hull and the
// torn plates below the crest, not the dark cavity) in front of her necks. Composited at the native 384×216 on the
// arena's own photo, the decal graded like the breach's lip in the scene. Output: a webm ×3.
//   node scripts/_serpente/_aparicao-maquete.mjs <arena-semnave.png> <hole.png> <hole-mask.png> <clip-dir> <out.webm> [cx]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const [ARENA, BURACO, MASCARA, CLIP, OUT, CXS = '110'] = process.argv.slice(2);
const W = 384, H = 216, FPS = 30, CX = Number(CXS), CRISTA = 150;
const raw = async (a) => (await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const fundo = await raw(ARENA);
const bur = await raw(BURACO);
const mas = (await sharp(MASCARA).toColourspace('srgb').removeAlpha().raw().toBuffer({ resolveWithObject: true })).data;
// the hole's decal: the masked area of the 318×100 concept, its hole at x 159; the strip's bottom at the screen's (y 216)
const FW = 318, FH = 100, X0 = CX - 159, Y0 = H - FH;
// grading: the breach's lip in the scene (measured: ×0.805, ×0.912, ×0.999)
const G = [0.805, 0.912, 0.999];
const lum = (i, d) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
const dentro = (x, y) => {
  if (x < 0 || y < 0 || x >= FW || y >= FH) return false;
  // the mask, grown 2 px (the torn edge reaches a little past it)
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const xx = x + dx, yy = y + dy;
    if (xx >= 0 && yy >= 0 && xx < FW && yy < FH && mas[(yy * FW + xx) * 3] > 128) return true;
  }
  return false;
};
const ESC = 0.55, LADO = Math.round(256 * ESC);
const clip = [];
for (let i = 0; fs.existsSync(path.join(CLIP, `${i}.png`)); i++)
  clip.push(await sharp(path.join(CLIP, `${i}.png`)).resize(LADO, LADO, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer());
// the art's centre (A: x 137 of 256), so the live head sits over the hole; the canvas bottom 5 px below the crest
const L = Math.round(CX - 137 * ESC + 10), T = CRISTA + 5 - LADO;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'apar-'));
let n = 0;
async function quadro(buraco, f) {
  const out = Buffer.from(fundo);
  const put = (x, y, c) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = (y * W + x) * 4;
    out[i] = c[0]; out[i + 1] = c[1]; out[i + 2] = c[2];
  };
  const decal = (frente) => {
    if (!buraco) return;
    for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
      const i = (y * FW + x) * 4;
      if (bur[i + 3] < 128 || !dentro(x, y)) continue;
      const labio = y >= 36 && lum(i, bur) >= 34;
      if (frente !== labio) continue;
      put(X0 + x, Y0 + y, [bur[i] * G[0], bur[i + 1] * G[1], bur[i + 2] * G[2]]);
    }
  };
  decal(false);
  if (f != null) {
    const d = clip[Math.min(f, clip.length - 1)];
    for (let y = 0; y < LADO; y++) for (let x = 0; x < LADO; x++) {
      const i = (y * LADO + x) * 4;
      if (d[i + 3] < 128) continue;
      put(L + x, T + y, [d[i] * 0.91, d[i + 1] * 0.99, d[i + 2]]);
    }
  }
  decal(true);
  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).resize(W * 3, H * 3, { kernel: 'nearest' }).png()
    .toFile(path.join(tmp, `${String(n++).padStart(3, '0')}.png`));
}
// the whole hull (0.4 s), the hole opens with her (the clip at 12 fps: each frame 2.5 game frames), she holds, again
for (let k = 0; k < 12; k++) await quadro(false, null);
for (let k = 0; k < clip.length * 2.5; k++) await quadro(true, Math.floor(k / 2.5));
for (let k = 0; k < 30; k++) await quadro(true, clip.length - 1);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, '%03d.png'),
  '-c:v', 'libvpx-vp9', '-crf', '12', '-b:v', '0', '-pix_fmt', 'yuv420p', OUT]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(n, 'quadros →', OUT);
