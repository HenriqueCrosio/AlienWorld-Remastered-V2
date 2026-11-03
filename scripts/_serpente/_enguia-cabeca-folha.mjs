// 03/11 — S2: the sheet of the eel head concepts (`_enguia-cabeca.mjs` → cru/). Builds, into the sheet folder:
//   escolhidas/<pick>.png each pick at native 96×64, cleaned (below) — kept in git: the base of the whole eel
//   grade-<concept>.png  the 9 candidates of each concept, ×3 (raw, numbered left→right, top→bottom from 0)
//   esc-<pick>.png       each pick ×5, CLEANED: the generator's loose near-white bar in the bottom rows removed (it
//                        never touches the drawing: only near-white, unsaturated pixels in the last 6 rows)
//   jogo-<pick>.png      each pick at its REAL size (scale 1) in the cannons' post (the head in the top-right corner,
//                        spec §2.2), on the arena photo (the ship at the left as the measure), ×3 — raw, without the
//                        Atmosfera pass the game lays on top (in the game it reads a little darker)
//   node scripts/_serpente/_enguia-cabeca-folha.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'docs/superpowers/folhas/2026-11-03/enguia-cabeca';
const CRU = path.join(DIR, 'cru');
const ARENA = 'docs/superpowers/folhas/2026-10-29/serpente-casco/cru/arena.png';
const CONCEITOS = ['moreia', 'engolidora', 'lanca', 'fusao'];
const PICKS = ['moreia-1103-3', 'moreia-1103-6', 'engolidora-1103-0', 'engolidora-1103-5', 'lanca-1103-0', 'lanca-1103-7', 'fusao-1103-1', 'fusao-1103-4'];
const FUNDO = { r: 58, g: 62, b: 74, alpha: 1 };

async function limpo(nome) {
  const { data, info } = await sharp(path.join(CRU, `${nome}.png`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = info.height - 6; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4, [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a > 0 && r > 190 && g > 190 && b > 190 && Math.max(r, g, b) - Math.min(r, g, b) < 24) data[i + 3] = 0;
    }
  return sharp(data, { raw: info }).png().toBuffer();
}

const amplia = (buf, k, w) => sharp(buf).resize({ width: w * k, kernel: 'nearest' }).png().toBuffer();

for (const c of CONCEITOS) {
  const arqs = fs.readdirSync(CRU).filter((f) => f.startsWith(`${c}-`)).sort((a, b) => +a.split('-').pop().split('.')[0] - +b.split('-').pop().split('.')[0]);
  const K = 3, W = 96 * K, H = 64 * K, G = 6, cols = 3;
  const comp = await Promise.all(arqs.map(async (f, i) => ({ input: await amplia(path.join(CRU, f), K, 96), left: (i % cols) * (W + G), top: Math.floor(i / cols) * (H + G) })));
  await sharp({ create: { width: cols * (W + G) - G, height: Math.ceil(arqs.length / cols) * (H + G) - G, channels: 4, background: FUNDO } })
    .composite(comp).png().toFile(path.join(DIR, `grade-${c}.png`));
}

fs.mkdirSync(path.join(DIR, 'escolhidas'), { recursive: true });
for (const p of PICKS) {
  const buf = await limpo(p);
  // the pick itself, native 96×64 and cleaned — the base of the next step (cru/ stays out of git)
  fs.writeFileSync(path.join(DIR, 'escolhidas', `${p}.png`), buf);
  await sharp({ create: { width: 96 * 5, height: 64 * 5, channels: 4, background: FUNDO } })
    .composite([{ input: await amplia(buf, 5, 96), left: 0, top: 0 }]).png().toFile(path.join(DIR, `esc-${p}.png`));
  // the cannons' post: the head in the top-right corner (its box's right edge on the screen's, under the HUD strip)
  const jogo = await sharp(ARENA).composite([{ input: buf, left: 384 - 96, top: 18 }]).png().toBuffer();
  await sharp(jogo).resize({ width: 384 * 3, kernel: 'nearest' }).png().toFile(path.join(DIR, `jogo-${p}.png`));
}
console.log('ok', PICKS.length, 'picks');
