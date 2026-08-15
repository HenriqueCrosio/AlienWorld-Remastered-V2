// O míssil do chefão da Fase 1 mira MESMO onde o jogador está?
//
// A promessa do desenho (Boss.launchMissile) é: um míssil por vez, apontado para a posição do
// jogador NO INSTANTE DO DISPARO, e depois reto. Isso é verificável — o ângulo da velocidade no
// nascimento tem que bater com o ângulo boca→nave. Se bater, a esquiva "saia de onde você
// estava" existe; se não bater, o telégrafo está mentindo sobre o que vem.
//
// A nave é movida para uma altura DIFERENTE a cada disparo, senão um míssil de ângulo fixo
// passaria no teste por coincidência.
//
// uso: node scripts/_probe-missil.mjs   (com `npm run dev` no ar)
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
  window.__alvoY = 120;
  setInterval(() => {
    s.invulnerableUntil = 1e12;
    if (s.ship) {
      s.ship.x = 46;
      s.ship.y = window.__alvoY;
      s.ship.body?.setVelocity?.(0, 0);
    }
  }, 40);
});

for (let i = 0; i < 200; i++) {
  await page.waitForTimeout(100);
  if (await page.evaluate(() => window.__s.boss && !window.__s.boss.entering)) break;
}

await page.evaluate(() => {
  const b = window.__s.boss;
  while (b.hp > b.maxHp / 2) b.damage(5);
});
await page.waitForTimeout(2200);

const alturas = [60, 170, 100];
let ok = 0;

for (const alt of alturas) {
  await page.evaluate((y) => (window.__alvoY = y), alt);

  // Espera um míssil NOVO nascer e lê o rumo dele no primeiro frame de vida.
  const r = await page.evaluate(async (y) => {
    const s = window.__s;
    const vistos = new Set(
      s.enemies.enemyBullets.getChildren().filter((b) => b.getData('missile') === true),
    );
    for (let i = 0; i < 120; i++) {
      await new Promise((ok) => setTimeout(ok, 50));
      const novo = s.enemies.enemyBullets
        .getChildren()
        .find((b) => b.active && b.getData('missile') === true && !vistos.has(b));
      if (!novo) continue;
      const rumo = (Math.atan2(novo.body.velocity.y, novo.body.velocity.x) * 180) / Math.PI;
      const para =
        (Math.atan2(y - novo.getData('oy'), 46 - novo.getData('ox')) * 180) / Math.PI;
      return { rumo: +rumo.toFixed(1), para: +para.toFixed(1) };
    }
    return null;
  }, alt);

  if (!r) {
    console.log(`nave em y=${alt}: nenhum míssil no intervalo`);
    continue;
  }
  const erro = Math.abs(r.rumo - r.para);
  const passa = erro < 3;
  if (passa) ok++;
  console.log(
    `nave em y=${String(alt).padStart(3)}: míssil a ${r.rumo}° · rumo da nave ${r.para}° · ` +
      `erro ${erro.toFixed(1)}° — ${passa ? 'MIRADO' : 'FALHA (não mirou)'}`,
  );
}

console.log(`\nmíssil mirado na posição do jogador: ${ok === alturas.length ? 'PASS' : 'FALHA'} (${ok}/${alturas.length})`);

await browser.close();
