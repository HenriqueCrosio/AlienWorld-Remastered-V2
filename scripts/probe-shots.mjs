// REVISÃO VISUAL dos projéteis desenhados em código (shot*): uma foto de cada arma atirando.
// Não asserta nada — é sonda de OLHO. As fotos vão para probe-shot-<arma>.png.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// Modo LIVRE (tecla 3): gatilho = ESPAÇO.
await page.keyboard.press('3');
await page.waitForTimeout(1600);

const cena = await page.evaluate(() => window.__game.scene.getScenes(true)[0]?.scene.key);
if (cena !== 'Game') {
  console.error(`✘ ABORTADO: esperava a GameScene, estou em ${cena}`);
  await browser.close();
  process.exit(1);
}

await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99;
  s.invulnerableUntil = 1e15;
  s.pickups.maybeDrop = () => {};
  // Sem terreno nem ondas atrapalhando a foto: a sonda fotografa TIRO, não fase.
  s.propRate = 0;
  s.hazardRate = 0;
});

const armas = ['tracer', 'pulse', 'lance', 'spread', 'obus', 'agulha', 'salva', 'perfurante', 'bateria', 'lamina', 'hmg', 'shotgun'];

for (const id of armas) {
  await page.evaluate((a) => window.__game.scene.getScenes(true)[0].weapons.equip(a), id);
  await page.keyboard.down('Space');
  // Obus/HMG têm cadência baixa/giro: espera mais para a foto pegar projéteis no ar.
  await page.waitForTimeout(id === 'obus' ? 1600 : id === 'hmg' ? 1400 : 700);
  await page.screenshot({ path: `probe-shot-${id}.png` });
  await page.keyboard.up('Space');
  await page.waitForTimeout(400);
  console.log(`foto: probe-shot-${id}.png`);
}

await browser.close();
