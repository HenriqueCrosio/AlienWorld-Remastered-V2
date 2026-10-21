// BLOCO G · the F1 horizon at any instant of the stage clock, in the real game: the stage starts, the scene is PAUSED
// (it still renders), the parallax clock is set by hand, and the world canvas is photographed (the text layer hidden).
// One PNG ×3 per instant, and a contact sheet of them all.
//   node scripts/_g/_ver-f1.mjs <outDir> <t1,t2,...> [--limpo]      (with `npm run dev` running)
//   --limpo: enemies and hazards hidden (the background is what is judged)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';

const [OUT, LISTA = '0,15,30,45,60', ...resto] = process.argv.slice(2);
const LIMPO = resto.includes('--limpo');
// --sem-pecas: the ground pieces (the terrain props) hidden too — the backdrop for the round-3 concept sheet.
const SEM_PECAS = resto.includes('--sem-pecas');
const tempos = LISTA.split(',').map(Number);
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' }));
await page.waitForFunction(() => (window.__game.scene.getScene('Game')?.elapsed ?? 0) > 1, null, { timeout: 30000 });
await page.evaluate(({ limpo, semPecas }) => {
  const s = window.__game.scene.getScene('Game');
  s.scene.pause();
  if (window.__gameHD?.canvas) window.__gameHD.canvas.style.visibility = 'hidden';
  if (limpo) for (const gr of [s?.enemies?.enemies, s?.debris?.hazards, s?.enemyBullets]) if (gr?.children) gr.getChildren().forEach((o) => o.setVisible(false));
  if (semPecas) s?.terrain?.props?.getChildren().forEach((o) => o.setVisible(false));
}, { limpo: LIMPO, semPecas: SEM_PECAS });
const geo = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { k: c.width / 384, left: c.left, top: c.top }; });
const fotos = [];
for (const t of tempos) {
  await page.evaluate((t) => {
    const p = window.__game.scene.getScene('Game').parallax;
    p.setRelogio(t);
    p.update(0, 0);
  }, t);
  await page.waitForTimeout(120);
  const shot = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  const um = await sharp(shot).resize(384, 216, { kernel: 'nearest' }).png().toBuffer();
  const nome = `t${String(t).padStart(2, '0')}.png`;
  await sharp(um).resize(384 * 3, 216 * 3, { kernel: 'nearest' }).toFile(path.join(OUT, nome));
  fotos.push(um);
}
await browser.close();
const COL = 2;
await sharp({ create: { width: COL * 390, height: Math.ceil(fotos.length / COL) * 222, channels: 4, background: '#0d0f15' } })
  .composite(fotos.map((input, i) => ({ input, left: (i % COL) * 390, top: Math.floor(i / COL) * 222 })))
  .png().toFile(path.join(OUT, 'grade.png'));
console.log(OUT, tempos.join(','));
