// BLOCO I, etapa 2 (13/11) — the INSTALLED flashes against the approved concept: for every flash of the sheet (the peak
// frames `_flashes-folha.mjs` found), the same frames of `<cena>-novo` (the concept, patched in the browser) and of
// `<cena>-jogo` (the game itself), one above the other, plus how far apart they are (mean absolute difference, 0–255).
//   node scripts/_i/_flashes-instalado.mjs <dir> <cena>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const [DIR, CENA] = process.argv.slice(2);
const N = path.join(DIR, `${CENA}-novo`, 'q'), J = path.join(DIR, `${CENA}-jogo`, 'q');
const { picos } = JSON.parse(fs.readFileSync(path.join(DIR, `${CENA}-picos.json`), 'utf8'));
const nome = (i) => `${String(i).padStart(5, '0')}.png`;
const cru = (dir, i) => sharp(path.join(dir, nome(i))).resize(384, 216, { kernel: 'nearest' }).removeAlpha().raw().toBuffer();

let k = 0;
for (const p of picos) {
  const idx = [p, p + 1, p + 3, p + 5].filter((i) => fs.existsSync(path.join(N, nome(i))) && fs.existsSync(path.join(J, nome(i))));
  const comp = [], difs = [];
  for (const [n, i] of idx.entries()) {
    const [a, b] = [await cru(N, i), await cru(J, i)];
    let s = 0;
    for (let q = 0; q < a.length; q++) s += Math.abs(a[q] - b[q]);
    difs.push((s / a.length).toFixed(2));
    comp.push({ input: a, raw: { width: 384, height: 216, channels: 3 }, left: n * 388, top: 0 });
    comp.push({ input: b, raw: { width: 384, height: 216, channels: 3 }, left: n * 388, top: 220 });
  }
  await sharp({ create: { width: idx.length * 388 - 4, height: 436, channels: 3, background: '#000' } }).composite(comp).png()
    .toFile(path.join(DIR, `${CENA}-inst-${++k}.png`));
  console.log(`${CENA} clarão ${k} (quadro ${p}): diferença média ${difs.join(' · ')}`);
}
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(DIR, `${CENA}-novo`, 'video.mp4'), '-i', path.join(DIR, `${CENA}-jogo`, 'video.mp4'),
  '-filter_complex', '[0]pad=iw+8:ih:0:0:black[a];[a][1]hstack', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(DIR, `${CENA}-instalado.mp4`)]);
