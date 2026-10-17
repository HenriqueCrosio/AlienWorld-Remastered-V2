// 16/10 — THE TAIL CONCEPTS MOVING IN THE GAME (polish block C, item 6). Plays the F3 up to the moment the tail is
// born (t=38), kills its tweens and drives it BY HAND on the stepped game clock with the exact curves of
// `GameScene.raboDoLeviata` (arrival 2.5s easeOut, alpha 1.1s, exit after 7.8s in 1.8s easeIn to x=740). The beat is
// one of two motions:
//   baleia  — the code's beat today: `angle` −6 → +6 in 1.5s (easeInOut), back in 0.55s (easeIn), 0.25s hold. A whale
//             fluke beats up and down: in profile that IS a rotation in the screen plane.
//   tubarao — a shark fin sweeps side to side: frames baked by `_varrer-tubarao.mjs` (foreshortening + perspective),
//             one cycle per 2.3s (the same period), angle 0.
// One photo every 4 game frames (15 fps), brought down to the game's 384×216 and up to 2× (nearest), into a GIF.
//   jogo    — 17/10, after the install: touches NOTHING, the tail runs on the game's own code (art "atual").
//   node scripts/_polimento/_gif-rabo.mjs <label> <png | frames dir | "atual"> <baleia|tubarao|jogo> <out.gif>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

// [period s = 2.3]: the time the frames of a `tubarao` dir take to play once (32 frames = a full stroke = 4.6s).
const [ROTULO, ARTE, MOV, OUT, PERIODO_S = '2.3'] = process.argv.slice(2);
const PERIODO = Number(PERIODO_S);
const T_FIM = 9.6; // creation → destroy (2.5 + 5.3 hold + 1.8 exit)
const PASSO = 4; // game frames per photo

const urls = ARTE === 'atual' ? [] : fs.statSync(ARTE).isDirectory()
  ? fs.readdirSync(ARTE).filter((f) => f.endsWith('.png')).sort().map((f) => '/' + path.posix.join(ARTE.replace(/\\/g, '/'), f))
  : ['/' + ARTE.replace(/\\/g, '/')];

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
  g.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
await page.evaluate(() => {
  const g = window.__game;
  g.loop.sleep();
  window.__agora = g.loop.now;
  const s = () => g.scene.getScene('Game');
  window.__passos = (k) => {
    for (let i = 0; i < k; i++) {
      if (g.scene.isActive('Game')) {
        s().damageShip = () => {};
        if (s().cartas) s().cartas.abrirMesa = () => {};
      }
      if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); }
      window.__agora += 1000 / 60;
      g.step(window.__agora, 1000 / 60);
    }
  };
});
// Up to the frame the tail is born.
await page.evaluate(async () => {
  const g = window.__game, s = () => g.scene.getScene('Game');
  const rabo = () => s().children.list.find((o) => o.texture?.key === 'raboLeviata');
  while (!(g.scene.isActive('Game') && rabo())) { window.__passos(1); await new Promise((r) => setTimeout(r, 0)); }
});
const info = await page.evaluate(async ({ urls, mov }) => {
  const g = window.__game, s = g.scene.getScene('Game');
  const r = s.children.list.find((o) => o.texture?.key === 'raboLeviata');
  if (mov === 'jogo') { window.__rabo = { r, keys: [], t0: s.elapsed }; return { t0: s.elapsed, w: r.displayWidth, h: r.displayHeight, anim: r.anims.currentAnim?.key }; }
  s.tweens.killTweensOf(r);
  const keys = [];
  for (let i = 0; i < urls.length; i++) {
    const key = `rabo-gif-${i}`;
    await new Promise((res, rej) => { const im = new Image(); im.onload = () => { s.textures.addImage(key, im); res(); }; im.onerror = rej; im.src = urls[i]; });
    keys.push(key);
  }
  if (keys.length) r.setTexture(keys[0]).setScale(1);
  window.__rabo = { r, keys, t0: s.elapsed };
  return { t0: s.elapsed, w: r.displayWidth, h: r.displayHeight, keys: keys.length };
}, { urls, mov: MOV });
console.log(ROTULO, MOV, JSON.stringify(info));

const tmp = fs.mkdtempSync(path.join(path.dirname(OUT), '.tmp-gif-'));
const quadros = [];
for (let n = 0; ; n++) {
  const fim = await page.evaluate(({ mov, T_FIM, PASSO, PERIODO }) => {
    const { r, keys, t0 } = window.__rabo;
    const s = window.__game.scene.getScene('Game');
    const t = s.elapsed - t0;
    if (t > T_FIM) return true;
    if (mov === 'jogo') { window.__passos(PASSO); return false; }
    const sin = (v) => Math.sin((v * Math.PI) / 2), sinIn = (v) => 1 - Math.cos((v * Math.PI) / 2), inOut = (v) => 0.5 * (1 - Math.cos(Math.PI * v));
    const clamp = (v) => Math.max(0, Math.min(1, v));
    let x = t < 2.5 ? 584 + (374 - 584) * sin(t / 2.5) : 374;
    if (t > 7.8) x = 374 + (740 - 374) * sinIn(clamp((t - 7.8) / 1.8));
    r.x = x;
    r.alpha = sin(clamp(t / 1.1));
    if (mov === 'baleia') {
      const c = t % 2.3;
      r.angle = c < 1.5 ? -6 + 12 * inOut(c / 1.5) : c < 2.05 ? 6 - 12 * sinIn((c - 1.5) / 0.55) : -6;
    } else {
      r.angle = 0;
      if (keys.length > 1) r.setTexture(keys[Math.floor(((t % PERIODO) / PERIODO) * keys.length) % keys.length]);
    }
    window.__passos(PASSO);
    return false;
  }, { mov: MOV, T_FIM, PASSO, PERIODO });
  if (fim) break;
  const c = await page.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  const arq = path.join(tmp, `${String(n).padStart(3, '0')}.png`);
  await page.screenshot({ path: arq, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
  quadros.push(arq);
}
await browser.close();

// At the game's NATIVE 384×216 (a 2× GIF was 26 MB); the sheet scales it up with `image-rendering: pixelated`.
// The label lives in the sheet, not in the frames.
const paginas = [];
for (const q of quadros) paginas.push(await sharp(q).resize(384, 216, { kernel: 'nearest' }).png().toBuffer());
await sharp(paginas, { join: { animated: true } }).gif({ delay: Array(paginas.length).fill(67), loop: 0 }).toFile(OUT);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(OUT, paginas.length, 'frames');
