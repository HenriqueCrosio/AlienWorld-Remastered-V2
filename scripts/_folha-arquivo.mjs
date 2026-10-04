// A FOLHA FINAL DO ARQUIVO (plano 2026-10-04-arquivo-de-cartas, Task 5): prints do menu e de três fichas, e um GIF
// navegando pela grade com os clipes tocando. Uso: node scripts/_folha-arquivo.mjs   (com `npm run dev` rodando)
import fs from 'fs';
import { chromium } from 'playwright';
import sharp from 'sharp';

const OUT = 'docs/superpowers/folhas/2026-10-04/arquivo';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene.isActive('Menu'));
await page.keyboard.press('KeyQ'); // pula a abertura (não o X: é atalho de dev)
await page.waitForFunction(() => window.__game.scene.getScene('Menu').settled);
await page.keyboard.press('ArrowDown');
await page.waitForTimeout(400);
const tela = await page.evaluate(() => {
  const c = window.__game.canvas.getBoundingClientRect();
  return { x: c.left, y: c.top, width: c.width, height: c.height };
});
await page.screenshot({ path: `${OUT}/arquivo-menu.png`, clip: tela });
await page.keyboard.press('Enter');
await page.waitForFunction(() => window.__game.scene.isActive('Arquivo'));

const esperarClipe = (id) =>
  page
    .waitForFunction((id) => {
      const a = window.__game.scene.getScene('Arquivo');
      return a.selecionada === id && (a.clipe?.anims.isPlaying || !a.cache.json.get('clipes')?.cartas[id]);
    }, id, { timeout: 8000 })
    .catch(() => {});

for (const id of ['WPN_009', 'EFF_011', 'DEF_003']) {
  await page.evaluate((id) => window.__game.scene.getScene('Arquivo').selecionar(id), id);
  await esperarClipe(id);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/arquivo-${id}.png`, clip: tela });
}

// O GIF: volta ao começo e anda pela grade (→ → ↓ → ↓ ...), ~1,6s em cada carta, fotos a ~8 qps em tempo real.
await page.evaluate(() => window.__game.scene.getScene('Arquivo').selecionar('WPN_001'));
const roteiro = ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowDown', 'ArrowDown', 'ArrowRight'];
const quadros = [];
const fotografar = async (n) => {
  for (let i = 0; i < n; i++) {
    const f = await page.screenshot({ clip: tela });
    quadros.push(await sharp(f).resize(768, 432, { kernel: 'nearest' }).png().toBuffer());
    await page.waitForTimeout(80);
  }
};
await fotografar(10);
for (const tecla of roteiro) {
  await page.keyboard.press(tecla);
  const id = await page.evaluate(() => window.__game.scene.getScene('Arquivo').selecionada);
  await esperarClipe(id);
  await fotografar(12);
}
await browser.close();
await sharp(quadros, { join: { animated: true } }).gif({ delay: Array(quadros.length).fill(125), loop: 0 }).toFile(`${OUT}/arquivo-navegando.gif`);
console.log(OUT, 'prints + GIF de', quadros.length, 'quadros');
