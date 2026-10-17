// 17/10 — ITEM 7, A FAIR STILL: today's enlarged mid-plane piece and its native redraw SIDE BY SIDE in the real F4, with
// the layer's own origin, flip, tint and depth, under the same Atmosfera. The GIFs cannot compare them (the corridor
// and the pieces are drawn at random every run, and the mid-plane hides behind the tables); this can. The game is
// stepped to T0, the mid-plane layers are emptied and stopped, and two copies of each piece are placed by hand.
//   node scripts/_polimento/_lado-a-lado-nativo.mjs <redraws dir> <t0> <out.png>
import path from 'node:path';
import { chromium } from 'playwright';

const [DIR, T0_S, OUT] = process.argv.slice(2);
const u = (f) => '/' + path.posix.join(DIR.replace(/\\/g, '/'), f);
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
await page.evaluate(async ({ t0, urls }) => {
  const g = window.__game;
  g.loop.sleep();
  let agora = g.loop.now;
  const s = () => g.scene.getScene('Game');
  const passo = () => {
    const c = s();
    c.damageShip = () => {};
    if (c.cartas) c.cartas.abrirMesa = () => {};
    if (c.golfinho && c.elapsed >= 45) c.matarGolfinho();
    if (g.scene.isActive('Cartas')) { g.scene.stop('Cartas'); g.scene.resume('Game'); }
    agora += 1000 / 60;
    g.step(agora, 1000 / 60);
  };
  while (s().elapsed < t0) { for (let i = 0; i < 10; i++) passo(); await new Promise((r) => setTimeout(r, 0)); }
  const c = s();
  for (const [key, url, fw, fh] of urls) {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    if (fw) c.textures.addSpriteSheet(key, im, { frameWidth: fw, frameHeight: fh }); else c.textures.addImage(key, im);
  }
  // Empty the mid-plane and freeze it (nextX far away), so only the hand-placed pairs show.
  for (const l of c.parallax.layers) {
    if (!['orgao', 'maquinario', 'f4Ponte'].includes(l.key)) continue;
    l.sprites.forEach((sp) => sp.destroy());
    l.sprites.length = 0;
    l.nextX = 1e9;
  }
  const lay = (k) => c.parallax.layers.find((l) => l.key === k);
  const poe = (k, x, tex, frame, esc) => {
    const l = lay(k);
    return c.add.image(x, l.baseY, tex, frame).setOrigin(0.5, l.teto ? 0 : 1).setFlipY(!!l.teto).setDepth(l.depth).setTint(l.tint).setScale(esc);
  };
  poe('orgao', 70, 'orgaoAnimSheet', 0, 1.55);
  poe('orgao', 165, 'natOrgao', 0, 1);
  poe('maquinario', 250, 'maquinarioAnimSheet', 0, 1.55);
  poe('maquinario', 335, 'natMaquinario', 0, 1);
  // The bridge is wide: today's on the left half of a second shot (below), so here only the columns.
  window.__poe = poe;
  for (let i = 0; i < 2; i++) passo();
}, {
  t0: Number(T0_S),
  urls: [
    ['natOrgao', u('orgao-anim-i2p-11-paleta.png'), 149, 198],
    ['natMaquinario', u('maquinario-anim-i2p-11-paleta.png'), 149, 198],
    ['natPonte', u('f4-ponte-edit-11-paleta.png')],
    ['natPonteI2p', u('i2p130/f4-ponte-i2p-11-paleta.png')],
  ],
});
const shot = async (arq) => {
  const c = await page.evaluate(() => { const b = window.__game.canvas.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  await page.screenshot({ path: arq, clip: { x: c.x, y: c.y, width: c.w, height: c.h } });
};
await shot(OUT.replace(/\.png$/, '-colunas.png'));
// The bridges: today's (×1.48) and the two redraws, one at a time in the same spot.
for (const [nome, tex, esc] of [['hoje', 'f4Ponte', 1.48], ['edit', 'natPonte', 1], ['i2p130', 'natPonteI2p', 1]]) {
  await page.evaluate(([tex, esc]) => {
    const c = window.__game.scene.getScene('Game');
    c.children.list.filter((o) => o.getData?.('ladoALado')).forEach((o) => o.destroy());
    c.children.list.filter((o) => o.type === 'Image' && /rgao|aquinario/.test(o.texture.key)).forEach((o) => o.setVisible(false));
    window.__poe('f4Ponte', 192, tex, undefined, esc).setData('ladoALado', true);
    window.__game.step(window.__game.loop.now + 16, 16);
  }, [tex, esc]);
  await shot(OUT.replace(/\.png$/, `-ponte-${nome}.png`));
}
await browser.close();
console.log('ok', OUT);
