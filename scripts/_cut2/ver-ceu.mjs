// O CEU sozinho: esconde a doca velha, o chao falso e as amarras, para julgar so a pintura.
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 768, height: 432 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('o');
await page.waitForTimeout(6000);

const info = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.plataforma?.forEach((p) => p.setVisible(false));
  s.doca?.setVisible(false);
  s.padRim?.setVisible(false);
  s.cabos?.setVisible(false);
  s.amarras?.forEach((a) => a.rocha.setVisible(false));
  s.ship?.setVisible(false);
  s.banner?.setVisible(false);
  s.children.list.filter((o)=>o.texture&&o.texture.key==='planetShattered').forEach((o)=>o.setVisible(false));
  const p = s.children.list.find((o) => o.texture && o.texture.key === 'paintBgCut2');
  return p ? { x: Math.round(p.x), y: Math.round(p.y), d: p.depth, w: p.width, h: p.height } : null;
});
await page.screenshot({ path: 'scripts/_cut2/ceu-sem-planeta.png' });
await browser.close();
console.log('pintura:', JSON.stringify(info));
