// O CHOQUE da água-viva: o estalo com ela VIVA e a descarga ao MORRER.
//
// ⚠️ Congela a cena e dispara os efeitos à mão. Esperar o estalo natural (1,1–2,3s) num tiro de
// tela seria sortear o instante — e efeito de 90ms não se fotografa por sorte.
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.setViewportSize({ width: 384, height: 216 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s.lives !== undefined) s.lives = 9;
    const av = s.enemies ? s.enemies.enemies.getChildren().filter((e) => e.active && e.getData('kind') === 'aguaViva') : [];
    return { t: s.elapsed ?? 0, n: av.length };
  });

let voltas = 0;
let e = await estado();
while (e.n === 0) {
  if (++voltas > 400) throw new Error(`sem água-viva em t=${e.t.toFixed(1)}`);
  await page.waitForTimeout(350);
  e = await estado();
}
console.log(`t=${e.t.toFixed(1)}  ${e.n} água-viva(s) na tela`);

const tiros = [];
const foto = async (rot) => {
  // ⚠️ O RECORTE SEGUE O EFEITO, NÃO A CRIATURA. Depois da morte o sprite continua existindo
  // (invisível) e a física continua movendo — seguir ele levava o enquadramento embora e a
  // descarga ficava fora do quadro. `window.__foco` é onde o efeito foi disparado.
  const pos = await page.evaluate(() => window.__foco ?? { x: Math.round(window.__av.x), y: Math.round(window.__av.y), w: Math.round(window.__av.displayWidth), vis: window.__av.visible });
  // Recorte APERTADO em volta da criatura, a 8x: os arcos têm 1–2px e a 4x numa tela inteira
  // eles somem no reescalonamento de quem olha a imagem.
  const L = Math.max(0, Math.min(384 - 96, pos.x - 48));
  const T = Math.max(0, Math.min(216 - 72, pos.y - 36));
  tiros.push({ rot, buf: await sharp(await page.screenshot()).extract({ left: L, top: T, width: 96, height: 72 }).resize(96 * 8, 72 * 8, { kernel: 'nearest' }).toBuffer() });
  console.log(`  ${rot}  (bicho em ${pos.x},${pos.y} larg ${pos.w} vis ${pos.vis})`);
};

// 1. A criatura parada, sem efeito nenhum: a linha de base.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const av = s.enemies.enemies.getChildren().filter((x) => x.active && x.getData('kind') === 'aguaViva');
  window.__av = av[0];
  window.__av.setPosition(120, 100);
  s.scene.pause();
});
await foto('1-parada');

// 2. O ESTALO (a criatura viva).
for (const n of [2, 3]) {
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.fx.estalo(window.__av.x, window.__av.y, window.__av.displayWidth * 0.42);
    window.__foco = { x: Math.round(window.__av.x), y: Math.round(window.__av.y), w: Math.round(window.__av.displayWidth), vis: true };
    s.scene.resume();
  });
  await page.waitForTimeout(30);
  await page.evaluate(() => window.__game.scene.getScene('Game').scene.pause());
  await foto(`${n}-estalo`);
}

// 3. O CHOQUE da morte, quadro a quadro.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.fx.choque(window.__av.x, window.__av.y, window.__av.scale);
  window.__foco = { x: Math.round(window.__av.x), y: Math.round(window.__av.y), w: Math.round(window.__av.displayWidth), vis: false };
  window.__av.setVisible(false);
  s.scene.resume();
});
for (const ms of [40, 60, 80, 120]) {
  await page.waitForTimeout(ms);
  await page.evaluate(() => window.__game.scene.getScene('Game').scene.pause());
  await foto(`choque +${ms}ms`);
  await page.evaluate(() => window.__game.scene.getScene('Game').scene.resume());
}

await sharp({ create: { width: 96 * 8, height: tiros.length * (72 * 8 + 4), channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } } })
  .composite(tiros.map((t, i) => ({ input: t.buf, left: 0, top: i * (72 * 8 + 4) })))
  .png()
  .toFile('scripts/_f3/ver-choque.png');
console.log('\nscripts/_f3/ver-choque.png');
await browser.close();
