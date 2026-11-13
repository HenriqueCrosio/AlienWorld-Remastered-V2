// BLOCO I, etapa 3, parte B (13/11) — the LIFE of the dawn menu, one effect per film: the real game on a stepped clock
// at 30 fps, the menu settled (`?menu=amanhecer`), the text layer hidden (the film is about the scenery), with only the
// effects of `--vida` on (`0` = the painting alone). `--recorte x,y,w,h` (game px) also writes an enlarged film of
// that box.
//   node scripts/_menu/_filmar-vida.mjs <outDir> --vida bruma [--seg 14] [--largura 1536] [--recorte 150,20,200,90]
//   (with `npm run dev` running; do not touch src/ or .html while it runs — Vite reloads)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { webm } from './_webm.mjs';

const args = process.argv.slice(2);
const val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const OUT = args[0], VIDA = val('--vida', ''), SEG = Number(val('--seg', 14)), W = Number(val('--largura', 1536));
const RECORTE = (val('--recorte', '') || '').split(',').filter(Boolean).map(Number);
const H = Math.round((W * 9) / 16);
const QUADROS = path.join(OUT, '_q');
fs.mkdirSync(QUADROS, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:5173/?menu=amanhecer${VIDA === '' ? '' : `&vida=${VIDA}`}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => { const m = window.__game?.scene.getScene('Menu'); return m?.estado?.pronto && !!window.__gameHD?.scene.getScene('MenuHD')?.cenario; }, null, { timeout: 60000 });
const info = await page.evaluate(() => {
  const g = window.__game, hd = window.__gameHD, m = g.scene.getScene('Menu');
  g.loop.sleep();
  hd.loop.sleep();
  window.__relogio = performance.now();
  window.__pisa = (dt) => { window.__relogio += dt; g.step(window.__relogio, dt); hd.step(window.__relogio, dt); };
  m.estado.pulou = true;
  m.settled = true;
  m.estado.tAbertura = 30;
  const cenaHD = hd.scene.getScene('MenuHD');
  cenaHD.t = 0;
  // the text layer (the sign, the list, the dev lines) out of the film: every HD scene but the scenery
  for (const cena of hd.scene.getScenes(true)) if (cena !== cenaHD) cena.cameras.main.setVisible(false);
  window.__pisa(1000 / 30);
  const c = g.canvas.getBoundingClientRect();
  return { efeitos: cenaHD.cenario.efeitos, k: c.width / 384, x: c.left, y: c.top, w: c.width, h: c.height };
});
console.log(JSON.stringify(info.efeitos));
const clip = { x: info.x, y: info.y, width: info.w, height: info.h };
const total = Math.round(SEG * 30);
for (let i = 0; i < total; i++) {
  await page.evaluate(() => window.__pisa(1000 / 30));
  const arq = path.join(QUADROS, `${String(i).padStart(4, '0')}.png`);
  await page.screenshot({ path: arq, clip });
  if (i === 119) fs.copyFileSync(arq, path.join(OUT, 't4.png'));
}
console.log(erros.length ? erros : 'sem erro de página');
await browser.close();
await webm(QUADROS, path.join(OUT, 'vida.webm'), 30);
if (RECORTE.length === 4) {
  const [x, y, w, h] = RECORTE.map((v) => Math.round(v * info.k));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(QUADROS, '%04d.png'), '-vf', `crop=${w}:${h}:${x}:${y},scale=iw*2:ih*2:flags=lanczos`, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '28', path.join(OUT, 'perto.webm')]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(OUT, 't4.png'), '-vf', `crop=${w}:${h}:${x}:${y}`, path.join(OUT, 't4-perto.png')]);
}
fs.rmSync(QUADROS, { recursive: true, force: true });
console.log(OUT, total, 'quadros');
