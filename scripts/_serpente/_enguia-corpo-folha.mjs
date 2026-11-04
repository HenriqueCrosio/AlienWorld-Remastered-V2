// 04/11 — S2: the sheet of the whole-eel concepts (`_enguia-corpo.mjs` → cru/). Builds, into the sheet folder:
//   grade.png          all candidates ×3, one per row, in the order listed below (raw names in the sheet)
//   esc-<pick>.png     each pick ×3 ; jogo-<pick>.png each pick at REAL size laid straight over the arena photo (the
//                      ship as the measure), ×3 — the real path in S comes later (the block mock-up, spec §7.1)
//   escolhidas/<pick>.png  the picks at native size (kept in git; cru/ is not)
//   node scripts/_serpente/_enguia-corpo-folha.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIR = 'docs/superpowers/folhas/2026-11-04/enguia-corpo';
const CRU = path.join(DIR, 'cru');
const ARENA = 'docs/superpowers/folhas/2026-10-29/serpente-casco/cru/arena.png';
const TODOS = ['costelas-21', 'costelas-22', 'barbatana-21', 'barbatana-22', 'canos-21', 'canos-22', 'espinhos-21', 'espinhos-22'];
const PICKS = ['costelas-21', 'costelas-22', 'barbatana-21', 'canos-21', 'espinhos-22'];
const FUNDO = { r: 58, g: 62, b: 74, alpha: 1 };
const W = 384, H = 80, K = 3, G = 6;
const amplia = (arq) => sharp(arq).resize({ width: W * K, kernel: 'nearest' }).png().toBuffer();

const comp = await Promise.all(TODOS.map(async (f, i) => ({ input: await amplia(path.join(CRU, `${f}.png`)), left: 0, top: i * (H * K + G) })));
await sharp({ create: { width: W * K, height: TODOS.length * (H * K + G) - G, channels: 4, background: FUNDO } })
  .composite(comp).png().toFile(path.join(DIR, 'grade.png'));

fs.mkdirSync(path.join(DIR, 'escolhidas'), { recursive: true });
for (const p of PICKS) {
  const arq = path.join(CRU, `${p}.png`);
  fs.copyFileSync(arq, path.join(DIR, 'escolhidas', `${p}.png`));
  await sharp({ create: { width: W * K, height: H * K, channels: 4, background: FUNDO } })
    .composite([{ input: await amplia(arq), left: 0, top: 0 }]).png().toFile(path.join(DIR, `esc-${p}.png`));
  const jogo = await sharp(ARENA).composite([{ input: arq, left: 0, top: 22 }]).png().toBuffer();
  await sharp(jogo).resize({ width: 384 * 3, kernel: 'nearest' }).png().toFile(path.join(DIR, `jogo-${p}.png`));
}
console.log('ok', PICKS.length, 'picks');

// His two fixes on A2 (`_enguia-corpo-ajuste.mjs` → cru-ajuste/): the finals whole ×3 and in the arena, plus the
// zooms of N1 (the neck seam, before → after) and N2 (the tail tip, before + the three finals).
const AJ = path.join(DIR, 'cru-ajuste');
const FINAIS = ['a2-final-32', 'a2-final-35', 'a2-final-36'];
if (fs.existsSync(AJ)) {
  for (const p of FINAIS) {
    const arq = path.join(AJ, `${p}.png`);
    fs.copyFileSync(arq, path.join(DIR, 'escolhidas', `${p}.png`));
    await sharp({ create: { width: W * K, height: H * K, channels: 4, background: FUNDO } })
      .composite([{ input: await amplia(arq), left: 0, top: 0 }]).png().toFile(path.join(DIR, `esc-${p}.png`));
    const jogo = await sharp(ARENA).composite([{ input: arq, left: 0, top: 22 }]).png().toBuffer();
    await sharp(jogo).resize({ width: 384 * 3, kernel: 'nearest' }).png().toFile(path.join(DIR, `jogo-${p}.png`));
  }
  const zoom = async (arq, l, t, w, h, k) => sharp(arq).extract({ left: l, top: t, width: w, height: h }).resize({ width: w * k, kernel: 'nearest' }).png().toBuffer();
  const lado = async (arqs, l, t, w, h, k, nome) => {
    const c = await Promise.all(arqs.map(async (a, i) => ({ input: await zoom(a, l, t, w, h, k), left: i * (w * k + 10), top: 0 })));
    await sharp({ create: { width: arqs.length * (w * k + 10) - 10, height: h * k, channels: 4, background: FUNDO } }).composite(c).png().toFile(path.join(DIR, nome));
  };
  await lado([path.join(CRU, 'costelas-22.png'), path.join(AJ, 'n1.png')], 60, 0, 80, 80, 6, 'n1-antes-depois.png');
  await lado([path.join(AJ, 'n1.png'), ...FINAIS.map((p) => path.join(AJ, `${p}.png`))], 300, 20, 84, 40, 6, 'n2-caudas.png');
  console.log('ok ajuste', FINAIS.length);
}
