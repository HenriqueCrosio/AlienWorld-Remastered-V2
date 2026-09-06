// Diagnóstico pontual: ONDE estão as colunas escuras na faixa do casco.
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.keyboard.press('m');

const t = () => page.evaluate(() => window.__game.scene.getScene('Game').elapsed ?? 0);
const alvo = Number(process.argv[2] ?? 52);
while ((await t()) < alvo) {
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.lives = 9; });
  await page.waitForTimeout(900);
}

const info = await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').parallax;
  const l = p.layers.find((x) => x.casco);
  return { dist: Math.round(p.cascoDist), pecas: l.sprites.map((s) => `${s.texture.key}@${Math.round(s.x)}${s.flipX ? 'F' : ''}`) };
});
console.log(`t=${(await t()).toFixed(1)} dist=${info.dist}`);
console.log(info.pecas.join('  '));

const tiro = await page.screenshot();
await sharp(tiro).resize(384 * 3, 216 * 3, { kernel: 'nearest' }).toFile('scripts/_f3/diag-emenda-x3.png');
const { data, info: meta } = await sharp(tiro).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const col = (x, y0, y1) => {
  let l = 0;
  for (let y = y0; y <= y1; y++) {
    const i = (y * meta.width + x) * 4;
    l += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }
  return l / (y1 - y0 + 1);
};
for (const [nome, y0, y1] of [['rodapé 192..214', 192, 214], ['faixa 152..214', 152, 214]]) {
  const achados = [];
  for (let x = 3; x < meta.width - 3; x++) {
    if (col(x, y0, y1) < 0.035 && col(x - 3, y0, y1) > 0.06 && col(x + 3, y0, y1) > 0.06) {
      achados.push(`x=${x} (${col(x - 3, y0, y1).toFixed(3)} | ${col(x, y0, y1).toFixed(3)} | ${col(x + 3, y0, y1).toFixed(3)})`);
    }
  }
  console.log(`${nome}: ${achados.length ? achados.join('  ') : 'nenhum'}`);
}
await browser.close();
