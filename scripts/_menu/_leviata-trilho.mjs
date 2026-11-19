// 19/11 · the night-menu Leviathan's PATH as drawn on screen: steps the HD menu scene by hand (the clock of
// `_neblina-filmar.mjs`), with only the Leviathan shown over white and its swim frozen on frame 0, and reads the
// darkness-weighted centroid of the sprite every `passo` s. A path drawn in whole screen pixels shows as a staircase
// (frame-to-frame jumps of ~1 px between flat runs); a continuous one moves a little every sample.
//   node scripts/_menu/_leviata-trilho.mjs <port> [t0=12] [dur=40] [passo=0.25]
import { chromium } from 'playwright';
import sharp from 'sharp';

const [PORTA, T0 = '12', DUR = '40', PASSO = '0.25'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1536, height: 864 } });
await page.goto(`http://localhost:${PORTA}/?neblina=nenhuma&chuva=nenhuma`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__gameHD?.scene.getScene('MenuHD') && window.__game?.scene.isActive('Menu'), null, { timeout: 90000 });
await page.waitForFunction(() => window.__game.scene.getScene('Menu').estado?.pronto, null, { timeout: 30000 });
await page.evaluate(() => {
  const hd = window.__gameHD, cena = hd.scene.getScene('MenuHD');
  for (const c of hd.scene.getScenes(true)) if (c !== cena) c.sys.setVisible(false);
  window.__game.canvas.style.visibility = 'hidden';
  document.documentElement.style.background = document.body.style.background = '#ffffff';
  hd.canvas.style.background = '#ffffff';
  const levi = cena.children.list.find((o) => o.texture?.key?.endsWith('-leviata'));
  for (const o of cena.children.list) if (o !== levi) o.willRender = () => false;
  for (const c of cena.cameras.cameras) if (c !== cena.cameras.main) c.setVisible(false);
  levi.setFrame(0); levi.setFrame = () => levi;
  const cam = cena.cameras.main; cam.resetPostPipeline?.(); cam.setBackgroundColor('#ffffff');
  window.__levi = levi;
  window.__game.loop.sleep(); hd.loop.sleep(); window.__agora = performance.now();
});
const r = await page.evaluate(() => { const c = window.__gameHD.canvas.getBoundingClientRect(); return { x: c.left, y: c.top, width: c.width, height: c.height }; });
const ir = (alvo) => page.evaluate((alvo) => {
  const g = window.__game, hd = window.__gameHD, cena = hd.scene.getScene('MenuHD');
  if (cena.t > alvo || alvo - cena.t > 2) cena.t = Math.max(0, alvo - 0.5);
  const dt = 1000 / 30;
  while (cena.t < alvo - 1e-6) { window.__agora += dt; g.step(window.__agora, dt); hd.step(window.__agora, dt); }
  return { x: window.__levi.x, y: window.__levi.y, vis: window.__levi.visible };
}, alvo);
const amostras = [];
for (let t = Number(T0); t <= Number(T0) + Number(DUR) + 1e-9; t += Number(PASSO)) {
  const pos = await ir(t);
  const { data, info } = await sharp(await page.screenshot({ clip: { x: r.x + r.width * 0.45, y: r.y, width: r.width * 0.55, height: r.height * 0.4 } })).greyscale().raw().toBuffer({ resolveWithObject: true });
  let m = 0, sx = 0, sy = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const w = 255 - data[y * info.width + x];
    if (w > 8) { m += w; sx += w * x; sy += w * y; }
  }
  amostras.push({ t, cx: m ? sx / m : NaN, cy: m ? sy / m : NaN, ...pos });
}
await browser.close();
const dy = amostras.slice(1).map((a, i) => a.cy - amostras[i].cy);
const dx = amostras.slice(1).map((a, i) => a.cx - amostras[i].cx);
const parados = dy.filter((d) => Math.abs(d) < 0.02).length;
console.log(`amostras ${amostras.length}, de t=${T0} a ${Number(T0) + Number(DUR)} s, a cada ${PASSO} s`);
console.log(`y na tela: ${amostras[0].cy.toFixed(2)} → ${amostras.at(-1).cy.toFixed(2)} px; x: ${amostras[0].cx.toFixed(2)} → ${amostras.at(-1).cx.toFixed(2)} px`);
console.log(`maior salto entre amostras: y ${Math.max(...dy.map(Math.abs)).toFixed(3)} px, x ${Math.max(...dx.map(Math.abs)).toFixed(3)} px`);
console.log('primeiras:', amostras.slice(0, 6).map((a) => `${a.cx.toFixed(2)},${a.cy.toFixed(2)}`).join('  '));
console.log(`amostras com y parado: ${parados}/${dy.length} (degraus = muitas paradas e saltos de ~1 px)`);
