// A folder of PNG frames → WebM (VP8) with Playwright's own ffmpeg. That build reads ONLY JPEG through a pipe
// (`image2pipe` + `mjpeg`; no file demuxer, no PNG decoder), so the frames go in as near-lossless 4:4:4 JPEGs.
//   node scripts/_menu/_webm.mjs <framesDir> <out.webm> [fps=10]
//   import { webm } from './_webm.mjs'
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const FFMPEG = path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'ffmpeg-1011', 'ffmpeg-win64.exe');

export async function webm(dir, out, fps = 10) {
  const nomes = fs.readdirSync(dir).filter((n) => n.endsWith('.png')).sort();
  const jpgs = [];
  for (const n of nomes) jpgs.push(await sharp(path.join(dir, n)).jpeg({ quality: 97, chromaSubsampling: '4:4:4' }).toBuffer());
  // The JPEG stream goes through a FILE read as `image2pipe` (this build knows no `-` for stdin).
  const fluxo = out + '.mjpeg';
  fs.writeFileSync(fluxo, Buffer.concat(jpgs));
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(fps), '-i', fluxo,
    '-c:v', 'libvpx', '-b:v', '8M', '-crf', '6', '-qmin', '0', '-qmax', '24', '-auto-alt-ref', '0', '-pix_fmt', 'yuv420p', out]);
  fs.rmSync(fluxo);
  return nomes.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [dir, out, fps = '10'] = process.argv.slice(2);
  console.log(out, await webm(dir, out, Number(fps)), 'quadros');
}
