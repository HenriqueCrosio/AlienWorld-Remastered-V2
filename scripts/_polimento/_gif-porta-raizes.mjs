// 17/10 — ITEM 2b IN MOTION: the duct door's roots in the real F4 (a mock in memory, nothing in the code changes).
// Plays the F4 by frame stepping up to T0, then glues a root piece (`_raizes-porta.mjs`) to every `porta` on screen,
// floor and ceiling, re-read every frame from the border surfaces at the door's x (the sphincter's `posicionarRaizes`),
// at depth −0.52 (in front of the border, −0.6). When the door passes x < MATA it is blown (`matarPorta`), so the GIF
// also shows the `portaLasca` keeping its roots.
//   <variant> — `A` | `B` | `C` (the pieces `raiz-<v>-chao/teto.png` in the dir) or `atual` (today: no roots)
// One photo every 4 game frames (15 fps), at the native 384×216.
//   node scripts/_polimento/_gif-porta-raizes.mjs <pieces dir> <variant> <t0> <dur s> <out.gif> [mata x = 150]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const [DIR, VAR, T0_S, DUR_S, OUT, MATA_S = '150'] = process.argv.slice(2);
const T0 = Number(T0_S), DUR = Number(DUR_S), PASSO = 4;
const url = (lado) => '/' + path.posix.join(DIR.replace(/\\/g, '/'), `raiz-${VAR}-${lado}.png`);
// The piece's geometry, from `_raizes-porta.mjs`.
const W = 100, H = 40, SUP = 10, AX = 50;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage: 4, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
await page.evaluate(({ geo, mata }) => {
  const g = window.__game;
  g.loop.sleep();
  window.__agora = g.loop.now;
  const s = () => g.scene.getScene('Game');
  window.__raizes = { on: false, presas: new Map() };
  const prender = () => {
    const c = s(), R = window.__raizes;
    if (!R.on) return;
    for (const p of c.terrain.props.getChildren()) {
      if (p.getData('kind') !== 'porta' || !p.active) continue;
      if (p.x < mata && !p.getData('inerte')) c.matarPorta(p);
      let par = R.presas.get(p);
      if (!par && R.chaves) {
        par = R.chaves.map(([chave, teto]) =>
          c.add.image(0, 0, chave).setDepth(-0.52)
            .setOrigin(geo.AX / geo.W, teto ? (geo.H - 1 - geo.SUP) / geo.H : geo.SUP / geo.H));
        R.presas.set(p, par);
      }
      if (!par) continue;
      const x = Math.round(p.x);
      par[0].setPosition(x, Math.round(c.moldura.superficieChaoEm(x)));
      par[1].setPosition(x, Math.round(c.moldura.superficieTetoEm(x)));
    }
  };
  window.__passos = (k) => {
    for (let i = 0; i < k; i++) {
      if (g.scene.isActive('Game')) {
        const c = s();
        c.damageShip = () => {};
        if (c.cartas) c.cartas.abrirMesa = () => {};
        if (c.golfinho && c.elapsed >= 45) c.matarGolfinho();
      }
      if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); }
      window.__agora += 1000 / 60;
      g.step(window.__agora, 1000 / 60);
      if (g.scene.isActive('Game')) prender();
    }
  };
  window.__carregar = async (urls) => {
    const c = s(), R = window.__raizes;
    R.on = true;
    if (!urls) return;
    R.chaves = [];
    for (const [i, u] of urls.entries()) {
      const key = `raiz-porta-gif-${i}`;
      await new Promise((res, rej) => { const im = new Image(); im.onload = () => { c.textures.addImage(key, im); res(); }; im.onerror = rej; im.src = u; });
      R.chaves.push([key, i === 1]);
    }
  };
}, { geo: { W, H, SUP, AX }, mata: Number(MATA_S) });
await page.evaluate(async (t) => {
  const s = () => window.__game.scene.getScene('Game');
  while (!(window.__game.scene.isActive('Game') && s().elapsed >= t)) { window.__passos(10); await new Promise((r) => setTimeout(r, 0)); }
}, T0);
await page.evaluate((u) => window.__carregar(u), VAR === 'atual' ? null : [url('chao'), url('teto')]);

const tmp = fs.mkdtempSync(path.join(path.dirname(OUT), '.tmp-gif-'));
const quadros = [];
for (let n = 0; n < Math.round((DUR * 60) / PASSO); n++) {
  await page.evaluate((k) => window.__passos(k), PASSO);
  const c = await page.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  const arq = path.join(tmp, `${String(n).padStart(3, '0')}.png`);
  await page.screenshot({ path: arq, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
  quadros.push(arq);
}
await browser.close();
const paginas = [];
for (const q of quadros) paginas.push(await sharp(q).resize(384, 216, { kernel: 'nearest' }).png().toBuffer());
await sharp(paginas, { join: { animated: true } }).gif({ delay: Array(paginas.length).fill(67), loop: 0 }).toFile(OUT);
fs.copyFileSync(quadros[Math.floor(quadros.length / 3)], OUT.replace(/\.gif$/, '.png'));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(OUT, paginas.length, 'frames');
