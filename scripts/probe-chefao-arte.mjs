// Retrato do chefão da Fase 1 em repouso: enquadramento, propulsores e o olho pulsando.
//
// A sonda dos mísseis fotografa o instante do ataque; esta fotografa o chefão PARADO, que é
// quando se julga a arte — se ele cabe na tela, se a cidadela paira rente ao solo, e se o fogo
// dos propulsores lê como sustentação.
//
// uso: node scripts/probe-chefao-arte.mjs   (com `npm run dev` no ar)
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  window.__game.scene.getScene('Menu').scene.start('Game', {
    stage: 1,
    handling: 'free',
    practice: true,
  });
});
await page.waitForTimeout(600);

await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  setInterval(() => {
    s.invulnerableUntil = 1e12;
    if (s.ship) {
      s.ship.x = 46;
      s.ship.y = 120;
      s.ship.body?.setVelocity?.(0, 0);
    }
  }, 40);
});

// Espera o chefão parar de entrar (ele desliza pela direita antes de assumir a posição).
for (let i = 0; i < 200; i++) {
  await page.waitForTimeout(100);
  const pronto = await page.evaluate(() => {
    const b = window.__game.scene.getScene('Game')?.boss;
    return b ? !b.entering : false;
  });
  if (pronto) break;
}

const geo = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const b = s.boss.sprite;
  return {
    tela: `${Math.round(b.displayWidth)}x${Math.round(b.displayHeight)}`,
    centro: `${Math.round(b.x)},${Math.round(b.y)}`,
    esquerda: Math.round(b.x - b.displayWidth / 2),
    direita: Math.round(b.x + b.displayWidth / 2),
    topo: Math.round(b.y - b.displayHeight / 2),
    base: Math.round(b.y + b.displayHeight / 2),
    hitbox: `${Math.round(b.body.width)}x${Math.round(b.body.height)}`,
    anim: b.anims.currentAnim?.key,
  };
});

console.log(`tela ${geo.tela}  centro ${geo.centro}  anim=${geo.anim}  hitbox ${geo.hitbox}`);
console.log(`caixa na tela: x ${geo.esquerda}..${geo.direita} (limite 384)   y ${geo.topo}..${geo.base} (solo 206)`);
if (geo.direita > 384) console.log('AVISO: transborda pela DIREITA');
if (geo.base > 216) console.log('AVISO: transborda pelo RODAPÉ');
if (geo.topo < 26) console.log('AVISO: invade a faixa do HUD');

// Dois retratos separados por meio ciclo do pulso do olho.
await page.screenshot({ path: 'scripts/_chefao-repouso-a.png' });
await page.waitForTimeout(450);
await page.screenshot({ path: 'scripts/_chefao-repouso-b.png' });
console.log('screenshots: scripts/_chefao-repouso-a.png e -b.png');

await browser.close();
