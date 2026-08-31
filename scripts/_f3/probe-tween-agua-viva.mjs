// A ÁGUA-VIVA DEIXA TWEEN ÓRFÃO? O glow dela (`preFX.addGlow` + tween `repeat: -1`, em
// `EnemySystem.spawn`) é criado por bicho e nunca morre com ele. Esta sonda conta os tweens
// ATIVOS da cena contra as águas-vivas VIVAS: se os tweens sobem e não voltam quando o último
// bicho sai de tela, o tween ficou rodando em cima de um Glow já destruído.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.evaluate(() => {
  window.__game.scene.stop('Menu');
  window.__game.scene.start('Game', { stage: 3, handling: 'diegetico' });
});
await page.waitForTimeout(2000);
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99;
  s.invulnerableUntil = 1e15;
});

const amostra = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const vivas = s.enemies.enemies
      .getChildren()
      .filter((e) => e.active && e.getData('kind') === 'aguaViva').length;
    return {
      t: Number((s.elapsed ?? 0).toFixed(1)),
      vivas,
      tweens: s.tweens.getTweens().filter((tw) => tw.isPlaying()).length,
    };
  });

console.log('   t   águas-vivas vivas   tweens tocando');
const linhas = [];
for (let i = 0; i < 14; i++) {
  const a = await amostra();
  linhas.push(a);
  console.log(`${String(a.t).padStart(5)}${String(a.vivas).padStart(15)}${String(a.tweens).padStart(17)}`);
  await page.waitForTimeout(2500);
}

// O veredicto: pega a última amostra SEM nenhuma água-viva viva depois de a última onda passar,
// e compara com a linha de base do começo (antes da 1ª onda, em t≈8).
const base = linhas[0].tweens;
const fim = linhas[linhas.length - 1];
console.log('');
console.log(`linha de base (t=${linhas[0].t}, ${linhas[0].vivas} vivas): ${base} tweens`);
console.log(`fim           (t=${fim.t}, ${fim.vivas} vivas): ${fim.tweens} tweens`);
const vazou = fim.vivas === 0 && fim.tweens > base;
console.log(vazou ? `✘ VAZOU: ${fim.tweens - base} tweens sobraram sem dono` : '✔ sem tween órfão');
await browser.close();
process.exit(vazou ? 1 : 0);
