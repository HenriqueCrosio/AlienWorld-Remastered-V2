// 25/10 (night) — THE HANGAR in the real game: opens the scene, freezes its clock and photographs the states of the
// choice (the full 1152×648 page: the world + the HD layer). Fails on any page/console error.
//   node scripts/_hangar/_ver-hangar.mjs <outDir> [--semhd]     (needs `npm run dev` on :5173)
// Writes: 1-esq-osso.png, 2-dir-laranja.png, 3-dir-preta.png, 4-esq-laranja.png, 5-varrendo.png, 6-motor.png,
// 7-veu.png, and prints the state and the errors.
import fs from 'node:fs';
const R = 'C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/';
const { chromium } = await import('file:///' + R.replace(/ /g, '%20') + 'node_modules/playwright/index.mjs');
const OUT = process.argv[2] ?? '.';
const SEMHD = process.argv.includes('--semhd');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(`[${m.type()}] ${m.text()}`); });
page.on('requestfailed', (r) => erros.push('FAIL ' + r.url()));
await page.goto(`http://localhost:5173/${SEMHD ? '?semhd' : ''}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const g = window.__game;
  g.registry.set('modeloNave', 'jato');
  g.registry.set('pinturaNave', 'osso');
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.scene.start('Hangar', { handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.getScene('Hangar')?.estado?.pronto, null, { timeout: 30000 });
await page.waitForTimeout(800);

// Puts the scene at clock t with the state given (frozen), lets two frames draw, photographs.
const foto = async (nome, t, muda) => {
  await page.evaluate(([t, muda]) => {
    const c = window.__game.scene.getScene('Hangar');
    c.congelado = true;
    Object.assign(c.estado, muda, { t });
  }, [t, muda]);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/${nome}.png` });
};
const longe = -1e6;
await foto('1-esq-osso', 3, { lado: 'esq', ladoAntes: 'esq', pinturas: { esq: 0, dir: 0 }, tLado: longe, tPintura: longe });
await foto('2-dir-laranja', 6, { lado: 'dir', ladoAntes: 'dir', pinturas: { esq: 0, dir: 0 } });
await foto('3-dir-preta', 7, { lado: 'dir', ladoAntes: 'dir', pinturas: { esq: 0, dir: 1 } });
await foto('4-esq-laranja', 8, { lado: 'esq', ladoAntes: 'esq', pinturas: { esq: 1, dir: 1 } });
await foto('5-varrendo', 9.16, { lado: 'esq', ladoAntes: 'esq', ladoPintura: 'esq', pinturaAntes: 0, pinturas: { esq: 1, dir: 1 }, tPintura: 9 });
await foto('6-motor', 10.5, { tConfirmou: 10 });
await foto('7-veu', 11.15, { tConfirmou: 10 });
const estado = await page.evaluate(() => {
  const g = window.__game, hd = window.__gameHD;
  return {
    hangarAtivo: g.scene.isActive('Hangar'),
    cenaHD: !!hd?.scene.getScene('HangarHD')?.cenario,
    cenarioNoMundo: !!g.scene.getScene('Hangar').cenario,
  };
});
console.log(JSON.stringify({ estado, erros }, null, 1));
await browser.close();
