// DIAGNÓSTICO (Phase 1 do debug): a luta REAL do chefão da Fase 1, não o treino.
// Entra na fase, pula para o chefão com o atalho DEV 'G', e fotografa ao longo do tempo —
// para ver a base do boss (colada?) e o horizonte (montanhas somem?).
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
// Fase 1 REAL (não practice), modo livre para a nave não cair.
await page.evaluate(() => {
  window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' });
});
await page.waitForTimeout(500);

await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__s = s;
  setInterval(() => {
    s.invulnerableUntil = 1e12;
    if (s.ship) { s.ship.x = 60; s.ship.y = 110; s.ship.body?.setVelocity?.(0, 0); }
  }, 40);
});

// Pula para o chefão (atalho DEV 'G').
await page.keyboard.press('g');

// Espera o boss existir e estacionar.
for (let i = 0; i < 200; i++) {
  await page.waitForTimeout(100);
  const pronto = await page.evaluate(() => { const b = window.__s.boss; return b && !b.entering; });
  if (pronto) break;
}

/** Conta camadas de fundo vivas para ver se as montanhas somem com o tempo. */
const censo = () =>
  page.evaluate(() => {
    const s = window.__s;
    const p = s.parallax;
    const cont = {};
    for (const layer of p.layers ?? []) {
      const k = layer.key ?? '?';
      cont[k] = (cont[k] ?? 0) + (layer.sprites?.length ?? 0);
    }
    return {
      camadas: cont,
      paintedBg: (p.paintedBg ?? []).map((b) => Math.round(b.x)),
      bossDepth: s.boss?.sprite?.depth,
      bossY: Math.round(s.boss?.sprite?.y),
      groundFrontDepth: p.groundFront?.depth,
      zone: s.zone,
    };
  });

for (const [rot, t] of [['t0', 0], ['t6', 6000], ['t14', 14000], ['t24', 24000]]) {
  if (t) await page.waitForTimeout(t - (rot === 't6' ? 0 : rot === 't14' ? 6000 : 14000));
  await page.screenshot({ path: `scripts/_boss-fundo-${rot}.png` });
  const c = await censo();
  console.log(`${rot}: skyline=${c.camadas.skyline ?? 0} colonyLight=${c.camadas.colonyLight ?? 0} scout=${c.camadas.enemyScout ?? 0} asteroid=${c.camadas.asteroid ?? 0} | paintedBg.x=${JSON.stringify(c.paintedBg)} | bossDepth=${c.bossDepth} bossY=${c.bossY} frontDepth=${c.groundFrontDepth} zone=${c.zone}`);
}

await browser.close();
