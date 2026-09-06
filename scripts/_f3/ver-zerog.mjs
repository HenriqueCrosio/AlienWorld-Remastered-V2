// O FUNDO DO ZERO-G na tela, depois da reversão para 480×270 em y=−27. Mata o chefão da Fase 1
// para romper a atmosfera e fotografa a saída, com a placa medida junto (posição, tamanho, alpha).
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' });
});
await page.waitForTimeout(600);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__s = s;
  setInterval(() => {
    s.invulnerableUntil = 1e12;
    if (s.ship) { s.ship.x = 90; s.ship.y = 120; s.ship.body?.setVelocity?.(0, 0); }
  }, 40);
});
await page.keyboard.press('g');

let rompeu = false;
for (let i = 0; i < 300 && !rompeu; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  rompeu = await page.evaluate(() => {
    const s = window.__s;
    if (s?.boss && !s.boss.isDead && s.boss.damage(25)) s.killBoss();
    return s?.zone === 'vacuo';
  });
}
if (!rompeu) { console.log('nao rompeu'); await browser.close(); process.exit(1); }

const placa = () =>
  page.evaluate(() => {
    const b = window.__s.parallax.zeroGBg;
    return b
      ? { tex: b.texture.key, x: Math.round(b.x), y: Math.round(b.y), w: b.width, h: b.height, alpha: +b.alpha.toFixed(2) }
      : null;
  });

for (const t of [2000, 4000, 6000]) {
  await page.waitForTimeout(t === 2000 ? 2000 : 2000);
  console.log(`t+${t / 1000}s`, JSON.stringify(await placa()));
  await page.screenshot({ path: `scripts/_f3/rev-zerog-${t / 1000}s.png` });
}

await browser.close();
