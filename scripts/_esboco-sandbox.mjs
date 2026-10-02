// Esboço do sandbox: abre ?sandbox, fotografa a montagem, monta uma build (atalho FOGO + clique), JOGA e fotografa a
// fase com o painel de medidas. Uso: node scripts/_esboco-sandbox.mjs <pasta>   (npm run dev rodando)
import { chromium } from 'playwright';
const OUT = process.argv[2] ?? '.';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
p.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text()));
await p.addInitScript(() => localStorage.removeItem('alienworld.sandbox'));
await p.goto('http://localhost:5173/?sandbox', { waitUntil: 'networkidle' });
await p.waitForSelector('#sandbox:not([hidden]) .no', { timeout: 30000 });
await p.click('button[data-acao="atalho"][data-nome="FOGO"]');
await p.click('.no[data-id="EFF_001"]');
await p.click('.no[data-id="WPN_004"]');
await p.click('.no[data-id="WPN_004"]');
await p.click('.no[data-id="DEF_001"]');
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/sandbox-montagem.png` });
await p.click('button[data-acao="jogar"]');
await p.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').arena, null, { timeout: 30000 });
await p.keyboard.down('Space');
await p.waitForTimeout(6000);
await p.screenshot({ path: `${OUT}/sandbox-jogo.png` });
await p.keyboard.up('Space');
const estado = await p.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  return { mao: window.__game.registry.get('cartas'), inimigos: s.enemies.enemies.countActive(true), medidas: s.medidas.resumo() };
});
console.log(JSON.stringify(estado));
await p.keyboard.press('Escape');
await p.waitForSelector('#sandbox:not([hidden]) .no', { timeout: 10000 });
const volta = await p.evaluate(() => document.querySelector('#sandbox .pontos').textContent);
console.log('de volta à montagem:', volta);
await b.close();
