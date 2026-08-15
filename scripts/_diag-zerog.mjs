// DIAGNÓSTICO: o que o `Parallax.breakAtmosphere()` REALMENTE faz com o terreno.
// Lê os alphas camada a camada durante a subida, em vez de julgar por screenshot.
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
    // `damage()` devolve "matou" — quem conduz a morte é `killBoss` (ver `onBulletHitBoss`).
    if (s?.boss && !s.boss.isDead && s.boss.damage(25)) s.killBoss();
    return s?.zone === 'vacuo';
  });
}
if (!rompeu) { console.log('nao rompeu'); await browser.close(); process.exit(1); }

const ler = () =>
  page.evaluate(() => {
    const p = window.__s.parallax;
    return {
      camadas: p.layers
        .filter((l) => l.terreno)
        .map((l) => ({
          key: l.key,
          n: l.sprites.length,
          alphas: [...new Set(l.sprites.map((s) => +s.alpha.toFixed(2)))],
          ys: [...new Set(l.sprites.map((s) => Math.round(s.y)))].slice(0, 3),
        })),
      chao: p.ground ? +p.ground.alpha.toFixed(2) : null,
      chaoRim: p.groundRim ? +p.groundRim.alpha.toFixed(2) : null,
      chaoFrente: p.groundFront ? +p.groundFront.alpha.toFixed(2) : null,
      pintado: p.paintedBg.map((b) => +b.alpha.toFixed(2)),
      // A saída da atmosfera: pintura nova, bruma, fachos, e os dois astros que dividem a tela
      // com ela. `visto` é o que realmente aparece — alpha zero é o mesmo que não existir.
      zeroG: p.zeroGBg ? +p.zeroGBg.alpha.toFixed(2) : null,
      bruma: p.fog.map((f) => +f.ts.alpha.toFixed(2)),
      fachos: p.rays.map((r) => +r.img.alpha.toFixed(2)),
      lua: +p.moon.alpha.toFixed(2),
      leviata: +p.leviathan.alpha.toFixed(2),
      // Retardatários: sprites de terreno ainda visíveis depois de a transição terminar.
      sobrando: p.layers
        .filter((l) => l.terreno)
        .flatMap((l) => l.sprites.filter((s) => s.alpha > 0.02).map(() => l.key)),
    };
  });

for (const t of [0, 1000, 2000, 3000, 4500, 6000]) {
  if (t) await page.waitForTimeout(1000 * (t === 4500 ? 1.5 : t === 6000 ? 1.5 : 1));
  const d = await ler();
  console.log(`\n+${t}ms  fase1: chao=${d.chao} frente=${d.chaoFrente} pintadoF1=[${d.pintado}]`);
  console.log(`        saida: pintura=${d.zeroG} bruma=[${d.bruma}] fachos=[${d.fachos}] lua=${d.lua} leviata=${d.leviata}`);
  console.log(`        sobrando: ${d.sobrando.length ? [...new Set(d.sobrando)].join(', ') : '(nada)'}`);
}

await browser.close();
