// PROTÓTIPO DAS CARTAS (feat/cartas-preview): abre a F2 na linhagem alien, abre a mesa (C), fotografa, escolhe,
// atira e fotografa de novo. Depois a Aurora: o painel das linhagens e a mesa da conquista.
// (29/09) A mesa mora na camada HD (`window.__gameHD`); a 'Cartas' do mundo só repassa.
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? '.';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.evaluate(() => {
  const g = window.__game;
  g.registry.set('cartas', []);
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.scene.start('Game', { stage: 2, ship: 'alienigena', handling: 'diegetico' });
});
await page.waitForTimeout(2500);
await page.keyboard.press('6');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/cartas-mesa-fase.png` });

const mesa = await page.evaluate(() => {
  const c = (window.__gameHD ?? window.__game).scene.getScene('Cartas');
  return { ativa: c.scene.isActive(), opcoes: c.opcoes?.map((o) => o.id), jogoPausado: window.__game.scene.getScene('Game').scene.isPaused() };
});
await page.keyboard.press('Enter');
await page.waitForTimeout(800);

// Força as cartas de arma para ver o tiro montado (Triplo + Explosivo + Casco).
await page.evaluate(() => {
  const g = window.__game.scene.getScene('Game');
  for (const id of ['WPN_002', 'EFF_001', 'DEF_001']) g.cartas.aplicar(id);
});
await page.keyboard.down('Space');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/cartas-tiro-triplo.png` });
await page.keyboard.up('Space');

const depois = await page.evaluate(() => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  return {
    mao: g.registry.get('cartas'),
    arma: s.weapons.current.id,
    bocas: s.weapons.current.muzzles?.length,
    vidas: s.lives,
    jogoRodando: s.scene.isActive(),
  };
});

// A DOCA: o painel das linhagens; a alien dispara o RESET (2 cartas na mão → 4 mesas seguidas).
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', ['WPN_001', 'DEF_001']);
  g.scene.start('Interlude2', { stage: 3, handling: 'diegetico', score: 0, ship: 'humana' });
});
let painel = false;
for (let i = 0; i < 80 && !painel; i++) {
  await page.waitForTimeout(500);
  painel = await page.evaluate(() => !!window.__game.scene.getScene('Interlude2').panel);
}
await page.screenshot({ path: `${OUT}/cartas-doca-linhagens.png` });
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(200);
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
await page.keyboard.press('Enter');
const mesas = [];
for (let k = 0; k < 6; k++) {
  await page.waitForTimeout(1100);
  const m = await page.evaluate(() => {
    const c = (window.__gameHD ?? window.__game).scene.getScene('Cartas');
    return c.scene.isActive() ? { opcoes: c.opcoes.map((o) => o.id), mao: [...window.__game.registry.get('cartas')] } : null;
  });
  if (!m) break;
  if (k === 0) await page.screenshot({ path: `${OUT}/cartas-doca-reset.png` });
  mesas.push(m);
  await page.keyboard.press('Enter');
}
await page.waitForTimeout(800);
const aurora = {
  painelApareceu: painel,
  mesasDoReset: mesas.length,
  mesas,
  maoFinal: await page.evaluate(() => window.__game.registry.get('cartas')),
  nave: await page.evaluate(() => window.__game.scene.getScene('Interlude2').naveId),
};

console.log(JSON.stringify({ mesa, depois, aurora, erros }, null, 2));
await browser.close();
