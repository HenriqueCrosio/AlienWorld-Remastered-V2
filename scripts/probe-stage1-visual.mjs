// Screenshots da Fase 1 para o passe visual do cenário (Fatia 1).
// Sobe direto na Fase 1 (pula o menu) e fotografa em alguns instantes. Prefixo `_` = gitignorado.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
// Entra na Fase 1 direto (modo LIVRE: sem gravidade, a nave não cai).
await page.evaluate(() => {
  window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' });
});
await page.waitForTimeout(400);
// HARNESS: mantém a nave IMORTAL e fixa num canto, para o mundo rolar e eu ver só o cenário.
// (invulnerableUntil é privado em TS mas acessível em runtime; a nave é `ship`.)
await page.evaluate(() => {
  setInterval(() => {
    const s = window.__game.scene.getScene('Game');
    if (!s) return;
    s.invulnerableUntil = 1e12;
    if (s.ship) { s.ship.x = 46; s.ship.y = 100; s.ship.body?.setVelocity?.(0, 0); }
  }, 80);
});

let last = 400;
for (const t of [3000, 9000, 16000, 23000]) {
  await page.waitForTimeout(t - last);
  last = t;
  await page.screenshot({ path: `scripts/_f1-${t}.png` });
}

await browser.close();
console.log('ok — scripts/_f1-3000.png, _f1-9000.png, _f1-16000.png, _f1-23000.png');
