// 04/11 — S2, head round 2 (B5 bigger and broader): the sheet's images, from `_enguia-cabeca-b5.mjs` → cru/.
//   grade-<grupo>.png  each group (route × canvas), ×4, numbered left→right, top→bottom from 0, B5 first as "antes"
//   esc-<pick>.png     each pick ×5 ; jogo-<pick>.png each pick at REAL size in the cannons' post, ×3 (as round 1)
//   node scripts/_serpente/_enguia-cabeca-b5-folha.mjs [<pick> ...]     (a pick = the cru file name without .png)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'docs/superpowers/folhas/2026-11-04/enguia-b5';
const CRU = path.join(DIR, 'cru');
const B5 = 'docs/superpowers/folhas/2026-11-03/enguia-cabeca/escolhidas/engolidora-1103-5.png';
const ARENA = 'docs/superpowers/folhas/2026-10-29/serpente-casco/cru/arena.png';
const GRUPOS = ['conceito-96x64', 'conceito-112x76', 'editar-96x64', 'editar-112x76'];
const FUNDO = { r: 58, g: 62, b: 74, alpha: 1 };
const picks = process.argv.slice(2);

const amplia = async (arq, k) => {
  const m = await sharp(arq).metadata();
  return sharp(arq).resize({ width: m.width * k, kernel: 'nearest' }).png().toBuffer();
};
const ordem = (f) => f.replace(/\.png$/, '').split('-').slice(-2).map(Number);

for (const g of GRUPOS) {
  const arqs = fs.readdirSync(CRU).filter((f) => f.startsWith(`b5-${g}-`))
    .sort((a, b) => { const [sa, ia] = ordem(a), [sb, ib] = ordem(b); return sa - sb || ia - ib; });
  if (!arqs.length) continue;
  const [W, H] = g.split('-')[1].split('x').map(Number);
  const K = 4, G = 8, cols = 3;
  const todos = [B5, ...arqs.map((f) => path.join(CRU, f))];
  const comp = await Promise.all(todos.map(async (f, i) => {
    const m = await sharp(f).metadata();
    // B5 sits in a cell of the group's size, right-aligned like the edit input — the "before" at the same scale
    return { input: await amplia(f, K), left: (i % cols) * (W * K + G) + (W - m.width) * K, top: Math.floor(i / cols) * (H * K + G) + Math.floor((H - m.height) / 2) * K };
  }));
  await sharp({ create: { width: cols * (W * K + G) - G, height: Math.ceil(todos.length / cols) * (H * K + G) - G, channels: 4, background: FUNDO } })
    .composite(comp).png().toFile(path.join(DIR, `grade-${g}.png`));
  console.log(g, arqs.join(' '));
}

fs.mkdirSync(path.join(DIR, 'escolhidas'), { recursive: true });
// a pick may also be a path under the sheet folder (e.g. `cru-pescoco/e3-pescoco-11`, the neck fix); outputs use its basename
for (const pick of picks) {
  const arq = pick.includes('/') ? path.join(DIR, `${pick}.png`) : path.join(CRU, `${pick}.png`);
  const p = path.basename(pick);
  fs.copyFileSync(arq, path.join(DIR, 'escolhidas', `${p}.png`));
  const m = await sharp(arq).metadata();
  await sharp({ create: { width: m.width * 5, height: m.height * 5, channels: 4, background: FUNDO } })
    .composite([{ input: await amplia(arq, 5), left: 0, top: 0 }]).png().toFile(path.join(DIR, `esc-${p}.png`));
  const jogo = await sharp(ARENA).composite([{ input: arq, left: 384 - m.width, top: 18 }]).png().toBuffer();
  await sharp(jogo).resize({ width: 384 * 3, kernel: 'nearest' }).png().toFile(path.join(DIR, `jogo-${p}.png`));
}
// B5 itself in the post, the "before" for the size comparison
const jb5 = await sharp(ARENA).composite([{ input: B5, left: 384 - 96, top: 18 }]).png().toBuffer();
await sharp(jb5).resize({ width: 384 * 3, kernel: 'nearest' }).png().toFile(path.join(DIR, 'jogo-b5.png'));
console.log('ok', picks.length, 'picks');
