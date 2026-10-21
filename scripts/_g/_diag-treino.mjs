// BLOCO G · diagnosis: what holds the training start of F1 before the boss? Prints the scenes and their state.
//   node scripts/_g/_diag-treino.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free', practice: true }));
for (let i = 0; i < 5; i++) {
  await page.waitForTimeout(1000);
  console.log(JSON.stringify(await page.evaluate(() => {
    const g = window.__game, hd = window.__gameHD;
    const ver = (jogo) => jogo ? jogo.scene.getScenes(false).map((s) => `${s.sys.settings.key}:${s.sys.settings.status}`) : null;
    const c = g.scene.getScene('Cartas');
    return { mundo: ver(g), hd: ver(hd), cartasAtiva: c?.sys.isActive(), temConfirmar: typeof c?.confirmar, mesa: g.scene.getScene('Game')?.cartas?.mesaAberta };
  })));
}
await browser.close();
