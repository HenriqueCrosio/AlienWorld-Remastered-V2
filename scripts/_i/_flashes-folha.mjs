// BLOCO I, etapa 2 (13/11) — the sheet's pieces out of two films of `_flashes-conceitos.mjs` (today × the concept):
// the side-by-side video (today on the left) and one contact strip per flash, cut at the frames where TODAY's film
// jumps in brightness (the flash) — the same frames of both films, one above the other.
//   node scripts/_i/_flashes-folha.mjs <dir> <cena>      (expects <dir>/<cena>-hoje and <dir>/<cena>-novo)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const [DIR, CENA] = process.argv.slice(2);
const H = path.join(DIR, `${CENA}-hoje`), N = path.join(DIR, `${CENA}-novo`);
const quadros = fs.readdirSync(path.join(H, 'q')).filter((f) => f.endsWith('.png')).sort();

execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(H, 'video.mp4'), '-i', path.join(N, 'video.mp4'),
  '-filter_complex', '[0]pad=iw+8:ih:0:0:black[a];[a][1]hstack', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(DIR, `${CENA}.mp4`)]);

// the mean brightness of every frame of today's film
const luz = [];
for (const f of quadros) {
  const { channels } = await sharp(path.join(H, 'q', f)).stats();
  luz.push((channels[0].mean + channels[1].mean + channels[2].mean) / 3);
}
// a flash = a jump of 10+ over the frame before; one per 12 frames
const picos = [];
for (let i = 1; i < luz.length; i++) if (luz[i] - luz[i - 1] > 10 && (!picos.length || i - picos[picos.length - 1] > 12)) picos.push(i);
console.log(`${CENA}: ${quadros.length} quadros, clarões de hoje nos quadros ${picos.join(', ')}`);

let k = 0;
for (const p of picos) {
  const idx = [p, p + 1, p + 3, p + 5].filter((i) => i < quadros.length);
  const tira = async (dir) => Promise.all(idx.map((i) => sharp(path.join(dir, 'q', quadros[i])).resize(384, 216, { kernel: 'nearest' }).toBuffer()));
  const [a, b] = [await tira(H), await tira(N)];
  const comp = [];
  a.forEach((buf, i) => comp.push({ input: buf, left: i * 388, top: 0 }));
  b.forEach((buf, i) => comp.push({ input: buf, left: i * 388, top: 220 }));
  await sharp({ create: { width: idx.length * 388 - 4, height: 436, channels: 3, background: '#000' } }).composite(comp).png()
    .toFile(path.join(DIR, `${CENA}-tira-${++k}.png`));
}
fs.writeFileSync(path.join(DIR, `${CENA}-picos.json`), JSON.stringify({ picos, fps: 30 }));
