// A DECOLAGEM quadro a quadro: a cadeia de explosões que arranca a fortaleza do chão e cobre a
// troca da arte pousada para a aérea (Boss.blowUpBase / SWAP_AT).
//
// A sonda de fases fotografa UM instante da decolagem; esta varre a subida inteira, porque o que
// se julga aqui é o RITMO — se há fogo o tempo todo, e se a troca de arte cai debaixo de um
// estouro em vez de aparecer sozinha.
//
// uso: node scripts/_probe-decolagem.mjs   (com `npm run dev` no ar)
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  window.__game.scene
    .getScene('Menu')
    .scene.start('Game', { stage: 1, handling: 'free', practice: true });
});
await page.waitForTimeout(600);

await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__s = s;
  setInterval(() => {
    s.invulnerableUntil = 1e12;
    if (s.ship) {
      s.ship.x = 46;
      s.ship.y = 120;
      s.ship.body?.setVelocity?.(0, 0);
    }
  }, 40);
});

const estado = () =>
  page.evaluate(() => {
    const b = window.__s.boss;
    if (!b) return null;
    return {
      entering: b.entering,
      takingOff: b.takingOff,
      airborne: b.airborne,
      y: Math.round(b.sprite.y),
      tex: b.sprite.texture.key,
    };
  });

for (let i = 0; i < 200; i++) {
  await page.waitForTimeout(100);
  const e = await estado();
  if (e && !e.entering) break;
}

// Empurra a vida para logo acima de 50% e dá o golpe que dispara a decolagem.
await page.evaluate(() => {
  const b = window.__s.boss;
  while (b.hp > b.maxHp / 2 + 5) b.damage(5);
});
await page.waitForTimeout(200);
await page.evaluate(() => window.__s.boss.damage(10));

// 9 retratos ao longo dos 1.3s da subida + o repouso aéreo logo depois.
for (let i = 0; i < 9; i++) {
  const e = await estado();
  await page.screenshot({ path: `scripts/_decolagem-${i}.png` });
  console.log(`t=${i * 160}ms  y=${e.y} tex=${e.tex} takingOff=${e.takingOff}`);
  await page.waitForTimeout(160);
}

await browser.close();
