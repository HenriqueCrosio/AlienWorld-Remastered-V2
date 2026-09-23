// A SERRA FERE? (19/09) — a captura mostra a coreografia, mas não prova a COLISÃO. Aqui a nave é posta
// no caminho da serra SEM invulnerabilidade, e a sonda conta as vidas antes e depois.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_provar-serra.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(900);
await page.keyboard.press('G');
await page.waitForFunction(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (!s.boss || s.boss.entering) return false;
  s.lives = 999;
  return true;
}, null, { timeout: 60000, polling: 100 });

// Espera a serra VOAR e gruda a nave no centro dela: se o overlap existe, a vida cai.
const ok = await page.waitForFunction(() => {
  const b = window.__game.scene.getScenes(true)[0].boss;
  return b?.serra?.estado === 'voo';
}, null, { timeout: 60000, polling: 16 }).then(() => true, () => false);
if (!ok) { console.log('✖ não peguei a serra voando'); await browser.close(); process.exit(1); }

const antes = await page.evaluate(() => window.__game.scene.getScenes(true)[0].lives);
// Cola a nave na serra por meio segundo — sem invulnerabilidade desta vez.
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.invulnerableUntil = 0;
  s.__grude = setInterval(() => {
    const se = s.boss?.serra;
    if (!se?.sprite?.active) return;
    s.ship.setPosition(se.sprite.x, se.sprite.y);
    s.ship.body.reset(se.sprite.x, se.sprite.y);
  }, 16);
});
await page.waitForTimeout(700);
const depois = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  clearInterval(s.__grude);
  return s.lives;
});
await browser.close();
console.log(`vidas antes=${antes} depois=${depois}`);
console.log(depois < antes ? '✔ A SERRA FERE por contato' : '✖ a serra NÃO feriu — o overlap não está ligado');
process.exit(depois < antes ? 0 : 1);
