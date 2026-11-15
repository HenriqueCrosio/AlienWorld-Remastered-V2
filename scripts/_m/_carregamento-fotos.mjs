// BLOCK M4 (15/11) — the LOADING SCREEN photographed and FILMED, for the sheet (`_carregamento-folha.mjs`): the game is
// opened with `?carregamento=N` (dev: holds the screen for N seconds), a frame every 100 ms.
//   quieta  — the scene between flashes;   clarao-K — the brightest frames (one per moment of the storm)
//   fim     — the bar complete, the ship leaving;   calma — with "reduce flashes" on
//   npm run dev  in another terminal, then  node scripts/_m/_carregamento-fotos.mjs <out> [seconds]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const OUT = process.argv[2];
const SEG = Number(process.argv[3] ?? 24);
if (!OUT) { console.error('usage: _carregamento-fotos.mjs <out> [seconds]'); process.exit(1); }
fs.mkdirSync(path.join(OUT, 'q'), { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const erros = [];
const brilho = async (buf) => { const { channels } = await sharp(buf).stats(); return (channels[0].mean + channels[1].mean + channels[2].mean) / 3; };

async function filmar(nome, prefs) {
  const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
  page.on('pageerror', (e) => erros.push(`${nome}: ${e}`));
  if (prefs) await page.addInitScript((p) => localStorage.setItem('alienworld:preferencias', JSON.stringify(p)), prefs);
  await page.goto(`http://localhost:5173/?carregamento=${SEG}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('#carga.pronta'), null, { timeout: 30000 });
  await page.waitForTimeout(700);
  const quadros = [];
  const t0 = Date.now();
  while (Date.now() - t0 < (SEG - 1.2) * 1000) {
    const buf = await page.screenshot();
    const pct = await page.evaluate(() => document.getElementById('carga-pct')?.textContent ?? '');
    quadros.push({ buf, b: await brilho(buf), pct, t: (Date.now() - t0) / 1000 });
    await page.waitForTimeout(40);
  }
  // the end: the bar completes, the ship leaves, the menu comes
  const fim = [];
  const t1 = Date.now();
  while (Date.now() - t1 < 3500) {
    const estado = await page.evaluate(() => ({ carga: !!document.getElementById('carga'), saindo: !!document.querySelector('#carga.saindo'), menu: !!window.__game?.scene?.isActive('Menu') }));
    fim.push({ buf: await page.screenshot(), ...estado, t: (Date.now() - t1) / 1000 });
    if (!estado.carga && estado.menu) break;
    await page.waitForTimeout(30);
  }
  await page.close();
  return { quadros, fim };
}

const { quadros, fim } = await filmar('normal');
console.log(`filmed ${quadros.length} frames in ${SEG} s; brightness ${Math.min(...quadros.map((q) => q.b)).toFixed(1)} … ${Math.max(...quadros.map((q) => q.b)).toFixed(1)}`);
quadros.forEach((q, i) => fs.writeFileSync(path.join(OUT, 'q', `${String(i).padStart(4, '0')}.png`), q.buf));

// the quiet frame: the darkest of the middle of the run
const meio = quadros.slice(Math.floor(quadros.length * 0.2));
const quieta = meio.reduce((a, q) => (q.b < a.b ? q : a));
fs.writeFileSync(path.join(OUT, 'quieta.png'), quieta.buf);
// the flashes: the brightest frames, at least 2 s apart
const picos = [];
for (const q of [...quadros].sort((a, b) => b.b - a.b)) {
  if (picos.every((p) => Math.abs(p.t - q.t) > 2)) picos.push(q);
  if (picos.length === 5) break;
}
picos.sort((a, b) => a.t - b.t).forEach((q, i) => fs.writeFileSync(path.join(OUT, `clarao-${i + 1}.png`), q.buf));
// the end
const saindo = fim.filter((f) => f.saindo && f.carga);
const cheia = fim.find((f) => f.carga && !f.saindo) ?? fim[0];
fs.writeFileSync(path.join(OUT, 'fim-cheia.png'), cheia.buf);
if (saindo.length) fs.writeFileSync(path.join(OUT, 'fim-saindo.png'), saindo[Math.min(saindo.length - 1, 2)].buf);
const menu = fim.find((f) => !f.carga && f.menu);
if (menu) fs.writeFileSync(path.join(OUT, 'fim-menu.png'), menu.buf);
console.log('the end:', fim.map((f) => `${f.t.toFixed(2)}${f.carga ? (f.saindo ? 's' : 'c') : '-'}${f.menu ? 'M' : ''}`).join(' '));

// "reduce flashes"
const calma = await filmar('calma', { v: 2, reduzirClaroes: true });
const maisClaro = calma.quadros.reduce((a, q) => (q.b > a.b ? q : a));
fs.writeFileSync(path.join(OUT, 'calma.png'), maisClaro.buf);
console.log(`reduced: brightness ${Math.min(...calma.quadros.map((q) => q.b)).toFixed(1)} … ${maisClaro.b.toFixed(1)}`);

fs.writeFileSync(path.join(OUT, 'fotos.json'), JSON.stringify({
  segundos: SEG, quadros: quadros.length, pct: [quadros[0].pct, quadros[quadros.length - 1].pct],
  brilho: { quieta: +quieta.b.toFixed(2), picos: picos.map((p) => +p.b.toFixed(2)), calma: +maisClaro.b.toFixed(2) },
  chegouAoMenu: !!menu,
}, null, 2));
console.log(erros.length ? erros : 'no page error');
await browser.close();
process.exitCode = erros.length || !menu ? 1 : 0;
