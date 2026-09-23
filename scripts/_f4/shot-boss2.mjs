// AS DUAS FORMAS DO CHEFAO FINAL, como estao hoje. Linha de base para o redesenho da 2a.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(1200);
await page.keyboard.press('G'); // pula direto para o chefao

const vivo = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || s.scene.key !== 'Game') return null;
    s.lives = 99;
    s.invulnerableUntil = s.time.now + 60000;
    return s.boss ? { forma: s.boss.forma, hpG: s.boss.hpGuardiao, hp: s.boss.hp } : null;
  });

// Espera o guardiao TERMINAR A ENTRADA. `forma === 'guardiao'` ja e verdade enquanto ele
// ainda voa para dentro da tela — e damage() nesse estado e ignorado (foi o que me pegou).
for (let i = 0; i < 240; i++) {
  const pronto = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s.boss && !s.boss.entering) {
      s.lives = 99;
      s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
      return true;
    }
    return false;
  });
  if (pronto) break;
  await page.waitForTimeout(300);
}
await page.waitForTimeout(1500);
await page.screenshot({ path: 'scripts/_f4/_boss1-guardiao.png' });
console.log('forma 1 (guardiao) capturada', JSON.stringify(await vivo()));

// Mata a 1a forma e espera a 2a assumir.
await page.evaluate(() => window.__game.scene.getScenes(true)[0].boss.damage(999));
await page.waitForTimeout(2400); // a convulsao da troca
for (let i = 0; i < 240; i++) {
  const b = await vivo();
  if (b && b.forma === 'coracao') break;
  await page.waitForTimeout(250);
}
await page.waitForTimeout(1200);
await page.screenshot({ path: 'scripts/_f4/_boss2-coracao-fechado.png' });
console.log('forma 2 (coracao) capturada', JSON.stringify(await vivo()));

// A janela ABERTA: e o unico momento em que ela pode levar dano.
for (let i = 0; i < 200; i++) {
  const aberto = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 99;
    s.invulnerableUntil = s.time.now + 60000;
    return s.boss?.aberto ?? false;
  });
  if (aberto) break;
  await page.waitForTimeout(150);
}
await page.screenshot({ path: 'scripts/_f4/_boss2-coracao-aberto.png' });
console.log('forma 2 ABERTA capturada');

await browser.close();
