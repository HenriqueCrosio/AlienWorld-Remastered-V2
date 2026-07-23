// Sonda da TORRE DE SOLO da Fase 1: arte nova, espelhamento e boca do cano.
//
// Força torres na tela, prende a nave à ESQUERDA delas (é para lá que a torre atira) e
// fotografa o instante do disparo — o único jeito de ver se o tiro nasce na ponta do cano
// e não do meio da estrutura.
//
// uso: node scripts/probe-torre-solo.mjs   (com `npm run dev` no ar)
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
      s.ship.x = 40;
      s.ship.y = 150;
      s.ship.body?.setVelocity?.(0, 0);
    }
  }, 40);
  // Deixa a torre ENTRAR (ela só mira dentro da tela, `p.x < GAME_WIDTH - 10`) e então trava
  // o scroll, para ela não sair de cena antes de completar o telégrafo.
  setInterval(() => {
    for (const p of s.terrain.props.getChildren()) {
      if (p.getData('kind') === 'turret' && p.x < 200) p.setVelocityX(0);
    }
  }, 40);
  s.terrain.spawn('turret');
  s.terrain.spawn('turret');
});

// Espera uma torre CARREGANDO (o telégrafo) e fotografa; depois o disparo.
let viuCarga = false;
for (let i = 0; i < 300; i++) {
  await page.waitForTimeout(60);
  const st = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const t = s.terrain.props.getChildren().filter((p) => p.getData('kind') === 'turret');
    return t.map((p) => ({
      x: Math.round(p.x),
      y: Math.round(p.y),
      alt: Math.round(p.displayHeight),
      flip: p.flipX,
      tex: p.texture.key,
      carga: p.getData('charging'),
    }));
  });
  if (!viuCarga && st.some((t) => t.carga > 0)) {
    viuCarga = true;
    await page.screenshot({ path: 'scripts/_torre-carga.png' });
    console.log('torres:', JSON.stringify(st));
  }
  if (viuCarga) {
    const balas = await page.evaluate(() => {
      const s = window.__game.scene.getScene('Game');
      return s.enemies.enemyBullets
        .getChildren()
        .filter((b) => b.active && b.getData('missile') === true)
        .map((b) => ({ x: Math.round(b.x), y: Math.round(b.y), ox: Math.round(b.getData('ox')), oy: Math.round(b.getData('oy')) }));
    });
    if (balas.length) {
      await page.screenshot({ path: 'scripts/_torre-tiro.png' });
      console.log('mísseis:', JSON.stringify(balas));
      break;
    }
  }
}

console.log(viuCarga ? 'screenshots: scripts/_torre-carga.png e _torre-tiro.png' : 'FALHA: torre nunca carregou');
await browser.close();
