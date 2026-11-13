// BLOCO I, etapa 3 (13/11) — the END-OF-CAMPAIGN screen filmed in the real game on a stepped clock at 30 fps: the dawn
// menu opens in result mode (the dev rehearsal: nothing is recorded), the key is pressed at `--tecla` s, the sign arrives
// and the menu settles; then the damaged sign for a few cycles. The DEV shortcut lines are hidden.
//   node scripts/_menu/_filmar-amanhecer.mjs <outDir> [--seg 30] [--tecla 7] [--largura 1536] [--score 21000]
//   (with `npm run dev` running; do not touch src/ or .html while it runs — Vite reloads)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { webm } from './_webm.mjs';

const args = process.argv.slice(2);
const val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const OUT = args[0];
const SEG = Number(val('--seg', 30)), TECLA = Number(val('--tecla', 7)), W = Number(val('--largura', 1536)), SCORE = Number(val('--score', 21000));
const FOTOS = (val('--fotos', '0.6,2.2,3.4,6.5,7.3,10.5,13,19') || '').split(',').map(Number);
const H = Math.round((W * 9) / 16);
const QUADROS = path.join(OUT, '_q');
fs.mkdirSync(QUADROS, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
// `--q "res=B&ass=cinzel"`: the panel and signature variants under evaluation
await page.goto(`http://localhost:5173/${val('--q', '') ? `?${val('--q', '')}` : ''}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene.getScene('Menu')?.estado?.pronto, null, { timeout: 60000 });
await page.evaluate((score) => {
  const g = window.__game, hd = window.__gameHD;
  g.loop.sleep();
  hd.loop.sleep();
  window.__relogio = performance.now();
  window.__pisa = (dt) => { window.__relogio += dt; g.step(window.__relogio, dt); hd.step(window.__relogio, dt); };
  g.scene.start('Menu', { resultado: { score, handling: 'diegetico', ensaio: true } });
}, SCORE);
// step until the dawn painting is in (it loads on demand), then put both clocks back to 0
for (let i = 0; i < 600; i++) {
  const pronto = await page.evaluate(() => { window.__pisa(1000 / 60); const m = window.__game.scene.getScene('Menu'); return m.emResultado && m.estado.pronto && !!window.__gameHD.scene.getScene('MenuHD')?.cenario; });
  if (pronto) break;
  await page.waitForTimeout(30);
}
await page.evaluate(() => {
  const g = window.__game, hd = window.__gameHD, m = g.scene.getScene('Menu');
  m.tResultado = 0;
  m.estado.tVeu = 0;
  hd.scene.getScene('MenuHD').t = 0;
  for (const cena of hd.scene.getScenes(true)) {
    for (const o of cena.children.list) if (typeof o.text === 'string' && /\[B\] chef|\[I\]\[O\]/.test(o.text)) o.setVisible(false);
  }
});
const clip = await page.evaluate(() => { const c = window.__game.canvas.getBoundingClientRect(); return { x: c.left, y: c.top, width: c.width, height: c.height }; });
const total = Math.round(SEG * 30);
const momentos = FOTOS.map((s) => Math.round(s * 30));
let apertou = false;
for (let i = 0; i < total; i++) {
  if (!apertou && i / 30 >= TECLA) { apertou = true; await page.keyboard.press('Space'); }
  await page.evaluate(() => window.__pisa(1000 / 30));
  const arq = path.join(QUADROS, `${String(i).padStart(4, '0')}.png`);
  await page.screenshot({ path: arq, clip });
  if (momentos.includes(i + 1)) fs.copyFileSync(arq, path.join(OUT, `t${((i + 1) / 30).toFixed(1)}.png`));
}
const fim = await page.evaluate(() => { const m = window.__game.scene.getScene('Menu'); return { qual: m.qual, emResultado: m.emResultado, settled: m.settled, titulo: m.diagnostico().titulo, resultado: m.diagnosticoResultado().length }; });
console.log(JSON.stringify(fim));
console.log(erros.length ? erros : 'sem erro de página');
await browser.close();
await webm(QUADROS, path.join(OUT, 'tela-final.webm'), 30);
fs.rmSync(QUADROS, { recursive: true, force: true });
console.log(OUT, total, 'quadros');
