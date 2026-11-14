// BLOCK M1 (14/11) — proves that extracting the window frame (`src/ui/janela.ts`) left the approved final screen's
// window IDENTICAL: the TEXTURE of the scoreboard window, read back from the game (without the HD layer the texture
// lives in the world game, reachable from the page; the drawing code is the same). The screen itself is not
// comparable pixel by pixel: the Atmosfera grain differs between two runs of the same code.
//   node scripts/_m/_resultado-foto.mjs <out.png>            saves the window texture (158×48)
//   node scripts/_m/_resultado-foto.mjs <a.png> --igual <b.png>   compares two (max difference per channel)
import { chromium } from 'playwright';
import sharp from 'sharp';

const args = process.argv.slice(2);
if (args.includes('--igual')) {
  const [a, b] = [args[0], args[args.indexOf('--igual') + 1]];
  const [ra, rb] = await Promise.all([a, b].map((f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  let max = 0, n = 0;
  if (ra.data.length !== rb.data.length) { console.log('✘ different sizes'); process.exitCode = 1; }
  else {
    for (let i = 0; i < ra.data.length; i++) { const d = Math.abs(ra.data[i] - rb.data[i]); if (d) n++; if (d > max) max = d; }
    console.log(`${max === 0 ? '✔' : '✘'} max difference ${max}, ${n} channel values differ of ${ra.data.length}`);
    process.exitCode = max === 0 ? 0 : 1;
  }
} else {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.addInitScript(() => {
    const base = 1762560000000;
    let k = 0;
    Date.now = () => base + (k += 16);
    let a = 20261114;
    Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  });
  await page.goto('http://localhost:5173/?menu=amanhecer&vida=0&semhd', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const g = window.__game;
    g.loop.sleep();
    let t = g.loop.now;
    window.__pisa = (n) => { for (let i = 0; i < n; i++) { t += 1000 / 60; g.step(t, 1000 / 60); } };
    g.scene.start('Menu', { resultado: { score: 21000, handling: 'diegetico', ensaio: true } });
    window.__pisa(480); // 8 s: everything in, the points counted
  });
  const url = await page.evaluate(() => {
    const t = window.__game.textures;
    const chave = t.getTextureKeys().find((k) => k.startsWith('res-janela-'));
    return chave ? t.get(chave).getSourceImage().toDataURL('image/png') : null;
  });
  if (!url) erros.push('the window texture was not found');
  else (await import('node:fs')).writeFileSync(args[0], Buffer.from(url.split(',')[1], 'base64'));
  console.log(erros.length ? erros : 'no page error', '→', args[0]);
  await browser.close();
  process.exitCode = erros.length ? 1 : 0;
}
