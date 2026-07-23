// Os 4 inimigos da Fase 1 na MESMA tela, parados, para julgar as silhuetas lado a lado.
//
// A pergunta que esta sonda responde é uma só: dá para distinguir drone, batedor, canhoneira
// e torre de solo num relance? Silhueta por função é o objetivo da fatia — e isso não se
// verifica olhando um sprite por vez no editor, só com os quatro juntos no tamanho de jogo.
//
// uso: node scripts/probe-roster-f1.mjs   (com `npm run dev` no ar)
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' });
});
await page.waitForTimeout(600);

await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  setInterval(() => {
    s.invulnerableUntil = 1e12;
    if (s.ship) {
      s.ship.x = 30;
      s.ship.y = 210;
      s.ship.body?.setVelocity?.(0, 0);
    }
  }, 40);

  s.terrain.spawn('turret');
  s.enemies.spawn('drone', 40);
  s.enemies.spawn('batedor', 80);
  s.enemies.spawn('canhoneira', 125);

  // Congela todo mundo num x fixo: o objetivo é comparar, não filmar.
  const alvos = [
    ['drone', 90],
    ['batedor', 170],
    ['canhoneira', 250],
  ];
  setInterval(() => {
    for (const e of s.enemies.enemies.getChildren()) {
      const par = alvos.find((a) => a[0] === e.getData('kind'));
      if (par) {
        e.x = par[1];
        e.body.setVelocity(0, 0);
      }
    }
    for (const p of s.terrain.props.getChildren()) {
      if (p.getData('kind') === 'turret' && p.x < 210) p.setVelocityX(0);
    }
  }, 40);
});

await page.waitForTimeout(4000);

const estado = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  return {
    inimigos: s.enemies.enemies.getChildren().map((e) => ({
      kind: e.getData('kind'),
      tex: e.texture.key,
      tela: `${Math.round(e.displayWidth)}x${Math.round(e.displayHeight)}`,
      hitbox: `${Math.round(e.body.width)}x${Math.round(e.body.height)}`,
      flip: e.flipX,
    })),
    torres: s.terrain.props
      .getChildren()
      .filter((p) => p.getData('kind') === 'turret')
      .map((p) => ({ tex: p.texture.key, tela: `${Math.round(p.displayWidth)}x${Math.round(p.displayHeight)}`, flip: p.flipX })),
  };
});

for (const e of estado.inimigos) {
  console.log(`${e.kind.padEnd(11)} tex=${e.tex.padEnd(14)} tela=${e.tela.padEnd(7)} hitbox=${e.hitbox.padEnd(7)} flip=${e.flip}`);
}
for (const t of estado.torres) console.log(`torre       tex=${t.tex.padEnd(14)} tela=${t.tela.padEnd(7)} flip=${t.flip}`);

await page.screenshot({ path: 'scripts/_roster-f1.png' });
console.log('screenshot: scripts/_roster-f1.png');
await browser.close();
