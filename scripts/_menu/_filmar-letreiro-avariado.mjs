// BLOCO I, etapa 3 (13/11) — the DAMAGED neon sign of the dawn menu, filmed in the real game on a stepped clock at
// 30 fps: the menu opens settled (`?menu=amanhecer`, the opening skipped), and the film runs `--seg` s from the moment
// the failing starts. Two films: the whole screen and the sign alone, enlarged. `--letra N` tries another letter
// (A L I E N W O R L D = 0…9) without touching src/ (the number is patched in the page's module).
//   node scripts/_menu/_filmar-letreiro-avariado.mjs <outDir> [--seg 26] [--letra 6] [--largura 1536]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { webm } from './_webm.mjs';

const args = process.argv.slice(2);
const val = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const OUT = args[0], SEG = Number(val('--seg', 26)), W = Number(val('--largura', 1536)), LETRA = val('--letra', '');
const H = Math.round((W * 9) / 16);
const QUADROS = path.join(OUT, '_q');
fs.mkdirSync(QUADROS, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/?menu=amanhecer', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => { const m = window.__game?.scene.getScene('Menu'); return m?.estado?.pronto && !!window.__gameHD?.scene.getScene('MenuHD')?.cenario; }, null, { timeout: 60000 });
const info = await page.evaluate(async (letra) => {
  const g = window.__game, hd = window.__gameHD, m = g.scene.getScene('Menu');
  // the SAME copy of the modules the game uses (Vite serves an edited module with `?t=…`)
  const url = (nome) => performance.getEntriesByType('resource').map((r) => r.name).filter((n) => n.includes(nome)).pop();
  const N = await import(url('/src/menu/numerosMenu.ts'));
  const A = await import(url('/src/menu/abertura.ts'));
  // AVARIA is `as const` only for TypeScript: the object itself can be patched for this film
  if (letra !== '') N.AVARIA.letra = Number(letra);
  g.loop.sleep();
  hd.loop.sleep();
  window.__relogio = performance.now();
  window.__pisa = (dt) => { window.__relogio += dt; g.step(window.__relogio, dt); hd.step(window.__relogio, dt); };
  // settled, at the instant the failing starts
  m.estado.pulou = true;
  m.settled = true;
  m.estado.tAbertura = A.T_FIM + N.AVARIA.desde;
  for (const cena of hd.scene.getScenes(true)) {
    for (const o of cena.children.list) if (typeof o.text === 'string' && /\[B\] chef|\[I\]\[O\]/.test(o.text)) o.setVisible(false);
  }
  window.__pisa(1000 / 30);
  const c = g.canvas.getBoundingClientRect();
  return { qual: m.qual, letra: N.AVARIA.letra, k: c.width / 384, x: c.left, y: c.top, w: c.width, h: c.height };
}, LETRA);
console.log(JSON.stringify(info));
const clip = { x: info.x, y: info.y, width: info.w, height: info.h };
const total = Math.round(SEG * 30);
let apagados = 0;
for (let i = 0; i < total; i++) {
  const acesas = await page.evaluate(() => { window.__pisa(1000 / 30); return window.__game.scene.getScene('Menu').diagnostico().titulo.acesas; });
  if (acesas < 10) apagados++;
  await page.screenshot({ path: path.join(QUADROS, `${String(i).padStart(4, '0')}.png`), clip });
}
console.log(`${total} quadros, a letra apagada em ${apagados} (${(100 * apagados / total).toFixed(1)}%)`);
console.log(erros.length ? erros : 'sem erro de página');
await browser.close();
await webm(QUADROS, path.join(OUT, 'letreiro.webm'), 30);
// the sign alone: the box around (192, 58) in game px, enlarged ×2
const k = info.k, cx = Math.round((192 - 80) * k), cy = Math.round((58 - 22) * k), cw = Math.round(160 * k), ch = Math.round(44 * k);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', path.join(QUADROS, '%04d.png'), '-vf', `crop=${cw}:${ch}:${cx}:${cy},scale=iw*2:ih*2:flags=neighbor`, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '30', path.join(OUT, 'letreiro-perto.webm')]);
fs.rmSync(QUADROS, { recursive: true, force: true });
